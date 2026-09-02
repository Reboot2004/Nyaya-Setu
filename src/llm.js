// WebLLM client-side inference module — Llama 3.2 1B Instruct via WebGPU (MLC runtime)
// Zero-Friction Hybrid Architecture: Runs local WebGPU LLM when supported, with robust regex + Indic NLP extraction and full 8-language Indian Police complaint generator.
import * as webllm from '@mlc-ai/web-llm';

const MODEL_CANDIDATES = [
    'Llama-3.2-1B-Instruct-q4f32_1-MLC',
    'Llama-3.2-1B-Instruct-q4f16_1-MLC'
];

let engine = null;
let activeModelId = null;
let loadingProgressCb = null;

export function onLoadingProgress(cb) {
    loadingProgressCb = cb;
}

export function getActiveModelId() {
    return activeModelId;
}

async function createEngine(modelId) {
    return webllm.CreateMLCEngine(modelId, {
        initProgressCallback: (report) => {
            if (loadingProgressCb) loadingProgressCb(report);
        },
        context_window_size: 2048,
        sliding_window_size: -1
    });
}

export async function ensureEngine() {
    if (engine) return engine;
    let lastErr;
    for (const modelId of MODEL_CANDIDATES) {
        try {
            engine = await createEngine(modelId);
            activeModelId = modelId;
            engine.reload?.catch?.(() => { });
            return engine;
        } catch (err) {
            console.warn(`Model ${modelId} failed, trying next candidate:`, err);
            lastErr = err;
            try { engine?.unload?.(); } catch { /* ignore */ }
            engine = null;
        }
    }
    throw new Error(
        'WebGPU engine could not start on this device. Using instant on-device rule engine.'
    );
}

export function resetEngine() {
    try { engine?.unload?.(); } catch { /* ignore */ }
    engine = null;
    activeModelId = null;
}

export function isWebGPUSupported() {
    return typeof navigator !== 'undefined' && 'gpu' in navigator;
}

export function normalizeLanguageCode(code) {
    const raw = (code || 'en').toLowerCase().trim();
    if (raw.startsWith('hi')) return 'hi';
    if (raw.startsWith('te')) return 'te';
    if (raw.startsWith('ta')) return 'ta';
    if (raw.startsWith('bn')) return 'bn';
    if (raw.startsWith('mr')) return 'mr';
    if (raw.startsWith('kn')) return 'kn';
    if (raw.startsWith('ml')) return 'ml';
    return 'en';
}

export function detectLanguage(text) {
    if (!text) return 'en';

    // Unicode block heuristics
    if (/[\u0900-\u097F]/.test(text)) {
        // Marathi specific words
        if (/\b(आहे|झाले|केले|माझे|त्यांनी|पोलीस|तक्रार)\b/i.test(text)) return 'mr';
        return 'hi';
    }
    if (/[\u0C00-\u0C7F]/.test(text)) return 'te';
    if (/[\u0B80-\u0BFF]/.test(text)) return 'ta';
    if (/[\u0980-\u09FF]/.test(text)) return 'bn';
    if (/[\u0C80-\u0CFF]/.test(text)) return 'kn';
    if (/[\u0D00-\u0D7F]/.test(text)) return 'ml';

    // Romanized keyword heuristics
    const lower = text.toLowerCase();
    const hintsByLang = {
        te: ['garu', 'chesaru', 'kottaru', 'dabbulu', 'nannu', 'police station', 'anamata'],
        hi: ['mera', 'meri', 'usne', 'maara', 'paisa', 'dhamki', 'diya', 'thana', 'gali', 'rok'],
        mr: ['majhe', 'tyani', 'marhan', 'dhamki', 'thana', 'kele', 'ahe'],
        ta: ['ennai', 'adithargal', 'panam', 'mirattal', 'kavalthurai'],
        bn: ['amar', 'tara', 'marpeet', 'taka', 'thana', 'hukm'],
        kn: ['nanna', 'hodidaru', 'hana', 'bedarike', 'thana'],
        ml: ['enne', 'adichu', 'panam', 'bheeshani', 'police']
    };

    for (const [lang, hints] of Object.entries(hintsByLang)) {
        if (hints.some((h) => lower.includes(h))) return lang;
    }

    return 'en';
}

