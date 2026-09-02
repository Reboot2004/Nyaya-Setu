// Nyaya-Setu Statutory Corpus & Dynamic Registry
// Comprehensive prototype corpus derived from official BNS/BNSS text with full Indic vernacular trigger coverage.
// Official references: https://www.indiacode.nic.in/

export const STATUTE_METADATA = {
    source: "PROTOTYPE CORPUS — Hand-curated subset from BNS/BNSS 2023 (NOT AUTHORITATIVE)",
    disclaimer: "This corpus is for demonstration only. Users MUST independently verify all sections against official India Code: https://www.indiacode.nic.in/",
    lexicon: "Indic Multilingual keyword & vernacular triggers (Hindi, Telugu, Tamil, Bengali, Marathi, Kannada, Malayalam, English)",
    jurisdiction: "Republic of India",
    version: "prototype-0.4-indic",
    lastUpdated: "2026-09-02",
    officialMirrors: [
        "https://www.indiacode.nic.in/ (AUTHORITATIVE: BNS, BNSS, BSA 2023)"
    ]
};

export const BASE_STATUTES = [
    {
        id: 'BNS-115',
        code: 'BNS',
        section: '115',
        title: 'Voluntarily causing hurt (स्वेच्छा से उपहति कारित करना)',
        text: 'Whoever does any act with the intention of thereby causing hurt to any person, or with the knowledge that he is likely thereby to cause hurt to any person, and thereby causes hurt to any person, is guilty of voluntarily causing hurt.',
        punishment: 'Imprisonment up to 1 year, or fine up to ₹10,000, or both.',
        triggers: [
            'mar-peet', 'marpeet', 'beating', 'hit me', 'beaten', 'physical assault', 'maara', 'peeta', 'thaya', 'adi vangi', 'haathapai', 'slapped', 'laathi', 'maar',
            'मारपीट', 'पीटा', 'मारा', 'लाठी', 'डंडों', 'हाथापाई', 'चोट', 'चोट पहुंचाई', 'उपहति', 'దాడి', 'కొట్టారు', 'హల్లె', 'அடித்தார்கள்', 'মারধর'
        ],
        category: 'assault',
        source: 'AIKosh Gazette BNS 2023 Ch.VI'
    },
    {
        id: 'BNS-117',
        code: 'BNS',
        section: '117',
        title: 'Voluntarily causing grievous hurt (स्वेच्छा से घोर उपहति कारित करना)',
        text: 'Voluntarily causing grievous hurt — hurt which endangers life or causes severe bodily suffering or permanent disfigurement or fracture of bones.',
        punishment: 'Imprisonment up to 7 years and fine.',
        triggers: [
            'serious injury', 'broken bones', 'fracture', 'blood', 'hospital', 'severe beating', 'gambhir chot', 'khoon', 'haddi todi', 'admitted in hospital', 'raktham',
            'गंभीर चोट', 'खून', 'हड्डी तोड़ी', 'अस्पताल', 'घोर उपहति', 'రక్తం', 'తీవ్ర గాయం', 'রক্ত'
        ],
        category: 'assault',
        source: 'AIKosh Gazette BNS 2023 Ch.VI'
    },
    {
        id: 'BNS-126',
        code: 'BNS',
        section: '126',
        title: 'Wrongful restraint (सदोष अवरोध)',
        text: 'Whoever voluntarily obstructs any person so as to prevent that person from proceeding in any direction in which that person has a right to proceed, is said wrongfully to restrain that person.',
        punishment: 'Simple imprisonment up to 1 month, or fine up to ₹5,000, or both.',
        triggers: [
            'blocked path', 'stopped me', 'path blocked', 'raste me roka', 'roka', 'restrained', 'prevented from going', 'gadi roki',
            'रास्ता रोका', 'जाने से रोका', 'अवरोध', 'దారి అడ్డగించారు', 'আটকানো'
        ],
        category: 'assault',
        source: 'AIKosh Gazette BNS 2023 Ch.VI'
    },
    {
        id: 'BNS-351',
        code: 'BNS',
        section: '351',
        title: 'Criminal intimidation (आपराधिक अभित्रास)',
        text: 'Whoever threatens another with injury to his person, reputation or property, or to the person or reputation of anyone in whom that person is interested, with intent to cause alarm to that person, commits criminal intimidation.',
        punishment: 'Imprisonment up to 2 years, or fine, or both; up to 7 years if threat is to cause death or grievous hurt.',
        triggers: [
            'dhamki', 'dhamakee', 'threat', 'threatened', 'warned me', 'intimidation', 'dhmki de', 'bhaga diya', 'jaan se marne ki dhamki', 'scared me', 'bedirimpulu', 'mirattal',
            'धमकी', 'जान से मारने की धमकी', 'धमकाया', 'अभित्रास', 'బెదిరింపు', 'చంపేస్తామని బెదిరించారు', 'হুমকি'
        ],
        category: 'intimidation',
        source: 'AIKosh Gazette BNS 2023 Ch.XIX'
    },
    {
        id: 'BNS-352',
        code: 'BNS',
        section: '352',
        title: 'Intentional insult with intent to provoke breach of peace (लोक शांति भंग करने के आशय से साशय अपमान)',
        text: 'Whoever intentionally insults, and thereby gives provocation to any person, intending or knowing it to be likely that such provocation will cause him to break the public peace or commit any other offence.',
        punishment: 'Imprisonment up to 2 years, or fine, or both.',
        triggers: [
            'gali-galoch', 'gali', 'abuse', 'verbal abuse', 'insult', 'gaali di', 'gaalu', 'chothali', 'apmaan', 'beizzat', 'bad words', 'boothulu',
            'गाली', 'गाली-गलौज', 'अपमान', 'अभद्र व्यवहार', 'बूతులు', 'গালাগালি'
        ],
        category: 'intimidation',
        source: 'AIKosh Gazette BNS 2023 Ch.XIX'
    },
    {
        id: 'BNS-303',
        code: 'BNS',
        section: '303',
        title: 'Theft (चोरी)',
        text: 'Whoever commits theft shall be punished with imprisonment of either description for a term which may extend to three years, or with fine, or with both.',
        punishment: 'Imprisonment up to 3 years, or fine, or both.',
        triggers: [
            'theft', 'stolen', 'chori', 'chura liya', 'stole my', 'pickpocket', 'cheen liya', 'gayab kar diya', 'pocket mara', 'dongathanam', 'thiruttu',
            'चोरी', 'चुरा लिया', 'छीन लिया', 'జేబు దొంగతనం', 'চুরি'
        ],
        category: 'property',
        source: 'AIKosh Gazette BNS 2023 Ch.XVII'
    },
    {
        id: 'BNS-308',
        code: 'BNS',
        section: '308',
        title: 'Extortion (उद्दापन / जबरन वसूली)',
        text: 'Whoever intentionally puts any person in fear of any injury, or to any person in whom that person is interested, and thereby dishonestly induces the person so put in fear to deliver to any person any property or valuable security.',
        punishment: 'Imprisonment up to 7 years and fine.',
        triggers: [
            'extortion', 'hafta', 'rangdari', 'forced money', 'blackmail money', 'jabran paisa', 'protection money', 'gunda tax', 'mamool', 'tolabaji',
            'जबरन वसूली', 'हफ्ता', 'रंगदारी', 'उद्दापन', 'దౌర్జన్య వసూలు'
        ],
        category: 'property',
        source: 'AIKosh Gazette BNS 2023 Ch.XVII'
    },
    {
        id: 'BNS-316',
        code: 'BNS',
        section: '316',
        title: 'Criminal breach of trust (आपराधिक न्यासभंग)',
        text: 'Whoever, being in any manner entrusted with property, or with any dominion over property, dishonestly misappropriates or converts to his own use that property, commits criminal breach of trust.',
        punishment: 'Imprisonment up to 5 years, or fine, or both.',
        triggers: [
            'breach of trust', 'misappropriation', 'amanat me khayanat', 'paisa gaban', 'refused to return money', 'swindled deposit', 'haddap liya', 'nammaka droham',
            'अमानत में खयानत', 'गबन', 'हड़प लिया', 'నమ్మక ద్రోహం'
        ],
        category: 'fraud',
        source: 'AIKosh Gazette BNS 2023 Ch.XVII'
    },
    {
        id: 'BNS-318',
        code: 'BNS',
        section: '318',
        title: 'Cheating (छल / धोखाधड़ी)',
        text: 'Whoever cheats shall be punished with imprisonment of either description for a term which may extend to three years, or with fine, or with both.',
        punishment: 'Imprisonment up to 3 years, or fine, or both (up to 7 years in aggravated fraud).',
        triggers: [
            'fraud', 'cheat', 'cheated', 'thagi', 'dhokha', 'paisa le gaya', 'scam', 'online fraud', 'fake', 'farziwada', 'jhansa diya', 'mosam', 'emattru',
            'धोखा', 'धोखाधड़ी', 'ठगी', 'फर्जीवाड़ा', 'మోసం', 'প্রতারণা'
        ],
        category: 'fraud',
        source: 'AIKosh Gazette BNS 2023 Ch.XVII'
    },
    {
        id: 'BNS-329',
        code: 'BNS',
        section: '329',
        title: 'Criminal trespass and House-trespass (आपराधिक अतिचार एवं गृह-अतिचार)',
        text: 'Whoever enters into or upon property in the possession of another with intent to commit an offence or to intimidate, insult or annoy any person in possession of such property.',
        punishment: 'Imprisonment up to 3 months, or fine up to ₹5,000, or both (up to 1 year for house-trespass).',
        triggers: [
            'kabza', 'land grabbing', 'illegal entry', 'trespass', 'khet me ghusa', 'ghar me ghusa', 'boundary broken', 'illegal occupation', 'bhoo aakramana',
            'अवैध कब्जा', 'जमीन कब्जा', 'अनाधिकृत प्रवेश', 'घर में घुसा', 'అక్రమ ప్రవేశం'
        ],
        category: 'property',
        source: 'AIKosh Gazette BNS 2023 Ch.XVII'
    },
    {
        id: 'BNS-336',
        code: 'BNS',
        section: '336',
        title: 'Forgery (कूटकरण / जालसाजी)',
        text: 'Whoever makes any false documents or false electronic record with intent to cause damage or injury to the public or to any person, or to support any claim or title, commits forgery.',
        punishment: 'Imprisonment up to 2 years, or fine, or both (up to life in aggravated cases).',
        triggers: [
            'forged', 'fake signature', 'fake document', 'jhooti likhit', 'forgery', 'stamp paper fake', 'nakli hastakshar', 'jali dastavez', 'nakili pathralu',
            'जालसाजी', 'नकली हस्ताक्षर', 'फर्जी दस्तावेज', 'कूटकरण', 'నకిలీ పత్రాలు'
        ],
        category: 'fraud',
        source: 'AIKosh Gazette BNS 2023 Ch.XVIII'
    },
    {
        id: 'BNS-64',
        code: 'BNS',
        section: '64',
        title: 'Punishment for rape (बलात्कार के लिए दंड)',
        text: 'Whoever commits rape shall be punished with rigorous imprisonment not less than ten years, which may extend to imprisonment for life.',
        punishment: 'Rigorous imprisonment 10 years to life, and fine.',
        triggers: ['rape', 'balatkar', 'sexual assault', 'dushti vyavhar', 'बलात्कार', 'यौन उत्पीड़न', 'లైంగిక దాడి'],
        category: 'women_safety',
        source: 'AIKosh Gazette BNS 2023 Ch.V'
    },
    {
        id: 'BNS-74',
        code: 'BNS',
        section: '74',
        title: 'Assault or criminal force to woman with intent to outrage modesty (महिला की लज्जा भंग करने के आशय से हमला)',
        text: 'Whoever assaults or uses criminal force to any woman, intending to outrage or knowing it to be likely that he will thereby outrage her modesty.',
        punishment: 'Imprisonment 1 to 5 years and fine.',
        triggers: ['eve teasing', 'chhed-chhad', 'outrage modesty', 'touching inappropriately', 'badtameezi', 'chhedkhani', 'stalking', 'galat tarike se chhua', 'vedhimpulu', 'छेड़छाड़', 'लज्जा भंग', 'వేధింపులు'],
        category: 'women_safety',
        source: 'AIKosh Gazette BNS 2023 Ch.V'
    },
    {
        id: 'BNS-85',
        code: 'BNS',
        section: '85',
        title: 'Cruelty by husband or relatives of husband (पति या उसके नातेदारों द्वारा क्रूरता)',
        text: 'Whoever, being the husband or the relative of the husband of a woman, subjects her to cruelty shall be punished.',
        punishment: 'Imprisonment up to 3 years and fine.',
        triggers: ['dowry', 'dahej', 'husband torture', 'sasural', 'cruelty husband', 'in-laws harassment', 'pati peetan', 'dahej utpeedan', 'domestic violence', 'varakatnam', 'दहेज', 'दहेज प्रताड़ना', 'ससुराल वालों द्वारा उत्पीड़न', 'గృహ హింస', 'వరకట్నం'],
        category: 'women_safety',
        source: 'AIKosh Gazette BNS 2023 Ch.V'
    },
    {
        id: 'BNSS-173',
        code: 'BNSS',
        section: '173',
        title: 'Information in cognizable cases (Duty to register complaint) (संज्ञेय मामलों में सूचना)',
        text: 'Every information relating to the commission of a cognizable offence shall be registered, irrespective of the area where the offence is committed (Zero FIR). The officer shall give a copy of the information free of cost to the informant.',
        punishment: 'Mandatory statutory duty for police officer.',
        triggers: ['fir', 'zero fir', 'police station', 'complaint registration', 'report crime', 'thana', 'station', 'police', 'एफआईआर', 'थाना', 'शिकायत दर्ज'],
        category: 'procedure',
        source: 'AIKosh Gazette BNSS 2023 Ch.XII'
    }
];

const LOCAL_STORAGE_KEY = 'nyaya_setu_dynamic_statutes';

export function getLoadedStatutes() {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed;
                }
            }
        }
    } catch (e) {
        console.warn('Could not read cached dynamic statutes:', e);
    }
    return BASE_STATUTES;
}

export function saveDynamicStatutes(statutesList) {
    if (!Array.isArray(statutesList)) return false;
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(statutesList));
        return true;
    } catch (e) {
        console.error('Failed to cache statutes:', e);
        return false;
    }
}

export function resetToDefaultStatutes() {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.removeItem(LOCAL_STORAGE_KEY);
        }
    } catch (e) {
        console.error('Failed to reset statutes cache:', e);
    }
    return BASE_STATUTES;
}
