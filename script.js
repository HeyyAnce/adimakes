(() => {
    'use strict';

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function revealNotes() {
        const notes = document.querySelectorAll('.reveal');
        if (reduceMotion) {
            notes.forEach(note => note.classList.add('is-visible'));
            return;
        }

        const observer = new IntersectionObserver((entries, currentObserver) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    currentObserver.unobserve(entry.target);
                }
            });
        }, { threshold: .14 });

        notes.forEach(note => observer.observe(note));
    }

    function trackIndex() {
        const links = document.querySelectorAll('[data-nav-link]');
        const sections = [...links]
            .map(link => document.querySelector(link.getAttribute('href')))
            .filter(Boolean);

        if (!links.length || !sections.length) return;

        const setCurrent = id => {
            links.forEach(link => {
                const active = link.getAttribute('href') === `#${id}`;
                link.setAttribute('aria-current', active ? 'true' : 'false');
            });
        };

        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) setCurrent(entry.target.id);
            });
        }, { rootMargin: '-35% 0px -55% 0px', threshold: 0 });

        sections.forEach(section => observer.observe(section));
    }

    function copyEmail() {
        const button = document.getElementById('copyEmailBtn');
        if (!button) return;

        button.addEventListener('click', async () => {
            const original = button.textContent;
            try {
                await navigator.clipboard.writeText(button.dataset.email);
                button.textContent = 'Copied email address';
            } catch {
                button.textContent = button.dataset.email;
            }
            window.setTimeout(() => { button.textContent = original; }, 2200);
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        revealNotes();
        trackIndex();
        copyEmail();
    });
})();
