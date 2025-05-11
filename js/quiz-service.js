import { MANIFEST_PATH } from './config.js';
import * as dom from './dom-elements.js';
import * as ui from './ui-helpers.js';
import * as state from './state.js';
import { startQuiz, shuffleArray } from './quiz-core.js'; // shuffleArray will also be in quiz-core for now

// Variable to hold the event listener function to ensure it can be added/removed if needed,
// though current approach re-clones the select element.
let quizSelectionChangeListener = null;

function handleQuizSelectionChange() {
    const selectedOption = dom.quizFileSelect.options[dom.quizFileSelect.selectedIndex];
    if (selectedOption && selectedOption.value) {
        console.log(`[Event] Quiz selected: DisplayName="${selectedOption.dataset.quizDisplayName}", FilePath="${selectedOption.value}"`);
        loadQuizFromJson(selectedOption.value, selectedOption.dataset.quizDisplayName);
    } else {
        console.log("[Event] Quiz selection cleared or invalid (no value).");
    }
}

function attachQuizSelectListenerInternal() {
    if (dom.quizFileSelect) {
        // Remove old listener if any (though cloning below makes this redundant)
        if (quizSelectionChangeListener && dom.quizFileSelect.parentNode) {
             // quizFileSelect.removeEventListener('change', quizSelectionChangeListener);
        }
        // Clone and replace to ensure no old listeners are carried over from previous select instances
        const newSelect = dom.quizFileSelect.cloneNode(true);
        if (dom.quizFileSelect.parentNode) {
            dom.quizFileSelect.parentNode.replaceChild(newSelect, dom.quizFileSelect);
        }
        // Update the shared DOM element reference in dom-elements.js
        dom.updateQuizFileSelectElement(); 
        
        // Assign the new listener
        quizSelectionChangeListener = handleQuizSelectionChange;
        dom.quizFileSelect.addEventListener('change', quizSelectionChangeListener);
        console.log("[Events] Attached 'change' listener to new quizFileSelect:", dom.quizFileSelect.id);
    } else {
        console.error("[Events] quizFileSelect element not found for attaching listener.");
    }
}

export function loadQuizManifest() {
    console.log(`[Manifest] Starting to fetch ${MANIFEST_PATH}...`);
    ui.hideError();
    if (!dom.quizFileSelect) {
        console.error("[Manifest Error] Quiz file select element not found after update.");
        ui.showError("Lỗi: Không tìm thấy phần tử chọn câu hỏi sau cập nhật.");
        return;
    }
    
    dom.quizFileSelect.innerHTML = '<option value="">Đang tải danh sách...</option>';
    dom.quizFileSelect.disabled = true;
    if (dom.statusMessage) dom.statusMessage.textContent = "";
    if (dom.shuffleCheckbox) dom.shuffleCheckbox.disabled = true;

    const cachedManifest = sessionStorage.getItem('quizManifest');
    if (cachedManifest) {
        try {
            const manifestData = JSON.parse(cachedManifest);
            console.log("[Manifest] Using cached manifest data");
            displayQuizOptions(manifestData);
            // attachQuizSelectListenerInternal(); // Listener attached in displayQuizOptions
            return;
        } catch (e) {
            console.warn("[Manifest] Failed to parse cached manifest:", e);
        }
    }

    const cacheBuster = location.hostname === 'localhost' || location.hostname === '127.0.0.1' ? `?t=${new Date().getTime()}` : '';
    fetch(MANIFEST_PATH + cacheBuster)
        .then(response => {
            if (!response.ok) throw new Error(`Lỗi mạng ${response.status}`);
            return response.json();
        })
        .then(quizList => {
            console.log("[Manifest] Successfully loaded quiz list:", quizList);
            if (!Array.isArray(quizList)) throw new Error("Dữ liệu không hợp lệ: Danh sách không phải mảng");
            sessionStorage.setItem('quizManifest', JSON.stringify(quizList));
            displayQuizOptions(quizList);
            // attachQuizSelectListenerInternal(); // Listener attached in displayQuizOptions
        })
        .catch(error => {
            console.error("[Manifest Error]", error);
            ui.showError(`Không tải được danh sách: ${error.message}`);
            if (dom.quizFileSelect) {
                dom.quizFileSelect.innerHTML = '<option value="">Lỗi tải danh sách</option>';
            }
            if (dom.statusMessage) dom.statusMessage.textContent = "Lỗi.";
        });
}

