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
 * Includes retry with exponential backoff for 429 rate limits.
 * @param {string} text - Source text
 * @param {string} sourceLang - ISO-639 code (e.g. 'hi', 'te')
 * @param {string} targetLang - ISO-639 code (e.g. 'en')
 * @param {number} retries - Max retries (default 2)
 * @returns {Promise<string>} Translated text
 */
export async function translateText(text, sourceLang, targetLang, retries = 2) {
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

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const resp = await fetch(`${GT_URL}?${params.toString()}`);
            if (resp.status === 429 && attempt < retries) {
                // Rate limited — wait with exponential backoff (500ms, 1500ms)
                await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt)));
                continue;
            }
            if (!resp.ok) throw new Error(`translate-${resp.status}`);
            const data = await resp.json();
            const sentences = data?.[0];
            if (!Array.isArray(sentences)) throw new Error('translate-bad-response');
            return sentences.map((s) => s?.[0] || '').join('');
        } catch (e) {
            if (attempt >= retries) throw e;
        }
    }
    throw new Error('translate-max-retries');
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

const SUPPORTED_LANGS = new Set(['en', 'hi', 'te', 'ta', 'bn', 'mr', 'kn', 'ml']);

/**
 * Detect the actual script of the text and return { lang, supported, scriptName }.
 * Uses dominant-script analysis for mixed-language text.
 */
export function detectScript(text) {
    if (!text || !text.trim()) return { lang: 'hi', supported: true, scriptName: 'Devanagari' };

    const clean = text.replace(/[\s\d\p{P}]/gu, ''); // strip spaces, numbers, punctuation
    if (!clean) return { lang: 'hi', supported: true, scriptName: 'Devanagari' };

    const scripts = [
        { re: /[\u0900-\u097F]/g, lang: 'hi', name: 'Devanagari' },
        { re: /[\u0C00-\u0C7F]/g, lang: 'te', name: 'Telugu' },
        { re: /[\u0B80-\u0BFF]/g, lang: 'ta', name: 'Tamil' },
        { re: /[\u0980-\u09FF]/g, lang: 'bn', name: 'Bengali' },
        { re: /[\u0C80-\u0CFF]/g, lang: 'kn', name: 'Kannada' },
        { re: /[\u0D00-\u0D7F]/g, lang: 'ml', name: 'Malayalam' },
        { re: /[\u0A00-\u0A7F]/g, lang: 'pa', name: 'Gurmukhi (Punjabi)' },
        { re: /[\u0A80-\u0AFF]/g, lang: 'gu', name: 'Gujarati' },
        { re: /[\u0B00-\u0B7F]/g, lang: 'or', name: 'Odia' },
        { re: /[\u0600-\u06FF\u0750-\u077F]/g, lang: 'ur', name: 'Arabic (Urdu)' },
        { re: /[a-zA-Z]/g, lang: 'en', name: 'Latin' },
    ];

    let best = { count: 0, lang: 'en', name: 'Latin' };
    for (const s of scripts) {
        const matches = clean.match(s.re);
        const count = matches ? matches.length : 0;
        if (count > best.count) best = { count, lang: s.lang, name: s.name };
    }

    return { lang: best.lang, supported: SUPPORTED_LANGS.has(best.lang), scriptName: best.name };
}

const UNSUPPORTED_WARNING = 'Your language is not fully supported yet. The complaint will be processed using English translation. Results may be less accurate. You may type in Hindi or English for better results.';

/**
 * Get a translated warning for unsupported languages.
 * Returns the warning text in the detected language, or null if supported.
 */
export async function getUnsupportedLangWarning(text) {
    const script = detectScript(text);
    if (script.supported) return null;
    try {
        const translated = await translateText(UNSUPPORTED_WARNING, 'en', script.lang);
        return { lang: script.lang, scriptName: script.scriptName, message: translated };
    } catch {
        return { lang: script.lang, scriptName: script.scriptName, message: UNSUPPORTED_WARNING };
    }
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
