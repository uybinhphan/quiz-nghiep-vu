import { STORAGE_KEY } from './config.js';
import { quizSection, resultsSection, selectSection, shuffleCheckbox } from './dom-elements.js';

export let originalQuizData = [];
export let quizData = [];
export let currentQuestionIndex = 0;
export let score = 0;
export let userAnswers = {};
export let questionsAnswered = {};
export let autoAdvanceTimer = null;
export let autoAdvanceDuration = 500; // Default, will be updated from loaded state or controls
export let isReviewMode = false;
export let reviewWrongOnly = false;
export let wrongAnswerIndices = [];
export let currentWrongAnswerReviewIndex = 0;
export let currentQuizDisplayName = "";
export let loadedQuizzes = {}; // Cache for loaded quiz JSON data

export function getQuizState() {
    return {
        quizDisplayName: currentQuizDisplayName,
        originalQuizData,
        quizData,
        currentQuestionIndex,
        userAnswers,
        questionsAnswered,
        score,
        isReviewMode,
        reviewWrongOnly,
        wrongAnswerIndices,
        currentWrongAnswerReviewIndex,
        autoAdvanceDuration,
        shuffleChecked: shuffleCheckbox.checked,
    };
}

export function updateQuizState(newState) {
    currentQuizDisplayName = newState.currentQuizDisplayName !== undefined ? newState.currentQuizDisplayName : currentQuizDisplayName;
    originalQuizData = newState.originalQuizData !== undefined ? newState.originalQuizData : originalQuizData;
    quizData = newState.quizData !== undefined ? newState.quizData : quizData;
    currentQuestionIndex = newState.currentQuestionIndex !== undefined ? newState.currentQuestionIndex : currentQuestionIndex;
    userAnswers = newState.userAnswers !== undefined ? newState.userAnswers : userAnswers;
    questionsAnswered = newState.questionsAnswered !== undefined ? newState.questionsAnswered : questionsAnswered;
    score = newState.score !== undefined ? newState.score : score;
    isReviewMode = newState.isReviewMode !== undefined ? newState.isReviewMode : isReviewMode;
    reviewWrongOnly = newState.reviewWrongOnly !== undefined ? newState.reviewWrongOnly : reviewWrongOnly;
    wrongAnswerIndices = newState.wrongAnswerIndices !== undefined ? newState.wrongAnswerIndices : wrongAnswerIndices;
    currentWrongAnswerReviewIndex = newState.currentWrongAnswerReviewIndex !== undefined ? newState.currentWrongAnswerReviewIndex : currentWrongAnswerReviewIndex;
    autoAdvanceDuration = newState.autoAdvanceDuration !== undefined ? newState.autoAdvanceDuration : autoAdvanceDuration;
    if (newState.shuffleChecked !== undefined) shuffleCheckbox.checked = newState.shuffleChecked;
}

export function resetQuizState() {
    originalQuizData = [];
    quizData = [];
    currentQuestionIndex = 0;
    score = 0;
    userAnswers = {};
    questionsAnswered = {};
    // autoAdvanceTimer is handled by timer controls
    // autoAdvanceDuration might be preserved or reset based on preference - currently preserved
    isReviewMode = false;
    reviewWrongOnly = false;
    wrongAnswerIndices = [];
    currentWrongAnswerReviewIndex = 0;
    currentQuizDisplayName = "";
    // loadedQuizzes cache is usually cleared when going back to select screen entirely
}

export function clearLoadedQuizzes() {
    loadedQuizzes = {};
}


export function saveState() {
    let currentView = 'select';
    if (quizSection && !quizSection.classList.contains('hidden')) { currentView = 'quiz'; }
    else if (resultsSection && !resultsSection.classList.contains('hidden')) { currentView = 'results'; }
    else if (selectSection && !selectSection.classList.contains('hidden')) { currentView = 'select'; }

    if (currentView === 'select') {
        if (localStorage.getItem(STORAGE_KEY)) { clearState(); }
        return;
    }

    const stateToSave = {
        view: currentView,
        quizDisplayName: currentQuizDisplayName,
        originalQuizData: originalQuizData,
        quizData: quizData,
        currentQuestionIndex: currentQuestionIndex,
        userAnswers: userAnswers,
        questionsAnswered: questionsAnswered,
        score: score,
        isReviewMode: isReviewMode,
        reviewWrongOnly: reviewWrongOnly,
        wrongAnswerIndices: wrongAnswerIndices,
        currentWrongAnswerReviewIndex: currentWrongAnswerReviewIndex,
        autoAdvanceDuration: autoAdvanceDuration,
        shuffleChecked: shuffleCheckbox.checked
    };
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
        console.log("[State] Saved state:", currentView, "Quiz:", currentQuizDisplayName || 'N/A', "Q:", (currentQuestionIndex + 1) || '?');
    } catch (e) {
        console.error("[State] Error saving state:", e);
    }
}

export function loadState() {
    try {
        const savedStateJSON = localStorage.getItem(STORAGE_KEY);
        if (!savedStateJSON) return null;

        const savedState = JSON.parse(savedStateJSON);
        if (!savedState || typeof savedState.view !== 'string' || 
            (savedState.view !== 'select' && typeof savedState.quizDisplayName !== 'string') || // quizDisplayName is crucial if not in select view
            !Array.isArray(savedState.quizData) || 
            typeof savedState.currentQuestionIndex !== 'number' || 
            typeof savedState.userAnswers !== 'object') {
            console.warn("[State] Invalid saved state structure, clearing.");
            clearState();
            return null;
        }

        if (savedState.view === 'select') {
            clearState(); // Don't restore if last view was select screen
            return null;
        }
        
        // Update global state variables from loaded state
        currentQuizDisplayName = savedState.quizDisplayName || "";
        originalQuizData = savedState.originalQuizData || [];
        quizData = savedState.quizData || [];
        currentQuestionIndex = savedState.currentQuestionIndex || 0;
        userAnswers = savedState.userAnswers || {};
        questionsAnswered = savedState.questionsAnswered || {};
        score = savedState.score || 0;
        isReviewMode = savedState.isReviewMode || false;
        reviewWrongOnly = savedState.reviewWrongOnly || false;
        wrongAnswerIndices = savedState.wrongAnswerIndices || [];
        currentWrongAnswerReviewIndex = savedState.currentWrongAnswerReviewIndex || 0;
        autoAdvanceDuration = savedState.autoAdvanceDuration || 500; // Use default if not in saved state
        shuffleCheckbox.checked = savedState.shuffleChecked || false;


        if (quizData.length === 0 && savedState.view !== 'select') {
            console.warn("[State] Restored quizData is empty, clearing state.");
            clearState();
            return null;
        }
        if (currentQuestionIndex >= quizData.length) {
            console.warn("[State] Restored currentQuestionIndex is out of bounds, resetting to 0.");
            currentQuestionIndex = 0;
        }

        console.log("[State] Found valid saved state to restore:", savedState.view);
        return savedState; // Return the whole saved state object for app.js to decide view
    } catch (e) {
        console.error("[State] Error loading state:", e);
        clearState();
        return null;
    }
}

export function clearState() {
    try {
        localStorage.removeItem(STORAGE_KEY);
        console.log("[State] Cleared saved state from localStorage.");
    } catch (e) {
        console.error("[State] Error clearing state from localStorage:", e);
    }
} 