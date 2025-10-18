const META_STORAGE_KEY = 'quizMetaCache';
const ATTEMPT_STORAGE_KEY = 'quizAttemptStats';

function safeParse(json, fallback) {
    try {
        return json ? JSON.parse(json) : fallback;
    } catch (error) {
        console.warn('[Metadata] Failed to parse storage payload', error);
        return fallback;
    }
}

function loadCache(key) {
    if (typeof localStorage === 'undefined') return {};
    const raw = localStorage.getItem(key);
    return safeParse(raw, {});
}

function saveCache(key, value) {
    if (typeof localStorage === 'undefined') return;
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.warn('[Metadata] Unable to persist cache', error);
    }
}

const metaCache = loadCache(META_STORAGE_KEY);
const attemptCache = loadCache(ATTEMPT_STORAGE_KEY);

export function getQuizId(candidatePaths = [], fallbackName = '') {
    if (Array.isArray(candidatePaths) && candidatePaths.length > 0) {
        const firstValid = candidatePaths.find((path) => typeof path === 'string' && path.trim().length > 0);
        if (firstValid) return firstValid.trim();
    }
    if (fallbackName && typeof fallbackName === 'string') {
        return fallbackName.trim();
    }
    return '';
}

export function getMetaForQuiz(quizId) {
    if (!quizId) return null;
    return metaCache[quizId] || null;
}

export function upsertMetaForQuiz(quizId, partialMeta) {
    if (!quizId || !partialMeta) return;
    const existing = metaCache[quizId] || {};
    metaCache[quizId] = { ...existing, ...partialMeta };
    saveCache(META_STORAGE_KEY, metaCache);
}

export function getAttemptForQuiz(quizId) {
    if (!quizId) return null;
    return attemptCache[quizId] || null;
}

export function getAllAttemptSummaries() {
    return { ...attemptCache };
}

export function recordAttemptForQuiz(quizId, attemptPayload) {
    if (!quizId || !attemptPayload) return;
    attemptCache[quizId] = {
        ...attemptPayload,
        updatedAt: new Date().toISOString()
    };
    saveCache(ATTEMPT_STORAGE_KEY, attemptCache);
}

export function getMostRecentAttempt() {
    let latest = null;
    Object.entries(attemptCache).forEach(([quizId, payload]) => {
        if (!payload?.updatedAt) return;
        const timestamp = Date.parse(payload.updatedAt);
        if (Number.isNaN(timestamp)) return;
        if (!latest || timestamp > latest.timestamp) {
            latest = {
                quizId,
                payload,
                timestamp
            };
        }
    });
    return latest;
}

export async function ensureQuestionCount(quizId, candidatePaths, cacheBuster = '') {
    if (!quizId) return null;
    const existing = getMetaForQuiz(quizId);
    if (existing && typeof existing.questionCount === 'number') {
        return existing.questionCount;
    }

    if (!Array.isArray(candidatePaths) || candidatePaths.length === 0) {
        return null;
    }

    for (const path of candidatePaths) {
        if (!path) continue;
        try {
            const response = await fetch(path + cacheBuster, { cache: 'no-store' });
            if (!response.ok) continue;
            const json = await response.json();
            const count = Array.isArray(json?.questions) ? json.questions.length : null;
            if (typeof count === 'number') {
                upsertMetaForQuiz(quizId, { questionCount: count });
                return count;
            }
        } catch (error) {
            console.warn(`[Metadata] Failed to resolve question count for ${path}`, error);
        }
    }
    return null;
}

export function getAllTagsFromManifest(quizList = []) {
    const tagSet = new Set();
    quizList.forEach((quiz) => {
        if (Array.isArray(quiz?.tags)) {
            quiz.tags.forEach((tag) => {
                if (typeof tag === 'string' && tag.trim()) {
                    tagSet.add(tag.trim());
                }
            });
        }
    });
    return Array.from(tagSet).sort((a, b) => a.localeCompare(b, 'vi'));
}
