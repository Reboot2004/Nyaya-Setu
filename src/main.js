import { isWebGPUSupported, onLoadingProgress, ensureEngine, resetEngine, extractEntities, draftComplaint, detectLanguage } from './llm.js';
import { retrieveSections } from './retrieval.js';
import { complaintToHtml, downloadComplaint, speakRightsBriefing, stopAudio } from './output.js';

const $ = (id) => document.getElementById(id);
const badge = $('engineBadge');
let lastComplaint = null;
let lastRetrieved = [];
let activeView = 'native';
let recognition = null;
let ipGeoSnapshot = null;
let ipDetectedLanguage = 'en';

const UI_TEXT = {
    en: {
        appSub: 'Client-side Indic Legal Co-Pilot · Police-Complaint Draft Assistant (BNS/BNSS 2023)',
        ingestionTitle: '1 · Describe your grievance',
        langLabel: 'Language',
        geoBtn: '📍 Use my location',
        narrativePlaceholder: "Speak or type what happened - in your own words, any language. Example: 'Sarpanch ke log ne mera majdoori paisa rok liya aur dhamki di...'",
        recBtnIdle: '🎙️ Record Voice',
        recBtnStop: '⏹ Stop Recording',
        runBtn: 'Generate Complaint Draft',
        langHintDefault: 'Voice input uses browser speech recognition (en-IN default)',
        loadTitle: 'Loading local AI engine (Llama 3.2 1B · WebGPU · runs on your device)',
        pipelineTitle: 'Pipeline',
        step1: 'Vernacular Input',
        step2: 'Entity Extraction',
        step3: 'BNS Retrieval',
        step4: 'Local LLM Drafting',
        step5: 'Complaint Output',
        sectionsTitle: 'Retrieved Statutory Provisions (grounded - no hallucinated sections)',
        outputTitle: 'Formal Complaint Draft',
        outputTitleEnglish: 'Formal Complaint Draft (English)',
        pdfBtn: '📄 Open / Print PDF',
        englishBtn: '🌐 English version',
        englishBtnBack: '🌐 Back to selected language',
        audioBtn: '🔊 Play Rights Briefing',
        stopAudioBtn: '⏹ Stop Audio',
        footer: '100% on-device processing (when WebGPU available) · Microphone & location requested only if you use those features · Not legal advice · Free aid: NALSA 15100',
        statusEngineReady: 'Engine: ready to load',
        statusEngineUnavailable: 'WebGPU unavailable - fallback mode',
        statusEngineLoaded: 'Engine loaded (on-device)',
        noMatch: 'No direct statutory match found - draft will use general grievance format.',
        msgNeedNarrative: 'Please describe your grievance first.',
        msgGeoNotSupported: 'Geolocation is not supported in this browser.',
        msgGeoDenied: 'Location access was denied. You can still continue without it.',
        msgGeoCaptured: 'Location captured from browser geolocation.',
        msgLangSet: 'Draft and UI language set to',
        msgDetectedLanguage: 'Detected language:',
        msgAutoLanguage: 'Language selected from input',
        msgPipelineError: 'Pipeline error:',
        msgInsufficientComplaint: 'Your text does not look like a complaint yet. Please include what happened, who did it, when, and harm/threat details before generating FIR draft.',
        gateTitle: 'Choose your language',
        gateSubtitle: 'We load the full app in your chosen language. We also try approximate IP-based language and location.',
        gateContinue: 'Continue',
        ipDetecting: 'Detecting approximate location from IP...',
        ipDetected: 'Approximate IP location detected:',
        ipLanguage: 'IP language',
        userLanguageBtn: '🌐 User language'
    },
    hi: {
        appSub: 'क्लाइंट-साइड इंडिक लीगल को-पायलट · BNS/BNSS वैधानिक ड्राफ्टिंग',
        ingestionTitle: '1 · अपनी शिकायत लिखें',
        langLabel: 'भाषा',
        geoBtn: '📍 मेरी लोकेशन उपयोग करें',
        narrativePlaceholder: 'जो हुआ है उसे अपनी भाषा में लिखें या बोलें।',
        recBtnIdle: '🎙️ आवाज रिकॉर्ड करें',
        recBtnStop: '⏹ रिकॉर्डिंग रोकें',
        runBtn: 'शिकायत ड्राफ्ट बनाएं',
        langHintDefault: 'वॉइस इनपुट ब्राउज़र स्पीच रिकग्निशन का उपयोग करता है (en-IN default)',
        loadTitle: 'लोकल AI इंजन लोड हो रहा है (Llama 3.2 1B · WebGPU)',
        pipelineTitle: 'प्रक्रिया',
        step1: 'वर्नाक्युलर इनपुट',
        step2: 'एंटिटी एक्सट्रैक्शन',
        step3: 'BNS रिट्रीवल',
        step4: 'लोकल LLM ड्राफ्टिंग',
        step5: 'शिकायत आउटपुट',
        sectionsTitle: 'प्राप्त वैधानिक प्रावधान (सत्यापित)',
        outputTitle: 'औपचारिक शिकायत ड्राफ्ट',
        outputTitleEnglish: 'औपचारिक शिकायत ड्राफ्ट (अंग्रेजी)',
        pdfBtn: '📄 PDF खोलें / प्रिंट करें',
        englishBtn: '🌐 अंग्रेजी संस्करण',
        englishBtnBack: '🌐 चुनी हुई भाषा पर लौटें',
        audioBtn: '🔊 अधिकार ब्रीफिंग चलाएं',
        stopAudioBtn: '⏹ ऑडियो रोकें',
        footer: '100% डिवाइस पर प्रोसेसिंग · कोई डेटा बाहर नहीं जाता · यह कानूनी सलाह नहीं है · NALSA हेल्पलाइन 15100',
        statusEngineReady: 'इंजन: लोड होने के लिए तैयार',
        statusEngineUnavailable: 'WebGPU उपलब्ध नहीं - फॉलबैक मोड',
        statusEngineLoaded: 'इंजन लोड हो गया (डिवाइस पर)',
        noMatch: 'सीधा वैधानिक मिलान नहीं मिला - सामान्य शिकायत प्रारूप उपयोग होगा।',
        msgNeedNarrative: 'कृपया पहले अपनी शिकायत लिखें।',
        msgGeoNotSupported: 'इस ब्राउज़र में जियोलोकेशन समर्थित नहीं है।',
        msgGeoDenied: 'लोकेशन अनुमति अस्वीकार हुई। आप बिना लोकेशन भी जारी रख सकते हैं।',
        msgGeoCaptured: 'लोकेशन ब्राउज़र जियोलोकेशन से ली गई।',
        msgLangSet: 'ड्राफ्ट और UI भाषा सेट की गई:',
        msgDetectedLanguage: 'पहचानी गई भाषा:',
        msgAutoLanguage: 'इनपुट से भाषा चुनी गई',
        msgPipelineError: 'पाइपलाइन त्रुटि:',
        msgInsufficientComplaint: 'आपका टेक्स्ट अभी शिकायत जैसा नहीं लग रहा। कृपया क्या हुआ, किसने किया, कब हुआ, और नुकसान/धमकी का विवरण लिखें, फिर FIR ड्राफ्ट बनाएं।',
        gateTitle: 'अपनी भाषा चुनें',
        gateSubtitle: 'पूरा ऐप चुनी गई भाषा में लोड होगा। हम IP से अनुमानित भाषा और लोकेशन भी पहचानने की कोशिश करते हैं।',
        gateContinue: 'आगे बढ़ें',
        ipDetecting: 'IP से अनुमानित लोकेशन पहचान रहे हैं...',
        ipDetected: 'IP से अनुमानित लोकेशन मिली:'
    },
    te: {
        appSub: 'క్లయింట్-సైడ్ ఇండిక్ లీగల్ కో-పైలట్ · BNS/BNSS చట్ట రచన',
        ingestionTitle: '1 · మీ ఫిర్యాదును వివరించండి',
        langLabel: 'భాష',
        geoBtn: '📍 నా స్థానం ఉపయోగించండి',
        narrativePlaceholder: 'ఏం జరిగిందో మీ భాషలో టైప్ చేయండి లేదా చెప్పండి.',
        recBtnIdle: '🎙️ వాయిస్ రికార్డ్',
        recBtnStop: '⏹ రికార్డింగ్ ఆపు',
        runBtn: 'ఫిర్యాదు డ్రాఫ్ట్ రూపొందించండి',
        langHintDefault: 'వాయిస్ ఇన్‌పుట్ బ్రౌజర్ స్పీచ్ గుర్తింపును ఉపయోగిస్తుంది (en-IN default)',
        loadTitle: 'లోకల్ AI ఇంజిన్ లోడ్ అవుతోంది (Llama 3.2 1B · WebGPU)',
        pipelineTitle: 'పైప్‌లైన్',
        step1: 'స్థానిక భాష ఇన్‌పుట్',
        step2: 'ఎంటిటీ ఎక్స్‌ట్రాక్షన్',
        step3: 'BNS రిట్రీవల్',
        step4: 'లోకల్ LLM డ్రాఫ్టింగ్',
        step5: 'ఫిర్యాదు అవుట్‌పుట్',
        sectionsTitle: 'సంబంధిత చట్ట విభాగాలు (ధృవీకరించబడినవి)',
        outputTitle: 'ఆధికారిక ఫిర్యాదు డ్రాఫ్ట్',
        outputTitleEnglish: 'ఆధికారిక ఫిర్యాదు డ్రాఫ్ట్ (ఇంగ్లీష్)',
        pdfBtn: '📄 PDF తెరువు / ప్రింట్',
        englishBtn: '🌐 ఇంగ్లీష్ వెర్షన్',
        englishBtnBack: '🌐 ఎంపిక చేసిన భాషకు తిరుగు',
        audioBtn: '🔊 హక్కుల వివరణ వినిపించు',
        stopAudioBtn: '⏹ ఆడియో ఆపు',
        footer: '100% పరికరంపైనే ప్రాసెసింగ్ · డేటా బయటకు వెళ్లదు · ఇది న్యాయ సలహా కాదు · NALSA హెల్ప్‌లైన్ 15100',
        statusEngineReady: 'ఇంజిన్: లోడ్‌కి సిద్ధం',
        statusEngineUnavailable: 'WebGPU లేదు - ఫాల్‌బ్యాక్ మోడ్',
        statusEngineLoaded: 'ఇంజిన్ లోడ్ అయింది (పరికరంపైనే)',
        noMatch: 'నేరుగా సరిపడే చట్ట విభాగం లేదు - సాధారణ ఫిర్యాదు రూపం ఉపయోగించబడుతుంది.',
        msgNeedNarrative: 'దయచేసి ముందుగా మీ ఫిర్యాదు వివరించండి.',
        msgGeoNotSupported: 'ఈ బ్రౌజర్‌లో జియోలొకేషన్ లేదు.',
        msgGeoDenied: 'లోకేషన్ అనుమతి నిరాకరించబడింది. లోకేషన్ లేకుండా కొనసాగవచ్చు.',
        msgGeoCaptured: 'బ్రౌజర్ జియోలొకేషన్ ద్వారా స్థానం పొందబడింది.',
        msgLangSet: 'డ్రాఫ్ట్ మరియు UI భాష సెట్ చేయబడింది:',
        msgDetectedLanguage: 'గుర్తించిన భాష:',
        msgAutoLanguage: 'ఇన్‌పుట్ నుంచి భాష ఎంపికైంది',
        msgPipelineError: 'పైప్‌లైన్ లోపం:'
    },
    ta: {
        appSub: 'கிளையன்ட்-சைடு இந்திய சட்ட உதவி · BNS/BNSS சட்ட வரைவு',
        ingestionTitle: '1 · உங்கள் புகாரை விவரிக்கவும்',
        langLabel: 'மொழி',
        geoBtn: '📍 என் இருப்பிடத்தை பயன்படுத்து',
        narrativePlaceholder: 'என்ன நடந்தது என்பதை உங்கள் மொழியில் எழுதுங்கள் அல்லது பேசுங்கள்.',
        recBtnIdle: '🎙️ குரல் பதிவு',
        recBtnStop: '⏹ பதிவு நிறுத்து',
        runBtn: 'புகார் வரைவு உருவாக்கு',
        langHintDefault: 'வாய்ஸ் இன்புட் உலாவி ஸ்பீச் ரெகக்னிஷனை பயன்படுத்துகிறது (en-IN default)',
        loadTitle: 'உள்ளூர் AI எஞ்சின் ஏற்றப்படுகிறது (Llama 3.2 1B · WebGPU)',
        pipelineTitle: 'செயல்முறை',
        step1: 'உள்ளூர் மொழி உள்ளீடு',
        step2: 'உருப்படி பிரித்தெடுப்பு',
        step3: 'BNS தேடல்',
        step4: 'உள்ளூர் LLM வரைவு',
        step5: 'புகார் வெளியீடு',
        sectionsTitle: 'பெறப்பட்ட சட்டப் பிரிவுகள் (சரிபார்க்கப்பட்டவை)',
        outputTitle: 'அதிகாரப்பூர்வ புகார் வரைவு',
        outputTitleEnglish: 'அதிகாரப்பூர்வ புகார் வரைவு (ஆங்கிலம்)',
        pdfBtn: '📄 PDF திற / அச்சிடு',
        englishBtn: '🌐 ஆங்கில பதிப்பு',
        englishBtnBack: '🌐 தேர்ந்த மொழிக்கு திரும்பு',
        audioBtn: '🔊 உரிமைகள் விளக்கத்தை இயக்கு',
        stopAudioBtn: '⏹ ஆடியோ நிறுத்து',
        footer: '100% சாதனத்திலேயே செயலாக்கம் · தரவு வெளியே போகாது · இது சட்ட ஆலோசனை அல்ல · NALSA ஹெல்ப்லைன் 15100',
        statusEngineReady: 'எஞ்சின்: ஏற்ற தயாராக உள்ளது',
        statusEngineUnavailable: 'WebGPU இல்லை - மாற்று முறை',
        statusEngineLoaded: 'எஞ்சின் ஏற்றப்பட்டது (சாதனத்தில்)',
        noMatch: 'நேரடி சட்டப் பொருத்தம் இல்லை - பொதுப் புகார் வடிவம் பயன்படும்.',
        msgNeedNarrative: 'முதலில் உங்கள் புகாரை எழுதவும்.',
        msgGeoNotSupported: 'இந்த உலாவியில் ஜியோலொகேஷன் இல்லை.',
        msgGeoDenied: 'இருப்பிடம் அனுமதி மறுக்கப்பட்டது. இருப்பிடமின்றி தொடரலாம்.',
        msgGeoCaptured: 'உலாவி ஜியோலொகேஷன் மூலம் இருப்பிடம் பெறப்பட்டது.',
        msgLangSet: 'வரைவு மற்றும் UI மொழி அமைக்கப்பட்டது:',
        msgDetectedLanguage: 'கண்டறியப்பட்ட மொழி:',
        msgAutoLanguage: 'உள்ளீட்டிலிருந்து மொழி தேர்ந்தெடுக்கப்பட்டது',
        msgPipelineError: 'பைப்லைன் பிழை:'
    },
    bn: {
        appSub: 'ক্লায়েন্ট-সাইড ইন্ডিক লিগ্যাল কো-পাইলট · BNS/BNSS আইনি খসড়া',
        ingestionTitle: '1 · আপনার অভিযোগ লিখুন',
        langLabel: 'ভাষা',
        geoBtn: '📍 আমার অবস্থান ব্যবহার করুন',
        narrativePlaceholder: 'কি ঘটেছে তা আপনার ভাষায় লিখুন বা বলুন।',
        recBtnIdle: '🎙️ ভয়েস রেকর্ড',
        recBtnStop: '⏹ রেকর্ড বন্ধ',
        runBtn: 'অভিযোগের খসড়া তৈরি করুন',
        langHintDefault: 'ভয়েস ইনপুট ব্রাউজারের স্পিচ রিকগনিশন ব্যবহার করে (en-IN default)',
        loadTitle: 'লোকাল AI ইঞ্জিন লোড হচ্ছে (Llama 3.2 1B · WebGPU)',
        pipelineTitle: 'পাইপলাইন',
        step1: 'স্থানীয় ভাষা ইনপুট',
        step2: 'এনটিটি এক্সট্র্যাকশন',
        step3: 'BNS রিট্রিভাল',
        step4: 'লোকাল LLM ড্রাফটিং',
        step5: 'অভিযোগ আউটপুট',
        sectionsTitle: 'প্রাসঙ্গিক আইন ধারাসমূহ (যাচাইকৃত)',
        outputTitle: 'আনুষ্ঠানিক অভিযোগ খসড়া',
        outputTitleEnglish: 'আনুষ্ঠানিক অভিযোগ খসড়া (ইংরেজি)',
        pdfBtn: '📄 PDF খুলুন / প্রিন্ট',
        englishBtn: '🌐 ইংরেজি সংস্করণ',
        englishBtnBack: '🌐 নির্বাচিত ভাষায় ফিরে যান',
        audioBtn: '🔊 অধিকার ব্রিফিং চালান',
        stopAudioBtn: '⏹ অডিও বন্ধ করুন',
        footer: '100% ডিভাইস-ভিত্তিক প্রসেসিং · ডেটা বাইরে যায় না · এটি আইনি পরামর্শ নয় · NALSA হেল্পলাইন 15100',
        statusEngineReady: 'ইঞ্জিন: লোডের জন্য প্রস্তুত',
        statusEngineUnavailable: 'WebGPU নেই - ফallback মোড',
        statusEngineLoaded: 'ইঞ্জিন লোড হয়েছে (ডিভাইসে)',
        noMatch: 'সরাসরি আইনগত মিল পাওয়া যায়নি - সাধারণ অভিযোগ ফরম্যাট ব্যবহার হবে।',
        msgNeedNarrative: 'দয়া করে আগে আপনার অভিযোগ লিখুন।',
        msgGeoNotSupported: 'এই ব্রাউজারে জিওলোকেশন সমর্থিত নয়।',
        msgGeoDenied: 'লোকেশন অনুমতি অস্বীকৃত। লোকেশন ছাড়া চালিয়ে যেতে পারেন।',
        msgGeoCaptured: 'ব্রাউজার জিওলোকেশন থেকে অবস্থান নেওয়া হয়েছে।',
        msgLangSet: 'ড্রাফট ও UI ভাষা সেট করা হয়েছে:',
        msgDetectedLanguage: 'সনাক্ত ভাষা:',
        msgAutoLanguage: 'ইনপুট থেকে ভাষা নির্ধারিত',
        msgPipelineError: 'পাইপলাইন ত্রুটি:'
    },
    mr: {
        appSub: 'क्लायंट-साइड इंडिक लीगल को-पायलट · BNS/BNSS कायदेशीर मसुदा',
        ingestionTitle: '1 · तुमची तक्रार लिहा',
        langLabel: 'भाषा',
        geoBtn: '📍 माझे लोकेशन वापरा',
        narrativePlaceholder: 'काय झाले ते तुमच्या भाषेत लिहा किंवा बोला.',
        recBtnIdle: '🎙️ आवाज रेकॉर्ड करा',
        recBtnStop: '⏹ रेकॉर्डिंग थांबवा',
        runBtn: 'तक्रार मसुदा तयार करा',
        langHintDefault: 'व्हॉइस इनपुट ब्राउझर स्पीच रेकग्निशन वापरते (en-IN default)',
        loadTitle: 'लोकल AI इंजिन लोड होत आहे (Llama 3.2 1B · WebGPU)',
        pipelineTitle: 'पाइपलाइन',
        step1: 'स्थानिक भाषा इनपुट',
        step2: 'एंटिटी एक्सट्रॅक्शन',
        step3: 'BNS रिट्रीव्हल',
        step4: 'लोकल LLM मसुदा',
        step5: 'तक्रार आउटपुट',
        sectionsTitle: 'मिळालेल्या कायदेशीर तरतुदी (प्रमाणित)',
        outputTitle: 'औपचारिक तक्रार मसुदा',
        outputTitleEnglish: 'औपचारिक तक्रार मसुदा (इंग्रजी)',
        pdfBtn: '📄 PDF उघडा / प्रिंट',
        englishBtn: '🌐 इंग्रजी आवृत्ती',
        englishBtnBack: '🌐 निवडलेल्या भाषेत परत',
        audioBtn: '🔊 हक्कांचे निवेदन प्ले करा',
        stopAudioBtn: '⏹ ऑडिओ थांबवा',
        footer: '100% डिव्हाइसवर प्रक्रिया · डेटा बाहेर जात नाही · हे कायदेशीर सल्ला नाही · NALSA हेल्पलाइन 15100',
        statusEngineReady: 'इंजिन: लोडसाठी तयार',
        statusEngineUnavailable: 'WebGPU उपलब्ध नाही - फॉलबॅक मोड',
        statusEngineLoaded: 'इंजिन लोड झाले (डिव्हाइसवर)',
        noMatch: 'थेट कायदेशीर जुळणी नाही - सामान्य तक्रार स्वरूप वापरले जाईल.',
        msgNeedNarrative: 'कृपया आधी तुमची तक्रार लिहा.',
        msgGeoNotSupported: 'या ब्राउझरमध्ये जिओलोकेशन उपलब्ध नाही.',
        msgGeoDenied: 'लोकेशन परवानगी नाकारली. लोकेशनशिवाय पुढे जाऊ शकता.',
        msgGeoCaptured: 'ब्राउझर जिओलोकेशनमधून लोकेशन मिळाले.',
        msgLangSet: 'मसुदा आणि UI भाषा सेट केली:',
        msgDetectedLanguage: 'ओळखलेली भाषा:',
        msgAutoLanguage: 'इनपुटवरून भाषा निवडली गेली',
        msgPipelineError: 'पाइपलाइन त्रुटी:'
    },
    kn: {
        appSub: 'ಕ್ಲೈಂಟ್-ಸೈಡ್ ಇಂಡಿಕ್ ಲೀಗಲ್ ಕೋ-ಪೈಲಟ್ · BNS/BNSS ಕಾನೂನು ಕರಡು',
        ingestionTitle: '1 · ನಿಮ್ಮ ದೂರು ವಿವರಿಸಿ',
        langLabel: 'ಭಾಷೆ',
        geoBtn: '📍 ನನ್ನ ಸ್ಥಳ ಬಳಸಿ',
        narrativePlaceholder: 'ಏನಾಯಿತು ಎಂಬುದನ್ನು ನಿಮ್ಮ ಭಾಷೆಯಲ್ಲಿ ಬರೆಯಿರಿ ಅಥವಾ ಹೇಳಿ.',
        recBtnIdle: '🎙️ ಧ್ವನಿ ದಾಖಲೆ',
        recBtnStop: '⏹ ದಾಖಲೆ ನಿಲ್ಲಿಸಿ',
        runBtn: 'ದೂರು ಕರಡು ರಚಿಸಿ',
        langHintDefault: 'ವಾಯ್ಸ್ ಇನ್‌ಪುಟ್ ಬ್ರೌಸರ್ ಸ್ಪೀಚ್ ರೆಕಗ್ನಿಷನ್ ಬಳಸುತ್ತದೆ (en-IN default)',
        loadTitle: 'ಲೋಕಲ್ AI ಎಂಜಿನ್ ಲೋಡ್ ಆಗುತ್ತಿದೆ (Llama 3.2 1B · WebGPU)',
        pipelineTitle: 'ಪೈಪ್‌ಲೈನ್',
        step1: 'ಸ್ಥಳೀಯ ಭಾಷೆ ಇನ್‌ಪುಟ್',
        step2: 'ಎಂಟಿಟಿ ಹೊರತೆಗೆದುಕೊಳ್ಳುವುದು',
        step3: 'BNS ಮರುಪಡೆಯುವುದು',
        step4: 'ಲೋಕಲ್ LLM ಕರಡು',
        step5: 'ದೂರು ಔಟ್‌ಪುಟ್',
        sectionsTitle: 'ಪಡೆಯಲಾದ ಕಾನೂನು ವಿಧಿಗಳು (ಧೃಡೀಕೃತ)',
        outputTitle: 'ಅಧಿಕೃತ ದೂರು ಕರಡು',
        outputTitleEnglish: 'ಅಧಿಕೃತ ದೂರು ಕರಡು (ಇಂಗ್ಲಿಷ್)',
        pdfBtn: '📄 PDF ತೆರೆಯಿರಿ / ಮುದ್ರಿಸಿ',
        englishBtn: '🌐 ಇಂಗ್ಲಿಷ್ ಆವೃತ್ತಿ',
        englishBtnBack: '🌐 ಆಯ್ಕೆ ಮಾಡಿದ ಭಾಷೆಗೆ ಹಿಂದಿರುಗಿ',
        audioBtn: '🔊 ಹಕ್ಕುಗಳ ವಿವರವನ್ನು ಆಡಿಯೋದಲ್ಲಿ ಕೇಳಿ',
        stopAudioBtn: '⏹ ಆಡಿಯೋ ನಿಲ್ಲಿಸಿ',
        footer: '100% ಸಾಧನದಲ್ಲೇ ಪ್ರಕ್ರಿಯೆ · ಡೇಟಾ ಹೊರಗೆ ಹೋಗುವುದಿಲ್ಲ · ಇದು ಕಾನೂನು ಸಲಹೆ ಅಲ್ಲ · NALSA ಸಹಾಯವಾಣಿ 15100',
        statusEngineReady: 'ಎಂಜಿನ್: ಲೋಡ್ ಮಾಡಲು ಸಿದ್ಧ',
        statusEngineUnavailable: 'WebGPU ಲಭ್ಯವಿಲ್ಲ - ಫಾಲ್‌ಬ್ಯಾಕ್ ಮೋಡ್',
        statusEngineLoaded: 'ಎಂಜಿನ್ ಲೋಡ್ ಆಗಿದೆ (ಸಾಧನದಲ್ಲಿ)',
        noMatch: 'ನೇರ ಕಾನೂನು ಹೊಂದಾಣಿಕೆ ಸಿಗಲಿಲ್ಲ - ಸಾಮಾನ್ಯ ದೂರು ರೂಪ ಬಳಸಲಾಗುತ್ತದೆ.',
        msgNeedNarrative: 'ದಯವಿಟ್ಟು ಮೊದಲು ನಿಮ್ಮ ದೂರನ್ನು ಬರೆಯಿರಿ.',
        msgGeoNotSupported: 'ಈ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಜಿಯೋಲೊಕೇಶನ್ ಲಭ್ಯವಿಲ್ಲ.',
        msgGeoDenied: 'ಸ್ಥಳ ಅನುಮತಿ ನಿರಾಕರಿಸಲಾಗಿದೆ. ಸ್ಥಳವಿಲ್ಲದೇ ಮುಂದುವರಿಯಬಹುದು.',
        msgGeoCaptured: 'ಬ್ರೌಸರ್ ಜಿಯೋಲೊಕೇಶನ್ ಮೂಲಕ ಸ್ಥಳ ಪಡೆಯಲಾಗಿದೆ.',
        msgLangSet: 'ಕರಡು ಮತ್ತು UI ಭಾಷೆ ಸೆಟ್ ಮಾಡಲಾಗಿದೆ:',
        msgDetectedLanguage: 'ಗುರುತಿಸಿದ ಭಾಷೆ:',
        msgAutoLanguage: 'ಇನ್‌ಪುಟ್‌ನಿಂದ ಭಾಷೆ ಆಯ್ಕೆಯಾಗಿದೆ',
        msgPipelineError: 'ಪೈಪ್‌ಲೈನ್ ದೋಷ:'
    },
    ml: {
        appSub: 'ക്ലയന്റ്-സൈഡ് ഇന്ത്യൻ ലീഗൽ കോ-പൈലറ്റ് · BNS/BNSS നിയമ ഡ്രാഫ്റ്റിംഗ്',
        ingestionTitle: '1 · നിങ്ങളുടെ പരാതി വിവരിക്കുക',
        langLabel: 'ഭാഷ',
        geoBtn: '📍 എന്റെ ലൊക്കേഷൻ ഉപയോഗിക്കുക',
        narrativePlaceholder: 'എന്താണ് സംഭവിച്ചതെന്ന് നിങ്ങളുടെ ഭാഷയിൽ എഴുതുക അല്ലെങ്കിൽ പറയുക.',
        recBtnIdle: '🎙️ വോയ്സ് റെക്കോർഡ്',
        recBtnStop: '⏹ റെക്കോർഡിംഗ് നിർത്തുക',
        runBtn: 'പരാതി ഡ്രാഫ്റ്റ് സൃഷ്ടിക്കുക',
        langHintDefault: 'വോയ്സ് ഇൻപുട്ട് ബ്രൗസർ സ്പീച്ച് റെക്കഗ്നിഷൻ ഉപയോഗിക്കുന്നു (en-IN default)',
        loadTitle: 'ലോകൽ AI എഞ്ചിൻ ലോഡ് ചെയ്യുന്നു (Llama 3.2 1B · WebGPU)',
        pipelineTitle: 'പൈപ്പ്‌ലൈൻ',
        step1: 'പ്രാദേശിക ഭാഷ ഇൻപുട്ട്',
        step2: 'എന്റിറ്റി എക്സ്ട്രാക്ഷൻ',
        step3: 'BNS റിട്രീവൽ',
        step4: 'ലോകൽ LLM ഡ്രാഫ്റ്റിംഗ്',
        step5: 'പരാതി ഔട്ട്പുട്ട്',
        sectionsTitle: 'ലഭിച്ച നിയമ വ്യവസ്ഥകൾ (സ്ഥിരീകരിച്ച)',
        outputTitle: 'ഔപചാരിക പരാതി ഡ്രാഫ്റ്റ്',
        outputTitleEnglish: 'ഔപചാരിക പരാതി ഡ്രാഫ്റ്റ് (ഇംഗ്ലീഷ്)',
        pdfBtn: '📄 PDF തുറക്കുക / പ്രിന്റ്',
        englishBtn: '🌐 ഇംഗ്ലീഷ് പതിപ്പ്',
        englishBtnBack: '🌐 തിരഞ്ഞെടുക്കപ്പെട്ട ഭാഷയിലേക്ക് മടങ്ങുക',
        audioBtn: '🔊 അവകാശ വിശദീകരണം പ്ലേ ചെയ്യുക',
        stopAudioBtn: '⏹ ഓഡിയോ നിർത്തുക',
        footer: '100% ഡിവൈസിൽ പ്രോസസിംഗ് · ഡാറ്റ പുറത്തേക്ക് പോകില്ല · ഇത് നിയമോപദേശം അല്ല · NALSA ഹെൽപ്‌ലൈൻ 15100',
        statusEngineReady: 'എഞ്ചിൻ: ലോഡിനായി തയ്യാറാണ്',
        statusEngineUnavailable: 'WebGPU ലഭ്യമല്ല - ഫാൾബാക്ക് മോഡ്',
        statusEngineLoaded: 'എഞ്ചിൻ ലോഡ് ചെയ്തു (ഡിവൈസിൽ)',
        noMatch: 'നേരിട്ടുള്ള നിയമ പൊരുത്തം ലഭിച്ചില്ല - സാധാരണ പരാതി ഫോർമാറ്റ് ഉപയോഗിക്കും.',
        msgNeedNarrative: 'ദയവായി ആദ്യം നിങ്ങളുടെ പരാതി എഴുതുക.',
        msgGeoNotSupported: 'ഈ ബ്രൗസറിൽ ജിയോലൊക്കേഷൻ ലഭ്യമല്ല.',
        msgGeoDenied: 'ലൊക്കേഷൻ അനുമതി നിരസിച്ചു. ലൊക്കേഷൻ ഇല്ലാതെ തുടരാം.',
        msgGeoCaptured: 'ബ്രൗസർ ജിയോലൊക്കേഷൻ വഴി സ്ഥാനം ലഭിച്ചു.',
        msgLangSet: 'ഡ്രാഫ്റ്റും UI ഭാഷയും ക്രമീകരിച്ചു:',
        msgDetectedLanguage: 'കണ്ടെത്തിയ ഭാഷ:',
        msgAutoLanguage: 'ഇൻപുട്ടിൽ നിന്ന് ഭാഷ തിരഞ്ഞെടുക്കപ്പെട്ടു',
        msgPipelineError: 'പൈപ്പ്‌ലൈൻ പിശക്:'
    }
};

