// Nyaya-Setu emergency triage (offline, rule-based, runnable everywhere).
// Blocking interstitial when narrative signals imminent self-harm or live danger.
// Distinguishes: "they threatened to kill me" (crime report, proceed) vs
// "I want to kill myself" (self-harm, block + triage).
const EMERGENCY_PATTERNS = [
    // Self-harm / suicidal intent (first-person)
    /kill myself/i, /i (want to|will|shall|am going to) (kill myself|die|end my life)/i,
    /want to die/i, /don'?t want to live/i, /end (my |our )?(own )?life/i,
    /suicide/i, /self[-\s]?harm/i, /आत्महत्या/i,
    /jaan dene|jaan se maarne/i,
    // Imminent live danger (present-tense, happening now)
    /attack.*now/i, /coming to kill/i, /they are (here|coming)/i,
    /burn (us|me|house|alive)/i, /acid/i, /stab/i, /चाकू.*मार/i,
    /kidnap/i, /अपहरण/i, /అపహరించ/i,
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
