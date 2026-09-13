// Complaint PDF generation (client-side, print-based) + audio rights briefing (Web Speech API)
// Uses browser speech synthesis when available; it may not be fully offline in every browser.
import { escHtml as esc } from './shared_escape.js';
import { titleFor } from '../data/statute_i18n.js';

const PDF_TEXT = {
    en: {
        title: 'COMPLAINT',
        meta: 'Generated via Nyaya-Setu | BNSS 2023, Section 173',
        dateLabel: 'Date',
        disclaimer: 'This is a computer-assisted complaint draft for FIR filing support. Verify facts and provisions before submission. Free legal aid: NALSA helpline 15100.'
    },
    hi: {
        title: 'शिकायत पत्र',
        meta: 'Nyaya-Setu द्वारा तैयार | BNSS 2023, धारा 173',
        dateLabel: 'दिनांक',
        disclaimer: 'यह FIR दर्ज करने हेतु कंप्यूटर-सहायित मसौदा है। जमा करने से पहले तथ्यों की जांच करें। निःशुल्क कानूनी सहायता: NALSA हेल्पलाइन 15100।'
    },
    te: {
        title: 'ఫిర్యాదు',
        meta: 'Nyaya-Setu ద్వారా తయారు చేయబడింది | BNSS 2023, సెక్షన్ 173',
        dateLabel: 'తేదీ',
        disclaimer: 'ఇది FIR నమోదు కోసం కంప్యూటర్ సహాయంతో తయారైన డ్రాఫ్ట్. సమర్పించే ముందు వాస్తవాలు తనిఖీ చేయండి. ఉచిత న్యాయ సహాయం: NALSA హెల్ప్‌లైన్ 15100.'
    },
    ta: {
        title: 'புகார்',
        meta: 'Nyaya-Setu மூலம் தயாரிக்கப்பட்டது | BNSS 2023, பிரிவு 173',
        dateLabel: 'தேதி',
        disclaimer: 'இது FIR பதிவு செய்ய உதவும் கணினி உதவியுடன் உருவாக்கப்பட்ட வரைவு. இலவச சட்ட உதவி: NALSA உதவி எண் 15100.'
    },
    bn: {
        title: 'অভিযোগপত্র',
        meta: 'Nyaya-Setu দ্বারা প্রস্তুত | BNSS ২০২৩, ধারা ১৭৩',
        dateLabel: 'তারিখ',
        disclaimer: 'এটি FIR রুজুর জন্য কম্পিউটার-সহায়িত খসড়া। বিনামূল্যে আইনি সহায়তা: NALSA হেল্পলাইন 15100।'
    },
    mr: {
        title: 'तक्रारपत्र',
        meta: 'Nyaya-Setu द्वारे तयार | BNSS २०२३, कलम १७३',
        dateLabel: 'दिनांक',
        disclaimer: 'हा FIR नोंदीसाठी संगणक-सहाय्यित मसुदा आहे. मोफत कायदेशीर मदत: NALSA हेल्पलाइन 15100.'
    },
    kn: {
        title: 'ದೂರು',
        meta: 'Nyaya-Setu ಮೂಲಕ ರಚಿಸಲಾಗಿದೆ | BNSS 2023, ಕಲಂ 173',
        dateLabel: 'ದಿನಾಂಕ',
        disclaimer: 'ಇದು FIR ದಾಖಲಿಸಲು ಸಹಾಯಕವಾದ ಕಂಪ್ಯೂಟರ್ ಸಹಾಯದ ಕರಡು. ಉಚಿತ ಕಾನೂನು ಸಹಾಯ: NALSA ಹೆಲ್ಪ್‌ಲೈನ್ 15100.'
    },
    ml: {
        title: 'പരാതി',
        meta: 'Nyaya-Setu വഴി തയ്യാറാക്കിയത് | BNSS 2023, സെക്ഷൻ 173',
        dateLabel: 'തീയതി',
        disclaimer: 'ഇത് FIR രജിസ്റ്റർ ചെയ്യുന്നതിനുള്ള കമ്പ്യൂട്ടർ സഹായത്തോടെ തയ്യാറാക്കിയ ഡ്രാഫ്റ്റാണ്. സൗജന്യ നിയമ സഹായം: NALSA ഹെൽപ്‌ലൈൻ 15100.'
    }
};