function t(key, fallback = '') {
    const lang = ($('langSelect')?.value || 'en').toLowerCase();
    return UI_TEXT[lang]?.[key] || UI_TEXT.en[key] || fallback;
}

function applyUiLanguage() {
    const lang = ($('langSelect')?.value || 'en').toLowerCase();
    $('rootHtml').setAttribute('lang', lang);
    $('appSub').textContent = t('appSub');
    $('ingestionTitle').textContent = t('ingestionTitle');
    $('langLabel').textContent = t('langLabel');
    $('geoBtn').textContent = t('geoBtn');
    $('narrative').placeholder = t('narrativePlaceholder');
    $('runBtn').textContent = t('runBtn');
    $('loadTitle').textContent = t('loadTitle');
    $('pipelineTitle').textContent = t('pipelineTitle');
    $('step1').textContent = t('step1');
    $('step2').textContent = t('step2');
    $('step3').textContent = t('step3');
    $('step4').textContent = t('step4');
    $('step5').textContent = t('step5');
    $('sectionsTitle').textContent = t('sectionsTitle');
    $('pdfBtn').textContent = t('pdfBtn');
    $('englishBtn').textContent = activeView === 'english' ? t('englishBtnBack') : t('englishBtn');
    $('audioBtn').textContent = t('audioBtn');
    $('stopAudioBtn').textContent = t('stopAudioBtn');
    $('appFooter').textContent = t('footer');
    if ($('gateTitle')) $('gateTitle').textContent = t('gateTitle');
    if ($('gateSubtitle')) $('gateSubtitle').textContent = t('gateSubtitle');
    if ($('initialLangLabel')) $('initialLangLabel').textContent = t('langLabel');
    if ($('startAppBtn')) $('startAppBtn').textContent = t('gateContinue');
    if (!recognizing) {
        $('recBtn').textContent = t('recBtnIdle');
    }
    $('langHint').textContent = t('langHintDefault');
    if ($('ipHint') && !$('ipHint').textContent.trim()) {
        $('ipHint').textContent = t('ipDetecting');
    }
}

