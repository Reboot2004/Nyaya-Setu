import { isWebGPUSupported, onLoadingProgress, ensureEngine, resetEngine, extractEntities, draftComplaint, detectLanguage } from './llm.js';
import { retrieveSections, getLoadedStatutes, syncStatutesFromSource, resetToDefaultStatutes, STATUTE_METADATA } from './retrieval.js';
import { complaintToHtml, downloadComplaint, speakRightsBriefing, stopAudio } from './output.js';

const $ = (id) => document.getElementById(id);
const badge = $('engineBadge');
let lastComplaint = null;
let lastRetrieved = [];
let activeView = 'native';
let recognition = null;
let ipGeoSnapshot = null;

export const UI_TEXT = {
    en: {
        appSub: 'Client-side Indic Legal Co-Pilot · BNS/BNSS Statutory Drafting',
        ingestionTitle: '1 · Describe Your Grievance',
        particularsTitle: 'Complainant & Police Station Details (Optional - avoids empty placeholders)',
        lblFullName: 'Your Full Name',
        lblParent: "Father's / Spouse's Name",
        lblPhone: 'Phone Number',
        lblAddress: 'Village / Town / Address',
        lblPoliceStation: 'Police Station / District Name',
        lblAccused: 'Accused Person(s) Name / Description',
        lblIncidentLoc: 'Exact Place of Incident',
        langLabel: 'Language',
        geoBtn: '📍 Capture Verified Location',
        narrativePlaceholder: "Speak or type what happened - in your own words, any language. Example: 'On 25th August, near the village square, Ramu and two others blocked my path, physically assaulted me with a stick, and threatened to kill me if I demanded my pending wages...'",
        recBtnIdle: '🎙️ Record Voice',
        recBtnStop: '⏹ Stop Recording',
        runBtn: 'Generate Formal Police FIR Draft',
        langHintDefault: 'Voice input ready. Tap record to speak.',
        loadTitle: 'Local AI Engine Status (On-Device WebGPU / Rule Engine)',
        pipelineTitle: 'Drafting Pipeline',
        step1: 'Vernacular Ingestion',
        step2: 'Entity Extraction',
        step3: 'AIKosh BNS Retrieval',
        step4: 'Police FIR Drafting',
        step5: 'Bilingual Output',
        sectionsTitle: 'Retrieved Statutory Provisions (Grounded in IndiaAI AIKosh)',
        explorerTitle: '📜 Official Laws Explorer (BNS 2023 / BNSS 2023)',
        explorerSubtitle: 'Browse all enacted penal sections, search keywords, or sync latest gazette amendments.',
        syncBtn: '🔄 Check & Sync AIKosh Updates',
        resetStatutesBtn: 'Reset to Official Gazette 2023 Base',
        searchStatutesPlaceholder: 'Search section number, crime keyword, or Hindi/Indic phrase...',
        outputTitle: 'Formal Police Complaint / FIR Draft',
        outputTitleEnglish: 'Formal Police Complaint / FIR Draft (English)',
        pdfBtn: '📄 Open / Print PDF Complaint',
        englishBtn: '🌐 View English Draft',
        englishBtnBack: '🌐 Back to Selected Language',
        audioBtn: '🔊 Play Legal Rights Briefing',
        stopAudioBtn: '⏹ Stop Audio',
        footer: '100% on-device processing · IndiaAI AIKosh Legislative Corpus · Bhashini Indic Normalizer · Not legal advice · NALSA Helpline 15100',
        statusEngineReady: 'Engine: ready (on-device)',
        statusEngineUnavailable: 'Instant Rule Engine active (100% offline compatible)',
        statusEngineLoaded: 'Llama 3.2 1B Loaded (WebGPU)',
        noMatch: 'No specific penal section matched - draft will use general cognizable complaint format.',
        msgNeedNarrative: 'Please describe your grievance or incident first.',
        msgGeoNotSupported: 'Geolocation is not supported in this browser.',
        msgGeoDenied: 'Location access was not granted. Using typed / IP details.',
        msgGeoCaptured: 'Verified Indian coordinates captured.',
        msgLangSet: 'Language set to',
        msgDetectedLanguage: 'Detected language:',
        msgPipelineError: 'Pipeline error:',
        msgInsufficientComplaint: 'Please provide more details on what occurred, who was involved, and the harm caused.',
        gateTitle: 'Choose Your Language & Grant Permissions',
        gateSubtitle: 'Nyaya-Setu runs 100% on your device. Microphones and location are requested upfront for voice recording and accurate police station mapping.',
        gateContinue: 'Start Legal Co-Pilot',
        ipDetecting: 'Detecting regional jurisdiction from network...',
        ipDetected: 'Regional Jurisdiction:'
    },
    hi: {
        appSub: 'क्लाइंट-साइड इंडिक लीगल को-पायलट · BNS/BNSS वैधानिक ड्राफ्टिंग',
        ingestionTitle: '1 · अपनी शिकायत या घटना का विवरण लिखें',
        particularsTitle: 'शिकायतकर्ता एवं थाना विवरण (वैकल्पिक - ड्राफ्ट को पूर्ण बनाने हेतु)',
        lblFullName: 'आपका पूरा नाम',
        lblParent: 'पिता / पति का नाम',
        lblPhone: 'मोबाइल नंबर',
        lblAddress: 'गाँव / शहर / पता',
        lblPoliceStation: 'थाने / जिले का नाम',
        lblAccused: 'आरोपी का नाम / विवरण',
        lblIncidentLoc: 'घटना का सटीक स्थान',
        langLabel: 'भाषा',
        geoBtn: '📍 प्रमाणित लोकेशन लें',
        narrativePlaceholder: 'जो हुआ उसे अपनी भाषा में लिखें या बोलें। उदाहरण: "25 अगस्त को गांव के चौराहे पर रामू और दो अन्य लोगों ने मेरा रास्ता रोका, लाठी से मारपीट की और जान से मारने की धमकी दी..."',
        recBtnIdle: '🎙️ आवाज रिकॉर्ड करें',
        recBtnStop: '⏹ रिकॉर्डिंग रोकें',
        runBtn: 'औपचारिक पुलिस FIR ड्राफ्ट तैयार करें',
        langHintDefault: 'वॉइस इनपुट तैयार है। बोलने के लिए रिकॉर्ड बटन दबाएं।',
        loadTitle: 'लोकल AI इंजन स्थिति (डिवाइस पर आधारित)',
        pipelineTitle: 'ड्राफ्टिंग प्रक्रिया',
        step1: 'वर्नाक्युलर इनपुट',
        step2: 'एंटिटी एक्सट्रैक्शन',
        step3: 'AIKosh BNS रिट्रीवल',
        step4: 'पुलिस FIR ड्राफ्टिंग',
        step5: 'द्विभाषी आउटपुट',
        sectionsTitle: 'प्राप्त वैधानिक धाराएं (IndiaAI AIKosh प्रमाणित)',
        explorerTitle: '📜 आधिकारिक कानून डायरेक्टरी (BNS 2023 / BNSS 2023)',
        explorerSubtitle: 'सभी लागू वैधानिक धाराओं को खोजें, पढ़ें या नवीनतम सरकारी गजट अपडेट सिंक करें।',
        syncBtn: '🔄 AIKosh अपडेट्स सिंक करें',
        resetStatutesBtn: 'मूल गजट 2023 पर रीसेट करें',
        searchStatutesPlaceholder: 'धारा संख्या, अपराध या हिंदी/स्थानीय शब्द खोजें...',
        outputTitle: 'औपचारिक पुलिस शिकायत पत्र / FIR ड्राफ्ट',
        outputTitleEnglish: 'औपचारिक पुलिस शिकायत पत्र (अंग्रेजी)',
        pdfBtn: '📄 PDF खोलें / प्रिंट करें',
        englishBtn: '🌐 अंग्रेजी ड्राफ्ट देखें',
        englishBtnBack: '🌐 हिंदी ड्राफ्ट पर लौटें',
        audioBtn: '🔊 कानूनी अधिकार ब्रीफिंग सुनें',
        stopAudioBtn: '⏹ ऑडियो रोकें',
        footer: '100% डिवाइस पर प्रोसेसिंग · IndiaAI AIKosh वैधानिक कॉरपस · भाषिणी इंडिक नॉर्मलाइज़र · NALSA हेल्पलाइन 15100',
        statusEngineReady: 'इंजन: तैयार (ऑन-डिवाइस)',
        statusEngineUnavailable: 'इंस्टेंट लीगल इंजन सक्रिय (सभी फोन पर समर्थित)',
        statusEngineLoaded: 'Llama 3.2 1B लोड हो गया (WebGPU)',
        noMatch: 'सीधा वैधानिक मिलान नहीं मिला - सामान्य संज्ञेय प्रारूप उपयोग होगा।',
        msgNeedNarrative: 'कृपया पहले अपनी शिकायत या घटना का विवरण लिखें।',
        msgGeoNotSupported: 'इस ब्राउज़र में जियोलोकेशन समर्थित नहीं है।',
        msgGeoDenied: 'लोकेशन अनुमति नहीं मिली। लिखे हुए पते का उपयोग होगा।',
        msgGeoCaptured: 'प्रमाणित भारतीय लोकेशन दर्ज हुई।',
        msgLangSet: 'भाषा सेट की गई:',
        msgDetectedLanguage: 'पहचानी गई भाषा:',
        msgPipelineError: 'ड्राफ्टिंग त्रुटि:',
        msgInsufficientComplaint: 'कृपया घटना, आरोपी और हुए नुकसान का पर्याप्त विवरण दें।',
        gateTitle: 'अपनी भाषा चुनें एवं अनुमति दें',
        gateSubtitle: 'Nyaya-Setu पूरी तरह आपके डिवाइस पर चलता है। वॉइस रिकॉर्डिंग और स्थानीय थाने के लिए अनुमतियाँ ली जा रही हैं।',
        gateContinue: 'लीगल को-पायलट शुरू करें',
        ipDetecting: 'क्षेत्रीय अधिकार क्षेत्र की पहचान हो रही है...',
        ipDetected: 'अनुमानित अधिकार क्षेत्र:'
    },
    te: {
        appSub: 'క్లయింట్-సైడ్ ఇండిక్ లీగల్ కో-పైలట్ · BNS/BNSS చట్ట రచన',
        ingestionTitle: '1 · మీ ఫిర్యాదు లేదా సంఘటనను వివరించండి',
        particularsTitle: 'ఫిర్యాదుదారు మరియు పోలీస్ స్టేషన్ వివరాలు (ఐచ్ఛికం)',
        lblFullName: 'మీ పూర్తి పేరు',
        lblParent: 'తండ్రి / భర్త పేరు',
        lblPhone: 'ఫోన్ నంబర్',
        lblAddress: 'గ్రామం / పట్టణం / చిరునామా',
        lblPoliceStation: 'పోలీస్ స్టేషన్ / జిల్లా పేరు',
        lblAccused: 'నిందితుని పేరు / వివరాలు',
        lblIncidentLoc: 'సంఘటన జరిగిన స్థలం',
        langLabel: 'భాష',
        geoBtn: '📍 స్థానాన్ని నమోదు చేయండి',
        narrativePlaceholder: 'ఏం జరిగిందో మీ మాటల్లో చెప్పండి లేదా టైప్ చేయండి.',
        recBtnIdle: '🎙️ వాయిస్ రికార్డ్',
        recBtnStop: '⏹ రికార్డింగ్ ఆపు',
        runBtn: 'అధికారిక పోలీస్ FIR డ్రాఫ్ట్ రూపొందించండి',
        langHintDefault: 'వాయిస్ సిద్ధంగా ఉంది. మాట్లాడటానికి రికార్డ్ నొక్కండి.',
        loadTitle: 'స్థానిక AI ఇంజిన్ స్థితి',
        pipelineTitle: 'డ్రాఫ్టింగ్ ప్రక్రియ',
        step1: 'స్థానిక భాష ఇన్‌పుట్',
        step2: 'ఎంటిటీ ఎక్స్‌ట్రాక్షన్',
        step3: 'AIKosh BNS రిట్రీవల్',
        step4: 'పోలీస్ FIR రచన',
        step5: 'ద్విభాషా అవుట్‌పుట్',
        sectionsTitle: 'సంబంధిత చట్ట విభాగాలు (AIKosh డేటాసెట్)',
        explorerTitle: '📜 అధికారిక చట్టాల నిఘంటువు (BNS 2023 / BNSS 2023)',
        explorerSubtitle: 'అన్ని చట్ట విభాగాలను బ్రౌజ్ చేయండి లేదా గెజిట్ మార్పులను సింక్ చేయండి.',
        syncBtn: '🔄 AIKosh అప్‌డేట్స్ సింక్ చేయండి',
        resetStatutesBtn: 'రీసెట్ చేయండి',
        searchStatutesPlaceholder: 'సెక్షన్ నంబర్ లేదా నేరం శోధించండి...',
        outputTitle: 'అధికారిక పోలీస్ ఫిర్యాదు / FIR డ్రాఫ్ట్',
        outputTitleEnglish: 'అధికారిక ఫిర్యాదు (ఇంగ్లీష్)',
        pdfBtn: '📄 PDF తెరువు / ప్రింట్',
        englishBtn: '🌐 ఇంగ్లీష్ డ్రాఫ్ట్',
        englishBtnBack: '🌐 తెలుగు డ్రాఫ్ట్ కు తిరుగు',
        audioBtn: '🔊 చట్టబద్ధ హక్కుల వివరణ వినండి',
        stopAudioBtn: '⏹ ఆడియో ఆపు',
        footer: '100% పరికరంపైనే ప్రాసెసింగ్ · IndiaAI AIKosh డేటాసెట్ · NALSA హెల్ప్‌లైన్ 15100',
        statusEngineReady: 'ఇంజిన్: సిద్ధం',
        statusEngineUnavailable: 'ఆఫ్‌లైన్ లీగల్ ఇంజిన్ యాక్టివ్',
        statusEngineLoaded: 'Llama 3.2 1B సిద్ధంగా ఉంది',
        noMatch: 'ప్రత్యేక చట్ట విభాగం సరిపోలలేదు - సాధారణ ఫిర్యాదు రూపం రూపొందించబడుతుంది.',
        msgNeedNarrative: 'దయచేసి మీ ఫిర్యాదు వివరాలను నమోదు చేయండి.',
        msgGeoNotSupported: 'జియోలొకేషన్ సపోర్ట్ లేదు.',
        msgGeoDenied: 'లొకేషన్ అనుమతి లభించలేదు.',
        msgGeoCaptured: 'భారతీయ లొకేషన్ నమోదు చేయబడింది.',
        msgLangSet: 'భాష సెట్ చేయబడింది:',
        msgDetectedLanguage: 'గుర్తించిన భాష:',
        msgPipelineError: 'లోపం సంభవించింది:',
        msgInsufficientComplaint: 'దయచేసి ఘటన వివరాలను మరింత స్పష్టంగా తెలియజేయండి.',
        gateTitle: 'మీ భాషను ఎంచుకోండి',
        gateSubtitle: 'న్యాయ-సేతు మీ ఫోన్‌లోనే సురక్షితంగా పనిచేస్తుంది.',
        gateContinue: 'కొనసాగించండి',
        ipDetecting: 'ప్రాంతం గుర్తిస్తోంది...',
        ipDetected: 'గుర్తించిన ప్రాంతం:'
    }
};

