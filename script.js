function toggleMenu() {
    const menu = document.querySelector(".menu-links");
    const icon = document.querySelector(".hamburger-icon");
    menu.classList.toggle("open");
    icon.classList.toggle("open");
}

document.addEventListener('click', function(e) {
    const menu = document.querySelector(".menu-links");
    const icon = document.querySelector(".hamburger-icon");
    const hamburgerContainer = document.querySelector(".hamburger-menu");
    
    if (hamburgerContainer && !hamburgerContainer.contains(e.target) && menu.classList.contains('open')) {
        menu.classList.remove('open');
        icon.classList.remove('open');
    }
});

var typed = new Typed('#typed-output', {
    strings: ['Python Developer.', 'Tool Developer', 'Musician'],
    typeSpeed: 50,
    backSpeed: 30,
    backDelay: 2000,
    loop: true,
    showCursor: true,
    cursorChar: '|',
});