function getSelectedLanguage() {
    return $('langSelect')?.value || 'en';
}

function languageFromCountryRegion(countryCode, regionName = '') {
    if ((countryCode || '').toUpperCase() !== 'IN') return 'en';
    const r = (regionName || '').toLowerCase();
    // Narrow scope to en, hi, te only (per legal review Fix #5)
    if (r.includes('telangana') || r.includes('andhra')) return 'te';
    return 'hi'; // Default for all other regions
}

function applyLanguageSelection(langCode) {
    const lang = langCode || 'en';
    // Only update the in-app selector; keep initialLangSelect as IP language reference
    if ($('langSelect')) $('langSelect').value = lang;
    applyUiLanguage();
    if (recognition) {
        const map = {
            en: 'en-IN',
            hi: 'hi-IN',
            te: 'te-IN',
            ta: 'ta-IN',
            bn: 'bn-IN',
            mr: 'mr-IN',
            kn: 'kn-IN',
            ml: 'ml-IN'
        };
        recognition.lang = map[lang] || 'en-IN';
    }
}

function isActionableComplaint(text, entities, retrieved) {
    const value = (text || '').trim();
    if (!value || value.length < 40) return false;

    const low = value.toLowerCase();
    const words = value.split(/\s+/).filter(Boolean);
    if (words.length < 10) return false;

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
        'threat', 'threatened', 'assault', 'hit', 'abuse', 'harass', 'fraud', 'cheat', 'stole', 'extortion', 'wage', 'salary', 'payment',
        'dhamki', 'maar', 'marpit', 'gaali', 'paisa', 'rok liya', 'dhokha', 'बेधड़क', 'धमकी', 'मारपीट', 'गाली', 'वेतन', 'पैसे', 'हमला',
        'దాడి', 'బెదిరింపు', 'డబ్బు', 'హింస', 'அச்சுறுத்தல்', 'தாக்குதல்', 'சம்பளம்', 'হুমকি', 'মারধর', 'মজুরি', 'धमकी', 'मारहाण', 'ಬೆದರಿಕೆ', 'ಹಲ್ಲೆ', 'ഭീഷണി', 'മർദ്ദനം'
    ];
    const hasIssueSignal = issueKeywords.some((k) => low.includes(k.toLowerCase()));
    const hasEntitySignal = entities && (entities.aggressor && entities.aggressor !== 'unknown' || (entities.events || []).length > 0);
    const hasStatuteSignal = Array.isArray(retrieved) && retrieved.length > 0;

    return hasIssueSignal || hasEntitySignal || hasStatuteSignal;
}

