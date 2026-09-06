// Nyaya-Setu emergency triage (offline, rule-based, runnable everywhere).
// Blocking interstitial when narrative signals imminent danger. No LLM, no network.
const EMERGENCY_PATTERNS = [
    /kill (me|us|him|her|them|myself)/i,
    /murder/i, /rape/i, /burn (me|us|alive|house)/i,
    /attack.*now/i, /coming to kill/i, /jaan se maar/i, /जान से मार/,
    /suicide|self[-\s]?harm|आत्महत्या/i,
    /kidnap/i, /अपहरण/i, /అపహరించ/i,
    /acid/i, /stab/i, /चाकू.*मार/i,
];

export const EMERGENCY_CONTACTS = [
    { name: 'Emergency (police/fire/medical)', number: '112' },
    { name: 'Women helpline', number: '1090' },
    { name: 'Child helpline', number: '1098' },
    { name: 'NALSA free legal aid', number: '15100' },
];

export function detectEmergency(text) {
    const value = (text || '');
    for (const pat of EMERGENCY_PATTERNS) {
        if (pat.test(value)) return { emergency: true, matched: pat.source.slice(0, 40) };
    }
    return { emergency: false };
}
