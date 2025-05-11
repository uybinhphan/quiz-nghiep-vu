/* global confetti */

import * as dom from './dom-elements.js';
import * as state from './state.js';
import * as config from './config.js';
import * as ui from './ui-helpers.js';

// --- Utility Functions ---
export function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// --- Timer Functions ---
export function updateTimerDisplayAndControls() {
    if (dom.timerDurationDisplay) {
        dom.timerDurationDisplay.textContent = (state.autoAdvanceDuration / 1000).toFixed(1) + 's';
    }
    if (dom.timerDecreaseBtn) {
        dom.timerDecreaseBtn.disabled = state.isReviewMode || state.autoAdvanceDuration <= config.MIN_TIMER;
    }
    if (dom.timerIncreaseBtn) {
        dom.timerIncreaseBtn.disabled = state.isReviewMode || state.autoAdvanceDuration >= config.MAX_TIMER;
    }
    if (dom.timerBar) {
        dom.timerBar.style.setProperty('--timer-duration', state.autoAdvanceDuration + 'ms');
    }
}

export function clearAutoAdvanceTimer() {
    if (state.autoAdvanceTimer) {
        clearTimeout(state.autoAdvanceTimer);
        state.updateQuizState({ autoAdvanceTimer: null });
    }
    if (dom.timerBar) {
        dom.timerBar.classList.remove('timer-active');
        dom.timerBar.style.animation = 'none';
        void dom.timerBar.offsetWidth; 
        dom.timerBar.style.animation = null;
    }
}

export function decreaseTimer() {
    if (!state.isReviewMode && state.autoAdvanceDuration > config.MIN_TIMER) {
        state.updateQuizState({ autoAdvanceDuration: state.autoAdvanceDuration - config.TIMER_STEP });
        updateTimerDisplayAndControls();
        state.saveState();
    }
}

export function increaseTimer() {
    if (!state.isReviewMode && state.autoAdvanceDuration < config.MAX_TIMER) {
        state.updateQuizState({ autoAdvanceDuration: state.autoAdvanceDuration + config.TIMER_STEP });
        updateTimerDisplayAndControls();
        state.saveState();
    }
}

// --- Navigation and Quiz Flow ---
export function startQuiz(wasShuffledOrRestarted = false) {
    console.log("[Mode] Starting Quiz. Display Name:", state.currentQuizDisplayName);
    if (wasShuffledOrRestarted) {
        state.updateQuizState({
            currentQuestionIndex: 0, 
            score: 0, 
            userAnswers: {}, 
            questionsAnswered: {}, 
            isReviewMode: false, 
            reviewWrongOnly: false, 
            wrongAnswerIndices: [], 
            currentWrongAnswerReviewIndex: 0
        });
    }
    clearAutoAdvanceTimer();
    ui.hideError();
    updateTimerDisplayAndControls();

    if(dom.jumpToInput) {
        dom.jumpToInput.max = (state.quizData && state.quizData.length > 0) ? state.quizData.length : 1;
        dom.jumpToInput.value = '';
    }
    if(dom.jumpLabel) dom.jumpLabel.textContent = "Đến câu:";

    ui.showQuizSectionView();
    displayQuestion(state.currentQuestionIndex);
}

