// Nyaya-Setu Statutory Corpus
// This app helps ordinary citizens know their rights and sections that may apply to their situation.
// It is NOT legal advice. Always speak to a lawyer or approach a legal aid centre.
// Primary source: https://www.indiacode.nic.in/  (Official)
// Vernacular source: https://www.aikosh.in/ (AIKosh)

export const STATUTE_METADATA = {
    disclaimer: 'Prototype corpus. Verify all sections at https://www.indiacode.nic.in/',
    jurisdiction: 'Republic of India (BNS/BNSS effective 1 July 2024)',
    version: 'prototype-0.5-indic',
    lastUpdated: '2026-09-02',
    officialSources: [
        'https://www.indiacode.nic.in/',
        'https://www.aikosh.in/',
        'https://legislative.gov.in/'
    ]
};

// Localized section titles — used in complaint drafts so everything stays in selected language
export const STATUTE_TITLE_MAP = {
    'BNS-103':       { en: 'Murder', hi: 'हत्या', te: 'హత్య', ta: 'கொலை', bn: 'খুন', mr: 'हत्या', kn: 'ಕೊಲೆ', ml: 'കൊലപാതകം' },
    'BNS-109':       { en: 'Hurt by dangerous weapon', hi: 'खतरनाक हथियार से चोट', te: 'ప్రమాదకర ఆయుధంతో గాయం', ta: 'ஆபத்தான ஆயுதத்தால் காயம்', bn: 'বিপজ্জনক অস্ত্রে আঘাত', mr: 'धोकादायक हत्याराने दुखापत', kn: 'ಅಪಾಯಕಾರಿ ಆಯುಧದಿಂದ ಗಾಯ', ml: 'അപകടകരമായ ആയുധം കൊണ്ടുള്ള ഉപദ്രവം' },
    'BNS-115':       { en: 'Causing hurt (beating/assault)', hi: 'मारपीट / चोट पहुंचाना', te: 'కొట్టడం / గాయపరచడం', ta: 'அடித்து காயப்படுத்துதல்', bn: 'মারধর / আঘাত', mr: 'मारहाण / दुखापत', kn: 'ಹೊಡೆತ / ಗಾಯ', ml: 'ഉപദ്രവം / ക്ഷതം' },
    'BNS-117':       { en: 'Grievous hurt (serious injury)', hi: 'गंभीर चोट', te: 'తీవ్రమైన గాయం', ta: 'கடுமையான காயம்', bn: 'গুরুতর আঘাত', mr: 'गंभीर दुखापत', kn: 'ತೀವ್ರ ಗಾಯ', ml: 'ഗുരുതര ക്ഷതം' },
    'BNS-126':       { en: 'Blocking someone\'s way', hi: 'रास्ता रोकना', te: 'దారి అడ్డగించడం', ta: 'வழி தடை', bn: 'পথ আটকানো', mr: 'रस्ता अडवणे', kn: 'ದಾರಿ ತಡೆಯುವುದು', ml: 'വഴി തടയൽ' },
    'BNS-132':       { en: 'Kidnapping', hi: 'अपहरण', te: 'అపహరణ', ta: 'கடத்தல்', bn: 'অপহরণ', mr: 'अपहरण', kn: 'ಅಪಹರಣ', ml: 'തട്ടിക്കൊണ്ടുപോകൽ' },
    'BNS-140':       { en: 'Unlawful confinement (locked up)', hi: 'बंधक बनाना', te: 'అన్యాయంగా బంధించడం', ta: 'சட்டவிரோத தடுப்பு', bn: 'বেআইনি আটকানো', mr: 'बेकायदेशीर बंधन', kn: 'ಅಕ್ರಮ ಬಂಧನ', ml: 'നിയമവിരുദ്ധ തടങ്കൽ' },
    'BNS-161':       { en: 'Bribery (official demanding money)', hi: 'रिश्वत लेना / भ्रष्टाचार', te: 'లంచం తీసుకోవడం', ta: 'லஞ்சம் வாங்குவது', bn: 'ঘুষ গ্রহণ', mr: 'लाच घेणे', kn: 'ಲಂಚ ತೆಗೆದುಕೊಳ್ಳುವುದು', ml: 'കൈക്കൂലി' },
    'BNS-200':       { en: 'Public nuisance', hi: 'सार्वजनिक उपद्रव', te: 'బహిరంగ అలజడి', ta: 'பொது இடையூறு', bn: 'সরকারি উৎপাত', mr: 'सार्वजनिक उपद्रव', kn: 'ಸಾರ್ವಜನಿಕ ಉಪದ್ರವ', ml: 'പൊതു ശല്യം' },
    'BNS-303':       { en: 'Theft', hi: 'चोरी', te: 'దొంగతనం', ta: 'திருட்டு', bn: 'চুরি', mr: 'चोरी', kn: 'ಕಳ್ಳತನ', ml: 'മോഷണം' },
    'BNS-308':       { en: 'Extortion (forced money)', hi: 'जबरन पैसे वसूली / रंगदारी', te: 'దౌర్జన్య వసూలు', ta: 'மிரட்டி பணம் பறிப்பு', bn: 'জোরপূর্বক অর্থ আদায়', mr: 'जबरदस्ती वसुली', kn: 'ಬಲವಂತ ವಸೂಲಿ', ml: 'ഭീഷണിപ്പെടുത്തി പണം' },
    'BNS-311':       { en: 'Robbery (theft with violence)', hi: 'लूट / छीना-झपटी', te: 'దోపిడీ', ta: 'கொள்ளை', bn: 'ডাকাতি', mr: 'लूट', kn: 'ದರೋಡೆ', ml: 'കൊള്ള' },
    'BNS-316':       { en: 'Breach of trust', hi: 'विश्वासघात', te: 'నమ్మక ద్రోహం', ta: 'நம்பிக்கை மீறல்', bn: 'বিশ্বাসভঙ্গ', mr: 'विश्वासाचा भंग', kn: 'ನಂಬಿಕೆ ದ್ರೋಹ', ml: 'വിശ്വാസ ലംഘനം' },
    'BNS-318':       { en: 'Cheating / fraud', hi: 'धोखाधड़ी / ठगी', te: 'మోసం', ta: 'ஏமாற்றுதல்', bn: 'প্রতারণা', mr: 'फसवणूक', kn: 'ಮೋಸ', ml: 'വഞ്ചന' },
    'BNS-329':       { en: 'Trespass / illegal land grab', hi: 'अवैध कब्जा', te: 'అక్రమ ప్రవేశం', ta: 'சட்டவிரோத ஆக்கிரமிப்பு', bn: 'অবৈধ দখল', mr: 'अनधिकृत घुसखोरी', kn: 'ಅಕ್ರಮ ಪ್ರವೇಶ', ml: 'അനധികൃത കടന്നുകയറ്റം' },
    'BNS-336':       { en: 'Forgery (fake documents)', hi: 'जाली दस्तावेज', te: 'నకిలీ పత్రాలు', ta: 'போலி ஆவணம்', bn: 'জালিয়াতি', mr: 'बनावट दस्तऐवज', kn: 'ನಕಲಿ ದಾಖಲೆ', ml: 'വ്യാജ രേഖ' },
    'BNS-336-labour':{ en: 'Non-payment of wages', hi: 'मजदूरी / वेतन न देना', te: 'వేతనం చెల్లించకపోవడం', ta: 'கூலி கொடுக்காமல் இருத்தல்', bn: 'মজুরি না দেওয়া', mr: 'मजुरी न देणे', kn: 'ವೇತನ ನೀಡದಿರುವುದು', ml: 'വേതനം നൽകാതിരിക്കൽ' },
    'BNS-351':       { en: 'Criminal threats', hi: 'धमकी देना', te: 'బెదిరింపు', ta: 'மிரட்டல்', bn: 'ভয় দেখানো', mr: 'दमदाटी', kn: 'ಬೆದರಿಕೆ', ml: 'ഭീഷണി' },
    'BNS-352':       { en: 'Intentional insult / verbal abuse', hi: 'गाली-गलौज / अपमान', te: 'అవమానం / నిందించడం', ta: 'இழிவு / வைதல்', bn: 'গালাগালি / অপমান', mr: 'शिवीगाळ / अपमान', kn: 'ನಿಂದನೆ / ಅವಮಾನ', ml: 'ചീത്ത വിളി / അപമാനം' },
    'BNS-356':       { en: 'Defamation (ruining reputation)', hi: 'मानहानि / बदनामी', te: 'పరువు నష్టం', ta: 'அவதூறு', bn: 'মানহানি', mr: 'बदनामी', kn: 'ಮಾನನಷ್ಟ', ml: 'അപകീർത്തി' },
    'BNS-64':        { en: 'Sexual assault', hi: 'यौन हिंसा', te: 'లైంగిక హింస', ta: 'பாலியல் வன்முறை', bn: 'যৌন নিপীড়ন', mr: 'लैंगिक हिंसा', kn: 'ಲೈಂಗಿಕ ದೌರ್ಜನ್ಯ', ml: 'ലൈംഗിക പീഡനം' },
    'BNS-74':        { en: 'Harassment of women', hi: 'महिला उत्पीड़न / छेड़छाड़', te: 'మహిళపై వేధింపులు', ta: 'பெண்களுக்கு தொல்லை', bn: 'নারী নিপীড়ন', mr: 'महिलांचा छळ', kn: 'ಮಹಿಳೆ ಕಿರುಕುಳ', ml: 'സ്ത്രീ ശല്യം' },
    'BNS-85':        { en: 'Domestic violence / dowry harassment', hi: 'घरेलू हिंसा / दहेज उत्पीड़न', te: 'గృహ హింస / వరకట్న వేధింపు', ta: 'கொடுமை / வரதட்சணை', bn: 'গৃহ হিংসা / যৌতুক', mr: 'घरगुती हिंसा / हुंडाबळी', kn: 'ಗೃಹ ಹಿಂಸೆ / ವರದಕ್ಷಿಣೆ', ml: 'ഗൃഹ പീഡനം / വരദക്ഷിണ' },
    'BNSS-173':      { en: 'Your right to file FIR — police cannot refuse', hi: 'FIR दर्ज करवाने का आपका अधिकार — पुलिस मना नहीं कर सकती', te: 'FIR నమోదు హక్కు — పోలీసులు నిరాకరించలేరు', ta: 'FIR பதிவு செய்யும் உரிமை', bn: 'FIR করার অধিকার', mr: 'FIR नोंदण्याचा अधिकार', kn: 'FIR ದಾಖಲಿಸುವ ಹಕ್ಕು', ml: 'FIR ഫയൽ ചെയ്യാനുള്ള അവകാശം' },
    'BNSS-176':      { en: 'Police must investigate your complaint', hi: 'पुलिस की जांच करने की जिम्मेदारी', te: 'పోలీసు విచారణ బాధ్యత', ta: 'போலீஸ் விசாரிக்க வேண்டிய கடமை', bn: 'পুলিশের তদন্তের দায়', mr: 'पोलिसांची तपासाची जबाबदारी', kn: 'ಪೊಲೀಸ್ ತನಿಖೆ ಕರ್ತವ್ಯ', ml: 'പോലീസ് അന്വേഷണ ഉത്തരവാദിത്തം' }
};

