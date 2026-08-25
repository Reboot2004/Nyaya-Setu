// WebLLM client-side inference module — Llama 3.2 1B Instruct via WebGPU (MLC runtime)
// q4f32_1 preferred: more stable on Windows AMD drivers (q4f16 can trigger DXGI device hangs).
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
        // Cap context to reduce VRAM pressure and driver stress on budget GPUs
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
            // Watch for device loss so we can recover gracefully
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
        'WebGPU engine could not start on this device. ' +
        'Update your GPU drivers, or use a Chrome/Edge browser with hardware acceleration enabled. ' +
        'Original error: ' + (lastErr?.message || lastErr)
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
        te: ['nenu', 'meeru', 'mana', 'kathalu', 'telusu', 'dhamki', 'gabbarsam', 'paisa', 'sarpanch'],
        hi: ['mera', 'mujhe', 'mere', 'maang', 'paise', 'sarpanch', 'dhamki', 'gali', 'fir'],
        ta: ['enaku', 'na', 'nammal', 'pisa', 'sarpanch', 'dhamki'],
        bn: ['ami', 'amar', 'tumi', 'paisa', 'sarpanch', 'dhakka'],
        mr: ['mi', 'mala', 'paisa', 'sarpanch', 'dhamki', 'gali'],
        kn: ['nanna', 'nanage', 'paisa', 'sarpanch', 'dhamki'],
        ml: ['enikk', 'njan', 'paisa', 'sarpanch', 'dhamki']
    };

    for (const [lang, hints] of Object.entries(romanHints)) {
        if (hints.some((h) => lower.includes(h))) return lang;
    }

    return 'en';
}

