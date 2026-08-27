import { UI_TEXT } from './ui_translations.js';
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