export function displayQuestion(index) {
    state.updateQuizState({ currentQuestionIndex: index });

    if (index < 0 || !state.quizData || index >= state.quizData.length || !state.quizData[index]) {
        console.error(`[Display Error] Invalid index ${index}. Quiz length: ${state.quizData?.length}`);
        ui.showError(`Lỗi hiển thị câu ${index + 1}.`);
        return;
    }

    const currentQuestion = state.quizData[index];
    if (dom.questionText) dom.questionText.textContent = currentQuestion.question || "[Lỗi: Thiếu câu hỏi]";
    if (dom.answersContainer) dom.answersContainer.innerHTML = '';
    if (dom.sourceDiv) {
        dom.sourceDiv.textContent = '';
        dom.sourceDiv.classList.add('hidden');
        dom.sourceDiv.style.display = 'none';
    }

    (currentQuestion.options || []).forEach((option, optionIndex) => {
        const btn = document.createElement('button');
        btn.classList.add('answer-btn');
        btn.textContent = option || "(Trống)";
        btn.dataset.index = optionIndex;
        if (dom.answersContainer) dom.answersContainer.appendChild(btn);
    });

    if (dom.scoreText) dom.scoreText.textContent = `Điểm: ${state.score}`;

    if (state.isReviewMode) {
        if (state.reviewWrongOnly) {
            if (dom.progressText) dom.progressText.textContent = `Câu sai ${state.currentWrongAnswerReviewIndex + 1} / ${state.wrongAnswerIndices.length}`;
            if (dom.jumpLabel) dom.jumpLabel.textContent = "Đến sai số:";
            if (dom.jumpToInput) {
                dom.jumpToInput.max = state.wrongAnswerIndices.length || 1;
                dom.jumpToInput.placeholder = state.wrongAnswerIndices.length > 0 ? (state.currentWrongAnswerReviewIndex + 1).toString() : '0';
            }
        } else {
            if (dom.progressText) dom.progressText.textContent = `Xem lại: Câu ${index + 1} / ${state.quizData.length}`;
            if (dom.jumpLabel) dom.jumpLabel.textContent = "Đến câu:";
            if (dom.jumpToInput) {
                dom.jumpToInput.max = state.quizData.length;
                dom.jumpToInput.placeholder = (index + 1).toString();
            }
        }
    } else {
        if (dom.progressText) dom.progressText.textContent = `Câu ${index + 1} / ${state.quizData.length}`;
        if (dom.jumpLabel) dom.jumpLabel.textContent = "Đến câu:";
        if (dom.jumpToInput) {
            dom.jumpToInput.max = state.quizData.length;
            dom.jumpToInput.placeholder = (index + 1).toString();
        }
    }

    restoreAnswerState(index);
    if (dom.navControls) dom.navControls.classList.toggle('hidden', state.isReviewMode);
    if (dom.reviewControls) dom.reviewControls.classList.toggle('hidden', !state.isReviewMode);
    
    if (dom.settingsBtn) {
        dom.settingsBtn.disabled = state.isReviewMode;
        dom.settingsBtn.style.opacity = state.isReviewMode ? '0.5' : '';
        dom.settingsBtn.style.cursor = state.isReviewMode ? 'not-allowed' : '';
    }

    if (state.isReviewMode) {
        clearAutoAdvanceTimer();
        if (dom.timerBar) dom.timerBar.classList.remove('timer-active');
        if (dom.toggleFilterBtn) {
            dom.toggleFilterBtn.textContent = state.reviewWrongOnly ? "Xem tất cả" : "Chỉ xem sai";
            dom.toggleFilterBtn.classList.toggle('filter-active', state.reviewWrongOnly);
            dom.toggleFilterBtn.disabled = state.wrongAnswerIndices.length === 0 && !state.reviewWrongOnly;
        }
    } else {
        updateTimerDisplayAndControls();
    }

    if (dom.prevBtn && dom.nextBtn) {
        if (state.reviewWrongOnly) {
            dom.prevBtn.disabled = (state.currentWrongAnswerReviewIndex <= 0);
            dom.nextBtn.disabled = (state.currentWrongAnswerReviewIndex >= state.wrongAnswerIndices.length - 1);
            dom.nextBtn.textContent = 'Câu sau';
        } else {
            dom.prevBtn.disabled = (index <= 0);
            const isLast = index === state.quizData.length - 1;
            const isAnswered = state.questionsAnswered[index];
            dom.nextBtn.textContent = (isLast && !state.isReviewMode) ? 'Hoàn thành' : 'Câu sau';
            dom.nextBtn.disabled = (!state.isReviewMode && !isAnswered) || (state.isReviewMode && isLast);
        }
    }
    if (dom.settingsDialog && dom.settingsDialog.open) dom.settingsDialog.close();
}

