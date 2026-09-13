// Nyaya-Setu input safety screen (prototype, rule-based).
// NOT a replacement for Llama Guard 3. Provides transparent pre-checks and
// a hook for a future on-device Guard model. Always fails closed with reasons.
const INJECTION_PATTERNS = [
    /ignore (all )?previous instructions/i,
    /system prompt/i,
    /jailbreak/i,
    /dan mode/i,
    /pretend you are/i,
    /disregard (the )?(safety|rules|instructions)/i,
    /output (the )?section numbers? (only|without)/i,
];
const DISALLOWED_PATTERNS = [
    /how to (make|build).*(bomb|weapon|explosive)/i,
    /kill myself/i,
    /i (want to|will|shall) (kill myself|die|end my life)/i,
    /suicide/i,
    // Indic language self-harm patterns
    /आत्महत्या/i,
    /खुदकुशी/i,
    /आपने आप को मार/i,
    /ఆత్మहత్య/i,
    /తనను తాను చంపుకుంటా/i,
    /தற்கொலை/i,
    /আত্মহত্যা/i,
    /आत्मघाती/i,
    /ਆਤਮਹੱਤਿਆ/i,
    /आपल्याला मार/i,
    /ಆತ್ಮಹತ್ಯೆ/i,
    /ആത്മഹത്യ/i,
];
const MAX_LEN = 2000;

export function screenInput(text) {
    const value = (text || '').trim();
    const reasons = [];
    if (!value) reasons.push('empty-input');
    if (value.length > MAX_LEN) reasons.push(`too-long:${value.length}>${MAX_LEN}`);
    for (const pat of INJECTION_PATTERNS) {
        if (pat.test(value)) { reasons.push(`prompt-injection:${pat.source.slice(0, 32)}`); break; }
    }
    for (const pat of DISALLOWED_PATTERNS) {
        if (pat.test(value)) { reasons.push(`disallowed-content`); break; }
    }
    // PII nudge (not a block): Aadhaar-like 12-digit runs
    const piiHint = /\b\d{4}\s?\d{4}\s?\d{4}\b/.test(value);
    return {
        ok: reasons.length === 0,
        reasons,
        piiHint,
        sanitized: value.slice(0, MAX_LEN),
        guard: 'rule-based-prototype (Llama Guard 3 not bundled; hook: window.__nyayaGuard)'
    };
}

// Future hook: if an on-device Guard is loaded, delegate to it.
export async function guardWithModel(text) {
    if (typeof window !== 'undefined' && typeof window.__nyayaGuard === 'function') {
        try { return await window.__nyayaGuard(text); } catch { /* fall through */ }
    }
    return screenInput(text);
}