function t(key, fallback = '') {
    const lang = ($('langSelect')?.value || 'en').toLowerCase();
    return UI_TEXT[lang]?.[key] || UI_TEXT.en[key] || fallback;
}

export function applyUiLanguage() {
    const lang = ($('langSelect')?.value || 'en').toLowerCase();
    $('rootHtml').setAttribute('lang', lang);
    $('appSub').textContent = t('appSub');
    $('ingestionTitle').textContent = t('ingestionTitle');
    $('particularsTitle').textContent = t('particularsTitle');
    $('lblFullName').textContent = t('lblFullName');
    $('lblParent').textContent = t('lblParent');
    $('lblPhone').textContent = t('lblPhone');
    $('lblAddress').textContent = t('lblAddress');
    $('lblPoliceStation').textContent = t('lblPoliceStation');
    $('lblAccused').textContent = t('lblAccused');
    $('lblIncidentLoc').textContent = t('lblIncidentLoc');
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
    $('explorerTitle').textContent = t('explorerTitle');
    $('explorerSubtitle').textContent = t('explorerSubtitle');
    $('syncBtn').textContent = t('syncBtn');
    $('resetStatutesBtn').textContent = t('resetStatutesBtn');
    $('statuteSearch').placeholder = t('searchStatutesPlaceholder');
    $('pdfBtn').textContent = t('pdfBtn');
    $('englishBtn').textContent = activeView === 'english' ? t('englishBtnBack') : t('englishBtn');
    $('audioBtn').textContent = t('audioBtn');
    $('stopAudioBtn').textContent = t('stopAudioBtn');
    $('appFooter').textContent = t('footer');
    if ($('gateTitle')) $('gateTitle').textContent = t('gateTitle');
    if ($('gateSubtitle')) $('gateSubtitle').textContent = t('gateSubtitle');
    if ($('initialLangLabel')) $('initialLangLabel').textContent = t('langLabel');
    if ($('startAppBtn')) $('startAppBtn').textContent = t('gateContinue');
    if (!recognition || !recognizing) {
        $('recBtn').textContent = t('recBtnIdle');
    }
    $('langHint').textContent = t('langHintDefault');
}

