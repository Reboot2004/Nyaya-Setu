// Nyaya-Setu LLM module — WebGPU AI + robust rule-based Indic entity extraction.
// Helps citizens understand their rights and draft a police complaint in their language.
import * as webllm from '@mlc-ai/web-llm';
import { STATUTE_TITLE_MAP } from '../data/statutes.js';

const MODEL_CANDIDATES = [
    'Llama-3.2-1B-Instruct-q4f32_1-MLC',
    'Llama-3.2-1B-Instruct-q4f16_1-MLC'
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
        /([A-Za-z\u0900-\u0D7F]+(?:\s+और\s+उसके\s+[^,।\n]+|\s+and\s+[^,।\n]+)?)\s+ने\s+(?:मेरा\s+रास्ता|मुझे|हमला|पीटा|मारा|धमकी)/i,
        /(?:आरोपी|accused|attacked by|threatened by|beaten by)\s*[:=-]?\s*([A-Za-z\u0900-\u0D7F]+(?:\s+और\s+[^,।\n]+|\s+and\s+[^,।\n]+)?)/i,
        /(?:सामने|द्वारा|खिलाफ)\s+([A-Za-z\u0900-\u0D7F]+(?:\s+और\s+[^,।\n]+)?)\s+ने/i,
        // English subject-verb: "People hit me", "Mohan beat me", "Rajesh slapped me"
        /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,2}|people|neighbours|neighbors|relatives|contractor|officials|goons|policeman)\b\s+(?:hit|beat|beats|beaten|slapped|abused|assaulted|attacked|threatened|cheated|grabbed|stole|molested)\b/i,
        // "Rajesh Kumar used abusive language" (adjacent — avoids "March ... used" spans)
        /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\s+used\s+abusive\b/,
        // "...slapped / abused me" with a few words in between (months/days excluded below)
        /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b[^.!?]{0,40}?\b(?:slapped|abused|assaulted|threatened|attacked|molested)\b/
    ];
    const BAD_SUBJECT = /^(the|a|an|on|in|at|and|or|of|to|for|with|from|against|language|yesterday|today|my|me|i|they|them|he|she|it|we|you|january|february|march|april|may|june|july|august|september|october|november|december|monday|tuesday|wednesday|thursday|friday|saturday|sunday|मैं|मुझे|हम)$/i;
    const LOWCASE_NOUNS = /^(people|neighbours|neighbors|relatives|contractor|officials|goons|policeman)$/i;
    for (const pat of accusedMatches) {
        const m = text.match(pat);
        if (!m || !m[1] || m[1].length <= 1 || BAD_SUBJECT.test(m[1].trim())) continue;
        // English names start uppercase ("against me and slapped" is not a name);
        // known lowercase role-nouns (people, policeman, ...) pass through.
        const cand = m[1].trim();
        if (/^[a-z]/.test(cand) && !LOWCASE_NOUNS.test(cand.split(/\s+/).pop())) continue;
        aggressor = cand;
        break;
    }
    if (aggressor === 'unknown') {
        const directAccused = text.match(/([A-Za-z\u0900-\u0D7F]+(?:\s+और\s+[^\s,।]+)?)\s+ने\s+(?:मेरा|मुझे|हमला|पीटा|रास्ता)/i);
        if (directAccused && directAccused[1]) aggressor = directAccused[1].trim();
    }

    // 4. Extract Date / Time (incl. ISO 2023-02-20)
    const dateMatches = [
        /(\d{4}\s*[-\/.]\s*\d{1,2}\s*[-\/.]\s*\d{1,2})/,
        /(?:दिनांक|तारीख|दिनांकित|on|dated|dinank)?\s*(\d{1,2}(?:\s+[A-Za-z\u0900-\u0D7F]+(?:\s+\d{2,4})?|\s*[-\/.]\s*\d{1,2}\s*[-\/.]\s*\d{2,4}))/i,
        /\b(कल|आज|परसों|yesterday|today|ninna|netru)\b/i
    ];
    for (const pat of dateMatches) {
        const m = text.match(pat);
        if (m && m[1]) {
            const cand = m[1].trim();
            // guard: "6 people" / "2 men" are counts, not dates
            if (/people|person|men|women|boys|girls|persons/i.test(cand)) continue;
            incidentDate = cand;
            break;
        }
    }

    // 5. Extract Location (latin prepositions need word boundaries: "beat" must not match "at")
    const locMatches = [
        /(?:के\s+सामने|के\s+पास|निकट|में|पर|ग्राम|स्थान|\bnear\b|\bat\b|\bin\b|\boutside\b|\bopposite\b)\s+([A-Za-z\u0900-\u0D7F]+(?:\s+[A-Za-z\u0900-\u0D7F]+){1,3})/i,
        /([A-Za-z\u0900-\u0D7F]+(?:\s+पंचायत\s+भवन|\s+चौराहा|\s+बाजार|\s+थाना|\s+रोड|\s+गांव))/i
    ];
    for (const pat of locMatches) {
        const m = text.match(pat);
        if (m && m[1] && m[1].length > 2 && !/^(the|a|an|my|me|i|his|her|this|that|मुझे|मेरा|मेरी|हमारा)$/i.test(m[1].trim())) {
            // strip leading pronouns/articles the preposition pattern swallowed ("me badly...")
            incidentLoc = m[1].trim().replace(/^(me|my|the|a|an|this|that|his|her|our)\s+/i, '').trim() || 'unknown';
            if (incidentLoc.length > 2) break;
            incidentLoc = 'unknown';
        }
    }

    // 6. Offence Category Classification (all 8 lexicon languages, not just EN/HI)
    const low = text.toLowerCase();
    if (/marpit|assault|\bhit\b|\bbeat\b|\bbeats\b|beaten|laathi|hurt|fracture|blood|attack|chot|injury|raktham|मारपीट|पीटा|लाठी|डंडों|चोट|घायल|मारा|अस्पताल|కొట్టారు|దెబ్బలాట|దాడి|గాయం|రక్తం|ఆసుపత్రి|அடி|தாக்கு|காயம்|ரத்தம்|மருத்துவமனை|मारहाण|हाणामारी|जखमी|रक्तस्त्राव|রক্তপাত|হাসপাতাল|ಹಲ್ಲೆ|ಹೊಡೆ|ಗಾಯ|ರಕ್ತ|ಆಸ್ಪತ್ರೆ|മർദ്ദനം|തല്ലി|പരിക്ക്|രക്തം|ആശുപത്രി/i.test(low)) category = 'assault';
    else if (/dhamki|threat|intimidation|warned|gali|abuse|bedirimpulu|धमकी|जान से मारने|गाली|गाली-गलौज|బెదిరింపు|భయపెట్టారు|బూతులు|దూషించారు|అసహ్యం|చెడ్డ పదాలు|மிரட்டல்|பயமுறுத்தி|திட்டினார்கள்|அவமானம்|धमकी|घाबरवले|शिवीगाळ|হুমকি|ভয়|গালাগালি|ಬೆದರಿಕೆ|ಹೆದರಿಸಿದರು|ಬೈಗುಳ|ഭീഷണി|പേടിപ്പിച്ചു|ചീത്തവിളിച്ചു|social media/i.test(low)) category = 'intimidation';
    else if (/fraud|cheat|dhokha|chori|stole|theft|robbery|extortion|paisa|wage|salary|property|चोरी|हफ्ता|रंगदारी|धोखा|वेतन|मजदूरी|దొంగతనం|మోసం|డబ్బులు|திருட்டு|மோசடி|पळवून|फसवणूक|চুরি|প্রতারণা|ಕಳ್ಳತನ|ವಂಚನೆ|മോഷണം|വഞ്ചന/i.test(low)) category = 'property_fraud';
    else if (/woman|chhed|modesty|molest|dowry|dahej|husband|wife|cruelty|महिला|छेड़छाड़|दहेज|पति|पत्नी/i.test(low)) category = 'women_safety';

    return {
        summary: text.slice(0, 300),
        complainantName,
        parentName,
        aggressor,
        date: incidentDate,
        location: incidentLoc,
        category,
        events: [text]
    };
}