async function bootstrapLanguageGate() {
    if ($('ipHint')) $('ipHint').textContent = t('ipDetecting');
    const fallback = (navigator.language || 'en').slice(0, 2).toLowerCase();
    let selected = ['en', 'hi', 'te', 'ta', 'bn', 'mr', 'kn', 'ml'].includes(fallback) ? fallback : 'en';

    // IP detection is now opt-in via a feature flag or button; default to browser language
    // Users must explicitly choose to enable IP-based language preselection
    ipDetectedLanguage = selected;
    if ($('ipHint')) {
        $('ipHint').textContent = '(Microphone and location are optional — enable only if you need them)';
    }

    applyLanguageSelection(selected);
}

function applyLanguageHint(text) {
    const selected = getSelectedLanguage();
    let hint = `${t('msgLangSet')} ${selected.toUpperCase()}`;
    if (ipDetectedLanguage && ipDetectedLanguage !== selected) {
        hint += ` · ${t('ipLanguage') || 'IP language'} ${ipDetectedLanguage.toUpperCase()}`;
    }
    const detected = detectLanguage(text);
    if (detected && detected !== selected) {
        hint += ` · ${t('msgDetectedLanguage')} ${detected.toUpperCase()}`;
    }
    $('langHint').textContent = hint;
}

