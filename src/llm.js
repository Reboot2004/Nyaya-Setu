// Nyaya-Setu LLM module — WebGPU AI + robust rule-based Indic entity extraction.
// Helps citizens understand their rights and draft a police complaint in their language.
import * as webllm from '@mlc-ai/web-llm';
import { titleFor } from '../data/statute_i18n.js';

const MODEL_CANDIDATES = [
    'Llama-3.2-1B-Instruct-q4f32_1-MLC',
    'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    // Tab-friendly fallback (~40% the VRAM): Qwen2.5-0.5B-Instruct. Weaker Hindi,
    // other dialects fall back to rules + gloss bundle. Unknown IDs are skipped safely.
    'Qwen2.5-0.5B-Instruct-q4f32_1-MLC',
    'Qwen2.5-0.5B-Instruct-q4f16_1-MLC'
];

let engine = null;
let activeModelId = null;
let loadingProgressCb = null;

export function onLoadingProgress(cb) {
    loadingProgressCb = cb;
}

export function getActiveModelId() {
    return activeModelId;
}

async function createEngine(modelId) {
    // Smooth on tabs: small context (1024), persistent IndexedDB weight cache
    // so the ~700MB downloads once then runs offline.
    let appConfig;
    try {
        appConfig = { ...webllm.prebuiltAppConfig, useIndexedDBCache: true };
    } catch { appConfig = undefined; }
    return webllm.CreateMLCEngine(modelId, {
        initProgressCallback: (report) => {
            if (loadingProgressCb) loadingProgressCb(report);
        },
        context_window_size: 1024,
        sliding_window_size: 512,
        ...(appConfig ? { appConfig } : {})
    });
}

export async function ensureEngine() {
    if (engine) return engine;
    let lastErr;
    for (const modelId of MODEL_CANDIDATES) {
        try {
            engine = await createEngine(modelId);
            activeModelId = modelId;
            engine.reload?.catch?.(() => { });
            return engine;
        } catch (err) {
            console.warn(`Model ${modelId} failed, trying next candidate:`, err);
            lastErr = err;
            try { engine?.unload?.(); } catch { /* ignore */ }
            engine = null;
        }
    }
    throw new Error(
        'WebGPU engine could not start on this device. Using instant on-device rule engine.'
    );
}

export function resetEngine() {
    try { engine?.unload?.(); } catch { /* ignore */ }
    engine = null;
    activeModelId = null;
}

export function isWebGPUSupported() {
    return typeof navigator !== 'undefined' && 'gpu' in navigator;
}

// Stronger than isWebGPUSupported: the API existing is not enough (headless /
// broken drivers expose navigator.gpu but requestAdapter() hangs or returns
// null). Cached probe so repeated calls are free. Use this before any heavy
// model download — attempting a 700MB fetch on a doomed device wastes minutes.
let adapterProbe = null;
export function isWebGPUUsable() {
    if (typeof navigator === 'undefined' || !('gpu' in navigator)) return Promise.resolve(false);
    if (!adapterProbe) {
        adapterProbe = (async () => {
            try {
                const adapter = await Promise.race([
                    navigator.gpu.requestAdapter(),
                    new Promise((resolve) => setTimeout(() => resolve(null), 8000))
                ]);
                if (!adapter) return false;
                // An adapter object alone is not proof: broken/headless drivers
                // hand one out and fail at device creation. Verify end-to-end.
                const device = await Promise.race([
                    adapter.requestDevice(),
                    new Promise((_, rej) => setTimeout(() => rej(new Error('device-timeout')), 8000))
                ]);
                try { device.destroy?.(); } catch { /* ignore */ }
                return !!device;
            } catch { return false; }
        })();
    }
    return adapterProbe;
}

// AI assist is AUTOMATIC where WebGPU exists: model downloads once (~700MB),
// then cached offline. Opt-out via setAIAssistEnabled(false). Rule engine stays
// usable during download so low-end tabs never block.
const AI_OPTIN_KEY = 'nyaya_setu_ai_optin_v1';
export function isAIAssistEnabled() {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            const v = localStorage.getItem(AI_OPTIN_KEY);
            if (v === '0') return false;
            if (v === '1') return true;
            // default: auto-ON (automatic download)
            return true;
        }
    } catch { /* ignore */ }
    return true;
}
export function setAIAssistEnabled(on) {
    try { if (typeof window !== 'undefined' && window.localStorage) localStorage.setItem(AI_OPTIN_KEY, on ? '1' : '0'); } catch { /* ignore */ }
    return !!on;
}

export function normalizeLanguageCode(code) {
    const raw = (code || 'en').toLowerCase().trim();
    if (raw.startsWith('hi')) return 'hi';
    if (raw.startsWith('te')) return 'te';
    if (raw.startsWith('ta')) return 'ta';
    if (raw.startsWith('bn')) return 'bn';
    if (raw.startsWith('mr')) return 'mr';
    if (raw.startsWith('kn')) return 'kn';
    if (raw.startsWith('ml')) return 'ml';
    return 'en';
}

export function detectLanguage(text) {
    if (!text) return 'en';

    // Unicode block heuristics
    if (/[\u0900-\u097F]/.test(text)) {
        // Marathi specific words
        if (/\b(आहे|झाले|केले|माझे|त्यांनी|पोलीस|तक्रार)\b/i.test(text)) return 'mr';
        return 'hi';
    }
    if (/[\u0C00-\u0C7F]/.test(text)) return 'te';
    if (/[\u0B80-\u0BFF]/.test(text)) return 'ta';
    if (/[\u0980-\u09FF]/.test(text)) return 'bn';
    if (/[\u0C80-\u0CFF]/.test(text)) return 'kn';
    if (/[\u0D00-\u0D7F]/.test(text)) return 'ml';

    // Romanized keyword heuristics
    const lower = text.toLowerCase();
    const hintsByLang = {
        te: ['garu', 'chesaru', 'kottaru', 'dabbulu', 'nannu', 'police station', 'anamata'],
        hi: ['mera', 'meri', 'usne', 'maara', 'paisa', 'dhamki', 'diya', 'thana', 'gali', 'rok'],
        mr: ['majhe', 'tyani', 'marhan', 'dhamki', 'thana', 'kele', 'ahe'],
        ta: ['ennai', 'adithargal', 'panam', 'mirattal', 'kavalthurai'],
        bn: ['amar', 'tara', 'marpeet', 'taka', 'thana', 'hukm'],
        kn: ['nanna', 'hodidaru', 'hana', 'bedarike', 'thana'],
        ml: ['enne', 'adichu', 'panam', 'bheeshani', 'police']
    };

    for (const [lang, hints] of Object.entries(hintsByLang)) {
        if (hints.some((h) => lower.includes(h))) return lang;
    }

    return 'en';
}

/**
 * Robust Regex & Heuristic Fact Extractor for Pure Vernacular (Hindi/Indic) & English complaints.
 */