export function restoreAnswerState(questionIndex) {
    const userAnswerIndex = state.userAnswers[questionIndex];
    const buttons = dom.answersContainer ? dom.answersContainer.querySelectorAll('.answer-btn') : [];
    const q = state.quizData[questionIndex];
    if (!q) return;
    const correctIdx = q.correctAnswerIndex;

    buttons.forEach((b) => {
        b.disabled = state.isReviewMode || (userAnswerIndex !== undefined);
        b.classList.remove('selected', 'correct', 'incorrect', 'reveal-correct');
        if (userAnswerIndex !== undefined) {
            const answerIdx = parseInt(b.dataset.index, 10);
            if (answerIdx === userAnswerIndex) {
                b.classList.add('selected');
                b.classList.add(userAnswerIndex === correctIdx ? 'correct' : 'incorrect');
            } else if (userAnswerIndex !== correctIdx && answerIdx === correctIdx) {
                b.classList.add('reveal-correct');
            }
        }
    });

    if (dom.sourceDiv) {
        if (userAnswerIndex !== undefined || state.isReviewMode) {
            dom.sourceDiv.textContent = `Nguồn: ${q.source || 'N/A'}`;
            dom.sourceDiv.classList.remove('hidden');
            dom.sourceDiv.style.display = 'block';
        } else {
            dom.sourceDiv.classList.add('hidden');
            dom.sourceDiv.style.display = 'none';
        }
    }
}

export function handleAnswerSelection(selectedButton) {
    if (state.isReviewMode || state.questionsAnswered[state.currentQuestionIndex]) return;
    clearAutoAdvanceTimer();

    const selectedIndex = parseInt(selectedButton.dataset.index, 10);
    const currentQuestion = state.quizData[state.currentQuestionIndex];
    if (!currentQuestion) return;
    const correctIndex = currentQuestion.correctAnswerIndex;

    let newScore = state.score;
    const newUserAnswers = { ...state.userAnswers, [state.currentQuestionIndex]: selectedIndex };
    const newQuestionsAnswered = { ...state.questionsAnswered, [state.currentQuestionIndex]: true };

    const allButtons = dom.answersContainer ? dom.answersContainer.querySelectorAll('.answer-btn') : [];
    allButtons.forEach(b => b.disabled = true);
    selectedButton.classList.add('selected');

    let isCorrectCurrentAnswer = (selectedIndex === correctIndex);
    if (isCorrectCurrentAnswer) {
        newScore++;
        selectedButton.classList.add('correct');
    } else {
        selectedButton.classList.add('incorrect');
        if (allButtons[correctIndex]) {
            allButtons[correctIndex].classList.add('reveal-correct');
        }
    }
    state.updateQuizState({ userAnswers: newUserAnswers, questionsAnswered: newQuestionsAnswered, score: newScore });

    if (dom.sourceDiv) {
        dom.sourceDiv.textContent = `Nguồn: ${currentQuestion.source || 'N/A'}`;
        dom.sourceDiv.classList.remove('hidden');
        dom.sourceDiv.style.display = 'block';
    }
    if (dom.scoreText) dom.scoreText.textContent = `Điểm: ${state.score}`;
    if (dom.nextBtn) dom.nextBtn.disabled = false;

    if (state.currentQuestionIndex === state.quizData.length - 1) {
        if (dom.nextBtn) dom.nextBtn.textContent = 'Hoàn thành';
    }

    if (isCorrectCurrentAnswer && state.currentQuestionIndex < state.quizData.length - 1 && state.autoAdvanceDuration > 0) {
        if (dom.timerBar) dom.timerBar.classList.add('timer-active');
        const timerId = setTimeout(() => {
            state.updateQuizState({ autoAdvanceTimer: null });
            navigateNext();
        }, state.autoAdvanceDuration);
        state.updateQuizState({ autoAdvanceTimer: timerId });
    }
    state.saveState();
}

export function showResults() {
    console.log("[Mode] Showing Results. Display Name:", state.currentQuizDisplayName);
    if (!state.isReviewMode) {
        if (typeof confetti === 'function') {
            confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 }, zIndex: 1050 });
        } else {
            console.warn("[Effect] Confetti function not found.");
        }
    }
    state.updateQuizState({ isReviewMode: false, reviewWrongOnly: false });
    clearAutoAdvanceTimer();
    ui.showResultsSectionView();
    if (dom.finalScoreText) dom.finalScoreText.textContent = `Điểm cuối cùng: ${state.score} / ${state.quizData.length}`;
    state.saveState();
}