function refreshComplaintView() {
    if (!lastComplaint) return;
    const visible = activeView === 'english'
        ? (lastComplaint.english || lastComplaint.native || '')
        : (lastComplaint.native || lastComplaint.hindi || lastComplaint.english || '');
    $('complaintOut').textContent = visible;
    $('outputTitle').textContent = activeView === 'english' ? t('outputTitleEnglish') : t('outputTitle');
    $('englishBtn').textContent = activeView === 'english' ? t('englishBtnBack') : t('englishBtn');
}

function useBrowserLocation() {
    if (!navigator.geolocation) {
        alert(t('msgGeoNotSupported'));
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const lat = pos.coords.latitude.toFixed(4);
            const lon = pos.coords.longitude.toFixed(4);
            const note = `Location: approximate coordinates ${lat}, ${lon} (auto-filled for reference).`;
            const existing = $('narrative').value.trim();
            $('narrative').value = existing ? `${existing}\n\n${note}` : note;
            $('langHint').textContent = t('msgGeoCaptured');
        },
        () => {
            alert(t('msgGeoDenied'));
        },
        { enableHighAccuracy: true, timeout: 10000 }
    );
}

// ---- Engine preload on interaction readiness ----
if (!isWebGPUSupported()) {
    badge.textContent = `⚠ ${t('statusEngineUnavailable')}`;
} else {
    $('runBtn').disabled = false;
    badge.textContent = t('statusEngineReady');
}

