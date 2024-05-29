window.addEventListener('load', () => {
    const preloader = document.getElementById('preloader');
    setTimeout(() => {
        preloader.style.display = 'none';
    }, 1000); // Pre-loading animation for 1 second
});

// Theme Switching Functionality
const toggleSwitch = document.getElementById('theme-toggle');
const currentTheme = localStorage.getItem('theme') || 'dark-theme';

// Set the checked state of the toggle based on the current theme
toggleSwitch.checked = currentTheme === 'dark-theme';

document.body.classList.add(currentTheme);

function switchTheme(e) {
    if (e.target.checked) {
        document.body.classList.replace('light-theme', 'dark-theme');
        localStorage.setItem('theme', 'dark-theme');
    } else {
        document.body.classList.replace('dark-theme', 'light-theme');
        localStorage.setItem('theme', 'light-theme');
    }
}

toggleSwitch.addEventListener('change', switchTheme, false);
