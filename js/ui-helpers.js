// UI helper functions 
import {
    errorMessage,
    errorText,
    errorRetryBtn,
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
    quizFileSelect,
    statusMessage,
    updateQuizFileSelectElement,
    resumeLastBtn,
    quizSearchInput,
    quizCardGrid,
    noQuizResultsMessage
} from './dom-elements.js';
import * as state from './state.js';

export function showError(message, retryFn) {
    console.error("[UI Error]", message);
    if (errorMessage) {
        if (errorText) errorText.textContent = message; else errorMessage.textContent = message;
        errorMessage.classList.remove('hidden');
        if (errorRetryBtn) {
            if (typeof retryFn === 'function') {
                errorRetryBtn.classList.remove('hidden');
                errorRetryBtn.onclick = retryFn;
            } else {
                errorRetryBtn.classList.add('hidden');
                errorRetryBtn.onclick = null;
            }
        }
    }
}

export function hideError() {
    if (errorMessage) {
        if (errorText) errorText.textContent = ''; else errorMessage.textContent = '';
        errorMessage.classList.add('hidden');
        if (errorRetryBtn) {
            errorRetryBtn.classList.add('hidden');
            errorRetryBtn.onclick = null;
        }
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
        if (quizCardGrid) quizCardGrid.innerHTML = '';
        if (noQuizResultsMessage) noQuizResultsMessage.classList.add('hidden');
        updateQuizFileSelectElement();
    }
    if (quizFileSelect) {
        quizFileSelect.innerHTML = '<option value="">Đang tải danh sách...</option>';
        quizFileSelect.disabled = true;
    }
    if (quizSearchInput) quizSearchInput.value = '';
    if (resumeLastBtn) resumeLastBtn.classList.add('hidden');
    if (statusMessage) statusMessage.textContent = '';
    hideError();
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
