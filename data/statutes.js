// Nyaya-Setu Statutory Corpus
// Curated from IndiaAI AIKosh Legislative Open Dataset & Gazette of India (BNS 2023, BNSS 2023, BSA 2023).
// Mapped with Bhashini Indic parallel dialectal terminology for 100% deterministic grounding.

export const STATUTE_METADATA = {
    source: "IndiaAI AIKosh Legislative Corpus / Gazette of India 2023",
    lexicon: "Bhashini Indic Multilingual Parallel Corpora",
    jurisdiction: "Republic of India",
    version: "2023-BNS-BNSS-BSA"
};

export const STATUTES = [
    {
        id: 'BNS-115',
        code: 'BNS',
        section: '115',
        title: 'Voluntarily causing hurt (स्वेच्छा से उपहति कारित करना)',
        text: 'Whoever does any act with the intention of thereby causing hurt to any person, or with the knowledge that he is likely thereby to cause hurt to any person, and thereby causes hurt to any person, is guilty of voluntarily causing hurt.',
        punishment: 'Imprisonment up to 1 year, or fine up to ₹10,000, or both.',
        triggers: ['mar-peet', 'marpeet', 'beating', 'hit me', 'beaten', 'physical assault', 'maara', 'peeta', 'thaya', 'adi vangi', 'haathapai', 'slapped', 'laathi'],
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
        triggers: ['serious injury', 'broken bones', 'fracture', 'blood', 'hospital', 'severe beating', 'gambhir chot', 'khoon', 'haddi todi', 'admitted in hospital'],
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
        triggers: ['dhamki', 'dhamakee', 'threat', 'threatened', 'warned me', 'intimidation', 'dhmki de', 'bhaga diya', 'jaan se marne ki dhamki', 'scared me'],
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
        triggers: ['gali-galoch', 'gali', 'abuse', 'verbal abuse', 'insult', 'gaali di', 'gaalu', 'chothali', 'apmaan', 'beizzat', 'bad words'],
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
        triggers: ['theft', 'stolen', 'chori', 'chura liya', 'stole my', 'pickpocket', 'cheen liya', 'gayab kar diya', 'pocket mara'],
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
        triggers: ['extortion', 'hafta', 'rangdari', 'forced money', 'blackmail money', 'jabran paisa', 'protection money', 'gunda tax'],
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
        triggers: ['breach of trust', 'misappropriation', 'amanat me khayanat', 'paisa gaban', 'refused to return money', 'swindled deposit', 'haddap liya'],
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
        triggers: ['fraud', 'cheat', 'cheated', 'thagi', 'dhokha', 'paisa le gaya', 'scam', 'online fraud', 'fake', 'farziwada', 'jhansa diya'],
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
        triggers: ['kabza', 'land grabbing', 'illegal entry', 'trespass', 'khet me ghusa', 'ghar me ghusa', 'boundary broken', 'illegal occupation'],
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
        triggers: ['forged', 'fake signature', 'fake document', 'jhooti likhit', 'forgery', 'stamp paper fake', 'nakli hastakshar', 'jali dastavez'],
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
        triggers: ['rape', 'balatkar', 'sexual assault', 'dushti vyavhar'],
        category: 'grave',
        source: 'AIKosh Gazette BNS 2023 Ch.V'
    },
    {
        id: 'BNS-74',
        code: 'BNS',
        section: '74',
        title: 'Assault or criminal force to woman with intent to outrage modesty (महिला की लज्जा भंग करने के आशय से हमला)',
        text: 'Whoever assaults or uses criminal force to any woman, intending to outrage or knowing it to be likely that he will thereby outrage her modesty.',
        punishment: 'Imprisonment 1 to 5 years and fine.',
        triggers: ['eve teasing', 'chhed-chhad', 'outrage modesty', 'touching inappropriately', 'badtameezi', 'chhedkhani', 'stalking', 'galat tarike se chhua'],
        category: 'grave',
        source: 'AIKosh Gazette BNS 2023 Ch.V'
    },
    {
        id: 'BNS-85',
        code: 'BNS',
        section: '85',
        title: 'Cruelty by husband or relatives of husband (पति या उसके नातेदारों द्वारा क्रूरता)',
        text: 'Whoever, being the husband or the relative of the husband of a woman, subjects her to cruelty shall be punished.',
        punishment: 'Imprisonment up to 3 years and fine.',
        triggers: ['dowry', 'dahej', 'husband torture', 'sasural', 'cruelty husband', 'in-laws harassment', 'pati peetan', 'dahej utpeedan', 'domestic violence'],
        category: 'grave',
        source: 'AIKosh Gazette BNS 2023 Ch.V'
    },
    {
        id: 'BNSS-173',
        code: 'BNSS',
        section: '173',
        title: 'Information in cognizable cases (Zero FIR mandate) (संज्ञेय मामलों में सूचना - जीरो एफआईआर)',
        text: 'Every information relating to the commission of a cognizable offence shall be registered, irrespective of the area where the offence is committed (Zero FIR). The officer shall give a copy of the information free of cost to the informant.',
        punishment: null,
        triggers: ['fir', 'zero fir', 'police station', 'complaint registration', 'report crime', 'thana'],
        category: 'procedure',
        source: 'AIKosh Gazette BNSS 2023 Ch.XII'
    },
    {
        id: 'BNSS-175',
        code: 'BNSS',
        section: '175',
        title: 'Investigation & SP Escalation under 175(3) (अन्वेषण शक्ति एवं पुलिस अधीक्षक को शिकायत)',
        text: 'If an officer in charge of a police station refuses to record information, the informant may send the substance of the information to the Superintendent of Police under Section 175(3), who may investigate or direct investigation.',
        punishment: null,
        triggers: ['police refused', 'not registering fir', 'superintendent of police', 'sp complaint', 'refused complaint', 'police refused fir'],
        category: 'procedure',
        source: 'AIKosh Gazette BNSS 2023 Ch.XII'
    }
];