export const BASE_STATUTES = [
    {
        id: 'BNS-103', code: 'BNS', section: '103',
        title: 'Murder (हत्या)',
        text: 'Intentionally causing someone\'s death.',
        punishment: 'Death or life imprisonment.',
        triggers: ['killed', 'murder', 'maut', 'jaan le li', 'हत्या', 'मार डाला', 'मृत्यु हो गई', 'కొట్టి చంపారు', 'খুন'],
        negTriggers: ['property', 'money', 'fraud', 'salary', 'chori'],
        minScore: 8,
        category: 'assault',
        source: 'India Code: https://www.indiacode.nic.in/'
    },
    {
        id: 'BNS-109', code: 'BNS', section: '109',
        title: 'Hurt by dangerous weapon or means (खतरनाक हथियार से चोट)',
        text: 'Causing injury using a knife, stick, iron rod, fire, or any dangerous object.',
        punishment: 'Up to 7 years jail and fine.',
        triggers: [
            'knife', 'rod', 'iron rod', 'danda', 'laathi', 'weapon', 'sharp object',
            'लाठी-डंडे', 'लाठी से पीटा', 'डंडों से', 'चाकू', 'तलवार', 'హఠాయుధం', 'লাঠি দিয়ে'
        ],
        negTriggers: ['money', 'property', 'salary', 'fraud'],
        minScore: 5, category: 'assault',
        source: 'India Code: https://www.indiacode.nic.in/'
    },
    {
        id: 'BNS-115', code: 'BNS', section: '115',
        title: 'Causing hurt / beating (मारपीट)',
        text: 'Hitting, slapping, punching or physically hurting someone.',
        punishment: 'Up to 1 year jail or fine up to ₹10,000 or both.',
        triggers: [
            'beaten', 'hit', 'slapped', 'punched', 'kicked', 'assault', 'marpeet', 'maara', 'peeta',
            'मारपीट', 'पीटा', 'मारा', 'थप्पड़', 'पिटाई', 'కొట్టారు', 'அடித்தார்கள்', 'মারধর'
        ],
        negTriggers: ['money demanded', 'salary', 'fraud', 'land', 'property', 'chori'],
        minScore: 4, category: 'assault',
        source: 'India Code: https://www.indiacode.nic.in/'
    },
    {
        id: 'BNS-117', code: 'BNS', section: '117',
        title: 'Grievous / serious injury (गंभीर चोट)',
        text: 'Serious harm — broken bones, heavy bleeding, injuries needing hospital treatment.',
        punishment: 'Up to 7 years jail and fine.',
        triggers: [
            'serious injury', 'fracture', 'broken bone', 'bleeding', 'blood', 'hospital', 'gambhir chot', 'khoon',
            'गंभीर चोट', 'खून बहा', 'हड्डी टूटी', 'अस्पताल', 'రక্তم', 'রক্ত'
        ],
        negTriggers: ['money', 'salary', 'fraud'],
        minScore: 5, category: 'assault',
        source: 'India Code: https://www.indiacode.nic.in/'
    },
    {
        id: 'BNS-126', code: 'BNS', section: '126',
        title: 'Wrongful restraint (रास्ता रोकना / जाने से रोकना)',
        text: 'Physically stopping someone from going somewhere they have the right to go.',
        punishment: 'Up to 1 month jail or fine up to ₹5,000 or both.',
        triggers: [
            'blocked', 'stopped me', 'rasta roka', 'roka', 'aane se roka', 'jane se roka',
            'रास्ता रोका', 'जाने से रोका', 'दारि अड्डगించారు', 'পথ আটকানো'
        ],
        negTriggers: ['money', 'fraud', 'chori'],
        minScore: 5, category: 'assault',
        source: 'India Code: https://www.indiacode.nic.in/'
    },
    {
        id: 'BNS-132', code: 'BNS', section: '132',
        title: 'Kidnapping (अपहरण)',
        text: 'Taking someone away against their will, or taking a child.',
        punishment: '7 years to life imprisonment.',
        triggers: [
            'kidnap', 'abducted', 'forcibly taken', 'child missing', 'utha liya', 'apaharan',
            'अपहरण', 'उठा ले गया', 'అపహరించారు', 'অপহরণ'
        ],
        negTriggers: ['money', 'fraud'],
        minScore: 6, category: 'assault',
        source: 'India Code: https://www.indiacode.nic.in/'
    },
    {
        id: 'BNS-140', code: 'BNS', section: '140',
        title: 'Wrongful confinement (बंधक बनाना / घर में बंद करना)',
        text: 'Locking someone up or keeping them confined against their will.',
        punishment: 'Up to 1 year jail or fine or both. Up to 3 years if confined for 3+ days.',
        triggers: [
            'locked up', 'confined', 'bandhi', 'kamre me band', 'ghar me band', 'nahi jane diya',
            'बंधक', 'कमरे में बंद', 'घर से बाहर नहीं निकलने दिया'
        ],
        negTriggers: [],
        minScore: 5, category: 'assault',
        source: 'India Code: https://www.indiacode.nic.in/'
    },
    {
        id: 'BNS-351', code: 'BNS', section: '351',
        title: 'Threats / criminal intimidation (धमकी देना)',
        text: 'Threatening to harm someone or their family — "I will kill you", "I will destroy your reputation", etc.',
        punishment: 'Up to 2 years jail or fine. Up to 7 years for death threats.',
        triggers: [
            'dhamki', 'threat', 'threatened', 'scared', 'jaan se maarne ki dhamki',
            'धमकी', 'जान से मारने की धमकी', 'डरा दिया', 'బెదిరించారు', 'হুমকি'
        ],
        negTriggers: ['money demanded', 'hafta', 'rangdari'],
        minScore: 6, category: 'intimidation',
        source: 'India Code: https://www.indiacode.nic.in/'
    },
    {
        id: 'BNS-352', code: 'BNS', section: '352',
        title: 'Verbal abuse / intentional insult (गाली-गलौज)',
        text: 'Deliberately abusing or insulting someone in public.',
        punishment: 'Up to 2 years jail or fine or both.',
        triggers: [
            'gali', 'abused', 'insulted', 'verbal abuse', 'bad words', 'beizzat',
            'गाली', 'गाली-गलौज', 'अपमान', 'गालి', 'অপমান'
        ],
        negTriggers: ['property', 'money', 'salary'],
        minScore: 5, category: 'intimidation',
        source: 'India Code: https://www.indiacode.nic.in/'
    },
    {
        id: 'BNS-356', code: 'BNS', section: '356',
        title: 'Defamation (बदनामी / मानहानि)',
        text: 'Spreading false information that damages a person\'s reputation — in person, on social media, or in writing.',
        punishment: 'Up to 2 years jail or fine or both.',
        triggers: [
            'defamation', 'false rumours', 'reputation damage', 'social media abuse', 'spreading lies', 'jhuth failaya',
            'मानहानि', 'बदनामी', 'झूठ फैलाया', 'মানহানি'
        ],
        negTriggers: [],
        minScore: 5, category: 'intimidation',
        source: 'India Code: https://www.indiacode.nic.in/'
    },
    {
        id: 'BNS-303', code: 'BNS', section: '303',
        title: 'Theft (चोरी)',
        text: 'Secretly taking someone\'s belongings without their knowledge or permission.',
        punishment: 'Up to 3 years jail or fine or both.',
        triggers: [
            'theft', 'stolen', 'stole', 'pickpocket', 'chori', 'chura liya', 'cheen liya',
            'चोरी', 'चुराया', 'छीन लिया', 'దొంగతనం', 'চুরি', 'திருட்டு'
        ],
        negTriggers: ['assault only', 'sexual', 'beating without theft'],
        minScore: 5, category: 'property',
        source: 'India Code: https://www.indiacode.nic.in/'
    },
    {
        id: 'BNS-311', code: 'BNS', section: '311',
        title: 'Robbery / chain snatching (लूटपाट)',
        text: 'Taking property using violence or by putting someone in fear — includes chain snatching and mugging.',
        punishment: 'Up to 10 years jail and fine.',
        triggers: [
            'robbery', 'looted', 'snatched', 'chain snatching', 'bag snatched', 'loot',
            'लूट', 'झपटमारी', 'चेन छीनी', 'মোবাইল ছিনতাই'
        ],
        negTriggers: ['fraud', 'salary'],
        minScore: 6, category: 'property',
        source: 'India Code: https://www.indiacode.nic.in/'
    },
    {
        id: 'BNS-308', code: 'BNS', section: '308',
        title: 'Extortion / hafta / forced money (रंगदारी / जबरन वसूली)',
        text: 'Demanding money through threats — gunda tax, hafta collection, or threatening to harm unless paid.',
        punishment: 'Up to 7 years jail and fine.',
        triggers: [
            'hafta', 'rangdari', 'extortion', 'gunda tax', 'forced money', 'paise dene ko majboor',
            'हफ्ता', 'रंगदारी', 'जबरन पैसे', 'धमकी देकर पैसे मांगे', 'దౌర్జన్య వసూలు'
        ],
        negTriggers: ['beaten without money demand', 'assault only', 'sexual', 'salary'],
        minScore: 8, category: 'property',
        source: 'India Code: https://www.indiacode.nic.in/'
    },
    {
        id: 'BNS-316', code: 'BNS', section: '316',
        title: 'Breach of trust (विश्वासघात)',
        text: 'Someone entrusted with your money or valuables dishonestly keeps it or refuses to return it.',
        punishment: 'Up to 5 years jail or fine or both.',
        triggers: [
            'breach of trust', 'amanat me khayanat', 'paisa nahi diya', 'nahi lautaya', 'betrayal',
            'विश्वासघात', 'अमानत में खयानत', 'पैसे वापस नहीं दिए', 'నమ్మక ద్రోహం'
        ],
        negTriggers: ['beaten', 'assault', 'threat', 'sexual'],
        minScore: 6, category: 'fraud',
        source: 'India Code: https://www.indiacode.nic.in/'
    },
    {
        id: 'BNS-318', code: 'BNS', section: '318',
        title: 'Cheating / fraud (धोखाधड़ी)',
        text: 'Lying or tricking someone into giving money, property, or signing something.',
        punishment: 'Up to 3 years jail or fine or both. Up to 7 years for big fraud.',
        triggers: [
            'fraud', 'cheat', 'cheated', 'scam', 'dhokha', 'thagi', 'jhansa', 'online fraud', 'fake',
            'धोखा', 'धोखाधड़ी', 'ठगी', 'मोसम', 'మోసం', 'প্রতারণা', 'ஏமாற்று'
        ],
        negTriggers: ['beaten', 'assault', 'sexual'],
        minScore: 5, category: 'fraud',
        source: 'India Code: https://www.indiacode.nic.in/'
    },
    {
        id: 'BNS-329', code: 'BNS', section: '329',
        title: 'Illegal occupation / trespass (अवैध कब्जा)',
        text: 'Entering or taking over someone else\'s land or house without permission.',
        punishment: 'Up to 3 months jail or ₹5,000 fine. Up to 1 year for house entry.',
        triggers: [
            'kabza', 'land grab', 'illegal occupation', 'trespass', 'khet me ghusa', 'ghar me ghusa',
            'अवैध कब्जा', 'जमीन कब्जा', 'घर में घुसा', 'কবজা', 'కబ్జా'
        ],
        negTriggers: ['sexual', 'assault', 'salary'],
        minScore: 5, category: 'property',
        source: 'India Code: https://www.indiacode.nic.in/'
    },
    {
        id: 'BNS-336', code: 'BNS', section: '336',
        title: 'Forgery / fake documents (जाली दस्तावेज)',
        text: 'Making or using a fake document — forged signatures, fake property papers, or false stamp papers.',
        punishment: 'Up to 2 years jail or fine or both.',
        triggers: [
            'forged', 'fake document', 'fake signature', 'jali dastavez', 'stamp paper fake', 'nakli', 'forgery',
            'जाली दस्तावेज', 'नकली हस्ताक्षर', 'फर्जी कागज', 'నకిలీ పత్రాలు', 'জাল দলিল'
        ],
        negTriggers: ['beaten', 'sexual', 'threat'],
        minScore: 6, category: 'fraud',
        source: 'India Code: https://www.indiacode.nic.in/'
    },
    {
        id: 'BNS-64', code: 'BNS', section: '64',
        title: 'Sexual assault (यौन हिंसा)',
        text: 'Sexual assault and rape. Police must register FIR immediately and provide medical assistance.',
        punishment: 'Minimum 10 years rigorous imprisonment, can extend to life imprisonment.',
        triggers: ['rape', 'sexual assault', 'balatkar', 'youn hinsa', 'बलात्कार', 'यौन हिंसा', 'লৈংগিক দাড়ি', 'లైంగిక హింస'],
        negTriggers: ['money', 'property', 'salary'],
        minScore: 5, category: 'women_safety',
        source: 'India Code: https://www.indiacode.nic.in/'
    },
    {
        id: 'BNS-74', code: 'BNS', section: '74',
        title: 'Harassment of women / eve-teasing (महिला उत्पीड़न)',
        text: 'Inappropriate touching, stalking, eve-teasing, or passing lewd comments at women.',
        punishment: '1 to 5 years jail and fine.',
        triggers: [
            'eve teasing', 'stalking', 'molestation', 'chhed chhad', 'inappropriate touch', 'badtameezi with woman',
            'छेड़छाड़', 'महिला उत्पीड़न', 'వేధింపులు', 'নারী নিপীড়ন', 'பெண் தொல்லை'
        ],
        negTriggers: ['money', 'property', 'salary', 'husband'],
        minScore: 5, category: 'women_safety',
        source: 'India Code: https://www.indiacode.nic.in/'
    },
    {
        id: 'BNS-85', code: 'BNS', section: '85',
        title: 'Domestic violence / dowry harassment (घरेलू हिंसा / दहेज)',
        text: 'Husband or in-laws causing physical or mental harm — including dowry demands and torture.',
        punishment: 'Up to 3 years jail and fine.',
        triggers: [
            'dowry', 'dahej', 'husband beating', 'sasural', 'in-laws', 'domestic violence', 'ghar me maar',
            'दहेज', 'ससुराल', 'पति ने मारा', 'घरेलू हिंसा', 'গৃহ হিংসা', 'వరకట్నం', 'கொடுமை'
        ],
        negTriggers: [],
        minScore: 5, category: 'women_safety',
        source: 'India Code: https://www.indiacode.nic.in/'
    },
    {
        id: 'BNS-336-labour', code: 'BNS', section: '336',
        title: 'Non-payment of wages (मजदूरी न देना)',
        text: 'Employer refusing to pay agreed wages or salary. This is both a labour law violation and cheating.',
        punishment: 'Up to 3 months jail or fine (Labour Act violations add further penalties).',
        triggers: [
            'salary not paid', 'wages withheld', 'mazdoori nahi di', 'tankhwah nahi mili', 'begar', 'payment refused',
            'मजदूरी नहीं दी', 'वेतन नहीं मिला', 'तनख्वाह रोकी', 'కూలీ ఇవ్వలేదు', 'বেতন দেয়নি'
        ],
        negTriggers: ['beaten', 'sexual', 'murder'],
        minScore: 6, category: 'labour',
        source: 'India Code: https://www.indiacode.nic.in/'
    },
    {
        id: 'BNS-161', code: 'BNS', section: '161',
        title: 'Official demanding bribe (रिश्वत / भ्रष्टाचार)',
        text: 'A government officer — police, panchayat, revenue officer — asking for money to do their job.',
        punishment: 'Up to 3 years jail or fine. Prevention of Corruption Act adds further punishment.',
        triggers: [
            'bribe', 'corruption', 'paisa maanga officer', 'rishwat', 'ghoos', 'hafta police',
            'रिश्वत', 'घूस', 'भ्रष्टाचार', 'अधिकारी ने पैसे मांगे', 'లంచం', 'ঘুষ'
        ],
        negTriggers: ['beaten', 'sexual', 'assault'],
        minScore: 6, category: 'bribery',
        source: 'India Code: https://www.indiacode.nic.in/'
    },
    {
        id: 'BNSS-173', code: 'BNSS', section: '173',
        title: 'Your right to file FIR — police cannot refuse',
        text: 'Any police station in India must register your complaint — even if the crime happened elsewhere (Zero FIR). They must give you a free copy of the FIR. If police refuse, you can complain to the SP or Magistrate.',
        punishment: 'Police officer who refuses faces departmental action.',
        triggers: ['fir', 'zero fir', 'police station', 'complaint', 'thana', 'एफआईआर', 'थाना', 'शिकायत दर्ज', 'FIR నమోదు', 'थाना'],
        negTriggers: [],
        minScore: 3, category: 'procedure',
        source: 'AIKosh: https://www.aikosh.in/ | India Code: https://www.indiacode.nic.in/'
    },
    {
        id: 'BNSS-176', code: 'BNSS', section: '176',
        title: 'Police must investigate your complaint',
        text: 'Once an FIR is filed, police are legally required to investigate properly. If they ignore your complaint, you can approach the Superintendent of Police or District Magistrate.',
        punishment: 'Police inaction is subject to senior officer intervention or court order.',
        triggers: ['investigation', 'police not acting', 'complaint ignored', 'janchpodtaal', 'जांच', 'तहकीकात'],
        negTriggers: [],
        minScore: 4, category: 'procedure',
        source: 'AIKosh: https://www.aikosh.in/ | India Code: https://www.indiacode.nic.in/'
    }
];

const LOCAL_STORAGE_KEY = 'nyaya_setu_dynamic_statutes_v2';

export function getLoadedStatutes() {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        }
    } catch (e) { console.warn('Could not read cached statutes:', e); }
    return BASE_STATUTES;
}

export function saveDynamicStatutes(statutesList) {
    if (!Array.isArray(statutesList)) return false;
    try { localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(statutesList)); return true; }
    catch (e) { console.error('Failed to cache statutes:', e); return false; }
}

export function resetToDefaultStatutes() {
    try { if (typeof window !== 'undefined') localStorage.removeItem(LOCAL_STORAGE_KEY); }
    catch (e) { console.error('Failed to reset:', e); }
    return BASE_STATUTES;
}
