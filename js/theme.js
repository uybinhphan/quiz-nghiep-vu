import { bodyElement, themeToggleButton } from './dom-elements.js';

export function applyInitialTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        bodyElement.classList.add('dark-theme');
    } else {
        bodyElement.classList.remove('dark-theme');
    }
    updateThemeToggleButton();
}

export function toggleTheme() {
    bodyElement.classList.toggle('dark-theme');
    const isDark = bodyElement.classList.contains('dark-theme');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateThemeToggleButton();
}

// The icon is handled by CSS, but this function could be used for other UI updates if needed.
export function updateThemeToggleButton() {
    if (!themeToggleButton) return;
    const isDark = bodyElement.classList.contains('dark-theme');
    themeToggleButton.textContent = isDark ? '🌙' : '☀️';
    themeToggleButton.setAttribute('aria-label', isDark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối');
    themeToggleButton.title = isDark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối';
} 
