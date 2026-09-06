// Nyaya-Setu citizen categories — plain-language buckets over BNS/BNSS/BSA.
// Lawyer chapters ("Of Offences Against...") mean nothing to rural citizens, so every
// statute maps to exactly one of 10 buckets with short names in all 8 UI languages
// and one-line explanations (en/hi/te + en fallback). Mapping is by code + section
// number, so it covers all 892 slots including placeholders — no statute is unmapped.
export const CITIZEN_CATEGORIES = [
    {
        id: 'hurt_attack',
        name: { en: 'Hurt & Attack', hi: 'मारपीट और हमला', te: 'దాడి మరియు గాయం', ta: 'தாக்குதல் மற்றும் காயம்', bn: 'মারধর ও হামলা', mr: 'मारहाण व हल्ला', kn: 'ಹಲ್ಲೆ ಮತ್ತು ಗಾಯ', ml: 'മർദ്ദനവും ആക്രമണവും' },
        desc: {
            en: 'Beating, hitting, hurt, weapons, murder — when someone harms the body.',
            hi: 'मारपीट, चोट, हथियार, हत्या — जब शरीर को नुकसान पहुँचे।',
            te: 'కొట్టడం, గాయపరచడం, ఆయుధాలు — శరీరానికి హాని జరిగినప్పుడు.'
        }
    },
    {
        id: 'threats_insults',
        name: { en: 'Threats & Insults', hi: 'धमकी और गाली', te: 'బెదిరింపులు మరియు తిట్లు', ta: 'மிரட்டல் மற்றும் திட்டு', bn: 'হুমকি ও গালাগালি', mr: 'धमकी व शिवीगाळ', kn: 'ಬೆದರಿಕೆ ಮತ್ತು ಬೈಗುಳ', ml: 'ഭീഷണിയും ചീത്തവിളിയും' },
        desc: {
            en: 'Death threats, intimidation, verbal abuse, insults, defamation.',
            hi: 'जान से मारने की धमकी, डराना, गाली-गलौज, बदनामी।',
            te: 'చంపేస్తామని బెదిరించడం, బూతులు, పరువు నష్టం.'
        }
    },
    {
        id: 'theft_property',
        name: { en: 'Theft & Robbery', hi: 'चोरी और लूट', te: 'దొంగతనం మరియు దోపిడీ', ta: 'திருட்டு மற்றும் கொள்ளை', bn: 'চুরি ও ডাকাতি', mr: 'चोरी व दरोडा', kn: 'ಕಳ್ಳತನ ಮತ್ತು ದರೋಡೆ', ml: 'മോഷണവും കൊള്ളയും' },
        desc: {
            en: 'Theft, snatching, robbery, dacoity, extortion (hafta/rangdari).',
            hi: 'चोरी, झपटमारी, लूट, डकैती, हफ्ता-रंगदारी।',
            te: 'దొంగతనం, లాక్కోవడం, దోపిడీ, హఫ్తా వసూళ్లు.'
        }
    },
    {
        id: 'fraud_docs',
        name: { en: 'Fraud & Fake Papers', hi: 'धोखाधड़ी और जाली कागज', te: 'మోసం మరియు నకిలీ పత్రాలు', ta: 'மோசடி மற்றும் போலி ஆவணங்கள்', bn: 'প্রতারণা ও জাল নথি', mr: 'फसवणूक व बनावट कागद', kn: 'ವಂಚನೆ ಮತ್ತು ನಕಲಿ ದಾಖಲೆ', ml: 'തട്ടിപ്പും വ്യാജരേഖകളും' },
        desc: {
            en: 'Cheating, breach of trust, unpaid wages kept back, forged documents and signatures.',
            hi: 'धोखा, अमानत में खयानत, रोकी गई मजदूरी, जाली दस्तावेज़ व हस्ताक्षर।',
            te: 'మోసం, నమ్మకద్రోహం, ఆపిన జీతం, నకిలీ పత్రాలు.'
        }
    },
    {
        id: 'women_family',
        name: { en: 'Women & Family Safety', hi: 'महिला एवं परिवार सुरक्षा', te: 'మహిళలు మరియు కుటుంబ భద్రత', ta: 'பெண்கள் மற்றும் குடும்ப பாதுகாப்பு', bn: 'নারী ও পরিবারের নিরাপত্তা', mr: 'महिला व कुटुंब सुरक्षा', kn: 'ಮಹಿಳಾ ಮತ್ತು ಕುಟುಂಬ ಸುರಕ್ಷತೆ', ml: 'സ്ത്രീകളുടെയും കുടുംബത്തിന്റെയും സുരക്ഷ' },
        desc: {
            en: 'Harassment, stalking, modesty, dowry cruelty, offences against children.',
            hi: 'छेड़छाड़, पीछा करना, दहेज उत्पीड़न, बच्चों के विरुद्ध अपराध।',
            te: 'వేధింపులు, వెంటపడటం, వరకట్న వేధింపులు.'
        }
    },
    {
        id: 'land_home',
        name: { en: 'Land & House', hi: 'जमीन और घर', te: 'భూమి మరియు ఇల్లు', ta: 'நிலம் மற்றும் வீடு', bn: 'জমি ও বাড়ি', mr: 'जमीन व घर', kn: 'ಜಮೀನು ಮತ್ತು ಮನೆ', ml: 'ഭൂമിയും വീടും' },
        desc: {
            en: 'Land grabbing (kabza), trespass, house intrusion, boundary breaking.',
            hi: 'जमीन कब्जा, अवैध प्रवेश, घर में घुसना।',
            te: 'భూ ఆక్రమణ, అక్రమ ప్రవేశం.'
        }
    },
    {
        id: 'public_safety',
        name: { en: 'Public Safety & Order', hi: 'सार्वजनिक सुरक्षा', te: 'ప్రజా భద్రత', ta: 'பொது பாதுகாப்பு', bn: 'জননিরাপত্তা', mr: 'सार्वजनिक सुरक्षा', kn: 'ಸಾರ್ವಜನಿಕ ಸುರಕ್ಷತೆ', ml: 'പൊതു സുരക്ഷ' },
        desc: {
            en: 'Riots, unlawful assembly, rash driving, public nuisance, religious harmony.',
            hi: 'दंगा, भीड़ हिंसा, लापरवाह ड्राइविंग, सार्वजनिक उपद्रव।',
            te: 'అల్లర్లు, నిర్లక్ష్య డ్రైవింగ్, ప్రజా అలజడి.'
        }
    },
    {
        id: 'corruption_power',
        name: { en: 'Bribes & Officials', hi: 'रिश्वत और अधिकारी', te: 'లంచాలు మరియు అధికారులు', ta: 'லஞ்சம் மற்றும் அதிகாரிகள்', bn: 'ঘুষ ও কর্মকর্তা', mr: 'लाच व अधिकारी', kn: 'ಲಂಚ ಮತ್ತು ಅಧಿಕಾರಿಗಳು', ml: 'കൈക്കൂലിയും ഉദ്യോഗസ്ഥരും' },
        desc: {
            en: 'Bribes, corruption, disobeying or obstructing lawful authority.',
            hi: 'रिश्वत, भ्रष्टाचार, कानूनी आदेश की अवज्ञा।',
            te: 'లంచాలు, అవినీతి.'
        }
    },
    {
        id: 'procedure_courts',
        name: { en: 'Police, FIR & Courts', hi: 'पुलिस, FIR और अदालत', te: 'పోలీసులు, FIR మరియు కోర్టులు', ta: 'காவல், FIR மற்றும் நீதிமன்றம்', bn: 'পুলিশ, FIR ও আদালত', mr: 'पोलीस, FIR व न्यायालय', kn: 'ಪೊಲೀಸ್, FIR ಮತ್ತು ಕೋರ್ಟ್', ml: 'പോലീസ്, FIR, കോടതികൾ' },
        desc: {
            en: 'How to file (incl. Zero FIR), arrest, investigation, bail, trials, false evidence.',
            hi: 'शिकायत कैसे दर्ज करें (Zero FIR सहित), गिरफ्तारी, जांच, जमानत।',
            te: 'ఫిర్యాదు ఎలా చేయాలి (Zero FIR తో సహా), అరెస్టు, బెయిల్.'
        }
    },
    {
        id: 'evidence',
        name: { en: 'Proof & Evidence', hi: 'सबूत और गवाही', te: 'సాక్ష్యం మరియు రుజువులు', ta: 'சாட்சி மற்றும் ஆதாரம்', bn: 'প্রমাণ ও সাক্ষ্য', mr: 'पुरावा व साक्ष', kn: 'ಸಾಕ್ಷ್ಯ ಮತ್ತು ಪುರಾವೆ', ml: 'തെളിവുകളും സാക്ഷ്യവും' },
        desc: {
            en: 'What counts as proof: CCTV/video, confessions, dying declarations.',
            hi: 'सबूत क्या होता है: CCTV/वीडियो, इकबालिया बयान।',
            te: 'రుజువులు: CCTV/వీడియో, ఒప్పుకోలు ప్రకటనలు.'
        }
    },
    {
        id: 'other_law',
        name: { en: 'How the Law Works', hi: 'कानून कैसे काम करता है', te: 'చట్టం ఎలా పనిచేస్తుంది', ta: 'சட்டம் எப்படி செயல்படும்', bn: 'আইন কীভাবে কাজ করে', mr: 'कायदा कसा चालतो', kn: 'ಕಾನೂನು ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ', ml: 'നിയമം എങ്ങനെ പ്രവർത്തിക്കുന്നു' },
        desc: {
            en: 'Basics: punishments, exceptions, conspiracy, offences against the nation.',
            hi: 'बुनियाद: सजाएँ, अपवाद, साजिश।',
            te: 'ప్రాథమిక అంశాలు: శిక్షలు, మినహాయింపులు.'
        }
    }
];

