import { MANIFEST_PATH } from './config.js';
import * as dom from './dom-elements.js';
import * as ui from './ui-helpers.js';
import * as state from './state.js';
import { startQuiz, shuffleArray } from './quiz-core.js'; // shuffleArray will also be in quiz-core for now
import {
    ensureQuestionCount,
    getQuizId,
    getMetaForQuiz,
    getAttemptForQuiz,
    upsertMetaForQuiz,
    getMostRecentAttempt
} from './quiz-metadata.js';

// Variable to hold the event listener function to ensure it can be added/removed if needed,
// though current approach re-clones the select element.
let quizSelectionChangeListener = null;
const DEFAULT_TAG = 'Chung';
let enrichedQuizItems = [];
let searchTerm = '';
let searchHandlersAttached = false;
let metadataCacheBuster = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? `?t=${new Date().getTime()}`
    : '';

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

function normalizeText(text) {
    if (!text) return '';
    return text
        .toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase('vi')
        .trim();
}

function deriveTagsFromQuiz(quiz) {
    if (Array.isArray(quiz?.tags) && quiz.tags.length) {
        const uniqueTags = new Set();
        quiz.tags.forEach((tag) => {
            if (typeof tag === 'string' && tag.trim()) {
                uniqueTags.add(tag.trim());
            }
        });
        if (uniqueTags.size > 0) {
            return Array.from(uniqueTags);
        }
    }
    if (typeof quiz?.topic === 'string' && quiz.topic.trim()) {
        return [quiz.topic.trim()];
    }
    const name = typeof quiz?.name === 'string' ? quiz.name : '';
    if (!name) return [DEFAULT_TAG];
    const stripped = name.replace(/^\d+[.-]?\s*/, '').trim();
    if (!stripped) return [DEFAULT_TAG];
    const firstSegment = stripped.split(',')[0] || stripped;
    const beforeDash = firstSegment.split(' - ')[0];
    const candidate = (beforeDash || firstSegment).trim();
    return [candidate || DEFAULT_TAG];
}

function buildEnrichedQuizItem(quiz) {
    if (!quiz || typeof quiz.name !== 'string' || typeof quiz.file !== 'string') return null;
    const candidatePaths = buildCandidatePaths(quiz.file);
    if (!candidatePaths.length) return null;
    const quizId = getQuizId(candidatePaths, quiz.name);
    if (!quizId) return null;

    const rawTags = deriveTagsFromQuiz(quiz);
    const tags = rawTags.length > 0 ? rawTags : [DEFAULT_TAG];
    const tagsNormalized = tags.map(tag => normalizeText(tag));
    if (!tagsNormalized.length) {
        tags.push(DEFAULT_TAG);
        tagsNormalized.push(normalizeText(DEFAULT_TAG));
    }

    const meta = getMetaForQuiz(quizId) || {};
    const attempt = getAttemptForQuiz(quizId);

    return {
        id: quizId,
        displayName: quiz.name,
        displayNameNormalized: normalizeText(quiz.name),
        candidatePaths,
        tags,
        tagsNormalized,
        questionCount: (typeof meta.questionCount === 'number') ? meta.questionCount : null,
        lastAttempt: attempt || null
    };
}

function createQuizCard(item) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'quiz-card';
    card.dataset.quizId = item.id;

    const title = document.createElement('div');
    title.className = 'quiz-card-title';
    title.textContent = item.displayName;
    card.appendChild(title);

    const meta = document.createElement('div');
    meta.className = 'quiz-card-meta';
    const questionCountSpan = document.createElement('span');
    questionCountSpan.textContent = item.questionCount != null
        ? `${item.questionCount} câu hỏi`
        : 'Đang cập nhật số câu';
    meta.appendChild(questionCountSpan);

    const attemptSpan = document.createElement('span');
    if (item.lastAttempt && typeof item.lastAttempt.lastScore === 'number' && typeof item.lastAttempt.totalQuestions === 'number') {
        attemptSpan.textContent = `Lần gần nhất: ${item.lastAttempt.lastScore}/${item.lastAttempt.totalQuestions}`;
    } else {
        attemptSpan.textContent = 'Chưa làm';
    }
    meta.appendChild(attemptSpan);
    card.appendChild(meta);

    card.addEventListener('click', () => {
        if (dom.quizFileSelect) {
            dom.quizFileSelect.value = item.candidatePaths[0] || '';
        }
        loadQuizFromJson(item.candidatePaths, item.displayName);
    });

    return card;
}