export function navigatePrevious() {
    clearAutoAdvanceTimer();
    let changed = false;
    let newCurrentQuestionIndex = state.currentQuestionIndex;
    let newCurrentWrongAnswerReviewIndex = state.currentWrongAnswerReviewIndex;

    if (state.reviewWrongOnly) {
        if (state.currentWrongAnswerReviewIndex > 0) {
            newCurrentWrongAnswerReviewIndex--;
            newCurrentQuestionIndex = state.wrongAnswerIndices[newCurrentWrongAnswerReviewIndex];
            changed = true;
        }
    } else {
        if (state.currentQuestionIndex > 0) {
            newCurrentQuestionIndex--;
            changed = true;
        }
    }
    if (changed) {
        state.updateQuizState({ 
            currentQuestionIndex: newCurrentQuestionIndex, 
            currentWrongAnswerReviewIndex: newCurrentWrongAnswerReviewIndex 
        });
        displayQuestion(state.currentQuestionIndex);
        state.saveState();
    }
}

export function navigateNext() {
    clearAutoAdvanceTimer();
    let changed = false;
    let finished = false;
    let newCurrentQuestionIndex = state.currentQuestionIndex;
    let newCurrentWrongAnswerReviewIndex = state.currentWrongAnswerReviewIndex;

    if (state.reviewWrongOnly) {
        if (state.currentWrongAnswerReviewIndex < state.wrongAnswerIndices.length - 1) {
            newCurrentWrongAnswerReviewIndex++;
            newCurrentQuestionIndex = state.wrongAnswerIndices[newCurrentWrongAnswerReviewIndex];
            changed = true;
        }
    } else {
        if (state.currentQuestionIndex < state.quizData.length - 1) {
            newCurrentQuestionIndex++;
            changed = true;
        } else if (!state.isReviewMode) {
            finished = true;
        }
    }

    if (changed) {
        state.updateQuizState({ 
            currentQuestionIndex: newCurrentQuestionIndex, 
            currentWrongAnswerReviewIndex: newCurrentWrongAnswerReviewIndex 
        });
        displayQuestion(state.currentQuestionIndex);
        state.saveState();
    } else if (finished) {
        showResults();
    }
}

export function handleJumpToQuestion() {
    if (!state.quizData || state.quizData.length === 0 || !dom.jumpToInput) return;
    const targetNum = parseInt(dom.jumpToInput.value, 10);
    let maxQuestions, targetIndex = -1;
    let changed = false;
    let newCurrentWrongAnswerReviewIndex = state.currentWrongAnswerReviewIndex;

    if (state.reviewWrongOnly) {
        maxQuestions = state.wrongAnswerIndices.length;
        if (!isNaN(targetNum) && targetNum >= 1 && targetNum <= maxQuestions) {
            newCurrentWrongAnswerReviewIndex = targetNum - 1;
            targetIndex = state.wrongAnswerIndices[newCurrentWrongAnswerReviewIndex];
            if (targetIndex !== state.currentQuestionIndex) changed = true;
        } else {
            alert(`Vui lòng nhập số thứ tự câu sai hợp lệ từ 1 đến ${maxQuestions}.`);
        }
    } else {
        maxQuestions = state.quizData.length;
        if (!isNaN(targetNum) && targetNum >= 1 && targetNum <= maxQuestions) {
            targetIndex = targetNum - 1;
            if (targetIndex !== state.currentQuestionIndex) changed = true;
        } else {
            alert(`Vui lòng nhập số câu hợp lệ từ 1 đến ${maxQuestions}.`);
        }
    }

    if (changed) {
        clearAutoAdvanceTimer();
        state.updateQuizState({ 
            currentQuestionIndex: targetIndex, 
            currentWrongAnswerReviewIndex: newCurrentWrongAnswerReviewIndex 
        });
        displayQuestion(state.currentQuestionIndex);
        state.saveState();
    }
    if (dom.jumpToInput) dom.jumpToInput.value = '';
}

