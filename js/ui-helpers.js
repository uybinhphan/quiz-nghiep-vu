// UI helper functions 
import {
    errorMessage,
    resumeModalText,
    resumeModalOverlay,
    settingsDialog,
    selectSection,
    quizSection,
    resultsSection,
    usageDetails,
    quizTitleElement,
    settingsBtn,
    navControls,
    reviewControls,
    shuffleCheckbox,
    quizFileListContainer,
    statusMessage,
    updateQuizFileSelectElement
} from './dom-elements.js';
import * as state from './state.js';

export function showError(message) {
    console.error("[UI Error]", message);
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.classList.remove('hidden');
    }
}

export function hideError() {
    if (errorMessage) {
        errorMessage.textContent = '';
        errorMessage.classList.add('hidden');
    }
}

export function showResumeModal(message) {
    if (resumeModalText && resumeModalOverlay) {
        resumeModalText.textContent = message;
        resumeModalOverlay.classList.remove('hidden');
    }
}

export function hideResumeModal() {
    if (resumeModalOverlay) {
        resumeModalOverlay.classList.add('hidden');
    }
}

export function toggleSettingsMenu() {
    if (settingsDialog) {
        if (settingsDialog.open) {
            settingsDialog.close();
        } else {
            settingsDialog.showModal();
        }
    }
}

function hideAllViews() {
    if (selectSection) { selectSection.classList.add('hidden'); selectSection.style.display = 'none'; }
    if (quizSection) { quizSection.classList.add('hidden'); quizSection.style.display = 'none'; }
    if (resultsSection) { resultsSection.classList.add('hidden'); resultsSection.style.display = 'none'; }
    if (usageDetails) { usageDetails.classList.add('hidden'); }
    if (quizTitleElement) { quizTitleElement.classList.add('hidden'); }
}

export function showSelectScreenView(preventClear = false) {
    console.log("[UI] Show Select Screen View" + (preventClear ? " (no state clear)" : ""));
    hideAllViews();
    hideError();

    if (!preventClear) {
        state.clearState();
        state.clearLoadedQuizzes();
    }
    state.resetQuizState();

    if (usageDetails) usageDetails.classList.remove('hidden');
    if (selectSection) { selectSection.classList.remove('hidden'); selectSection.style.display = 'block'; }
    if (quizTitleElement) { quizTitleElement.textContent = ''; quizTitleElement.classList.add('hidden'); }
    if (shuffleCheckbox) shuffleCheckbox.disabled = false;
    
    if (settingsBtn) {
        settingsBtn.disabled = true;
        settingsBtn.style.opacity = '0.5';
        settingsBtn.style.cursor = 'not-allowed';
    }

    if (quizFileListContainer) {
        quizFileListContainer.innerHTML = '';
        const newSelect = document.createElement('select');
        newSelect.id = 'quiz-file-select';
        newSelect.innerHTML = '<option value="">Đang tải danh sách...</option>';
        newSelect.disabled = true;
        quizFileListContainer.appendChild(newSelect);
        updateQuizFileSelectElement();
    }
    if (statusMessage) statusMessage.textContent = '';
    if (errorMessage) { errorMessage.textContent = ''; errorMessage.classList.add('hidden'); }
}

export function showQuizSectionView() {
    hideAllViews();
    hideError();
    if (quizSection) { quizSection.classList.remove('hidden'); quizSection.style.display = 'block'; }
    if (navControls) navControls.classList.toggle('hidden', state.isReviewMode);
    if (reviewControls) reviewControls.classList.toggle('hidden', !state.isReviewMode);
    if (settingsBtn) {
        settingsBtn.disabled = state.isReviewMode;
        settingsBtn.style.opacity = state.isReviewMode ? '0.5' : '';
        settingsBtn.style.cursor = state.isReviewMode ? 'not-allowed' : '';
    }
    if (quizTitleElement && state.currentQuizDisplayName) {
        quizTitleElement.textContent = state.currentQuizDisplayName;
        quizTitleElement.classList.remove('hidden');
    }
}

export function showResultsSectionView() {
    hideAllViews();
    if (resultsSection) { resultsSection.classList.remove('hidden'); resultsSection.style.display = 'block'; }
    if (quizTitleElement && state.currentQuizDisplayName) {
        quizTitleElement.textContent = state.currentQuizDisplayName;
        quizTitleElement.classList.remove('hidden');
    }
    if (settingsBtn) {
        settingsBtn.disabled = true;
        settingsBtn.style.opacity = '0.5';
        settingsBtn.style.cursor = 'not-allowed';
    }
} 