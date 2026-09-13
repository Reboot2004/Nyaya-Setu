// Nyaya-Setu complaint gate — SINGLE source of truth for actionability.
// Imported by the app (src/main.js), the eval harness (tests/evaluate.js) and the
// field-study simulator (scripts/simulate_field_study.mjs) so all three can never
// drift apart. Rule: an offence keyword OR a medium/high statute match accepts;
// advice-questions without either are routed to legal aid, not drafted.
export function isActionableComplaint(text, entities, retrieved) {
    const value = (text || '').trim();
    if (!value) return false;
    // 15-char floor is substance-based, not absolute: dense Indic scripts carry a
    // complete grievance in ~11-13 chars ("കടയിൽ മോഷണം", "शाळेत चोरी"). Tiny
    // texts without BOTH an offence signal and a medium/high statute still fail.
    const tinyText = value.length < 15;

    const low = value.toLowerCase();
    const words = value.split(/\s+/).filter(Boolean);

    // Non-complaint closure: narrative explicitly says everything is fine / no issue.
    // This catches "Nobody hit me, everything is fine" while letting legitimate
    // complaints through ("मजदूरी नहीं दी" = wage theft IS the crime, not a negation).
    const NON_COMPLAINT_CLOSURE = [
        /\b(everything is fine|all is well|no problem|no issue|no complaint|nothing happened|i am fine|i'm fine|all good|no harm|no foul)\b/i,
        /सब\s+ठीक\s+है|कोई\s+शिकायत\s+नहीं|कोई\s+बात\s+नहीं|कुछ\s+नहीं\s+हुआ/,
        /అంతా\s+సరే|సమస్య\s+లేదు|ఏమీ\s+జరగలేదు|నాకు\s+ఫర్వాలేదు/,
        /எல்லாம்\s+சரி|பிரச்சனை\s+இல்லை|ஒன்றும்\s+நடக்கவில்லை/,
        /সব\s+�িক\s+আছে|কোনো\s+সমস্যা\s+নেই|কিছু\s+হয়নি/,
        /सगळं\s+ठीक\s+आहे|काही\s+त्रुटी\s+नाही|काहीच\s+झालं\s+नाही/,
        /ಎಲ್ಲಾ\s+ಸರಿ\s+ಇದೆ|ಯಾವುದೇ\s+ಸಮಸ್ಯೆ\s+ಇಲ್ಲ|ಏನೂ\s+ಆಗಿಲ್ಲ/,
        /എല്ലാം\s+ശരിയാണ്|ഒന്നും\s+സംഭവിച്ചിട്ടില്ല|പ്രശ്നമില്ല/,
    ];
    const isNonComplaint = NON_COMPLAINT_CLOSURE.some((p) => p.test(low));
    if (isNonComplaint) return false;

    // 3-word floor (not 4): genuine short complaints ("ಮೊಬೈಲ್ ಕಳ್ಳತನವಾಗಿದೆ",
    // "mara pitai hui" is still blocked by the 15-char floor) must pass;
    // junk is caught by length + junk-patterns + signal requirements below.
    // 2-word exception: in agglutinative/short-form grievances ("சந்தையில் திருட்டு",
    // "शाळेत चोरी") two words carry a complete complaint — accept when BOTH an
    // offence signal and a medium/high statute match back it. Junk 2-word texts
    // ("hello test") still fail for lack of either.
    if (words.length < 2) return false;
    const shortTwoWord = words.length < 3;

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

    if (shortTwoWord && !(hasIssueSignal && hasStrongStatute)) return false;
    if (tinyText && !(hasIssueSignal && hasStrongStatute)) return false;
    return hasIssueSignal || hasStrongStatute;
}