export function extractEntitiesRuleBased(narrative) {
    const text = (narrative || '').trim();
    let complainantName = 'unknown';
    let parentName = 'unknown';
    let aggressor = 'unknown';
    let incidentDate = 'unknown';
    let incidentLoc = 'unknown';
    let category = 'needs_human_review';

    // 1. Extract Complainant Name (English & Devanagari / Indic)
    const nameMatches = [
        /(?:मेरा\s+नाम|नाम|मैं|माझे\s+नाव|నా\s+పేరు|என்\s+பெயர்|আমার\s+নাম|ನನ್ನ\s+ಹೆಸರು|എന്റെ\s+പേര്|my name is|i am|myself|mera naam)\s*[:=-]?\s*([A-Za-z\u0900-\u0D7F]+(?:\s+[A-Za-z\u0900-\u0D7F]+)?)/i,
        /([A-Za-z\u0900-\u0D7F]+(?:\s+[A-Za-z\u0900-\u0D7F]+)?)\s+(?:बोल\s+रहा|बात\s+कर\s+रहा|हूँ|here)/i
    ];
    for (const pat of nameMatches) {
        const m = text.match(pat);
        if (m && m[1] && m[1].length > 1 && !/^(है|था|थी|the|a|an|on|in|at|yesterday|today|sir|श्रीमान)$/i.test(m[1].trim())) {
            complainantName = m[1].replace(/^(है|था|का|की|हैं)\s+/, '').trim();
            break;
        }
    }

    // 2. Extract Parent/Spouse
    const parentMatches = [
        /(?:पिता\s+का\s+नाम|पिता|पति\s+का\s+नाम|पति|आत्मज|पत्नी|s\/o|d\/o|w\/o|son of|daughter of|wife of|father)\s*[:=-]?\s*([A-Za-z\u0900-\u0D7F]+(?:\s+[A-Za-z\u0900-\u0D7F]+)?)/i
    ];
    for (const pat of parentMatches) {
        const m = text.match(pat);
        if (m && m[1]) {
            parentName = m[1].replace(/^(है|था|का|की|श्री|श्रीमान)\s+/, '').trim();
            break;
        }
    }

    // 3. Extract Accused / Aggressor
    const accusedMatches = [
        // Multi-name: "Ramu and Shyam beat me", "Ramu aur Shyam ne mara"
        /\b([A-Z][a-zA-Z]+(?:\s+and\s+[A-Z][a-zA-Z]+)+)\s+(?:beat|hit|slapped|abused|assaulted|attacked|threatened|both|neighbours|neighbors)\b/i,
        // Kin + associate: "husband and in-laws are demanding dowry"
        /\b((?:husband|wife|son|daughter|father|mother|brother|sister)\s+and\s+[A-Za-z][A-Za-z-]*)\s+(?:are\s+|is\s+|was\s+|were\s+)?(?:demanding|demanded|threatening|threatened|beating|harassing|torturing)\b/i,
        /\b([A-Za-z\u0900-\u0D7F]+(?:\s+और\s+[A-Za-z\u0900-\u0D7F]+)+)\s+ने\s+(?:मेरा|मुझे|हमला|पीटा|मारा|धमकी)/i,
        /([A-Za-z\u0900-\u0D7F]+(?:\s+और\s+उसके\s+[^,।\n]+|\s+and\s+[^,।\n]+)?)\s+ने\s+(?:मेरा\s+रास्ता|मुझे|हमला|पीटा|मारा|धमकी)/i,
        /(?:आरोपी|accused|attacked by|threatened by|beaten by)\s*[:=-]?\s*([A-Za-z\u0900-\u0D7F]+(?:\s+और\s+[^,।\n]+|\s+and\s+[^,।\n]+)?)/i,
        // Hindi subject-verb with role-nouns: "मालिक ने मारा", "पड़ोसी ने धमकी दी"
        // NOTE: \b is ASCII-only and never matches around Devanagari — use explicit
        // boundaries here, else these patterns are dead code.
        /(?:^|[\s,;:(])(मालिक|पड़ोसी|ठेकेदार|अधिकारी|कर्मचारी|प्रबंधक|मालिकन|मकान मालिक|भूमि मालिक|टीचर|प्रोफेसर|डॉक्टर|वकील)\s+ने(?=[\s,;:.!?])\s*(?:मारा|पीटा|धमकी|गाली|मारपीट|छेड़|चोरी|हमला|किया)/i,
        // Hindi role-noun with distance: "पड़ोसी ने गांव में मुझे धमकी दी"
        // (crime verb up to ~30 chars after ने, same clause; explicit boundaries —
        // \b never matches around Devanagari)
        /(?:^|[\s,;:(])(मालिक|पड़ोसी|ठेकेदार|अधिकारी|कर्मचारी|प्रबंधक|मालिकन|मकान मालिक|भूमि मालिक|टीचर|प्रोफेसर|डॉक्टर|वकील|पति|ससुराल)\s+ने(?=[\s,;:.!?])[^।!?\n]{0,30}?[\s,;:(](?:मारा|पीटा|धमकी|गाली|मारपीट|छेड़|चोरी|हमला)(?=[\s,;:.!?।]|$)/i,
        // Hindi "X ne mujhe / mera ... kiya"
        /\b([A-Za-z\u0900-\u0D7F]{2,})\s+ने\s+(?:मुझे|मेरा|मेरी)\s+(?:मारा|पीटा|धमकी|गाली|मारपीट|छेड़|चोरी|हमला|रास्ता|रोका|जबरन|जबरदस्ती)/i,
        /(?:सामने|द्वारा|खिलाफ)\s+([A-Za-z\u0900-\u0D7F]+(?:\s+और\s+[^,।\n]+)?)\s+ने/i,
        // English subject-verb: "People hit me", "Mohan beat me", "Rajesh slapped me"
        /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,2}|people|police|strangers|stranger|miscreants|assailants|neighbours|neighbors|relatives|contractor|officials|goons|policeman|boss|owner|employer|landlord|tenant|officer|revenue officer|superintendent|inspector|sub-inspector|constable|sergeant|peon|clerk|manager|supervisor)\b\s+(?:hit|beat|beats|beaten|slapped|abused|assaulted|attacked|threatened|cheated|grabbed|stole|molested|yelled|shouted|fired|harassed|intimidated|robbed|extorted|defrauded|forged|encroached|grabbed|surrounded|surround|encircled|stopped|blocked|bribed|refused)\b/i,
        // "Rajesh Kumar used abusive language" (adjacent — avoids "March ... used" spans)
        /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\s+used\s+abusive\b/,
        // "<name> did kabza / grabbed the land" (encroachment phrasing)
        /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\s+did\s+kabza\b/i,
        // Telugu-script subject-verb: "రాము నన్ను కొట్టాడు" (Ramu hit me)
        /([\u0C00-\u0C7F]+(?:\s+[\u0C00-\u0C7F]+){0,2})\s+(?:నన్ను\s+)?(?:కొట్టాడు|కొట్టారు|బెదిరించాడు|బెదిరించారు|చంపుతానని|చంపేస్తానని)/,
        // Tamil-script subject-verb: "ராமு என்னை அடித்தார்" (Ramu hit me)
        /([\u0B80-\u0BFF]+(?:\s+[\u0B80-\u0BFF]+){0,2})\s+(?:என்னை\s+)?(?:அடித்தார்|அடித்தான்|மிரட்டினார்|கொல்வேன்)/,
        // "...slapped / abused me" with a few words in between (months/days excluded below)
        /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b[^.!?]{0,40}?\b(?:slapped|abused|assaulted|threatened|attacked|molested|kottadu|kottaru|maara|peeta)\b/
    ];
    const BAD_SUBJECT = /^(the|a|an|on|in|at|and|or|of|to|for|with|from|against|language|did|yesterday|today|my|me|i|they|them|he|she|it|we|you|january|february|march|april|may|june|july|august|september|october|november|december|monday|tuesday|wednesday|thursday|friday|saturday|sunday|मैं|मुझे|हम)$/i;
    const LOWCASE_NOUNS = /^(people|in-laws?|in laws?|strangers|stranger|miscreants|assailants|neighbours|neighbors|neighbor|husband|wife|relatives|contractor|officials|goons|policeman|shopkeeper|boss|owner|employer|landlord|tenant|officer|revenue officer|superintendent|inspector|sub-inspector|constable|sergeant|peon|clerk|manager|supervisor|contractor)$/i;
    const INDIC_PRONOUN = /^(నన్ను|నాకు|నేను|మేము|అతను|ఆమె|వారు|என்னை|நான்|எனக்கு|அவர்|நாங்கள்)$/i;
    for (const pat of accusedMatches) {
        const m = text.match(pat);
        if (!m || !m[1] || m[1].length <= 1 || BAD_SUBJECT.test(m[1].trim())) continue;
        // English names start uppercase ("against me and slapped" is not a name);
        // known lowercase role-nouns (people, policeman, ...) pass through.
        let cand = m[1].trim().replace(/\s+(నన్ను|నాకు|నేను|என்னை|நான்|எனக்கு)$/, '').trim();
        if (!cand || INDIC_PRONOUN.test(cand)) continue;
        // Loose {0,2}-word spans glue fillers ("sarpanch but strangers"): keep only
        // the trailing segment after the last filler. "and"/"or" are kept whole
        // (genuine multi-names like "Ramu and Shyam").
        if (/\s/.test(cand)) {
            const CUT = /^(but|for|with|from|to|of|in|on|at|the|a|an|my|his|her|our|their|your|was|were|is|are|going|vote)$/i;
            const toks = cand.split(/\s+/);
            let cut = 0;
            toks.forEach((t, i) => { if (CUT.test(t)) cut = i + 1; });
            if (cut > 0 && cut < toks.length) cand = toks.slice(cut).join(' ');
            else if (cut >= toks.length) continue;
        }
        if (!cand || BAD_SUBJECT.test(cand) || INDIC_PRONOUN.test(cand)) continue;
        // Telugu spans ("మార్కెట్ లో రాము", "రాము ఆసుపత్రిలో", "నా పొరుగువాడు రాము"):
        // SOV order — the subject sits next to the verb. Walk left past
        // location-suffixed tokens, drop leading possessives, take the last token.
        if (/[\u0C00-\u0C7F]/.test(cand) && /\s/.test(cand)) {
            const TE_LOC_SUF = /(?:లో|దగ్గర|సమీపంలో|ఇందులో|పైన|వద్ద|నుండి|నించి|కి|కు)$/;
            const TE_PLACE = /^(మార్కెట్|స్కూల్|ఆసుపత్రి|టెంపుల్|కాలేజ్|పోలీస్|అంగడి|రస్తె|కంపెనీ|ఇల్లు|గావ్|మనె|సినిమా|సెంటర్|హోటల్|షాపు|స్టేషన్)$/;
            const TE_POSS = /^(నా|మా|తన|అతని|ఆమె|వారి|మీ)$/;
            let toks = cand.split(/\s+/).filter(Boolean);
            while (toks.length > 1 && (TE_LOC_SUF.test(toks[toks.length - 1]) || TE_PLACE.test(toks[toks.length - 1]))) toks.pop();
            while (toks.length > 1 && TE_POSS.test(toks[0])) toks.shift();
            if (toks.length > 1) toks = toks.slice(-1);
            cand = toks.join(' ');
            if (!cand || INDIC_PRONOUN.test(cand)) continue;
        }
        if (/^[a-z]/.test(cand) && !LOWCASE_NOUNS.test(cand.split(/\s+/).pop())) continue;
        aggressor = cand;
        break;
    }
    if (aggressor === 'unknown') {
        const directAccused = text.match(/([A-Za-z\u0900-\u0D7F]+(?:\s+और\s+[^\s,।]+)?)\s+ने\s+(?:मेरा|मुझे|हमला|पीटा|रास्ता)/i);
        if (directAccused && directAccused[1]) aggressor = directAccused[1].trim();
    }

    // 4. Extract Date / Time (incl. ISO 2023-02-20, weekdays, month-first, all 8 languages)
    const dateMatches = [
        // ISO date
        /(\d{4}\s*[-\/.]\s*\d{1,2}\s*[-\/.]\s*\d{1,2})/,
        // English weekdays
        /\b((?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday))\b/i,
        // English months
        /\b((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?(?:\s*,?\s*\d{2,4})?)/i,
        // Hindi weekdays
        /\b(सोमवार|मंगलवार|बुधवार|गुरुवार|शुक्रवार|शनिवार|रविवार)\b/,
        // Hindi date patterns: "15 मार्च को", "15 फरवरी 2024 को"
        /\b(\d{1,2}\s+(?:जनवरी|फरवरी|मार्च|अप्रैल|मई|जून|जुलाई|अगस्त|सितंबर|अक्टूबर|नवंबर|दिसंबर)(?:\s+\d{2,4})?(?:\s+को)?)\b/i,
        // Telugu date patterns: "15 మార్చి న", "15 ఫిబ్రవరి 2024"
        /\b(\d{1,2}\s+(?:జనవరి|ఫిబ్రవరి|మార్చి|ఏప్రిల్|మే|జూన్|జూలై|ఆగస్టు|సెప్టెంబర్|అక్టోబర్|నవంబర్|డిసెంబర్)(?:\s+\d{2,4})?)\b/i,
        // Tamil date patterns: "15 மார்ச்", "15 பிப்ரவரி 2024"
        /\b(\d{1,2}\s+(?:ஜனவரி|பிப்ரவரி|மார்ச்|ஏப்ரல்|மே|ஜூன்|ஜூலை|ஆகஸ்ட்|செப்டம்பர்|அக்டோபர்|நவம்பர்|டிசம்பர்)(?:\s+\d{2,4})?)\b/i,
        // Bengali date patterns: "15 মার্চ", "15 ফেব্রুয়ারি 2024"
        /\b(\d{1,2}\s+(?:জানুয়ারি|ফেব্রুয়ারি|মার্চ|এপ্রিল|মে|জুন|জুলাই|আগস্ট|সেপ্টেম্বর|অক্টোবর|নভেম্বর|ডিসেম্বর)(?:\s+\d{2,4})?)\b/i,
        // Marathi date patterns: "15 मार्च", "15 फेब्रुवारी 2024"
        /\b(\d{1,2}\s+(?:जानेवारी|फेब्रुवारी|मार्च|एप्रिल|मे|जून|जुलै|ऑगस्ट|सप्टेंबर|ऑक्टोबर|नोव्हेंबर|डिसेंबर)(?:\s+\d{2,4})?)\b/i,
        // Kannada date patterns: "15 ಮಾರ್ಚ್", "15 ಫೆಬ್ರವರಿ 2024"
        /\b(\d{1,2}\s+(?:ಜನವರಿ|ಫೆಬ್ರವರಿ|ಮಾರ್ಚ್|ಏಪ್ರಿಲ್|ಮೇ|ಜೂನ್|ಜುಲೈ|ಆಗಸ್ಟ್|ಸೆಪ್ಟೆಂಬರ್|ಅಕ್ಟೋಬರ್|ನವೆಂಬರ್|ಡಿಸೆಂಬರ್)(?:\s+\d{2,4})?)\b/i,
        // Malayalam date patterns: "15 മാർച്ച്", "15 ഫെബ്രുവരി 2024"
        /\b(\d{1,2}\s+(?:ജനുവരി|ഫെബ്രുവരി|മാർച്ച്|ഏപ്രിൽ|മേയ്|ജൂൺ|ജൂലൈ|ഓഗസ്റ്റ്|സെപ്തംബർ|ഒക്ടോബർ|നവംബർ|ഡിസംബർ)(?:\s+\d{2,4})?)\b/i,
        // Generic numeric date with prefix
        /(?:दिनांक|तारीख|दिनांकित|on|dated|dinank|తేదీ|தேதி|তারিখ|ದಿನಾಂक|തീയതി)?\s*(\d{1,2}(?:st|nd|rd|th)?(?:\s+[A-Za-z\u0900-\u0D7F]+(?:\s+\d{2,4})?|\s*[-\/.]\s*\d{1,2}\s*[-\/.]\s*\d{2,4}))/i,
        // Relative: "today", "yesterday", Hindi "कल", "आज", Telugu "ఈ రోజు", "నిన్న"
        /\b(कल|आज|परसों|yesterday|today|ninna|netru|ఈ రోజు|నిన్న|రేపు|இன்று|நேற்று|আজ|গতকাল|ఎల్లుండి|नेमकं उद्या|आज|നിന്നെ|ഇന്ന്|നാളെ)\b/i
    ];
    for (const pat of dateMatches) {
        pat.lastIndex = 0;
        const m = text.match(pat);
        if (m && m[1]) {
            const cand = m[1].trim();
            // boundary: candidate must not be glued to a preceding digit ("00 rupees" in "15000")
            const idx = text.indexOf(m[1]);
            if (idx > 0 && /\d/.test(text[idx - 1])) continue;
            // guard: "6 people" / "2 men" are counts, not dates
            if (/people|person|men|women|boys|girls|persons/i.test(cand)) continue;
            incidentDate = cand;
            break;
        }
    }

    // 5. Extract Location: conservative — only match known place-nouns or clear preposition+place patterns.
    // Avoids false positives like "me badly" or "my land" being extracted as locations.
    // Possessive guard lives in shared_sanitize.js (single source for rules + NER + LLM).
    const locMatches = [
        // Known place-nouns ONLY (highest confidence)
        /\b(village|town|city|house|home|market|road|station|shop|office|school|bank|hospital|park|farm|field|plot|yard|land|police station|bus stop|bus stand|temple|church|mosque|college|university|factory|warehouse|court|gate|colony|nagar|ward|sector|block)\b/i,
        // Telugu place-nouns (known only)
        /\b(పోలీస్\s*స్టేషన్|మార్కెట్|స్కూల్|ఆసుపత్రి|టెంపుల్|కాలేజ్|గావ్|మనె|అంగడి|రస్తె|కంపెనీ|ఇల్లు|వీడు|వ్యవసాయం|భూమి|పొలం|బంగళా|షాపు|హోటల్|సినిమా|సెంటర్|సిటీ|టౌన్|గేట్|కాలనీ|వార్డ్|సెక్టార్|బ్లాక్)\b/i,
        // Telugu compound: known place-noun + suffix without space (ఆసుపత్రిలో, మార్కెట్ లో)
        /(పోలీస్\s*స్టేషన్|మార్కెట్|స్కూల్|ఆసుపత్రి|టెంపుల్|కాలేజ్|గావ్|మనె|అంగడి|రస్తె|కంపెనీ|ఇల్లు|వీడు|వ్యవసాయం|భూమి|పొలం|బంగళా|షాపు|హోటల్|సినిమా|సెంటర్|సిటీ|టౌన్|గేట్|కాలనీ|వార్డ్|సెక్టార్|బ్లాక్)(?:లో|దగ్గర|సమీపంలో|ఇందులో|పైన|వద్ద)/i,
        // Telugu: "ఇంటి దగ్గర", "మార్కెట్ లో", "స్కూల్ దగ్గర"
        /([\u0C00-\u0C7F]{2,})\s+(?:సమీపంలో|ఇందులో|పైన|దగ్గర|లో|వద్ద)/i,
        // Preposition + KNOWN place-noun only (not arbitrary text)
        /(?:near|at|in|outside|opposite|behind|inside|below|above)\s+(?:the\s+|my\s+|our\s+)?(village|town|city|house|home|market|road|station|shop|office|school|bank|hospital|park|farm|field|plot|yard|land|police station|bus stop|bus stand|temple|church|mosque|college|university|factory|warehouse|court|gate|colony|nagar|ward|sector|block)/i,
        // "near the bus stop" / "outside my house" — article+place
        /(?:near|at|in|outside|opposite|behind|inside)\s+(?:the|my|his|her|our)\s+(bus stop|bus stand|house|home|office|school|bank|hospital|market|station|temple|police station)/i,
        // Place-name + compound: "Rampur village", "Main road", "Bus stand"
        /([A-Z][a-z]+\s+(?:village|town|road|market|station|colony|nagar|ward|sector))/i,
        // Hindi: ONLY known place-nouns with postpositions (very conservative)
        /(गांव|शहर|घर|बाजार|रोड|दुकान|स्कूल|अस्पताल|बैंक|ऑफिस|फैक्ट्री|मंदिर|चर्च|मस्जिद|अदालत|थाना|बस अड्डा|कॉलोनी|नगर|वॉर्ड|सेक्टर)\s+(?:के\s+पास|के\s+सामने|में|पर|की\s+तरफ|निकट)/i,
        // Tamil: space-separated "வீட்டின் அருகில்" + compound "சந்தையில்" (சந்தை+இல்)
        /([\u0B80-\u0BFF]{2,})\s+(?:அருகில்|உள்ள|கிட்ட|இல்)/i,
        /(சந்தை|பள்ளி|மருத்துவமனை|வங்கி|அலுவலகம்|கடை|தெரு|நகரம்|கிராமம்|வீடு|தோட்டம்|நிலம்|கோயில்|தேவாலயம்|மசூதி|நீதிமன்றம்|காவல் நிலையம்|பேருந்து நிலையம்|ரைல் நிலையம்)(?:யில்|இல்|அருகில்|உள்ள|கிட்ட)/i,
        // Bengali: space-separated "বাড়ির কাছে" + compound "বাজারে" (বাজার+ে)
        /([\u0980-\u09FF]{2,})\s+(?:কাছে|এর|মধ্যে|ে)/i,
        /(বাজার|স্কুল|হাসপাতাল|ব্যাংক|অফিস|দোকান|রাস্তা|নগর|গ্রাম|বাড়ি|মন্দির|চার্চ|মসজিদ|আদালত|থানা|বাসস্ট্যান্ড|রেলস্টেশন)(?:এ|ে|র কাছে|ের)/i,
        // Kannada: space-separated "ಮನೆ ಹತ್ತಿರ" + compound "ಮಾರುಕಟ್ಟೆಯಲ್ಲಿ" (ಮಾರುಕಟ್ಟೆ+ಯಲ್ಲಿ)
        /([\u0C80-\u0CFF]{2,})\s+(?:ಹತ್ತಿರ|ಒಳಗೆ|ಮೇಲೆ|ಕೆಳಗೆ)/i,
        /(ಅಂಗಡಿ|ಮಾರುಕಟ್ಟೆ|ಶಾಲೆ|ಆಸ್ಪತ್ರೆ|ಬ್ಯಾಂಕ್|ಕಛೇರಿ|ರಸ್ತೆ|ಊರು|ಮನೆ|ತೋಟ|ಭೂಮಿ|ದೇವಸ್ಥಾನ|ಚರ್ಚ್|ಮಸೀದಿ|ನ್ಯಾಯಾಲಯ|ಪೊಲೀಸ್ ಠಾಣೆ|ಬಸ್ ನಿಲ್ದಾಣ)(?:ದಲ್ಲಿ|ಯಲ್ಲಿ|ಹತ್ತಿರ|ಒಳಗೆ)/i,
        // Malayalam: space-separated "വീട്ടിൽ അടുത്ത" + compound "കടയിൽ" (കട+യിൽ)
        /([\u0D00-\u0D7F]{2,})\s+(?:അടുത്ത|ഓട്ട്|ിൽ|ൽ)/i,
        /(കട|കടയ|പള്ളി|ഹോസ്പിറ്റൽ|ബാങ്ക്|ഓഫീസ്|റോഡ്|ഗ്രാമം|വീട്|തോട്ടം|ഭൂമി|ക്ഷേത്രം|പള്ളി|മോസ്ക്|കോടതി|പോലീസ് സ്റ്റേഷൻ|ബസ് സ്റ്റേഷൻ)(?:യിൽ|ിൽ|അടുത്ത)/i,
        // Marathi: space-separated "बाजारात" (बाजार+ात) + compound
        /(बाजार|शाळ|रुग्णालय|बँक|कार्यालय|दुकान|रस्ता|गाव|घर|बाग|जमीन|मंदिर|चर्च|मसजिद|न्यायालय|पोलीस ठाणे|बस स्टॅन्ड)(?:ात|ेत|ीत|ूत|ोत|मध्ये|पासून|कडे)/i,
    ];
    for (const pat of locMatches) {
        const m = text.match(pat);
        if (m && m[1] && m[1].length >= 2 && !/^(the|a|an|my|me|i|his|her|this|that|मुझे|मेरा|मेरी|हमारा|నా|నాకు|నన్ను)$/i.test(m[1].trim())) {
            let loc = m[1].trim();
            for (let i = 0; i < 2; i++) loc = loc.replace(/^(me|my|the|a|an|this|that|his|her|our|during|at|in)\s+/i, '').trim();
            // Shared guard (rules + NER + LLM use the same possessive list):
            // "my village" / "मेरे गांव" / "నా స్కూల్" = origin, not incident place.
            if (loc && hasPossessiveBefore(text, loc)) { loc = ''; }
            incidentLoc = loc || 'unknown';
            if (incidentLoc.length >= 2) break;
            incidentLoc = 'unknown';
        }
    }

    // 6. Offence Category Classification (all 8 lexicon languages, not just EN/HI)
    // Priority: physical violence leads (assault first) so "dowry + beating" reads
    // assault (+women_safety secondary), while pure "dowry + threats" still reads
    // women_safety. Bare spouse words stay out of the dowry matcher.
    // Multi-offence: every matching category is recorded; the first in priority
    // order is primary, the next different one becomes secondaryCategory so the
    // draft can flag it ("Also relevant: ...") instead of dropping it.
    const low = text.toLowerCase();
    const isReflexiveHarm = /\bkill\s+(myself|yourself|himself|herself|themselves)\b/i.test(text);
    const CAT_RES = {
        dowry: /dowry|dahej|दहेज|వరకట్నం|దహేజం|வரதட்சணை|যৌতুক|ವರದಕ್ಷಿಣೆ|വധു പീഡനം|हुंडा|दहेज उत्पीड़न|dowry harassment|cruelty by husband/i,
        assault: /marpit|assault|\bhit\b|\bbeat\b|\bbeats\b|beaten|kottadu|kottaru|laathi|hurt|fracture|blood|attack|chot|injury|raktham|मारपीट|पीटा|लाठी|डंडों|चोट|घायल|मारा|अस्पताल|కొట్టాడు|కొట్టింది|కొట్టారు|దెబ్బలాట|దాడి|గాయం|గాయమై|రక్తం|ఆసుపత్రి|அடி|தாக்கு|காயம்|ரத்தம்|மருத்துவமனை|मारहाण|हाणामारी|जखमी|रक्तस्त्राव|রক্তপাত|হাসপাতাল|ಹಲ್ಲೆ|ಹೊಡೆ|ಗಾಯ|ರಕ್ತ|ಆಸ್ಪತ್ರೆ|മർദ്ദനം|തല്ലി|പരിക്ക്|രക്തം|ആശുപത్రി|తోపు|నెట్టు|తన్ను|அடித்தல்|தாக்குதல்|காயப்படுத்து/i,
        intimidation: /dhamki|threat|intimidation|warned|gali|abuse|bedirimpulu|\bkill\b|\bmurder\b|jaan\s*se\s*maar|धमकी|जान से मार|गाली|गाली-गलौज|हत्या|मर्डर|कत्ल|బెదిరింపు|భయపెట్టారు|బూతులు|దూషించారు|అసహ్యం|చెడ్డ పదాలు|హెచ్చరిక|మిరడ్డ|చంపు|மிரட்டல்|பயமுறுத்தி|திட்டினார்கள்|அவமானம்|கொல்|धमकी|घाबरवले|शिवीगाळ|হুমকি|ভয়|গালাগালি|খুন|ಬೆದರಿಕೆ|ಹೆದರಿಸಿದರು|ಬೈಗುಳ|ಕೊಲೆ|ഭീഷണി|പേടിപ്പിച്ചു|ചീത്തവിളിച്ചു|കൊല|social media|yelled|shouted|intimidat/i,
        property_fraud: /fraud|cheat|dhokha|chori|stole|stolen|theft|robbery|extortion|snatch|snatched|forg|fake|kabza|encroach|trespass|land grab|paisa|wage|salary|property|चोरी|हफ्ता|रंगदारी|धोखा|वेतन|मजदूरी|घुसून|पीक|शेतात|దొంగతనం|మోసం|డబ్బులు|జీతం|వేతనం|తిరిగి ఇవ్వలేదు|திருட்டு|மோசடி|చౌర్యం|వంచన|पळवून|फसवणूक|চুরি|প্রতারণা|ಕಳ್ಳತನ|ಕದ್ದ|ವಂಚನೆ|മോഷണം|വഞ്ചന|కబ్జ|ಒಕ್ಕಲಿತ್ತು|ভূমি দখল/i,
        women_safety: /woman|chhed|modesty|molest|stalk|dowry|dahej|husband|wife|cruelty|महिला|छेड़छाड़|दहेज|पति|पत्नी|వరకట్నం|దహేజం|భార్య|అత్తమామ|చిత్రహింస|கணவர்|மாமியார்|தகாத தொல்லை|পত্নী|স্বামী|যৌতুক|ഭാര്യ|ഭർത്താവ്|വധു പീഡനം/i,
        procedure: /\bzero\s*fir\b|refused?\s+to\s+(register|file)(\s+my)?\s+fir\b|fir\s+(refused|denied|not\s+registered)|police\s+(refused|did\s+not\s+register|inaction)|complaint\s+not\s+(registered|filed)|thana.*(mana|नहीं)|fir.*(मना|नहीं\s+लिखी|दर्ज\s+नहीं|इनकार|నిరాకరించారు|నమోదు\s+చేయలేదు)|पुलिस.*(मना|नहीं\s+सुनी|रिपोर्ट\s+नहीं)|పోలీసు.*(నిరాకరించారు|పట్టించుకోలేదు)|fir\s+likhne\s+se\s+mana|एफआईआर.*(मना|नहीं)/i
    };
    const CAT_ORDER = ['assault', 'dowry', 'intimidation', 'property_fraud', 'women_safety', 'procedure'];
    const matchedCats = CAT_ORDER.filter((k) => (k === 'intimidation' ? !isReflexiveHarm : true) && CAT_RES[k].test(low));
    const toCat = (k) => (k === 'dowry' ? 'women_safety' : k);
    category = matchedCats.length ? toCat(matchedCats[0]) : 'needs_human_review';
    const secondaryRaw = matchedCats.find((k) => toCat(k) !== category) || null;
    const secondaryCategory = secondaryRaw ? toCat(secondaryRaw) : 'needs_human_review';

    // Generate a brief summary from extracted entities (not raw text slice)
    const catLabel = { assault: 'Physical assault', intimidation: 'Criminal intimidation / Threat', property_fraud: 'Property fraud / Cheating', women_safety: 'Offence against woman', needs_human_review: 'Incident' }[category] || 'Incident';
    const parts = [];
    parts.push(catLabel);
    if (aggressor !== 'unknown') parts.push(`by ${aggressor}`);
    if (incidentLoc !== 'unknown') parts.push(`at ${incidentLoc}`);
    if (incidentDate !== 'unknown') parts.push(`on ${incidentDate}`);
    const generatedSummary = parts.join(' ');

    return {
        summary: generatedSummary,
        complainantName,
        parentName,
        aggressor,
        date: incidentDate,
        location: incidentLoc,
        category,
        secondaryCategory,
        events: [text]
    };
}

const ALLOWED_CATEGORIES = new Set(['assault', 'intimidation', 'property_fraud', 'women_safety', 'procedure']);

// Shared sanitizer — single source of truth for both llm.js and main.js.
// Imported by main via ./shared_sanitize.js to avoid duplicating this logic.
import { cleanStr, isKnown, normalizeCategory, hasPossessiveBefore, isValidLocation, groundedSpan } from './shared_sanitize.js';

export async function extractEntities(narrative, opts = {}) {
    const ruleEntities = extractEntitiesRuleBased(narrative);
    const merged = { ...ruleEntities, extractionSource: 'rule' };

    // CPU NER supplement (OPT-IN ONLY via opts.ner — measured decision 2026-09-13):
    // the smallest viable multilingual checkpoint (distilbert q8) is ~129MB yet
    // adds zero measured gain over rules (benchmark 29/29 vs 29/29), so it must
    // not tax every user's download. src/ner.js stays for opt-in/future use.
    const wantNER = opts.ner ?? false;
    if (wantNER && (!isKnown(merged.location) || !isKnown(merged.aggressor))) {
        try {
            const nerMod = await import('./ner.js');
            const timeoutMs = opts.nerTimeoutMs ?? 8000;
            const nerRes = await Promise.race([
                nerMod.extractEntitiesNER(narrative),
                new Promise((resolve) => setTimeout(() => resolve(null), timeoutMs))
            ]);
            if (nerRes) {
                if (!isKnown(merged.location) && nerRes.location && isValidLocation(narrative, nerRes.location)) {
                    merged.location = cleanStr(nerRes.location, merged.location);
                    merged.extractionSource = 'rule+ner';
                }
                if (!isKnown(merged.aggressor) && nerRes.aggressor && !hasPossessiveBefore(narrative, nerRes.aggressor)) {
                    merged.aggressor = cleanStr(nerRes.aggressor, merged.aggressor);
                    merged.extractionSource = merged.extractionSource === 'rule' ? 'rule+ner' : merged.extractionSource;
                }
            }
        } catch { /* NER best-effort — rules still stand */ }
    }

    // Runnable by default: skip 700MB WebGPU download unless explicitly opted in.
    // Usability (not mere API presence) gates the download — see isWebGPUUsable.
    // opts.llm === false isolates lower layers (used by the technique panel).
    if (opts.llm === false || !isAIAssistEnabled() || !(await isWebGPUUsable())) {
        return merged;
    }

    try {
        const eng = await ensureEngine();
        const messages = [
            {
                role: 'system',
                content:
                    `You are a legal intake assistant for Indian Police FIR complaints. Extract factual details from a citizen grievance narrative in any Indian language. Reply ONLY with compact JSON: {"summary": "<factual summary without prayers>", "complainantName": "<name or unknown>", "parentName": "<father/spouse or unknown>", "aggressor": "<accused name/description or unknown>", "date": "<date or current>", "location": "<place or unknown>", "category": "<assault|intimidation|property_fraud|women_safety|procedure>"}

Category rules:
- assault: physical beating, hitting, weapon use
- intimidation: verbal threats, threats to kill/harm, criminal intimidation
- property_fraud: land grab, forgery, cheating, financial fraud
- women_safety: dowry, sexual harassment, acid attack, stalking
- procedure: FIR refusal, police inaction, procedural complaints

LOCATION RULES (strict — never invent a place):
- Extract ONLY the place where the incident happened.
- Possessive/origin references are NOT locations: "my village sarpanch",
  "their house", "मेरे गांव", "నా స్కూల్" describe ownership/origin → return "unknown".
- Articles/prepositions are fine: "near the bus stop" → "bus stand"/"bus stop";
  "at the school" → "school".
- If no incident place is stated, return "unknown". Do not guess.

IMPORTANT: "he threatened to kill me" = intimidation (crime report, proceed). "I want to kill myself" = self-harm (do NOT produce a complaint; the app handles this separately).

Examples:
Input: "Ramu hit me with a stick near the bus stand on 15th March"
→ {"summary":"Ramu physically assaulted the complainant with a stick near the bus stand on 15th March 2025.","complainantName":"unknown","parentName":"unknown","aggressor":"Ramu","date":"15th March 2025","location":"bus stand","category":"assault"}

Input: "I was going to vote for my village sarpanch but strangers surrounded me and threatened me"
→ {"summary":"Strangers surrounded the complainant and issued threats while they were going to vote.","complainantName":"unknown","parentName":"unknown","aggressor":"strangers","date":"current","location":"unknown","category":"intimidation"}

Input: "मेरे गांव में चोरी हुई"
→ {"summary":"A theft was reported by the complainant.","complainantName":"unknown","parentName":"unknown","aggressor":"unknown","date":"current","location":"unknown","category":"property_fraud"}

Input: "My husband and in-laws are demanding ₹5 lakh dowry and threatening to throw me out"
→ {"summary":"Complainant's husband and in-laws are demanding dowry of ₹5 lakh and threatening eviction.","complainantName":"unknown","parentName":"unknown","aggressor":"husband and in-laws","date":"current","location":"unknown","category":"women_safety"}

Input: "The shopkeeper cheated me by selling fake gold, I lost ₹20000"
→ {"summary":"Shopkeeper sold fake gold to the complainant causing a loss of ₹20,000.","complainantName":"unknown","parentName":"unknown","aggressor":"shopkeeper","date":"current","location":"unknown","category":"property_fraud"}

Input: "Police refused to file my FIR at the station"
→ {"summary":"Police refused to register the complainant's FIR at the police station.","complainantName":"unknown","parentName":"unknown","aggressor":"police","date":"current","location":"police station","category":"procedure"}

Input: "He said he will kill me if I don't pay ₹10000"
→ {"summary":"Accused threatened to kill the complainant if ₹10,000 is not paid.","complainantName":"unknown","parentName":"unknown","aggressor":"unknown","date":"current","location":"unknown","category":"intimidation"}`
            },
            { role: 'user', content: narrative }
        ];
        const reply = await eng.chat.completions.create({ messages, temperature: 0.1, max_tokens: 400 });
        const raw = reply.choices[0]?.message?.content ?? '{}';
        const jsonStart = raw.indexOf('{');
        const jsonEnd = raw.lastIndexOf('}');
        const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));

        // Sanitize: LLM sometimes returns nested objects or echoes the category enum.
        // Summary must stay a prose string — fall back to rule summary if it looks like JSON.
        let summary = cleanStr(parsed.summary, '');
        if (!summary || /^[{[].*[}\]]$/.test(summary) || /"aggressor"|"parentName"|"complainantName"/.test(summary)) {
            summary = merged.summary;
        }
        return {
            ...applyLLMEntities(narrative, merged, parsed || {}, summary),
            events: [narrative],
            extractionSource: 'llm'
        };
    } catch {
        return merged;
    }
}

