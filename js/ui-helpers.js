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
    updateQuizFileSelectElement,
    quizLoadIndicator,
    prefetchStartBtn,
    questionSkeleton,
    resultsMeter,
    resultsMeterLabel,
    resultAnswered,
    resultCorrect,
    resultAutoAdvance,
    toastRoot
} from './dom-elements.js';
import * as state from './state.js';

const TOAST_ICONS = {
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    error: '⛔'
};

const activeToasts = new Map();

function updateSettingsButtonAvailability(isEnabled) {
    if (!settingsBtn) return;
    settingsBtn.disabled = !isEnabled;
    settingsBtn.style.opacity = isEnabled ? '' : '0.5';
    settingsBtn.style.cursor = isEnabled ? '' : 'not-allowed';
}

function resetSelectControls() {
    if (quizTitleElement) {
        quizTitleElement.textContent = '';
        quizTitleElement.classList.add('hidden');
    }
    if (shuffleCheckbox) shuffleCheckbox.disabled = false;
    updateSettingsButtonAvailability(false);
    if (statusMessage) statusMessage.textContent = '';
    if (errorMessage) {
        errorMessage.textContent = '';
        errorMessage.classList.add('hidden');
    }
    if (quizLoadIndicator) quizLoadIndicator.classList.add('hidden');
    if (prefetchStartBtn) {
        prefetchStartBtn.disabled = true;
        prefetchStartBtn.textContent = 'Bắt đầu luyện tập';
    }
}

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
    if (!settingsDialog) return;
    if (settingsDialog.open) {
        settingsDialog.close();
    } else {
        settingsDialog.showModal();
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
    resetSelectControls();

    if (quizFileListContainer) {
        quizFileListContainer.innerHTML = '';
        const newSelect = document.createElement('select');
        newSelect.id = 'quiz-file-select';
        newSelect.innerHTML = '<option value="">Đang tải danh sách...</option>';
        newSelect.disabled = true;
        quizFileListContainer.appendChild(newSelect);
        updateQuizFileSelectElement();
    }
}

export function showQuizSectionView() {
    hideAllViews();
    hideError();
    if (quizSection) { quizSection.classList.remove('hidden'); quizSection.style.display = 'block'; }
    if (navControls) navControls.classList.toggle('hidden', state.isReviewMode);
    if (reviewControls) reviewControls.classList.toggle('hidden', !state.isReviewMode);
    updateSettingsButtonAvailability(!state.isReviewMode);
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
    updateSettingsButtonAvailability(false);
    hideQuestionSkeleton();
}

export function showQuestionSkeleton() {
    if (questionSkeleton) {
        questionSkeleton.classList.remove('hidden');
    }
}

export function hideQuestionSkeleton() {
    if (questionSkeleton) {
        questionSkeleton.classList.add('hidden');
    }
}

export function setQuizLoadingState(isLoading, message = '') {
    if (quizLoadIndicator) {
        quizLoadIndicator.classList.toggle('hidden', !isLoading);
        quizLoadIndicator.textContent = message || 'Đang chuẩn bị...';
    }
    if (prefetchStartBtn) {
        prefetchStartBtn.disabled = isLoading ? true : prefetchStartBtn.disabled;
        if (isLoading) {
            prefetchStartBtn.textContent = 'Đang chuẩn bị...';
        } else {
            prefetchStartBtn.textContent = 'Bắt đầu luyện tập';
        }
    }
    if (statusMessage) {
        statusMessage.textContent = message;
        statusMessage.style.display = message ? 'block' : 'none';
    }
}

export function setStartButtonAvailability(enabled) {
    if (prefetchStartBtn) {
        prefetchStartBtn.disabled = !enabled;
    }
}

export function updateResultsSummary({ totalQuestions = 0, correctCount = 0, answeredCount = 0, autoAdvanceMs = 0 } = {}) {
    if (resultAnswered) {
        resultAnswered.textContent = `${answeredCount} câu đã trả lời`;
    }
    if (resultCorrect) {
        resultCorrect.textContent = `${correctCount} câu đúng`;
    }
    if (resultAutoAdvance) {
        const seconds = autoAdvanceMs ? (autoAdvanceMs / 1000).toFixed(1).replace(/\.0$/, '') : 0;
        resultAutoAdvance.textContent = autoAdvanceMs > 0
            ? `Tự động chuyển: ${seconds}s`
            : 'Tự động chuyển: tắt';
    }

    const percent = totalQuestions ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const clamped = Math.min(100, Math.max(0, percent));
    if (resultsMeter) {
        resultsMeter.style.background = `conic-gradient(var(--primary-color) ${clamped}%, rgba(226, 232, 240, 0.25) ${clamped}%)`;
    }
    if (resultsMeterLabel) {
        resultsMeterLabel.textContent = `${percent}%`;
    }
}

export function showToast(message, options = {}) {
    if (!toastRoot || !message) return null;
    const { type = 'info', duration = 4000 } = options;
    const toastId = `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const toastEl = document.createElement('div');
    toastEl.className = 'toast';
    toastEl.dataset.type = type;
    toastEl.setAttribute('role', 'status');
    toastEl.id = toastId;

    const iconSpan = document.createElement('span');
    iconSpan.className = 'toast-icon';
    iconSpan.textContent = TOAST_ICONS[type] || TOAST_ICONS.info;

    const messageSpan = document.createElement('span');
    messageSpan.className = 'toast-message';
    messageSpan.textContent = message;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'toast-close';
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Đóng thông báo');
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', () => dismissToast(toastId));

    toastEl.append(iconSpan, messageSpan, closeBtn);
    toastRoot.appendChild(toastEl);

    const timeoutId = duration > 0 ? setTimeout(() => dismissToast(toastId), duration) : null;
    activeToasts.set(toastId, { element: toastEl, timeoutId });

    return toastId;
}

export function dismissToast(toastId) {
    const toastData = activeToasts.get(toastId);
    if (!toastData) return;
    const { element, timeoutId } = toastData;
    if (timeoutId) clearTimeout(timeoutId);
    if (element && element.parentNode) {
        element.parentNode.removeChild(element);
    }
    activeToasts.delete(toastId);
}

export function clearToasts() {
    [...activeToasts.keys()].forEach(dismissToast);
}
