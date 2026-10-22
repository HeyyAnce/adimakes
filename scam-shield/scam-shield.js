/**
 * scam-shield.js - Scam Shield Embed Interactivity & Fallback Handling
 */

document.addEventListener('DOMContentLoaded', () => {
    const iframe = document.getElementById('scam-shield-iframe');
    const loader = document.getElementById('embed-loader');
    const delayedTip = document.getElementById('loader-delayed-tip');
    const fallback = document.getElementById('embed-fallback');
    const reloadBtn = document.getElementById('btn-reload');
    const retryBtn = document.getElementById('btn-retry');
    const fullscreenBtn = document.getElementById('btn-fullscreen');
    const windowEl = document.querySelector('.embed-window');

    const EMBED_URL = 'https://ideaforge-scam-shield.streamlit.app/?embed=true';

    let loadTimeoutId = null;
    let fallbackTimeoutId = null;
    let isLoaded = false;

    // Helper to mark iframe as loaded
    function markLoaded() {
        if (isLoaded) return;
        isLoaded = true;

        if (loadTimeoutId) clearTimeout(loadTimeoutId);
        if (fallbackTimeoutId) clearTimeout(fallbackTimeoutId);

        if (iframe) {
            iframe.classList.add('loaded');
        }

        if (loader) {
            loader.classList.add('fade-out');
            setTimeout(() => {
                loader.style.display = 'none';
            }, 600);
        }

        if (fallback) {
            fallback.classList.remove('visible');
        }
    }

    // Helper to trigger fallback display
    function showFallback() {
        if (isLoaded) return;

        if (loader) {
            loader.classList.add('fade-out');
            setTimeout(() => {
                loader.style.display = 'none';
            }, 400);
        }

        if (fallback) {
            fallback.classList.add('visible');
        }
    }

    // Start loading watchdog timers
    function startWatchdogs() {
        if (loadTimeoutId) clearTimeout(loadTimeoutId);
        if (fallbackTimeoutId) clearTimeout(fallbackTimeoutId);

        // After 10 seconds, show the helpful delayed-boot hint inside the loader
        loadTimeoutId = setTimeout(() => {
            if (!isLoaded && delayedTip) {
                delayedTip.classList.add('visible');
            }
        }, 10000);

        // After 25 seconds of no load response, offer direct fallback
        fallbackTimeoutId = setTimeout(() => {
            if (!isLoaded) {
                showFallback();
            }
        }, 25000);
    }

    // Iframe load listener
    if (iframe) {
        iframe.addEventListener('load', () => {
            // Short delay to ensure Streamlit's initial frame rendering has initiated
            setTimeout(markLoaded, 400);
        });

        iframe.addEventListener('error', () => {
            showFallback();
        });

        startWatchdogs();
    }

    // Reload Embed Action
    function reloadIframe() {
        isLoaded = false;

        if (fallback) {
            fallback.classList.remove('visible');
        }

        if (loader) {
            loader.style.display = 'flex';
            loader.classList.remove('fade-out');
        }

        if (delayedTip) {
            delayedTip.classList.remove('visible');
        }

        if (iframe) {
            iframe.classList.remove('loaded');
            // Add cache-busting timestamp param to force fresh fetch
            const separator = EMBED_URL.includes('?') ? '&' : '?';
            iframe.src = `${EMBED_URL}${separator}_t=${Date.now()}`;
        }

        startWatchdogs();
    }

    if (reloadBtn) {
        reloadBtn.addEventListener('click', (e) => {
            e.preventDefault();
            reloadIframe();
        });
    }

    if (retryBtn) {
        retryBtn.addEventListener('click', (e) => {
            e.preventDefault();
            reloadIframe();
        });
    }

    // Fullscreen / Expanded View Toggle
    if (fullscreenBtn && windowEl) {
        fullscreenBtn.addEventListener('click', (e) => {
            e.preventDefault();

            // Toggle CSS fullscreen class for seamless in-page full viewport experience
            const isNowFullscreen = windowEl.classList.toggle('is-fullscreen');
            
            // Update button icon & aria-label
            const iconSvg = fullscreenBtn.querySelector('svg');
            const labelSpan = fullscreenBtn.querySelector('span');

            if (isNowFullscreen) {
                fullscreenBtn.setAttribute('title', 'Exit Fullscreen');
                if (labelSpan) labelSpan.textContent = 'Minimize';
                if (iconSvg) {
                    iconSvg.innerHTML = `
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 14h6m0 0v6m0-6L3 21m17-7h-6m0 0v6m0-6l7 7M4 10h6m0 0V4m0 6L3 3m17 7h-6m0 0V4m0 6l7-7" />
                    `;
                }
            } else {
                fullscreenBtn.setAttribute('title', 'Toggle Fullscreen');
                if (labelSpan) labelSpan.textContent = 'Fullscreen';
                if (iconSvg) {
                    iconSvg.innerHTML = `
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 3h6m0 0v6m0-6l-7 7M9 21H3m0 0v-6m0 6l7-7M3 9V3m0 0h6m-6 0l7 7m14 5v6m0 0h-6m6 0l-7-7" />
                    `;
                }
            }
        });

        // Allow pressing Escape to exit CSS fullscreen
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && windowEl.classList.contains('is-fullscreen')) {
                windowEl.classList.remove('is-fullscreen');
                const labelSpan = fullscreenBtn.querySelector('span');
                if (labelSpan) labelSpan.textContent = 'Fullscreen';
            }
        });
    }
});