// --- Quiz Actions (Restart, Shuffle, Review Mode) ---
export function restartQuiz(wasShuffledDueToButtonOrInitialLoad = false) {
    if (!state.originalQuizData || state.originalQuizData.length === 0) {
        ui.showSelectScreenView();
        return;
    }
    console.log(`[Action] Restarting quiz: ${state.currentQuizDisplayName}`);
    
    let newQuizDataArray = [...state.originalQuizData]; 
    if (wasShuffledDueToButtonOrInitialLoad || (dom.shuffleCheckbox && dom.shuffleCheckbox.checked)) {
        console.log("[Action] Applying shuffle for restart/load.");
        shuffleArray(newQuizDataArray);
    }

    state.updateQuizState({
        score: 0,
        userAnswers: {},
        questionsAnswered: {},
        currentQuestionIndex: 0,
        isReviewMode: false,
        reviewWrongOnly: false,
        wrongAnswerIndices: [],
        currentWrongAnswerReviewIndex: 0,
        quizData: newQuizDataArray
    });

    startQuiz(true);
    state.saveState();
}

export function handleShuffleNow() {
    if (state.isReviewMode || !state.quizData || state.quizData.length === 0) return;
    console.log("[Action] Shuffling current questions via button...");
    restartQuiz(true);
}

export function handleReloadOriginal() {
    if (state.isReviewMode || !state.originalQuizData || state.originalQuizData.length === 0) {
        alert("Không có dữ liệu gốc để tải lại.");
        return;
    }
    console.log("[Action] Reloading original question order...");
    state.updateQuizState({ quizData: [...state.originalQuizData] }); 
    restartQuiz(false);
}

export function startReviewMode() {
    if (!state.quizData || state.quizData.length === 0 || Object.keys(state.userAnswers).length === 0) {
        alert("Chưa có gì để xem lại!");
        return;
    }
    console.log("[Mode] Entering Review");
    const newWrongAnswerIndices = [];
    state.quizData.forEach((q, index) => {
        const userAnswer = state.userAnswers[index];
        if (userAnswer !== undefined && userAnswer !== q.correctAnswerIndex) {
            newWrongAnswerIndices.push(index);
        }
    });

    state.updateQuizState({
        isReviewMode: true,
        reviewWrongOnly: false, 
        currentQuestionIndex: 0,
        currentWrongAnswerReviewIndex: 0,
        wrongAnswerIndices: newWrongAnswerIndices
    });

    clearAutoAdvanceTimer();
    updateTimerDisplayAndControls();
    ui.showQuizSectionView();
    displayQuestion(state.currentQuestionIndex);
    state.saveState();
}

export function exitReviewMode() {
    console.log("[Mode] Exiting Review");
    state.updateQuizState({ isReviewMode: false, reviewWrongOnly: false });
    showResults();
}

export function toggleReviewFilter() {
    if (!state.isReviewMode) return;
    const newReviewWrongOnly = !state.reviewWrongOnly;
    let newCurrentQuestionIndex = state.currentQuestionIndex;
    let newCurrentWrongAnswerReviewIndex = state.currentWrongAnswerReviewIndex;

    if (newReviewWrongOnly) {
        if (state.wrongAnswerIndices.length === 0) {
            alert("Chúc mừng! Tất cả đều đúng.");
            if (dom.toggleFilterBtn) dom.toggleFilterBtn.classList.remove('filter-active');
            return;
        }
        newCurrentWrongAnswerReviewIndex = 0;
        newCurrentQuestionIndex = state.wrongAnswerIndices[newCurrentWrongAnswerReviewIndex];
    } else {
        // When toggling back to show all, currentQuestionIndex should remain if it was valid in the full list.
        // If it was only valid in wrongAnswerIndices (e.g. we jumped to a specific wrong answer),
        // it might need adjustment, but displayQuestion handles out-of-bounds by showing an error or the first question.
        // For simplicity, we let displayQuestion handle it. The current index might be a correct answer.
    }
    state.updateQuizState({ 
        reviewWrongOnly: newReviewWrongOnly, 
        currentQuestionIndex: newCurrentQuestionIndex, 
        currentWrongAnswerReviewIndex: newCurrentWrongAnswerReviewIndex 
    });
    displayQuestion(state.currentQuestionIndex);
    state.saveState();
} 