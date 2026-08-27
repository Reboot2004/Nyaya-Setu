// WebLLM client-side inference module — Llama 3.2 1B Instruct via WebGPU (MLC runtime)
// Zero-Friction Hybrid Architecture: Runs local WebGPU LLM when supported, with seamless deterministic Indian Police complaint generator for all budget devices.
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

function normalizeLanguageCode(langLabel) {
    const value = (langLabel || '').toLowerCase();
    if (!value || value === 'auto') return 'en';
    if (['en', 'english'].includes(value)) return 'en';
    if (['hi', 'hindi', 'hin'].includes(value)) return 'hi';
    if (['te', 'telugu'].includes(value)) return 'te';
    if (['ta', 'tamil'].includes(value)) return 'ta';
    if (['bn', 'bengali'].includes(value)) return 'bn';
    if (['mr', 'marathi'].includes(value)) return 'mr';
    if (['kn', 'kannada'].includes(value)) return 'kn';
    if (['ml', 'malayalam'].includes(value)) return 'ml';
    return value;
}

export function detectLanguage(text) {
    const value = (text || '').trim();
    if (!value) return 'en';

    if (/[\u0900-\u097F]/.test(value)) return 'hi';
    if (/[\u0C00-\u0C7F]/.test(value)) return 'te';
    if (/[\u0B80-\u0BFF]/.test(value)) return 'ta';
    if (/[\u0980-\u09FF]/.test(value)) return 'bn';
    if (/[\u0C80-\u0CFF]/.test(value)) return 'kn';
    if (/[\u0D00-\u0D7F]/.test(value)) return 'ml';

    const lower = value.toLowerCase();
    const romanHints = {
        te: ['nenu', 'meeru', 'mana', 'kathalu', 'telusu', 'dhamki', 'gabbarsam', 'paisa', 'sarpanch', 'kotaru'],
        hi: ['mera', 'mujhe', 'mere', 'maang', 'paise', 'sarpanch', 'dhamki', 'gali', 'fir', 'mara'],
        ta: ['enaku', 'na', 'nammal', 'pisa', 'sarpanch', 'dhamki', 'adithanga'],
        bn: ['ami', 'amar', 'tumi', 'paisa', 'sarpanch', 'dhakka', 'mardhar'],
        mr: ['mi', 'mala', 'paisa', 'sarpanch', 'dhamki', 'gali', 'marhan'],
        kn: ['nanna', 'nanage', 'paisa', 'sarpanch', 'dhamki', 'hodedaru'],
        ml: ['enikk', 'njan', 'paisa', 'sarpanch', 'dhamki', 'thalli']
    };

    for (const [lang, hints] of Object.entries(romanHints)) {
        if (hints.some((h) => lower.includes(h))) return lang;
    }

    return 'en';
}

/**
 * Standard Indian Police FIR Complaint Formatter (Non-Devotional, Professional, Legal).
 * Completely eliminates bracketed raw placeholders by gracefully using actual user input or formal legal default phrasing.
 */