function getLanguageTemplate(language, summary, location, date, aggressor, statuteList) {
    const commonIntro = {
        en: ['To the Officer-in-Charge,', '[POLICE STATION / DISTRICT],', 'Subject: Formal Complaint for Registration of Cognizable Offence'],
        hi: ['प्रेषक: पुलिस अधिकारी,', '[पुलिस स्टेशन / जिले का नाम]', 'विषय: संज्ञेय अपराध के पंजीकरण के लिए औपचारिक शिकायत'],
        te: ['పోలీసు అధికారి గారికి,', '[పోలీసు స్టేషన్ / జిల్లా]', 'విషయం: అగ్నికి సంబంధించిన అధికారిక ఫిర్యాదు'],
        ta: ['போலீஸ் அதிகாரியிடம்,', '[போலீஸ் நிலையம் / மாவட்டம்]', 'பொருள்: குற்றப் புகாருக்கான அதிகாரப்பூர்வ புகார்'],
        bn: ['পুলিশ অফিসারকে,', '[থানা / জেলা]', 'বিষয়: দায়েরকৃত অভিযোগের জন্য আনুষ্ঠানিক নালিশ'],
        mr: ['पोलीस अधिकाऱ्याला,', '[पोलीस ठाणे / जिल्हा]', 'विषय: संज्ञेय गुन्ह्याची नोंदणीसाठी औपचारिक तक्रार'],
        kn: ['ಪೊಲೀಸ್ ಅಧಿಕಾರಿಗೆ,', '[ಪೊಲೀಸ್ ಠಾಣೆ / ಜಿಲ್ಲೆ]', 'ವಿಷಯ: ತಿಳಿಸುವಿಕೆಗಾಗಿ ಅಧಿಕೃತ ದೂರು'],
        ml: ['പോലീസ് ഉദ്യോഗസ്ഥനോട്,', '[പോലീസ് സ്റ്റേഷൻ / ജില്ല]', 'വിഷയം: കുറ്റം രജിസ്റ്റർ ചെയ്യാനുള്ള Formal complaint']
    };

    const body = {
        en: `I, the complainant, resident of ${location}, hereby submit this complaint in respect of the incident that occurred on ${date}. The facts are as follows: ${summary}. On the aforesaid date, the accused person(s), namely ${aggressor}, allegedly committed unlawful conduct against me, including intimidation, assault, coercion, and threats of harm. The acts described above are contrary to the applicable provisions of the Bharatiya Nyaya Sanhita, 2023, including ${statuteList}. I therefore request that the complaint be registered under the relevant cognizable provisions and that prompt investigation be ordered. I am willing to provide additional details, statements, and evidence before the investigating authority. Please register the complaint and provide the FIR / complaint copy as required by law. NOTE: Please add the complainant’s full name, address, contact number, and signature at the end of this complaint before submission.`,
        hi: `मैं शिकायतकर्ता, निवासी ${location}, यह शिकायत दिनांक ${date} को हुई घटना के संदर्भ में प्रस्तुत कर रहा/रही हूँ। तथ्य इस प्रकार हैं: ${summary}. उपरोक्त दिनांक को आरोपी ${aggressor} द्वारा मेरे साथ धमकी, मारपीट, जबरदस्ती, तथा जान से मारने की धमकी दी गई। यह कृत्य भारतीय न्याय संहिता, 2023 के प्रावधानों के विरुद्ध है, जिनमें ${statuteList} शामिल हैं। अतः कृपया इस शिकायत को संज्ञेय अपराध के तहत पंजीकृत कर त्वरित जांच की जाए तथा FIR / शिकायत की प्रति प्रदान की जाए। मैं अतिरिक्त बयान, तथ्य और साक्ष्य जांच अधिकारी के सामने प्रस्तुत करने के लिए तैयार हूँ। नोट: सबमिशन से पहले इस शिकायत के अंत में अपने पूर्ण नाम, पता, फोन नंबर और हस्ताक्षर जोड़ें।`,
        te: `నేను, కంప్లైనంట్, ${location} నివాసి, ${date} నాటి ఘటనకు సంబంధించి ఈ ఫిర్యాదును చేస్తున్నాను. వాస్తవాలు: ${summary}. ఆ తేదీన ${aggressor} ద్వారా మాకు బెదిరింపు, దాడి, బలవంతం మరియు నష్టాన్ని కలిగించే బెదిరింపు ఇవ్వబడింది. ఇది భారతీయ న్యాయ సంహిత, 2023 లోని ${statuteList}కు వ్యతిరేకం. అందువల్ల ఈ ఫిర్యాదును సంబంధిత సెక్షన్ల కింద నమోదు చేసి, త్వరిత విచారణ జరిపించాలని కోరుతున్నాను. అదనపు వివరాలు, ప్రకటనలు, సాక్ష్యాలను విచారణాధికారికి సమర్పించడానికి నేను సిద్ధంగా ఉన్నాను. FIR / ఫిర్యాదు కాపీ అందించమని కోరుతున్నాను. నోట్: సమర్పించే ముందు ఈ ఫిర్యాదుకు చివరిలో మీ పూర్తి పేరు, చిరునామా, ఫోన్ మరియు సంతకం జోడించండి.`,
        ta: `நான், புகார்தாரர், ${location} பகுதியில் வசிப்பவர், ${date} அன்று நடந்த சம்பவம் குறித்து இந்த புகாரை அளிக்கிறேன். உண்மைகள்: ${summary}. குறிப்பிட்ட நாளில் ${aggressor} என்னிடம் அச்சுறுத்தல், தாக்குதல், மிரட்டல், மற்றும் தீங்கிழைக்கும் முயற்சிகள் செய்துள்ளார். இது பாரதிய நியாய சினிதா, 2023-ன் ${statuteList} பிரிவுகளுக்கு எதிரானது. எனவே, இந்த புகாரை தொடர்புடைய குற்றப்பிரிவு கீழ் பதிவு செய்து, விரைவான விசாரணையை மேற்கொள்ளுமாறு கேட்டுக்கொள்கிறேன். கூடுதல் தகவல்கள், அறிக்கைகள், சான்றுகள் ஆகியவற்றை விசாரணை அதிகாரியிடம் வழங்க நான் தயாராக உள்ளேன். FIR / புகார் நகல் வழங்குமாறு கேட்டுக்கொள்கிறேன். குறிப்பு: சமர்ப்பிப்பதற்கு முன் இந்த புகாரின் இறுதியில் உங்கள் முழுப் பெயர், முகவரி, தொடர்பு எண் மற்றும் கையொப்பத்தை சேர்க்கவும்.`,
        bn: `আমি, অভিযোগকারী, ${location} এলাকার বাসিন্দা, ${date} তারিখে ঘটিত ঘটনাটি সম্পর্কে এই নালিশ দিচ্ছি। সত্যগুলি হলো: ${summary}. সেদিন ${aggressor} আমাকে ভয় দেখিয়েছেন, হামলা ও জবরদস্তি করেছেন, এবং পুলিশে অভিযোগ করলে প্রাণনাশের হুমকি দিয়েছেন। এটি ভারতীয় দণ্ডবিধি, 2023-এর ${statuteList} ধারার বিরুদ্ধে। তাই অনুগ্রহ করে এই নালিশটি সংশ্লিষ্ট ধারায় নথিভুক্ত করে দ্রুত তদন্তের নির্দেশ দিন। আমি অতিরিক্ত তথ্য, বিবৃতি ও প্রমাণ প্রদান করতে প্রস্তুত আছি। FIR / নালিশ কপি প্রদানের অনুরোধ করছি। নোট: জমা দেওয়ার আগে এই নালিশের শেষে আপনার সম্পূর্ণ নাম, ঠিকানা, ফোন নম্বর ও স্বাক্ষর যোগ করুন।`,
        mr: `मी, तक्रारदार, ${location} येथे राहणारा, ${date} रोजी घडलेल्या घटनेविषयी ही तक्रार सादर करत आहे. तथ्य आहे: ${summary}. त्या दिवशी ${aggressor} यांनी मला धमकी दिली, मारहाण केली, दबाव आणला आणि जीवाला धोका दिल्याची धमकी दिली. हे भारतीय न्याय संहिता, 2023 मधील ${statuteList} कलमांशी विरोधी आहे. म्हणून कृपया ही तक्रार संबंधित संज्ञेय गुन्ह्यांतर्गत नोंदवून त्वरित चौकशीची मागणी करतो. मी अतिरिक्त माहिती, साक्ष्य आणि विधायी पुरावे तपास अधिकाऱ्यांसमोर देण्यास तयार आहे. FIR / तक्रार प्रत मागितली आहे. नोट: सबमिट करण्यापूर्वी या तक्रारच्या शेवटी आपले पूर्ण नाव, पत्ता, संपर्क क्रमांक आणि सही भरा.`,
        kn: `ನಾನು, ದೂರುದಾರ, ${location} ಪ್ರದೇಶದ ನಿವಾಸಿ, ${date} ರಂದು ನಡೆದ ಘಟನೆಯ ಬಗ್ಗೆ ಈ ದೂರು ಸಲ್ಲಿಸುತ್ತಿದ್ದೇನೆ. ವಾಸ್ತವಗಳು: ${summary}. ಅದೇ ದಿನ ${aggressor} ಅವರು ನನಗೆ ಬೆದರಿಕೆ, ಹಲ್ಲೆ, ಬಲವಂತ, ಮತ್ತು ಜೀವಕ್ಕೆ ಅಪಾಯದ ಬೆದರಿಕೆ ನೀಡಿದ್ದಾರೆ. ಇದು ಭಾರತೀಯ ನ್ಯಾಯ ಸಂಹಿತೆ, 2023 ರ ${statuteList} ವಿಧಿಗಳಿಗೆ ವಿರುದ್ಧವಾಗಿದೆ. ಆದ್ದರಿಂದ ಈ ದೂರು ಸಂಬಂಧಿತ ಸಂಜ್ಞಾತ್ಮಕ ಅಪರಾಧಗಳ ಅಡಿಯಲ್ಲಿ ದಾಖಲಾಗಬೇಕು ಮತ್ತು ತ್ವರಿತ ತನಿಖೆ ನಡೆಯಬೇಕು ಎಂದು ವಿನಂತಿಸುತ್ತೇನೆ. ಹೆಚ್ಚುವರಿ ವಿವರಗಳು, ಹೇಳಿಕೆಗಳು ಮತ್ತು ಸಾಕ್ಷ್ಯಗಳನ್ನು ತನಿಖಾಧಿಕಾರಿಗಳಿಗೆ ಒದಗಿಸಲು ನಾನು ಸಿದ್ಧನಿದ್ದೇನೆ. FIR / ದೂರು ಪ್ರತಿಯನ್ನು ನೀಡಬೇಕೆಂದು ವಿನಂತಿಸುತ್ತೇನೆ. ನೋಟ್: ಸಲ್ಲಿಸುವ ಮೊದಲು ಈ ದೂರು ಅಂತ್ಯದಲ್ಲಿ ನಿಮ್ಮ ಪೂರ್ಣ ಹೆಸರು, ವಿಳಾಸ, ದೂರವಾಣಿ ಸಂಖ್ಯೆ ಮತ್ತು ಸಹಿಯನ್ನು ಸೇರಿಸಿ.`,
        ml: `ഞാൻ, പരാതിക്കാരൻ, ${location} നിവാസി, ${date} തിയതിയിലുള്ള 사건വുമായി ബന്ധപ്പെട്ട് ഈ പരാതியை സമർപ്പിക്കുന്നു. വസ്തുതകൾ: ${summary}. അതേ ദിവസം ${aggressor} എന്ന വ്യക്തി എന്നെ ഭീഷണിപ്പെടുത്തി, ആക്രമിച്ചു, മർദ്ദിച്ചു, ജീവൻ അപകടം ഉണ്ടാക്കുമെന്ന ഭീഷണി നൽകി. ഇത് ഭാരതീയ ന്യായ സിന്ഹിത, 2023-ന്റെ ${statuteList} വകുപ്പുകൾക്ക് എതിരാണ്. അതിനാൽ, ഈ പരാതியை സംബന്ധിച്ച ചട്ടപ്രകാരം രജിസ്റ്റർ ചെയ്യുകയും, വേഗത്തിൽ അന്വേഷണം നടത്തുകയും വേണം എന്ന് അഭ്യർത്ഥിക്കുന്നു. അധിക വിവരങ്ങൾ, BPN, സാക്ഷ്യങ്ങൾ എന്നിവ കൊടുക്കാൻ ഞാൻ തയ്യാറാണ്. FIR / പരാതി പകർപ്പ് നൽകണം എന്ന് അഭ്യർത്ഥിക്കുന്നു. കുറിപ്പ്: സമർപ്പിക്കുന്നതിന് മുൻപ് ഈ പരാതിയുടെ അവസാനം നിങ്ങളുടെ മുഴുവൻ പേര്, വിലാസം, ഫോൺ നമ്പർ, ഒപ്പ് ചേർക്കുക.`
    };

    const intro = commonIntro[language] || commonIntro.en;
    let bodyText = body[language] || body.en;

    if (!location) {
        bodyText = bodyText
            .replace(/resident of\s*,\s*/gi, '')
            .replace(/निवासी\s*,\s*/g, '')
            .replace(/నివాసి\s*,\s*/g, '')
            .replace(/பகுதியில் வசிப்பவர்\s*,\s*/g, '')
            .replace(/এলাকার বাসিন্দা\s*,\s*/g, '')
            .replace(/येथे राहणारा\s*,\s*/g, '')
            .replace(/ಪ್ರದೇಶದ ನಿವಾಸಿ\s*,\s*/g, '')
            .replace(/നിവാസി\s*,\s*/g, '');
    }

    return {
        intro: intro.join('\n'),
        body: bodyText,
        note: 'Add your full name, address, phone number, and signature at the end of the complaint before submission.'
    };
}

