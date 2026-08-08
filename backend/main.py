from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from pydantic import BaseModel
import yt_dlp
import httpx
import traceback
import base64
import tempfile
import shutil
import urllib.parse
from pathlib import Path

# ── App & rate limiter ──────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="AddySave API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# ── Config ──────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent

def get_cookies_path() -> str | None:
    # Check Render's secure mount path first, then local paths
    paths = [
        Path("/etc/secrets/cookies.txt"),
        BASE_DIR / "backend" / "cookies.txt",
        BASE_DIR / "cookies.txt"
    ]
    for p in paths:
        if p.exists():
            # yt-dlp tries to update the cookies file. /etc/secrets/ is read-only on Render.
            # We copy it to a temporary writable location to prevent crashes.
            temp_dir = Path(tempfile.gettempdir())
            writable_cookie = temp_dir / "yt_dlp_cookies.txt"
            shutil.copy2(p, writable_cookie)
            return str(writable_cookie)
    return None

# Sent with every outbound request so CDNs treat us like a real browser
BROWSER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/125.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
}

# ── Models ──────────────────────────────────────────────────────────────────
class AnalyzeRequest(BaseModel):
    url: str

# ── Helpers ─────────────────────────────────────────────────────────────────
def format_bytes(b):
    if not b:
        return None
    for unit in ["B", "KB", "MB", "GB"]:
        if b < 1024:
            return f"{b:.1f} {unit}"
        b /= 1024
    return f"{b:.1f} GB"

def base_ydl_opts(use_cookies: bool = True) -> dict:
    opts = {"quiet": True, "no_warnings": True, "skip_download": True}
    if use_cookies:
        cookie_path = get_cookies_path()
        if cookie_path:
            opts["cookiefile"] = cookie_path
    return opts

# YouTube player clients to try in sequence (data-centre IPs get blocked on some)
YT_CLIENTS = ["android", "ios", "tv_embed", "web_creator", "mweb"]

def extract_info_with_fallback(url: str) -> dict:
    """For YouTube URLs, try multiple player clients (no cookies — they conflict with android API).
       For all other platforms, use cookies normally."""
    is_youtube = any(x in url for x in ("youtube.com", "youtu.be"))

    if not is_youtube:
        with yt_dlp.YoutubeDL(base_ydl_opts(use_cookies=True)) as ydl:
            return ydl.extract_info(url, download=False)

    last_err = None
    for client in YT_CLIENTS:
        try:
            opts = {
                # No cookies for YouTube — web cookies break the android/ios API clients
                **base_ydl_opts(use_cookies=False),
                "extractor_args": {"youtube": {"player_client": [client]}},
            }
            with yt_dlp.YoutubeDL(opts) as ydl:
                return ydl.extract_info(url, download=False)
        except yt_dlp.utils.DownloadError as e:
            last_err = e
            msg = str(e).lower()
            # Only retry on auth errors; hard-fail everything else immediately
            if "login" not in msg and "authentication" not in msg and "sign in" not in msg:
                raise
    raise last_err

def encode_url(url: str) -> str:
    return "native:" + base64.urlsafe_b64encode(url.encode()).decode()

def decode_url(fid: str) -> str:
    return base64.urlsafe_b64decode(fid[7:].encode()).decode()

def is_native(fid: str) -> bool:
    return fid.startswith("native:")

# ── Format extraction ────────────────────────────────────────────────────────
def extract_formats(info: dict) -> dict:
    video_formats: list[dict] = []
    audio_formats: list[dict] = []
    seen_heights: set = set()
    seen_abrs: set = set()

    for f in info.get("formats", []):
        ext       = f.get("ext", "")
        vcodec    = f.get("vcodec")
        acodec    = f.get("acodec")
        filesize  = f.get("filesize") or f.get("filesize_approx")
        format_id = f.get("format_id", "")
        height    = f.get("height")
        abr       = f.get("abr")
        note      = f.get("format_note") or ""

        if ext in ("mhtml", "vtt", "srt") or "storyboard" in format_id:
            continue

        vcodec_s = (vcodec or "").lower()
        acodec_s = (acodec or "").lower()
        has_video = vcodec is not None and vcodec_s not in ("none", "")
        has_audio = acodec is not None and acodec_s not in ("none", "")
        is_combined = vcodec is None and acodec is None and ext == "mp4"

        resolution = (
            f"{height}p" if height
            else note or f.get("resolution") or "Unknown"
        )

        entry = {
            "format_id":      format_id,
            "ext":            ext,
            "filesize":       filesize,
            "filesize_human": format_bytes(filesize),
            "resolution":     resolution,
            "vcodec":         vcodec,
            "acodec":         acodec,
            "abr":            abr,
        }

        if is_combined:
            video_formats.append(entry)
        elif has_video and not has_audio:
            h_key = height or resolution
            if h_key not in seen_heights:
                seen_heights.add(h_key)
                video_formats.append(entry)
        elif has_audio and not has_video:
            abr_key = round(abr or 0, -1)
            if abr_key not in seen_abrs:
                seen_abrs.add(abr_key)
                audio_formats.append(entry)
        elif has_video and has_audio:
            h_key = height or resolution
            if h_key not in seen_heights:
                seen_heights.add(h_key)
                video_formats.append(entry)

    video_formats.sort(key=lambda x: x.get("filesize") or 0, reverse=True)
    audio_formats.sort(key=lambda x: x.get("abr") or 0, reverse=True)
    
    platform = info.get("extractor_key", "").lower()
    if platform in ("instagram", "facebook"):
        video_formats = video_formats[:1]
        audio_formats = audio_formats[:1]
    else:
        video_formats = video_formats[:3]
        audio_formats = audio_formats[:2]

    quality_labels = ["High Quality", "Medium Quality", "Low Quality"]
    for i, vf in enumerate(video_formats):
        if vf["resolution"] == "Unknown":
            if platform in ("instagram", "facebook"):
                vf["resolution"] = "High Quality"
            else:
                vf["resolution"] = quality_labels[i % 3]

    return {"video": video_formats, "audio": audio_formats}