export const RIGHTS_BRIEFING = {
    en: [
        'You have the right to register a First Information Report (FIR) for any cognizable offence. Under Section 173 BNSS, a Zero FIR can be filed at ANY police station regardless of territorial jurisdiction.',
        'The police must provide you a free copy of your recorded complaint immediately. Always collect and preserve it.',
        'If the police refuse to register your FIR, under Section 175(3) BNSS you may send your complaint in writing to the Superintendent of Police (SP), who is bound to act.',
        'If the Superintendent of Police also fails to act, you may approach the Judicial Magistrate under Section 175(4) BNSS.',
        'Legal aid is your constitutional right under Article 39A. Contact NALSA (National Legal Services Authority) helpline 15100 for free legal assistance.',
        'This document is an AI-assisted drafting aid grounded in AIKosh BNS corpora, not legal advice from an advocate.'
    ],
    hi: [
        'आपको किसी भी संज्ञेय अपराध के लिए प्राथमिकी (FIR) दर्ज कराने का अधिकार है। BNSS की धारा 173 के तहत, किसी भी थाने में जीरो एफआईआर दर्ज कराई जा सकती है।',
        'पुलिस को दर्ज शिकायत की एक प्रति आपको तुरंत निःशुल्क देनी होगी। इसे अवश्य लें और संभाल कर रखें।',
        'यदि थाना प्रभारी आपकी एफआईआर दर्ज करने से मना करता है, तो BNSS की धारा 175(3) के तहत आप पुलिस अधीक्षक (SP) को लिखित शिकायत भेज सकते हैं।',
        'यदि पुलिस अधीक्षक भी कार्रवाई नहीं करते हैं, तो आप धारा 175(4) BNSS के तहत न्यायिक मजिस्ट्रेट के समक्ष आवेदन कर सकते हैं।',
        'संविधान के अनुच्छेद 39A के तहत निःशुल्क कानूनी सहायता आपका अधिकार है। NALSA राष्ट्रीय हेल्पलाइन 15100 पर संपर्क करें।',
        'यह दस्तावेज़ AIKosh डेटासेट पर आधारित एक ड्राफ्टिंग सहायता है, किसी अधिवक्ता की कानूनी सलाह नहीं।'
    ],
    te: [
        'ఏదైనా తీవ్రమైన నేరానికి సంబంధించి ఎఫ్ఐఆర్ (FIR) నమోదు చేసే హక్కు మీకు ఉంది. BNSS సెక్షన్ 173 ప్రకారం, పరిధితో సంబంధం లేకుండా ఏ పోలీస్ స్టేషన్‌లోనైనా జీరో ఎఫ్ఐఆర్ నమోదు చేయవచ్చు.',
        'నమోదు చేసిన ఫిర్యాదు కాపీని పోలీసులు మీకు ఉచితంగా ఇవ్వాలి.',
        'పోలీసులు ఎఫ్ఐఆర్ నమోదు చేయడానికి నిరాకరిస్తే, BNSS సెక్షన్ 175(3) కింద మీరు రాతపూర్వకంగా జిల్లా పోలీస్ సూపరింటెండెంట్ (SP)కి పంపవచ్చు.',
        'ఉచిత న్యాయ సహాయం కోసం NALSA హెల్ప్‌లైన్ 15100 కు కాల్ చేయండి.'
    ]
};
