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
        appSub: 'Client-side Indic Legal Co-Pilot Â· BNS/BNSS Statutory Drafting',
        ingestionTitle: '1 Â· Describe your grievance',
        langLabel: 'Language',
        geoBtn: 'ðŸ“ Use my location',
        narrativePlaceholder: "Speak or type what happened - in your own words, any language. Example: 'Sarpanch ke log ne mera majdoori paisa rok liya aur dhamki di...'",
        recBtnIdle: 'ðŸŽ™ï¸ Record Voice',
        recBtnStop: 'â¹ Stop Recording',
        runBtn: 'Generate Complaint Draft',
        langHintDefault: 'Voice input uses browser speech recognition (en-IN default)',
        loadTitle: 'Loading local AI engine (Llama 3.2 1B Â· WebGPU Â· runs on your device)',
        pipelineTitle: 'Pipeline',
        step1: 'Vernacular Input',
        step2: 'Entity Extraction',
        step3: 'BNS Retrieval',
        step4: 'Local LLM Drafting',
        step5: 'Complaint Output',
        sectionsTitle: 'Retrieved Statutory Provisions (grounded - no hallucinated sections)',
        outputTitle: 'Formal Complaint Draft',
        outputTitleEnglish: 'Formal Complaint Draft (English)',
        pdfBtn: 'ðŸ“„ Open / Print PDF',
        englishBtn: 'ðŸŒ English version',
        englishBtnBack: 'ðŸŒ Back to selected language',
        audioBtn: 'ðŸ”Š Play Rights Briefing',
        stopAudioBtn: 'â¹ Stop Audio',
        footer: '100% on-device processing Â· No grievance data leaves this device Â· Not legal advice Â· NALSA Helpline 15100',
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
        userLanguageBtn: 'ðŸŒ User language'
    },
    hi: {
        appSub: 'à¤•à¥à¤²à¤¾à¤‡à¤‚à¤Ÿ-à¤¸à¤¾à¤‡à¤¡ à¤‡à¤‚à¤¡à¤¿à¤• à¤²à¥€à¤—à¤² à¤•à¥‹-à¤ªà¤¾à¤¯à¤²à¤Ÿ Â· BNS/BNSS à¤µà¥ˆà¤§à¤¾à¤¨à¤¿à¤• à¤¡à¥à¤°à¤¾à¤«à¥à¤Ÿà¤¿à¤‚à¤—',
        ingestionTitle: '1 Â· à¤…à¤ªà¤¨à¥€ à¤¶à¤¿à¤•à¤¾à¤¯à¤¤ à¤²à¤¿à¤–à¥‡à¤‚',
        langLabel: 'à¤­à¤¾à¤·à¤¾',
        geoBtn: 'ðŸ“ à¤®à¥‡à¤°à¥€ à¤²à¥‹à¤•à¥‡à¤¶à¤¨ à¤‰à¤ªà¤¯à¥‹à¤— à¤•à¤°à¥‡à¤‚',
        narrativePlaceholder: 'à¤œà¥‹ à¤¹à¥à¤† à¤¹à¥ˆ à¤‰à¤¸à¥‡ à¤…à¤ªà¤¨à¥€ à¤­à¤¾à¤·à¤¾ à¤®à¥‡à¤‚ à¤²à¤¿à¤–à¥‡à¤‚ à¤¯à¤¾ à¤¬à¥‹à¤²à¥‡à¤‚à¥¤',
        recBtnIdle: 'ðŸŽ™ï¸ à¤†à¤µà¤¾à¤œ à¤°à¤¿à¤•à¥‰à¤°à¥à¤¡ à¤•à¤°à¥‡à¤‚',
        recBtnStop: 'â¹ à¤°à¤¿à¤•à¥‰à¤°à¥à¤¡à¤¿à¤‚à¤— à¤°à¥‹à¤•à¥‡à¤‚',
        runBtn: 'à¤¶à¤¿à¤•à¤¾à¤¯à¤¤ à¤¡à¥à¤°à¤¾à¤«à¥à¤Ÿ à¤¬à¤¨à¤¾à¤à¤‚',
        langHintDefault: 'à¤µà¥‰à¤‡à¤¸ à¤‡à¤¨à¤ªà¥à¤Ÿ à¤¬à¥à¤°à¤¾à¤‰à¤œà¤¼à¤° à¤¸à¥à¤ªà¥€à¤š à¤°à¤¿à¤•à¤—à¥à¤¨à¤¿à¤¶à¤¨ à¤•à¤¾ à¤‰à¤ªà¤¯à¥‹à¤— à¤•à¤°à¤¤à¤¾ à¤¹à¥ˆ (en-IN default)',
        loadTitle: 'à¤²à¥‹à¤•à¤² AI à¤‡à¤‚à¤œà¤¨ à¤²à¥‹à¤¡ à¤¹à¥‹ à¤°à¤¹à¤¾ à¤¹à¥ˆ (Llama 3.2 1B Â· WebGPU)',
        pipelineTitle: 'à¤ªà¥à¤°à¤•à¥à¤°à¤¿à¤¯à¤¾',
        step1: 'à¤µà¤°à¥à¤¨à¤¾à¤•à¥à¤¯à¥à¤²à¤° à¤‡à¤¨à¤ªà¥à¤Ÿ',
        step2: 'à¤à¤‚à¤Ÿà¤¿à¤Ÿà¥€ à¤à¤•à¥à¤¸à¤Ÿà¥à¤°à¥ˆà¤•à¥à¤¶à¤¨',
        step3: 'BNS à¤°à¤¿à¤Ÿà¥à¤°à¥€à¤µà¤²',
        step4: 'à¤²à¥‹à¤•à¤² LLM à¤¡à¥à¤°à¤¾à¤«à¥à¤Ÿà¤¿à¤‚à¤—',
        step5: 'à¤¶à¤¿à¤•à¤¾à¤¯à¤¤ à¤†à¤‰à¤Ÿà¤ªà¥à¤Ÿ',
        sectionsTitle: 'à¤ªà¥à¤°à¤¾à¤ªà¥à¤¤ à¤µà¥ˆà¤§à¤¾à¤¨à¤¿à¤• à¤ªà¥à¤°à¤¾à¤µà¤§à¤¾à¤¨ (à¤¸à¤¤à¥à¤¯à¤¾à¤ªà¤¿à¤¤)',
        outputTitle: 'à¤”à¤ªà¤šà¤¾à¤°à¤¿à¤• à¤¶à¤¿à¤•à¤¾à¤¯à¤¤ à¤¡à¥à¤°à¤¾à¤«à¥à¤Ÿ',
        outputTitleEnglish: 'à¤”à¤ªà¤šà¤¾à¤°à¤¿à¤• à¤¶à¤¿à¤•à¤¾à¤¯à¤¤ à¤¡à¥à¤°à¤¾à¤«à¥à¤Ÿ (à¤…à¤‚à¤—à¥à¤°à¥‡à¤œà¥€)',
        pdfBtn: 'ðŸ“„ PDF à¤–à¥‹à¤²à¥‡à¤‚ / à¤ªà¥à¤°à¤¿à¤‚à¤Ÿ à¤•à¤°à¥‡à¤‚',
        englishBtn: 'ðŸŒ à¤…à¤‚à¤—à¥à¤°à¥‡à¤œà¥€ à¤¸à¤‚à¤¸à¥à¤•à¤°à¤£',
        englishBtnBack: 'ðŸŒ à¤šà¥à¤¨à¥€ à¤¹à¥à¤ˆ à¤­à¤¾à¤·à¤¾ à¤ªà¤° à¤²à¥Œà¤Ÿà¥‡à¤‚',
        audioBtn: 'ðŸ”Š à¤…à¤§à¤¿à¤•à¤¾à¤° à¤¬à¥à¤°à¥€à¤«à¤¿à¤‚à¤— à¤šà¤²à¤¾à¤à¤‚',
        stopAudioBtn: 'â¹ à¤‘à¤¡à¤¿à¤¯à¥‹ à¤°à¥‹à¤•à¥‡à¤‚',
        footer: '100% à¤¡à¤¿à¤µà¤¾à¤‡à¤¸ à¤ªà¤° à¤ªà¥à¤°à¥‹à¤¸à¥‡à¤¸à¤¿à¤‚à¤— Â· à¤•à¥‹à¤ˆ à¤¡à¥‡à¤Ÿà¤¾ à¤¬à¤¾à¤¹à¤° à¤¨à¤¹à¥€à¤‚ à¤œà¤¾à¤¤à¤¾ Â· à¤¯à¤¹ à¤•à¤¾à¤¨à¥‚à¤¨à¥€ à¤¸à¤²à¤¾à¤¹ à¤¨à¤¹à¥€à¤‚ à¤¹à¥ˆ Â· NALSA à¤¹à¥‡à¤²à¥à¤ªà¤²à¤¾à¤‡à¤¨ 15100',
        statusEngineReady: 'à¤‡à¤‚à¤œà¤¨: à¤²à¥‹à¤¡ à¤¹à¥‹à¤¨à¥‡ à¤•à¥‡ à¤²à¤¿à¤ à¤¤à¥ˆà¤¯à¤¾à¤°',
        statusEngineUnavailable: 'WebGPU à¤‰à¤ªà¤²à¤¬à¥à¤§ à¤¨à¤¹à¥€à¤‚ - à¤«à¥‰à¤²à¤¬à¥ˆà¤• à¤®à¥‹à¤¡',
        statusEngineLoaded: 'à¤‡à¤‚à¤œà¤¨ à¤²à¥‹à¤¡ à¤¹à¥‹ à¤—à¤¯à¤¾ (à¤¡à¤¿à¤µà¤¾à¤‡à¤¸ à¤ªà¤°)',
        noMatch: 'à¤¸à¥€à¤§à¤¾ à¤µà¥ˆà¤§à¤¾à¤¨à¤¿à¤• à¤®à¤¿à¤²à¤¾à¤¨ à¤¨à¤¹à¥€à¤‚ à¤®à¤¿à¤²à¤¾ - à¤¸à¤¾à¤®à¤¾à¤¨à¥à¤¯ à¤¶à¤¿à¤•à¤¾à¤¯à¤¤ à¤ªà¥à¤°à¤¾à¤°à¥‚à¤ª à¤‰à¤ªà¤¯à¥‹à¤— à¤¹à¥‹à¤—à¤¾à¥¤',
        msgNeedNarrative: 'à¤•à¥ƒà¤ªà¤¯à¤¾ à¤ªà¤¹à¤²à¥‡ à¤…à¤ªà¤¨à¥€ à¤¶à¤¿à¤•à¤¾à¤¯à¤¤ à¤²à¤¿à¤–à¥‡à¤‚à¥¤',
        msgGeoNotSupported: 'à¤‡à¤¸ à¤¬à¥à¤°à¤¾à¤‰à¤œà¤¼à¤° à¤®à¥‡à¤‚ à¤œà¤¿à¤¯à¥‹à¤²à¥‹à¤•à¥‡à¤¶à¤¨ à¤¸à¤®à¤°à¥à¤¥à¤¿à¤¤ à¤¨à¤¹à¥€à¤‚ à¤¹à¥ˆà¥¤',
        msgGeoDenied: 'à¤²à¥‹à¤•à¥‡à¤¶à¤¨ à¤…à¤¨à¥à¤®à¤¤à¤¿ à¤…à¤¸à¥à¤µà¥€à¤•à¤¾à¤° à¤¹à¥à¤ˆà¥¤ à¤†à¤ª à¤¬à¤¿à¤¨à¤¾ à¤²à¥‹à¤•à¥‡à¤¶à¤¨ à¤­à¥€ à¤œà¤¾à¤°à¥€ à¤°à¤– à¤¸à¤•à¤¤à¥‡ à¤¹à¥ˆà¤‚à¥¤',
        msgGeoCaptured: 'à¤²à¥‹à¤•à¥‡à¤¶à¤¨ à¤¬à¥à¤°à¤¾à¤‰à¤œà¤¼à¤° à¤œà¤¿à¤¯à¥‹à¤²à¥‹à¤•à¥‡à¤¶à¤¨ à¤¸à¥‡ à¤²à¥€ à¤—à¤ˆà¥¤',
        msgLangSet: 'à¤¡à¥à¤°à¤¾à¤«à¥à¤Ÿ à¤”à¤° UI à¤­à¤¾à¤·à¤¾ à¤¸à¥‡à¤Ÿ à¤•à¥€ à¤—à¤ˆ:',
        msgDetectedLanguage: 'à¤ªà¤¹à¤šà¤¾à¤¨à¥€ à¤—à¤ˆ à¤­à¤¾à¤·à¤¾:',
        msgAutoLanguage: 'à¤‡à¤¨à¤ªà¥à¤Ÿ à¤¸à¥‡ à¤­à¤¾à¤·à¤¾ à¤šà¥à¤¨à¥€ à¤—à¤ˆ',
        msgPipelineError: 'à¤ªà¤¾à¤‡à¤ªà¤²à¤¾à¤‡à¤¨ à¤¤à¥à¤°à¥à¤Ÿà¤¿:',
        msgInsufficientComplaint: 'à¤†à¤ªà¤•à¤¾ à¤Ÿà¥‡à¤•à¥à¤¸à¥à¤Ÿ à¤…à¤­à¥€ à¤¶à¤¿à¤•à¤¾à¤¯à¤¤ à¤œà¥ˆà¤¸à¤¾ à¤¨à¤¹à¥€à¤‚ à¤²à¤— à¤°à¤¹à¤¾à¥¤ à¤•à¥ƒà¤ªà¤¯à¤¾ à¤•à¥à¤¯à¤¾ à¤¹à¥à¤†, à¤•à¤¿à¤¸à¤¨à¥‡ à¤•à¤¿à¤¯à¤¾, à¤•à¤¬ à¤¹à¥à¤†, à¤”à¤° à¤¨à¥à¤•à¤¸à¤¾à¤¨/à¤§à¤®à¤•à¥€ à¤•à¤¾ à¤µà¤¿à¤µà¤°à¤£ à¤²à¤¿à¤–à¥‡à¤‚, à¤«à¤¿à¤° FIR à¤¡à¥à¤°à¤¾à¤«à¥à¤Ÿ à¤¬à¤¨à¤¾à¤à¤‚à¥¤',
        gateTitle: 'à¤…à¤ªà¤¨à¥€ à¤­à¤¾à¤·à¤¾ à¤šà¥à¤¨à¥‡à¤‚',
        gateSubtitle: 'à¤ªà¥‚à¤°à¤¾ à¤à¤ª à¤šà¥à¤¨à¥€ à¤—à¤ˆ à¤­à¤¾à¤·à¤¾ à¤®à¥‡à¤‚ à¤²à¥‹à¤¡ à¤¹à¥‹à¤—à¤¾à¥¤ à¤¹à¤® IP à¤¸à¥‡ à¤…à¤¨à¥à¤®à¤¾à¤¨à¤¿à¤¤ à¤­à¤¾à¤·à¤¾ à¤”à¤° à¤²à¥‹à¤•à¥‡à¤¶à¤¨ à¤­à¥€ à¤ªà¤¹à¤šà¤¾à¤¨à¤¨à¥‡ à¤•à¥€ à¤•à¥‹à¤¶à¤¿à¤¶ à¤•à¤°à¤¤à¥‡ à¤¹à¥ˆà¤‚à¥¤',
        gateContinue: 'à¤†à¤—à¥‡ à¤¬à¤¢à¤¼à¥‡à¤‚',
        ipDetecting: 'IP à¤¸à¥‡ à¤…à¤¨à¥à¤®à¤¾à¤¨à¤¿à¤¤ à¤²à¥‹à¤•à¥‡à¤¶à¤¨ à¤ªà¤¹à¤šà¤¾à¤¨ à¤°à¤¹à¥‡ à¤¹à¥ˆà¤‚...',
        ipDetected: 'IP à¤¸à¥‡ à¤…à¤¨à¥à¤®à¤¾à¤¨à¤¿à¤¤ à¤²à¥‹à¤•à¥‡à¤¶à¤¨ à¤®à¤¿à¤²à¥€:'
    },
    te: {
        appSub: 'à°•à±à°²à°¯à°¿à°‚à°Ÿà±-à°¸à±ˆà°¡à± à°‡à°‚à°¡à°¿à°•à± à°²à±€à°—à°²à± à°•à±‹-à°ªà±ˆà°²à°Ÿà± Â· BNS/BNSS à°šà°Ÿà±à°Ÿ à°°à°šà°¨',
        ingestionTitle: '1 Â· à°®à±€ à°«à°¿à°°à±à°¯à°¾à°¦à±à°¨à± à°µà°¿à°µà°°à°¿à°‚à°šà°‚à°¡à°¿',
        langLabel: 'à°­à°¾à°·',
        geoBtn: 'ðŸ“ à°¨à°¾ à°¸à±à°¥à°¾à°¨à°‚ à°‰à°ªà°¯à±‹à°—à°¿à°‚à°šà°‚à°¡à°¿',
        narrativePlaceholder: 'à°à°‚ à°œà°°à°¿à°—à°¿à°‚à°¦à±‹ à°®à±€ à°­à°¾à°·à°²à±‹ à°Ÿà±ˆà°ªà± à°šà±‡à°¯à°‚à°¡à°¿ à°²à±‡à°¦à°¾ à°šà±†à°ªà±à°ªà°‚à°¡à°¿.',
        recBtnIdle: 'ðŸŽ™ï¸ à°µà°¾à°¯à°¿à°¸à± à°°à°¿à°•à°¾à°°à±à°¡à±',
        recBtnStop: 'â¹ à°°à°¿à°•à°¾à°°à±à°¡à°¿à°‚à°—à± à°†à°ªà±',
        runBtn: 'à°«à°¿à°°à±à°¯à°¾à°¦à± à°¡à±à°°à°¾à°«à±à°Ÿà± à°°à±‚à°ªà±Šà°‚à°¦à°¿à°‚à°šà°‚à°¡à°¿',
        langHintDefault: 'à°µà°¾à°¯à°¿à°¸à± à°‡à°¨à±â€Œà°ªà±à°Ÿà± à°¬à±à°°à±Œà°œà°°à± à°¸à±à°ªà±€à°šà± à°—à±à°°à±à°¤à°¿à°‚à°ªà±à°¨à± à°‰à°ªà°¯à±‹à°—à°¿à°¸à±à°¤à±à°‚à°¦à°¿ (en-IN default)',
        loadTitle: 'à°²à±‹à°•à°²à± AI à°‡à°‚à°œà°¿à°¨à± à°²à±‹à°¡à± à°…à°µà±à°¤à±‹à°‚à°¦à°¿ (Llama 3.2 1B Â· WebGPU)',
        pipelineTitle: 'à°ªà±ˆà°ªà±â€Œà°²à±ˆà°¨à±',
        step1: 'à°¸à±à°¥à°¾à°¨à°¿à°• à°­à°¾à°· à°‡à°¨à±â€Œà°ªà±à°Ÿà±',
        step2: 'à°Žà°‚à°Ÿà°¿à°Ÿà±€ à°Žà°•à±à°¸à±â€Œà°Ÿà±à°°à°¾à°•à±à°·à°¨à±',
        step3: 'BNS à°°à°¿à°Ÿà±à°°à±€à°µà°²à±',
        step4: 'à°²à±‹à°•à°²à± LLM à°¡à±à°°à°¾à°«à±à°Ÿà°¿à°‚à°—à±',
        step5: 'à°«à°¿à°°à±à°¯à°¾à°¦à± à°…à°µà±à°Ÿà±â€Œà°ªà±à°Ÿà±',
        sectionsTitle: 'à°¸à°‚à°¬à°‚à°§à°¿à°¤ à°šà°Ÿà±à°Ÿ à°µà°¿à°­à°¾à°—à°¾à°²à± (à°§à±ƒà°µà±€à°•à°°à°¿à°‚à°šà°¬à°¡à°¿à°¨à°µà°¿)',
        outputTitle: 'à°†à°§à°¿à°•à°¾à°°à°¿à°• à°«à°¿à°°à±à°¯à°¾à°¦à± à°¡à±à°°à°¾à°«à±à°Ÿà±',
        outputTitleEnglish: 'à°†à°§à°¿à°•à°¾à°°à°¿à°• à°«à°¿à°°à±à°¯à°¾à°¦à± à°¡à±à°°à°¾à°«à±à°Ÿà± (à°‡à°‚à°—à±à°²à±€à°·à±)',
        pdfBtn: 'ðŸ“„ PDF à°¤à±†à°°à±à°µà± / à°ªà±à°°à°¿à°‚à°Ÿà±',
        englishBtn: 'ðŸŒ à°‡à°‚à°—à±à°²à±€à°·à± à°µà±†à°°à±à°·à°¨à±',
        englishBtnBack: 'ðŸŒ à°Žà°‚à°ªà°¿à°• à°šà±‡à°¸à°¿à°¨ à°­à°¾à°·à°•à± à°¤à°¿à°°à±à°—à±',
        audioBtn: 'ðŸ”Š à°¹à°•à±à°•à±à°² à°µà°¿à°µà°°à°£ à°µà°¿à°¨à°¿à°ªà°¿à°‚à°šà±',
        stopAudioBtn: 'â¹ à°†à°¡à°¿à°¯à±‹ à°†à°ªà±',
        footer: '100% à°ªà°°à°¿à°•à°°à°‚à°ªà±ˆà°¨à±‡ à°ªà±à°°à°¾à°¸à±†à°¸à°¿à°‚à°—à± Â· à°¡à±‡à°Ÿà°¾ à°¬à°¯à°Ÿà°•à± à°µà±†à°³à±à°²à°¦à± Â· à°‡à°¦à°¿ à°¨à±à°¯à°¾à°¯ à°¸à°²à°¹à°¾ à°•à°¾à°¦à± Â· NALSA à°¹à±†à°²à±à°ªà±â€Œà°²à±ˆà°¨à± 15100',
        statusEngineReady: 'à°‡à°‚à°œà°¿à°¨à±: à°²à±‹à°¡à±â€Œà°•à°¿ à°¸à°¿à°¦à±à°§à°‚',
        statusEngineUnavailable: 'WebGPU à°²à±‡à°¦à± - à°«à°¾à°²à±â€Œà°¬à±à°¯à°¾à°•à± à°®à±‹à°¡à±',
        statusEngineLoaded: 'à°‡à°‚à°œà°¿à°¨à± à°²à±‹à°¡à± à°…à°¯à°¿à°‚à°¦à°¿ (à°ªà°°à°¿à°•à°°à°‚à°ªà±ˆà°¨à±‡)',
        noMatch: 'à°¨à±‡à°°à±à°—à°¾ à°¸à°°à°¿à°ªà°¡à±‡ à°šà°Ÿà±à°Ÿ à°µà°¿à°­à°¾à°—à°‚ à°²à±‡à°¦à± - à°¸à°¾à°§à°¾à°°à°£ à°«à°¿à°°à±à°¯à°¾à°¦à± à°°à±‚à°ªà°‚ à°‰à°ªà°¯à±‹à°—à°¿à°‚à°šà°¬à°¡à±à°¤à±à°‚à°¦à°¿.',
        msgNeedNarrative: 'à°¦à°¯à°šà±‡à°¸à°¿ à°®à±à°‚à°¦à±à°—à°¾ à°®à±€ à°«à°¿à°°à±à°¯à°¾à°¦à± à°µà°¿à°µà°°à°¿à°‚à°šà°‚à°¡à°¿.',
        msgGeoNotSupported: 'à°ˆ à°¬à±à°°à±Œà°œà°°à±â€Œà°²à±‹ à°œà°¿à°¯à±‹à°²à±Šà°•à±‡à°·à°¨à± à°²à±‡à°¦à±.',
        msgGeoDenied: 'à°²à±‹à°•à±‡à°·à°¨à± à°…à°¨à±à°®à°¤à°¿ à°¨à°¿à°°à°¾à°•à°°à°¿à°‚à°šà°¬à°¡à°¿à°‚à°¦à°¿. à°²à±‹à°•à±‡à°·à°¨à± à°²à±‡à°•à±à°‚à°¡à°¾ à°•à±Šà°¨à°¸à°¾à°—à°µà°šà±à°šà±.',
        msgGeoCaptured: 'à°¬à±à°°à±Œà°œà°°à± à°œà°¿à°¯à±‹à°²à±Šà°•à±‡à°·à°¨à± à°¦à±à°µà°¾à°°à°¾ à°¸à±à°¥à°¾à°¨à°‚ à°ªà±Šà°‚à°¦à°¬à°¡à°¿à°‚à°¦à°¿.',
        msgLangSet: 'à°¡à±à°°à°¾à°«à±à°Ÿà± à°®à°°à°¿à°¯à± UI à°­à°¾à°· à°¸à±†à°Ÿà± à°šà±‡à°¯à°¬à°¡à°¿à°‚à°¦à°¿:',
        msgDetectedLanguage: 'à°—à±à°°à±à°¤à°¿à°‚à°šà°¿à°¨ à°­à°¾à°·:',
        msgAutoLanguage: 'à°‡à°¨à±â€Œà°ªà±à°Ÿà± à°¨à±à°‚à°šà°¿ à°­à°¾à°· à°Žà°‚à°ªà°¿à°•à±ˆà°‚à°¦à°¿',
        msgPipelineError: 'à°ªà±ˆà°ªà±â€Œà°²à±ˆà°¨à± à°²à±‹à°ªà°‚:'
    },
    ta: {
        appSub: 'à®•à®¿à®³à¯ˆà®¯à®©à¯à®Ÿà¯-à®šà¯ˆà®Ÿà¯ à®‡à®¨à¯à®¤à®¿à®¯ à®šà®Ÿà¯à®Ÿ à®‰à®¤à®µà®¿ Â· BNS/BNSS à®šà®Ÿà¯à®Ÿ à®µà®°à¯ˆà®µà¯',
        ingestionTitle: '1 Â· à®‰à®™à¯à®•à®³à¯ à®ªà¯à®•à®¾à®°à¯ˆ à®µà®¿à®µà®°à®¿à®•à¯à®•à®µà¯à®®à¯',
        langLabel: 'à®®à¯Šà®´à®¿',
        geoBtn: 'ðŸ“ à®Žà®©à¯ à®‡à®°à¯à®ªà¯à®ªà®¿à®Ÿà®¤à¯à®¤à¯ˆ à®ªà®¯à®©à¯à®ªà®Ÿà¯à®¤à¯à®¤à¯',
        narrativePlaceholder: 'à®Žà®©à¯à®© à®¨à®Ÿà®¨à¯à®¤à®¤à¯ à®Žà®©à¯à®ªà®¤à¯ˆ à®‰à®™à¯à®•à®³à¯ à®®à¯Šà®´à®¿à®¯à®¿à®²à¯ à®Žà®´à¯à®¤à¯à®™à¯à®•à®³à¯ à®…à®²à¯à®²à®¤à¯ à®ªà¯‡à®šà¯à®™à¯à®•à®³à¯.',
        recBtnIdle: 'ðŸŽ™ï¸ à®•à¯à®°à®²à¯ à®ªà®¤à®¿à®µà¯',
        recBtnStop: 'â¹ à®ªà®¤à®¿à®µà¯ à®¨à®¿à®±à¯à®¤à¯à®¤à¯',
        runBtn: 'à®ªà¯à®•à®¾à®°à¯ à®µà®°à¯ˆà®µà¯ à®‰à®°à¯à®µà®¾à®•à¯à®•à¯',
        langHintDefault: 'à®µà®¾à®¯à¯à®¸à¯ à®‡à®©à¯à®ªà¯à®Ÿà¯ à®‰à®²à®¾à®µà®¿ à®¸à¯à®ªà¯€à®šà¯ à®°à¯†à®•à®•à¯à®©à®¿à®·à®©à¯ˆ à®ªà®¯à®©à¯à®ªà®Ÿà¯à®¤à¯à®¤à¯à®•à®¿à®±à®¤à¯ (en-IN default)',
        loadTitle: 'à®‰à®³à¯à®³à¯‚à®°à¯ AI à®Žà®žà¯à®šà®¿à®©à¯ à®à®±à¯à®±à®ªà¯à®ªà®Ÿà¯à®•à®¿à®±à®¤à¯ (Llama 3.2 1B Â· WebGPU)',
        pipelineTitle: 'à®šà¯†à®¯à®²à¯à®®à¯à®±à¯ˆ',
        step1: 'à®‰à®³à¯à®³à¯‚à®°à¯ à®®à¯Šà®´à®¿ à®‰à®³à¯à®³à¯€à®Ÿà¯',
        step2: 'à®‰à®°à¯à®ªà¯à®ªà®Ÿà®¿ à®ªà®¿à®°à®¿à®¤à¯à®¤à¯†à®Ÿà¯à®ªà¯à®ªà¯',
        step3: 'BNS à®¤à¯‡à®Ÿà®²à¯',
        step4: 'à®‰à®³à¯à®³à¯‚à®°à¯ LLM à®µà®°à¯ˆà®µà¯',
        step5: 'à®ªà¯à®•à®¾à®°à¯ à®µà¯†à®³à®¿à®¯à¯€à®Ÿà¯',
        sectionsTitle: 'à®ªà¯†à®±à®ªà¯à®ªà®Ÿà¯à®Ÿ à®šà®Ÿà¯à®Ÿà®ªà¯ à®ªà®¿à®°à®¿à®µà¯à®•à®³à¯ (à®šà®°à®¿à®ªà®¾à®°à¯à®•à¯à®•à®ªà¯à®ªà®Ÿà¯à®Ÿà®µà¯ˆ)',
        outputTitle: 'à®…à®¤à®¿à®•à®¾à®°à®ªà¯à®ªà¯‚à®°à¯à®µ à®ªà¯à®•à®¾à®°à¯ à®µà®°à¯ˆà®µà¯',
        outputTitleEnglish: 'à®…à®¤à®¿à®•à®¾à®°à®ªà¯à®ªà¯‚à®°à¯à®µ à®ªà¯à®•à®¾à®°à¯ à®µà®°à¯ˆà®µà¯ (à®†à®™à¯à®•à®¿à®²à®®à¯)',
        pdfBtn: 'ðŸ“„ PDF à®¤à®¿à®± / à®…à®šà¯à®šà®¿à®Ÿà¯',
        englishBtn: 'ðŸŒ à®†à®™à¯à®•à®¿à®² à®ªà®¤à®¿à®ªà¯à®ªà¯',
        englishBtnBack: 'ðŸŒ à®¤à¯‡à®°à¯à®¨à¯à®¤ à®®à¯Šà®´à®¿à®•à¯à®•à¯ à®¤à®¿à®°à¯à®®à¯à®ªà¯',
        audioBtn: 'ðŸ”Š à®‰à®°à®¿à®®à¯ˆà®•à®³à¯ à®µà®¿à®³à®•à¯à®•à®¤à¯à®¤à¯ˆ à®‡à®¯à®•à¯à®•à¯',
        stopAudioBtn: 'â¹ à®†à®Ÿà®¿à®¯à¯‹ à®¨à®¿à®±à¯à®¤à¯à®¤à¯',
        footer: '100% à®šà®¾à®¤à®©à®¤à¯à®¤à®¿à®²à¯‡à®¯à¯‡ à®šà¯†à®¯à®²à®¾à®•à¯à®•à®®à¯ Â· à®¤à®°à®µà¯ à®µà¯†à®³à®¿à®¯à¯‡ à®ªà¯‹à®•à®¾à®¤à¯ Â· à®‡à®¤à¯ à®šà®Ÿà¯à®Ÿ à®†à®²à¯‹à®šà®©à¯ˆ à®…à®²à¯à®² Â· NALSA à®¹à¯†à®²à¯à®ªà¯à®²à¯ˆà®©à¯ 15100',
        statusEngineReady: 'à®Žà®žà¯à®šà®¿à®©à¯: à®à®±à¯à®± à®¤à®¯à®¾à®°à®¾à®• à®‰à®³à¯à®³à®¤à¯',
        statusEngineUnavailable: 'WebGPU à®‡à®²à¯à®²à¯ˆ - à®®à®¾à®±à¯à®±à¯ à®®à¯à®±à¯ˆ',
        statusEngineLoaded: 'à®Žà®žà¯à®šà®¿à®©à¯ à®à®±à¯à®±à®ªà¯à®ªà®Ÿà¯à®Ÿà®¤à¯ (à®šà®¾à®¤à®©à®¤à¯à®¤à®¿à®²à¯)',
        noMatch: 'à®¨à¯‡à®°à®Ÿà®¿ à®šà®Ÿà¯à®Ÿà®ªà¯ à®ªà¯Šà®°à¯à®¤à¯à®¤à®®à¯ à®‡à®²à¯à®²à¯ˆ - à®ªà¯Šà®¤à¯à®ªà¯ à®ªà¯à®•à®¾à®°à¯ à®µà®Ÿà®¿à®µà®®à¯ à®ªà®¯à®©à¯à®ªà®Ÿà¯à®®à¯.',
        msgNeedNarrative: 'à®®à¯à®¤à®²à®¿à®²à¯ à®‰à®™à¯à®•à®³à¯ à®ªà¯à®•à®¾à®°à¯ˆ à®Žà®´à¯à®¤à®µà¯à®®à¯.',
        msgGeoNotSupported: 'à®‡à®¨à¯à®¤ à®‰à®²à®¾à®µà®¿à®¯à®¿à®²à¯ à®œà®¿à®¯à¯‹à®²à¯Šà®•à¯‡à®·à®©à¯ à®‡à®²à¯à®²à¯ˆ.',
        msgGeoDenied: 'à®‡à®°à¯à®ªà¯à®ªà®¿à®Ÿà®®à¯ à®…à®©à¯à®®à®¤à®¿ à®®à®±à¯à®•à¯à®•à®ªà¯à®ªà®Ÿà¯à®Ÿà®¤à¯. à®‡à®°à¯à®ªà¯à®ªà®¿à®Ÿà®®à®¿à®©à¯à®±à®¿ à®¤à¯Šà®Ÿà®°à®²à®¾à®®à¯.',
        msgGeoCaptured: 'à®‰à®²à®¾à®µà®¿ à®œà®¿à®¯à¯‹à®²à¯Šà®•à¯‡à®·à®©à¯ à®®à¯‚à®²à®®à¯ à®‡à®°à¯à®ªà¯à®ªà®¿à®Ÿà®®à¯ à®ªà¯†à®±à®ªà¯à®ªà®Ÿà¯à®Ÿà®¤à¯.',
        msgLangSet: 'à®µà®°à¯ˆà®µà¯ à®®à®±à¯à®±à¯à®®à¯ UI à®®à¯Šà®´à®¿ à®…à®®à¯ˆà®•à¯à®•à®ªà¯à®ªà®Ÿà¯à®Ÿà®¤à¯:',
        msgDetectedLanguage: 'à®•à®£à¯à®Ÿà®±à®¿à®¯à®ªà¯à®ªà®Ÿà¯à®Ÿ à®®à¯Šà®´à®¿:',
        msgAutoLanguage: 'à®‰à®³à¯à®³à¯€à®Ÿà¯à®Ÿà®¿à®²à®¿à®°à¯à®¨à¯à®¤à¯ à®®à¯Šà®´à®¿ à®¤à¯‡à®°à¯à®¨à¯à®¤à¯†à®Ÿà¯à®•à¯à®•à®ªà¯à®ªà®Ÿà¯à®Ÿà®¤à¯',
        msgPipelineError: 'à®ªà¯ˆà®ªà¯à®²à¯ˆà®©à¯ à®ªà®¿à®´à¯ˆ:'
    },
    bn: {
        appSub: 'à¦•à§à¦²à¦¾à§Ÿà§‡à¦¨à§à¦Ÿ-à¦¸à¦¾à¦‡à¦¡ à¦‡à¦¨à§à¦¡à¦¿à¦• à¦²à¦¿à¦—à§à¦¯à¦¾à¦² à¦•à§‹-à¦ªà¦¾à¦‡à¦²à¦Ÿ Â· BNS/BNSS à¦†à¦‡à¦¨à¦¿ à¦–à¦¸à§œà¦¾',
        ingestionTitle: '1 Â· à¦†à¦ªà¦¨à¦¾à¦° à¦…à¦­à¦¿à¦¯à§‹à¦— à¦²à¦¿à¦–à§à¦¨',
        langLabel: 'à¦­à¦¾à¦·à¦¾',
        geoBtn: 'ðŸ“ à¦†à¦®à¦¾à¦° à¦…à¦¬à¦¸à§à¦¥à¦¾à¦¨ à¦¬à§à¦¯à¦¬à¦¹à¦¾à¦° à¦•à¦°à§à¦¨',
        narrativePlaceholder: 'à¦•à¦¿ à¦˜à¦Ÿà§‡à¦›à§‡ à¦¤à¦¾ à¦†à¦ªà¦¨à¦¾à¦° à¦­à¦¾à¦·à¦¾à§Ÿ à¦²à¦¿à¦–à§à¦¨ à¦¬à¦¾ à¦¬à¦²à§à¦¨à¥¤',
        recBtnIdle: 'ðŸŽ™ï¸ à¦­à§Ÿà§‡à¦¸ à¦°à§‡à¦•à¦°à§à¦¡',
        recBtnStop: 'â¹ à¦°à§‡à¦•à¦°à§à¦¡ à¦¬à¦¨à§à¦§',
        runBtn: 'à¦…à¦­à¦¿à¦¯à§‹à¦—à§‡à¦° à¦–à¦¸à§œà¦¾ à¦¤à§ˆà¦°à¦¿ à¦•à¦°à§à¦¨',
        langHintDefault: 'à¦­à§Ÿà§‡à¦¸ à¦‡à¦¨à¦ªà§à¦Ÿ à¦¬à§à¦°à¦¾à¦‰à¦œà¦¾à¦°à§‡à¦° à¦¸à§à¦ªà¦¿à¦š à¦°à¦¿à¦•à¦—à¦¨à¦¿à¦¶à¦¨ à¦¬à§à¦¯à¦¬à¦¹à¦¾à¦° à¦•à¦°à§‡ (en-IN default)',
        loadTitle: 'à¦²à§‹à¦•à¦¾à¦² AI à¦‡à¦žà§à¦œà¦¿à¦¨ à¦²à§‹à¦¡ à¦¹à¦šà§à¦›à§‡ (Llama 3.2 1B Â· WebGPU)',
        pipelineTitle: 'à¦ªà¦¾à¦‡à¦ªà¦²à¦¾à¦‡à¦¨',
        step1: 'à¦¸à§à¦¥à¦¾à¦¨à§€à§Ÿ à¦­à¦¾à¦·à¦¾ à¦‡à¦¨à¦ªà§à¦Ÿ',
        step2: 'à¦à¦¨à¦Ÿà¦¿à¦Ÿà¦¿ à¦à¦•à§à¦¸à¦Ÿà§à¦°à§à¦¯à¦¾à¦•à¦¶à¦¨',
        step3: 'BNS à¦°à¦¿à¦Ÿà§à¦°à¦¿à¦­à¦¾à¦²',
        step4: 'à¦²à§‹à¦•à¦¾à¦² LLM à¦¡à§à¦°à¦¾à¦«à¦Ÿà¦¿à¦‚',
        step5: 'à¦…à¦­à¦¿à¦¯à§‹à¦— à¦†à¦‰à¦Ÿà¦ªà§à¦Ÿ',
        sectionsTitle: 'à¦ªà§à¦°à¦¾à¦¸à¦™à§à¦—à¦¿à¦• à¦†à¦‡à¦¨ à¦§à¦¾à¦°à¦¾à¦¸à¦®à§‚à¦¹ (à¦¯à¦¾à¦šà¦¾à¦‡à¦•à§ƒà¦¤)',
        outputTitle: 'à¦†à¦¨à§à¦·à§à¦ à¦¾à¦¨à¦¿à¦• à¦…à¦­à¦¿à¦¯à§‹à¦— à¦–à¦¸à§œà¦¾',
        outputTitleEnglish: 'à¦†à¦¨à§à¦·à§à¦ à¦¾à¦¨à¦¿à¦• à¦…à¦­à¦¿à¦¯à§‹à¦— à¦–à¦¸à§œà¦¾ (à¦‡à¦‚à¦°à§‡à¦œà¦¿)',
        pdfBtn: 'ðŸ“„ PDF à¦–à§à¦²à§à¦¨ / à¦ªà§à¦°à¦¿à¦¨à§à¦Ÿ',
        englishBtn: 'ðŸŒ à¦‡à¦‚à¦°à§‡à¦œà¦¿ à¦¸à¦‚à¦¸à§à¦•à¦°à¦£',
        englishBtnBack: 'ðŸŒ à¦¨à¦¿à¦°à§à¦¬à¦¾à¦šà¦¿à¦¤ à¦­à¦¾à¦·à¦¾à§Ÿ à¦«à¦¿à¦°à§‡ à¦¯à¦¾à¦¨',
        audioBtn: 'ðŸ”Š à¦…à¦§à¦¿à¦•à¦¾à¦° à¦¬à§à¦°à¦¿à¦«à¦¿à¦‚ à¦šà¦¾à¦²à¦¾à¦¨',
        stopAudioBtn: 'â¹ à¦…à¦¡à¦¿à¦“ à¦¬à¦¨à§à¦§ à¦•à¦°à§à¦¨',
        footer: '100% à¦¡à¦¿à¦­à¦¾à¦‡à¦¸-à¦­à¦¿à¦¤à§à¦¤à¦¿à¦• à¦ªà§à¦°à¦¸à§‡à¦¸à¦¿à¦‚ Â· à¦¡à§‡à¦Ÿà¦¾ à¦¬à¦¾à¦‡à¦°à§‡ à¦¯à¦¾à§Ÿ à¦¨à¦¾ Â· à¦à¦Ÿà¦¿ à¦†à¦‡à¦¨à¦¿ à¦ªà¦°à¦¾à¦®à¦°à§à¦¶ à¦¨à§Ÿ Â· NALSA à¦¹à§‡à¦²à§à¦ªà¦²à¦¾à¦‡à¦¨ 15100',
        statusEngineReady: 'à¦‡à¦žà§à¦œà¦¿à¦¨: à¦²à§‹à¦¡à§‡à¦° à¦œà¦¨à§à¦¯ à¦ªà§à¦°à¦¸à§à¦¤à§à¦¤',
        statusEngineUnavailable: 'WebGPU à¦¨à§‡à¦‡ - à¦«allback à¦®à§‹à¦¡',
        statusEngineLoaded: 'à¦‡à¦žà§à¦œà¦¿à¦¨ à¦²à§‹à¦¡ à¦¹à§Ÿà§‡à¦›à§‡ (à¦¡à¦¿à¦­à¦¾à¦‡à¦¸à§‡)',
        noMatch: 'à¦¸à¦°à¦¾à¦¸à¦°à¦¿ à¦†à¦‡à¦¨à¦—à¦¤ à¦®à¦¿à¦² à¦ªà¦¾à¦“à§Ÿà¦¾ à¦¯à¦¾à§Ÿà¦¨à¦¿ - à¦¸à¦¾à¦§à¦¾à¦°à¦£ à¦…à¦­à¦¿à¦¯à§‹à¦— à¦«à¦°à¦®à§à¦¯à¦¾à¦Ÿ à¦¬à§à¦¯à¦¬à¦¹à¦¾à¦° à¦¹à¦¬à§‡à¥¤',
        msgNeedNarrative: 'à¦¦à§Ÿà¦¾ à¦•à¦°à§‡ à¦†à¦—à§‡ à¦†à¦ªà¦¨à¦¾à¦° à¦…à¦­à¦¿à¦¯à§‹à¦— à¦²à¦¿à¦–à§à¦¨à¥¤',
        msgGeoNotSupported: 'à¦à¦‡ à¦¬à§à¦°à¦¾à¦‰à¦œà¦¾à¦°à§‡ à¦œà¦¿à¦“à¦²à§‹à¦•à§‡à¦¶à¦¨ à¦¸à¦®à¦°à§à¦¥à¦¿à¦¤ à¦¨à§Ÿà¥¤',
        msgGeoDenied: 'à¦²à§‹à¦•à§‡à¦¶à¦¨ à¦…à¦¨à§à¦®à¦¤à¦¿ à¦…à¦¸à§à¦¬à§€à¦•à§ƒà¦¤à¥¤ à¦²à§‹à¦•à§‡à¦¶à¦¨ à¦›à¦¾à§œà¦¾ à¦šà¦¾à¦²à¦¿à§Ÿà§‡ à¦¯à§‡à¦¤à§‡ à¦ªà¦¾à¦°à§‡à¦¨à¥¤',
        msgGeoCaptured: 'à¦¬à§à¦°à¦¾à¦‰à¦œà¦¾à¦° à¦œà¦¿à¦“à¦²à§‹à¦•à§‡à¦¶à¦¨ à¦¥à§‡à¦•à§‡ à¦…à¦¬à¦¸à§à¦¥à¦¾à¦¨ à¦¨à§‡à¦“à§Ÿà¦¾ à¦¹à§Ÿà§‡à¦›à§‡à¥¤',
        msgLangSet: 'à¦¡à§à¦°à¦¾à¦«à¦Ÿ à¦“ UI à¦­à¦¾à¦·à¦¾ à¦¸à§‡à¦Ÿ à¦•à¦°à¦¾ à¦¹à§Ÿà§‡à¦›à§‡:',
        msgDetectedLanguage: 'à¦¸à¦¨à¦¾à¦•à§à¦¤ à¦­à¦¾à¦·à¦¾:',
        msgAutoLanguage: 'à¦‡à¦¨à¦ªà§à¦Ÿ à¦¥à§‡à¦•à§‡ à¦­à¦¾à¦·à¦¾ à¦¨à¦¿à¦°à§à¦§à¦¾à¦°à¦¿à¦¤',
        msgPipelineError: 'à¦ªà¦¾à¦‡à¦ªà¦²à¦¾à¦‡à¦¨ à¦¤à§à¦°à§à¦Ÿà¦¿:'
    },
    mr: {
        appSub: 'à¤•à¥à¤²à¤¾à¤¯à¤‚à¤Ÿ-à¤¸à¤¾à¤‡à¤¡ à¤‡à¤‚à¤¡à¤¿à¤• à¤²à¥€à¤—à¤² à¤•à¥‹-à¤ªà¤¾à¤¯à¤²à¤Ÿ Â· BNS/BNSS à¤•à¤¾à¤¯à¤¦à¥‡à¤¶à¥€à¤° à¤®à¤¸à¥à¤¦à¤¾',
        ingestionTitle: '1 Â· à¤¤à¥à¤®à¤šà¥€ à¤¤à¤•à¥à¤°à¤¾à¤° à¤²à¤¿à¤¹à¤¾',
        langLabel: 'à¤­à¤¾à¤·à¤¾',
        geoBtn: 'ðŸ“ à¤®à¤¾à¤à¥‡ à¤²à¥‹à¤•à¥‡à¤¶à¤¨ à¤µà¤¾à¤ªà¤°à¤¾',
        narrativePlaceholder: 'à¤•à¤¾à¤¯ à¤à¤¾à¤²à¥‡ à¤¤à¥‡ à¤¤à¥à¤®à¤šà¥à¤¯à¤¾ à¤­à¤¾à¤·à¥‡à¤¤ à¤²à¤¿à¤¹à¤¾ à¤•à¤¿à¤‚à¤µà¤¾ à¤¬à¥‹à¤²à¤¾.',
        recBtnIdle: 'ðŸŽ™ï¸ à¤†à¤µà¤¾à¤œ à¤°à¥‡à¤•à¥‰à¤°à¥à¤¡ à¤•à¤°à¤¾',
        recBtnStop: 'â¹ à¤°à¥‡à¤•à¥‰à¤°à¥à¤¡à¤¿à¤‚à¤— à¤¥à¤¾à¤‚à¤¬à¤µà¤¾',
        runBtn: 'à¤¤à¤•à¥à¤°à¤¾à¤° à¤®à¤¸à¥à¤¦à¤¾ à¤¤à¤¯à¤¾à¤° à¤•à¤°à¤¾',
        langHintDefault: 'à¤µà¥à¤¹à¥‰à¤‡à¤¸ à¤‡à¤¨à¤ªà¥à¤Ÿ à¤¬à¥à¤°à¤¾à¤‰à¤à¤° à¤¸à¥à¤ªà¥€à¤š à¤°à¥‡à¤•à¤—à¥à¤¨à¤¿à¤¶à¤¨ à¤µà¤¾à¤ªà¤°à¤¤à¥‡ (en-IN default)',
        loadTitle: 'à¤²à¥‹à¤•à¤² AI à¤‡à¤‚à¤œà¤¿à¤¨ à¤²à¥‹à¤¡ à¤¹à¥‹à¤¤ à¤†à¤¹à¥‡ (Llama 3.2 1B Â· WebGPU)',
        pipelineTitle: 'à¤ªà¤¾à¤‡à¤ªà¤²à¤¾à¤‡à¤¨',
        step1: 'à¤¸à¥à¤¥à¤¾à¤¨à¤¿à¤• à¤­à¤¾à¤·à¤¾ à¤‡à¤¨à¤ªà¥à¤Ÿ',
        step2: 'à¤à¤‚à¤Ÿà¤¿à¤Ÿà¥€ à¤à¤•à¥à¤¸à¤Ÿà¥à¤°à¥…à¤•à¥à¤¶à¤¨',
        step3: 'BNS à¤°à¤¿à¤Ÿà¥à¤°à¥€à¤µà¥à¤¹à¤²',
        step4: 'à¤²à¥‹à¤•à¤² LLM à¤®à¤¸à¥à¤¦à¤¾',
        step5: 'à¤¤à¤•à¥à¤°à¤¾à¤° à¤†à¤‰à¤Ÿà¤ªà¥à¤Ÿ',
        sectionsTitle: 'à¤®à¤¿à¤³à¤¾à¤²à¥‡à¤²à¥à¤¯à¤¾ à¤•à¤¾à¤¯à¤¦à¥‡à¤¶à¥€à¤° à¤¤à¤°à¤¤à¥à¤¦à¥€ (à¤ªà¥à¤°à¤®à¤¾à¤£à¤¿à¤¤)',
        outputTitle: 'à¤”à¤ªà¤šà¤¾à¤°à¤¿à¤• à¤¤à¤•à¥à¤°à¤¾à¤° à¤®à¤¸à¥à¤¦à¤¾',
        outputTitleEnglish: 'à¤”à¤ªà¤šà¤¾à¤°à¤¿à¤• à¤¤à¤•à¥à¤°à¤¾à¤° à¤®à¤¸à¥à¤¦à¤¾ (à¤‡à¤‚à¤—à¥à¤°à¤œà¥€)',
        pdfBtn: 'ðŸ“„ PDF à¤‰à¤˜à¤¡à¤¾ / à¤ªà¥à¤°à¤¿à¤‚à¤Ÿ',
        englishBtn: 'ðŸŒ à¤‡à¤‚à¤—à¥à¤°à¤œà¥€ à¤†à¤µà¥ƒà¤¤à¥à¤¤à¥€',
        englishBtnBack: 'ðŸŒ à¤¨à¤¿à¤µà¤¡à¤²à¥‡à¤²à¥à¤¯à¤¾ à¤­à¤¾à¤·à¥‡à¤¤ à¤ªà¤°à¤¤',
        audioBtn: 'ðŸ”Š à¤¹à¤•à¥à¤•à¤¾à¤‚à¤šà¥‡ à¤¨à¤¿à¤µà¥‡à¤¦à¤¨ à¤ªà¥à¤²à¥‡ à¤•à¤°à¤¾',
        stopAudioBtn: 'â¹ à¤‘à¤¡à¤¿à¤“ à¤¥à¤¾à¤‚à¤¬à¤µà¤¾',
        footer: '100% à¤¡à¤¿à¤µà¥à¤¹à¤¾à¤‡à¤¸à¤µà¤° à¤ªà¥à¤°à¤•à¥à¤°à¤¿à¤¯à¤¾ Â· à¤¡à¥‡à¤Ÿà¤¾ à¤¬à¤¾à¤¹à¥‡à¤° à¤œà¤¾à¤¤ à¤¨à¤¾à¤¹à¥€ Â· à¤¹à¥‡ à¤•à¤¾à¤¯à¤¦à¥‡à¤¶à¥€à¤° à¤¸à¤²à¥à¤²à¤¾ à¤¨à¤¾à¤¹à¥€ Â· NALSA à¤¹à¥‡à¤²à¥à¤ªà¤²à¤¾à¤‡à¤¨ 15100',
        statusEngineReady: 'à¤‡à¤‚à¤œà¤¿à¤¨: à¤²à¥‹à¤¡à¤¸à¤¾à¤ à¥€ à¤¤à¤¯à¤¾à¤°',
        statusEngineUnavailable: 'WebGPU à¤‰à¤ªà¤²à¤¬à¥à¤§ à¤¨à¤¾à¤¹à¥€ - à¤«à¥‰à¤²à¤¬à¥…à¤• à¤®à¥‹à¤¡',
        statusEngineLoaded: 'à¤‡à¤‚à¤œà¤¿à¤¨ à¤²à¥‹à¤¡ à¤à¤¾à¤²à¥‡ (à¤¡à¤¿à¤µà¥à¤¹à¤¾à¤‡à¤¸à¤µà¤°)',
        noMatch: 'à¤¥à¥‡à¤Ÿ à¤•à¤¾à¤¯à¤¦à¥‡à¤¶à¥€à¤° à¤œà¥à¤³à¤£à¥€ à¤¨à¤¾à¤¹à¥€ - à¤¸à¤¾à¤®à¤¾à¤¨à¥à¤¯ à¤¤à¤•à¥à¤°à¤¾à¤° à¤¸à¥à¤µà¤°à¥‚à¤ª à¤µà¤¾à¤ªà¤°à¤²à¥‡ à¤œà¤¾à¤ˆà¤².',
        msgNeedNarrative: 'à¤•à¥ƒà¤ªà¤¯à¤¾ à¤†à¤§à¥€ à¤¤à¥à¤®à¤šà¥€ à¤¤à¤•à¥à¤°à¤¾à¤° à¤²à¤¿à¤¹à¤¾.',
        msgGeoNotSupported: 'à¤¯à¤¾ à¤¬à¥à¤°à¤¾à¤‰à¤à¤°à¤®à¤§à¥à¤¯à¥‡ à¤œà¤¿à¤“à¤²à¥‹à¤•à¥‡à¤¶à¤¨ à¤‰à¤ªà¤²à¤¬à¥à¤§ à¤¨à¤¾à¤¹à¥€.',
        msgGeoDenied: 'à¤²à¥‹à¤•à¥‡à¤¶à¤¨ à¤ªà¤°à¤µà¤¾à¤¨à¤—à¥€ à¤¨à¤¾à¤•à¤¾à¤°à¤²à¥€. à¤²à¥‹à¤•à¥‡à¤¶à¤¨à¤¶à¤¿à¤µà¤¾à¤¯ à¤ªà¥à¤¢à¥‡ à¤œà¤¾à¤Š à¤¶à¤•à¤¤à¤¾.',
        msgGeoCaptured: 'à¤¬à¥à¤°à¤¾à¤‰à¤à¤° à¤œà¤¿à¤“à¤²à¥‹à¤•à¥‡à¤¶à¤¨à¤®à¤§à¥‚à¤¨ à¤²à¥‹à¤•à¥‡à¤¶à¤¨ à¤®à¤¿à¤³à¤¾à¤²à¥‡.',
        msgLangSet: 'à¤®à¤¸à¥à¤¦à¤¾ à¤†à¤£à¤¿ UI à¤­à¤¾à¤·à¤¾ à¤¸à¥‡à¤Ÿ à¤•à¥‡à¤²à¥€:',
        msgDetectedLanguage: 'à¤“à¤³à¤–à¤²à¥‡à¤²à¥€ à¤­à¤¾à¤·à¤¾:',
        msgAutoLanguage: 'à¤‡à¤¨à¤ªà¥à¤Ÿà¤µà¤°à¥‚à¤¨ à¤­à¤¾à¤·à¤¾ à¤¨à¤¿à¤µà¤¡à¤²à¥€ à¤—à¥‡à¤²à¥€',
        msgPipelineError: 'à¤ªà¤¾à¤‡à¤ªà¤²à¤¾à¤‡à¤¨ à¤¤à¥à¤°à¥à¤Ÿà¥€:'
    },
    kn: {
        appSub: 'à²•à³à²²à³ˆà²‚à²Ÿà³-à²¸à³ˆà²¡à³ à²‡à²‚à²¡à²¿à²•à³ à²²à³€à²—à²²à³ à²•à³‹-à²ªà³ˆà²²à²Ÿà³ Â· BNS/BNSS à²•à²¾à²¨à³‚à²¨à³ à²•à²°à²¡à³',
        ingestionTitle: '1 Â· à²¨à²¿à²®à³à²® à²¦à³‚à²°à³ à²µà²¿à²µà²°à²¿à²¸à²¿',
        langLabel: 'à²­à²¾à²·à³†',
        geoBtn: 'ðŸ“ à²¨à²¨à³à²¨ à²¸à³à²¥à²³ à²¬à²³à²¸à²¿',
        narrativePlaceholder: 'à²à²¨à²¾à²¯à²¿à²¤à³ à²Žà²‚à²¬à³à²¦à²¨à³à²¨à³ à²¨à²¿à²®à³à²® à²­à²¾à²·à³†à²¯à²²à³à²²à²¿ à²¬à²°à³†à²¯à²¿à²°à²¿ à²…à²¥à²µà²¾ à²¹à³‡à²³à²¿.',
        recBtnIdle: 'ðŸŽ™ï¸ à²§à³à²µà²¨à²¿ à²¦à²¾à²–à²²à³†',
        recBtnStop: 'â¹ à²¦à²¾à²–à²²à³† à²¨à²¿à²²à³à²²à²¿à²¸à²¿',
        runBtn: 'à²¦à³‚à²°à³ à²•à²°à²¡à³ à²°à²šà²¿à²¸à²¿',
        langHintDefault: 'à²µà²¾à²¯à³à²¸à³ à²‡à²¨à³â€Œà²ªà³à²Ÿà³ à²¬à³à²°à³Œà²¸à²°à³ à²¸à³à²ªà³€à²šà³ à²°à³†à²•à²—à³à²¨à²¿à²·à²¨à³ à²¬à²³à²¸à³à²¤à³à²¤à²¦à³† (en-IN default)',
        loadTitle: 'à²²à³‹à²•à²²à³ AI à²Žà²‚à²œà²¿à²¨à³ à²²à³‹à²¡à³ à²†à²—à³à²¤à³à²¤à²¿à²¦à³† (Llama 3.2 1B Â· WebGPU)',
        pipelineTitle: 'à²ªà³ˆà²ªà³â€Œà²²à³ˆà²¨à³',
        step1: 'à²¸à³à²¥à²³à³€à²¯ à²­à²¾à²·à³† à²‡à²¨à³â€Œà²ªà³à²Ÿà³',
        step2: 'à²Žà²‚à²Ÿà²¿à²Ÿà²¿ à²¹à³Šà²°à²¤à³†à²—à³†à²¦à³à²•à³†à³‚à²³à³à²³à³à²µà³à²¦à³',
        step3: 'BNS à²®à²°à³à²ªà²¡à³†à²¯à³à²µà³à²¦à³',
        step4: 'à²²à³‹à²•à²²à³ LLM à²•à²°à²¡à³',
        step5: 'à²¦à³‚à²°à³ à²”à²Ÿà³â€Œà²ªà³à²Ÿà³',
        sectionsTitle: 'à²ªà²¡à³†à²¯à²²à²¾à²¦ à²•à²¾à²¨à³‚à²¨à³ à²µà²¿à²§à²¿à²—à²³à³ (à²§à³ƒà²¡à³€à²•à³ƒà²¤)',
        outputTitle: 'à²…à²§à²¿à²•à³ƒà²¤ à²¦à³‚à²°à³ à²•à²°à²¡à³',
        outputTitleEnglish: 'à²…à²§à²¿à²•à³ƒà²¤ à²¦à³‚à²°à³ à²•à²°à²¡à³ (à²‡à²‚à²—à³à²²à²¿à²·à³)',
        pdfBtn: 'ðŸ“„ PDF à²¤à³†à²°à³†à²¯à²¿à²°à²¿ / à²®à³à²¦à³à²°à²¿à²¸à²¿',
        englishBtn: 'ðŸŒ à²‡à²‚à²—à³à²²à²¿à²·à³ à²†à²µà³ƒà²¤à³à²¤à²¿',
        englishBtnBack: 'ðŸŒ à²†à²¯à³à²•à³† à²®à²¾à²¡à²¿à²¦ à²­à²¾à²·à³†à²—à³† à²¹à²¿à²‚à²¦à²¿à²°à³à²—à²¿',
        audioBtn: 'ðŸ”Š à²¹à²•à³à²•à³à²—à²³ à²µà²¿à²µà²°à²µà²¨à³à²¨à³ à²†à²¡à²¿à²¯à³‹à²¦à²²à³à²²à²¿ à²•à³‡à²³à²¿',
        stopAudioBtn: 'â¹ à²†à²¡à²¿à²¯à³‹ à²¨à²¿à²²à³à²²à²¿à²¸à²¿',
        footer: '100% à²¸à²¾à²§à²¨à²¦à²²à³à²²à³‡ à²ªà³à²°à²•à³à²°à²¿à²¯à³† Â· à²¡à³‡à²Ÿà²¾ à²¹à³Šà²°à²—à³† à²¹à³‹à²—à³à²µà³à²¦à²¿à²²à³à²² Â· à²‡à²¦à³ à²•à²¾à²¨à³‚à²¨à³ à²¸à²²à²¹à³† à²…à²²à³à²² Â· NALSA à²¸à²¹à²¾à²¯à²µà²¾à²£à²¿ 15100',
        statusEngineReady: 'à²Žà²‚à²œà²¿à²¨à³: à²²à³‹à²¡à³ à²®à²¾à²¡à²²à³ à²¸à²¿à²¦à³à²§',
        statusEngineUnavailable: 'WebGPU à²²à²­à³à²¯à²µà²¿à²²à³à²² - à²«à²¾à²²à³â€Œà²¬à³à²¯à²¾à²•à³ à²®à³‹à²¡à³',
        statusEngineLoaded: 'à²Žà²‚à²œà²¿à²¨à³ à²²à³‹à²¡à³ à²†à²—à²¿à²¦à³† (à²¸à²¾à²§à²¨à²¦à²²à³à²²à²¿)',
        noMatch: 'à²¨à³‡à²° à²•à²¾à²¨à³‚à²¨à³ à²¹à³Šà²‚à²¦à²¾à²£à²¿à²•à³† à²¸à²¿à²—à²²à²¿à²²à³à²² - à²¸à²¾à²®à²¾à²¨à³à²¯ à²¦à³‚à²°à³ à²°à³‚à²ª à²¬à²³à²¸à²²à²¾à²—à³à²¤à³à²¤à²¦à³†.',
        msgNeedNarrative: 'à²¦à²¯à²µà²¿à²Ÿà³à²Ÿà³ à²®à³Šà²¦à²²à³ à²¨à²¿à²®à³à²® à²¦à³‚à²°à²¨à³à²¨à³ à²¬à²°à³†à²¯à²¿à²°à²¿.',
        msgGeoNotSupported: 'à²ˆ à²¬à³à²°à³Œà²¸à²°à³â€Œà²¨à²²à³à²²à²¿ à²œà²¿à²¯à³‹à²²à³Šà²•à³‡à²¶à²¨à³ à²²à²­à³à²¯à²µà²¿à²²à³à²².',
        msgGeoDenied: 'à²¸à³à²¥à²³ à²…à²¨à³à²®à²¤à²¿ à²¨à²¿à²°à²¾à²•à²°à²¿à²¸à²²à²¾à²—à²¿à²¦à³†. à²¸à³à²¥à²³à²µà²¿à²²à³à²²à²¦à³‡ à²®à³à²‚à²¦à³à²µà²°à²¿à²¯à²¬à²¹à³à²¦à³.',
        msgGeoCaptured: 'à²¬à³à²°à³Œà²¸à²°à³ à²œà²¿à²¯à³‹à²²à³Šà²•à³‡à²¶à²¨à³ à²®à³‚à²²à²• à²¸à³à²¥à²³ à²ªà²¡à³†à²¯à²²à²¾à²—à²¿à²¦à³†.',
        msgLangSet: 'à²•à²°à²¡à³ à²®à²¤à³à²¤à³ UI à²­à²¾à²·à³† à²¸à³†à²Ÿà³ à²®à²¾à²¡à²²à²¾à²—à²¿à²¦à³†:',
        msgDetectedLanguage: 'à²—à³à²°à³à²¤à²¿à²¸à²¿à²¦ à²­à²¾à²·à³†:',
        msgAutoLanguage: 'à²‡à²¨à³â€Œà²ªà³à²Ÿà³â€Œà²¨à²¿à²‚à²¦ à²­à²¾à²·à³† à²†à²¯à³à²•à³†à²¯à²¾à²—à²¿à²¦à³†',
        msgPipelineError: 'à²ªà³ˆà²ªà³â€Œà²²à³ˆà²¨à³ à²¦à³‹à²·:'
    },
    ml: {
        appSub: 'à´•àµà´²à´¯à´¨àµà´±àµ-à´¸àµˆà´¡àµ à´‡à´¨àµà´¤àµà´¯àµ» à´²àµ€à´—àµ½ à´•àµ‹-à´ªàµˆà´²à´±àµà´±àµ Â· BNS/BNSS à´¨à´¿à´¯à´® à´¡àµà´°à´¾à´«àµà´±àµà´±à´¿à´‚à´—àµ',
        ingestionTitle: '1 Â· à´¨à´¿à´™àµà´™à´³àµà´Ÿàµ† à´ªà´°à´¾à´¤à´¿ à´µà´¿à´µà´°à´¿à´•àµà´•àµà´•',
        langLabel: 'à´­à´¾à´·',
        geoBtn: 'ðŸ“ à´Žà´¨àµà´±àµ† à´²àµŠà´•àµà´•àµ‡à´·àµ» à´‰à´ªà´¯àµ‹à´—à´¿à´•àµà´•àµà´•',
        narrativePlaceholder: 'à´Žà´¨àµà´¤à´¾à´£àµ à´¸à´‚à´­à´µà´¿à´šàµà´šà´¤àµ†à´¨àµà´¨àµ à´¨à´¿à´™àµà´™à´³àµà´Ÿàµ† à´­à´¾à´·à´¯à´¿àµ½ à´Žà´´àµà´¤àµà´• à´…à´²àµà´²àµ†à´™àµà´•à´¿àµ½ à´ªà´±à´¯àµà´•.',
        recBtnIdle: 'ðŸŽ™ï¸ à´µàµ‹à´¯àµà´¸àµ à´±àµ†à´•àµà´•àµ‹àµ¼à´¡àµ',
        recBtnStop: 'â¹ à´±àµ†à´•àµà´•àµ‹àµ¼à´¡à´¿à´‚à´—àµ à´¨à´¿àµ¼à´¤àµà´¤àµà´•',
        runBtn: 'à´ªà´°à´¾à´¤à´¿ à´¡àµà´°à´¾à´«àµà´±àµà´±àµ à´¸àµƒà´·àµà´Ÿà´¿à´•àµà´•àµà´•',
        langHintDefault: 'à´µàµ‹à´¯àµà´¸àµ à´‡àµ»à´ªàµà´Ÿàµà´Ÿàµ à´¬àµà´°àµ—à´¸àµ¼ à´¸àµà´ªàµ€à´šàµà´šàµ à´±àµ†à´•àµà´•à´—àµà´¨à´¿à´·àµ» à´‰à´ªà´¯àµ‹à´—à´¿à´•àµà´•àµà´¨àµà´¨àµ (en-IN default)',
        loadTitle: 'à´²àµ‹à´•àµ½ AI à´Žà´žàµà´šà´¿àµ» à´²àµ‹à´¡àµ à´šàµ†à´¯àµà´¯àµà´¨àµà´¨àµ (Llama 3.2 1B Â· WebGPU)',
        pipelineTitle: 'à´ªàµˆà´ªàµà´ªàµâ€Œà´²àµˆàµ»',
        step1: 'à´ªàµà´°à´¾à´¦àµ‡à´¶à´¿à´• à´­à´¾à´· à´‡àµ»à´ªàµà´Ÿàµà´Ÿàµ',
        step2: 'à´Žà´¨àµà´±à´¿à´±àµà´±à´¿ à´Žà´•àµà´¸àµà´Ÿàµà´°à´¾à´•àµà´·àµ»',
        step3: 'BNS à´±à´¿à´Ÿàµà´°àµ€à´µàµ½',
        step4: 'à´²àµ‹à´•àµ½ LLM à´¡àµà´°à´¾à´«àµà´±àµà´±à´¿à´‚à´—àµ',
        step5: 'à´ªà´°à´¾à´¤à´¿ à´”à´Ÿàµà´Ÿàµà´ªàµà´Ÿàµà´Ÿàµ',
        sectionsTitle: 'à´²à´­à´¿à´šàµà´š à´¨à´¿à´¯à´® à´µàµà´¯à´µà´¸àµà´¥à´•àµ¾ (à´¸àµà´¥à´¿à´°àµ€à´•à´°à´¿à´šàµà´š)',
        outputTitle: 'à´”à´ªà´šà´¾à´°à´¿à´• à´ªà´°à´¾à´¤à´¿ à´¡àµà´°à´¾à´«àµà´±àµà´±àµ',
        outputTitleEnglish: 'à´”à´ªà´šà´¾à´°à´¿à´• à´ªà´°à´¾à´¤à´¿ à´¡àµà´°à´¾à´«àµà´±àµà´±àµ (à´‡à´‚à´—àµà´²àµ€à´·àµ)',
        pdfBtn: 'ðŸ“„ PDF à´¤àµà´±à´•àµà´•àµà´• / à´ªàµà´°à´¿à´¨àµà´±àµ',
        englishBtn: 'ðŸŒ à´‡à´‚à´—àµà´²àµ€à´·àµ à´ªà´¤à´¿à´ªàµà´ªàµ',
        englishBtnBack: 'ðŸŒ à´¤à´¿à´°à´žàµà´žàµ†à´Ÿàµà´•àµà´•à´ªàµà´ªàµ†à´Ÿàµà´Ÿ à´­à´¾à´·à´¯à´¿à´²àµ‡à´•àµà´•àµ à´®à´Ÿà´™àµà´™àµà´•',
        audioBtn: 'ðŸ”Š à´…à´µà´•à´¾à´¶ à´µà´¿à´¶à´¦àµ€à´•à´°à´£à´‚ à´ªàµà´²àµ‡ à´šàµ†à´¯àµà´¯àµà´•',
        stopAudioBtn: 'â¹ à´“à´¡à´¿à´¯àµ‹ à´¨à´¿àµ¼à´¤àµà´¤àµà´•',
        footer: '100% à´¡à´¿à´µàµˆà´¸à´¿àµ½ à´ªàµà´°àµ‹à´¸à´¸à´¿à´‚à´—àµ Â· à´¡à´¾à´±àµà´± à´ªàµà´±à´¤àµà´¤àµ‡à´•àµà´•àµ à´ªàµ‹à´•à´¿à´²àµà´² Â· à´‡à´¤àµ à´¨à´¿à´¯à´®àµ‹à´ªà´¦àµ‡à´¶à´‚ à´…à´²àµà´² Â· NALSA à´¹àµ†àµ½à´ªàµâ€Œà´²àµˆàµ» 15100',
        statusEngineReady: 'à´Žà´žàµà´šà´¿àµ»: à´²àµ‹à´¡à´¿à´¨à´¾à´¯à´¿ à´¤à´¯àµà´¯à´¾à´±à´¾à´£àµ',
        statusEngineUnavailable: 'WebGPU à´²à´­àµà´¯à´®à´²àµà´² - à´«à´¾àµ¾à´¬à´¾à´•àµà´•àµ à´®àµ‹à´¡àµ',
        statusEngineLoaded: 'à´Žà´žàµà´šà´¿àµ» à´²àµ‹à´¡àµ à´šàµ†à´¯àµà´¤àµ (à´¡à´¿à´µàµˆà´¸à´¿àµ½)',
        noMatch: 'à´¨àµ‡à´°à´¿à´Ÿàµà´Ÿàµà´³àµà´³ à´¨à´¿à´¯à´® à´ªàµŠà´°àµà´¤àµà´¤à´‚ à´²à´­à´¿à´šàµà´šà´¿à´²àµà´² - à´¸à´¾à´§à´¾à´°à´£ à´ªà´°à´¾à´¤à´¿ à´«àµ‹àµ¼à´®à´¾à´±àµà´±àµ à´‰à´ªà´¯àµ‹à´—à´¿à´•àµà´•àµà´‚.',
        msgNeedNarrative: 'à´¦à´¯à´µà´¾à´¯à´¿ à´†à´¦àµà´¯à´‚ à´¨à´¿à´™àµà´™à´³àµà´Ÿàµ† à´ªà´°à´¾à´¤à´¿ à´Žà´´àµà´¤àµà´•.',
        msgGeoNotSupported: 'à´ˆ à´¬àµà´°àµ—à´¸à´±à´¿àµ½ à´œà´¿à´¯àµ‹à´²àµŠà´•àµà´•àµ‡à´·àµ» à´²à´­àµà´¯à´®à´²àµà´².',
        msgGeoDenied: 'à´²àµŠà´•àµà´•àµ‡à´·àµ» à´…à´¨àµà´®à´¤à´¿ à´¨à´¿à´°à´¸à´¿à´šàµà´šàµ. à´²àµŠà´•àµà´•àµ‡à´·àµ» à´‡à´²àµà´²à´¾à´¤àµ† à´¤àµà´Ÿà´°à´¾à´‚.',
        msgGeoCaptured: 'à´¬àµà´°àµ—à´¸àµ¼ à´œà´¿à´¯àµ‹à´²àµŠà´•àµà´•àµ‡à´·àµ» à´µà´´à´¿ à´¸àµà´¥à´¾à´¨à´‚ à´²à´­à´¿à´šàµà´šàµ.',
        msgLangSet: 'à´¡àµà´°à´¾à´«àµà´±àµà´±àµà´‚ UI à´­à´¾à´·à´¯àµà´‚ à´•àµà´°à´®àµ€à´•à´°à´¿à´šàµà´šàµ:',
        msgDetectedLanguage: 'à´•à´£àµà´Ÿàµ†à´¤àµà´¤à´¿à´¯ à´­à´¾à´·:',
        msgAutoLanguage: 'à´‡àµ»à´ªàµà´Ÿàµà´Ÿà´¿àµ½ à´¨à´¿à´¨àµà´¨àµ à´­à´¾à´· à´¤à´¿à´°à´žàµà´žàµ†à´Ÿàµà´•àµà´•à´ªàµà´ªàµ†à´Ÿàµà´Ÿàµ',
        msgPipelineError: 'à´ªàµˆà´ªàµà´ªàµâ€Œà´²àµˆàµ» à´ªà´¿à´¶à´•àµ:'
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
    if (r.includes('telangana') || r.includes('andhra')) return 'te';
    if (r.includes('tamil')) return 'ta';
    if (r.includes('west bengal')) return 'bn';
    if (r.includes('maharashtra')) return 'mr';
    if (r.includes('karnataka')) return 'kn';
    if (r.includes('kerala')) return 'ml';
    return 'hi';
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
        'dhamki', 'maar', 'marpit', 'gaali', 'paisa', 'rok liya', 'dhokha', 'à¤¬à¥‡à¤§à¤¡à¤¼à¤•', 'à¤§à¤®à¤•à¥€', 'à¤®à¤¾à¤°à¤ªà¥€à¤Ÿ', 'à¤—à¤¾à¤²à¥€', 'à¤µà¥‡à¤¤à¤¨', 'à¤ªà¥ˆà¤¸à¥‡', 'à¤¹à¤®à¤²à¤¾',
        'à°¦à°¾à°¡à°¿', 'à°¬à±†à°¦à°¿à°°à°¿à°‚à°ªà±', 'à°¡à°¬à±à°¬à±', 'à°¹à°¿à°‚à°¸', 'à®…à®šà¯à®šà¯à®±à¯à®¤à¯à®¤à®²à¯', 'à®¤à®¾à®•à¯à®•à¯à®¤à®²à¯', 'à®šà®®à¯à®ªà®³à®®à¯', 'à¦¹à§à¦®à¦•à¦¿', 'à¦®à¦¾à¦°à¦§à¦°', 'à¦®à¦œà§à¦°à¦¿', 'à¤§à¤®à¤•à¥€', 'à¤®à¤¾à¤°à¤¹à¤¾à¤£', 'à²¬à³†à²¦à²°à²¿à²•à³†', 'à²¹à²²à³à²²à³†', 'à´­àµ€à´·à´£à´¿', 'à´®àµ¼à´¦àµà´¦à´¨à´‚'
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

    try {
        const res = await fetch('https://ipapi.co/json/', { cache: 'no-store' });
        if (res.ok) {
            const geo = await res.json();
            ipGeoSnapshot = geo;
            selected = languageFromCountryRegion(geo.country_code, geo.region);
            ipDetectedLanguage = selected;
            const lat = Number.isFinite(+geo.latitude) ? Number(geo.latitude).toFixed(3) : 'NA';
            const lon = Number.isFinite(+geo.longitude) ? Number(geo.longitude).toFixed(3) : 'NA';
            const place = [geo.city, geo.region, geo.country_name].filter(Boolean).join(', ');
            if ($('ipHint')) $('ipHint').textContent = `${t('ipDetected')} ${place} (${lat}, ${lon})`;
        } else if ($('ipHint')) {
            $('ipHint').textContent = t('ipDetecting');
        }
    } catch {
        if ($('ipHint')) $('ipHint').textContent = t('ipDetecting');
    }

    applyLanguageSelection(selected);
}

