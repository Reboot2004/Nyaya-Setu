// Shared sanitizer — single source for llm.js + main.js sanitize logic.
// Coerces any LLM/rule value to a clean plain string, unwraps objects and
// stringified JSON blobs, strips stray quotes, and maps unknowns to 'unknown'.
export const ALLOWED_CATEGORIES = new Set(['assault', 'intimidation', 'property_fraud', 'women_safety', 'procedure']);

export function cleanStr(v, fallback = 'unknown') {
    let cur = v;
    let guard = 0;
    if (typeof cur === 'string') {
        const t = cur.trim();
        if ((t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'))) {
            try { cur = JSON.parse(t); } catch { /* not JSON — continue as string */ }
        }
    }
    while (cur !== null && typeof cur === 'object' && guard++ < 4) {
        if (Array.isArray(cur)) { cur = cur[0]; continue; }
        const keys = Object.keys(cur);
        if (!keys.length) { cur = fallback; break; }
        cur = cur.name ?? cur.description ?? cur.date ?? cur.place ?? cur.value ?? cur.text ?? cur[0] ?? fallback;
        if (typeof cur === 'string') {
            const t = cur.trim();
            if ((t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'))) {
                try { cur = JSON.parse(t); continue; } catch { /* keep string */ }
            }
        }
    }
    if (cur === null || cur === undefined) return fallback;
    let s = String(cur).trim();
    for (let i = 0; i < 3; i++) {
        const t = s.trim();
        if (/^[{[].*[}\]]$/.test(t) && !/\s/.test(t.slice(0, 20))) break;
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

export function isKnown(v) {
    const s = cleanStr(v, 'unknown');
    return s !== 'unknown';
}

export function normalizeCategory(v, fallback = 'needs_human_review') {
    const raw = cleanStr(v, '');
    if (!raw) return fallback;
    const parts = raw.toLowerCase().split(/[|/,;\s]+/).map((p) => p.trim()).filter(Boolean);
    for (const p of parts) {
        if (ALLOWED_CATEGORIES.has(p)) return p;
    }
    if (ALLOWED_CATEGORIES.has(raw.toLowerCase())) return raw.toLowerCase();
    return fallback;
}

// ---- Location guard (single source of truth for rules + NER + LLM validation) ----
// Generic possessives across EN + 7 Indic languages (roman + script).
// "my village sarpanch" / "मेरे गांव" / "నా స్కూల్" describe origin/ownership,
// NOT the incident place — so a place-noun preceded by one of these is rejected.
const POSSESSIVE_TOKENS = [
    'my', 'his', 'her', 'our', 'their', 'your',
    'mere', 'mera', 'meri', 'hamara', 'hamare', 'unka', 'unki', 'unke',
    'apne', 'apna', 'apni', 'tumhara', 'tumhare', 'aapka', 'aapke', 'uske', 'iske',
    'मेरे', 'मेरा', 'मेरी', 'हमारा', 'हमारे', 'उनका', 'उनके', 'उनकी',
    'अपने', 'अपना', 'अपनी', 'तुम्हारा', 'तुम्हारे', 'आपका', 'आपके', 'उसके', 'इसके', 'इस', 'उस',
    'నా', 'మా', 'తన', 'అతని', 'ఆమె', 'వారి', 'మీ',
    'என்', 'எனது', 'அவர்', 'அவரது', 'இந்த', 'அந்த', 'எங்கள்',
    'আমার', 'মোর', 'তোমার', 'তার', 'তাঁর', 'সে', 'ওই',
    'ನನ್ನ', 'ಅವರ', 'ನಮ್ಮ', 'ಅವನ', 'ಅವಳ',
    'എന്റെ', 'അവന്റെ', 'അവളുടെ', 'നമ്മുടെ',
    'माझे', 'माझ्या', 'त्यांचे', 'त्याच्या', 'आमचे'
];

const _possReCache = new Map();
function possessiveBeforeRe() {
    const key = 'v1';
    if (_possReCache.has(key)) return _possReCache.get(key);
    const esc = POSSESSIVE_TOKENS.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const re = new RegExp(`(?:^|[\\s,;:(])(${esc})$`, 'iu');
    _possReCache.set(key, re);
    return re;
}

// True when `locValue` occurs in `text` preceded by a possessive pronoun
// ("my village", "their house", "मेरे गांव", "నా స్కూల్"). Articles and
// prepositions ("the bus stop", "near the school") do NOT count — those stay valid.
export function hasPossessiveBefore(text, locValue) {
    if (!text || !locValue) return false;
    const hay = String(text);
    const needle = String(locValue).trim();
    if (!needle) return false;
    const idx = hay.toLowerCase().indexOf(needle.toLowerCase());
    if (idx < 0) return false;
    const before = hay.slice(0, idx).trimEnd();
    return possessiveBeforeRe().test(before);
}

// Convenience: location string is usable only when non-empty AND not possessive-generic.
export function isValidLocation(text, locValue) {
    const v = String(locValue || '').trim();
    if (v.length < 2) return false;
    if (/^(unknown|—|-|n\/a)$/i.test(v)) return false;
    return !hasPossessiveBefore(text, v);
}