/**
 * Robust Regex & Heuristic Fact Extractor for Vernacular & English complaints.
 * Extracts: Complainant Name, Accused Name, Date, Location, Harm/Offence Category, and Summary.
 */
export function extractEntitiesRuleBased(narrative) {
    const text = (narrative || '').trim();
    let complainantName = 'unknown';
    let parentName = 'unknown';
    let aggressor = 'unknown';
    let incidentDate = 'unknown';
    let incidentLoc = 'unknown';
    let category = 'needs_human_review';

    // 1. Extract Complainant Name
    const nameMatches = [
        /(?:my name is|i am|myself|mera naam|main|naa peru|en peyar|amar naam|majhe naav)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?|[^\s,।.]+)/i,
        /(?:naam|name)\s*[:=-]\s*([A-Za-z\u0900-\u0D7F]+(?:\s+[A-Za-z\u0900-\u0D7F]+)?)/i,
        /(?:nenu|main|me)\s+([A-Za-z\u0900-\u0D7F]+)\s+(?:ani|bol raha|here)/i
    ];
    for (const pat of nameMatches) {
        const m = text.match(pat);
        if (m && m[1] && m[1].length > 2 && !/^(the|a|an|on|in|at|yesterday|today|sir)$/i.test(m[1])) {
            complainantName = m[1].trim();
            break;
        }
    }

    // 2. Extract Parent/Spouse
    const parentMatches = [
        /(?:s\/o|d\/o|w\/o|son of|daughter of|wife of|pita|husband|father)\s+([A-Za-z\u0900-\u0D7F]+(?:\s+[A-Za-z\u0900-\u0D7F]+)?)/i
    ];
    for (const pat of parentMatches) {
        const m = text.match(pat);
        if (m && m[1]) {
            parentName = m[1].trim();
            break;
        }
    }

    // 3. Extract Accused / Aggressor
    const accusedMatches = [
        /(?:accused|by|against|ne maara|ne dhamki di|attacked by|threatened by|beaten by)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?|[A-Za-z\u0900-\u0D7F]+(?:\s+(?:and|aur|mariyu)\s+[A-Za-z\u0900-\u0D7F]+)?)/i,
        /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:and\s+\d+\s+others|aur\s+uske\s+sathi|mariyu\s+itharulu|blocked my path|threatened|assaulted|attacked|hit me)/i,
        /(?:named|vyakti|shakhs)\s+([A-Z][a-z]+|[A-Za-z\u0900-\u0D7F]+)/i
    ];
    for (const pat of accusedMatches) {
        const m = text.match(pat);
        if (m && m[1] && m[1].length > 2 && !/^(the|a|an|on|in|at|yesterday|today|my|me|i)$/i.test(m[1])) {
            aggressor = m[1].trim();
            break;
        }
    }

    // 4. Extract Date / Time
    const dateMatches = [
        /(?:on|dated|dinank|roju|thethi|tarikh)?\s*(\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(?:\d{2,4})?)/i,
        /(\d{1,2}[-\/.]\d{1,2}[-\/.]\d{2,4})/,
        /\b(yesterday|kal|ninna|netru|gatakal|aaj|today)\b/i
    ];
    for (const pat of dateMatches) {
        const m = text.match(pat);
        if (m && m[1]) {
            incidentDate = m[1].trim();
            break;
        }
    }

    // 5. Extract Location
    const locMatches = [
        /(?:near|at|in|outside|opposite|sthal|jagah|daggara|idathil|jaayga)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*|[A-Za-z\u0900-\u0D7F]+(?:\s+[A-Za-z\u0900-\u0D7F]+){1,3})/i,
        /(?:village|colony|nagar|bazar|chowk|station|road|street|mandi|office)\s+([A-Za-z\u0900-\u0D7F]+)/i
    ];
    for (const pat of locMatches) {
        const m = text.match(pat);
        if (m && m[1] && m[1].length > 2 && !/^(the|a|an|my|me|i|his|her|this|that)$/i.test(m[1])) {
            incidentLoc = m[1].trim();
            break;
        }
    }

    // 6. Offence Category Classification
    const low = text.toLowerCase();
    if (/marpit|assault|hit|beaten|laathi|hurt|fracture|blood|attack|chot|injury|raktham/i.test(low)) category = 'assault';
    else if (/dhamki|threat|intimidation|warned|gali|abuse|bedirimpulu/i.test(low)) category = 'intimidation';
    else if (/fraud|cheat|dhokha|chori|stole|theft|robbery|extortion|paisa|wage|salary|property/i.test(low)) category = 'property_fraud';
    else if (/woman|chhed|modesty|molest|dowry|dahej|husband|wife|cruelty/i.test(low)) category = 'women_safety';

    return {
        summary: text.slice(0, 300),
        complainantName,
        parentName,
        aggressor,
        date: incidentDate,
        location: incidentLoc,
        category,
        events: [text]
    };
}

