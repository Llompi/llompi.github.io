const menuIcon = document.querySelector('.menu-icon');
const hamburgerMenu = document.querySelector('.hamburger-menu');

menuIcon.addEventListener('click', () => {
    hamburgerMenu.classList.toggle('open');
});
