function toggleMenu() {
    const menu = document.querySelector(".menu-links");
    const icon = document.querySelector(".hamburger-icon");
    if (!menu || !icon) return;
    menu.classList.toggle("open");
    icon.classList.toggle("open");
}

/* Close menu on outside click */
document.addEventListener('click', function(e) {
    const menu = document.querySelector(".menu-links");
    const icon = document.querySelector(".hamburger-icon");
    if (!menu || !icon) return;
    const isClickInside = icon.contains(e.target) || menu.contains(e.target);
    if (!isClickInside && menu.classList.contains('open')) {
        menu.classList.remove('open');
        icon.classList.remove('open');
    }
});