export async function extractEntities(narrative) {
    const ruleEntities = extractEntitiesRuleBased(narrative);

    if (!isWebGPUSupported()) {
        return ruleEntities;
    }

    try {
        const eng = await ensureEngine();
        const messages = [
            {
                role: 'system',
                content:
                    'You are a legal intake assistant for Indian Police FIR complaints. Extract factual details from a citizen grievance narrative. Reply ONLY with compact JSON: {"summary": "<factual summary without prayers>", "complainantName": "<name or unknown>", "parentName": "<father/spouse or unknown>", "aggressor": "<accused name/description or unknown>", "date": "<date or current>", "location": "<Indian place or unknown>", "category": "<assault|intimidation|property_fraud|women_safety|procedure>"}'
            },
            { role: 'user', content: narrative }
        ];
        const reply = await eng.chat.completions.create({ messages, temperature: 0.1, max_tokens: 400 });
        const raw = reply.choices[0]?.message?.content ?? '{}';
        const jsonStart = raw.indexOf('{');
        const jsonEnd = raw.lastIndexOf('}');
        const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));

        // Blend LLM output with rule-based fallback to ensure high entity recall
        return {
            summary: parsed.summary || ruleEntities.summary,
            complainantName: parsed.complainantName && parsed.complainantName !== 'unknown' ? parsed.complainantName : ruleEntities.complainantName,
            parentName: parsed.parentName && parsed.parentName !== 'unknown' ? parsed.parentName : ruleEntities.parentName,
            aggressor: parsed.aggressor && parsed.aggressor !== 'unknown' ? parsed.aggressor : ruleEntities.aggressor,
            date: parsed.date && parsed.date !== 'unknown' ? parsed.date : ruleEntities.date,
            location: parsed.location && parsed.location !== 'unknown' ? parsed.location : ruleEntities.location,
            category: parsed.category || ruleEntities.category,
            events: [narrative]
        };
    } catch {
        return ruleEntities;
    }
}

/**
 * Standard Indian Police FIR Complaint Formatter across 8 Indian Languages.
 * Structure follows Section 173 BNSS (2023) / Section 154 CrPC (1973).
 */