// Merge model output over rule entities — gap-fill ONLY, never override.
// Measured on-device 2026-09 (technique panel: LLM 3/6/8 vs rules 8/8/8):
// the model hallucinates places ("Ramu and Shyam beat me" -> invented
// location) and misreads non-English entities, so verified rule values stand.
// The model may only fill slots rules left unknown, and only with spans it
// QUOTES from the narrative (groundedSpan) that also pass the possessive
// guard — everything else falls back to the rule value. Pure + unit-tested.
export function applyLLMEntities(narrative, merged, parsed, summaryOverride) {
    const rule = merged || {};
    const p = parsed || {};
    const fill = (ruleVal, llmVal) => {
        if (isKnown(ruleVal)) return cleanStr(ruleVal);
        return groundedSpan(narrative, llmVal) || cleanStr(ruleVal);
    };
    let location = fill(rule.location, p.location);
    // Possessive/origin answers are corrected even when quoted
    // ("my village" IS in the text, but still not an incident place).
    if (location !== 'unknown' && !isValidLocation(narrative, location)) {
        location = 'unknown';
    }
    const summary = summaryOverride !== undefined ? summaryOverride : cleanStr(p.summary, rule.summary);
    // Closed vocabulary: rule category stands unless it abstained.
    const category = (rule.category && rule.category !== 'needs_human_review')
        ? rule.category
        : normalizeCategory(p.category, rule.category || 'needs_human_review');
    const secondaryCategory = (rule.secondaryCategory && rule.secondaryCategory !== 'needs_human_review')
        ? rule.secondaryCategory
        : normalizeCategory(p.secondaryCategory, rule.secondaryCategory || 'needs_human_review');
    return {
        summary,
        complainantName: fill(rule.complainantName, p.complainantName),
        parentName: fill(rule.parentName, p.parentName),
        aggressor: fill(rule.aggressor, p.aggressor),
        date: fill(rule.date, p.date),
        location,
        category,
        secondaryCategory
    };
}

