/**
 * AddySave — Frontend Logic
 * Talks to the FastAPI backend at /api/analyze and /api/download
 */

document.addEventListener('DOMContentLoaded', () => {
    const form             = document.getElementById('analyze-form');
    const input            = document.getElementById('url-input');
    const dynamicContainer = document.getElementById('dynamic-container');

    if (!form || !input || !dynamicContainer) return;

    const loadingMessages = [
        "Analyzing...",
        "Finding formats...",
        "Preparing download...",
        "Almost ready..."
    ];

    let messageInterval;

    // ── Form submit ──────────────────────────────────────────────────────────
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const url = input.value.trim();
        if (!url) return;

        startLoadingState();

        fetch('https://addysave-backend.onrender.com/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        })
        .then(res => {
            if (!res.ok) return res.json().then(err => { throw err; });
            return res.json();
        })
        .then(data => renderResultCard(data, url))
        .catch(error => {
            const detail = error?.detail || "";
            let title       = "Something went wrong";
            let description = "An unexpected error occurred. Please try again.";

            if (detail.includes("LOGIN_REQUIRED")) {
                title       = "Login Required";
                description = "This content requires a logged-in account to access.";
            } else if (detail.includes("PRIVATE_CONTENT")) {
                title       = "Private Content";
                description = "This media is private and cannot be accessed.";
            } else if (detail.includes("CONTENT_UNAVAILABLE")) {
                title       = "Content Unavailable";
                description = "This video may have been deleted or removed by the creator.";
            } else if (detail.includes("UNSUPPORTED_URL")) {
                title       = "Unsupported URL";
                description = "This platform isn't supported yet. Try Instagram, Facebook, or YouTube.";
            } else if (detail.includes("EXTRACTION_FAILED")) {
                title       = "Analysis Failed";
                description = "Could not extract video info. The URL might be invalid or the platform may be blocking access.";
            } else if (detail.includes("Rate limit")) {
                title       = "Slow down!";
                description = "You're making too many requests. Wait a moment and try again.";
            }

            renderErrorCard(title, description);
        });
    });

    // ── Loading state ────────────────────────────────────────────────────────
    function startLoadingState() {
        dynamicContainer.classList.remove('hidden');
        dynamicContainer.innerHTML = `
            <div class="addysave-loading-state bento-card hover-glow" data-glow>
                <div class="skeleton-thumbnail shimmer"></div>
                <div class="skeleton-content">
                    <div class="skeleton-line shimmer title-line"></div>
                    <div class="skeleton-line shimmer short-line"></div>
                    <div class="skeleton-options">
                        <div class="skeleton-box shimmer"></div>
                        <div class="skeleton-box shimmer"></div>
                    </div>
                </div>
                <div class="loading-message-container text-center">
                    <span id="loading-message" class="eyebrow fade-text">${loadingMessages[0]}</span>
                </div>
            </div>
        `;

        let msgIndex = 0;
        clearInterval(messageInterval);
        const msgEl = document.getElementById('loading-message');

        messageInterval = setInterval(() => {
            msgIndex = (msgIndex + 1) % loadingMessages.length;
            if (!msgEl) { clearInterval(messageInterval); return; }
            msgEl.style.opacity = 0;
            setTimeout(() => {
                msgEl.textContent  = loadingMessages[msgIndex];
                msgEl.style.opacity = 1;
            }, 300);
        }, 850);

        initGlow(dynamicContainer.querySelector('.hover-glow'));
    }

    // ── Utilities ────────────────────────────────────────────────────────────
    function formatBytes(bytes) {
        if (!bytes) return 'Unknown Size';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    function downloadLink(originalUrl, formatId) {
        return `https://addysave-backend.onrender.com/api/download?url=${encodeURIComponent(originalUrl)}&format_id=${formatId}`;
    }

    // ── Result card ──────────────────────────────────────────────────────────
    function renderResultCard(data, originalUrl) {
        clearInterval(messageInterval);
        const { title, thumbnail, channel, duration, platform, formats } = data;
        const displayPlatform = platform.charAt(0).toUpperCase() + platform.slice(1);

        const buildOptions = (items, isAudio = false) => {
            if (!items?.length) return '';
            const label = isAudio ? 'Audio' : 'Video';
            const rows = items.map(f => `
                <div class="option-item">
                    <div class="option-details">
                        <span class="format">${f.ext.toUpperCase()}</span>
                        <span class="resolution">${isAudio ? (f.abr ? f.abr + ' kbps' : 'Standard') : f.resolution}</span>
                    </div>
                    <div class="option-action">
                        <span class="size text-muted">${formatBytes(f.filesize)}</span>
                        <a href="${downloadLink(originalUrl, f.format_id)}" class="btn-primary btn-sm" target="_blank">Download</a>
                    </div>
                </div>`).join('');
            return `<div class="option-group"><span class="eyebrow">${label}</span>${rows}</div>`;
        };

        dynamicContainer.innerHTML = `
            <div class="addysave-result-card bento-card reveal active hover-glow" data-glow>
                <div class="result-layout">
                    <div class="result-media">
                        <div class="thumbnail-wrapper">
                            <img src="${thumbnail}" alt="Media Thumbnail" class="result-thumbnail">
                            <div class="result-meta">
                                <span class="platform-tag">${displayPlatform}</span>
                                <span class="duration-tag">${duration}</span>
                            </div>
                        </div>
                    </div>
                    <div class="result-info">
                        <h3 class="result-title">${title}</h3>
                        <p class="result-channel text-muted">${channel}</p>
                        <div class="download-options">
                            ${buildOptions(formats.video)}
                            ${buildOptions(formats.audio, true)}
                        </div>
                    </div>
                </div>
            </div>
        `;
        initGlow(dynamicContainer.querySelector('.hover-glow'));
    }

    // ── Error card ───────────────────────────────────────────────────────────
    function renderErrorCard(title = "Content Unavailable", description = "This media might be private, deleted, or unsupported.") {
        clearInterval(messageInterval);
        dynamicContainer.innerHTML = `
            <div class="addysave-error-card bento-card reveal active hover-glow" data-glow>
                <div class="error-layout">
                    <div class="error-icon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                    </div>
                    <div class="error-content">
                        <h3 class="error-title">${title}</h3>
                        <p class="text-muted">${description}</p>
                    </div>
                    <div class="error-actions">
                        <button class="btn-outline btn-sm" id="retry-btn">Retry</button>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('retry-btn')?.addEventListener('click', () => {
            form.dispatchEvent(new Event('submit', { cancelable: true }));
        });
        initGlow(dynamicContainer.querySelector('.hover-glow'));
    }

    // ── Glow effect ──────────────────────────────────────────────────────────
    function initGlow(card) {
        if (!card) return;
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            card.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
            card.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
        });

        const cursor = document.getElementById('glow-cursor');
        if (cursor) {
            card.querySelectorAll('button, a.btn-primary').forEach(el => {
                el.addEventListener('mouseenter', () => cursor.classList.add('hovering'));
                el.addEventListener('mouseleave', () => cursor.classList.remove('hovering'));
            });
        }
    }
});
