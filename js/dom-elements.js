// DOM element references 
export const bodyElement = document.body;
export const quizTitleElement = document.getElementById('quiz-title');
export const usageDetails = document.getElementById('usage-details');
export const selectSection = document.getElementById('select-section');
export const quizFileListContainer = document.getElementById('quiz-file-list');
export let quizFileSelect = document.getElementById('quiz-file-select'); // This will be updated & exported
export const statusMessage = document.getElementById('status-message');
export const shuffleCheckbox = document.getElementById('shuffle-checkbox');
export const quizSection = document.getElementById('quiz-section');
export const resultsSection = document.getElementById('results-section');
export const questionText = document.getElementById('question-text');
export const answersContainer = document.getElementById('answers');
export const sourceDiv = document.getElementById('source');
export const timerBar = document.getElementById('auto-advance-timer-bar');
export const progressText = document.getElementById('progress');
export const scoreText = document.getElementById('score');
export const prevBtn = document.getElementById('prev-btn');
export const nextBtn = document.getElementById('next-btn');
export const navControls = document.getElementById('nav-controls');
export const reviewControls = document.getElementById('review-controls');
export const restartPracticeBtn = document.getElementById('restart-practice-btn');
export const shuffleNowBtn = document.getElementById('shuffle-now-btn');
export const reloadOriginalBtn = document.getElementById('reload-original-btn');
export const backToSelectQuizBtn = document.getElementById('back-to-select-quiz-btn');
export const exitReviewBtn = document.getElementById('exit-review-btn');
export const toggleFilterBtn = document.getElementById('toggle-filter-btn');
export const finalScoreText = document.getElementById('final-score');
export const restartBtn = document.getElementById('restart-btn');
export const reviewBtn = document.getElementById('review-btn');
export const backToSelectBtn = document.getElementById('back-to-select-btn');
export const errorMessage = document.getElementById('error-message');
export const jumpNav = document.getElementById('jump-nav');
export const jumpLabel = document.getElementById('jump-label');
export const jumpToInput = document.getElementById('jump-to-input');
export const jumpToBtn = document.getElementById('jump-to-btn');
export const timerDecreaseBtn = document.getElementById('timer-decrease-btn');
export const timerIncreaseBtn = document.getElementById('timer-increase-btn');
export const timerDurationDisplay = document.getElementById('timer-duration-display');
export const settingsBtn = document.getElementById('settings-btn');
export const settingsDialog = document.getElementById('settings-dialog'); // Added this, was used in toggleSettingsMenu
export const themeToggleButton = document.getElementById('theme-toggle-btn');
export const resumeModalOverlay = document.getElementById('resume-modal-overlay');
export const resumeModalText = document.getElementById('resume-modal-text');
export const resumeBtnYes = document.getElementById('resume-btn-yes');
export const resumeBtnNo = document.getElementById('resume-btn-no');
export const navPrevNextContainer = document.getElementById('nav-prev-next');
export const bottomNavigationContainer = document.getElementById('quiz-controls-navigation');
export const navHomeLink = document.getElementById('nav-home-link');
export const navAboutLink = document.getElementById('nav-about-link');
export const questionContainer = document.getElementById('question-container'); // For swipe

// Function to update quizFileSelect if it's recreated
export function updateQuizFileSelectElement() {
    quizFileSelect = document.getElementById('quiz-file-select');
} 