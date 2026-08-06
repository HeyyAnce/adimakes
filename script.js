/**
 * script.js - Adimakes Portfolio Interactivity
 */

document.addEventListener('DOMContentLoaded', () => {
    
    // 0. Boot Animation Sequence
    const bootScreen = document.getElementById('boot-screen');
    
    if (bootScreen) {
        // Trigger simple fade out after a short delay
        setTimeout(() => {
            bootScreen.classList.add('revealed');
            document.body.classList.remove('no-scroll');
            
            // Cleanup after fade transition
            setTimeout(() => {
                bootScreen.style.display = 'none';
            }, 1500);
        }, 500);
    }
    
    // 1. Custom Cursor Logic
    const cursor = document.getElementById('glow-cursor');
    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    
    if (!isMobile && cursor) {
        document.addEventListener('mousemove', (e) => {
            cursor.style.left = e.clientX + 'px';
            cursor.style.top = e.clientY + 'px';
        });

        // Add hover states to interactive elements
        const interactives = document.querySelectorAll('a, button, .bento-card');
        interactives.forEach(el => {
            el.addEventListener('mouseenter', () => {
                cursor.classList.add('hovering');
            });
            el.addEventListener('mouseleave', () => {
                cursor.classList.remove('hovering');
            });
        });
    }

    // 2. Bento Card Glow Hover Effect (Mouse Tracking)
    const glowCards = document.querySelectorAll('.hover-glow');
    glowCards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);
        });
    });

    // 3. Scroll Reveal Animation using IntersectionObserver
    const revealElements = document.querySelectorAll('.reveal');
    
    const revealOptions = {
        threshold: 0.15,
        rootMargin: "0px 0px -50px 0px"
    };

    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                // Stop observing once revealed for performance
                observer.unobserve(entry.target); 
            }
        });
    }, revealOptions);

    revealElements.forEach(el => {
        revealObserver.observe(el);
    });

    // 4. Navbar Background on Scroll
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // 5. Smooth Scroll for Anchor Links (Backup if CSS scroll-behavior fails)
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                e.preventDefault();
                targetElement.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // 6. Relative Time Formatting
    const timeElements = document.querySelectorAll('.relative-time');
    timeElements.forEach(el => {
        const targetDateStr = el.getAttribute('data-date');
        if (!targetDateStr) return;
        
        const targetDate = new Date(targetDateStr);
        const now = new Date();
        
        let monthsDiff = (now.getFullYear() - targetDate.getFullYear()) * 12;
        monthsDiff -= targetDate.getMonth();
        monthsDiff += now.getMonth();
        
        if (now.getDate() < targetDate.getDate()) {
            monthsDiff--;
        }
        
        if (monthsDiff < 0) {
            el.textContent = 'Coming Soon';
        } else if (monthsDiff === 0) {
            const daysDiff = Math.floor((now - targetDate) / (1000 * 60 * 60 * 24));
            if (daysDiff === 0) el.textContent = 'Today';
            else if (daysDiff === 1) el.textContent = 'Yesterday';
            else el.textContent = `${daysDiff} Days Ago`;
        } else if (monthsDiff < 12) {
            el.textContent = `${monthsDiff} Month${monthsDiff > 1 ? 's' : ''} Ago`;
        } else {
            const yearsDiff = Math.floor(monthsDiff / 12);
            el.textContent = `${yearsDiff} Year${yearsDiff > 1 ? 's' : ''} Ago`;
        }
    });

    // 7. Terminal Scramble Scroll Animation
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
        gsap.registerPlugin(ScrollTrigger);

        const heroSection = document.querySelector('.alt-hero');
        const scrambleElements = document.querySelectorAll('.hero-title-casual, .hero-casual-sub');
        const chars = '!<>-_\\\\/[]{}—=+*^?#';
        
        // Store original text
        const originalTexts = Array.from(scrambleElements).map(el => el.textContent.trim());

        if (heroSection && scrambleElements.length > 0) {
            ScrollTrigger.create({
                trigger: heroSection,
                start: "top 10%",
                end: "bottom 30%",
                scrub: true,
                onUpdate: (self) => {
                    const progress = self.progress; 
                    
                    // Don't scramble for the first 20% of scroll
                    let scrambleProgress = 0;
                    if (progress > 0.2) {
                        scrambleProgress = (progress - 0.2) / 0.8;
                    }
                    
                    scrambleElements.forEach((el, index) => {
                        const original = originalTexts[index];
                        let result = '';
                        
                        // Only calculate random characters if we are actually scrambling
                        if (scrambleProgress === 0) {
                            el.textContent = original;
                            el.style.opacity = 1;
                            return;
                        }
                        
                        for (let i = 0; i < original.length; i++) {
                            if (original[i] === ' ') {
                                result += ' ';
                                continue;
                            }
                            
                            // Map scramble threshold left-to-right (0 to 0.8)
                            const charThreshold = (i / original.length) * 0.8;
                            
                            if (scrambleProgress <= charThreshold) {
                                result += original[i];
                            } else {
                                result += chars[Math.floor(Math.random() * chars.length)];
                            }
                        }
                        
                        el.textContent = result;
                        el.style.opacity = 1 - Math.pow(progress, 3);
                    });
                    
                    const otherElements = document.querySelectorAll('.status-badge, .hero-actions-alt');
                    otherElements.forEach(el => {
                        el.style.opacity = Math.max(0, 1 - (progress * 2.5));
                    });
                }
            });
        }
    }
});
