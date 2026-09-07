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