function buildProfessionalPoliceComplaint(complainantInfo, entities, retrieved, selectedLang) {
    const lang = normalizeLanguageCode(selectedLang) || 'en';
    const todayDate = new Date().toLocaleDateString('en-IN');

    const cName = (complainantInfo?.name || '').trim() || 'The Complainant (Identity as per signature below)';
    const cParent = (complainantInfo?.parent || '').trim();
    const cPhone = (complainantInfo?.phone || '').trim();
    const cAddress = (complainantInfo?.address || '').trim() || (complainantInfo?.geoSnapshot || 'Resident within the jurisdiction of this Police Station');
    const psName = (complainantInfo?.station || '').trim() || 'Jurisdictional Police Station / District';
    const incidentLoc = (complainantInfo?.location || '').trim() || (entities?.location && entities.location !== 'unknown' ? entities.location : 'Within the territorial jurisdiction of this Police Station');
    const aggressor = (complainantInfo?.accused || '').trim() || (entities?.aggressor && entities.aggressor !== 'unknown' ? entities.aggressor : 'The Accused Person(s) / Identified in narrative');
    const incidentDate = (complainantInfo?.date || '').trim() || todayDate;
    const summaryFacts = (entities?.summary || complainantInfo?.narrative || 'The accused committed unlawful acts of intimidation, assault, extortion or harassment against the complainant.').trim();

    const sectionsList = retrieved.length
        ? retrieved.map(({ statute }) => `${statute.code} Section ${statute.section} (${statute.title.split('(')[0].trim()})`).join(', ')
        : 'Section 115, Section 351, Section 352 of Bharatiya Nyaya Sanhita, 2023 & Section 173 of BNSS, 2023';

    // 1. ENGLISH DRAFT
    const englishDraft = 
`TO,
THE STATION HOUSE OFFICER / OFFICER-IN-CHARGE,
POLICE STATION: ${psName.toUpperCase()}

SUBJECT: WRITTEN COMPLAINT FOR REGISTRATION OF FIRST INFORMATION REPORT (FIR) UNDER SECTION 173 OF BHARATIYA NAGARIK SURAKSHA SANHITA (BNSS), 2023 FOR OFFENCES UNDER BHARATIYA NYAYA SANHITA (BNS), 2023.

1. COMPLAINANT PARTICULARS:
   • Full Name: ${cName}${cParent ? ` (S/o, D/o, W/o: ${cParent})` : ''}
   • Residential Address: ${cAddress}
   • Contact Number: ${cPhone || 'Provided at station'}

2. DETAILS OF ACCUSED PERSON(S):
   • Name(s) / Description: ${aggressor}

3. DATE, TIME AND PLACE OF OCCURRENCE:
   • Date / Time: ${incidentDate}
   • Place of Incident: ${incidentLoc}

4. STATEMENT OF FACTS:
   I, the Complainant named above, solemnly state the chronological facts of the incident as follows:
   (a) On ${incidentDate}, at approximately ${incidentLoc}, the above-named accused person(s) unlawfully and intentionally committed the following acts against me:
   (b) ${summaryFacts}
   (c) The acts of the accused caused direct injury, wrongful loss, physical intimidation, and breach of peace, leaving me in fear of further harm.

5. APPLICABLE STATUTORY PENAL PROVISIONS:
   The aforementioned acts attract cognizable penal liability under the Bharatiya Nyaya Sanhita, 2023, specifically:
   • ${sectionsList}
   • Section 173 BNSS, 2023 (Mandatory registration of FIR for cognizable offence).

6. PRAYER FOR STATUTORY ACTION:
   In view of the aforesaid facts, it is formally requested that:
   (i) An FIR be registered forthwith under Section 173 of the Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023;
   (ii) Prompt investigation be initiated against the accused person(s) in accordance with the law;
   (iii) An authenticated copy of the FIR / recorded complaint be provided to me free of cost as mandated under Section 173(2) BNSS.

VERIFICATION:
I verify that the contents stated above are true and correct to the best of my knowledge and personal belief, and nothing material has been concealed.

Date: ${todayDate}
Place: ${incidentLoc}

_____________________________
Signature / Thumb Impression of Complainant
Name: ${cName}
Contact: ${cPhone || '________________'}`;

    // 2. HINDI DRAFT
    const hindiDraft = 
`सेवा में,
थाना प्रभारी / अधिकारी महोदय,
थाना: ${psName}

विषय: भारतीय नागरिक सुरक्षा संहिता (BNSS), 2023 की धारा 173 के अंतर्गत भारतीय न्याय संहिता (BNS), 2023 के तहत प्राथमिकी (FIR) दर्ज करने हेतु औपचारिक शिकायत पत्र।

1. शिकायतकर्ता का विवरण:
   • पूरा नाम: ${cName}${cParent ? ` (आत्मज/पत्नी: ${cParent})` : ''}
   • स्थायी पता: ${cAddress}
   • संपर्क संख्या: ${cPhone || 'थाने में उपलब्ध कराया जाएगा'}

2. आरोपी व्यक्ति(यों) का विवरण:
   • नाम / विवरण: ${aggressor}

3. घटना का दिनांक, समय एवं स्थान:
   • दिनांक / समय: ${incidentDate}
   • घटनास्थल: ${incidentLoc}

4. घटना का विवरण (तथ्य):
   मैं, शिकायतकर्ता, शपथपूर्वक निम्नलिखित तथ्य प्रस्तुत करता/करती हूँ:
   (क) दिनांक ${incidentDate} को स्थान ${incidentLoc} पर उपरोक्त आरोपी व्यक्ति(यों) द्वारा गैर-कानूनी ढंग से मेरे साथ कृत्य किया गया।
   (ख) ${summaryFacts}
   (ग) आरोपी के इस कृत्य से मुझे शारीरिक चोट, मानसिक प्रताड़ना एवं गंभीर नुकसान पहुंचा है।

5. लागू वैधानिक धाराएं:
   उपरोक्त कृत्य भारतीय न्याय संहिता, 2023 एवं भारतीय नागरिक सुरक्षा संहिता, 2023 के निम्नलिखित प्रावधानों के तहत दंडनीय है:
   • ${sectionsList}
   • धारा 173 BNSS, 2023 (संज्ञेय अपराध में अनिवार्य FIR पंजीकरण)।

6. कानूनी कार्रवाई हेतु औपचारिक मांग (Prayer for Action):
   अतः श्रीमान से औपचारिक निवेदन है कि:
   (1) धारा 173 BNSS, 2023 के अंतर्गत तत्काल प्रथम सूचना रिपोर्ट (FIR) दर्ज की जाए;
   (2) मामले की निष्पक्ष एवं त्वरित जांच कर आरोपी के विरुद्ध कठोर कानूनी कार्रवाई की जाए;
   (3) धारा 173(2) BNSS के तहत दर्ज FIR की एक प्रमाणित प्रति मुझे निःशुल्क प्रदान की जाए।

सत्यापन:
मैं सत्यापित करता/करती हूँ कि ऊपर वर्णित सभी तथ्य मेरी व्यक्तिगत जानकारी के अनुसार पूर्णतः सत्य एवं सही हैं।

दिनांक: ${todayDate}
स्थान: ${incidentLoc}

_____________________________
शिकायतकर्ता के हस्ताक्षर / अंगूठे का निशान
नाम: ${cName}
फोन: ${cPhone || '________________'}`;

    // 3. TELUGU DRAFT
    const teluguDraft = 
`గౌరవనీయులైన స్టేషన్ హౌస్ ఆఫీసర్ గారికి,
పోలీస్ స్టేషన్: ${psName}

విషయం: భారతీయ పౌర సురక్షా సంహిత (BNSS), 2023 సెక్షన్ 173 ప్రకారం భారతీయ న్యాయ సంహిత (BNS), 2023 కింద ప్రథమ సమాచార నివేదిక (FIR) నమోదు కొరకు అధికారిక ఫిర్యాదు.

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

5. వర్తించే చట్ట విభాగాలు:
   • ${sectionsList}
   • సెక్షన్ 173 BNSS, 2023 (జీరో ఎఫ్ఐఆర్ మరియు విధిగా కేసు నమోదు).

6. చట్టబద్ధమైన అభ్యర్థన:
   (1) సెక్షన్ 173 BNSS ప్రకారం వెంటనే FIR నమోదు చేయాలని;
   (2) విచారణ ప్రారంభించి తగిన చర్యలు తీసుకోవాలని;
   (3) FIR కాపీని ఉచితంగా అందించాలని కోరుతున్నాను.

సంతకం: _____________________________ (${cName})`;

    let nativeOutput = englishDraft;
    if (lang === 'hi') nativeOutput = hindiDraft;
    else if (lang === 'te') nativeOutput = teluguDraft;
    else if (lang !== 'en') nativeOutput = hindiDraft; // Default Indic fallback

    return {
        english: englishDraft,
        native: nativeOutput,
        hindi: hindiDraft,
        language: lang
    };
}

