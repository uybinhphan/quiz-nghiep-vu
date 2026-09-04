// App-wide display/feedback preferences (font size, sound), separate from quiz progress state
import * as dom from './dom-elements.js';

const FONT_SCALE_INDEX_KEY = 'fontScaleIndex';
const SOUND_ENABLED_KEY = 'soundEnabled';
const FONT_SCALES = [0.9, 1, 1.15];
const FONT_LABELS = ['Nhỏ', 'Vừa', 'Lớn'];

function getFontScaleIndex() {
    const stored = parseInt(localStorage.getItem(FONT_SCALE_INDEX_KEY), 10);
    return Number.isInteger(stored) && stored >= 0 && stored < FONT_SCALES.length ? stored : 1;
}

function applyFontScaleIndex(index) {
    document.documentElement.style.setProperty('--content-font-scale', FONT_SCALES[index]);
    localStorage.setItem(FONT_SCALE_INDEX_KEY, String(index));
    if (dom.fontSizeDisplay) dom.fontSizeDisplay.textContent = FONT_LABELS[index];
    if (dom.fontSizeDecreaseBtn) dom.fontSizeDecreaseBtn.disabled = index <= 0;
    if (dom.fontSizeIncreaseBtn) dom.fontSizeIncreaseBtn.disabled = index >= FONT_SCALES.length - 1;
}

export function applyInitialFontScale() {
    applyFontScaleIndex(getFontScaleIndex());
}

export function decreaseFontSize() {
    const index = getFontScaleIndex();
    if (index > 0) applyFontScaleIndex(index - 1);
}

export function increaseFontSize() {
    const index = getFontScaleIndex();
    if (index < FONT_SCALES.length - 1) applyFontScaleIndex(index + 1);
}

export function isSoundEnabled() {
    return localStorage.getItem(SOUND_ENABLED_KEY) === 'true';
}

export function setSoundEnabled(enabled) {
    localStorage.setItem(SOUND_ENABLED_KEY, enabled ? 'true' : 'false');
}

export function applyInitialSoundToggle() {
    if (dom.soundToggleCheckbox) dom.soundToggleCheckbox.checked = isSoundEnabled();
}