onLoadingProgress((report) => {
    $('loadCard').classList.remove('hidden');
    const pct = Math.round((report.progress ?? 0) * 100);
    $('loadBar').style.width = pct + '%';
    $('loadText').textContent = report.text || '';
    if (pct >= 100) {
        badge.textContent = `✓ ${t('statusEngineLoaded')}`;
        badge.classList.add('ok');
    }
});

// ---- Voice input via Web Speech API ----
let recognizing = false;
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SR) {
    recognition = new SR();
    recognition.lang = 'en-IN';
    recognition.continuous = true;
    recognition.interimResults = true;
    let finalText = '';
    recognition.onresult = (e) => {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
            if (e.results[i].isFinal) finalText += e.results[i][0].transcript + ' ';
            else interim += e.results[i][0].transcript;
        }
        $('narrative').value = (finalText + interim).trim();
    };
    recognition.onend = () => { recognizing = false; $('recBtn').textContent = t('recBtnIdle'); $('recBtn').classList.remove('recording'); };
    recognition.onerror = () => { recognizing = false; };
    $('recBtn').onclick = () => {
        if (recognizing) { recognition.stop(); return; }
        finalText = '';
        recognition.start();
        recognizing = true;
        $('recBtn').textContent = t('recBtnStop');
        $('recBtn').classList.add('recording');
    };
} else {
    $('recBtn').disabled = true;
}

