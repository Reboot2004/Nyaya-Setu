// Nyaya-Setu Bhashini API client (optional online enhancement).
// Translates Indic narrative to English for better statutory-title matching.
// Falls back to in-house dialect lexicon when offline or no credentials.
//
// Setup: register at https://bhashini.gov.in/ulca/user/register
//        then set BHASHINI_USER_ID and BHASHINI_API_KEY below or via
//        localStorage keys 'nyaya_bhashini_uid' / 'nyaya_bhashini_key'.

const PIPELINE_ID = '64392f96daac500b55c543cd'; // MeitY translation pipeline
const CONFIG_URL = 'https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline';

// Credentials: edit these or set via localStorage before first use.
let _userId = '';
let _apiKey = '';

function getCredentials() {
    if (_userId && _apiKey) return { userId: _userId, apiKey: _apiKey };
    try {
        _userId = localStorage.getItem('nyaya_bhashini_uid') || '';
        _apiKey = localStorage.getItem('nyaya_bhashini_key') || '';
    } catch { /* ignore */ }
    return { userId: _userId, apiKey: _apiKey };
}

export function setBhashiniCredentials(uid, key) {
    _userId = uid;
    _apiKey = key;
    try {
        localStorage.setItem('nyaya_bhashini_uid', uid);
        localStorage.setItem('nyaya_bhashini_key', key);
    } catch { /* ignore */ }
}

export function hasBhashiniCredentials() {
    const { userId, apiKey } = getCredentials();
    return !!(userId && apiKey);
}

// Step 1: Pipeline Config — discover inference endpoint + auth headers.
let _cachedEndpoint = null;
let _cachedHeaders = null;

async function discoverPipeline(sourceLang, targetLang) {
    if (_cachedEndpoint && _cachedHeaders) return { endpoint: _cachedEndpoint, headers: _cachedHeaders };

    const { userId, apiKey } = getCredentials();
    if (!userId || !apiKey) throw new Error('no-bhashini-credentials');

    const resp = await fetch(CONFIG_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', userID: userId, ulcaApiKey: apiKey },
        body: JSON.stringify({
            pipelineTasks: [{ taskType: 'translation', config: { language: { sourceLanguage, targetLanguage } } }],
            pipelineRequestConfig: { pipelineId: PIPELINE_ID }
        })
    });
    if (!resp.ok) throw new Error(`bhashini-config-${resp.status}`);

    const data = await resp.json();
    const ep = data?.pipelineInferenceAPIEndPoint;
    if (!ep?.callbackUrl) throw new Error('bhashini-no-endpoint');

    const endpoint = ep.callbackUrl;
    const authKey = ep.inferenceApiKey?.name || 'Authorization';
    const authVal = ep.inferenceApiKey?.value || '';
    const headers = { 'Content-Type': 'application/json', [authKey]: authVal };

    // Cache for subsequent calls (same session).
    _cachedEndpoint = endpoint;
    _cachedHeaders = headers;
    return { endpoint, headers };
}

// Step 2: Pipeline Compute — translate text.
async function translateText(text, sourceLang, targetLang) {
    const { endpoint, headers } = await discoverPipeline(sourceLang, targetLang);

    const resp = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            pipelineTasks: [{ taskType: 'translation', config: { language: { sourceLanguage: sourceLang, targetLanguage: targetLang } } }],
            inputData: { input: [{ source: text }] }
        })
    });
    if (!resp.ok) throw new Error(`bhashini-compute-${resp.status}`);

    const data = await resp.json();
    const output = data?.pipelineResponse?.[0]?.output?.[0]?.target;
    if (!output) throw new Error('bhashini-no-output');
    return output;
}

/**
 * Normalize narrative via Bhashini NMT: translate to English for better retrieval.
 * Returns { translated, sourceLang } or throws on failure (caller should fall back).
 * Supported source languages: hi, te, ta, bn, mr, kn, ml, ur.
 */
export async function bhashiniNormalize(narrative, sourceLang = 'hi') {
    if (!narrative || !narrative.trim()) return { translated: '', sourceLang };
    if (sourceLang === 'en') return { translated: narrative, sourceLang: 'en' };

    const translated = await translateText(narrative.trim(), sourceLang, 'en');
    return { translated, sourceLang };
}

/**
 * Detect likely source language from narrative text (simple heuristic).
 * Returns ISO-639 code.
 */
export function detectSourceLang(text) {
    if (!text) return 'hi';
    // Devanagari script → Hindi (could be Marathi, but Hindi is most common)
    if (/[\u0900-\u097F]/.test(text)) return 'hi';
    // Telugu script
    if (/[\u0C00-\u0C7F]/.test(text)) return 'te';
    // Tamil script
    if (/[\u0B80-\u0BFF]/.test(text)) return 'ta';
    // Bengali script
    if (/[\u0980-\u09FF]/.test(text)) return 'bn';
    // Kannada script
    if (/[\u0C80-\u0CFF]/.test(text)) return 'kn';
    // Malayalam script
    if (/[\u0D00-\u0D7F]/.test(text)) return 'ml';
    // Latin script → English
    if (/[a-zA-Z]/.test(text)) return 'en';
    return 'hi';
}

/**
 * Cached translation result (per session, avoids re-translating the same narrative).
 */
let _lastNarrativeHash = '';
let _lastTranslated = '';
let _lastSourceLang = '';

export function getCachedTranslation() {
    return { translated: _lastTranslated, sourceLang: _lastSourceLang };
}

export function setCachedTranslation(translated, sourceLang, narrativeHash) {
    _lastTranslated = translated;
    _lastSourceLang = sourceLang;
    _lastNarrativeHash = narrativeHash;
}

export function getLastNarrativeHash() {
    return _lastNarrativeHash;
}