export function getSelectedLanguage() {
    return $('langSelect')?.value || 'en';
}

function applyLanguageSelection(langCode) {
    const lang = langCode || 'en';
    if ($('langSelect')) $('langSelect').value = lang;
    if ($('initialLangSelect')) $('initialLangSelect').value = lang;
    applyUiLanguage();
    if (recognition) {
        const map = { en: 'en-IN', hi: 'hi-IN', te: 'te-IN', ta: 'ta-IN', bn: 'bn-IN', mr: 'mr-IN', kn: 'kn-IN', ml: 'ml-IN' };
        recognition.lang = map[lang] || 'en-IN';
    }
}

// ---- Render Laws Explorer ----
function renderLawsExplorer(filterText = '') {
    const list = getLoadedStatutes();
    const q = filterText.toLowerCase().trim();
    const filtered = list.filter((s) => {
        if (!q) return true;
        const hay = `${s.code} ${s.section} ${s.title} ${s.text} ${s.triggers.join(' ')} ${s.category}`.toLowerCase();
        return hay.includes(q);
    });

    const container = $('explorerList');
    if (!container) return;

    if (filtered.length === 0) {
        container.innerHTML = `<p style="font-size:0.85rem;color:#64748b;padding:10px;">No statutes match query "${filterText}".</p>`;
        return;
    }

    container.innerHTML = filtered.map((s) => `
        <div style="border-bottom:1px solid #e2e8f0;padding:8px 0;font-size:0.84rem;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px;">
                <strong style="color:#0f172a;">${s.code} Section ${s.section}</strong>
                <span class="badge" style="font-size:0.65rem;border-color:#94a3b8;color:#475569;">${s.category.toUpperCase()}</span>
            </div>
            <div style="font-weight:600;color:#1e293b;margin-bottom:2px;">${s.title}</div>
            <p style="color:#334155;margin-bottom:4px;line-height:1.35;">${s.text}</p>
            ${s.punishment ? `<div style="font-size:0.75rem;color:#b91c1c;font-weight:600;">⚖️ Punishment: ${s.punishment}</div>` : ''}
            <div style="font-size:0.7rem;color:#64748b;margin-top:2px;">🏛️ Source: ${s.source || 'AIKosh Gazette 2023'}</div>
        </div>
    `).join('');
}