const ALLOWED_CATEGORIES = new Set(['assault', 'intimidation', 'property_fraud', 'women_safety', 'procedure']);

// Coerce any LLM/rule value to a clean plain string. Unwraps single-key objects
// like {name}, {description}, {date}, {place}, strips surrounding quotes/braces,
// and maps "unknown"-variants to 'unknown'. Never returns objects.
function cleanStr(v, fallback = 'unknown') {
    let cur = v;
    let guard = 0;
    while (cur !== null && typeof cur === 'object' && guard++ < 4) {
        if (Array.isArray(cur)) { cur = cur[0]; continue; }
        const keys = Object.keys(cur);
        if (keys.length === 0) { cur = fallback; break; }
        cur = cur.name ?? cur.description ?? cur.date ?? cur.place ?? cur.value ?? cur.text ?? cur[0] ?? fallback;
    }
    if (cur === null || cur === undefined) return fallback;
    let s = String(cur).trim();
    // strip wrapping quotes/backticks/braces repeatedly: "\"Unknown\"", "{...}", "'x'"
    for (let i = 0; i < 3; i++) {
        const t = s.trim();
        if (/^[{[].*[}\]]$/.test(t) && !/\s/.test(t.slice(0, 20))) break; // leave real JSON blobs to caller fallback
        if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'")) || (t.startsWith('`') && t.endsWith('`'))) {
            s = t.slice(1, -1).trim();
            continue;
        }
        break;
    }
    s = s.replace(/^["'`\s]+|["'`\s]+$/g, '').trim();
    if (!s) return fallback;
    if (/^(unknown|not\s*given|not\s*specified|n\/a|na|none|null|undefined|nil|-+)$/i.test(s)) return 'unknown';
    if (/^unknown$/i.test(s.replace(/["']/g, ''))) return 'unknown';
    return s;
}

function isKnown(v) {
    const s = cleanStr(v, 'unknown');
    return s !== 'unknown';
}

// "assault|intimidation|..." (model echoing the enum) -> first valid single label.
function normalizeCategory(v, fallback = 'needs_human_review') {
    const raw = cleanStr(v, '');
    if (!raw) return fallback;
    const parts = raw.toLowerCase().split(/[|/,;\s]+/).map((p) => p.trim()).filter(Boolean);
    for (const p of parts) {
        if (ALLOWED_CATEGORIES.has(p)) return p;
    }
    if (ALLOWED_CATEGORIES.has(raw.toLowerCase())) return raw.toLowerCase();
    return fallback;
}

export async function extractEntities(narrative) {
    const ruleEntities = extractEntitiesRuleBased(narrative);

    // Runnable by default: skip 700MB WebGPU download unless explicitly opted in.
    if (!isAIAssistEnabled() || !isWebGPUSupported()) {
        return ruleEntities;
    }

    try {
        const eng = await ensureEngine();
        const messages = [
            {
                role: 'system',
                content:
                    'You are a legal intake assistant for Indian Police FIR complaints. Extract factual details from a citizen grievance narrative in any Indian language. Reply ONLY with compact JSON: {"summary": "<factual summary without prayers>", "complainantName": "<name or unknown>", "parentName": "<father/spouse or unknown>", "aggressor": "<accused name/description or unknown>", "date": "<date or current>", "location": "<place or unknown>", "category": "<assault|intimidation|property_fraud|women_safety|procedure>"}'
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
            summary = ruleEntities.summary;
        }
        return {
            summary,
            complainantName: cleanStr(parsed.complainantName, ruleEntities.complainantName),
            parentName: cleanStr(parsed.parentName, ruleEntities.parentName),
            aggressor: cleanStr(parsed.aggressor, ruleEntities.aggressor),
            date: cleanStr(parsed.date, ruleEntities.date),
            location: cleanStr(parsed.location, ruleEntities.location),
            category: normalizeCategory(parsed.category, ruleEntities.category),
            events: [narrative]
        };
    } catch {
        return ruleEntities;
    }
}

/**
 * Standard Indian Police Complaint Formatter across 8 Indian Languages.
 * Structure follows BNSS 2023 Section 173. Language is kept simple and accessible.
 */
function buildProfessionalPoliceComplaint(complainantInfo, entities, retrieved, selectedLang) {
    const lang = normalizeLanguageCode(selectedLang) || 'en';
    const todayDate = new Date().toLocaleDateString('en-IN');

    // ---- Helper to get localized statute title ----
    const localTitle = (statute) => {
        if (!statute || !statute.id) return statute?.title || '';
        const map = STATUTE_TITLE_MAP[statute.id];
        return (map && map[lang]) ? map[lang] : (statute.title || '');
    };

    // ---- Resolve all fields, avoid "unknown"/JSON in final draft ----
    // Incident date defaults to TODAY when not given (user requirement).
    const cNameRaw = isKnown(complainantInfo?.name) ? cleanStr(complainantInfo.name) : (isKnown(entities?.complainantName) ? cleanStr(entities.complainantName) : '');
    const cName = cNameRaw
        || ({ hi: 'शिकायतकर्ता', te: 'ఫిర్యాదుదారు', ta: 'புகார்தாரர்', bn: 'অভিযোগকারী', mr: 'तक्रारदार', kn: 'ದೂರುದಾರ', ml: 'പരാതിക്കാരൻ' }[lang] || 'The Complainant');

    const cParent = isKnown(complainantInfo?.parent) ? cleanStr(complainantInfo.parent)
        : (isKnown(entities?.parentName) ? cleanStr(entities.parentName) : '');

    const cPhone = isKnown(complainantInfo?.phone) ? cleanStr(complainantInfo.phone) : '';

    const cAddress = isKnown(complainantInfo?.address) ? cleanStr(complainantInfo.address)
        : ({ hi: 'थाना क्षेत्र के भीतर', te: 'పోలీస్ స్టేషన్ పరిధిలో', ta: 'காவல் நிலைய பகுதியில்', bn: 'থানা এলাকায়', mr: 'ठाण्याच्या हद्दीत', kn: 'ಠಾಣೆ ವ್ಯಾಪ್ತಿಯಲ್ಲಿ', ml: 'സ്റ്റേഷൻ പരിധിക്കുള്ളിൽ' }[lang] || 'Within the police station area');

    // PS: dynamic or blank — never a stale/wrong default.
    const psName = isKnown(complainantInfo?.station) ? cleanStr(complainantInfo.station)
        : '________ (fill at station — Zero FIR can be filed at any station)';

    const incidentLoc = isKnown(complainantInfo?.location) ? cleanStr(complainantInfo.location)
        : (isKnown(entities?.location) ? cleanStr(entities.location)
        : ({ hi: 'घटनास्थल (विवरण अनुसार)', te: 'సంఘటనా స్థలం', ta: 'சம்பவ இடம்', bn: 'ঘটনাস্থল', mr: 'घटनास्थळ', kn: 'ಘಟನಾ ಸ್ಥಳ', ml: 'സ്ഥലം' }[lang] || 'As described in the complaint'));

    const aggressor = isKnown(complainantInfo?.accused) ? cleanStr(complainantInfo.accused)
        : (isKnown(entities?.aggressor) ? cleanStr(entities.aggressor)
        : ({ hi: 'आरोपी व्यक्ति (विवरण अनुसार)', te: 'నిందితుడు', ta: 'குற்றம் சாட்டப்பட்டவர்', bn: 'অভিযুক্ত ব্যক্তি', mr: 'आरोपी', kn: 'ಆರೋಪಿ', ml: 'പ്രതി' }[lang] || 'The accused person(s) as described below'));

    const incidentDate = isKnown(complainantInfo?.date) ? cleanStr(complainantInfo.date)
        : (isKnown(entities?.date) ? cleanStr(entities.date) : todayDate);

    let summaryFacts = cleanStr(entities?.summary, '') || cleanStr(complainantInfo?.narrative, '');
    if (!summaryFacts || summaryFacts === 'unknown' || /^[{[].*[}\]]$/.test(summaryFacts)) {
        summaryFacts = cleanStr(complainantInfo?.narrative, '');
    }

    // ---- Build localized section list — title in selected language ----
    const sectionsList = (Array.isArray(retrieved) && retrieved.length)
        ? retrieved.map(({ statute }) => {
            const title = localTitle(statute);
            return `${statute.code} ${lang === 'hi' ? 'धारा' : lang === 'te' ? 'సెక్షన్' : lang === 'ta' ? 'பிரிவு' : lang === 'bn' ? 'ধারা' : lang === 'mr' ? 'कलम' : lang === 'kn' ? 'ಕಲಂ' : lang === 'ml' ? 'സെക്ഷൻ' : 'Section'} ${statute.section} — ${title}`;
          }).join('\n   • ')
        : '';

    // 1. ENGLISH DRAFT
    const sectionsBlock = sectionsList
        ? `   • ${sectionsList}`
        : '   (No specific section matched — general complaint to be processed under BNSS 173)';

    const englishDraft =
`To,
The Officer In-Charge,
Police Station: ${psName}

Subject: Written complaint requesting registration of FIR under BNSS 2023, Section 173.

My name is ${cName}${cParent ? `, son/daughter/spouse of ${cParent}` : ''}. I am writing to report an incident that happened to me and I am asking the police to register my complaint (FIR) and investigate it.

1. MY DETAILS:
   • Name: ${cName}${cParent ? ` (S/o, D/o, W/o: ${cParent})` : ''}
   • Address: ${cAddress}
   • Phone: ${cPhone || 'Will provide at station'}

2. PERSON(S) I AM COMPLAINING AGAINST:
   • Name / Description: ${aggressor}

3. WHEN AND WHERE IT HAPPENED:
   • Date: ${incidentDate}
   • Place: ${incidentLoc}

4. WHAT HAPPENED:
   On ${incidentDate}, at ${incidentLoc}, the following happened to me:

   ${summaryFacts}

5. LAW SECTIONS THAT MAY APPLY:
   (These are suggested based on what I described — the police will verify)
${sectionsBlock}

6. WHAT I AM ASKING THE POLICE TO DO:
   (1) Please register my FIR immediately. Under BNSS 2023, Section 173, the police are required to register my complaint — even as a Zero FIR if needed.
   (2) Please investigate the incident and take action against the accused.
   (3) Please give me a free copy of the FIR as required by Section 173(2) BNSS.

I confirm that everything I have written above is true to the best of my knowledge.

Date: ${todayDate}
Place: ${incidentLoc}

Signature / Thumb impression: _____________________________
Name: ${cName}
Phone: ${cPhone || '________________'}`;



    // 2. HINDI DRAFT (शुद्ध हिंदी)
    const hindiDraft =
`सेवा में,
थाना प्रभारी महोदय,
थाना: ${psName}

विषय: शिकायत दर्ज करने एवं जांच हेतु लिखित आवेदन — भारतीय नागरिक सुरक्षा संहिता (BNSS) 2023 की धारा 173 के अंतर्गत।

मेरा नाम ${cName} है${cParent ? `, पिता/पति का नाम ${cParent} है` : ''}। मैं यह शिकायत इसलिए लिख रहा/रही हूँ क्योंकि मेरे साथ एक घटना घटी है और मैं चाहता/चाहती हूँ कि पुलिस मेरी FIR दर्ज करे तथा उचित जांच करे।

1. मेरा विवरण:
   • नाम: ${cName}${cParent ? ` (आत्मज/पत्नी: ${cParent})` : ''}
   • पता: ${cAddress}
   • मोबाइल: ${cPhone || 'थाने में दिया जाएगा'}

2. जिसके विरुद्ध शिकायत है:
   • नाम / विवरण: ${aggressor}

3. घटना कब और कहाँ हुई:
   • दिनांक: ${incidentDate}
   • स्थान: ${incidentLoc}

4. क्या हुआ:
   दिनांक ${incidentDate} को ${incidentLoc} पर निम्नलिखित घटना मेरे साथ हुई:

   ${summaryFacts}

5. लागू हो सकने वाली धाराएं:
   (ये धाराएं मेरे विवरण के आधार पर सुझाई गई हैं — पुलिस जांच के बाद इन्हें लागू करेगी)
${sectionsBlock}

6. मेरी प्रार्थना:
   (1) कृपया मेरी FIR तुरंत दर्ज करें। BNSS 2023 की धारा 173 के तहत पुलिस मेरी शिकायत दर्ज करने के लिए बाध्य है — जरूरत हो तो जीरो FIR भी दर्ज की जा सकती है।
   (2) कृपया मामले की जांच करें और आरोपी के विरुद्ध कार्रवाई करें।
   (3) कृपया धारा 173(2) BNSS के अनुसार मुझे FIR की एक निशुल्क प्रति दें।

मैं प्रमाणित करता/करती हूँ कि ऊपर लिखी सभी बातें मेरी जानकारी के अनुसार सत्य हैं।

दिनांक: ${todayDate}
स्थान: ${incidentLoc}

हस्ताक्षर / अंगूठे का निशान: _____________________________
नाम: ${cName}
मोबाइल: ${cPhone || '________________'}`;



    // 3. TELUGU DRAFT
    const teluguDraft = 
`గౌరవనీయులైన స్టేషన్ హౌస్ ఆఫీసర్ గారికి,
పోలీస్ స్టేషన్: ${psName}

విషయం: భారతీయ నాగరిక్ సురక్ష సంహిత (BNSS) 2023 లోని సెక్షన్ 173 ప్రకారం ఎఫ్.ఐ.ఆర్ (FIR) నమోదు మరియు సత్వర విచారణ కొరకు లిఖితపూర్వక ఫిర్యాదు.

1. ఫిర్యాదుదారుని వివరాలు:
   • పూర్తి పేరు: ${cName}${cParent ? ` (తండ్రి/భర్త: ${cParent})` : ''}
   • నివాస చిరునామా: ${cAddress}
   • ఫోన్ నంబర్: ${cPhone || 'స్టేషన్‌లో అందించబడుతుంది'}

2. నిందితుని వివరాలు:
   • పేరు / వివరణ: ${aggressor}

3. సంఘటన జరిగిన తేదీ మరియు స్థలం:
   • తేదీ: ${incidentDate}
   • సంఘటనా స్థలం: ${incidentLoc}

4. సంఘటన వాస్తవాలు:
   (ఎ) ${incidentDate} తేదీన, ${incidentLoc} వద్ద పైన పేర్కొన్న నిందితుడు నాపై దౌర్జన్యపూరితమైన నేరానికి పాల్పడ్డాడు.
   (బి) ${summaryFacts}
   (సి) ఈ సంఘటన వలన నాకు తీవ్రమైన నష్టం మరియు ఆందోళన కలిగింది.

5. వర్తించే చట్ట విభాగాలు:
${sectionsBlock}

6. చట్టబద్ధమైన అభ్యర్థన:
   (1) BNSS సెక్షన్ 173 ప్రకారం వెంటనే FIR నమోదు చేయాలని;
   (2) నిందితులపై చట్టరీత్యా కఠిన చర్యలు తీసుకోవాలని;
   (3) సెక్షన్ 173(2) BNSS ప్రకారం ఉచిత FIR కాపీని అందించాలని కోరుతున్నాను.

ధృవీకరణ:
పైన పేర్కొన్న వివరాలన్నీ నా వ్యక్తిగత పరిజ్ఞానం ప్రకారం పూర్తిగా నిజమైనవని ధృవీకరిస్తున్నాను.

తేదీ: ${todayDate}
స్థలం: ${incidentLoc}

సంతకం: _____________________________ (${cName})`;

    // 4. TAMIL DRAFT
    const tamilDraft = 
`பெறுநர்,
காவல் நிலைய ஆய்வாளர் அவர்கள்,
காவல் நிலையம்: ${psName}

பொருள்: பாரதிய நாகரிக் சுரக்ஷா சன்ஹிதா (BNSS) 2023 பிரிவு 173-ன் கீழ் எஃப்.ஐ.ஆர் பதிவு செய்ய எழுத்துப்பூர்வ புகார்.

1. புகார்தாரர் விவரங்கள்:
   • முழுப் பெயர்: ${cName}${cParent ? ` (தந்தை/கணவர்: ${cParent})` : ''}
   • முகவரி: ${cAddress}
   • தொலைபேசி: ${cPhone || 'காவல் நிலையத்தில் வழங்கப்படும்'}

2. குற்றம் சாட்டப்பட்டவர் விவரம்:
   • பெயர் / விவரம்: ${aggressor}

3. சம்பவம் நடந்த தேதி மற்றும் இடம்:
   • தேதி: ${incidentDate}
   • இடம்: ${incidentLoc}

4. சம்பவத்தின் விவரம்:
   (அ) ${incidentDate} அன்று ${incidentLoc} பகுதியில் மேற்கண்ட நபர் என் மீது அத்துமீறி குற்றம் புரிந்தார்.
   (ஆ) ${summaryFacts}

5. பொருந்தக்கூடிய சட்டப் பிரிவுகள்:
${sectionsBlock}

6. சட்டப்பூர்வ கோரிக்கை:
   (1) BNSS பிரிவு 173-ன் கீழ் உடனடியாக எஃப்.ஐ.ஆர் பதிவு செய்யப்பட வேண்டும்;
   (2) உரிய விசாரணை நடத்தி சட்டப்படி நடவடிக்கை எடுக்கப்பட வேண்டும்;
   (3) BNSS பிரிவு 173(2)-ன் கீழ் பதிவு செய்யப்பட்ட எஃப்.ஐ.ஆர் நகலை இலவசமாக வழங்க வேண்டும்.

தேதி: ${todayDate}
இடம்: ${incidentLoc}

கையொப்பம்: _____________________________ (${cName})`;

    // 5. BENGALI DRAFT
    const bengaliDraft = 
`বরাবরে,
ভারপ্রাপ্ত আধিকারিক মহাশয়,
থানা: ${psName}

বিষয়: ভারতীয় নাগরিক সুরক্ষা সংহিতা (BNSS) ২০২৩-এর ধারা ১৭৩ অনুযায়ী এফআইআর (FIR) রুজু করার লিখিত অভিযোগ।

১. অভিযোগকারীর বিবরণ:
   • পুরো নাম: ${cName}${cParent ? ` (পিতা/স্বামীর নাম: ${cParent})` : ''}
   • ঠিকানা: ${cAddress}
   • ফোন নম্বর: ${cPhone || 'থানায় জমা দেওয়া হবে'}

২. অভিযুক্ত ব্যক্তির বিবরণ:
   • নাম / বিবরণ: ${aggressor}

৩. ঘটনার তারিখ ও স্থান:
   • তারিখ: ${incidentDate}
   • ঘটনাস্থল: ${incidentLoc}

৪. ঘটনার বিবরণ (তথ্য):
   (ক) ${incidentDate} তারিখে ${incidentLoc} সংলগ্ন এলাকায় উক্ত অভিযুক্ত ব্যক্তি(রা) আমার ওপর অন্যায় ও অপরাধমূলক কাজ করেছে।
   (খ) ${summaryFacts}

৫. প্রযোজ্য আইনগত ধারা:
${sectionsBlock}

৬. আইনি পদক্ষেপের প্রার্থনা:
   (১) BNSS ১৭৩ ধারায় অবিলম্বে এফআইআর নথিভুক্ত করা হোক;
   (২) ঘটনার সুষ্ঠু তদন্ত করে উপযুক্ত আইনি ব্যবস্থা নেওয়া হোক;
   (৩) BNSS ১৭৩(২) ধারা অনুযায়ী আমাকে বিনামূল্যে এফআইআর-এর কপি প্রদান করা হোক।

তারিখ: ${todayDate}
স্থান: ${incidentLoc}

স্বাক্ষর: _____________________________ (${cName})`;

    // 6. MARATHI DRAFT
    const marathiDraft = 
`प्रति,
मा. पोलीस निरीक्षक / ठाणे अंमलदार साहेब,
पोलीस ठाणे: ${psName}

विषय: भारतीय नागरिक सुरक्षा संहिता (BNSS) २०२३ च्या कलम १७३ अन्वये एफ.आय.आर. (FIR) नोंदवणेबाबत लेखी तक्रार.

१. तक्रारदाराचा तपशील:
   • पूर्ण नाव: ${cName}${cParent ? ` (वडील/पती: ${cParent})` : ''}
   • पत्ता: ${cAddress}
   • मोबाईल: ${cPhone || 'ठाण्यात दिला जाईल'}

२. आरोपीचा तपशील:
   • नाव / वर्णन: ${aggressor}

३. घटना दिनांक व ठिकाण:
   • दिनांक: ${incidentDate}
   • घटनास्थळ: ${incidentLoc}

४. घटनेची हकीकत (तथ्ये):
   (अ) दिनांक ${incidentDate} रोजी ${incidentLoc} येथे आरोपीने माझ्यावर बेकायदेशीर कृत्य केले.
   (ब) ${summaryFacts}

५. लागू कायदेशीर कलमे:
${sectionsBlock}

६. कायदेशीर मागणी:
   (१) BNSS कलम १७३ नुसार तात्काळ FIR नोंदवावी;
   (२) प्रकरणाचा सखोल तपास करून आरोपींवर कायदेशीर कारवाई करावी;
   (३) कलम १७३(२) नुसार मला मोफत FIR प्रत द्यावी.

दिनांक: ${todayDate}
ठिकाण: ${incidentLoc}

स्वाक्षरी: _____________________________ (${cName})`;

    // 7. KANNADA DRAFT
    const kannadaDraft = 
`ಗೆ,
ಠಾಣಾಧಿಕಾರಿಗಳು,
ಪೊಲೀಸ್ ಠಾಣೆ: ${psName}

ವಿಷಯ: ಭಾರತೀಯ ನಾಗರಿಕ ಸುರಕ್ಷಾ ಸಂಹಿತೆ (BNSS) 2023 ರ ಕಲಂ 173 ರ ಅಡಿಯಲ್ಲಿ ಎಫ್.ಐ.ಆರ್ (FIR) ದಾಖಲಿಸುವಂತೆ ಲಿಖಿತ ದೂರು.

೧. ದೂರುದಾರರ ವಿವರ:
   • ಪೂರ್ಣ ಹೆಸರು: ${cName}${cParent ? ` (ತಂದೆ/ಗಂಡನ ಹೆಸರು: ${cParent})` : ''}
   • ವಿಳಾಸ: ${cAddress}
   • ದೂರವಾಣಿ: ${cPhone || 'ಠಾಣೆಯಲ್ಲಿ ಒದಗಿಸಲಾಗುವುದು'}

೨. ಆರೋಪಿಯ ವಿವರ:
   • ಹೆಸರು / ವಿವರ: ${aggressor}

೩. ಘಟನೆಯ ದಿನಾಂಕ ಮತ್ತು ಸ್ಥಳ:
   • ದಿನಾಂಕ: ${incidentDate}
   • ಸ್ಥಳ: ${incidentLoc}

೪. ಘಟನೆಯ ಸಾರಾಂಶ:
   (ಎ) ${incidentDate} ರಂದು ${incidentLoc} ಬಳಿ ಆರೋಪಿಗಳು ನನ್ನ ಮೇಲೆ ದೌರ್ಜನ್ಯವೆಸಗಿದ್ದಾರೆ.
   (ಬಿ) ${summaryFacts}

೫. ಅನ್ವಯವಾಗುವ ಕಾನೂನು ವಿಧಿಗಳು:
${sectionsBlock}

೬. ಕಾನೂನು ಕ್ರಮಕ್ಕಾಗಿ ಪ್ರಾರ್ಥನೆ:
   (೧) BNSS ಕಲಂ 173 ರ ಅಡಿಯಲ್ಲಿ ತಕ್ಷಣವೇ FIR ದಾಖಲಿಸಬೇಕು;
   (೨) ತನಿಖೆ ನಡೆಸಿ ಆರೋಪಿಗಳ ವಿರುದ್ಧ ಕಾನೂನು ಕ್ರಮ ಜರುಗಿಸಬೇಕು;
   (೩) ಕಲಂ 173(2) ರ ಪ್ರಕಾರ ನನಗೆ ಉಚಿತ FIR ಪ್ರತಿಯನ್ನು ನೀಡಬೇಕು.

ದಿನಾಂಕ: ${todayDate}
ಸ್ಥಳ: ${incidentLoc}

ಸಹಿ: _____________________________ (${cName})`;

    // 8. MALAYALAM DRAFT
    const malayalamDraft = 
`സ്വീകർത്താവ്,
സ്റ്റേഷൻ ഹൗസ് ഓഫീസർ,
പോലീസ് സ്റ്റേഷൻ: ${psName}

വിഷയം: ഭാരതീയ നാഗരിക് സുരക്ഷാ സംഹിത (BNSS) 2023 ലെ സെക്ഷൻ 173 പ്രകാരം എഫ്.ഐ.ആർ (FIR) രജിസ്റ്റർ ചെയ്യുന്നതിനുള്ള പരാതി.

1. പരാതിക്കാരന്റെ വിവരങ്ങൾ:
   • മുഴുവൻ പേര്: ${cName}${cParent ? ` (പിതാവ്/ഭർത്താവ്: ${cParent})` : ''}
   • വിലാസം: ${cAddress}
   • ഫോൺ: ${cPhone || 'സ്റ്റേഷനിൽ നൽകും'}

2. പ്രതിയുടെ വിവരങ്ങൾ:
   • പേര് / വിവരണം: ${aggressor}

3. സംഭവം നടന്ന തീയതിയും സ്ഥലവും:
   • തീയതി: ${incidentDate}
   • സ്ഥലം: ${incidentLoc}

4. സംഭവത്തിന്റെ വിവരണം:
   (എ) ${incidentDate} തീയതിയിൽ ${incidentLoc} വച്ച് പ്രതി എനിക്കെതിരെ അക്രമം നടത്തി.
   (ബി) ${summaryFacts}

5. ബാധകമായ നിയമ വകുപ്പുകൾ:
${sectionsBlock}

6. നിയമപരമായ ആവശ്യം:
   (1) BNSS സെക്ഷൻ 173 പ്രകാരം ഉടൻ FIR രജിസ്റ്റർ ചെയ്യുക;
   (2) കൃത്യമായ അന്വേഷണം നടത്തി പ്രതിക്കെതിരെ നടപടി സ്വീകരിക്കുക;
   (3) സെക്ഷൻ 173(2) പ്രകാരം FIR ന്റെ സൗജന്യ പകർപ്പ് നൽകുക.

തീയതി: ${todayDate}
സ്ഥലം: ${incidentLoc}

ഒപ്പ്: _____________________________ (${cName})`;

    let nativeOutput = englishDraft;
    if (lang === 'hi') nativeOutput = hindiDraft;
    else if (lang === 'te') nativeOutput = teluguDraft;
    else if (lang === 'ta') nativeOutput = tamilDraft;
    else if (lang === 'bn') nativeOutput = bengaliDraft;
    else if (lang === 'mr') nativeOutput = marathiDraft;
    else if (lang === 'kn') nativeOutput = kannadaDraft;
    else if (lang === 'ml') nativeOutput = malayalamDraft;

    return {
        english: englishDraft,
        native: nativeOutput,
        hindi: hindiDraft,
        language: lang
    };
}

export async function draftComplaint(complainantInfo, entities, retrieved, langLabel) {
    // Deterministic template drafting (prototype). LLM never invents section numbers;
    // sections come only from retrieval.js. LLM is used only for optional fact extraction.
    const selectedLanguage = normalizeLanguageCode(langLabel) || 'en';
    return buildProfessionalPoliceComplaint(complainantInfo, entities, retrieved, selectedLanguage);
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