function renderQuizCards() {
    if (!dom.quizCardGrid) return;
    dom.quizCardGrid.innerHTML = '';

    const normalizedSearch = searchTerm.trim();

    const filteredItems = enrichedQuizItems.filter((item) => {
        if (!normalizedSearch) return true;
        const matchesName = item.displayNameNormalized.includes(normalizedSearch);
        const matchesTags = item.tagsNormalized.some(tag => tag.includes(normalizedSearch));
        return matchesName || matchesTags;
    });

    if (filteredItems.length === 0) {
        if (dom.noQuizResultsMessage) {
            dom.noQuizResultsMessage.textContent = "Không tìm thấy bộ câu hỏi phù hợp. Hãy thử từ khóa khác.";
            dom.noQuizResultsMessage.classList.remove('hidden');
        }
        if (dom.statusMessage) dom.statusMessage.textContent = '';
        return;
    }
    if (dom.noQuizResultsMessage) dom.noQuizResultsMessage.classList.add('hidden');

    const fragment = document.createDocumentFragment();
    filteredItems.forEach((item) => {
        fragment.appendChild(createQuizCard(item));
    });
    dom.quizCardGrid.appendChild(fragment);
    updateStatusMessage(filteredItems.length);
}

function populateMobileSelect(items) {
    if (!dom.quizFileSelect) return;
    dom.quizFileSelect.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Vui lòng chọn bộ câu hỏi';
    dom.quizFileSelect.appendChild(placeholder);

    items.forEach((item) => {
        const option = document.createElement('option');
        option.value = item.candidatePaths[0] || '';
        option.dataset.quizPaths = JSON.stringify(item.candidatePaths);
        option.dataset.quizDisplayName = item.displayName;
        option.dataset.quizId = item.id;
        option.textContent = item.questionCount != null
            ? `${item.displayName} (${item.questionCount} câu)`
            : item.displayName;
        dom.quizFileSelect.appendChild(option);
    });
}

function updateMobileSelectOption(item) {
    if (!dom.quizFileSelect) return;
    const options = Array.from(dom.quizFileSelect.options || []);
    const targetOption = options.find(opt => opt.dataset.quizId === item.id);
    if (targetOption) {
        targetOption.textContent = item.questionCount != null
            ? `${item.displayName} (${item.questionCount} câu)`
            : item.displayName;
        targetOption.dataset.quizPaths = JSON.stringify(item.candidatePaths);
    }
}

function setupSearchAndFilterInteractions() {
    if (searchHandlersAttached) return;
    if (dom.quizSearchInput) {
        dom.quizSearchInput.addEventListener('input', (event) => {
            searchTerm = normalizeText(event.target.value);
            renderQuizCards();
        });
    }
    searchHandlersAttached = true;
}

function updateStatusMessage(count) {
    if (!dom.statusMessage) return;
    if (!count) {
        dom.statusMessage.textContent = '';
        return;
    }
    dom.statusMessage.textContent = count === 1
        ? "Tìm thấy 1 bộ câu hỏi."
        : `Tìm thấy ${count} bộ câu hỏi.`;
}

function updateResumeButton() {
    if (!dom.resumeLastBtn) return;
    const latestAttempt = getMostRecentAttempt();
    if (!latestAttempt) {
        dom.resumeLastBtn.classList.add('hidden');
        dom.resumeLastBtn.disabled = true;
        dom.resumeLastBtn.onclick = null;
        return;
    }
    const matchingQuiz = enrichedQuizItems.find(item => item.id === latestAttempt.quizId);
    if (!matchingQuiz) {
        dom.resumeLastBtn.classList.add('hidden');
        dom.resumeLastBtn.disabled = true;
        dom.resumeLastBtn.onclick = null;
        return;
    }

    const payload = latestAttempt.payload || {};
    const scoreLabel = (typeof payload.lastScore === 'number' && typeof payload.totalQuestions === 'number')
        ? `Lần trước: ${payload.lastScore}/${payload.totalQuestions}`
        : 'Tiếp tục lần trước';

    dom.resumeLastBtn.classList.remove('hidden');
    dom.resumeLastBtn.disabled = false;
    dom.resumeLastBtn.textContent = `Tiếp tục "${matchingQuiz.displayName}"`;
    dom.resumeLastBtn.title = scoreLabel;
    dom.resumeLastBtn.onclick = () => {
        if (dom.quizSearchInput) dom.quizSearchInput.value = '';
        searchTerm = '';
        renderQuizCards();
        loadQuizFromJson(matchingQuiz.candidatePaths, matchingQuiz.displayName);
    };
}

