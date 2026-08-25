// Nyaya-Setu Statutory Corpus
// Seed dataset: key BNS 2023 / BNSS 2023 sections with colloquial trigger phrases.
// In production this is expanded to all 358 BNS + 150 BNSS sections from AIKosh gazette data.

export const STATUTES = [
    {
        id: 'BNS-115',
        code: 'BNS',
        section: '115',
        title: 'Voluntarily causing hurt',
        text: 'Whoever does any act with the intention of thereby causing hurt to any person, or with the knowledge that he is likely thereby to cause hurt to any person, and thereby causes hurt to any person, is guilty of voluntarily causing hurt.',
        punishment: 'Imprisonment up to 1 year, or fine up to ₹10,000, or both.',
        triggers: ['mar-peet', 'marpeet', 'beating', 'hit me', 'beaten', 'physical assault', 'maara', 'peeta', 'thaya', 'adi vangi'],
        category: 'assault'
    },
    {
        id: 'BNS-117',
        code: 'BNS',
        section: '117',
        title: 'Voluntarily causing grievous hurt',
        text: 'Voluntarily causing grievous hurt — hurt which endangers life or causes severe bodily suffering or permanent disfigurement.',
        punishment: 'Imprisonment up to 7 years and fine.',
        triggers: ['serious injury', 'broken bones', 'fracture', 'blood', 'hospital', 'severe beating', 'gambhir chot'],
        category: 'assault'
    },
    {
        id: 'BNS-351',
        code: 'BNS',
        section: '351',
        title: 'Criminal intimidation',
        text: 'Whoever threatens another with injury to his person, reputation or property, or to the person or reputation of anyone in whom that person is interested, with intent to cause alarm to that person, commits criminal intimidation.',
        punishment: 'Imprisonment up to 2 years, or fine, or both; up to 7 years if threat is to cause death or grievous hurt.',
        triggers: ['dhamki', 'dhamakee', 'threat', 'threatened', 'warned me', 'intimidation', 'dhmki de', 'bhaga diya'],
        category: 'intimidation'
    },
    {
        id: 'BNS-352',
        code: 'BNS',
        section: '352',
        title: 'Intentional insult with intent to provoke breach of peace',
        text: 'Whoever intentionally insults, and thereby gives provocation to any person, intending or knowing it to be likely that such provocation will cause him to break the public peace or commit any other offence.',
        punishment: 'Imprisonment up to 2 years, or fine, or both.',
        triggers: ['gali-galoch', 'gali', 'abuse', 'verbal abuse', 'insult', 'gaali di', 'gaalu', 'chothali'],
        category: 'intimidation'
    },
    {
        id: 'BNS-303',
        code: 'BNS',
        section: '303',
        title: 'Theft',
        text: 'Whoever commits theft shall be punished with imprisonment of either description for a term which may extend to three years, or with fine, or with both.',
        punishment: 'Imprisonment up to 3 years, or fine, or both.',
        triggers: ['theft', 'stolen', 'chori', 'chura liya', 'stole my', 'pickpocket', 'cheen liya'],
        category: 'property'
    },
    {
        id: 'BNS-308',
        code: 'BNS',
        section: '308',
        title: 'Extortion',
        text: 'Whoever intentionally puts any person in fear of any injury, or to any person in whom that person is interested, and thereby dishonestly induces the person so put in fear to deliver to any person any property or valuable security.',
        punishment: 'Imprisonment up to 7 years and fine.',
        threats: [],
        triggers: ['extortion', 'hafta', 'rangdari', 'forced money', 'blackmail money', 'jabran paisa'],
        category: 'property'
    },
    {
        id: 'BNS-318',
        code: 'BNS',
        section: '318',
        title: 'Cheating',
        text: 'Whoever cheats shall be punished with imprisonment of either description for a term which may extend to three years, or with fine, or with both.',
        punishment: 'Imprisonment up to 3 years, or fine, or both.',
        triggers: ['fraud', 'cheat', 'cheated', 'thagi', 'dhokha', 'paisa le gaya', 'scam', 'online fraud', 'fake'],
        category: 'fraud'
    },
    {
        id: 'BNS-336',
        code: 'BNS',
        section: '336',
        title: 'Forgery',
        text: 'Whoever makes any false documents or false electronic record with intent to cause damage or injury to the public or to any person, or to support any claim or title, commits forgery.',
        punishment: 'Imprisonment up to 2 years, or fine, or both (up to life in aggravated cases).',
        triggers: ['forged', 'fake signature', 'fake document', 'jhooti likhit', 'forgery', 'stamp paper fake'],
        category: 'fraud'
    },
    {
        id: 'BNS-64',
        code: 'BNS',
        section: '64',
        title: 'Punishment for rape',
        text: 'Whoever commits rape shall be punished with rigorous imprisonment not less than ten years, which may extend to imprisonment for life.',
        punishment: 'Rigorous imprisonment 10 years to life, and fine.',
        triggers: ['rape', 'balatkar', 'sexual assault', 'dushti vyavhar'],
        category: 'grave'
    },
    {
        id: 'BNS-74',
        code: 'BNS',
        section: '74',
        title: 'Assault or use of criminal force to woman with intent to outrage her modesty',
        text: 'Whoever assaults or uses criminal force to any woman, intending to outrage or knowing it to be likely that he will thereby outrage her modesty.',
        punishment: 'Imprisonment 1 to 5 years and fine.',
        triggers: ['eve teasing', 'chhed-chhad', 'outrage modesty', 'touching inappropriately', 'badtameezi'],
        category: 'grave'
    },
    {
        id: 'BNS-85',
        code: 'BNS',
        section: '85',
        title: 'Cruelty by husband or relatives',
        text: 'Whoever, being the husband or the relative of the husband of a woman, subjects her to cruelty shall be punished.',
        punishment: 'Imprisonment up to 3 years and fine.',
        triggers: ['dowry', 'dahej', 'husband torture', 'sasural', 'cruelty husband', 'in-laws harassment', 'pati peetan'],
        category: 'grave'
    },
    {
        id: 'BNSS-173',
        code: 'BNSS',
        section: '173',
        title: 'Information in cognizable cases (incl. Zero FIR)',
        text: 'Every information relating to the commission of a cognizable offence shall be registered, irrespective of the area where the offence is committed (Zero FIR). The officer shall give a copy of the information free of cost to the informant.',
        punishment: null,
        triggers: ['fir', 'zero fir', 'police station', 'complaint registration', 'report crime'],
        category: 'procedure'
    },
    {
        id: 'BNSS-175',
        code: 'BNSS',
        section: '175',
        title: 'Power to investigate cognizable case (incl. SP escalation under 175(3))',
        text: 'If an officer in charge of a police station refuses to record information, the informant may send the substance of the information to the Superintendent of Police, who may investigate the matter himself or direct an investigation.',
        punishment: null,
        triggers: ['police refused', 'not registering fir', 'superintendent of police', 'sp complaint', 'refused complaint'],
        category: 'procedure'
    }
];

export const RIGHTS_BRIEFING = [
    'You have the right to register a First Information Report (FIR) for any cognizable offence. Under Section 173 BNSS, a Zero FIR can be filed at ANY police station regardless of jurisdiction.',
    'The police must provide you a free copy of your recorded complaint. Always collect and preserve it.',
    'If the police refuse to register your FIR, under Section 175(3) BNSS you may send your complaint in writing to the Superintendent of Police, who is then bound to order an investigation.',
    'If the Superintendent of Police also fails to act, you may approach the concerned Judicial Magistrate under Section 175(4) BNSS.',
    'Legal aid is your right under Article 39A of the Constitution. Contact NALSA (National Legal Services Authority) helpline 15100 for free legal assistance.',
    'This document is a drafting aid, not legal advice from an advocate. For representation, consult a licensed advocate or your District Legal Services Authority (DLSA).'
];
