/**
 * Comprehensive QA test suite for Nyaya-Setu retrieval accuracy.
 * 
 * Tests multilingual, multi-dialect, short descriptions, false positives,
 * ambiguity, similar cases with different outcomes, and section completeness.
 * 
 * Usage: node tests/qa_comprehensive_tests.mjs
 */

import { retrieveSections } from '../src/retrieval.js';
import { extractEntitiesRuleBased, draftComplaint } from '../src/llm.js';
import { screenInput } from '../src/safety.js';
import { normalizeWithBhashini } from '../data/bhashini_lexicon.js';

const wait = (ms) => new Promise(r => setTimeout(r, ms));

let total = 0;
let passed = 0;
let failed = 0;
let warnings = 0;
const failures = [];
const warns = [];

function assert(condition, msg, category) {
    total++;
    if (condition) {
        passed++;
        console.log(`  ✔ ${msg}`);
    } else {
        failed++;
        failures.push({ category, msg });
        console.log(`  ✖ ${msg}`);
    }
}

function warn(msg, category) {
    warnings++;
    warns.push({ category, msg });
    console.log(`  ⚠ ${msg}`);
}

async function runRetrieval(text, topK = 10) {
    await wait(2000);
    return await retrieveSections(text, topK);
}

function getSections(retrieved) {
    return retrieved.map(r => `${r.statute.code}-${r.statute.section}`);
}

// ═══════════════════════════════════════════════════════════════
// CATEGORY 1: SHORT DESCRIPTIONS (1-2 sentences)
// ═══════════════════════════════════════════════════════════════
console.log('\n══ CATEGORY 1: SHORT DESCRIPTIONS ══');

const shortCases = [
    {
        id: 'SHORT-01', lang: 'hi',
        text: 'मेरे पति ने मुझे पीटा।',
        mustInclude: ['115'],
        mustNotInclude: ['308', '336', '85'],
        desc: 'Simple assault — should only get assault sections'
    },
    {
        id: 'SHORT-02', lang: 'en',
        text: 'My neighbor stole my bicycle.',
        mustInclude: ['303'],
        mustNotInclude: ['304', '115', '351'],
        desc: 'Simple theft — should not escalate to robbery or assault'
    },
    {
        id: 'SHORT-03', lang: 'hi',
        text: 'मुझे धमकी मिली है।',
        mustInclude: ['351'],
        mustNotInclude: ['115', '85', '308'],
        desc: 'Simple threat — only intimidation'
    },
    {
        id: 'SHORT-04', lang: 'te',
        text: 'నా ఫోన్ నుండి డబ్బు కాజేశారు.',
        mustInclude: ['318'],
        mustNotInclude: ['303', '304'],
        desc: 'Digital theft — cheating/fraud, not physical theft'
    },
    {
        id: 'SHORT-05', lang: 'ta',
        text: 'என் மீது அவதூறு பரப்பினார்கள்.',
        mustInclude: ['356'],
        mustNotInclude: ['115', '351'],
        desc: 'Defamation only — no physical violence'
    },
    {
        id: 'SHORT-06', lang: 'en',
        text: 'Someone broke into my house at night.',
        mustInclude: ['329'],
        mustNotInclude: ['303', '304'],
        desc: 'Trespass — should not be theft without stealing'
    },
    {
        id: 'SHORT-07', lang: 'kn',
        text: 'ನನ್ನ ಜಮೀನಿನ ಮೇಲೆ ಕಬ್ಜಾ ಮಾಡಿದ್ದಾರೆ.',
        mustInclude: ['329'],
        mustNotInclude: ['303', '308'],
        desc: 'Land encroachment — criminal trespass only'
    },
    {
        id: 'SHORT-08', lang: 'hi',
        text: 'फर्जी दस्तावेज बनाए गए।',
        mustInclude: ['336'],
        mustNotInclude: ['303', '351'],
        desc: 'Forgery — document fraud only'
    },
    {
        id: 'SHORT-09', lang: 'en',
        text: 'My employer has not paid my salary for 3 months.',
        mustInclude: ['316'],
        mustNotInclude: ['303', '308'],
        desc: 'Wage theft — breach of trust, not general theft or extortion'
    },
    {
        id: 'SHORT-10', lang: 'bn',
        text: 'আমাকে হুমকি দিয়ে টাকা নিয়েছে।',
        mustInclude: ['351', '308'],
        mustNotInclude: [],
        desc: 'Threat + extortion — both should appear'
    },
];

