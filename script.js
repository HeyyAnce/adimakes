/**
 * Adi — site behaviour
 * Small, dependency-free modules: nav, mobile menu, scroll reveal,
 * the hero "sort" visual, and the copy-email button.
 */
(() => {
    'use strict';

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* =====================================================
       NAV: background on scroll + active section tracking
       ===================================================== */
    function initNav() {
        const nav = document.getElementById('site-nav');
        const navLinks = document.querySelectorAll('[data-nav-link]');
        const sections = [...navLinks]
            .map(link => document.querySelector(link.getAttribute('href')))
            .filter(Boolean);

        if (!nav) return;

        const onScroll = () => {
            nav.classList.toggle('scrolled', window.scrollY > 8);
        };
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });

        if (!sections.length) return;

        const setActive = (id) => {
            navLinks.forEach(link => {
                link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
            });
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) setActive(entry.target.id);
            });
        }, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });

        sections.forEach(section => observer.observe(section));
    }

    /* =====================================================
       MOBILE MENU
       ===================================================== */
    function initMobileMenu() {
        const toggle = document.getElementById('navToggle');
        const menu = document.getElementById('mobileMenu');
        if (!toggle || !menu) return;

        const close = () => {
            toggle.setAttribute('aria-expanded', 'false');
            menu.classList.remove('open');
        };
        const open = () => {
            toggle.setAttribute('aria-expanded', 'true');
            menu.classList.add('open');
        };

        toggle.addEventListener('click', () => {
            const isOpen = toggle.getAttribute('aria-expanded') === 'true';
            isOpen ? close() : open();
        });

        menu.querySelectorAll('a').forEach(a => a.addEventListener('click', close));

        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') close();
        });
    }

    /* =====================================================
       SCROLL REVEAL
       ===================================================== */
    function initReveal() {
        const items = document.querySelectorAll('.reveal');
        if (!items.length) return;

        if (prefersReducedMotion) {
            items.forEach(el => el.classList.add('is-visible'));
            return;
        }

        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    obs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15 });

        items.forEach(el => observer.observe(el));
    }

    /* =====================================================
       HERO SIGNATURE VISUAL — file-sort animation
       12 "file" chips scatter, then settle into a sorted
       3x4 grid: a literal nod to what Sorta (the shipped
       project) actually does.
       ===================================================== */
    function initSortVisual() {
        const el = document.getElementById('sortVisual');
        const statusEl = document.getElementById('sortStatus');
        if (!el) return;

        // Wait for fonts + full layout to settle before measuring the box —
        // measuring too early (e.g. before web fonts load) can capture a
        // stale size and misplace the grid.
        const ready = document.fonts && document.fonts.ready
            ? document.fonts.ready
            : Promise.resolve();

        ready.then(() => {
            requestAnimationFrame(() => requestAnimationFrame(() => buildSortVisual(el, statusEl)));
        });
    }

    function buildSortVisual(el, statusEl) {
        const files = [
            { ext: '.py',  type: 'light' }, { ext: '.exe', type: 'muted' },
            { ext: '.png', type: 'muted' }, { ext: '.zip', type: 'light' },
            { ext: '.txt', type: '' },      { ext: '.csv', type: 'muted' },
            { ext: '.md',  type: '' },      { ext: '.mp3', type: 'light' },
            { ext: '.pdf', type: '' },      { ext: '.jpg', type: 'muted' },
            { ext: '.log', type: '' },      { ext: '.ico', type: 'light' }
        ];

        const cols = 4;
        const rows = 3;
        const cellW = 100 / cols;
        const cellH = 100 / rows;

        const box = el.getBoundingClientRect();
        // size chips as a fraction of the container so the grid always fits,
        // on a 320px mobile box just as cleanly as a 380px desktop one
        const chipPx = Math.min(box.width / cols, box.height / rows) * 0.72;

        files.forEach((file, i) => {
            const chip = document.createElement('div');
            chip.className = 'chip' + (file.type ? ` c-${file.type}` : '');
            chip.textContent = file.ext;
            chip.style.width = `${chipPx}px`;
            chip.style.height = `${chipPx}px`;
            chip.style.fontSize = `${Math.max(9, chipPx * 0.16)}px`;

            const col = i % cols;
            const row = Math.floor(i / cols);
            const targetX = (col * cellW + cellW / 2) / 100 * box.width - chipPx / 2;
            const targetY = (row * cellH + cellH / 2) / 100 * box.height - chipPx / 2;

            if (prefersReducedMotion) {
                chip.style.transform = `translate(${targetX}px, ${targetY}px)`;
            } else {
                const scatterX = Math.random() * (box.width - chipPx);
                const scatterY = Math.random() * (box.height - chipPx);
                const rot = (Math.random() * 30 - 15).toFixed(1);
                chip.style.transform = `translate(${scatterX}px, ${scatterY}px) rotate(${rot}deg)`;
                chip.dataset.targetX = targetX;
                chip.dataset.targetY = targetY;
            }

            el.appendChild(chip);
        });

        if (prefersReducedMotion) return;

        const settle = () => {
            el.querySelectorAll('.chip').forEach((chip, i) => {
                setTimeout(() => {
                    chip.style.transform = `translate(${chip.dataset.targetX}px, ${chip.dataset.targetY}px) rotate(0deg)`;
                }, i * 45);
            });
        };

        const io = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setTimeout(settle, 300);
                    obs.disconnect();
                }
            });
        }, { threshold: 0.4 });
        io.observe(el);

        if (statusEl) {
            const folders = ['Scripts/', 'Downloads/', 'Media/', 'Documents/'];
            let idx = 0;
            setInterval(() => {
                idx = (idx + 1) % folders.length;
                statusEl.textContent = `sorting into ${folders[idx]}`;
            }, 3200);
        }
    }

    /* =====================================================
       COPY EMAIL
       ===================================================== */
    function initCopyEmail() {
        const btn = document.getElementById('copyEmailBtn');
        const label = document.getElementById('copyLabel');
        if (!btn || !label) return;

        btn.addEventListener('click', async () => {
            const email = btn.dataset.email;
            try {
                await navigator.clipboard.writeText(email);
                label.textContent = 'Copied ✓';
            } catch {
                label.textContent = email;
            }
            setTimeout(() => { label.textContent = 'Copy email'; }, 2000);
        });
    }

    /* =====================================================
       SMOOTH SCROLL (Without updating URL Hash)
       ===================================================== */
    function initCleanScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                const targetId = this.getAttribute('href');
                const targetElement = document.querySelector(targetId);

                if (targetElement) {
                    e.preventDefault(); // Stops the browser from adding the # to the URL
                    targetElement.scrollIntoView({ behavior: 'smooth' });
                    
                    // Keeps the URL completely clean
                    history.replaceState(null, null, window.location.pathname);
                }
            });
        });
    }

    /* =====================================================
       INIT
       ===================================================== */
    document.addEventListener('DOMContentLoaded', () => {
        initNav();
        initMobileMenu();
        initReveal();
        initSortVisual();
        initCopyEmail();
        initCleanScroll(); 
    });
})();
