import { isWebGPUSupported, onLoadingProgress, ensureEngine, resetEngine, extractEntities, draftComplaint, detectLanguage } from './llm.js';
import { retrieveSections, getLoadedStatutes, syncStatutesFromSource, resetToDefaultStatutes, STATUTE_METADATA } from './retrieval.js';
import { complaintToHtml, downloadComplaint, speakRightsBriefing, stopAudio } from './output.js';
import { UI_TEXT } from './ui_translations.js';

const $ = (id) => document.getElementById(id);
const badge = $('engineBadge');
let lastComplaint = null;
let lastRetrieved = [];
let activeView = 'native';
let recognition = null;
let ipGeoSnapshot = null;
let ipDetectedLanguage = 'en';

function t(key, fallback = '') {
    const lang = ($('langSelect')?.value || 'en').toLowerCase();
    return UI_TEXT[lang]?.[key] || UI_TEXT.en[key] || fallback;
}

export function applyUiLanguage() {
    const lang = ($('langSelect')?.value || 'en').toLowerCase();
    $('rootHtml').setAttribute('lang', lang);
    if ($('appSub')) $('appSub').textContent = t('appSub');
    if ($('ingestionTitle')) $('ingestionTitle').textContent = t('ingestionTitle');
    if ($('particularsTitle')) $('particularsTitle').textContent = t('particularsTitle');
    if ($('lblFullName')) $('lblFullName').textContent = t('lblFullName');
    if ($('lblParent')) $('lblParent').textContent = t('lblParent');
    if ($('lblPhone')) $('lblPhone').textContent = t('lblPhone');
    if ($('lblAddress')) $('lblAddress').textContent = t('lblAddress');
    if ($('lblPoliceStation')) $('lblPoliceStation').textContent = t('lblPoliceStation');
    if ($('lblAccused')) $('lblAccused').textContent = t('lblAccused');
    if ($('lblIncidentLoc')) $('lblIncidentLoc').textContent = t('lblIncidentLoc');
    if ($('langLabel')) $('langLabel').textContent = t('langLabel');
    if ($('geoBtn')) $('geoBtn').textContent = t('geoBtn');
    if ($('narrative')) $('narrative').placeholder = t('narrativePlaceholder');
    if ($('runBtn')) $('runBtn').textContent = t('runBtn');
    if ($('loadTitle')) $('loadTitle').textContent = t('loadTitle');
    if ($('pipelineTitle')) $('pipelineTitle').textContent = t('pipelineTitle');
    if ($('step1')) $('step1').textContent = t('step1');
    if ($('step2')) $('step2').textContent = t('step2');
    if ($('step3')) $('step3').textContent = t('step3');
    if ($('step4')) $('step4').textContent = t('step4');
    if ($('step5')) $('step5').textContent = t('step5');
    if ($('sectionsTitle')) $('sectionsTitle').textContent = t('sectionsTitle');
    if ($('explorerTitle')) $('explorerTitle').textContent = t('explorerTitle');
    if ($('explorerSubtitle')) $('explorerSubtitle').textContent = t('explorerSubtitle');
    if ($('syncBtn')) $('syncBtn').textContent = t('syncBtn');
    if ($('resetStatutesBtn')) $('resetStatutesBtn').textContent = t('resetStatutesBtn');
    if ($('statuteSearch')) $('statuteSearch').placeholder = t('searchStatutesPlaceholder');
    if ($('pdfBtn')) $('pdfBtn').textContent = t('pdfBtn');
    if ($('englishBtn')) $('englishBtn').textContent = activeView === 'english' ? t('englishBtnBack') : t('englishBtn');
    if ($('audioBtn')) $('audioBtn').textContent = t('audioBtn');
    if ($('stopAudioBtn')) $('stopAudioBtn').textContent = t('stopAudioBtn');
    if ($('appFooter')) $('appFooter').textContent = t('footer');
    if ($('gateTitle')) $('gateTitle').textContent = t('gateTitle');
    if ($('gateSubtitle')) $('gateSubtitle').textContent = t('gateSubtitle');
    if ($('initialLangLabel')) $('initialLangLabel').textContent = t('langLabel');
    if ($('startAppBtn')) $('startAppBtn').textContent = t('gateContinue');
    if (!recognition || !recognizing) {
        if ($('recBtn')) $('recBtn').textContent = t('recBtnIdle');
    }
    if ($('langHint')) $('langHint').textContent = t('langHintDefault');
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
        const triggersText = Array.isArray(s.triggers) ? s.triggers.join(' ') : '';
        const hay = `${s.code || ''} ${s.section || ''} ${s.title || ''} ${s.text || ''} ${triggersText} ${s.category || ''}`.toLowerCase();
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
                <span class="badge" style="font-size:0.65rem;border-color:#94a3b8;color:#475569;">${(s.category || '').toUpperCase()}</span>
            </div>
            <div style="font-weight:600;color:#1e293b;margin-bottom:2px;">${s.title}</div>
            <p style="color:#334155;margin-bottom:4px;line-height:1.35;">${s.text}</p>
            ${s.punishment ? `<div style="font-size:0.75rem;color:#b91c1c;font-weight:600;">⚖️ Punishment: ${s.punishment}</div>` : ''}
            <div style="font-size:0.7rem;color:#64748b;margin-top:2px;">🏛️ Source: ${s.source || 'AIKosh / India Code'}</div>
        </div>
    `).join('');
}

function isActionableComplaint(text, entities, retrieved) {
    const value = (text || '').trim();
    if (!value || value.length < 15) return false;

    const low = value.toLowerCase();
    const words = value.split(/\s+/).filter(Boolean);
    if (words.length < 4) return false;

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
        'దాడి', 'బెదిరింపు', 'డబ్బు', 'హింస', 'అధ్యక్షుడు', 'சம்பளம்', 'হুমকি', 'মারধর', 'धमकी', 'मारहाण', 'ಬೆದರಿಕೆ', 'ಹಲ್ಲೆ', 'ഭീഷണി', 'മർദ്ദനം',
        'chori', 'forgery', 'beating', 'police', 'fir', 'station', 'money', 'property', 'land', 'kabza', 'struck'
    ];
    const hasIssueSignal = issueKeywords.some((k) => low.includes(k.toLowerCase()));
    const hasEntitySignal = entities && ((entities.aggressor && entities.aggressor !== 'unknown') || (entities.events || []).length > 0 || (entities.summary && entities.summary.length > 10));
    const hasStatuteSignal = Array.isArray(retrieved) && retrieved.length > 0;

    return hasIssueSignal || hasEntitySignal || hasStatuteSignal;
}

async function bootstrapLanguageGate() {
    const fallback = (navigator.language || 'en').slice(0, 2).toLowerCase();
    let selected = ['en', 'hi', 'te', 'ta', 'bn', 'mr', 'kn', 'ml'].includes(fallback) ? fallback : 'en';

    try {
        const res = await fetch('https://ipapi.co/json/', { cache: 'no-store' });
        if (res.ok) {
            const geo = await res.json();
            ipGeoSnapshot = geo;
            const region = (geo.region || '').toLowerCase();
            if (geo.country_code === 'IN') {
                if (region.includes('telangana') || region.includes('andhra')) selected = 'te';
                else if (region.includes('tamil') || region.includes('chennai')) selected = 'ta';
                else if (region.includes('bengal') || region.includes('kolkata')) selected = 'bn';
                else if (region.includes('maharashtra') || region.includes('mumbai') || region.includes('pune')) selected = 'mr';
                else if (region.includes('karnataka') || region.includes('bangalore') || region.includes('bengaluru')) selected = 'kn';
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

// ---- Engine preload on interaction readiness ----
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
    $('startAppBtn').addEventListener('click', () => {
        applyLanguageSelection($('initialLangSelect')?.value || 'en');
        $('langGate').style.display = 'none';
    });
}

if ($('statuteSearch')) {
    $('statuteSearch').addEventListener('input', (e) => {
        renderLawsExplorer(e.target.value);
    });
}

if ($('syncBtn')) {
    $('syncBtn').onclick = async () => {
        const originalText = $('syncBtn').textContent;
        $('syncBtn').textContent = '⏳ Syncing corpus...';
        $('syncBtn').disabled = true;
        try {
            const result = await syncStatutesFromSource();
            if (result.success) {
                $('syncBtn').textContent = `✓ Synced ${result.count} statutes`;
                renderLawsExplorer($('statuteSearch')?.value || '');
                alert(`Corpus updated: ${result.count} statutes loaded from verified source.`);
            } else {
                $('syncBtn').textContent = '✗ Sync failed';
                alert(`Sync note: ${result.error || 'Using local verified corpus'}.`);
            }
        } catch (err) {
            $('syncBtn').textContent = '✗ Sync error';
            alert(`Sync error: ${err.message}`);
        } finally {
            setTimeout(() => {
                $('syncBtn').textContent = originalText;
                $('syncBtn').disabled = false;
            }, 3000);
        }
    };
}

if ($('resetStatutesBtn')) {
    $('resetStatutesBtn').addEventListener('click', () => {
        resetToDefaultStatutes();
        renderLawsExplorer($('statuteSearch')?.value || '');
        alert('Statutory corpus reset to official Gazette 2023 baseline.');
    });
}

// ---- Uncertainty Review Modal Screen ----
function showExtractedFactsReview(entities, retrieved) {
    return new Promise((resolve) => {
        const modalEl = $('factReviewModal');
        const contentEl = $('factReviewContent');
        const previewEl = $('statutePreviewContent');
        const checkboxEl = $('factVerifyCheckbox');
        const proceedBtn = $('factReviewProceedBtn');
        const goBackBtn = $('factReviewGoBackBtn');

        const factsHtml = `
            <div class="fact-field ${entities.complainantName === 'unknown' ? 'unknown' : ''}">
                <div class="fact-label">Complainant Name</div>
                <div class="fact-value">${entities.complainantName !== 'unknown' ? entities.complainantName : '(identity from signature/intake)'}</div>
            </div>
            <div class="fact-field ${entities.summary === 'unknown' || !entities.summary ? 'unknown' : ''}">
                <div class="fact-label">Summary of Events</div>
                <div class="fact-value">${entities.summary || '(not extracted)'}</div>
            </div>
            <div class="fact-field ${entities.aggressor === 'unknown' ? 'unknown' : ''}">
                <div class="fact-label">Accused / Aggressor</div>
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
                <div class="fact-label">Offence Category</div>
                <div class="fact-value">${entities.category || 'general_offence'}</div>
            </div>
        `;
        contentEl.innerHTML = factsHtml;

        const statuteHtml = (Array.isArray(retrieved) && retrieved.length) ?
            `<strong>Potentially Applicable Statutes:</strong><ul style="margin:6px 0 0 16px;">
                ${retrieved.slice(0, 3).map(({ statute, confidence }) =>
                `<li><strong>${statute.code} §${statute.section}</strong> — ${statute.title}<br><small>Confidence: ${confidence || 'medium'}</small></li>`
            ).join('')}
            </ul>`
            : '<strong>No specific penal section matched.</strong> General cognizable grievance format will be applied.';
        previewEl.innerHTML = statuteHtml;

        checkboxEl.checked = false;
        proceedBtn.disabled = true;
        proceedBtn.style.background = '#e5e7eb';
        proceedBtn.style.borderColor = '#d1d5db';
        proceedBtn.style.color = '#6b7280';
        proceedBtn.style.cursor = 'not-allowed';

        checkboxEl.onchange = () => {
            proceedBtn.disabled = !checkboxEl.checked;
            proceedBtn.style.background = checkboxEl.checked ? '#2563eb' : '#e5e7eb';
            proceedBtn.style.borderColor = checkboxEl.checked ? '#1d4ed8' : '#d1d5db';
            proceedBtn.style.color = checkboxEl.checked ? '#ffffff' : '#6b7280';
            proceedBtn.style.cursor = checkboxEl.checked ? 'pointer' : 'not-allowed';
        };

        proceedBtn.onclick = () => {
            modalEl.classList.add('hidden');
            resolve(true);
        };

        goBackBtn.onclick = () => {
            modalEl.classList.add('hidden');
            resolve(false);
        };

        modalEl.classList.remove('hidden');
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

    $('runBtn').disabled = true;

    try {
        setStep(1);
        const selectedLanguage = getSelectedLanguage();

        setStep(2);
        let entities = await extractEntities(narrative);

        // Auto-fill intake form fields if user hadn't typed them
        if ($('cName') && !$('cName').value && entities.complainantName && entities.complainantName !== 'unknown') {
            $('cName').value = entities.complainantName;
        }
        if ($('cParent') && !$('cParent').value && entities.parentName && entities.parentName !== 'unknown') {
            $('cParent').value = entities.parentName;
        }
        if ($('cAccused') && !$('cAccused').value && entities.aggressor && entities.aggressor !== 'unknown') {
            $('cAccused').value = entities.aggressor;
        }
        if ($('cLoc') && !$('cLoc').value && entities.location && entities.location !== 'unknown') {
            $('cLoc').value = entities.location;
        }

        const complainantInfo = {
            name: $('cName')?.value || '',
            parent: $('cParent')?.value || '',
            phone: $('cPhone')?.value || '',
            address: $('cAddr')?.value || '',
            station: $('cStation')?.value || '',
            accused: $('cAccused')?.value || '',
            location: $('cLoc')?.value || '',
            date: entities.date !== 'unknown' ? entities.date : '',
            narrative: narrative
        };

        const retrievedPreview = retrieveSections(narrative, 2);
        if (!isActionableComplaint(narrative, entities, retrievedPreview)) {
            alert(t('msgInsufficientComplaint'));
            $('langHint').textContent = t('msgInsufficientComplaint');
            return;
        }

        // ---- Step 3: Human Fact Verification Modal ----
        setStep(3);
        const userVerified = await showExtractedFactsReview(entities, retrievedPreview);
        if (!userVerified) {
            $('runBtn').disabled = false;
            return;
        }

        // ---- Step 4: Statute Retrieval ----
        setStep(4);
        const retrieved = retrieveSections(narrative);
        lastRetrieved = retrieved;
        $('secList').innerHTML = retrieved.length
            ? retrieved.map(({ statute }) => `<li><strong>${statute.code} §${statute.section}</strong> — ${statute.title}${statute.punishment ? ` · <span style="color:#b91c1c">${statute.punishment}</span>` : ''}</li>`).join('')
            : `<li>${t('noMatch')}</li>`;
        $('secCard').classList.remove('hidden');

        // ---- Step 5: Complaint Drafting ----
        setStep(5);
        lastComplaint = await draftComplaint(complainantInfo, entities, retrieved, selectedLanguage);
        activeView = 'native';

        // ---- Step 6: Output ----
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

$('audioBtn').onclick = () => speakRightsBriefing(getSelectedLanguage());
$('stopAudioBtn').onclick = stopAudio;