for (const c of shortCases) {
    const r = await runRetrieval(c.text);
    const sections = getSections(r);
    const allExpected = c.mustInclude.every(s => sections.some(sec => sec.endsWith('-' + s) || sec === `BNS-${s}` || sec === `BNSS-${s}`));
    const hasUnexpected = c.mustNotInclude.some(s => sections.some(sec => sec.endsWith('-' + s) || sec === `BNS-${s}` || sec === `BNSS-${s}`));

    assert(allExpected, `${c.id} [${c.lang}] ${c.desc}: expected [${c.mustInclude}] in [${sections.join(',')}]`, 'short');
    if (hasUnexpected) {
        const falsePos = c.mustNotInclude.filter(s => sections.some(sec => sec.endsWith('-' + s) || sec === `BNS-${s}` || sec === `BNSS-${s}`));
        warn(`${c.id} [${c.lang}] False positive: got unexpected [${falsePos}] for "${c.text.slice(0, 50)}"`, 'short_fp');
    }
}

// ═══════════════════════════════════════════════════════════════
// CATEGORY 2: MULTILINGUAL — Same complaint, different languages
// ═══════════════════════════════════════════════════════════════
console.log('\n══ CATEGORY 2: MULTILINGUAL CONSISTENCY ══');

const multilingualCases = [
    {
        id: 'ML-01',
        desc: 'Dowry harassment in 4 languages',
        cases: [
            { lang: 'hi', text: 'मेरे ससुराल वाले दहेज के लिए प्रताड़ित करते हैं। पति ने पीटा।' },
            { lang: 'te', text: 'నా అత్తమామలు వరకట్నం కోసం వేధింస్తున్నారు. భర్త కొట్టాడు.' },
            { lang: 'ta', text: 'என் மாமியார் வரதட்சணைக்கு தொல்லை கொடுக்கிறார்கள். கணவர் அடித்தார்.' },
            { lang: 'kn', text: 'ನನ್ನ ಅತ್ತೆ ವರದಕ್ಷಿಣೆಗಾಗಿ ಕಿರುಕುಳ ನೀಡುತ್ತಿದ್ದಾರೆ. ಗಂಡ ಹೊಡೆದರು.' },
        ],
        mustInclude: ['85', '115'],
        desc: 'All 4 languages must include dowry (85) and assault (115)'
    },
    {
        id: 'ML-02',
        desc: 'Cyberstalking in 3 languages',
        cases: [
            { lang: 'en', text: 'My colleague morphed my private photos and shared them on social media. He has been stalking me for months.' },
            { lang: 'hi', text: 'मेरे सहकर्मी ने मेरी प्राइवेट फोटो बनाई और सोशल मीडिया पर डाल दी। वह मेरा पीछा करता है।' },
            { lang: 'te', text: 'నా సహోద్యోగి నా ప్రైవేట్ ఫోటోలను మార్ఫ్ చేసి సోషల్ మీడియాలో పోస్ట్ చేశాడు. వెంటపడ్డాడు.' },
        ],
        mustInclude: ['77', '74', '75'],
        desc: 'All languages must include privacy (77) and harassment (74,75)'
    },
    {
        id: 'ML-03',
        desc: 'Land encroachment in 3 languages',
        cases: [
            { lang: 'hi', text: 'पड़ोसी ने मेरी जमीन पर जबरन कब्जा कर लिया और दीवार बना दी।' },
            { lang: 'kn', text: 'ನನ್ನ ನೆರೆಹೊರೆಯವರು ನನ್ನ ಜಮೀನಿನ ಮೇಲೆ ಅಕ್ರಮವಾಗಿ ಗೋಡೆ ಕಟ್ಟಿದ್ದಾರೆ.' },
            { lang: 'en', text: 'My neighbor has encroached on my land and built a wall on it.' },
        ],
        mustInclude: ['329'],
        mustNotInclude: ['303', '304'],
        desc: 'All languages must get trespass (329) only, not theft/robbery'
    },
];

