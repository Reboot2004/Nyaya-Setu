// Nyaya-Setu translation module — Google Translate unofficial endpoint.
// Zero cost, no API key, no signup. Falls back to in-house lexicon when offline.
// NOTE: uses Google Translate's web endpoint (not official API). May break if
// Google changes their interface. In-house dialect lexicon is the offline fallback.

const GT_URL = 'https://translate.googleapis.com/translate_a/single';

// ISO-639 codes matching our app's language selector
const LANG_MAP = {
    en: 'en', hi: 'hi', te: 'te', ta: 'ta',
    bn: 'bn', mr: 'mr', kn: 'kn', ml: 'ml'
};

/**
 * Translate text using Google Translate's unofficial endpoint.
 * @param {string} text - Source text
 * @param {string} sourceLang - ISO-639 code (e.g. 'hi', 'te')
 * @param {string} targetLang - ISO-639 code (e.g. 'en')
 * @returns {Promise<string>} Translated text
 */
export async function translateText(text, sourceLang, targetLang) {
    if (!text || !text.trim()) return '';
    if (sourceLang === targetLang) return text;

    const sl = LANG_MAP[sourceLang] || sourceLang;
    const tl = LANG_MAP[targetLang] || targetLang;

    const params = new URLSearchParams({
        client: 'gtx',
        sl: sl,
        tl: tl,
        dt: 't',
        q: text.trim()
    });

    const resp = await fetch(`${GT_URL}?${params.toString()}`);
    if (!resp.ok) throw new Error(`translate-${resp.status}`);

    const data = await resp.json();
    // Response format: [[["translated","original",null,null,10]],null,"hi"]
    const sentences = data?.[0];
    if (!Array.isArray(sentences)) throw new Error('translate-bad-response');
    return sentences.map((s) => s?.[0] || '').join('');
}

/**
 * Translate narrative to English for better statutory-title matching.
 * Returns { translated, sourceLang }.
 */
export async function translateToEnglish(narrative, sourceLang = 'hi') {
    if (!narrative || !narrative.trim()) return { translated: '', sourceLang };
    if (sourceLang === 'en') return { translated: narrative, sourceLang: 'en' };

    const translated = await translateText(narrative.trim(), sourceLang, 'en');
    return { translated, sourceLang };
}

/**
 * Detect likely source language from narrative text (simple script heuristic).
 */
export function detectSourceLang(text) {
    if (!text) return 'hi';
    if (/[\u0900-\u097F]/.test(text)) return 'hi';  // Devanagari → Hindi
    if (/[\u0C00-\u0C7F]/.test(text)) return 'te';  // Telugu
    if (/[\u0B80-\u0BFF]/.test(text)) return 'ta';  // Tamil
    if (/[\u0980-\u09FF]/.test(text)) return 'bn';  // Bengali
    if (/[\u0C80-\u0CFF]/.test(text)) return 'kn';  // Kannada
    if (/[\u0D00-\u0D7F]/.test(text)) return 'ml';  // Malayalam
    if (/[a-zA-Z]/.test(text)) return 'en';          // Latin → English
    return 'hi';
}

/**
 * Cached translation result (per session, avoids re-translating).
 */
let _lastHash = '';
let _lastTranslated = '';
let _lastSourceLang = '';

export function getCachedTranslation() {
    return { translated: _lastTranslated, sourceLang: _lastSourceLang };
}

export function setCachedTranslation(translated, sourceLang, hash) {
    _lastTranslated = translated;
    _lastSourceLang = sourceLang;
    _lastHash = hash;
}

export function getLastHash() {
    return _lastHash;
}