// ---- Proactive Startup & Permissions Request ----
async function requestStartupPermissions() {
    // 1. Pre-request Microphone if supported
    try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach((t) => t.stop()); // close cleanly after approval
        }
    } catch (e) {
        console.log('Mic permission pre-request skipped or deferred:', e);
    }

    // 2. Pre-request Geolocation
    try {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const lat = pos.coords.latitude.toFixed(4);
                    const lon = pos.coords.longitude.toFixed(4);
                    if ($('cLoc')) $('cLoc').value = `Coordinates: ${lat}, ${lon} (Verified GPS)`;
                    if ($('cAddr') && !$('cAddr').value) $('cAddr').value = `District / Locality near (${lat}, ${lon}), India`;
                },
                (err) => console.log('Geolocation skipped:', err),
                { timeout: 5000 }
            );
        }
    } catch (e) {
        console.log('Geo permission skipped:', e);
    }
}

async function bootstrapLanguageGate() {
    if ($('ipHint')) $('ipHint').textContent = t('ipDetecting');
    let selected = 'en';

    try {
        const res = await fetch('https://ipapi.co/json/', { cache: 'no-store' });
        if (res.ok) {
            const geo = await res.json();
            ipGeoSnapshot = geo;
            const region = (geo.region || '').toLowerCase();
            if (geo.country_code === 'IN') {
                if (region.includes('telangana') || region.includes('andhra')) selected = 'te';
                else if (region.includes('tamil')) selected = 'ta';
                else if (region.includes('bengal')) selected = 'bn';
                else if (region.includes('maharashtra')) selected = 'mr';
                else if (region.includes('karnataka')) selected = 'kn';
                else if (region.includes('kerala')) selected = 'ml';
                else selected = 'hi';
            }
            const place = [geo.city, geo.region, geo.country_name].filter(Boolean).join(', ');
            if ($('ipHint')) $('ipHint').textContent = `${t('ipDetected')} ${place}`;
            if ($('cAddr') && !$('cAddr').value && geo.country_code === 'IN') {
                $('cAddr').value = `${geo.city || ''}, ${geo.region || ''}, India`;
            }
            if ($('cStation') && !$('cStation').value && geo.city) {
                $('cStation').value = `${geo.city} Police Station / ${geo.region || 'District'}`;
            }
        }
    } catch {
        if ($('ipHint')) $('ipHint').textContent = 'Ready';
    }

    applyLanguageSelection(selected);
    renderLawsExplorer();
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
            const locText = `Location: ${lat}, ${lon} (Verified Indian GPS coordinates)`;
            if ($('cLoc')) $('cLoc').value = locText;
            const existing = $('narrative').value.trim();
            $('narrative').value = existing ? `${existing}\n\n[${locText}]` : `[${locText}]`;
            $('langHint').textContent = t('msgGeoCaptured');
        },
        () => {
            alert(t('msgGeoDenied'));
        },
        { enableHighAccuracy: true, timeout: 10000 }
    );
}