function withTodayDate(text, language) {
    const today = new Date().toLocaleDateString('en-IN');
    const labels = {
        en: `Date: ${today}`,
        hi: `दिनांक: ${today}`,
        te: `తేదీ: ${today}`,
        ta: `தேதி: ${today}`,
        bn: `তারিখ: ${today}`,
        mr: `दिनांक: ${today}`,
        kn: `ದಿನಾಂಕ: ${today}`,
        ml: `തീയതി: ${today}`
    };
    const header = labels[language] || labels.en;
    if (!text) return header;
    return `${header}\n${text}`;
}

function buildDeterministicComplaint(entities, retrieved, langLabel) {
    const summary = entities?.summary || 'The accused person(s) unlawfully withheld wages, assaulted the complainant, used abusive and threatening language, and intimidated them.';
    const locationRaw = (entities?.location || '').trim();
    const hasLocation = locationRaw && locationRaw.toLowerCase() !== 'unknown';
    const location = hasLocation ? locationRaw : '';
    const todayDate = new Date().toLocaleDateString('en-IN');
    const aggressor = entities?.aggressor || 'the accused person(s)';
    const statuteList = retrieved.length
        ? retrieved.map(({ statute }) => `${statute.code} Section ${statute.section} - ${statute.title}`).join(', ')
        : 'BNS Section 351, BNS Section 352, BNSS Section 173';

    const selectedLanguage = normalizeLanguageCode(langLabel) || detectLanguage(`${summary} ${location} ${date} ${aggressor}`);
    const template = getLanguageTemplate(selectedLanguage, summary, location, todayDate, aggressor, statuteList);
    const englishText = [template.intro, '', template.body, '', template.note].join('\n');

    return {
        english: englishText,
        native: template.body,
        hindi: template.body,
        language: selectedLanguage,
        note: template.note
    };
}

