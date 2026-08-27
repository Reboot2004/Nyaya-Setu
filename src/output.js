// Complaint PDF generation (client-side, print-based) + audio rights briefing (Web Speech API)
// Aligned with Bhashini Indic voice synthesis and IndiaAI AIKosh Legislative Corpus.

const PDF_TEXT = {
    en: {
        title: 'FORMAL COMPLAINT',
        meta: 'Drafted with Nyaya-Setu · AIKosh BNS Index · Bhashini Vernacular Mapping',
        dateLabel: 'Date',
        sectionsTitle: 'Applicable Statutory Provisions (IndiaAI AIKosh Corpus)',
        disclaimer: 'Disclaimer: This is a computer-assisted draft, not legal advice from an advocate. Verify facts before submission. Free legal aid: NALSA helpline 15100.'
    },
    hi: {
        title: 'औपचारिक शिकायत पत्र',
        meta: 'Nyaya-Setu द्वारा तैयार · AIKosh BNS इंडेक्स · भाषिणी वर्नाक्युलर मैपिंग',
        dateLabel: 'दिनांक',
        sectionsTitle: 'लागू वैधानिक प्रावधान (IndiaAI AIKosh कॉरपस)',
        disclaimer: 'अस्वीकरण: यह कंप्यूटर-सहायित मसौदा है, अधिवक्ता की कानूनी सलाह नहीं। जमा करने से पहले तथ्यों की जांच करें। निःशुल्क कानूनी सहायता: NALSA हेल्पलाइन 15100।'
    },
    te: {
        title: 'అధికారిక ఫిర్యాదు పత్రం',
        meta: 'Nyaya-Setu ద్వారా రూపొందించబడింది · AIKosh BNS ఇండెక్స్ · భాషిణి మ్యాపింగ్',
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

export function complaintToHtml(complaint, entities, retrieved, uiLanguage = 'en') {
    const sections = retrieved.map(({ statute, source }) => `<li><strong>${statute.code} Section ${statute.section}</strong> — ${statute.title} <span style="font-size:8pt;color:#64748b">(${source || 'AIKosh'})</span></li>`).join('');
    const englishText = complaint?.english || complaint?.native || complaint?.hindi || '';
    const nativeText = complaint?.native || complaint?.hindi || complaint?.english || '';
    const lang = (uiLanguage || 'en').toLowerCase();
    const labels = PDF_TEXT[lang] || PDF_TEXT.en;
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Formal Complaint — Nyaya-Setu</title>
  <style>body{font-family:Georgia,serif;max-width:170mm;margin:20mm auto;line-height:1.5;color:#111}
  h1{font-size:14pt;text-align:center;border-bottom:2px solid #111;padding-bottom:6px}
  .meta{font-size:9pt;color:#444;text-align:center;margin-bottom:18px}
  h2{font-size:11pt;margin-top:16px}.disc{font-size:8pt;color:#666;border-top:1px solid #ccc;margin-top:24px;padding-top:8px;font-style:italic}</style></head><body>
  <h1>${labels.title}</h1>
  <div class="meta">${labels.meta} | ${labels.dateLabel}: ${new Date().toLocaleDateString('en-IN')}</div>
    <pre style="white-space:pre-wrap;font-family:Georgia,serif">${englishText}\n\n---\n\n${nativeText}</pre>
  <h2>${labels.sectionsTitle}</h2><ul>${sections}</ul>
  <p class="disc">${labels.disclaimer}</p>
  <script>window.onload=()=>window.print()</script></body></html>`;
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
    import('../data/statutes.js').then(({ RIGHTS_BRIEFING }) => {
        const synth = window.speechSynthesis;
        synth.cancel();

        const selectedLang = (lang || 'en').toLowerCase();
        const lines = RIGHTS_BRIEFING[selectedLang] || RIGHTS_BRIEFING.en;
        const voiceLangCode = selectedLang === 'hi' ? 'hi-IN' : selectedLang === 'te' ? 'te-IN' : 'en-IN';

        for (const line of lines) {
            const u = new SpeechSynthesisUtterance(line);
            u.lang = voiceLangCode;
            u.rate = 0.95;
            synth.speak(u);
        }
    });
}

export function stopAudio() {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}