export async function extractEntities(narrative) {
    if (!isWebGPUSupported()) {
        return {
            summary: narrative.slice(0, 300),
            date: new Date().toLocaleDateString('en-IN'),
            location: 'Jurisdictional location',
            aggressor: 'Accused persons identified in statement',
            events: [narrative],
            category: 'assault'
        };
    }

    try {
        const eng = await ensureEngine();
        const messages = [
            {
                role: 'system',
                content:
                    'You are a legal intake assistant for Indian Police FIR complaints. Extract factual details from a citizen grievance narrative. Reply ONLY with compact JSON: {"summary": "<factual summary without prayers>", "date": "<date or current>", "location": "<Indian place or unknown>", "aggressor": "<accused name/description or unknown>", "events": ["<event1>"], "category": "<assault|intimidation|property|fraud|women_safety|procedure>"}'
            },
            { role: 'user', content: narrative }
        ];
        const reply = await eng.chat.completions.create({ messages, temperature: 0.1, max_tokens: 400 });
        const raw = reply.choices[0]?.message?.content ?? '{}';
        const jsonStart = raw.indexOf('{');
        const jsonEnd = raw.lastIndexOf('}');
        return JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
    } catch {
        return { 
            summary: narrative.slice(0, 300), 
            date: new Date().toLocaleDateString('en-IN'), 
            location: 'Jurisdictional location', 
            aggressor: 'Accused persons named in narrative', 
            events: [narrative], 
            category: 'assault' 
        };
    }
}

export async function draftComplaint(complainantInfo, entities, retrieved, langLabel) {
    const selectedLanguage = normalizeLanguageCode(langLabel) || 'en';
    return buildProfessionalPoliceComplaint(complainantInfo, entities, retrieved, selectedLanguage);
}