/**
 * Standard Indian Police Complaint Formatter across 8 Indian Languages.
 * Focused FIR-support document: Date, Complainant, Accused, Incident,
 * Offence stats, Relevant sections, Request. No fluff.
 * Structure follows BNSS 2023 Section 173.
 */
function buildProfessionalPoliceComplaint(complainantInfo, entities, retrieved, selectedLang, opts = {}) {
    const lang = normalizeLanguageCode(selectedLang) || 'en';
    const todayDate = new Date().toLocaleDateString('en-IN');

    const localTitle = (statute) => titleFor(statute, lang) || (statute && statute.title) || '';

    // ---- Resolve all fields, avoid "unknown"/JSON in final draft ----
    const cNameRaw = isKnown(complainantInfo?.name) ? cleanStr(complainantInfo.name) : (isKnown(entities?.complainantName) ? cleanStr(entities.complainantName) : '');
    const cName = cNameRaw
        || ({ hi: 'शिकायतकर्ता', te: 'ఫిర్యాదుదారు', ta: 'புகார்தாரர்', bn: 'অভিযোগকারী', mr: 'तक्रारदार', kn: 'ದೂರುದಾರ', ml: 'പരാതിക്കാരൻ' }[lang] || 'The Complainant');

    const cParent = isKnown(complainantInfo?.parent) ? cleanStr(complainantInfo.parent)
        : (isKnown(entities?.parentName) ? cleanStr(entities.parentName) : '');

    const cPhone = isKnown(complainantInfo?.phone) ? cleanStr(complainantInfo.phone) : '';

    const cAddress = isKnown(complainantInfo?.address) ? cleanStr(complainantInfo.address) : '';

    const psName = isKnown(complainantInfo?.station) ? cleanStr(complainantInfo.station) : '';

    const incidentLoc = isKnown(complainantInfo?.location) ? cleanStr(complainantInfo.location)
        : (isKnown(entities?.location) ? cleanStr(entities.location) : '');

    const aggressor = isKnown(complainantInfo?.accused) ? cleanStr(complainantInfo.accused)
        : (isKnown(entities?.aggressor) ? cleanStr(entities.aggressor) : '');

    const incidentDate = isKnown(complainantInfo?.date) ? cleanStr(complainantInfo.date)
        : (isKnown(entities?.date) ? cleanStr(entities.date) : todayDate);

    // Narrative: user's own words
    let narrative = cleanStr(complainantInfo?.narrative, '') || '';
    if (!narrative || narrative === 'unknown' || /^[{[].*[}\]]$/.test(narrative)) {
        narrative = cleanStr(entities?.summary, '') || '';
    }
    if (!narrative || narrative === 'unknown') narrative = '';

    // English summary if citizen narrated in another language
    const englishSummary = (opts.englishSummary && String(opts.englishSummary).trim()) ? String(opts.englishSummary).trim() : '';

    // ---- Offence category label (concise stats for the complaint) ----
    const cat = normalizeCategory(entities?.category, '');
    const CAT_LABELS = {
        en: { assault: 'Physical assault / Hurt', intimidation: 'Criminal intimidation / Threat', property_fraud: 'Cheating / Fraud / Property offence', women_safety: 'Offence against woman / Dowry harassment', procedure: 'Procedural complaint (FIR refusal)' },
        hi: { assault: 'शारीरिक हमला / चोट', intimidation: 'आपराधिक धमकी / धमकी देना', property_fraud: 'धोखाधड़ी / संपत्ति अपराध', women_safety: 'महिला विरुद्ध अपराध / दहेज उत्पीड़न', procedure: 'प्रक्रियात्मक शिकायत (FIR से इनकार)' },
        te: { assault: 'శారీరక దాడి / గాయం', intimidation: 'నేరపూరిత బెదిరింపు', property_fraud: 'మోసం / ఆస్తి నేరం', women_safety: 'మహిళపై నేరం / కట్నం వేధింపు', procedure: 'ప్రక్రియాత్మక ఫిర్యాదు (FIR నిరాకరణ)' },
        ta: { assault: 'உடல் தாக்குதல் / காயம்', intimidation: 'குற்றமிழைக்கும் மிரட்டல்', property_fraud: 'மோசடி / சொத்து குற்றம்', women_safety: 'பெண்ணுக்கு எதிரான குற்றம் / தகாத தொல்லை', procedure: 'நடைமுறை புகார் (FIR மறுப்பு)' },
        bn: { assault: 'শারীরিক আক্রমণ / আঘাত', intimidation: 'ফৌজদারি হুমকি', property_fraud: 'প্রতারণা / সম্পত্তি অপরাধ', women_safety: 'নারী বিরুদ্ধে অপরাধ / যৌতুক হয়রানি', procedure: 'আইনি প্রক্রিয়া সংক্রান্ত অভিযোগ (FIR অস্বীকার)' },
        mr: { assault: 'शारीरिक हल्ला / जखम', intimidation: 'गैरविहित धमकी', property_fraud: 'फसवणूक / मालमत्ता गुन्हा', women_safety: 'महिला विरुद्ध गुन्हा / दहेज छळ', procedure: 'प्रक्रियात्मक तक्रार (FIR नाकारणी)' },
        kn: { assault: 'ದೈಹಿಕ ಹಲ್ಲೆ / ಗಾಯ', intimidation: 'ಅಪರಾಧಿಕ ಬೆದರಿಕೆ', property_fraud: 'ವಂಚನೆ / ಆಸ್ತಿ ಅಪರಾಧ', women_safety: 'ಮಹಿಳೆಯ ವಿರುದ್ಧ ಅಪರಾಧ / ವರದಕ್ಷಿಣೆ ಕಿರುಕುಳ', procedure: 'ಪ್ರಕ್ರಿಯಾತ್ಮಕ ದೂರು (FIR ನಿರಾಕರಣೆ)' },
        ml: { assault: 'ശാരീരിക ആക്രമണം / പരിക്ക്', intimidation: 'കുറ്റകരമായ ഭീഷണി', property_fraud: 'വഞ്ചന / സ്വത്ത് കുറ്റം', women_safety: 'സ്ത്രീക്കെതിരായ കുറ്റം / വധു പീഡനം', procedure: 'നടപടിക്രമ പരാതി (FIR നിരാകരണം)' }
    };
    const catLabel = (CAT_LABELS[lang] || CAT_LABELS.en)[cat] || '';
    // Secondary offence (multi-offence narratives): shown as "Also relevant: ..."
    // so the second crime isn't silently dropped. Never equals primary.
    const secCat = normalizeCategory(entities?.secondaryCategory, '');
    const secLabel = (secCat && secCat !== cat) ? ((CAT_LABELS[lang] || CAT_LABELS.en)[secCat] || '') : '';
    const ALSO = { en: 'Also relevant', hi: 'यह भी प्रासंगिक', te: 'ఇది కూడా వర్తిస్తుంది', ta: 'இதுவும் பொருந்தும்', bn: 'এটিও প্রযোজ্য', mr: 'हे देखील लागू', kn: 'ಇದೂ ಅನ್ವಯಿಸುತ್ತದೆ', ml: 'ഇതും ബാധകമാണ്' };
    const alsoWord = ALSO[lang] || ALSO.en;

    // ---- Section list ----
    const sectionWord = lang === 'hi' ? 'धारा' : lang === 'te' ? 'సెక్షన్' : lang === 'ta' ? 'பிரிவு' : lang === 'bn' ? 'ধারা' : lang === 'mr' ? 'कलम' : lang === 'kn' ? 'ಕಲಂ' : lang === 'ml' ? 'സെക്ഷൻ' : 'Section';
    const sectionsLines = (Array.isArray(retrieved) && retrieved.length)
        ? retrieved.map(({ statute, confidence }) => {
            const title = localTitle(statute);
            const conf = confidence === 'high' ? ' [strong match]' : confidence === 'medium' ? '' : ' [may apply]';
            return `${statute.code} ${sectionWord} ${statute.section} — ${title}${conf}`;
          })
        : [];

    // ---- LABELS per language ----
    const L = {
        en: { to: 'To', station: 'Police Station', subject: 'Subject: Complaint for FIR registration — BNSS 2023, Section 173', name: 'Name', parent: 'S/o, D/o, W/o', address: 'Address', phone: 'Phone', accused: 'Accused', dateOfIncident: 'Date of incident', place: 'Place of incident', narrative: 'Description of incident', offence: 'Offence category', sections: 'Relevant legal sections', note: '(Based on the above description — police to verify and apply)', request: 'Request', r1: 'Register my FIR immediately under BNSS 2023, Section 173 (Zero FIR permissible at any station).', r2: 'Investigate the incident and take appropriate legal action.', r3: 'Provide a free copy of the FIR as mandated by Section 173(2) BNSS.', confirm: 'I confirm the above is true to the best of my knowledge.', signature: 'Signature / Thumb impression', na: '—' },
        hi: { to: 'सेवा में', station: 'थाना', subject: 'विषय: FIR दर्ज करने हेतु शिकायत — BNSS 2023, धारा 173', name: 'नाम', parent: 'पिता/पति का नाम', address: 'पता', phone: 'मोबाइल', accused: 'आरोपी', dateOfIncident: 'घटना की तिथि', place: 'घटनास्थल', narrative: 'घटना का विवरण', offence: 'अपराध की श्रेणी', sections: 'लागू वैधानिक धाराएं', note: '(उपरोक्त विवरण के आधार पर — पुलिस द्वारा सत्यापन एवं लागू करने हेतु)', request: 'प्रार्थना', r1: 'BNSS 2023 की धारा 173 के अंतर्गत तुरंत FIR दर्ज करें (किसी भी थाने में जीरो FIR दर्ज की जा सकती है)।', r2: 'घटना की जांच करें और आरोपी के विरुद्ध उचित कानूनी कार्रवाई करें।', r3: 'धारा 173(2) BNSS के अनुसार FIR की निःशुल्क प्रति प्रदान करें।', confirm: 'मैं प्रमाणित करता/करती हूँ कि उपरोक्त विवरण मेरी जानकारी के अनुसार सत्य है।', signature: 'हस्ताक्षर / अंगूठे का निशान', na: '—' },
        te: { to: 'గౌరవనీయులైన', station: 'పోలీస్ స్టేషన్', subject: 'విషయం: FIR నమోదు కోసం ఫిర్యాదు — BNSS 2023, సెక్షన్ 173', name: 'పూర్తి పేరు', parent: 'తండ్రి/భర్త', address: 'చిరునామా', phone: 'ఫోన్', accused: 'నిందితుడు', dateOfIncident: 'సంఘటన తేదీ', place: 'సంఘటనా స్థలం', narrative: 'సంఘటన వివరణ', offence: 'నేర వర్గం', sections: 'వర్తించే చట్ట విభాగాలు', note: '(పైన పేర్కొన్న వివరణ ఆధారంగా — పోలీసులు ధృవీకరించి వర్తింపజేయడానికి)', request: 'అభ్యర్థన', r1: 'BNSS 2023 సెక్షన్ 173 ప్రకారం వెంటనే FIR నమోదు చేయాలి (ఏ స్టేషన్‌లోనైనా జీరో FIR నమోదు చేయవచ్చు).', r2: 'సంఘటనపై దర్యాప్తు చేసి నిందితులపై చట్టపరమైన చర్యలు తీసుకోవాలి.', r3: 'సెక్షన్ 173(2) BNSS ప్రకారం FIR ఉచిత కాపీని అందించాలి.', confirm: 'పైన పేర్కొన్న వివరాలు నా తెలిసినంతవరకు నిజమని ధృవీకరిస్తున్నాను.', signature: 'సంతకం', na: '—' },
        ta: { to: 'பெறுநர்', station: 'காவல் நிலையம்', subject: 'பொருள்: FIR பதிவு குறித்த புகார் — BNSS 2023, பிரிவு 173', name: 'முழுப் பெயர்', parent: 'தந்தை/கணவர்', address: 'முகவரி', phone: 'தொலைபேசி', accused: 'குற்றம் சாட்டப்பட்டவர்', dateOfIncident: 'சம்பவ தேதி', place: 'சம்பவ இடம்', narrative: 'சம்பவ விவரம்', offence: 'குற்ற வகை', sections: 'பொருந்தும் சட்டப் பிரிவுகள்', note: '(மேற்கண்ட விவரணையின் அடிப்படையில் — காவல்துறை சரிபார்த்து பொருந்துவதற்கு)', request: 'கோரிக்கை', r1: 'BNSS 2023 பிரிவு 173-ன் கீழ் உடனடியாக FIR பதிவு செய்ய வேண்டும் (ஏதேனும் நிலையத்தில் ஜீரோ FIR பதிவு செய்யலாம்).', r2: 'சம்பவத்தை விசாரித்து குற்றவாளிகளுக்கு எதிராக சட்ட நடவடிக்கை எடுக்க வேண்டும்.', r3: 'பிரிவு 173(2) BNSS-ன் கீழ் FIR-இன் இலவச நகலை வழங்க வேண்டும்.', confirm: 'மேற்கண்ட தகவல்கள் எனக்குத் தெரிந்தவரை உண்மை என உறுதிப்படுத்துகிறேன்.', signature: 'கையொப்பம்', na: '—' },
        bn: { to: 'বরাবরে', station: 'থানা', subject: 'বিষয়: FIR রুজুর জন্য অভিযোগ — BNSS ২০২৩, ধারা ১৭৩', name: 'পুরো নাম', parent: 'পিতা/স্বামী', address: 'ঠিকানা', phone: 'ফোন', accused: 'অভিযুক্ত', dateOfIncident: 'ঘটনার তারিখ', place: 'ঘটনাস্থল', narrative: 'ঘটনার বিবরণ', offence: 'অপরাধের ধরন', sections: 'প্রযোজ্য আইনগত ধারা', note: '(উপরের বিবরণের ভিত্তিতে — পুলিশ যাচাই করে প্রযোজ্য করবে)', request: 'অনুরোধ', r1: 'BNSS ২০২৩ ধারা ১৭৩ অনুযায়ী অবিলম্বে FIR রুজু করুন (যেকোনো থানায় জিরো FIR রুজু করা যেতে পারে)।', r2: 'ঘটনার তদন্ত করে অভিযুক্তের বিরুদ্ধে আইনি ব্যবস্থা নিন।', r3: 'ধারা ১৭৩(২) BNSS অনুযায়ী FIR-এর বিনামূল্যে কপি প্রদান করুন।', confirm: 'উপরের তথ্য আমার জানামতে সত্য তা আমি নিশ্চিত করছি।', signature: 'স্বাক্ষর', na: '—' },
        mr: { to: 'प्रति', station: 'पोलीस ठाणे', subject: 'विषय: FIR नोंदीसाठी तक्रार — BNSS २०२३, कलम १७३', name: 'पूर्ण नाव', parent: 'वडील/पती', address: 'पत्ता', phone: 'मोबाईल', accused: 'आरोपी', dateOfIncident: 'घटना दिनांक', place: 'घटनास्थळ', narrative: 'घटनेचे वर्णन', offence: 'गुन्ह्याचा प्रकार', sections: 'लागू कायदेशीर कलमे', note: '(वरील वर्णनाच्या आधारे — पोलीस तपासून लागू करण्यासाठी)', request: 'विनंती', r1: 'BNSS २०२३ कलम १७३ अंतर्गत तात्काळ FIR नोंदवा (कोणत्याही ठाण्यात जीरो FIR नोंदवता येते)।', r2: 'घटनेचा तपास करून आरोपीविरुद्ध कायदेशीर कारवाई करा.', r3: 'कलम १७३(२) BNSS अन्वये FIR ची मोफत प्रत प्रदान करा.', confirm: 'वरील माहिती माझ्या जाणते खरे आहे हे मी प्रमाणित करतो/करते.', signature: 'स्वाक्षरी', na: '—' },
        kn: { to: 'ಗೆ', station: 'ಪೊಲೀಸ್ ಠಾಣೆ', subject: 'ವಿಷಯ: FIR ದಾಖಲಿಸಲು ದೂರು — BNSS 2023, ಕಲಂ 173', name: 'ಪೂರ್ಣ ಹೆಸರು', parent: 'ತಂದೆ/ಗಂಡ', address: 'ವಿಳಾಸ', phone: 'ದೂರವಾಣಿ', accused: 'ಆರೋಪಿ', dateOfIncident: 'ಘಟನೆಯ ದಿನಾಂಕ', place: 'ಘಟನಾ ಸ್ಥಳ', narrative: 'ಘಟನೆಯ ವಿವರಣೆ', offence: 'ಅಪರಾಧದ ವರ್ಗ', sections: 'ಅನ್ವಯವಾಗುವ ಕಾನೂನು ವಿಧಿಗಳು', note: '(ಮೇಲಿನ ವಿವರಣೆಯ ಆಧಾರದ ಮೇಲೆ — ಪೊಲೀಸರು ಪರಿಶೀಲಿಸಿ ಅನ್ವಯಿಸಲು)', request: 'ವಿನಂತಿ', r1: 'BNSS 2023 ಕಲಂ 173 ರ ಅಡಿಯಲ್ಲಿ ತಕ್ಷಣವೇ FIR ದಾಖಲಿಸಿ (ಯಾವುದೇ ಠಾಣೆಯಲ್ಲಿ ಜೀರೋ FIR ದಾಖಲಿಸಬಹುದು).', r2: 'ಘಟನೆಯ ತನಿಖೆ ನಡೆಸಿ ಆರೋಪಿಗಳ ವಿರುದ್ಧ ಕಾನೂನು ಕ್ರಮ ಜರುಗಿಸಿ.', r3: 'ಕಲಂ 173(2) BNSS ರ ಪ್ರಕಾರ FIR ನ ಉಚಿತ ಪ್ರತಿ ನೀಡಿ.', confirm: 'ಮೇಲಿನ ಮಾಹಿತಿ ನನಗೆ ತಿಿಳಿದಂತೆ ಸತ್ಯ ಎಂದು ನಾನು ದೃಢೀಕರಿಸುತ್ತೇನೆ.', signature: 'ಸಹಿ', na: '—' },
        ml: { to: 'സ്വീകർത്താവ്', station: 'പോലീസ് സ്റ്റേഷൻ', subject: 'വിഷയം: FIR രജിസ്റ്റർ ചെയ്യുന്നതിനുള്ള പരാതി — BNSS 2023, സെക്ഷൻ 173', name: 'മുഴുവൻ പേര്', parent: 'പിതാവ്/ഭർത്താവ്', address: 'വിലാസം', phone: 'ഫോൺ', accused: 'പ്രതി', dateOfIncident: 'സംഭവ തീയതി', place: 'സംഭവ സ്ഥലം', narrative: 'സംഭവ വിവരണം', offence: 'കുറ്റത്തിന്റെ തരം', sections: 'ബാധകമായ നിയമ വകുപ്പുകൾ', note: '(മുകളിലെ വിവരണത്തിന്റെ അടിസ്ഥാനത്തിൽ — പോലീസ് പരിശോധിച്ച് ബാധകമാക്കാൻ)', request: 'അഭ്യർത്ഥന', r1: 'BNSS 2023 സെക്ഷൻ 173 പ്രകാരം ഉടൻ FIR രജിസ്റ്റർ ചെയ്യുക (ഏതെങ്കിലും സ്റ്റേഷനിൽ സീറോ FIR രജിസ്റ്റർ ചെയ്യാം).', r2: 'സംഭവത്തെക്കുറിച്ച് അന്വേഷിച്ച് പ്രതിക്കെതിരെ നിയമനടപടി സ്വീകരിക്കുക.', r3: 'സെക്ഷൻ 173(2) BNSS പ്രകാരം FIR-ന്റെ സൗജന്യ പകർപ്പ് നൽകുക.', confirm: 'മുകളിലെ വിവരങ്ങൾ എനിക്കറിയാവുന്നത് സത്യമാണെന്ന് ഞാൻ സ്ഥിരീകരിക്കുന്നു.', signature: 'ഒപ്പ്', na: '—' }
    };
    const l = L[lang] || L.en;

    // ---- Helper to build section lines ----
    const sectionLines = sectionsLines.length
        ? sectionsLines.map((s) => `   • ${s}`).join('\n')
        : `   (${l.note})`;

    const locDisplay = incidentLoc || l.na;
    const dateDisplay = incidentDate || todayDate;
    const parentLine = cParent ? `\n${l.parent}: ${cParent}` : '';
    const addressLine = cAddress ? `\n${l.address}: ${cAddress}` : '';
    const phoneLine = cPhone ? `\n${l.phone}: ${cPhone}` : '';
    const stationLine = psName ? `\n${l.station}: ${psName}` : '';

    // Dynamic subject based on complaint category
    const categorySubjects = {
        en: { assault: 'Complaint of Physical Assault', intimidation: 'Complaint of Criminal Intimidation', property_fraud: 'Complaint of Property Fraud / Cheating', women_safety: 'Complaint of Offence Against Woman', procedure: 'Complaint Regarding Police Procedure', needs_human_review: 'Complaint for FIR Registration' },
        hi: { assault: 'शारीरिक हमले की शिकायत', intimidation: 'आपराधिक धमकी की शिकायत', property_fraud: 'संपत्ति धोखाधड़ी की शिकायत', women_safety: 'महिला के विरुद्ध अपराध की शिकायत', procedure: 'पुलिस प्रक्रिया संबंधी शिकायत', needs_human_review: 'FIR दर्ज करने हेतु शिकायत' },
        te: { assault: 'శారీరక దాడి ఫిర్యాదు', intimidation: 'క్రిమినల్ బెదిరింపు ఫిర్యాదు', property_fraud: 'ఆస్తి మోసం ఫిర్యాదు', women_safety: 'మహిళపై నేరం ఫిర్యాదు', procedure: 'పోలీసు విధానం ఫిర్యాదు', needs_human_review: 'FIR నమోదు కోసం ఫిర్యాదు' },
        ta: { assault: 'உடல் தாக்குதல் புகார்', intimidation: 'குற்றவியல் மிரட்டல் புகார்', property_fraud: 'சொத்து மோசடி புகார்', women_safety: 'பெண் மீதான குற்ற புகார்', procedure: 'காவல்துறை நடைமுறை புகார்', needs_human_review: 'FIR பதிவு புகார்' },
        bn: { assault: 'শারীরিক আক্রমণের অভিযোগ', intimidation: 'ফৌজদারি হুমকির অভিযোগ', property_fraud: 'সম্পত্তি প্রতারণার অভিযোগ', women_safety: 'নারীর বিরুদ্ধে অপরাধের অভিযোগ', procedure: 'পুলিশ পদ্ধতি অভিযোগ', needs_human_review: 'FIR রুজুর জন্য অভিযোগ' },
        mr: { assault: 'शारीरिक हल्ल्याची तक्रार', intimidation: 'गुन्हेगारी धमकीची तक्रार', property_fraud: 'मालमत्ता फसवणुकीची तक्रार', women_safety: 'महिलेविरुद्ध गुन्ह्याची तक्रार', procedure: 'पोलीस प्रक्रिया तक्रार', needs_human_review: 'FIR नोंदीसाठी तक्रार' },
        kn: { assault: 'ದೈಹಿಕ ಹಲ್ಲೆ ದೂರು', intimidation: 'ಕ್ರಿಮಿನಲ್ ಬೆದರಿಕೆ ದೂರು', property_fraud: 'ಆಸ್ತಿ ವಂಚನೆ ದೂರು', women_safety: 'ಮಹಿಳೆಯ ಮೇಲಿನ ಅಪರಾಧ ದೂರು', procedure: 'ಪೊಲೀಸ್ ಪ್ರಕ್ರಿಯೆ ದೂರು', needs_human_review: 'FIR ದಾಖಲಿಸಲು ದೂರು' },
        ml: { assault: 'ശാരീരിക ആക്രമണ പരാതി', intimidation: 'ക്രിമിനൽ ഭീഷണി പരാതി', property_fraud: 'സ്വത്ത് തട്ടിപ്പ് പരാതി', women_safety: 'സ്ത്രീക്കെതിരായ കുറ്റം പരാതി', procedure: 'പോലീസ് നടപടി പരാതി', needs_human_review: 'FIR രജിസ്റ്റർ ചെയ്യുന്നതിനുള്ള പരാതി' }
    };
    const catSubj = (categorySubjects[lang] || categorySubjects.en)[entities?.category] || (categorySubjects[lang] || categorySubjects.en).needs_human_review;
    const subjectPrefix = l.subject.split(':')[0] + ':';  // "विषय:" or "Subject:"
    const dynamicSubject = `${subjectPrefix} ${catSubj} — BNSS 2023, Section 173`;

    // ---- Build all 8 drafts with identical structure ----
    const draft = (extraBefore) =>
`${l.to},
${l.station}${stationLine ? `: ${psName}` : ''}

${dynamicSubject}

${l.name}: ${cName}${parentLine}${addressLine}${phoneLine}

${l.accused}: ${aggressor || l.na}

${l.dateOfIncident}: ${dateDisplay}
${l.place}: ${locDisplay}

${l.narrative}:
${narrative || l.na}
${extraBefore || ''}
${catLabel ? `\n${l.offence}: ${catLabel}${secLabel ? ` · ${alsoWord}: ${secLabel}` : ''}` : ''}

${l.sections}:
${sectionLines}

${l.request}:
(1) ${l.r1}
(2) ${l.r2}
(3) ${l.r3}

${l.confirm}

${l.dateOfIncident}: ${todayDate}
${l.place}: ${locDisplay}

${l.signature}: _____________________________
${l.name}: ${cName}`;

    const englishDraft = draft(
        englishSummary ? `\nEnglish summary: ${englishSummary}` : ''
    );

    let nativeOutput = englishDraft;
    if (lang === 'hi') nativeOutput = draft();
    else if (lang === 'te') nativeOutput = draft();
    else if (lang === 'ta') nativeOutput = draft();
    else if (lang === 'bn') nativeOutput = draft();
    else if (lang === 'mr') nativeOutput = draft();
    else if (lang === 'kn') nativeOutput = draft();
    else if (lang === 'ml') nativeOutput = draft();

    return {
        english: englishDraft,
        native: nativeOutput,
        hindi: lang === 'hi' ? nativeOutput : draft(),
        language: lang
    };
}