function applyLanguageHint(text) {
    const selected = getSelectedLanguage();
    let hint = `${t('msgLangSet')} ${selected.toUpperCase()}`;
    if (ipDetectedLanguage && ipDetectedLanguage !== selected) {
        hint += ` Â· ${t('ipLanguage') || 'IP language'} ${ipDetectedLanguage.toUpperCase()}`;
    }
    const detected = detectLanguage(text);
    if (detected && detected !== selected) {
        hint += ` Â· ${t('msgDetectedLanguage')} ${detected.toUpperCase()}`;
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
    badge.textContent = `âš  ${t('statusEngineUnavailable')}`;
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
        badge.textContent = `âœ“ ${t('statusEngineLoaded')}`;
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

        setStep(3);
        const retrieved = retrieveSections(narrative);
        lastRetrieved = retrieved;
        $('secList').innerHTML = retrieved.length
            ? retrieved.map(({ statute }) => `<li><strong>${statute.code} Â§${statute.section}</strong> â€” ${statute.title}${statute.punishment ? ` Â· ${statute.punishment}` : ''}</li>`).join('')
            : `<li>${t('noMatch')}</li>`;
        $('secCard').classList.remove('hidden');

        setStep(4);
        lastComplaint = await draftComplaint(entities, retrieved, selectedLanguage || detectLanguage(narrative));
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

$('audioBtn').onclick = speakRightsBriefing;
$('stopAudioBtn').onclick = stopAudio;