const BY_ID = new Map(CITIZEN_CATEGORIES.map((c) => [c.id, c]));

// Exactly one bucket per statute (BNS section number, BNSS/BSA by code).
export function citizenCategoryId(s) {
    if (!s) return 'other_law';
    if (s.code === 'BNSS') return 'procedure_courts';
    if (s.code === 'BSA') return 'evidence';
    const n = Number(s.section);
    if (Number.isFinite(n)) {
        if (n >= 63 && n <= 99) return 'women_family';
        if (n >= 100 && n <= 146) return 'hurt_attack';
        if (n >= 351 && n <= 358) return 'threats_insults';
        if (n >= 335 && n <= 350) return 'fraud_docs';
        if (n === 316 || n === 318 || n === 319) return 'fraud_docs';
        if (n >= 329 && n <= 334) return 'land_home';
        if (n >= 303 && n <= 334) return 'theft_property';
        if ((n >= 189 && n <= 197) || (n >= 270 && n <= 302)) return 'public_safety';
        if (n >= 198 && n <= 226) return 'corruption_power';
        if (n >= 227 && n <= 269) return 'procedure_courts';
    }
    // fallback for oddballs: use the internal category tag
    const c = String(s.category || '');
    if (c === 'women_safety') return 'women_family';
    if (c === 'assault') return 'hurt_attack';
    if (c === 'intimidation') return 'threats_insults';
    if (c === 'fraud') return 'fraud_docs';
    if (c === 'property') return 'theft_property';
    if (c === 'bribery' || c === 'public_authority') return 'corruption_power';
    if (c === 'procedure' || c === 'justice') return 'procedure_courts';
    if (c === 'public_order' || c === 'public_safety' || c === 'religion') return 'public_safety';
    return 'other_law';
}

export function citizenCategoryFor(statute, lang = 'en') {
    const id = citizenCategoryId(statute);
    const c = BY_ID.get(id) || BY_ID.get('other_law');
    const l = (lang || 'en').toLowerCase();
    return {
        id,
        label: (c.name[l] || c.name.en),
        desc: (c.desc[l] || c.desc.en)
    };
}