export function displayQuizOptions(quizList) {
    console.log("[UI] Starting to display options...");
    ui.hideError();
    
    // The quizFileSelect might have been recreated by showSelectScreenView
    // dom.updateQuizFileSelectElement(); // Ensure we use the current one
    // This is already handled by attachQuizSelectListenerInternal if we call it here
    // or if showSelectScreenView correctly updates it.

    if (!dom.quizFileSelect) {
        console.error("[UI Error] Quiz file select element not found for displayQuizOptions");
        ui.showError("Lỗi hiển thị danh sách câu hỏi");
        return;
    }

    dom.quizFileSelect.innerHTML = '';
    const defaultOption = document.createElement('option');
    defaultOption.value = "";
    defaultOption.textContent = "Vui lòng chọn bộ câu hỏi";
    dom.quizFileSelect.appendChild(defaultOption);

    if (quizList && Array.isArray(quizList) && quizList.length > 0) {
        quizList.forEach((quiz) => {
            if (quiz && typeof quiz.name === 'string' && typeof quiz.file === 'string') {
                const option = document.createElement('option');
                option.value = quiz.file;
                option.textContent = quiz.name;
                option.dataset.quizDisplayName = quiz.name;
                dom.quizFileSelect.appendChild(option);
            } else {
                console.warn("[UI] Skipping invalid quiz item:", quiz);
            }
        });
    }
    dom.quizFileSelect.disabled = false;
    if (dom.shuffleCheckbox) dom.shuffleCheckbox.disabled = false;

    if (!quizList || quizList.length === 0) {
        if (dom.statusMessage) {
            dom.statusMessage.textContent = "Không tìm thấy bộ câu hỏi nào.";
            dom.statusMessage.style.display = "block";
        }
    } else {
        if (dom.statusMessage) {
            dom.statusMessage.textContent = "";
            dom.statusMessage.style.display = "none";
        }
    }
    attachQuizSelectListenerInternal(); // Attach listener after options are populated
}

export function loadQuizFromJson(jsonFilePath, quizDisplayName) {
    console.log(`[Fetch] Requesting "${quizDisplayName}" from ${jsonFilePath}`);
    ui.hideError();
    if (dom.statusMessage) dom.statusMessage.textContent = `Đang tải "${quizDisplayName}"...`;
    if (dom.quizFileSelect) dom.quizFileSelect.disabled = true;
    if (dom.shuffleCheckbox) dom.shuffleCheckbox.disabled = true;

    state.updateQuizState({ currentQuizDisplayName: quizDisplayName });
    if (dom.quizTitleElement) {
        dom.quizTitleElement.textContent = quizDisplayName;
        dom.quizTitleElement.classList.remove('hidden');
    }

    if (state.loadedQuizzes[jsonFilePath]) {
        console.log("[Fetch] Using cached quiz data for", jsonFilePath);
        processQuizData(state.loadedQuizzes[jsonFilePath]);
        return;
    }

    const cacheBuster = location.hostname === 'localhost' || location.hostname === '127.0.0.1' ? `?t=${new Date().getTime()}` : '';
    fetch(jsonFilePath + cacheBuster)
        .then(response => {
            if (!response.ok) throw new Error(`Lỗi mạng ${response.status} khi tải ${jsonFilePath}`);
            return response.json();
        })
        .then(jsonData => {
            console.log("[Fetch] Success for", jsonFilePath, jsonData);
            state.loadedQuizzes[jsonFilePath] = jsonData; // Cache it
            processQuizData(jsonData);
        })
        .catch(error => {
            console.error("[Fetch Error] for " + jsonFilePath, error);
            ui.showError(`Lỗi tải "${quizDisplayName}": ${error.message}`);
            ui.showSelectScreenView(); // Go back to select screen on error
        });
}

export function processQuizData(jsonData) {
    const displayName = jsonData.originalDisplayName || state.currentQuizDisplayName;
    console.log(`[Processing] Data for "${displayName}". Questions:`, jsonData.questions ? jsonData.questions.length : 'N/A');
    try {
        if (!jsonData || !Array.isArray(jsonData.questions) || jsonData.questions.length === 0) {
            throw new Error("Dữ liệu không hợp lệ hoặc không có câu hỏi. Received: " + JSON.stringify(jsonData).substring(0, 100));
        }
        const firstQ = jsonData.questions[0];
        if (typeof firstQ.question !== 'string' || !Array.isArray(firstQ.options) || typeof firstQ.correctAnswerIndex !== 'number') {
            console.warn("[Processing] Cấu trúc câu hỏi đầu tiên có vẻ lạ:", firstQ);
        }

        let newOriginalQuizData = [...jsonData.questions];
        let newQuizData = [...jsonData.questions];

        if (dom.shuffleCheckbox && dom.shuffleCheckbox.checked) {
            console.log("[Prep] Shuffling...");
            shuffleArray(newQuizData); // Assumes shuffleArray is imported or available
        }
        
        state.updateQuizState({
            originalQuizData: newOriginalQuizData,
            quizData: newQuizData,
            // currentQuizDisplayName is already set by loadQuizFromJson
        });

        if (dom.statusMessage) dom.statusMessage.textContent = `Đã tải: ${state.currentQuizDisplayName} (${state.quizData.length} câu)`;
        
        ui.showQuizSectionView(); // Transition to quiz view
        startQuiz(); // Initialize and display the first question
        state.saveState();

    } catch (error) {
        console.error("[Processing Error]", error);
        ui.showError(`Lỗi xử lý dữ liệu: ${error.message}.`);
        ui.showSelectScreenView(); // Go back to select screen
    }
} 