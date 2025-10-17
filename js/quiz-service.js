import { MANIFEST_PATH } from './config.js';
import * as dom from './dom-elements.js';
import * as ui from './ui-helpers.js';
import * as state from './state.js';
import { startQuiz, shuffleArray } from './quiz-core.js'; // shuffleArray will also be in quiz-core for now

const QUIZ_CACHE_PREFIX = 'quizCache:';

// Variable to hold the event listener function to ensure it can be added/removed if needed,
// though current approach re-clones the select element.
let quizSelectionChangeListener = null;
let pendingQuiz = null;
let currentFetchToken = null;

function ensureRelativePath(path) {
    if (typeof path !== 'string') return '';
    if (/^https?:\/\//i.test(path)) return path;
    if (path.startsWith('./') || path.startsWith('../')) return path;
    if (path.startsWith('/')) return `.${path}`;
    return `./${path}`;
}

function buildCandidatePaths(rawPath) {
    if (typeof rawPath !== 'string') return [];
    const trimmed = rawPath.trim();
    if (!trimmed) return [];
    if (/^https?:\/\//i.test(trimmed)) return [trimmed];

    const candidates = new Set();
    const normalizedPrimary = ensureRelativePath(trimmed);
    candidates.add(normalizedPrimary);

    if (trimmed.includes('data-compress')) {
        candidates.add(ensureRelativePath(trimmed.replace('data-compress', 'data')));
    }
    if (trimmed.includes('data-compressed')) {
        candidates.add(ensureRelativePath(trimmed.replace('data-compressed', 'data')));
    }

    return Array.from(candidates);
}

function attemptFetchWithFallback(paths, cacheBuster) {
    let lastError = null;

    const tryIndex = (index) => {
        if (index >= paths.length) {
            if (lastError) throw lastError;
            throw new Error('Không thể tải dữ liệu quiz.');
        }

        const targetPath = paths[index];

        return fetch(targetPath + cacheBuster)
            .then(response => {
                if (!response.ok) {
                    const error = new Error(`Lỗi mạng ${response.status} khi tải ${targetPath}`);
                    error.status = response.status;
                    throw error;
                }
                return response.json().then(jsonData => ({ jsonData, path: targetPath }));
            })
            .catch(error => {
                console.warn(`[Fetch] Attempt ${index + 1} failed for ${targetPath}:`, error);
                lastError = error;
                if (index === paths.length - 1) {
                    throw error;
                }
                return tryIndex(index + 1);
            });
    };

    return tryIndex(0);
}

function cacheQuizDataForPaths(paths, jsonData) {
    paths.forEach(path => {
        state.loadedQuizzes[path] = jsonData;
        try {
            sessionStorage.setItem(`${QUIZ_CACHE_PREFIX}${path}`, JSON.stringify(jsonData));
        } catch (error) {
            console.warn("[Cache] Unable to persist quiz data in sessionStorage for", path, error);
        }
    });
}

function getQuizFromCache(paths) {
    for (const path of paths) {
        if (state.loadedQuizzes[path]) {
            return { jsonData: state.loadedQuizzes[path], path };
        }
        try {
            const cached = sessionStorage.getItem(`${QUIZ_CACHE_PREFIX}${path}`);
            if (cached) {
                const parsed = JSON.parse(cached);
                state.loadedQuizzes[path] = parsed;
                return { jsonData: parsed, path };
            }
        } catch (error) {
            console.warn("[Cache] Failed to parse cached quiz data for", path, error);
        }
    }
    return null;
}

function resetPendingQuiz() {
    pendingQuiz = null;
    currentFetchToken = null;
    ui.setStartButtonAvailability(false);
    if (dom.shuffleCheckbox) dom.shuffleCheckbox.disabled = false;
}

function handleQuizSelectionChange() {
    const selectedOption = dom.quizFileSelect?.options[dom.quizFileSelect.selectedIndex];

    if (!selectedOption || !selectedOption.value) {
        console.log("[Event] Quiz selection cleared or invalid (no value).");
        resetPendingQuiz();
        ui.setQuizLoadingState(false, '');
        if (dom.quizTitleElement) {
            dom.quizTitleElement.textContent = '';
            dom.quizTitleElement.classList.add('hidden');
        }
        return;
    }

    let candidatePaths = [];
    if (selectedOption.dataset.quizPaths) {
        try {
            const parsedPaths = JSON.parse(selectedOption.dataset.quizPaths);
            if (Array.isArray(parsedPaths)) {
                candidatePaths = parsedPaths;
            }
        } catch (error) {
            console.warn("[Event] Failed to parse stored quiz paths for option.", error);
        }
    }
    if (candidatePaths.length === 0) {
        candidatePaths = buildCandidatePaths(selectedOption.value);
    }
    if (candidatePaths.length === 0) {
        console.error("[Event] No valid file paths available for selected quiz option.");
        ui.showError("Không tìm thấy đường dẫn hợp lệ cho bộ câu hỏi đã chọn.");
        resetPendingQuiz();
        return;
    }

    const displayName = selectedOption.dataset.quizDisplayName || selectedOption.textContent || 'Quiz';
    console.log(`[Event] Quiz selected: DisplayName="${displayName}", FilePaths="${candidatePaths.join(', ')}"`);
    prepareQuizForStart(candidatePaths, displayName);
}

function prepareQuizForStart(candidatePaths, displayName) {
    const validPaths = candidatePaths
        .map(path => (typeof path === 'string' ? path.trim() : ''))
        .filter(path => path);

    if (validPaths.length === 0) {
        ui.showError(`Không tìm thấy đường dẫn hợp lệ cho "${displayName}".`);
        resetPendingQuiz();
        ui.setQuizLoadingState(false, '');
        return;
    }

    if (dom.quizTitleElement) {
        dom.quizTitleElement.textContent = displayName;
        dom.quizTitleElement.classList.remove('hidden');
    }

    const cachedData = getQuizFromCache(validPaths);
    if (cachedData) {
        pendingQuiz = { displayName, jsonData: cachedData.jsonData, paths: validPaths };
        currentFetchToken = null;
        ui.setQuizLoadingState(false, `Đã sẵn sàng: ${displayName}`);
        ui.setStartButtonAvailability(true);
        if (dom.statusMessage) {
            const count = Array.isArray(cachedData.jsonData?.questions) ? cachedData.jsonData.questions.length : '?';
            dom.statusMessage.textContent = `Đã sẵn sàng: ${displayName} (${count} câu hỏi)`;
        }
        if (dom.shuffleCheckbox) dom.shuffleCheckbox.disabled = false;
        return;
    }

    const fetchToken = Symbol('quiz-fetch');
    currentFetchToken = fetchToken;
    pendingQuiz = null;
    ui.setStartButtonAvailability(false);
    const loadingMessage = `Đang chuẩn bị "${displayName}"...`;
    ui.setQuizLoadingState(true, loadingMessage);
    if (dom.shuffleCheckbox) dom.shuffleCheckbox.disabled = true;

    const cacheBuster = location.hostname === 'localhost' || location.hostname === '127.0.0.1'
        ? `?t=${Date.now()}`
        : '';

    attemptFetchWithFallback(validPaths, cacheBuster)
        .then(({ jsonData, path }) => {
            if (currentFetchToken !== fetchToken) {
                console.log("[Fetch] Ignoring stale response for", path);
                return;
            }
            cacheQuizDataForPaths(validPaths, jsonData);
            pendingQuiz = { displayName, jsonData, paths: validPaths };
            currentFetchToken = null;
            ui.setQuizLoadingState(false, `Đã sẵn sàng: ${displayName}`);
            ui.setStartButtonAvailability(true);
            if (dom.statusMessage) {
                const count = Array.isArray(jsonData?.questions) ? jsonData.questions.length : '?';
                dom.statusMessage.textContent = `Đã tải: ${displayName} (${count} câu hỏi)`;
            }
            if (dom.shuffleCheckbox) dom.shuffleCheckbox.disabled = false;
        })
        .catch(error => {
            if (currentFetchToken !== fetchToken) {
                return;
            }
            console.error("[Fetch Error] for " + validPaths.join(', '), error);
            resetPendingQuiz();
            ui.setQuizLoadingState(false, '');
            ui.showError(`Lỗi tải "${displayName}": ${error.message}`);
            if (typeof ui.showToast === 'function') {
                ui.showToast(`Không thể tải "${displayName}". Vui lòng thử lại.`, { type: 'error' });
            }
            if (dom.shuffleCheckbox) dom.shuffleCheckbox.disabled = false;
        });
}

function attachQuizSelectListenerInternal() {
    if (!dom.quizFileSelect) {
        console.error("[Events] quizFileSelect element not found for attaching listener.");
        return;
    }

    const newSelect = dom.quizFileSelect.cloneNode(true);
    if (dom.quizFileSelect.parentNode) {
        dom.quizFileSelect.parentNode.replaceChild(newSelect, dom.quizFileSelect);
    }
    dom.updateQuizFileSelectElement();

    quizSelectionChangeListener = handleQuizSelectionChange;
    dom.quizFileSelect.addEventListener('change', quizSelectionChangeListener);
    console.log("[Events] Attached 'change' listener to new quizFileSelect:", dom.quizFileSelect.id);
}

export function loadQuizManifest() {
    console.log(`[Manifest] Starting to fetch ${MANIFEST_PATH}...`);
    ui.hideError();
    resetPendingQuiz();

    if (!dom.quizFileSelect) {
        console.error("[Manifest Error] Quiz file select element not found after update.");
        ui.showError("Lỗi: Không tìm thấy phần tử chọn câu hỏi sau cập nhật.");
        return;
    }

    dom.quizFileSelect.innerHTML = '<option value="">Đang tải danh sách...</option>';
    dom.quizFileSelect.disabled = true;
    if (dom.statusMessage) dom.statusMessage.textContent = "";
    if (dom.shuffleCheckbox) dom.shuffleCheckbox.disabled = true;
    ui.setQuizLoadingState(true, 'Đang tải danh sách bộ câu hỏi...');

    const cachedManifest = sessionStorage.getItem('quizManifest');
    if (cachedManifest) {
        try {
            const manifestData = JSON.parse(cachedManifest);
            console.log("[Manifest] Using cached manifest data");
            displayQuizOptions(manifestData);
            return;
        } catch (e) {
            console.warn("[Manifest] Failed to parse cached manifest:", e);
        }
    }

    const cacheBuster = location.hostname === 'localhost' || location.hostname === '127.0.0.1' ? `?t=${Date.now()}` : '';
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
        })
        .catch(error => {
            console.error("[Manifest Error]", error);
            ui.showError(`Không tải được danh sách: ${error.message}`);
            if (dom.quizFileSelect) {
                dom.quizFileSelect.innerHTML = '<option value="">Lỗi tải danh sách</option>';
            }
            if (dom.statusMessage) dom.statusMessage.textContent = "Lỗi.";
            ui.setQuizLoadingState(false, '');
        });
}