applyUiLanguage();
bootstrapLanguageGate();

if ($('initialLangSelect')) {
    $('initialLangSelect').addEventListener('change', () => {
        applyLanguageSelection($('initialLangSelect').value);
    });
}

if ($('startAppBtn')) {
    $('startAppBtn').addEventListener('click', () => {
        applyLanguageSelection($('initialLangSelect')?.value || 'en');
        $('langGate').style.display = 'none';
    });
}

// ---- Uncertainty Review Screen ----
function showExtractedFactsReview(entities, retrieved) {
    return new Promise((resolve) => {
        const modalEl = $('factReviewModal');
        const contentEl = $('factReviewContent');
        const previewEl = $('statutePreviewContent');
        const checkboxEl = $('factVerifyCheckbox');
        const proceedBtn = $('factReviewProceedBtn');
        const goBackBtn = $('factReviewGoBackBtn');

        // Build extracted facts display
        const factsHtml = `
            <div class="fact-field ${entities.summary === 'unknown' || !entities.summary ? 'unknown' : ''}">
                <div class="fact-label">Summary of Events</div>
                <div class="fact-value">${entities.summary || '(not extracted)'}</div>
            </div>
            <div class="fact-field ${entities.aggressor === 'unknown' ? 'unknown' : ''}">
                <div class="fact-label">Accused/Aggressor</div>
                <div class="fact-value">${entities.aggressor || '(not identified)'}</div>
            </div>
            <div class="fact-field ${entities.date === 'unknown' || !entities.date ? 'unknown' : ''}">
                <div class="fact-label">Date of Incident</div>
                <div class="fact-value">${entities.date || '(not specified)'}</div>
            </div>
            <div class="fact-field ${entities.location === 'unknown' || !entities.location ? 'unknown' : ''}">
                <div class="fact-label">Location</div>
                <div class="fact-value">${entities.location || '(not specified)'}</div>
            </div>
            <div class="fact-field">
                <div class="fact-label">Category</div>
                <div class="fact-value">${entities.category || 'Unclassified'}</div>
            </div>
        `;
        contentEl.innerHTML = factsHtml;

        // Build statute preview
        const statuteHtml = retrieved.length ? 
            `<strong>Potentially Applicable Statutes:</strong><ul style="margin:6px 0 0 16px;">
                ${retrieved.slice(0, 3).map(({ statute, confidence }) => 
                    `<li><strong>${statute.code} §${statute.section}</strong> — ${statute.title}<br><small>Confidence: ${confidence}</small></li>`
                ).join('')}
            </ul>`
            : '<strong>No statutes matched.</strong> You may still proceed to review manually.';
        previewEl.innerHTML = statuteHtml;

        // Checkbox toggle
        checkboxEl.checked = false;
        checkboxEl.onchange = () => {
            proceedBtn.disabled = !checkboxEl.checked;
            proceedBtn.style.background = checkboxEl.checked ? '#2563eb' : '#e5e7eb';
            proceedBtn.style.borderColor = checkboxEl.checked ? '#1d4ed8' : '#d1d5db';
            proceedBtn.style.color = checkboxEl.checked ? '#ffffff' : '#6b7280';
            proceedBtn.style.cursor = checkboxEl.checked ? 'pointer' : 'not-allowed';
        };

        // Button handlers
        proceedBtn.onclick = () => {
            modalEl.classList.add('hidden');
            resolve(true);
        };

        goBackBtn.onclick = () => {
            modalEl.classList.add('hidden');
            resolve(false);
        };

        // Show modal
        modalEl.classList.remove('hidden');
    });
}

