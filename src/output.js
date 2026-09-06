// Complaint PDF generation (client-side, print-based) + audio rights briefing (Web Speech API)
// Uses browser speech synthesis when available; it may not be fully offline in every browser.

const PDF_TEXT = {
    en: {
        title: 'FORMAL COMPLAINT',
        meta: 'Computer-assisted draft · Prototype statutory corpus · Verify before submission',
        dateLabel: 'Date',
        sectionsTitle: 'Suggested statutory provisions (human verification required)',
        disclaimer: 'Disclaimer: This is a computer-assisted complaint draft, not legal advice or an FIR. Verify facts and provisions before submission. Free legal aid: NALSA helpline 15100.'
    },
    hi: {
        title: 'औपचारिक शिकायत पत्र',
        meta: 'कंप्यूटर-सहायित ड्राफ्ट · प्रोटोटाइप कॉर्पस · जमा करने से पहले सत्यापित करें',
        dateLabel: 'दिनांक',
        sectionsTitle: 'लागू वैधानिक प्रावधान (IndiaAI AIKosh कॉरपस)',
        disclaimer: 'अस्वीकरण: यह कंप्यूटर-सहायित मसौदा है, अधिवक्ता की कानूनी सलाह नहीं। जमा करने से पहले तथ्यों की जांच करें। निःशुल्क कानूनी सहायता: NALSA हेल्पलाइन 15100।'
    },
    te: {
        title: 'అధికారిక ఫిర్యాదు పత్రం',
        meta: 'కంప్యూటర్-సహాయిత డ్రాఫ్ట్ · ప్రోటోటైప్ కార్పస్ · సమర్పించే ముందు ధృవీకరించండి',
        dateLabel: 'తేదీ',
        sectionsTitle: 'వర్తించే చట్ట విభాగాలు (AIKosh డేటాసెట్)',
        disclaimer: 'గమనిక: ఇది కంప్యూటర్ సహాయంతో తయారైన డ్రాఫ్ట్ మాత్రమే; న్యాయవాది సలహా కాదు. సమర్పించే ముందు వాస్తవాలు తనిఖీ చేయండి. ఉచిత న్యాయ సహాయం: NALSA హెల్ప్‌లైన్ 15100.'
    },
    ta: {
        title: 'அதிகாரப்பூர்வ புகார்',
        meta: 'Nyaya-Setu மூலம் தயாரிக்கப்பட்டது - AIKosh & Bhashini',
        dateLabel: 'தேதி',
        sectionsTitle: 'பொருந்தும் சட்டப் பிரிவுகள்',
        disclaimer: 'பொறுப்புத்துறப்பு: இது கணினி உதவியுடன் உருவாக்கப்பட்ட வரைவு; வழக்கறிஞரின் சட்ட ஆலோசனை அல்ல. இலவச சட்ட உதவி: NALSA உதவி எண் 15100.'
    },
    bn: {
        title: 'আনুষ্ঠানিক অভিযোগপত্র',
        meta: 'Nyaya-Setu দ্বারা প্রস্তুত - AIKosh & Bhashini',
        dateLabel: 'তারিখ',
        sectionsTitle: 'প্রযোজ্য আইনগত ধারা',
        disclaimer: 'দাবিত্যাগ: এটি কম্পিউটার-সহায়িত খসড়া, আইনজীবীর আইনি পরামর্শ নয়। বিনামূল্যে আইনি সহায়তা: NALSA হেল্পলাইন 15100।'
    },
    mr: {
        title: 'औपचारिक तक्रारपत्र',
        meta: 'Nyaya-Setu द्वारे तयार - AIKosh & Bhashini',
        dateLabel: 'दिनांक',
        sectionsTitle: 'लागू कायदेशीर तरतुदी',
        disclaimer: 'सूचना: हा संगणक-सहाय्यित मसुदा आहे; वकिलाचा कायदेशीर सल्ला नाही. मोफत कायदेशीर मदत: NALSA हेल्पलाइन 15100.'
    },
    kn: {
        title: 'ಅಧಿಕೃತ ದೂರು ಪತ್ರ',
        meta: 'Nyaya-Setu ಮೂಲಕ ರಚಿಸಲಾಗಿದೆ - AIKosh & Bhashini',
        dateLabel: 'ದಿನಾಂಕ',
        sectionsTitle: 'ಅನ್ವಯಿಸುವ ಕಾನೂನು ವಿಧಿಗಳು',
        disclaimer: 'ಸೂಚನೆ: ಇದು ಕಂಪ್ಯೂಟರ್ ಸಹಾಯದ ಕರಡು ಮಾತ್ರ; ವಕೀಲರ ಕಾನೂನು ಸಲಹೆ ಅಲ್ಲ. ಉಚಿತ ಕಾನೂನು ಸಹಾಯ: NALSA ಹೆಲ್ಪ್‌ಲೈನ್ 15100.'
    },
    ml: {
        title: 'ഔപചാരിക പരാതിപത്രം',
        meta: 'Nyaya-Setu വഴി തയ്യാറാക്കിയത് - AIKosh & Bhashini',
        dateLabel: 'തീയതി',
        sectionsTitle: 'പ്രയോഗിക്കുന്ന നിയമ വകുപ്പുകൾ',
        disclaimer: 'അറിയിപ്പ്: ഇത് കമ്പ്യ्यूटर സഹായത്തോടെ തയ്യാറാക്കിയ ഡ്രാഫ്റ്റാണ്. സൗജന്യ നിയമ സഹായം: NALSA ഹെൽപ്‌ലൈൻ 15100.'
    }
};

function esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function complaintToHtml(complaint, entities, retrieved, uiLanguage = 'en') {
    // Include source attribution for each statute (Fix #6)
    const sections = retrieved.map(({ statute, source, confidence }) => {
        const sourceUrl = statute.officialUrl || 'https://www.indiacode.nic.in/';
        const conf = confidence ? ` · confidence: ${esc(confidence)}` : '';
        const curated = statute.triggers && statute.triggers.length > 5 && !String(statute.title).startsWith('BNS Section') && !String(statute.title).startsWith('BNSS Section') ? '' : ' · placeholder entry — verify';
        return `<li><strong>${esc(statute.code)} Section ${esc(statute.section)}</strong> — ${esc(statute.title)}${conf}${curated}<br><span style="font-size:8pt;color:#64748b">Source: <a href="${sourceUrl}" style="color:#0284c7;">${esc(source || 'India Code')}</a></span></li>`;
    }).join('');
    const englishText = esc(complaint?.english || complaint?.native || complaint?.hindi || '');
    const nativeText = esc(complaint?.native || complaint?.hindi || complaint?.english || '');
    const lang = (uiLanguage || 'en').toLowerCase();
    const labels = PDF_TEXT[lang] || PDF_TEXT.en;
    return `<!DOCTYPE html><html lang="${lang}"><head><meta charset="utf-8"><title>Police-Complaint Draft — Nyaya-Setu</title>
  <style>body{font-family:Georgia,'Noto Sans Devanagari','Noto Sans Telugu','Noto Sans Tamil','Noto Sans Bengali','Nirmala UI',Mangal,serif;max-width:170mm;margin:20mm auto;line-height:1.6;color:#111}
  h1{font-size:14pt;text-align:center;border-bottom:2px solid #111;padding-bottom:6px}
  .meta{font-size:9pt;color:#444;text-align:center;margin-bottom:18px}
  .version{font-size:7pt;color:#999;text-align:center;margin-bottom:12px}
  h2{font-size:11pt;margin-top:16px;page-break-after:avoid}ul{page-break-inside:avoid}.disc{font-size:8pt;color:#666;border-top:1px solid #ccc;margin-top:24px;padding-top:8px;font-style:italic}
  pre{white-space:pre-wrap;word-wrap:break-word}
  a{color:#0284c7;text-decoration:none}
  @media print{body{margin:12mm 14mm}.no-print{display:none}}</style></head><body>
  <h1>${labels.title}</h1>
  <div class="meta">${labels.meta} | ${labels.dateLabel}: ${new Date().toLocaleDateString('en-IN')}</div>
  <div class="version">Nyaya-Setu v0.5 prototype (~45 curated / 889 slots) · Verify at indiacode.nic.in · Not legal advice</div>
    <pre>${englishText}\n\n---\n\n${nativeText}</pre>
  <h2>${labels.sectionsTitle}</h2><ul>${sections}</ul>
  <p class="disc">${labels.disclaimer}</p>
  <script>window.onload=()=>window.print()</script></body></html>`;
}