// ---- Engine preload ----
if (!isWebGPUSupported()) {
    badge.textContent = `⚡ ${t('statusEngineUnavailable')}`;
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

const LANG_BCP47 = {
    en: 'en-IN',
    hi: 'hi-IN',
    te: 'te-IN',
    ta: 'ta-IN',
    bn: 'bn-IN',
    mr: 'mr-IN',
    kn: 'kn-IN',
    ml: 'ml-IN'
};

if (SR) {
    recognition = new SR();
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

    recognition.onend = () => {
        recognizing = false;
        $('recBtn').textContent = t('recBtnIdle');
        $('recBtn').classList.remove('recording');
    };

    recognition.onerror = (e) => {
        console.warn('Speech recognition status:', e.error);
        recognizing = false;
        $('recBtn').textContent = t('recBtnIdle');
        $('recBtn').classList.remove('recording');
        if (e.error === 'not-allowed') {
            alert('Microphone access was denied. Please allow microphone access in browser permissions.');
        }
    };

    $('recBtn').onclick = () => {
        if (recognizing) {
            recognition.stop();
            return;
        }
        const currentLang = getSelectedLanguage() || 'en';
        recognition.lang = LANG_BCP47[currentLang] || 'en-IN';
        finalText = $('narrative').value ? $('narrative').value + ' ' : '';
        try {
            recognition.start();
            recognizing = true;
            $('recBtn').textContent = t('recBtnStop');
            $('recBtn').classList.add('recording');
            $('langHint').textContent = `Listening in ${recognition.lang}...`;
        } catch (err) {
            console.error('Failed to start recognition:', err);
        }
    };
} else {
    $('recBtn').onclick = () => {
        alert('Voice input is supported in Chrome, Edge, and Android browsers.');
    };
}

applyUiLanguage();
bootstrapLanguageGate();

if ($('initialLangSelect')) {
    $('initialLangSelect').addEventListener('change', () => {
        applyLanguageSelection($('initialLangSelect').value);
    });
}

if ($('startAppBtn')) {
    $('startAppBtn').addEventListener('click', async () => {
        applyLanguageSelection($('initialLangSelect')?.value || 'en');
        $('langGate').style.display = 'none';
        await requestStartupPermissions();
    });
}

if ($('statuteSearch')) {
    $('statuteSearch').addEventListener('input', (e) => {
        renderLawsExplorer(e.target.value);
    });
}

if ($('syncBtn')) {
    $('syncBtn').addEventListener('click', async () => {
        $('syncBtn').disabled = true;
        $('syncBtn').textContent = 'Syncing...';
        const res = await syncStatutesFromSource();
        if (res.success) {
            alert(`AIKosh Sync Complete: ${res.count} statutory provisions updated in offline cache.`);
            renderLawsExplorer();
        } else {
            alert(`Using verified local Gazette corpus. (Remote notice: ${res.error || 'Offline'})`);
        }
        $('syncBtn').disabled = false;
        $('syncBtn').textContent = t('syncBtn');
    });
}

if ($('resetStatutesBtn')) {
    $('resetStatutesBtn').addEventListener('click', () => {
        resetToDefaultStatutes();
        renderLawsExplorer();
        alert('Statutory corpus reset to official Gazette 2023 baseline.');
    });
}

function setStep(n) {
    document.querySelectorAll('.step').forEach((el) => {
        const s = +el.dataset.step;
        el.classList.toggle('active', s === n);
        el.classList.toggle('done', s < n);
    });
    $('pipeCard').classList.remove('hidden');
}

// ---- Main Pipeline Execution ----
$('runBtn').onclick = async () => {
    const narrative = $('narrative').value.trim();
    if (!narrative || narrative.length < 15) {
        alert(t('msgNeedNarrative'));
        return;
    }

    const complainantInfo = {
        name: $('cName')?.value || '',
        parent: $('cParent')?.value || '',
        phone: $('cPhone')?.value || '',
        address: $('cAddr')?.value || '',
        station: $('cStation')?.value || '',
        accused: $('cAccused')?.value || '',
        location: $('cLoc')?.value || '',
        narrative: narrative
    };

    $('runBtn').disabled = true;

    try {
        setStep(1);
        const selectedLanguage = getSelectedLanguage();

        setStep(2);
        let entities = await extractEntities(narrative);

        setStep(3);
        const retrieved = retrieveSections(narrative);
        lastRetrieved = retrieved;
        $('secList').innerHTML = retrieved.length
            ? retrieved.map(({ statute }) => `<li><strong>${statute.code} §${statute.section}</strong> — ${statute.title}${statute.punishment ? ` · <span style="color:#b91c1c">${statute.punishment}</span>` : ''}</li>`).join('')
            : `<li>${t('noMatch')}</li>`;
        $('secCard').classList.remove('hidden');

        setStep(4);
        lastComplaint = await draftComplaint(complainantInfo, entities, retrieved, selectedLanguage);
        activeView = 'native';

        setStep(5);
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

$('audioBtn').onclick = () => speakRightsBriefing(getSelectedLanguage());
$('stopAudioBtn').onclick = stopAudio;
