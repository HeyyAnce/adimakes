(() => {
    'use strict';

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const SCROLL_OFFSET = 80;

    /* ------------------------------------------------------------------
       Smooth scroll without URL hashes
       ------------------------------------------------------------------ */
    function initSmoothScroll() {
        const scrollLinks = document.querySelectorAll('[data-scroll]');

        scrollLinks.forEach(link => {
            link.addEventListener('click', event => {
                event.preventDefault();

                const targetId = link.dataset.scroll;
                const target = document.getElementById(targetId);
                if (!target) return;

                closeMobileMenu();

                const top = target.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET;
                window.scrollTo({
                    top,
                    behavior: reduceMotion ? 'auto' : 'smooth'
                });

                history.replaceState(null, '', window.location.pathname);
            });
        });
    }

    /* ------------------------------------------------------------------
       Navbar scroll state
       ------------------------------------------------------------------ */
    function initNavbar() {
        const navbar = document.getElementById('navbar');
        if (!navbar) return;

        let ticking = false;

        const updateNavbar = () => {
            navbar.classList.toggle('is-scrolled', window.scrollY > 24);
            ticking = false;
        };

        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(updateNavbar);
                ticking = true;
            }
        }, { passive: true });

        updateNavbar();
    }

    /* ------------------------------------------------------------------
       Mobile menu
       ------------------------------------------------------------------ */
    function initMobileMenu() {
        const toggle = document.querySelector('.navbar-toggle');
        const menu = document.getElementById('mobile-menu');
        if (!toggle || !menu) return;

        toggle.addEventListener('click', () => {
            const isOpen = toggle.getAttribute('aria-expanded') === 'true';
            toggle.setAttribute('aria-expanded', String(!isOpen));
            menu.hidden = isOpen;
        });

        menu.querySelectorAll('[data-scroll]').forEach(link => {
            link.addEventListener('click', closeMobileMenu);
        });
    }

    function closeMobileMenu() {
        const toggle = document.querySelector('.navbar-toggle');
        const menu = document.getElementById('mobile-menu');
        if (!toggle || !menu) return;

        toggle.setAttribute('aria-expanded', 'false');
        menu.hidden = true;
    }

    /* ------------------------------------------------------------------
       Hero load animation
       ------------------------------------------------------------------ */
    function initHeroAnimation() {
        const items = document.querySelectorAll('.hero-item');

        if (reduceMotion) {
            items.forEach(item => item.classList.add('is-loaded'));
            return;
        }

        requestAnimationFrame(() => {
            items.forEach(item => {
                item.style.setProperty('--hero-order', item.dataset.heroOrder || '0');
                item.classList.add('is-loaded');
            });
        });
    }

    /* ------------------------------------------------------------------
       Scroll reveal
       ------------------------------------------------------------------ */
    function initScrollReveal() {
        const reveals = document.querySelectorAll('.reveal');
        const timeline = document.querySelector('.timeline');

        if (reduceMotion) {
            reveals.forEach(el => el.classList.add('is-visible'));
            if (timeline) timeline.classList.add('is-visible');
            return;
        }

        reveals.forEach(el => {
            const delay = el.dataset.revealDelay;
            if (delay !== undefined) {
                el.style.setProperty('--reveal-delay', delay);
            }
        });

        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-visible');
                obs.unobserve(entry.target);
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });

        reveals.forEach(el => observer.observe(el));

        if (timeline) {
            const timelineObserver = new IntersectionObserver(([entry], obs) => {
                if (!entry.isIntersecting) return;
                timeline.classList.add('is-visible');
                obs.unobserve(timeline);
            }, { threshold: 0.1 });

            timelineObserver.observe(timeline);
        }
    }

    /* ------------------------------------------------------------------
       Active nav tracking
       ------------------------------------------------------------------ */
    function initNavTracking() {
        const links = document.querySelectorAll('[data-nav-link]');
        const sections = [...links]
            .map(link => document.getElementById(link.dataset.scroll))
            .filter(Boolean);

        if (!links.length || !sections.length) return;

        const setActive = id => {
            links.forEach(link => {
                const active = link.dataset.scroll === id;
                link.setAttribute('aria-current', active ? 'true' : 'false');
            });
        };

        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setActive(entry.target.id);
                }
            });
        }, { rootMargin: '-40% 0px -50% 0px', threshold: 0 });

        sections.forEach(section => observer.observe(section));
    }

    /* ------------------------------------------------------------------
       Copy email
       ------------------------------------------------------------------ */
    function initCopyEmail() {
        const button = document.getElementById('copyEmailBtn');
        if (!button) return;

        button.addEventListener('click', async () => {
            const original = button.textContent;

            try {
                await navigator.clipboard.writeText(button.dataset.email);
                button.textContent = 'Copied';
            } catch {
                button.textContent = button.dataset.email;
            }

            window.setTimeout(() => {
                button.textContent = original;
            }, 2200);
        });
    }

    /* ------------------------------------------------------------------
       Footer year
       ------------------------------------------------------------------ */
    function initFooterYear() {
        const yearEl = document.getElementById('year');
        if (yearEl) {
            yearEl.textContent = String(new Date().getFullYear());
        }
    }

    /* ------------------------------------------------------------------
       Clean URL on load
       ------------------------------------------------------------------ */
    function cleanUrlOnLoad() {
        if (window.location.hash) {
            history.replaceState(null, '', window.location.pathname);
        }
    }

    /* ------------------------------------------------------------------
       Init
       ------------------------------------------------------------------ */
    document.addEventListener('DOMContentLoaded', () => {
        cleanUrlOnLoad();
        initSmoothScroll();
        initNavbar();
        initMobileMenu();
        initHeroAnimation();
        initScrollReveal();
        initNavTracking();
        initCopyEmail();
        initFooterYear();
    });
})();