# ── Streaming helper ─────────────────────────────────────────────────────────
async def stream_url(source_url: str, referer: str = ""):
    headers = {**BROWSER_HEADERS}
    if referer:
        headers["Referer"] = referer

    async def generator():
        async with httpx.AsyncClient(timeout=None, follow_redirects=True) as client:
            async with client.stream("GET", source_url, headers=headers) as resp:
                resp.raise_for_status()
                async for chunk in resp.aiter_bytes(chunk_size=65536):
                    yield chunk

    return generator

# ── Routes ───────────────────────────────────────────────────────────────────
@app.get("/health")
async def health_check():
    """Keep-alive endpoint. Ping this every 10 min to prevent Render cold starts."""
    return {"status": "ok"}

@app.post("/api/analyze")
@limiter.limit("10/minute")
async def analyze_url(request: Request, req: AnalyzeRequest):
    url = req.url.strip()
    try:
        info = extract_info_with_fallback(url)

        return {
            "title":     info.get("title") or "Untitled",
            "thumbnail": info.get("thumbnail") or "",
            "channel":   info.get("uploader") or info.get("channel") or "Unknown",
            "duration":  info.get("duration_string") or str(info.get("duration") or ""),
            "platform":  info.get("extractor_key") or "Unknown",
            "formats":   extract_formats(info),
        }

    except yt_dlp.utils.DownloadError as e:
        msg = str(e).lower()
        print(f"[yt-dlp] {e}")
        if "login" in msg or "authentication" in msg:
            raise HTTPException(status_code=401, detail="LOGIN_REQUIRED")
        if "private" in msg:
            raise HTTPException(status_code=403, detail="PRIVATE_CONTENT")
        if "unavailable" in msg or "not found" in msg or "removed" in msg:
            raise HTTPException(status_code=404, detail="CONTENT_UNAVAILABLE")
        if "unsupported url" in msg:
            raise HTTPException(status_code=422, detail="UNSUPPORTED_URL")
        raise HTTPException(status_code=400, detail=f"EXTRACTION_FAILED: {e}")

    except Exception as e:
        print(f"[analyze] {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"INTERNAL_ERROR: {e}")


@app.get("/api/download")
@limiter.limit("20/minute")
async def download_media(request: Request, url: str, format_id: str):
    try:
        # Native CDN URL (e.g. future scraped platforms)
        if is_native(format_id):
            direct = decode_url(format_id)
            gen = await stream_url(direct, referer=url)
            return StreamingResponse(
                gen(),
                media_type="application/octet-stream",
                headers={"Content-Disposition": 'attachment; filename="video.mp4"'},
            )

        # yt-dlp resolved URL — must use same client as analyze so format_id stays valid
        is_youtube = any(x in url for x in ("youtube.com", "youtu.be"))
        if is_youtube:
            dl_opts = {
                **base_ydl_opts(use_cookies=False),
                "format": format_id,
                "extractor_args": {"youtube": {"player_client": ["android"]}},
            }
        else:
            dl_opts = {**base_ydl_opts(use_cookies=True), "format": format_id}

        with yt_dlp.YoutubeDL(dl_opts) as ydl:
            info = ydl.extract_info(url, download=False)

        direct = info.get("url")
        ext = "mp4"

        if not direct:
            for f in info.get("formats", []):
                if f.get("format_id") == format_id:
                    direct = f.get("url")
                    ext = f.get("ext", "mp4")
                    break

        if not direct:
            raise HTTPException(status_code=400, detail="DIRECT_URL_NOT_FOUND")

        raw_title  = info.get("title") or "media"
        safe_title = "".join(c for c in raw_title if c.isalnum() or c in " _-").strip()
        filename   = f"{safe_title or 'media'}.{ext}"

        gen = await stream_url(direct, referer=url)
        return StreamingResponse(
            gen(),
            media_type="application/octet-stream",
            headers={"Content-Disposition": f"attachment; filename*=utf-8''{urllib.parse.quote(filename)}"},
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"[download] {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"STREAM_FAILED: {e}")


# ── Static files (must be last) ──────────────────────────────────────────────
app.mount("/", StaticFiles(directory=str(BASE_DIR), html=True), name="static")