async function hydrateQuestionCounts(items) {
    const pending = items.filter(item => item.questionCount == null);
    if (!pending.length) return;

    for (const item of pending) {
        const count = await ensureQuestionCount(item.id, item.candidatePaths, metadataCacheBuster);
        if (typeof count === 'number') {
            item.questionCount = count;
            updateMobileSelectOption(item);
            renderQuizCards();
        }
    }
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

function handleQuizSelectionChange() {
    const selectedOption = dom.quizFileSelect.options[dom.quizFileSelect.selectedIndex];
    if (selectedOption && selectedOption.value) {
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
            return;
        }
        console.log(`[Event] Quiz selected: DisplayName="${selectedOption.dataset.quizDisplayName}", FilePaths="${candidatePaths.join(', ')}"`);
        loadQuizFromJson(candidatePaths, selectedOption.dataset.quizDisplayName);
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
    metadataCacheBuster = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
        ? `?t=${new Date().getTime()}`
        : '';
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

    enrichedQuizItems = [];
    searchTerm = '';
    if (dom.quizSearchInput) dom.quizSearchInput.value = '';
    if (dom.noQuizResultsMessage) dom.noQuizResultsMessage.classList.add('hidden');

    if (!Array.isArray(quizList) || quizList.length === 0) {
        populateMobileSelect([]);
        attachQuizSelectListenerInternal();
        if (dom.quizFileSelect) dom.quizFileSelect.disabled = true;
        if (dom.shuffleCheckbox) dom.shuffleCheckbox.disabled = true;
        renderQuizCards();
        updateResumeButton();
        return;
    }

    quizList.forEach((quiz) => {
        const item = buildEnrichedQuizItem(quiz);
        if (!item) {
            console.warn("[UI] Skipping invalid quiz item:", quiz);
            return;
        }
        enrichedQuizItems.push(item);
    });

    populateMobileSelect(enrichedQuizItems);
    attachQuizSelectListenerInternal();

    if (dom.quizFileSelect) dom.quizFileSelect.disabled = enrichedQuizItems.length === 0;
    if (dom.shuffleCheckbox) dom.shuffleCheckbox.disabled = enrichedQuizItems.length === 0;

    setupSearchAndFilterInteractions();
    renderQuizCards();
    updateResumeButton();
    hydrateQuestionCounts(enrichedQuizItems);
}

export function loadQuizFromJson(jsonFilePathOrList, quizDisplayName) {
    const candidatePaths = Array.isArray(jsonFilePathOrList)
        ? jsonFilePathOrList
        : buildCandidatePaths(jsonFilePathOrList);
    const validPaths = candidatePaths
        .map(path => (typeof path === 'string' ? path.trim() : ''))
        .filter(path => path);

    if (validPaths.length === 0) {
        console.error(`[Fetch Error] No valid paths to load "${quizDisplayName}". Input:`, jsonFilePathOrList);
        ui.showError(`Không tìm thấy đường dẫn hợp lệ cho "${quizDisplayName}".`);
        return;
    }

    const primaryPath = validPaths[0];
    console.log(`[Fetch] Requesting "${quizDisplayName}" starting with ${primaryPath}`);
    ui.hideError();
    if (dom.statusMessage) dom.statusMessage.textContent = `Đang tải "${quizDisplayName}"...`;
    if (dom.quizFileSelect) dom.quizFileSelect.disabled = true;
    if (dom.shuffleCheckbox) dom.shuffleCheckbox.disabled = true;

    state.updateQuizState({ currentQuizDisplayName: quizDisplayName, currentQuizId: primaryPath });
    if (dom.quizTitleElement) {
        dom.quizTitleElement.textContent = quizDisplayName;
        dom.quizTitleElement.classList.remove('hidden');
    }

    const cachedPath = validPaths.find(path => state.loadedQuizzes[path]);
    if (cachedPath) {
        console.log("[Fetch] Using cached quiz data for", cachedPath);
        processQuizData(state.loadedQuizzes[cachedPath]);
        return;
    }

    const cacheBuster = location.hostname === 'localhost' || location.hostname === '127.0.0.1' ? `?t=${new Date().getTime()}` : '';
    attemptFetchWithFallback(validPaths, cacheBuster)
        .then(({ jsonData, path: successfulPath }) => {
            console.log("[Fetch] Success for", successfulPath, jsonData);
            validPaths.forEach(path => {
                if (!state.loadedQuizzes[path]) {
                    state.loadedQuizzes[path] = jsonData;
                }
            });
            processQuizData(jsonData);
        })
        .catch(error => {
            console.error("[Fetch Error] for " + validPaths.join(', '), error);
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
        if (state.currentQuizId) {
            upsertMetaForQuiz(state.currentQuizId, { questionCount: newOriginalQuizData.length });
        }

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
