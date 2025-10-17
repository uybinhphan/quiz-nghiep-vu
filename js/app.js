import * as dom from './dom-elements.js';
import * as config from './config.js';
import * as state from './state.js';
import * as theme from './theme.js';
import * as ui from './ui-helpers.js';
import * as quizService from './quiz-service.js';
import * as quizCore from './quiz-core.js';
import { initSwipeNavigation } from './swipe.js';
import { registerServiceWorker } from './service-worker-loader.js';

function handleResumeYes() {
    console.log("[Init] User chose YES (Resume).");
    ui.hideResumeModal();
    restoreSavedSession(); 
}

function handleResumeNo() {
    console.log("[Init] User chose NO (Start Fresh).");
    ui.hideResumeModal();
    state.clearState(); 
    quizCore.updateTimerDisplayAndControls(); 
    ui.showSelectScreenView(true); // true to prevent another state clear
    quizService.loadQuizManifest(); // Load manifest for fresh start
    if (dom.usageDetails && dom.usageDetails.hasAttribute('open')) {
        dom.usageDetails.open = true; 
        dom.usageDetails.classList.remove('hidden'); 
    } else if (dom.usageDetails) {
        dom.usageDetails.classList.add('hidden'); 
    }
}

function restoreSavedSession() {
    // State is already loaded into state module by loadState() in DOMContentLoaded
    console.log(`[Init] Restoring saved session for "${state.currentQuizDisplayName}"...`);
    quizCore.updateTimerDisplayAndControls(); 

    // Determine the view to restore from the loaded state
    // loadState() in state.js returns the parsed savedState object
    const savedStateData = state.loadState(); // This re-loads and re-populates state vars, ensure it only returns data for decision here
                                         // Or better, state.loadState should populate and app.js uses state directly.
                                         // For now, let's assume state is populated by the initial call to state.loadState()

    const viewToRestore = savedStateData ? savedStateData.view : null;

    if (viewToRestore === 'quiz') {
        ui.showQuizSectionView();
        if(dom.jumpToInput) dom.jumpToInput.max = (state.quizData && state.quizData.length > 0) ? state.quizData.length : 1;
        quizCore.displayQuestion(state.currentQuestionIndex);
    } else if (viewToRestore === 'results') {
        ui.showResultsSectionView();
        // quizCore.showResults() is implicitly called by showResultsSectionView if needed,
        // or rather, showResults updates score and then calls showResultsSectionView.
        // Let's ensure final score is displayed based on loaded state.
        if (dom.finalScoreText) dom.finalScoreText.textContent = `Điểm cuối cùng: ${state.score} / ${state.quizData.length}`;
    } else {
         console.warn("[Restore Error] Could not determine view from saved state, starting fresh.");
         handleResumeNo(); 
    }
}

