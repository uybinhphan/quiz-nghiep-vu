import { bodyElement } from './dom-elements.js';

export function applyInitialTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const useDark = savedTheme ? savedTheme === 'dark' : prefersDark;
    bodyElement.classList.toggle('dark-theme', useDark);
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
    // Example: if themeToggleButton text needed to change, do it here.
    // For now, it just ensures consistency if we add more to it later.
} 