// Complaint PDF generation (client-side, print-based) + audio rights briefing (Web Speech API)
// Uses browser speech synthesis when available; it may not be fully offline in every browser.
export function complaintToHtml(complaint, entities, retrieved, uiLanguage = 'en') {
    const lang = (uiLanguage || 'en').toLowerCase();
    const labels = PDF_TEXT[lang] || PDF_TEXT.en;

    // The complaint text is already formatted by buildProfessionalPoliceComplaint
    // — just render it cleanly with sections from retrieval.
    const nativeText = complaint?.native || complaint?.english || '';
    const englishText = complaint?.english || '';

    // Section list for the sidebar / below the complaint
    const sectionWord = lang === 'hi' ? 'धारा' : lang === 'te' ? 'సెక్షన్' : lang === 'ta' ? 'பிரிவு' : lang === 'bn' ? 'ধারা' : lang === 'mr' ? 'कलम' : lang === 'kn' ? 'ಕಲಂ' : lang === 'ml' ? 'സെക്ഷൻ' : 'Section';
    const sections = retrieved.map(({ statute, source, confidence }) => {
        const sourceUrl = statute.officialUrl || 'https://www.indiacode.nic.in/';
        const conf = confidence === 'high' ? ' — strong match' : confidence === 'medium' ? '' : ' — may apply';
        return `<li><strong>${esc(statute.code)} ${sectionWord} ${esc(statute.section)}</strong> — ${esc(titleFor(statute, lang))}${conf}<br><span style="font-size:7.5pt;color:#64748b">Source: <a href="${sourceUrl}" style="color:#0284c7;">${esc(source || 'India Code')}</a></span></li>`;
    }).join('');

    // Show native text if it differs from English (i.e., citizen wrote in another language)
    const showBilingual = lang !== 'en' && englishText && englishText !== nativeText;
    const mainText = showBilingual
        ? `<pre style="margin:0">${esc(nativeText)}</pre>\n<hr style="border:none;border-top:1px solid #ddd;margin:12px 0"><div style="font-size:9pt;color:#555"><strong>English:</strong></div><pre style="margin:0;font-size:9pt;color:#555">${esc(englishText)}</pre>`
        : `<pre style="margin:0">${esc(nativeText || englishText)}</pre>`;

    return `<!DOCTYPE html><html lang="${lang}"><head><meta charset="utf-8"><title>Complaint — Nyaya-Setu</title>
  <style>body{font-family:Georgia,'Noto Sans Devanagari','Noto Sans Telugu','Noto Sans Tamil','Noto Sans Bengali','Nirmala UI',Mangal,serif;max-width:170mm;margin:20mm auto;line-height:1.6;color:#111}
  h1{font-size:15pt;text-align:center;border-bottom:2px solid #111;padding-bottom:6px;letter-spacing:0.5px}
  .meta{font-size:9pt;color:#555;text-align:center;margin-bottom:14px}
  pre{white-space:pre-wrap;word-wrap:break-word;font-size:10pt;line-height:1.5}
  h2{font-size:11pt;margin-top:18px;page-break-after:avoid}
  ul{page-break-inside:avoid;padding-left:18px}
  li{margin-bottom:6px;font-size:9.5pt}
  .disc{font-size:7.5pt;color:#888;border-top:1px solid #ccc;margin-top:20px;padding-top:8px;font-style:italic}
  a{color:#0284c7;text-decoration:none}
  hr{border:none;border-top:1px solid #eee}
  @media print{body{margin:12mm 14mm}.no-print{display:none}}</style></head><body>
  <h1>${labels.title}</h1>
  <div class="meta">${labels.meta} | ${labels.dateLabel}: ${new Date().toLocaleDateString('en-IN')}</div>
  ${mainText}
  ${sections ? `<h2>${sectionWord}s</h2><ul>${sections}</ul>` : ''}
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