for (const group of multilingualCases) {
    const allResults = {};
    for (const c of group.cases) {
        const r = await runRetrieval(c.text);
        allResults[c.lang] = getSections(r);
    }

    // Check that all languages include the must-have sections
    for (const c of group.cases) {
        const sections = allResults[c.lang];
        const allExpected = group.mustInclude.every(s =>
            sections.some(sec => sec.endsWith('-' + s) || sec === `BNS-${s}`)
        );
        assert(allExpected, `${group.id} [${c.lang}] ${group.desc}: got [${sections.slice(0, 6).join(',')}]`, 'multilingual');

        if (group.mustNotInclude) {
            const falsePos = group.mustNotInclude.filter(s =>
                sections.some(sec => sec.endsWith('-' + s) || sec === `BNS-${s}`)
            );
            if (falsePos.length) warn(`${group.id} [${c.lang}] Unexpected: [${falsePos}]`, 'multilingual_fp');
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// CATEGORY 3: SIMILAR CASES, DIFFERENT OUTCOMES
// ═══════════════════════════════════════════════════════════════
console.log('\n══ CATEGORY 3: SIMILAR CASES, DIFFERENT OUTCOMES ══');

const similarCases = [
    {
        id: 'SIM-01',
        desc: 'Theft vs Robbery vs Extortion — should differ',
        cases: [
            { text: 'Someone picked my pocket and stole my wallet.', expect: ['303'], mustNotInclude: ['304', '308'], label: 'Theft (pickpocket)' },
            { text: 'A man with a knife snatched my bag and ran away.', expect: ['304'], mustNotInclude: [], label: 'Robbery (snatching)' },
            { text: 'Goons come every month and demand 5000 rupees or they will break my shop.', expect: ['308'], mustNotInclude: ['303', '304'], label: 'Extortion (hafta)' },
        ]
    },
    {
        id: 'SIM-02',
        desc: 'Assault vs Dowry vs Domestic violence',
        cases: [
            { text: 'My colleague punched me in the office.', expect: ['115'], mustNotInclude: ['85'], label: 'Simple assault' },
            { text: 'My husband and in-laws beat me daily and demand money from my parents.', expect: ['85', '115'], mustNotInclude: [], label: 'Dowry + assault' },
            { text: 'My neighbor hit me during an argument about parking space.', expect: ['115'], mustNotInclude: ['85', '308'], label: 'Neighbor dispute assault' },
        ]
    },
    {
        id: 'SIM-03',
        desc: 'Threat vs Intimidation vs Stalking',
        cases: [
            { text: 'Someone sent me a death threat message.', expect: ['351'], mustNotInclude: ['74', '75'], label: 'Criminal intimidation' },
            { text: 'A man follows me every day and sends me vulgar messages.', expect: ['74', '75'], mustNotInclude: ['351'], label: 'Stalking/harassment' },
            { text: 'My ex-boyfriend threatens to post my private photos online.', expect: ['77', '351'], mustNotInclude: [], label: 'Privacy + intimidation' },
        ]
    },
    {
        id: 'SIM-04',
        desc: 'Forgery vs Cheating vs Breach of trust',
        cases: [
            { text: 'My landlord made a fake rental agreement and collected double deposit. He forged my signature.', expect: ['336'], mustNotInclude: ['318', '316'], label: 'Forgery (fake document)' },
            { text: 'I paid advance to a contractor who disappeared with the money. He cheated me online.', expect: ['318'], mustNotInclude: ['336', '316'], label: 'Cheating (advance fraud)' },
            { text: 'My business partner used company money for personal expenses. This is a breach of trust and embezzlement.', expect: ['316'], mustNotInclude: ['303', '308'], label: 'Breach of trust (embezzlement)' },
        ]
    },
];

for (const group of similarCases) {
    for (const c of group.cases) {
        const r = await runRetrieval(c.text);
        const sections = getSections(r);
        const allExpected = c.expect.every(s => sections.some(sec => sec.endsWith('-' + s)));
        const hasUnexpected = (c.mustNotInclude || []).some(s => sections.some(sec => sec.endsWith('-' + s)));

        assert(allExpected, `${group.id} [${c.label}]: expected [${c.expect}] in [${sections.slice(0, 5).join(',')}]`, 'similar');
        if (hasUnexpected) {
            const fp = c.mustNotInclude.filter(s => sections.some(sec => sec.endsWith('-' + s)));
            warn(`${group.id} [${c.label}] False positive: got [${fp}] which shouldn't appear`, 'similar_fp');
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// CATEGORY 4: FALSE POSITIVES — words that trigger wrong sections
// ═══════════════════════════════════════════════════════════════
console.log('\n══ CATEGORY 4: FALSE POSITIVE CHECKS ══');

const falsePositiveCases = [
    {
        id: 'FP-01',
        text: 'My neighbor asked me for money back that I owed him. He raised his voice.',
        mustNotInclude: ['308', '351'],
        desc: 'Asking for owed money is NOT extortion or intimidation'
    },
    {
        id: 'FP-02',
        text: 'I accidentally broke my neighbor\'s window while playing cricket.',
        mustNotInclude: ['115', '303', '329'],
        desc: 'Accident is NOT assault, theft, or trespass'
    },
    {
        id: 'FP-03',
        text: 'My wife and I had a heated argument about finances.',
        mustNotInclude: ['85', '115', '351'],
        desc: 'Marital argument is NOT necessarily dowry, assault, or intimidation'
    },
    {
        id: 'FP-04',
        text: 'The shopkeeper gave me less items than I paid for.',
        mustNotInclude: ['303', '308', '336'],
        desc: 'Minor consumer dispute is NOT theft, extortion, or forgery'
    },
    {
        id: 'FP-05',
        text: 'My landlord wants to evict me but I have a valid lease agreement.',
        mustNotInclude: ['329', '336', '351'],
        desc: 'Legal eviction dispute is NOT trespass, forgery, or intimidation'
    },
    {
        id: 'FP-06',
        text: 'I saw someone suspicious near my house last night.',
        mustNotInclude: ['329', '303', '351'],
        desc: 'Observation is NOT trespass, theft, or intimidation'
    },
    {
        id: 'FP-07',
        text: 'My boss shouted at me in front of everyone for being late.',
        mustNotInclude: ['351', '115', '308'],
        desc: 'Verbal reprimand at work is NOT criminal intimidation, assault, or extortion'
    },
    {
        id: 'FP-08',
        text: 'The insurance company delayed my claim payment.',
        mustNotInclude: ['318', '316', '308'],
        desc: 'Insurance delay is NOT cheating, breach of trust, or extortion'
    },
];

for (const c of falsePositiveCases) {
    const r = await runRetrieval(c.text);
    const sections = getSections(r);
    const hasUnexpected = c.mustNotInclude.some(s => sections.some(sec => sec.endsWith('-' + s)));
    assert(!hasUnexpected, `${c.id} ${c.desc}: correctly excludes [${c.mustNotInclude}] (got [${sections.slice(0, 4).join(',')}])`, 'false_positive');
    if (hasUnexpected) {
        const fp = c.mustNotInclude.filter(s => sections.some(sec => sec.endsWith('-' + s)));
        warn(`${c.id} FALSE POSITIVE: got [${fp}] — "${c.text.slice(0, 60)}"`, 'false_positive');
    }
}

// ═══════════════════════════════════════════════════════════════
// CATEGORY 5: AMBIGUOUS COMPLAINTS — multiple valid sections
// ═══════════════════════════════════════════════════════════════
console.log('\n══ CATEGORY 5: AMBIGUITY HANDLING ══');

const ambiguousCases = [
    {
        id: 'AMB-01',
        text: 'My husband threw me out of the house and his mother verbally abused me with caste slurs.',
        shouldInclude: { atLeast: ['352', '356'], nice: ['85'] },
        desc: 'Domestic abuse + insult — should get insult sections'
    },
    {
        id: 'AMB-02',
        text: 'Someone copied my business idea and is making money from it. He cheated me.',
        shouldInclude: { atLeast: ['318'], nice: ['316'] },
        desc: 'IP theft — cheating at minimum, possibly breach of trust'
    },
    {
        id: 'AMB-03',
        text: 'My tenant refuses to vacate even though lease expired. He threatened to kill me when I asked.',
        shouldInclude: { atLeast: ['351'], nice: ['329'] },
        desc: 'Threat is primary — intimidation at minimum'
    },
    {
        id: 'AMB-04',
        text: 'My husband\'s family demands more money after marriage and hit me when I refuse.',
        shouldInclude: { atLeast: ['85', '115'], nice: ['115'] },
        desc: 'Post-marriage dowry demand — BNS 85 (cruelty) + 115 (assault)'
    },
];

for (const c of ambiguousCases) {
    const r = await runRetrieval(c.text);
    const sections = getSections(r);
    const hasAtLeast = c.shouldInclude.atLeast.every(s => sections.some(sec => sec.endsWith('-' + s)));
    assert(hasAtLeast, `${c.id} ${c.desc}: got at least [${c.shouldInclude.atLeast}] in [${sections.slice(0, 6).join(',')}]`, 'ambiguous');
}

// ═══════════════════════════════════════════════════════════════
// CATEGORY 6: DIALECT VARIANTS — same meaning, different words
// ═══════════════════════════════════════════════════════════════
console.log('\n══ CATEGORY 6: DIALECT VARIANTS ══');

const dialectCases = [
    {
        id: 'DIAL-01',
        desc: 'Assault — multiple Hindi dialects',
        variants: [
            { text: 'मारपीट की', label: 'Standard Hindi' },
            { text: 'पीट दिया उसने', label: 'Colloquial Hindi' },
            { text: 'लाठी से मारा', label: 'Weapon assault' },
            { text: 'थप्पड़ मारा', label: 'Slap' },
        ],
        mustInclude: ['115']
    },
    {
        id: 'DIAL-02',
        desc: 'Dowry — Hindi vs Urdu vs colloquial',
        variants: [
            { text: 'दहेज के लिए प्रताड़ित करते हैं', label: 'Formal Hindi' },
            { text: 'ससुराल वाले दहेज मांगते हैं', label: 'Colloquial' },
            { text: 'पति ने दहेज के लिए पीटा', label: 'Dowry + assault' },
        ],
        mustInclude: ['85']
    },
    {
        id: 'DIAL-03',
        desc: 'Extortion — multiple phrasings',
        variants: [
            { text: 'हर महीने हफ्ता मांगता है', label: 'Hafta' },
            { text: 'जबरन वसूली करते हैं', label: 'Forcible recovery' },
            { text: 'पैसे नहीं दिए तो दुकान में आग लगा दी', label: 'Arson threat' },
        ],
        mustInclude: ['308']
    },
    {
        id: 'DIAL-04',
        desc: 'Tamil assault variants',
        variants: [
            { text: 'அடித்தார்கள்', label: 'They hit' },
            { text: 'தாக்குதல் நடத்தினார்கள்', label: 'They attacked' },
            { text: 'கத்தியைக் காட்டி மிரட்டுகிறார்கள்', label: 'Knife threat' },
        ],
        mustInclude: ['115']
    },
    {
        id: 'DIAL-05',
        desc: 'Telugu stalking variants',
        variants: [
            { text: 'వెంటపడ్డాడు', label: 'He followed' },
            { text: 'స్టాకింగ్ చేశాడు', label: 'He stalked' },
            { text: 'ఫోటోలు మార్ఫ్ చేశారు', label: 'Morphed photos' },
        ],
        mustInclude: ['74', '75']
    },
];

for (const group of dialectCases) {
    for (const v of group.variants) {
        const r = await runRetrieval(v.text);
        const sections = getSections(r);
        const allExpected = group.mustInclude.every(s => sections.some(sec => sec.endsWith('-' + s)));
        assert(allExpected, `${group.id} [${v.label}]: expected [${group.mustInclude}] in [${sections.slice(0, 5).join(',')}]`, 'dialect');
    }
}

// ═══════════════════════════════════════════════════════════════
// CATEGORY 7: SECTION COMPLETENESS — all expected sections present
// ═══════════════════════════════════════════════════════════════
console.log('\n══ CATEGORY 7: SECTION COMPLETENESS ══');

const completenessCases = [
    {
        id: 'COMP-01',
        text: 'My husband beats me daily, his mother demands dowry, and they threw me out of the house.',
        expected: { primary: ['85', '115'], secondary: ['117', '118'] },
        desc: 'Multi-aspect domestic violence — should get dowry + assault + related'
    },
    {
        id: 'COMP-02',
        text: 'My partner forged my signature on property documents, sold the land, and threatened to kill me if I complained.',
        expected: { primary: ['336', '351'], secondary: ['318', '308'] },
        desc: 'Forgery + intimidation — should get both primary crimes'
    },
    {
        id: 'COMP-03',
        text: 'Goons come every week, beat me up, take money by force, and say they will burn my shop if I go to police. They extort 5000 rupees every month.',
        expected: { primary: ['308', '115', '351'], secondary: [] },
        desc: 'Extortion + assault + threat — all three should appear'
    },
    {
        id: 'COMP-04',
        text: 'My landlord forged the rental agreement with fake documents, demanded extra money illegally, and when I refused, he broke into my flat and locked me out.',
        expected: { primary: ['336', '329'], secondary: ['318'] },
        desc: 'Forgery + trespass — should get both'
    },
];

for (const c of completenessCases) {
    const r = await runRetrieval(c.text);
    const sections = getSections(r);
    const primaryPresent = c.expected.primary.every(s => sections.some(sec => sec.endsWith('-' + s)));
    assert(primaryPresent, `${c.id} ${c.desc}: primary [${c.expected.primary}] present in [${sections.slice(0, 8).join(',')}]`, 'completeness');

    if (c.expected.secondary.length) {
        const secondaryPresent = c.expected.secondary.filter(s => sections.some(sec => sec.endsWith('-' + s)));
        if (secondaryPresent.length < c.expected.secondary.length) {
            const missed = c.expected.secondary.filter(s => !sections.some(sec => sec.endsWith('-' + s)));
            warn(`${c.id} Secondary sections missed: [${missed}] (got [${secondaryPresent}])`, 'completeness_secondary');
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// CATEGORY 8: BHASHINI NORMALIZATION — direct concept check
// ═══════════════════════════════════════════════════════════════
console.log('\n══ CATEGORY 8: BHASHINI CONCEPT DETECTION ══');

const bhashiniCases = [
    { id: 'BH-01', text: 'मारपीट की उसने', expectConcept: 'assault_hurt' },
    { id: 'BH-02', text: 'धमकी दी जान से मारने की', expectConcept: 'criminal_intimidation' },
    { id: 'BH-03', text: 'दहेज के लिए प्रताड़ित किया', expectConcept: 'dowry_domestic_cruelty' },
    { id: 'BH-04', text: 'चोरी कर लिया सामान', expectConcept: 'theft' },
    { id: 'BH-05', text: 'हफ्ता मांगता है हर महीने', expectConcept: 'extortion' },
    { id: 'BH-06', text: 'फर्जी दस्तावेज बनाए', expectConcept: 'forgery' },
    { id: 'BH-07', text: 'फोटो वायरल कर दी उसने', expectConcept: 'privacy_violation' },
    { id: 'BH-08', text: 'जमीन पर कब्जा कर लिया', expectConcept: 'criminal_trespass_encroachment' },
    { id: 'BH-09', text: 'गाली दी और बेइज्जत किया', expectConcept: 'intentional_insult' },
    { id: 'BH-10', text: 'अमानत में खयानत की', expectConcept: 'breach_of_trust' },
    { id: 'BH-11', text: 'धोखे से पैसे ले गया', expectConcept: 'cheating_fraud' },
    { id: 'BH-12', text: 'पुलिस ने FIR दर्ज नहीं की', expectConcept: 'police_fir_refusal' },
];

for (const c of bhashiniCases) {
    const b = normalizeWithBhashini(c.text);
    const has = b.normalizedConcepts.includes(c.expectConcept);
    assert(has, `${c.id} concept '${c.expectConcept}' detected in '${c.text}' (got: ${b.normalizedConcepts})`, 'bhashini');
}

// ═══════════════════════════════════════════════════════════════
// CATEGORY 9: FULL PIPELINE — safety + retrieval + entity extraction
// ═══════════════════════════════════════════════════════════════
console.log('\n══ CATEGORY 9: FULL PIPELINE CHECK ══');

const pipelineCases = [
    {
        id: 'PIPE-01', lang: 'hi',
        text: 'मेरे पति और ससुराल वाले मुझसे दहेज की मांग करते हैं और पीटते हैं।',
        safetyShouldPass: true,
        expectSections: ['85', '115'],
        expectEntities: ['women_safety'],
    },
    {
        id: 'PIPE-02', lang: 'en',
        text: 'Someone stole my phone from the bus.',
        safetyShouldPass: true,
        expectSections: ['303'],
        expectEntities: ['theft'],
    },
    {
        id: 'PIPE-03', lang: 'en',
        text: 'I am feeling sad today.',
        safetyShouldPass: true,
        expectSections: [],
        expectEntities: [],
        shouldNotBeActionable: true,
    },
];

for (const c of pipelineCases) {
    // Safety
    const safety = screenInput(c.text);
    assert(safety.ok === c.safetyShouldPass, `${c.id} safety: ${safety.ok === c.safetyShouldPass ? 'correctly passed' : 'INCORRECTLY blocked (' + safety.reasons.join(',') + ')'}`, 'pipeline');

    if (safety.allowed) {
        // Retrieval
        const r = await runRetrieval(c.text);
        const sections = getSections(r);
        if (c.expectSections.length) {
            const allPresent = c.expectSections.every(s => sections.some(sec => sec.endsWith('-' + s)));
            assert(allPresent, `${c.id} retrieval: [${c.expectSections}] in [${sections.slice(0, 5).join(',')}]`, 'pipeline');
        }

        // Entity extraction
        if (c.expectEntities.length) {
            const entities = extractEntitiesRuleBased(c.text);
            const catPresent = c.expectEntities.some(e => entities.category === e || entities.category?.includes(e));
            assert(catPresent, `${c.id} category: '${entities.category}' contains [${c.expectEntities}]`, 'pipeline');
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════
console.log('\n' + '═'.repeat(60));
console.log(`QA TEST RESULTS: ${passed} passed, ${failed} failed, ${warnings} warnings, ${total} total`);
console.log('═'.repeat(60));

if (failures.length) {
    console.log('\nFAILURES:');
    for (const f of failures) console.log(`  ✖ [${f.category}] ${f.msg}`);
}

if (warns.length) {
    console.log('\nWARNINGS:');
    for (const w of warns) console.log(`  ⚠ [${w.category}] ${w.msg}`);
}

process.exit(failed > 0 ? 1 : 0);