// ---- Pipeline step indicator ----
function setStep(n) {
    document.querySelectorAll('.step').forEach((el) => {
        const s = +el.dataset.step;
        el.classList.toggle('active', s === n);
        el.classList.toggle('done', s < n);
    });
    $('pipeCard').classList.remove('hidden');
}

// ---- Main pipeline run ----
$('runBtn').onclick = async () => {
    const narrative = $('narrative').value.trim();
    if (!narrative) { alert(t('msgNeedNarrative')); return; }

    const selectedLanguage = getSelectedLanguage();
    applyLanguageHint(narrative);

    $('runBtn').disabled = true;
    try {
        setStep(2);

        try {
            await ensureEngine();
        } catch (engineErr) {
            console.warn('Engine start failed; resetting GPU context and retrying:', engineErr);
            resetEngine();
            await ensureEngine();
        }

        let entities;
        try {
            entities = await extractEntities(narrative);
        } catch (inferErr) {
            console.warn('Inference failed, resetting engine and retrying:', inferErr);
            resetEngine();
            await ensureEngine();
            entities = await extractEntities(narrative);
        }

        const retrievedPreview = retrieveSections(narrative, 2);
        if (!isActionableComplaint(narrative, entities, retrievedPreview)) {
            alert(t('msgInsufficientComplaint'));
            $('langHint').textContent = t('msgInsufficientComplaint');
            return;
        }

        // ---- Show Fact Review Modal (Step 4 - Citizen Fact Review) ----
        setStep(4);
        const userVerified = await showExtractedFactsReview(entities, retrievedPreview);
        if (!userVerified) {
            // User clicked "Go Back"; reset pipeline
            $('runBtn').disabled = false;
            return;
        }

        // ---- Continue to Statute Retrieval (Step 3) ----
        setStep(3);
        const retrieved = retrieveSections(narrative);
        lastRetrieved = retrieved;
        $('secList').innerHTML = retrieved.length
            ? retrieved.map(({ statute }) => `<li><strong>${statute.code} §${statute.section}</strong> — ${statute.title}${statute.punishment ? ` · ${statute.punishment}` : ''}</li>`).join('')
            : `<li>${t('noMatch')}</li>`;
        $('secCard').classList.remove('hidden');

        setStep(5);
        lastComplaint = await draftComplaint(entities, retrieved, selectedLanguage || detectLanguage(narrative));
        activeView = 'native';

        setStep(6);
        refreshComplaintView();
        $('outCard').classList.remove('hidden');

        document.querySelectorAll('.step').forEach((el) => { el.classList.remove('active'); el.classList.add('done'); });
    } catch (err) {
        console.error(err);
        alert(`${t('msgPipelineError')} ` + (err?.message || err));
    } finally {
        $('runBtn').disabled = false;
    }
};

$('pdfBtn').onclick = () => {
    if (!lastComplaint) return;
    const draft = activeView === 'english'
        ? (lastComplaint.english || lastComplaint.native || '')
        : (lastComplaint.native || lastComplaint.hindi || lastComplaint.english || '');
    downloadComplaint(complaintToHtml({ english: draft, hindi: draft, native: draft }, {}, lastRetrieved, getSelectedLanguage()));
};
$('langSelect').addEventListener('change', () => {
    applyLanguageSelection($('langSelect').value);
    $('langHint').textContent = `${t('msgLangSet')} ${getSelectedLanguage().toUpperCase()}`;
});

$('geoBtn').addEventListener('click', useBrowserLocation);

$('englishBtn').onclick = () => {
    if (!lastComplaint) return;
    activeView = activeView === 'english' ? 'native' : 'english';
    refreshComplaintView();
};

$('audioBtn').onclick = speakRightsBriefing;
$('stopAudioBtn').onclick = stopAudio;
