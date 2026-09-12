// Nyaya-Setu complaint gate — SINGLE source of truth for actionability.
// Imported by the app (src/main.js), the eval harness (tests/evaluate.js) and the
// field-study simulator (scripts/simulate_field_study.mjs) so all three can never
// drift apart. Rule: an offence keyword OR a medium/high statute match accepts;
// advice-questions without either are routed to legal aid, not drafted.
export function isActionableComplaint(text, entities, retrieved) {
    const value = (text || '').trim();
    if (!value || value.length < 15) return false;

    const low = value.toLowerCase();
    const words = value.split(/\s+/).filter(Boolean);
    // 3-word floor (not 4): genuine short complaints ("ಮೊಬೈಲ್ ಕಳ್ಳತನವಾಗಿದೆ",
    // "mara pitai hui" is still blocked by the 15-char floor) must pass;
    // junk is caught by length + junk-patterns + signal requirements below.
    if (words.length < 3) return false;

    const junkPatterns = [
        /\bi am doing good\b/,
        /\bhow are you\b/,
        /\bgood morning\b/,
        /\bjust testing\b/,
        /\brandom\b/,
        /\bhello\b.*\bthank you\b/
    ];
    if (junkPatterns.some((p) => p.test(low))) return false;

    const issueKeywords = [
        // English
        'threat', 'threatened', 'assault', 'hit', 'abuse', 'harass', 'fraud', 'cheat', 'stole', 'extortion', 'wage', 'salary', 'payment',
        'beating', 'money', 'property', 'land', 'kabza', 'struck', 'drugged', 'poison', 'kidnap', 'ransom', 'abduct', 'stalking', 'bribe', 'dowry', 'rape', 'murder', 'robbery', 'theft', 'snatch', 'attack', 'injured', 'injury', 'wound', 'bleeding', 'knife', 'weapon', 'fire', 'burn', 'kill', 'murder', 'rob', 'steal', 'forge', 'forgery', 'blackmail', 'extort', 'molest', 'stalk', 'follow', 'touch', 'force', 'drag', 'push', 'kick', 'punch', 'slap', 'beat',
        // Hindi (Devanagari + Roman)
        'dhamki', 'maar', 'marpit', 'gaali', 'paisa', 'rok liya', 'dhokha', 'बेधड़क', 'धमकी', 'मारपीट', 'गाली', 'वेतन', 'पैसे', 'हमला',
        'मजदूरी', 'तनख्वाह', 'जान से मार', 'rishwat', 'ghoos', 'marhan', 'chori', 'chhed', 'मारहाण', 'छेड', 'घुसून', 'पीक', 'शेतात',
        'चोरी', 'लूट', 'अपहरण', 'बलात्कार', 'हत्या', 'आग', 'जला', 'कुठ', 'खून', 'वसूली', 'ब्लैकमेल', 'जबरन', 'जबरदस्ती',
        // Telugu
        'దాడి', 'బెదిరింపు', 'డబ్బు', 'హింస', 'కొట్ట', 'బెదిరి', 'దొంగ', 'మోసం', 'మర్ద', 'చోరీ', 'లూటీ', 'అపహరణ', 'బలాత్కారం', 'హత్య', 'మంట', 'కత్తి', 'రక్తం', 'గాయం', 'గుర్తింపు',
        // Tamil
        'சம்பளம்', 'ஈவ்டீசிங்', 'பின்தொடர்', 'அடி', 'ரத்தம்', 'மிரட்டல்', 'திருட்டு', 'மோசடி', 'கொலை', 'கொள்ளை', 'பாலியல்', 'வன்கொடுமை', 'காயம்', 'கத்தி', 'ரத்தம்',
        // Bengali
        'হুমকি', 'মারধর', 'চুরি', 'ছেড়', 'ডাকাতি', 'অপহরণ', 'ধর্ষণ', 'হত্যা', 'আগুন', 'ছুরি', 'রক্ত', 'আঘাত', 'ক্ষতি',
        // Kannada
        'ಬೆದರಿಕೆ', 'ಹಲ್ಲೆ', 'ಹೊಡೆ', 'ರಕ್ತ', 'ಕಳ್ಳತನ', 'ವಂಚನೆ', 'ಕದ್ದ', 'ಕೊಲೆ', 'ಲೂಟಿ', 'ಅಪಹರಣ', 'ಬಲಾತ್ಕಾರ', 'ಗಾಯ', 'ಚಾಕು',
        // Malayalam
        'ഭീഷണി', 'മർദ്ദനം', 'തല്ല', 'മോഷ', 'വഞ്ച', 'കൊല', 'കൊള്ള', 'ബലാത്കാരം', 'ആക്രമണം', 'രക്തം', 'മുറിവ്', 'കത്തി',
        // Marathi
        'मारहाण', 'घुसून', 'पीक', 'शेतात', 'धमकी', 'मारपीट', 'चोरी', 'लूट', 'अपहरण', 'बलात्कार', 'हत्या', 'आग', 'गैरव्यवहार'
    ];
    const hasIssueSignal = issueKeywords.some((k) => low.includes(k.toLowerCase()));
    // Statute signal counts only medium/high — low-confidence hints must not auto-accept.
    // (Entity signal is always present since events=[narrative], so it must not suffice alone.)
    const hasStrongStatute = Array.isArray(retrieved) && retrieved.some((r) => r.confidence === 'high' || r.confidence === 'medium');
    // Advice-seeking questions ("should I report?") are not complaints until an
    // offence signal or solid statute match exists — route to legal aid instead.
    const isQuestion = /\?\s*$/.test(value) || /^(क्या|kya |should i\b|do i need\b|can i\b)/i.test(low);
    if (isQuestion && !hasStrongStatute && !hasIssueSignal) return false;

    return hasIssueSignal || hasStrongStatute;
}