/**
 * Extract structured entities from a vernacular narrative.
 * Deterministic grounding: the LLM only classifies/extracts; statutes come from retrieval.
 */
export async function extractEntities(narrative) {
    const eng = await ensureEngine();
    const messages = [
        {
            role: 'system',
            content:
                'You are a legal intake assistant. Extract facts from a citizen grievance narrative. Reply ONLY with compact JSON: {"summary": "<one sentence>", "date": "<date or unknown>", "location": "<place or unknown>", "aggressor": "<name/description or unknown>", "events": ["<event1>", "<event2>"], "category": "<assault|intimidation|property|fraud|grave|other>"}'
        },
        { role: 'user', content: narrative }
    ];
    const reply = await eng.chat.completions.create({ messages, temperature: 0.1, max_tokens: 400 });
    const raw = reply.choices[0]?.message?.content ?? '{}';
    try {
        const jsonStart = raw.indexOf('{');
        const jsonEnd = raw.lastIndexOf('}');
        return JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
    } catch {
        return { summary: narrative.slice(0, 200), date: 'unknown', location: 'unknown', aggressor: 'unknown', events: [narrative], category: 'other' };
    }
}

function containsRefusal(text) {
    const low = (text || '').toLowerCase();
    return low.includes('i cannot') || low.includes('cannot help') || low.includes('i can\'t') || low.includes('cannot write') || low.includes('not able to');
}