export function displayQuizOptions(quizList) {
    console.log("[UI] Starting to display options...");
    ui.hideError();

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
                const candidatePaths = buildCandidatePaths(quiz.file);
                if (!candidatePaths.length) {
                    console.warn("[UI] Skipping quiz item due to invalid file path:", quiz);
                    return;
                }
                option.value = candidatePaths[0];
                option.dataset.quizPaths = JSON.stringify(candidatePaths);
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
    } else if (dom.statusMessage) {
        dom.statusMessage.textContent = "";
        dom.statusMessage.style.display = "none";
    }

    ui.setQuizLoadingState(false, '');
    ui.setStartButtonAvailability(false);
    attachQuizSelectListenerInternal(); // Attach listener after options are populated
}

export function startPreparedQuiz() {
    if (!pendingQuiz) {
        if (typeof ui.showToast === 'function') {
            ui.showToast('Vui lòng chọn bộ câu hỏi trước.', { type: 'warning' });
        } else {
            ui.showError('Vui lòng chọn bộ câu hỏi trước.');
        }
        return;
    }

    const { displayName, jsonData } = pendingQuiz;
    console.log(`[Start] Starting quiz "${displayName}" from prefetched data.`);
    ui.setStartButtonAvailability(false);
    ui.setQuizLoadingState(false, '');
    if (dom.prefetchStartBtn) {
        dom.prefetchStartBtn.disabled = true;
        dom.prefetchStartBtn.textContent = 'Đang mở...';
    }

    state.updateQuizState({ currentQuizDisplayName: displayName });
    ui.showQuestionSkeleton();
    processQuizData(jsonData);

    pendingQuiz = null;
    if (dom.prefetchStartBtn) {
        dom.prefetchStartBtn.textContent = 'Bắt đầu luyện tập';
    }
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

        const newOriginalQuizData = [...jsonData.questions];
        let newQuizData = [...jsonData.questions];

        if (dom.shuffleCheckbox && dom.shuffleCheckbox.checked) {
            console.log("[Prep] Shuffling...");
            shuffleArray(newQuizData);
        }

        state.updateQuizState({
            originalQuizData: newOriginalQuizData,
            quizData: newQuizData,
        });

        if (dom.statusMessage) dom.statusMessage.textContent = '';
        ui.showQuizSectionView();
        startQuiz();
        state.saveState();
    } catch (error) {
        console.error("[Processing Error]", error);
        ui.showError(`Lỗi xử lý dữ liệu: ${error.message}.`);
        ui.showSelectScreenView();
    } finally {
        if (dom.prefetchStartBtn) {
            dom.prefetchStartBtn.disabled = false;
        }
        if (dom.shuffleCheckbox) dom.shuffleCheckbox.disabled = false;
        ui.hideQuestionSkeleton();
    }
}

export { buildCandidatePaths };