function buildProfessionalPoliceComplaint(complainantInfo, entities, retrieved, selectedLang) {
    const lang = normalizeLanguageCode(selectedLang) || 'en';
    const todayDate = new Date().toLocaleDateString('en-IN');

    const cName = (complainantInfo?.name || '').trim() || (entities?.complainantName && entities.complainantName !== 'unknown' ? entities.complainantName : 'The Complainant (Identity as per signature below)');
    const cParent = (complainantInfo?.parent || '').trim() || (entities?.parentName && entities.parentName !== 'unknown' ? entities.parentName : '');
    const cPhone = (complainantInfo?.phone || '').trim();
    const cAddress = (complainantInfo?.address || '').trim() || (complainantInfo?.geoSnapshot || 'Resident within the territorial jurisdiction of this Police Station');
    const psName = (complainantInfo?.station || '').trim() || 'Jurisdictional Police Station / District';
    const incidentLoc = (complainantInfo?.location || '').trim() || (entities?.location && entities.location !== 'unknown' ? entities.location : 'Within the territorial jurisdiction of this Police Station');
    const aggressor = (complainantInfo?.accused || '').trim() || (entities?.aggressor && entities.aggressor !== 'unknown' ? entities.aggressor : 'The Accused Person(s) / As described in Statement of Facts');
    const incidentDate = (complainantInfo?.date || '').trim() || (entities?.date && entities.date !== 'unknown' ? entities.date : 'Not specified by complainant');
    const summaryFacts = (entities?.summary || complainantInfo?.narrative || 'Facts require completion by complainant.').trim();

    const sectionsList = (Array.isArray(retrieved) && retrieved.length)
        ? retrieved.map(({ statute }) => `${statute.code} Section ${statute.section} (${(statute.title || '').split('(')[0].trim()})`).join(', ')
        : 'Suggested under general cognizable offences provisions (BNSS Section 173).';

    // 1. ENGLISH DRAFT
    const englishDraft = 
`TO,
THE STATION HOUSE OFFICER / OFFICER-IN-CHARGE,
POLICE STATION: ${psName.toUpperCase()}

SUBJECT: WRITTEN POLICE COMPLAINT UNDER SECTION 173 BHARATIYA NAGARIK SURAKSHA SANHITA (BNSS), 2023 FOR REGISTRATION OF FIR AND PROMPT INVESTIGATION.

1. COMPLAINANT PARTICULARS:
   • Full Name: ${cName}${cParent ? ` (S/o, D/o, W/o: ${cParent})` : ''}
   • Residential Address: ${cAddress}
   • Contact Number: ${cPhone || 'Provided at station'}

2. PARTICULARS OF ACCUSED PERSON(S):
   • Name(s) / Description: ${aggressor}

3. DATE, TIME AND PLACE OF OCCURRENCE:
   • Date / Time: ${incidentDate}
   • Place of Incident: ${incidentLoc}

4. STATEMENT OF FACTS:
   I, the Complainant named above, solemnly state the chronological facts of the incident as follows:
   (a) On or about ${incidentDate}, at / near ${incidentLoc}, the above-named accused person(s) committed the following alleged acts against me:
   (b) ${summaryFacts}
   (c) The aforementioned acts caused severe harm, alarm, and distress to me and constitute cognizable offences under the law.

5. SUGGESTED STATUTORY PROVISIONS (FOR VERIFICATION):
   Based on the alleged facts, the following penal provisions are attracted and submitted for official registration:
   • ${sectionsList}

6. PRAYER FOR STATUTORY ACTION:
   In view of the aforesaid facts, it is formally requested that:
   (i) An FIR be immediately registered under Section 173 BNSS, 2023 against the accused person(s);
   (ii) Prompt investigation be initiated to secure evidence and apprehend the perpetrators;
   (iii) A free copy of the registered FIR be furnished to me forthwith as per Section 173(2) BNSS.

VERIFICATION:
I verify that the contents of paragraphs 1 to 4 above are true and correct to my knowledge and belief.

Date: ${todayDate}
Place: ${incidentLoc}

_____________________________
Signature / Thumb Impression of Complainant
Name: ${cName}
Contact: ${cPhone || '________________'}`;

    // 2. HINDI DRAFT
    const hindiDraft = 
`सेवा में,
थाना प्रभारी महोदय,
थाना: ${psName}

विषय: भारतीय नागरिक सुरक्षा संहिता (BNSS), 2023 की धारा 173 के तहत प्रथम सूचना रिपोर्ट (FIR) दर्ज करने एवं निष्पक्ष जांच हेतु लिखित शिकायत।

1. शिकायतकर्ता का विवरण:
   • पूरा नाम: ${cName}${cParent ? ` (आत्मज/पत्नी: ${cParent})` : ''}
   • स्थायी पता: ${cAddress}
   • मोबाइल नंबर: ${cPhone || 'थाने में उपलब्ध कराया जाएगा'}

2. आरोपी व्यक्ति(यों) का विवरण:
   • नाम / विवरण: ${aggressor}

3. घटना का दिनांक, समय एवं स्थान:
   • दिनांक / समय: ${incidentDate}
   • घटनास्थल: ${incidentLoc}

4. घटना का विवरण (तथ्य):
   मैं, शिकायतकर्ता, शपथपूर्वक निम्नलिखित तथ्य प्रस्तुत करता/करती हूँ:
   (क) दिनांक ${incidentDate} को स्थान / निकट ${incidentLoc} पर उपरोक्त आरोपी व्यक्ति(यों) ने मेरे साथ निम्न कथित अपराध किया:
   (ख) ${summaryFacts}
   (ग) उक्त कृत्यों से मुझे गंभीर क्षति एवं भय उत्पन्न हुआ है जो भारतीय कानून के तहत संज्ञेय अपराध की श्रेणी में आता है।

5. लागू वैधानिक धाराएं (सत्यापन हेतु):
   • ${sectionsList}

6. कानूनी कार्रवाई हेतु औपचारिक मांग (Prayer):
   अतः श्रीमान से औपचारिक निवेदन है कि:
   (1) BNSS 2023 की धारा 173 के तहत तुरंत FIR दर्ज की जाए;
   (2) मामले की निष्पक्ष जांच कर आरोपियों के विरुद्ध सख्त कानूनी कार्रवाई की जाए;
   (3) धारा 173(2) BNSS के अंतर्गत मुझे दर्ज FIR की निशुल्क प्रति उपलब्ध कराई जाए।

सत्यापन:
मैं प्रमाणित करता/करती हूँ कि ऊपर वर्णित सभी तथ्य मेरी व्यक्तिगत जानकारी के अनुसार पूर्णतः सत्य एवं सही हैं।

दिनांक: ${todayDate}
स्थान: ${incidentLoc}

_____________________________
शिकायतकर्ता के हस्ताक्षर / अंगूठा
नाम: ${cName}
मोबाइल: ${cPhone || '________________'}`;

    // 3. TELUGU DRAFT
    const teluguDraft = 
`గౌరవనీయులైన స్టేషన్ హౌస్ ఆఫీసర్ గారికి,
పోలీస్ స్టేషన్: ${psName}

విషయం: భారతీయ నాగరిక్ సురక్ష సంహిత (BNSS) 2023 లోని సెక్షన్ 173 ప్రకారం ఎఫ్.ఐ.ఆర్ (FIR) నమోదు మరియు సత్వర విచారణ కొరకు లిఖితపూర్వక ఫిర్యాదు.

1. ఫిర్యాదుదారుని వివరాలు:
   • పూర్తి పేరు: ${cName}${cParent ? ` (తండ్రి/భర్త: ${cParent})` : ''}
   • నివాస చిరునామా: ${cAddress}
   • ఫోన్ నంబర్: ${cPhone || 'స్టేషన్‌లో అందించబడుతుంది'}

2. నిందితుని వివరాలు:
   • పేరు / వివరణ: ${aggressor}

3. సంఘటన జరిగిన తేదీ మరియు స్థలం:
   • తేదీ: ${incidentDate}
   • సంఘటనా స్థలం: ${incidentLoc}

4. సంఘటన వాస్తవాలు:
   (ఎ) ${incidentDate} తేదీన, ${incidentLoc} వద్ద పైన పేర్కొన్న నిందితుడు నాపై దౌర్జన్యపూరితమైన నేరానికి పాల్పడ్డాడు.
   (బి) ${summaryFacts}
   (సి) ఈ సంఘటన వలన నాకు తీవ్రమైన నష్టం మరియు ఆందోళన కలిగింది.

5. వర్తించే చట్ట విభాగాలు:
   • ${sectionsList}

6. చట్టబద్ధమైన అభ్యర్థన:
   (1) BNSS సెక్షన్ 173 ప్రకారం వెంటనే FIR నమోదు చేయాలని;
   (2) నిందితులపై చట్టరీత్యా కఠిన చర్యలు తీసుకోవాలని;
   (3) సెక్షన్ 173(2) BNSS ప్రకారం ఉచిత FIR కాపీని అందించాలని కోరుతున్నాను.

ధృవీకరణ:
పైన పేర్కొన్న వివరాలన్నీ నా వ్యక్తిగత పరిజ్ఞానం ప్రకారం పూర్తిగా నిజమైనవని ధృవీకరిస్తున్నాను.

తేదీ: ${todayDate}
స్థలం: ${incidentLoc}

సంతకం: _____________________________ (${cName})`;

    // 4. TAMIL DRAFT
    const tamilDraft = 
`பெறுநர்,
காவல் நிலைய ஆய்வாளர் / பொறுப்பு அதிகாரி அவர்கள்,
காவல் நிலையம்: ${psName}

பொருள்: பாரதிய நாகரிக் சுரக்ஷா சன்ஹிதா (BNSS) 2023 பிரிவு 173-ன் கீழ் எஃப்.ஐ.ஆர் (FIR) பதிவு செய்து உரிய விசாரணை நடத்த எழுத்துப்பூர்வ புகார்.

1. புகார்தாரர் விவரங்கள்:
   • முழுப் பெயர்: ${cName}${cParent ? ` (தந்தை/கணவர் பெயர்: ${cParent})` : ''}
   • முகவரி: ${cAddress}
   • தொலைபேசி: ${cPhone || 'காவல் நிலையத்தில் வழங்கப்படும்'}

2. குற்றம் சாட்டப்பட்டவர் விவரம்:
   • பெயர் / விவரம்: ${aggressor}

3. சம்பவம் நடந்த தேதி மற்றும் இடம்:
   • தேதி: ${incidentDate}
   • இடம்: ${incidentLoc}

4. சம்பவத்தின் விவரம்:
   (அ) ${incidentDate} அன்று ${incidentLoc} பகுதியில் மேற்கண்ட நபர் என் மீது அத்துமீறி குற்றம் புரிந்தார்.
   (ஆ) ${summaryFacts}

5. பொருந்தக்கூடிய சட்டப் பிரிவுகள்:
   • ${sectionsList}

6. சட்டப்பூர்வ கோரிக்கை:
   (1) BNSS பிரிவு 173-ன் கீழ் உடனடியாக எஃப்.ஐ.ஆர் பதிவு செய்யப்பட வேண்டும்;
   (2) உரிய விசாரணை நடத்தி சட்டப்படி நடவடிக்கை எடுக்கப்பட வேண்டும்;
   (3) BNSS பிரிவு 173(2)-ன் கீழ் பதிவு செய்யப்பட்ட எஃப்.ஐ.ஆர் நகலை இலவசமாக வழங்க வேண்டும்.

தேதி: ${todayDate}
இடம்: ${incidentLoc}

கையொப்பம்: _____________________________ (${cName})`;

    // 5. BENGALI DRAFT
    const bengaliDraft = 
`বরাবরে,
ভারপ্রাপ্ত আধিকারিক মহাশয়,
থানা: ${psName}

বিষয়: ভারতীয় নাগরিক সুরক্ষা সংহিতা (BNSS) ২০২৩-এর ধারা ১৭৩ অনুযায়ী এফআইআর (FIR) রুজু এবং নিরপেক্ষ তদন্তের জন্য লিখিত অভিযোগ।

১. অভিযোগকারীর বিবরণ:
   • পুরো নাম: ${cName}${cParent ? ` (পিতা/স্বামীর নাম: ${cParent})` : ''}
   • ঠিকানা: ${cAddress}
   • ফোন নম্বর: ${cPhone || 'থানায় জমা দেওয়া হবে'}

২. অভিযুক্ত ব্যক্তির বিবরণ:
   • নাম / বিবরণ: ${aggressor}

৩. ঘটনার তারিখ ও স্থান:
   • তারিখ: ${incidentDate}
   • ঘটনাস্থল: ${incidentLoc}

৪. ঘটনার বিবরণ (তথ্য):
   (ক) ${incidentDate} তারিখে ${incidentLoc} সংলগ্ন এলাকায় উক্ত অভিযুক্ত ব্যক্তি(রা) আমার ওপর অন্যায় ও অপরাধমূলক কাজ করেছে।
   (খ) ${summaryFacts}

৫. প্রযোজ্য আইনগত ধারা:
   • ${sectionsList}

৬. আইনি পদক্ষেপের প্রার্থনা:
   (১) BNSS ১৭৩ ধারায় অবিলম্বে এফআইআর নথিভুক্ত করা হোক;
   (২) ঘটনার সুষ্ঠু তদন্ত করে উপযুক্ত আইনি ব্যবস্থা নেওয়া হোক;
   (৩) BNSS ১৭৩(২) ধারা অনুযায়ী আমাকে বিনামূল্যে এফআইআর-এর কপি প্রদান করা হোক।

তারিখ: ${todayDate}
স্থান: ${incidentLoc}

স্বাক্ষর: _____________________________ (${cName})`;

    // 6. MARATHI DRAFT
    const marathiDraft = 
`प्रति,
मा. पोलीस निरीक्षक / ठाणे अंमलदार साहेब,
पोलीस ठाणे: ${psName}

विषय: भारतीय नागरिक सुरक्षा संहिता (BNSS) २०२३ च्या कलम १७३ अन्वये एफ.आय.आर. (FIR) नोंदवून योग्य तपास करणेबाबत लेखी तक्रार.

१. तक्रारदाराचा तपशील:
   • पूर्ण नाव: ${cName}${cParent ? ` (वडील/पती: ${cParent})` : ''}
   • पत्ता: ${cAddress}
   • मोबाईल: ${cPhone || 'ठाण्यात दिला जाईल'}

२. आरोपीचा तपशील:
   • नाव / वर्णन: ${aggressor}

३. घटना दिनांक व ठिकाण:
   • दिनांक: ${incidentDate}
   • घटनास्थळ: ${incidentLoc}

४. घटनेची हकीकत (तथ्ये):
   (अ) दिनांक ${incidentDate} रोजी ${incidentLoc} येथे आरोपीने माझ्यावर बेकायदेशीर कृत्य केले.
   (ब) ${summaryFacts}

५. लागू कायदेशीर कलमे:
   • ${sectionsList}

६. कायदेशीर मागणी (Prayer):
   (१) BNSS कलम १७३ नुसार तात्काळ FIR नोंदवावी;
   (२) प्रकरणाचा सखोल तपास करून आरोपींवर कायदेशीर कारवाई करावी;
   (३) कलम १७३(२) नुसार मला मोफत FIR प्रत द्यावी.

दिनांक: ${todayDate}
ठिकाण: ${incidentLoc}

स्वाक्षरी: _____________________________ (${cName})`;

    // 7. KANNADA DRAFT
    const kannadaDraft = 
`ಗೆ,
ಠಾಣಾಧಿಕಾರಿಗಳು,
ಪೊಲೀಸ್ ಠಾಣೆ: ${psName}

ವಿಷಯ: ಭಾರತೀಯ ನಾಗರಿಕ ಸುರಕ್ಷಾ ಸಂಹಿತೆ (BNSS) 2023 ರ ಕಲಂ 173 ರ ಅಡಿಯಲ್ಲಿ ಎಫ್.ಐ.ಆರ್ (FIR) ದಾಖಲಿಸಿ ತನಿಖೆ ಕೈಗೊಳ್ಳುವಂತೆ ಲಿಖಿತ ದೂರು.

೧. ದೂರುದಾರರ ವಿವರ:
   • ಪೂರ್ಣ ಹೆಸರು: ${cName}${cParent ? ` (ತಂದೆ/ಗಂಡನ ಹೆಸರು: ${cParent})` : ''}
   • ವಿಳಾಸ: ${cAddress}
   • ದೂರವಾಣಿ: ${cPhone || 'ಠಾಣೆಯಲ್ಲಿ ಒದಗಿಸಲಾಗುವುದು'}

೨. ಆರೋಪಿಯ ವಿವರ:
   • ಹೆಸರು / ವಿವರ: ${aggressor}

೩. ಘಟನೆಯ ದಿನಾಂಕ ಮತ್ತು ಸ್ಥಳ:
   • ದಿನಾಂಕ: ${incidentDate}
   • ಸ್ಥಳ: ${incidentLoc}

೪. ಘಟನೆಯ ಸಾರಾಂಶ:
   (ಎ) ${incidentDate} ರಂದು ${incidentLoc} ಬಳಿ ಆರೋಪಿಗಳು ನನ್ನ ಮೇಲೆ ದೌರ್ಜನ್ಯವೆಸಗಿದ್ದಾರೆ.
   (ಬಿ) ${summaryFacts}

೫. ಅನ್ವಯವಾಗುವ ಕಾನೂನು ವಿಧಿಗಳು:
   • ${sectionsList}

೬. ಕಾನೂನು ಕ್ರಮಕ್ಕಾಗಿ ಪ್ರಾರ್ಥನೆ:
   (೧) BNSS ಕಲಂ 173 ರ ಅಡಿಯಲ್ಲಿ ತಕ್ಷಣವೇ FIR ದಾಖಲಿಸಬೇಕು;
   (೨) ತನಿಖೆ ನಡೆಸಿ ಆರೋಪಿಗಳ ವಿರುದ್ಧ ಕಾನೂನು ಕ್ರಮ ಜರುಗಿಸಬೇಕು;
   (೩) ಕಲಂ 173(2) ರ ಪ್ರಕಾರ ನನಗೆ ಉಚಿತ FIR ಪ್ರತಿಯನ್ನು ನೀಡಬೇಕು.

ದಿನಾಂಕ: ${todayDate}
ಸ್ಥಳ: ${incidentLoc}

ಸಹಿ: _____________________________ (${cName})`;

    // 8. MALAYALAM DRAFT
    const malayalamDraft = 
`സ്വീകർത്താവ്,
സ്റ്റേഷൻ ഹൗസ് ഓഫീസർ,
പോലീസ് സ്റ്റേഷൻ: ${psName}

വിഷയം: ഭാരതീയ നാഗരിക് സുരക്ഷാ സംഹിത (BNSS) 2023 ലെ സെക്ഷൻ 173 പ്രകാരം എഫ്.ഐ.ആർ (FIR) രജിസ്റ്റർ ചെയ്യുന്നതിനുള്ള രേഖാമൂലമുള്ള പരാതി.

1. പരാതിക്കാരന്റെ വിവരങ്ങൾ:
   • മുഴുവൻ പേര്: ${cName}${cParent ? ` (പിതാവ്/ഭർത്താവ്: ${cParent})` : ''}
   • വിലാസം: ${cAddress}
   • ഫോൺ: ${cPhone || 'സ്റ്റേഷനിൽ നൽകും'}

2. പ്രതിയുടെ വിവരങ്ങൾ:
   • പേര് / വിവരണം: ${aggressor}

3. സംഭവം നടന്ന തീയതിയും സ്ഥലവും:
   • തീയതി: ${incidentDate}
   • സ്ഥലം: ${incidentLoc}

4. സംഭവത്തിന്റെ വിവരണം:
   (എ) ${incidentDate} തീയതിയിൽ ${incidentLoc} വച്ച് പ്രതി എനിക്കെതിരെ അക്രമം നടത്തി.
   (ബി) ${summaryFacts}

5. ബാധകമായ നിയമ വകുപ്പുകൾ:
   • ${sectionsList}

6. നിയമപരമായ ആവശ്യം:
   (1) BNSS സെക്ഷൻ 173 പ്രകാരം ഉടൻ FIR രജിസ്റ്റർ ചെയ്യുക;
   (2) കൃത്യമായ അന്വേഷണം നടത്തി പ്രതിക്കെതിരെ നടപടി സ്വീകരിക്കുക;
   (3) സെക്ഷൻ 173(2) പ്രകാരം FIR ന്റെ സൗജന്യ പകർപ്പ് നൽകുക.

തീയതി: ${todayDate}
സ്ഥലം: ${incidentLoc}

ഒപ്പ്: _____________________________ (${cName})`;

    let nativeOutput = englishDraft;
    if (lang === 'hi') nativeOutput = hindiDraft;
    else if (lang === 'te') nativeOutput = teluguDraft;
    else if (lang === 'ta') nativeOutput = tamilDraft;
    else if (lang === 'bn') nativeOutput = bengaliDraft;
    else if (lang === 'mr') nativeOutput = marathiDraft;
    else if (lang === 'kn') nativeOutput = kannadaDraft;
    else if (lang === 'ml') nativeOutput = malayalamDraft;

    return {
        english: englishDraft,
        native: nativeOutput,
        hindi: hindiDraft,
        language: lang
    };
}

export async function draftComplaint(complainantInfo, entities, retrieved, langLabel) {
    const selectedLanguage = normalizeLanguageCode(langLabel) || 'en';
    return buildProfessionalPoliceComplaint(complainantInfo, entities, retrieved, selectedLanguage);
}