export async function draftComplaint(complainantInfo, entities, retrieved, langLabel, opts = {}) {
    // Deterministic template drafting (prototype). LLM never invents section numbers;
    // sections come only from retrieval.js. LLM is used only for optional fact extraction
    // and the English gist (opts.englishSummary / opts.gistSource).
    const selectedLanguage = normalizeLanguageCode(langLabel) || 'en';
    return buildProfessionalPoliceComplaint(complainantInfo, entities, retrieved, selectedLanguage, opts);
}

// Honest engine status + optional perf measurement (no fake 10-12 tok/s claims).
export function getEngineStatus() {
    if (engine && activeModelId) return { mode: 'ai', model: activeModelId };
    if (isWebGPUSupported()) return { mode: 'webgpu-available', model: null };
    return { mode: 'rule-only', model: null };
}

export async function measureInferenceSpeed(samplePrompt = 'Extract: name, date, place.') {
    if (!isWebGPUSupported()) return { supported: false, mode: 'rule-only', note: 'WebGPU unavailable; rule engine ~1-3ms (see EVALUATION.md).' };
    try {
        const eng = await ensureEngine();
        const t0 = performance.now();
        const reply = await eng.chat.completions.create({
            messages: [{ role: 'user', content: samplePrompt }],
            temperature: 0.1,
            max_tokens: 32
        });
        const dt = (performance.now() - t0) / 1000;
        const text = reply.choices[0]?.message?.content || '';
        const toks = Math.max(1, Math.round(text.length / 4));
        const tps = dt > 0 ? +(toks / dt).toFixed(1) : 0;
        const memMB = (performance?.memory?.usedJSHeapSize ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null);
        return { supported: true, mode: 'ai', tokens: toks, seconds: +dt.toFixed(2), tokensPerSec: tps, jsHeapMB: memMB, model: activeModelId };
    } catch (err) {
        return { supported: false, mode: 'rule-only', error: err?.message || String(err) };
    }
}