const VOICE_MAP = { en: 'en-IN', hi: 'hi-IN', te: 'te-IN', ta: 'ta-IN', bn: 'bn-IN', mr: 'mr-IN', kn: 'kn-IN', ml: 'ml-IN' };

function pickVoice(langCode) {
    try {
        const voices = window.speechSynthesis.getVoices?.() || [];
        const exact = voices.find((v) => v.lang === langCode);
        if (exact) return exact;
        const prefix = voices.find((v) => v.lang?.startsWith(langCode.slice(0, 2)));
        if (prefix) return prefix;
    } catch { /* ignore */ }
    return null;
}

function speakLines(lines, voiceLangCode) {
    const synth = window.speechSynthesis;
    synth.cancel();
    const voice = pickVoice(voiceLangCode);
    // chunk long lines at sentence boundaries so rural low-end TTS doesn't choke
    const chunks = [];
    for (const line of lines) {
        const parts = String(line).split(/(?<=[.!?।])/);
        let buf = '';
        for (const p of parts) {
            if ((buf + p).length > 220) { chunks.push(buf.trim()); buf = p; }
            else buf += p;
        }
        if (buf.trim()) chunks.push(buf.trim());
    }
    for (const chunk of chunks.slice(0, 40)) {
        const u = new SpeechSynthesisUtterance(chunk);
        u.lang = voiceLangCode;
        if (voice) u.voice = voice;
        u.rate = 0.9;
        synth.speak(u);
    }
}

export function downloadComplaint(html) {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
}

export function speakRightsBriefing(lang = 'en') {
    if (!('speechSynthesis' in window)) {
        alert('Audio briefing not supported in this browser.');
        return;
    }
    // Static fallback if dynamic import fails (offline / first load)
    const FALLBACK_EN = [
        'This is a computer-assisted complaint draft, not legal advice and not an FIR.',
        'Under BNSS Section 173, police must register cognizable offences, including as Zero FIR, and give a free copy.',
        'Free legal aid: NALSA helpline 15100. In immediate danger, call 112 first.'
    ];
    import('../data/statutes.js').then(({ RIGHTS_BRIEFING }) => {
        const selectedLang = (lang || 'en').toLowerCase();
        const lines = (RIGHTS_BRIEFING && (RIGHTS_BRIEFING[selectedLang] || RIGHTS_BRIEFING.en)) || FALLBACK_EN;
        speakLines(lines, VOICE_MAP[selectedLang] || 'en-IN');
    }).catch(() => {
        speakLines(FALLBACK_EN, 'en-IN');
    });
}

// Read the generated draft aloud in the selected language (chunked, matching voice)
export function speakDraft(text, lang = 'en') {
    if (!('speechSynthesis' in window)) {
        alert('Audio briefing not supported in this browser.');
        return;
    }
    if (!text || !String(text).trim()) return;
    speakLines([String(text)], VOICE_MAP[(lang || 'en').toLowerCase()] || 'en-IN');
}

export function stopAudio() {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}