function initializeEventListeners() {
    if (dom.prevBtn) dom.prevBtn.addEventListener('click', quizCore.navigatePrevious);
    if (dom.nextBtn) dom.nextBtn.addEventListener('click', quizCore.navigateNext);
    if (dom.restartPracticeBtn) dom.restartPracticeBtn.addEventListener('click', () => quizCore.restartQuiz(false)); // False: not via shuffle button
    if (dom.shuffleNowBtn) dom.shuffleNowBtn.addEventListener('click', quizCore.handleShuffleNow);
    if (dom.reloadOriginalBtn) dom.reloadOriginalBtn.addEventListener('click', quizCore.handleReloadOriginal);
    if (dom.backToSelectQuizBtn) dom.backToSelectQuizBtn.addEventListener('click', () => {
        quizCore.clearAutoAdvanceTimer(); 
        ui.showSelectScreenView(); 
        quizService.loadQuizManifest();
    });
    if (dom.exitReviewBtn) dom.exitReviewBtn.addEventListener('click', quizCore.exitReviewMode);
    if (dom.toggleFilterBtn) dom.toggleFilterBtn.addEventListener('click', quizCore.toggleReviewFilter);
    
    if (dom.restartBtn) dom.restartBtn.addEventListener('click', () => quizCore.restartQuiz(false));
    if (dom.reviewBtn) dom.reviewBtn.addEventListener('click', quizCore.startReviewMode);
    if (dom.backToSelectBtn) dom.backToSelectBtn.addEventListener('click', () => {
        quizCore.clearAutoAdvanceTimer(); 
        ui.showSelectScreenView(); 
        quizService.loadQuizManifest();
    });

    if (dom.jumpToBtn) dom.jumpToBtn.addEventListener('click', quizCore.handleJumpToQuestion);
    if (dom.jumpToInput) {
        dom.jumpToInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                quizCore.handleJumpToQuestion();
            }
        });
    }

    if (dom.answersContainer) {
        dom.answersContainer.addEventListener('click', (event) => {
            if (event.target.classList.contains('answer-btn') && !event.target.disabled) {
                quizCore.handleAnswerSelection(event.target);
            }
        });
    }

    if (dom.timerDecreaseBtn) dom.timerDecreaseBtn.addEventListener('click', quizCore.decreaseTimer);
    if (dom.timerIncreaseBtn) dom.timerIncreaseBtn.addEventListener('click', quizCore.increaseTimer);
    if (dom.settingsBtn) dom.settingsBtn.addEventListener('click', ui.toggleSettingsMenu);
    if (dom.themeToggleButton) dom.themeToggleButton.addEventListener('click', theme.toggleTheme);

    if (dom.resumeBtnYes) dom.resumeBtnYes.addEventListener('click', handleResumeYes);
    if (dom.resumeBtnNo) dom.resumeBtnNo.addEventListener('click', handleResumeNo);

    // Nav links (if they exist - they were commented out in HTML structure but selectors are there)
    if (dom.navHomeLink) {
        dom.navHomeLink.addEventListener('click', (e) => {
            e.preventDefault();
            quizCore.clearAutoAdvanceTimer();
            ui.showSelectScreenView(false); // Go to home, clear state fully
            quizService.loadQuizManifest();
        });
    }
    if (dom.navAboutLink) {
        dom.navAboutLink.addEventListener('click', (e) => {
            e.preventDefault();
            alert('Trang "Giới thiệu" đang được xây dựng.');
        });
    }
    console.log("[Events] All application event listeners initialized.");
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("[Init] DOM Loaded.");
    theme.applyInitialTheme();
    
    const restoredStateSessionData = state.loadState(); // This loads data into the state module
    
    if (restoredStateSessionData) {
       console.log("[Init] Restored state found, attempting to resume.");
       const resumeQuizName = restoredStateSessionData.quizDisplayName || "bài làm trước";
       const resumeQuestionNum = (restoredStateSessionData.currentQuestionIndex || 0) + 1;
       const resumeTotalQuestions = restoredStateSessionData.quizData?.length || "?";
       let resumeMessage = `Bạn có một bài làm dở dang cho "${resumeQuizName}"`;

       if (restoredStateSessionData.view === 'quiz') {
           resumeMessage += ` (đang ở câu ${resumeQuestionNum}/${resumeTotalQuestions}). Bạn có muốn tiếp tục không?`;
       } else if (restoredStateSessionData.view === 'results') {
           resumeMessage += ` (đang ở màn hình kết quả). Bạn có muốn xem lại không?`;
       } else {
           resumeMessage += `. Bạn có muốn tiếp tục không?`; // Fallback
       }
       ui.showResumeModal(resumeMessage);
    } else {
        console.log("[Init] No valid state, starting fresh.");
        quizCore.updateTimerDisplayAndControls(); 
        ui.showSelectScreenView(true); // true to prevent state clear as it's already clear
        quizService.loadQuizManifest(); // Load manifest for the first time
        if (dom.usageDetails && dom.usageDetails.hasAttribute('open')) { 
            dom.usageDetails.open = true; 
            dom.usageDetails.classList.remove('hidden');
        } else if (dom.usageDetails) {
             dom.usageDetails.classList.add('hidden');
        }
    }

    initializeEventListeners();
    initSwipeNavigation();
    registerServiceWorker();
}); 