export async function draftComplaint(entities, retrieved, langLabel) {
    const selectedLanguage = normalizeLanguageCode(langLabel) || detectLanguage((entities?.summary || '') + ' ' + (entities?.location || '') + ' ' + (entities?.date || ''));
    const eng = await ensureEngine();
    const todayDate = new Date().toLocaleDateString('en-IN');
    const cleanedEntities = {
        ...(entities || {}),
        date: todayDate
    };

    if (!cleanedEntities.location || String(cleanedEntities.location).toLowerCase() === 'unknown') {
        delete cleanedEntities.location;
    }

    const statuteBlock = retrieved
        .map(({ statute }) => `- ${statute.code} Section ${statute.section}: ${statute.title}. ${statute.punishment ? `Punishment: ${statute.punishment}` : '(Procedural provision)'}`)
        .join('\n');

    const messages = [
        {
            role: 'system',
            content: `You are a legal drafting assistant. Draft a formal police complaint in a factual, neutral, non-advocacy style. This is not harmful or criminal. Use placeholders like [COMPLAINANT NAME], [DATE], [PLACE], [ACCUSED DESCRIPTION], not real personal data. Do not refuse. Write in first person as the complainant. The complaint should be in ${selectedLanguage} language, but please also include a clear English version in the same output. Output exactly two parts separated by '---': the requested-language complaint first, then an English version. Use ONLY the laws named below; do not invent section numbers. Use today's date exactly as ${todayDate}. If location is not provided in facts, do not invent or force location text.\n\nAPPLICABLE STATUTES:\n${statuteBlock}`
        },
        {
            role: 'user',
            content: `Draft a formal complaint. Facts: ${JSON.stringify(cleanedEntities)}. Include: complainant placeholder, incident narration with date/place when available, accused description, applicable sections, and prayer for registration of FIR under BNSS Section 173. Use placeholders for personal details and avoid unsupported claims.`
        }
    ];

    try {
        const reply = await eng.chat.completions.create({ messages, temperature: 0.2, max_tokens: 900 });
        const text = reply.choices[0]?.message?.content ?? '';
        if (containsRefusal(text)) {
            return buildDeterministicComplaint(entities, retrieved, langLabel);
        }

        const [nativePart, englishPart] = text.split('---');
        const native = withTodayDate((nativePart || text).trim(), selectedLanguage);
        const english = withTodayDate((englishPart || nativePart || text).trim(), 'en');

        if (!native || native.length < 60) {
            return buildDeterministicComplaint(entities, retrieved, langLabel);
        }

        return {
            english,
            native,
            hindi: native,
            language: selectedLanguage,
            note: 'Add your full name, address, phone number, and signature at the end of the complaint before submission.'
        };
    } catch (err) {
        console.warn('LLM complaint generation failed; using deterministic template fallback:', err);
        return buildDeterministicComplaint(entities, retrieved, langLabel);
    }
}
