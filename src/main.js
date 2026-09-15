import { isWebGPUSupported, isWebGPUUsable, onLoadingProgress, ensureEngine, resetEngine, extractEntities, draftComplaint, detectLanguage, getEngineStatus, isAIAssistEnabled, setAIAssistEnabled, measureInferenceSpeed } from './llm.js';
import { retrieveSections, getLoadedStatutes, resetToDefaultStatutes, STATUTE_METADATA, getBhashiniNormalization } from './retrieval.js';
import { complaintToHtml, downloadComplaint, speakRightsBriefing, speakDraft, stopAudio } from './output.js';
import { UI_TEXT } from './ui_translations.js';
import { screenInput } from './safety.js';
import { guardWithLocalModel as guardCheck, unloadGuard } from './guard.js';
import { toCPGRAMSSchema, downloadCPGRAMSJson } from './cpgrams.js';
import { initOfflineIndex, clearIDBCorpus } from './offline_store.js';
import { detectEmergency, EMERGENCY_CONTACTS } from './emergency.js';
import { CITIZEN_CATEGORIES, citizenCategoryFor } from '../data/categories.js';
import { getUnsupportedLangWarning, detectScript, translateText } from './bhashini.js';
import { titleFor, statuteTextFor } from '../data/statute_i18n.js';

const $ = (id) => document.getElementById(id);
const badge = $('engineBadge');

// Dev card: only visible with ?dev=1 in URL
if ($('devCard') && !window.location.search.includes('dev=1')) {
    $('devCard').remove();
}

// Character count on narrative
if ($('narrative') && $('charCount')) {
    const updateCharCount = () => {
        const len = ($('narrative').value || '').length;
        $('charCount').textContent = `${len} / 2000`;
        $('charCount').style.color = len > 2000 ? '#dc2626' : len > 1800 ? '#d97706' : '#94a3b8';
    };
    $('narrative').addEventListener('input', updateCharCount);
    updateCharCount();
}
let lastComplaint = null;
let lastRetrieved = [];
let activeView = 'native';
let recognition = null;

function t(key, fallback = '') {
    const lang = ($('langSelect')?.value || 'en').toLowerCase();
    return UI_TEXT[lang]?.[key] || UI_TEXT.en[key] || fallback;
}

// Display-sanitizer + escaper: single sources (shared_sanitize.js / shared_escape.js)
// so review/draft never show JSON or quoted Unknown, and never double-escapes.
import { cleanStr as cleanVal, isKnown as isKnownVal } from './shared_sanitize.js';
import { escHtml } from './shared_escape.js';

// Retained for legacy imports (e.g. external scripts doing import('./main.js').cleanVal)
export { cleanStr as cleanVal, isKnown as isKnownVal } from './shared_sanitize.js';

export function applyUiLanguage() {
    const lang = ($('langSelect')?.value || 'en').toLowerCase();
    $('rootHtml').setAttribute('lang', lang);
    if ($('appSub')) $('appSub').textContent = t('appSub');
    if ($('ingestionTitle')) $('ingestionTitle').textContent = t('ingestionTitle');
    if ($('particularsTitle')) $('particularsTitle').textContent = t('particularsTitle');
    if ($('lblFullName')) $('lblFullName').textContent = t('lblFullName');
    if ($('lblParent')) $('lblParent').textContent = t('lblParent');
    if ($('lblPhone')) $('lblPhone').textContent = t('lblPhone');
    if ($('lblAccused')) $('lblAccused').textContent = t('lblAccused');
    if ($('langLabel')) $('langLabel').textContent = t('langLabel');
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
    refreshCatFilter();
    renderLawsExplorer($('statuteSearch')?.value || '');
    if (recognition) {
        const map = { en: 'en-IN', hi: 'hi-IN', te: 'te-IN', ta: 'ta-IN', bn: 'bn-IN', mr: 'mr-IN', kn: 'kn-IN', ml: 'ml-IN' };
        recognition.lang = map[lang] || 'en-IN';
    }
}

// ---- Render Laws Explorer (grouped by plain-language citizen buckets) ----
function currentCatFilter() {
    return $('catFilter')?.value || '';
}
function refreshCatFilter() {
    const sel = $('catFilter');
    if (!sel) return;
    const lang = getSelectedLanguage();
    const keep = sel.value || '';
    sel.innerHTML = `<option value="">${lang === 'hi' ? 'सभी विषय' : lang === 'te' ? 'అన్ని అంశాలు' : 'All topics'}</option>` +
        CITIZEN_CATEGORIES.map((c) => `<option value="${c.id}">${c.name[lang] || c.name.en}</option>`).join('');
    sel.value = keep;
}
function renderLawsExplorer(filterText = '', catId = currentCatFilter()) {
    const list = getLoadedStatutes();
    const lang = getSelectedLanguage();
    const q = filterText.toLowerCase().trim();
    const filtered = list.filter((s) => {
        if (catId) {
            const { id } = citizenCategoryFor(s, 'en');
            if (id !== catId) return false;
        }
        if (!q) return true;
        const triggersText = Array.isArray(s.triggers) ? s.triggers.join(' ') : '';
        const cat = citizenCategoryFor(s, lang);
        const hay = `${s.code || ''} ${s.section || ''} ${s.title || ''} ${s.text || ''} ${triggersText} ${s.category || ''} ${cat.label} ${cat.desc}`.toLowerCase();
        return hay.includes(q);
    });

    const container = $('explorerList');
    if (!container) return;

    if (filtered.length === 0) {
        container.innerHTML = `<p style="font-size:0.85rem;color:#64748b;padding:10px;">No statutes match query "${filterText}".</p>`;
        return;
    }

    container.innerHTML = filtered.slice(0, 200).map((s) => {
        const cat = citizenCategoryFor(s, getSelectedLanguage());
        const t = titleFor(s, getSelectedLanguage());
        const body = statuteTextFor(s, getSelectedLanguage());
        return `
        <div style="border-bottom:1px solid #e2e8f0;padding:8px 0;font-size:0.84rem;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px;gap:6px;">
                <strong style="color:#0f172a;">${s.code} Section ${s.section}</strong>
                <span class="badge" title="${cat.desc.replace(/"/g, '&quot;')}" style="font-size:0.65rem;border-color:#2563eb;color:#1d4ed8;white-space:nowrap;">${cat.label}</span>
            </div>
            <div style="font-weight:600;color:#1e293b;margin-bottom:2px;">${t}</div>
            <p style="color:#334155;margin-bottom:4px;line-height:1.35;">${body}</p>
            ${s.punishment ? `<div style="font-size:0.75rem;color:#b91c1c;font-weight:600;">⚖️ Punishment: ${s.punishment}</div>` : ''}
            <div style="font-size:0.7rem;color:#64748b;margin-top:2px;">🏛️ Source: ${s.source || 'AIKosh / India Code'}</div>
        </div>
    `; }).join('') + (filtered.length > 200 ? `<p style="font-size:0.75rem;color:#64748b;padding:8px;">Showing 200 of ${filtered.length} — refine with topic or search.</p>` : '');
}

import { isActionableComplaint } from './main_is_actionable.js';

// Retained for legacy external imports (npm scripts doing import('./main.js').cleanVal)
// Note: Vite build only sees the src/ import above; this re-export is for Node-eval callers.

async function bootstrapLanguageGate() {
    // Language-first for rural users: browser locale preselects the gate dropdown,
    // gate blocks the app until Start, then the whole UI follows. Fully offline.
    const fallback = (navigator.language || 'en').slice(0, 2).toLowerCase();
    const selected = ['en', 'hi', 'te', 'ta', 'bn', 'mr', 'kn', 'ml'].includes(fallback) ? fallback : 'en';

    if ($('initialLangSelect')) $('initialLangSelect').value = selected;
    if ($('ipHint')) $('ipHint').textContent = 'Offline ready — no network lookup. District / PS optional below.';
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

// ---- Engine mode detection — automatic download where WebGPU exists ----
// Rule engine works instantly during download. Llama-3.2-1B auto-fetches once
// (~700MB, then cached); drafting stays deterministic.
$('runBtn').disabled = false;

if (isWebGPUSupported()) {
    badge.textContent = isAIAssistEnabled() ? '⏳ AI model auto-downloading…' : '⚡ Instant Mode (rule-based, offline)';
    badge.style.borderColor = '#93c5fd';
    badge.style.color = '#1e40af';
} else {
    badge.textContent = '⚡ Instant Mode (rule-based, offline)';
    badge.style.borderColor = '#93c5fd';
    badge.style.color = '#1e40af';
}

// Seed IndexedDB offline index (prototype lexical cache) — non-blocking
try {
    initOfflineIndex(() => getLoadedStatutes(), STATUTE_METADATA).then((r) => {
        if (r?.success && $('langHint')) {
            const m = STATUTE_METADATA;
            $('langHint').textContent = `Offline index ready (${r.source}, ${m.totalSections} slots: ${m.curatedSections} curated + official titles). Voice transcription still needs network.`;
        }
    }).catch(() => { /* ignore */ });
} catch { /* ignore */ }

onLoadingProgress((report) => {
    $('loadCard').classList.remove('hidden');
    const pct = Math.round((report.progress ?? 0) * 100);
    $('loadBar').style.width = pct + '%';
    $('loadText').textContent = report.text || '';
    if (pct >= 100) {
        badge.textContent = '✓ AI Ready';
        badge.style.borderColor = '#34d399';
        badge.style.color = '#065f46';
        badge.classList.add('ok');
    }
});

// Measured on-device benchmark (real numbers, no claimed tok/s): retrieval ms +
// LLM tok/s (WebGPU only) + JS heap. Always runnable — rule/retrieval path measured everywhere.
if ($('benchBtn')) {
    $('benchBtn').onclick = async () => {
        const out = $('benchOut');
        try {
            if (out) out.textContent = 'Measuring…';
            const t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
            await retrieveSections('benchmark sample: assault threat theft', 4);
            const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
            let retMs = (now - t0).toFixed(1);
            if (semanticReady) {
                try {
                    const s0 = performance.now();
                    await retrieveFinal('benchmark sample: assault threat theft', 5, 15000);
                    retMs += ` (fused: ${(performance.now() - s0).toFixed(0)}ms)`;
                } catch { /* ignore */ }
            }
            const memMB = (typeof performance !== 'undefined' && performance?.memory?.usedJSHeapSize) ? Math.round(performance.memory.usedJSHeapSize / 1048576) + 'MB heap' : 'heap n/a';
            const eng = (typeof getEngineStatus === 'function' ? getEngineStatus() : { mode: 'rule-only' });
            const benchRec = { retrievalMsLex: +retMs, mem: memMB, engine: eng.mode || 'n/a', llm: null };
            let llmPart = 'LLM: rule engine (WebGPU off or AI disabled)';
            if (isWebGPUSupported() && isAIAssistEnabled()) {
                try {
                    const m = await measureInferenceSpeed();
                    benchRec.llm = m;
                    llmPart = m.supported ? `LLM: ${m.tokensPerSec} tok/s (${m.tokens} tok / ${m.seconds}s, ${m.model || 'webgpu'})` : `LLM: unavailable (${m.error || m.note || 'fallback to rules'})`;
                } catch (e) { llmPart = `LLM: unavailable (${e?.message || e})`; }
            }
            try { window.__lastBench = benchRec; } catch { /* ignore */ }
            if (out) out.textContent = `Retrieval: ${retMs}ms · ${memMB} · ${llmPart} · engine:${eng.mode || 'n/a'}`;
        } catch (e) {
            if (out) out.textContent = `Benchmark failed: ${e?.message || e}`;
        }
    };
}

// Technique comparison panel: Rules vs Rules+NER vs Full (LLM when present),
// scored on-device against a fixed 8-case gold set. Lazy-loads the runner so
// the main bundle stays light; NER/LLM models download on demand (cached).
if ($('compareBtn')) {
    $('compareBtn').onclick = async () => {
        const btn = $('compareBtn'), status = $('compareStatus'), out = $('compareOut');
        try {
            btn.disabled = true;
            if (status) status.textContent = 'Starting… (rules are instant; NER/LLM download once if needed)';
            if (out) out.innerHTML = '';
            const { runTechniqueComparison } = await import('./technique_compare.js');
            const res = await runTechniqueComparison((p) => {
                if (status) status.textContent = `Case ${p.done + 1}/${p.total}${p.id ? ` (${p.id})` : ''} — rules → NER → LLM…`;
            });
            const cell = (ok) => ok ? '<span style="color:#15803d">✓</span>' : '<span style="color:#b91c1c">✗</span>';
            const tip = (v) => `loc: ${v.location || '?'} | aggr: ${v.aggressor || '?'} | cat: ${v.category || '?'}`;
            const col = (r, k) => `${cell(r[k].score.loc)}${cell(r[k].score.aggr)}${cell(r[k].score.cat)} <small style="color:#64748b" title="${escHtml(tip(r[k]))}">${escHtml(String(r[k].note || ''))}</small>`;
            const pct = (t, k) => Math.round((100 * t[k]) / Math.max(1, t.n)) + '%';
            let html = `<div style="font-size:.75rem;color:#475569;margin-bottom:6px;">Device: WebGPU ${res.meta.webgpu ? 'yes' : 'no'} · engine ${escHtml(res.meta.engine?.mode || '?')}${res.meta.engine?.model ? ` (${escHtml(res.meta.engine.model)})` : ''} · NER ${res.meta.ner?.ready ? `ready (${escHtml(res.meta.ner.model || '')})` : 'not loaded'} · columns show loc/aggr/cat</div>`;
            html += '<table style="border-collapse:collapse;width:100%;font-size:.8rem;"><thead><tr style="background:#f1f5f9;"><th style="border:1px solid #e2e8f0;padding:5px 7px;text-align:left;">Case</th><th style="border:1px solid #e2e8f0;padding:5px 7px;text-align:left;">Rules</th><th style="border:1px solid #e2e8f0;padding:5px 7px;text-align:left;">+NER</th><th style="border:1px solid #e2e8f0;padding:5px 7px;text-align:left;">LLM full</th></tr></thead><tbody>';
            for (const r of res.rows) {
                html += `<tr><td style="border:1px solid #e2e8f0;padding:5px 7px;" title="gold — ${escHtml(tip(r.gold))}"><strong>${escHtml(r.id)}</strong> <small style="color:#64748b">[${escHtml(r.lang)}]</small><br><small style="color:#64748b">${escHtml(r.text.slice(0, 90))}${r.text.length > 90 ? '…' : ''}</small></td><td style="border:1px solid #e2e8f0;padding:5px 7px;">${col(r, 'rule')}</td><td style="border:1px solid #e2e8f0;padding:5px 7px;">${col(r, 'nerAssist')}</td><td style="border:1px solid #e2e8f0;padding:5px 7px;">${col(r, 'full')}</td></tr>`;
            }
            html += '</tbody></table>';
            const t = res.totals;
            html += `<div style="margin-top:8px;font-size:.82rem;"><strong>Totals (loc/aggr/cat):</strong> Rules ${t.rule.loc}/${t.rule.aggr}/${t.rule.cat} (${pct(t.rule, 'loc')}/${pct(t.rule, 'aggr')}/${pct(t.rule, 'cat')}) · +NER ${t.nerAssist.loc}/${t.nerAssist.aggr}/${t.nerAssist.cat} · LLM ${t.full.loc}/${t.full.aggr}/${t.full.cat} <span style="color:#64748b">of ${t.rule.n}</span></div>`;
            if (out) out.innerHTML = html;
            if (status) status.textContent = 'Done. Winner = highest total; NER/LLM columns show their load state when unavailable.';
        } catch (e) {
            if (status) status.textContent = `Comparison failed: ${e?.message || e}`;
        } finally {
            btn.disabled = false;
        }
    };
}

// Dev/metrics panel wiring (debug only — hidden in a collapsed <details>)
try {
    const renderDev = async () => {
        const el = $('devOut');
        if (!el) return;
        const m = await import('./devmetrics.js');
        const agg = m.studyAggregates();
        const bench = m.getBenchLog();
        el.textContent = `Benchmarks saved: ${bench.length}\n` +
            bench.slice(-5).map((b) => `  ${b.ts} retr=${b.retrievalMsLex}ms mem=${b.mem} llm=${b.llm?.tokensPerSec ?? 'n/a'}tok/s engine=${b.engine}`).join('\n') +
            `\nTime/cost drafts: ${agg.n || 0}` +
            (agg.n ? `\n  median ${agg.medianSec}s / draft (manual baseline 2.5 days + ₹1000)\n  est. saved: ${agg.estDaysSaved} days, ₹${agg.estRupeesSaved}\n  langs: ${JSON.stringify(agg.byLang)}` : '');
    };
    if ($('benchSaveBtn')) $('benchSaveBtn').onclick = async () => {
        const m = await import('./devmetrics.js');
        let rec = null;
        try { rec = window.__lastBench || null; } catch { /* ignore */ }
        m.logBenchmark(rec || { note: 'no measurement yet — press Measure first' });
        renderDev();
    };
    if ($('benchExportBtn')) $('benchExportBtn').onclick = async () => {
        const m = await import('./devmetrics.js');
        m.downloadJson(`nyaya-setu-metrics-${new Date().toISOString().slice(0, 10)}.json`, { benchmarks: m.getBenchLog(), study: m.getStudyLog(), device: m.deviceHints() });
    };
    if ($('studyExportBtn')) $('studyExportBtn').onclick = async () => {
        const m = await import('./devmetrics.js');
        const log = m.getStudyLog();
        if (!log.length) { alert('No study drafts logged yet — complete a draft first.'); return; }
        m.downloadCsv(`nyaya-setu-study-${new Date().toISOString().slice(0, 10)}.csv`, log);
    };
    if ($('studyClearBtn')) $('studyClearBtn').onclick = async () => {
        const m = await import('./devmetrics.js');
        m.clearStudy();
        renderDev();
    };
    if ($('devCard')) $('devCard').addEventListener('toggle', () => { if ($('devCard').open) renderDev(); });
} catch { /* dev panel optional */ }

// Background semantic preload (MiniLM ~30MB once, then cached): lexical stays
// instant and is always the fallback, so tabs never block on this.
let semanticReady = false;
if (isAIAssistEnabled()) {
    setTimeout(() => {
        import('./semantic.js').then((m) => m.ensureSemantic((p) => {
            if ($('langHint') && p?.text) $('langHint').textContent = p.text;
        }).then(() => { semanticReady = true; }).catch((err) => {
            console.warn('Semantic preload skipped:', err?.message);
        }));
    }, 4000);
}

// Fused rank with timeout: semantic (MiniLM) + lexical(+dialect lexicon); falls back
// to pure lexical when the embedding engine isn't loaded yet or is slow.
async function retrieveFinal(narrative, topK = 5, timeoutMs = 8000) {
    const lex = await retrieveSections(narrative, 25);
    if (!semanticReady) return lex.slice(0, topK);
    try {
        const { retrieveFused } = await import('./semantic.js');
        const fused = await Promise.race([
            retrieveFused(narrative, lex, topK),
            new Promise((_, reject) => setTimeout(() => reject(new Error('semantic-timeout')), timeoutMs))
        ]);
        return (Array.isArray(fused) && fused.length) ? fused : lex.slice(0, topK);
    } catch {
        return lex.slice(0, topK);
    }
}

// Automatic LLM fetch (background, non-blocking). Rule engine stays usable.
// Gated on a REAL adapter probe (isWebGPUUsable, cached) — API presence alone
// is not enough: broken/headless drivers expose navigator.gpu but can never
// create an adapter, and attempting the ~700MB download there wastes minutes.
if (isAIAssistEnabled()) {
    setTimeout(() => {
        Promise.resolve(isWebGPUUsable()).then((ok) => {
            if (!ok) return;
            ensureEngine().then(() => {
            badge.textContent = '✓ AI Ready (auto-downloaded)';
            badge.style.borderColor = '#34d399';
            badge.style.color = '#065f46';
            badge.classList.add('ok');
            if ($('aiOptin')) $('aiOptin').checked = true;
        }).catch((err) => {
            console.warn('Auto AI download failed, staying on rules:', err?.message);
            badge.textContent = '⚡ Instant Mode (rule-based, offline)';
        });
        });
    }, 1500);
}

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
        // Offline-first: voice transcription needs network in Chrome/Edge; warn clearly.
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            if ($('langHint')) $('langHint').textContent = 'Offline: voice transcription unavailable — please type. Typing works fully offline.';
        }
        const currentLang = getSelectedLanguage() || 'en';
        recognition.lang = LANG_BCP47[currentLang] || 'en-IN';
        finalText = $('narrative').value ? $('narrative').value + ' ' : '';
        try {
            recognition.start();
            recognizing = true;
            $('recBtn').textContent = t('recBtnStop');
            $('recBtn').classList.add('recording');
            $('langHint').textContent = `Listening in ${recognition.lang}... (needs network; typing stays offline)`;
        } catch (err) {
            console.error('Failed to start recognition:', err);
        }
    };
    // surface network failures instead of silent stop
    const origOnError = recognition.onerror;
    recognition.onerror = (e) => {
        origOnError?.(e);
        if (e?.error === 'network' && $('langHint')) {
            $('langHint').textContent = 'Voice needs network in this browser — your typed text is saved. Type to continue offline.';
        }
    };
} else {
    // No SpeechRecognition: offline audio memo fallback (records locally, no transcription)
    $('recBtn').onclick = async () => {
        try {
            const { startOfflineMemo, stopOfflineMemo, isMemoRecording } = await import('./voice.js');
            if (isMemoRecording()) {
                const blob = await stopOfflineMemo();
                $('recBtn').textContent = t('recBtnIdle');
                $('recBtn').classList.remove('recording');
                if (blob) {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `nyaya-setu-memo-${Date.now()}.webm`;
                    a.click();
                    setTimeout(() => URL.revokeObjectURL(url), 5000);
                    if ($('langHint')) $('langHint').textContent = 'Memo saved locally (audio). Tap “Offline Voice → transcribe” below for on-device transcription, or type a summary.';
                }
                return;
            }
            await startOfflineMemo();
            $('recBtn').textContent = '⏹ Stop memo';
            $('recBtn').classList.add('recording');
            if ($('langHint')) $('langHint').textContent = 'Recording offline memo (audio only, stays on device)…';
        } catch {
            alert('Voice input is supported in Chrome, Edge, and Android browsers. Typing works fully offline.');
        }
    };
}

// Offline voice: record a memo, then transcribe fully on-device (Whisper tiny).
// First tap records, second tap stops + transcribes. Slow on tabs — progress shown.
if ($('offlineVoiceBtn')) {
    let memoOn = false;
    $('offlineVoiceBtn').onclick = async () => {
        try {
            const voice = await import('./voice.js');
            if (!memoOn) {
                await voice.startOfflineMemo();
                memoOn = true;
                $('offlineVoiceBtn').textContent = '⏹ Stop + Transcribe (offline)';
                if ($('langHint')) $('langHint').textContent = 'Recording offline… tap again to stop and transcribe on-device.';
                return;
            }
            memoOn = false;
            $('offlineVoiceBtn').textContent = '🎙️ Offline Voice';
            const blob = await voice.stopOfflineMemo();
            if (!blob || blob.size < 1000) {
                if ($('langHint')) $('langHint').textContent = 'Empty recording — please try again or type.';
                return;
            }
            if ($('langHint')) $('langHint').textContent = 'Transcribing on-device (Whisper tiny — first run downloads ~150MB once)…';
            const { transcribeBlob } = await import('./stt.js');
            const { text } = await transcribeBlob(blob, getSelectedLanguage(), (p) => {
                if ($('langHint') && p?.text) $('langHint').textContent = p.text;
            });
            if (text) {
                const cur = $('narrative').value ? $('narrative').value + ' ' : '';
                $('narrative').value = (cur + text).trim();
                if ($('langHint')) $('langHint').textContent = 'Offline transcription added — review it before drafting.';
            } else if ($('langHint')) {
                $('langHint').textContent = 'No speech detected — please try again or type.';
            }
        } catch (err) {
            memoOn = false;
            if ($('offlineVoiceBtn')) $('offlineVoiceBtn').textContent = '🎙️ Offline Voice';
            alert(`Offline voice failed: ${err?.message || err}. Typing works fully offline.`);
        }
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
if ($('catFilter')) {
    refreshCatFilter();
    $('catFilter').addEventListener('change', () => {
        renderLawsExplorer($('statuteSearch')?.value || '');
    });
}

// Demo samples — one tap fills a realistic grievance, switches language, and hints.
const DEMO_SAMPLES = {
    'en-hit': { lang: 'en', text: 'On 25th August, near the village square, Ramu and two others blocked my path, hit me with a stick, and threatened to kill me if I demanded my pending wages.' },
    'hi-wage': { lang: 'hi', text: 'मालिक ने तीन महीने की मजदूरी नहीं दी, 15000 रुपये रोक लिए हैं।' },
    'te-land': { lang: 'te', text: 'నా భూమిని కబ్జా చేశారు, పొలంలోకి చొరబడ్డారు।' },
};
if ($('sampleRow')) {
    $('sampleRow').addEventListener('click', (e) => {
        const btn = e.target.closest('[data-sample]');
        if (!btn) return;
        const s = DEMO_SAMPLES[btn.dataset.sample];
        if (!s) return;
        applyLanguageSelection(s.lang);
        if ($('narrative')) $('narrative').value = s.text;
        if ($('langHint')) $('langHint').textContent = `Sample loaded (${s.lang}) — edit it to match your case, then Review.`;
        $('narrative')?.focus();
    });
}

if ($('syncBtn')) {
    $('syncBtn').onclick = async () => {
        // Local-only: show offline corpus provenance (no network sync exists by design).
        const m = STATUTE_METADATA;
        alert(`Corpus ${m.version} (${m.corpusKind})\nSlots: ${m.totalSections} (~${m.curatedSections} curated)\nRetrieval: ${m.retrievalMethod}\nEffective: ${m.effectiveDate || '2024-07-01'}\nSources:\n- ${(m.officialSources || []).join('\n- ')}\n\nVerify at https://www.indiacode.nic.in/ before filing. See data/provenance.json for hash.`);
    };
}

if ($('resetStatutesBtn')) {
    $('resetStatutesBtn').addEventListener('click', async () => {
        resetToDefaultStatutes();
        try { await clearIDBCorpus(); await initOfflineIndex(() => getLoadedStatutes(), STATUTE_METADATA); } catch { /* ignore */ }
        renderLawsExplorer($('statuteSearch')?.value || '');
        alert('Local prototype corpus reset (memory + offline cache).');
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

        const todayStr = new Date().toLocaleDateString('en-IN');
        const dName = cleanVal(entities.complainantName);
        const dSum = cleanVal(entities.summary, '');
        const dAgg = cleanVal(entities.aggressor);
        const dDate = cleanVal(entities.date);
        const dLoc = cleanVal(entities.location);
        const dCat = cleanVal(entities.category, 'needs_human_review');
        const factsHtml = `
            <div class="fact-field ${dName === 'unknown' ? 'unknown' : ''}">
                <div class="fact-label">Complainant Name</div>
                <div class="fact-value">${dName !== 'unknown' ? escHtml(dName) : '(not given — leave blank, sign by hand)'}</div>
            </div>
            <div class="fact-field ${!dSum || dSum === 'unknown' ? 'unknown' : ''}">
                <div class="fact-label">Summary of Events</div>
                <div class="fact-value">${dSum && dSum !== 'unknown' ? escHtml(dSum) : '(not extracted)'}</div>
            </div>
            <div class="fact-field ${dAgg === 'unknown' ? 'unknown' : ''}">
                <div class="fact-label">Accused / Aggressor</div>
                <div class="fact-value">${dAgg !== 'unknown' ? escHtml(dAgg) : '(not identified — describe in draft)'}</div>
            </div>
            <div class="fact-field ${dDate === 'unknown' ? 'unknown' : ''}">
                <div class="fact-label">Date of Incident</div>
                <div class="fact-value">${dDate !== 'unknown' ? escHtml(dDate) : `Not specified — draft will use today (${escHtml(todayStr)})`}</div>
            </div>
            <div class="fact-field ${dLoc === 'unknown' ? 'unknown' : ''}">
                <div class="fact-label">Location</div>
                <div class="fact-value">${dLoc !== 'unknown' ? escHtml(dLoc) : '(not specified)'}</div>
            </div>
            <div class="fact-field">
                <div class="fact-label">Offence Category</div>
                <div class="fact-value">${escHtml(dCat)}</div>
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

// ---- Main Pipeline Execution (safety-screened, review-gated) ----
$('runBtn').onclick = async () => {
    const narrative = $('narrative').value.trim();
    if (!narrative || narrative.length < 15) {
        alert(t('msgNeedNarrative'));
        return;
    }

    // Safety: instant rule screen + local quantized Guard-3-1B (no cloud, best-effort)
    // Disallowed content (weapons/bomb instructions) is hard-blocked at the gate
    // and NEVER reaches the complaint draft pipeline.
    const safety = screenInput(narrative);
    if (!safety.ok) {
        const disallowed = safety.reasons.includes('disallowed-content');
        if (disallowed) {
            alert('This request cannot be helped as a police complaint. If someone is in danger, call 112 immediately. For free legal aid, contact NALSA 15100. You may start a new complaint with a factual grievance instead.');
            if ($('langHint')) $('langHint').textContent = 'Blocked: disallowed content — drafting is for police complaints only. Call 112 in danger.';
            return;
        }
        alert(`Input blocked for safety (${safety.reasons.join(', ')}). Please rephrase factually.`);
        $('langHint').textContent = `Blocked: ${safety.reasons.join(', ')}`;
        return;
    }
    if (safety.piiHint && $('langHint')) {
        $('langHint').textContent = 'Note: avoid Aadhaar/bank numbers in the narrative.';
    }

    // Unsupported language: translate via Google Translate for pseudo-support
    let pipelineNarrative = narrative;
    let originalNarrative = narrative;
    let translatedFromLang = null;
    const scriptInfo = detectScript(narrative);
    if (!scriptInfo.supported) {
        if ($('langHint')) $('langHint').textContent = `Translating from ${scriptInfo.scriptName}…`;
        try {
            const en = await translateText(narrative, scriptInfo.lang, 'en');
            if (en && en.trim().length >= 15) {
                pipelineNarrative = en;
                originalNarrative = narrative;
                translatedFromLang = scriptInfo.lang;
            } else {
                // Translation too short — fall back to warning
                const w = await getUnsupportedLangWarning(narrative);
                if (w && $('langHint')) $('langHint').textContent = `⚠ ${w.message}`;
            }
        } catch {
            // Offline or API error — show warning, still try pipeline on original
            const w = await getUnsupportedLangWarning(narrative);
            if (w && $('langHint')) $('langHint').textContent = `⚠ ${w.message}`;
        }
    }
    // Defer local Guard + emergency checks until live draft is needed (see below —
    // they run after the "is this even a complaint?" gate so injection probes
    // don't waste GPU time).

    $('runBtn').disabled = true;
    $('runBtn').textContent = '⏳ Processing…';
    const pipeT0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    let pipeRetMs = null;

    try {
        setStep(1);
        const selectedLanguage = getSelectedLanguage();

        setStep(2);
        let entities = await extractEntities(pipelineNarrative);
        // Local-only: no cloud refinement. Grievance never leaves device.

        // Auto-fill intake form fields only with real values (never "Unknown"/JSON)
        if ($('cName') && !$('cName').value.trim() && isKnownVal(entities.complainantName)) {
            $('cName').value = cleanVal(entities.complainantName);
        }
        if ($('cParent') && !$('cParent').value.trim() && isKnownVal(entities.parentName)) {
            $('cParent').value = cleanVal(entities.parentName);
        }
        if ($('cAccused') && !$('cAccused').value.trim() && isKnownVal(entities.aggressor)) {
            $('cAccused').value = cleanVal(entities.aggressor);
        }

        const complainantInfo = {
            name: $('cName')?.value || '',
            parent: $('cParent')?.value || '',
            phone: $('cPhone')?.value || '',
            accused: $('cAccused')?.value || '',
            date: isKnownVal(entities.date) ? cleanVal(entities.date) : '',
            narrative: pipelineNarrative
        };

        const retrievedPreview = await retrieveSections(pipelineNarrative, 3);
        if (!isActionableComplaint(pipelineNarrative, entities, retrievedPreview)) {
            alert(t('msgInsufficientComplaint') + '\n\nIf police refuse a FIR, ask for a written acknowledgement and approach the Superintendent of Police (SP). For free advice, call NALSA 15100. In danger, call 112 first.');
            $('langHint').textContent = t('msgInsufficientComplaint');
            $('runBtn').disabled = false;
            $('runBtn').textContent = t('runBtn');
            return;
        }

        // Heavy checks deferred: local Guard + emergency interstitial only for live drafts.
        try {
            if ($('langHint')) $('langHint').textContent = 'Local safety check…';
            const g = await guardCheck(pipelineNarrative, 12000);
            if (!g.ok) {
                alert(`Blocked by local safety (${g.source}: ${g.reasons.join(', ')}). Please rephrase factually.`);
                if ($('langHint')) $('langHint').textContent = `Blocked: ${g.reasons.join(', ')}`;
                $('runBtn').disabled = false;
                $('runBtn').textContent = t('runBtn');
                return;
            }
        } catch { /* guard best-effort; rule screen already passed */ }
        {
            const emg = detectEmergency(pipelineNarrative);
            if (emg.emergency) {
                const modal = $('emergencyModal');
                if (modal) {
                    $('emergencyMatched') && ($('emergencyMatched').textContent = `Trigger: ${emg.matched}`);
                    modal.classList.remove('hidden');
                    const proceed = await new Promise((resolve) => {
                        $('emergencyContinueBtn').onclick = () => { modal.classList.add('hidden'); resolve(true); };
                        $('emergencyBackBtn').onclick = () => { modal.classList.add('hidden'); resolve(false); };
                    });
                    if (!proceed) { $('runBtn').disabled = false; $('runBtn').textContent = t('runBtn'); return; }
                }
            }
        }

        // ---- Step 3: Human Fact Verification Modal ----
        setStep(3);
        const userVerified = await showExtractedFactsReview(entities, retrievedPreview);
        if (!userVerified) {
            $('runBtn').disabled = false;
            $('runBtn').textContent = t('runBtn');
            return;
        }

        // ---- Step 4: Statute Retrieval (semantic MiniLM + lexical + dialect lexicon, fused) ----
        // Draft uses medium/high confidence only; low stays in explorer. Placeholder
        // punishment ("As prescribed...") is hidden to reduce noise.
        setStep(4);
        if ($('langHint')) $('langHint').textContent = semanticReady ? 'Ranking provisions (semantic + lexical)…' : 'Ranking provisions (lexical; semantic loads in background)…';
        const retT0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        const retrievedAll = await retrieveFinal(pipelineNarrative, 10);
        pipeRetMs = ((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - retT0;
        const isPlaceholderPun = (p) => !p || /^as prescribed under/i.test(String(p));
        const retrieved = retrievedAll.filter((r) => r.confidence !== 'low').slice(0, 5);
        lastRetrieved = retrieved;
        const bhashiniInfo = getBhashiniNormalization(pipelineNarrative);
        const semNote = retrievedAll.some((r) => r.origin === 'both' || r.origin === 'semantic') ? ' · semantic rank on' : '';
        const listForUi = (retrieved.length ? retrieved : retrievedAll.slice(0, 2));
        $('secList').innerHTML = listForUi.length
            ? listForUi.map(({ statute, confidence }) => {
                const cat = citizenCategoryFor(statute, selectedLanguage);
                return `<li><strong>${escHtml(statute.code)} §${escHtml(statute.section)}</strong> — ${escHtml(titleFor(statute, selectedLanguage))} <span style="font-size:0.75rem;color:#475569">(${escHtml(confidence)} · ${escHtml(cat.label)})</span>${!isPlaceholderPun(statute.punishment) ? ` · <span style="color:#b91c1c">${escHtml(statute.punishment)}</span>` : ''}</li>`;
            }).join('') + (bhashiniInfo.normalizedConcepts.length ? `<li style="list-style:none;font-size:0.75rem;color:#475569;margin-top:6px;">Matched: ${bhashiniInfo.normalizedConcepts.map(escHtml).join(', ')}</li>` : '')
            : `<li>${t('noMatch')}</li>`;
        $('secCard').classList.remove('hidden');

        // ---- Step 5: Complaint Drafting (+ dynamic English gist, on-device) ----
        setStep(5);

        // Validate cited sections with Guard 3 (best-effort, non-blocking)
        try {
            if (typeof retrieved !== 'undefined' && retrieved.length > 0) {
                const { validateSectionsWithGuard } = await import('./guard.js');
                const validated = await validateSectionsWithGuard(pipelineNarrative, retrieved);
                if (validated.droppedSections && validated.droppedSections.length > 0) {
                    console.log(`Guard 3 dropped ${validated.droppedSections.length} irrelevant sections: ${validated.droppedSections.map((s) => s.statute.section).join(', ')}`);
                    retrieved = validated.validatedSections;
                }
            }
        } catch { /* guard validation best-effort */ }

        let gist = { text: '', source: 'original' };
        if (selectedLanguage !== 'en') {
            try {
                if ($('langHint')) $('langHint').textContent = 'Translating English gist on-device…';
                const { translateGist } = await import('./translate.js');
                gist = await translateGist(entities.summary || pipelineNarrative, selectedLanguage, 'en');
            } catch { gist = { text: '', source: 'original' }; }
        }
        lastComplaint = await draftComplaint(complainantInfo, entities, retrieved, selectedLanguage,
            gist.text ? { englishSummary: gist.text, gistSource: gist.source } : {});
        activeView = 'native';

        // ---- Step 6: Output ----
        setStep(6);
        refreshComplaintView();
        $('outCard').classList.remove('hidden');

        document.querySelectorAll('.step').forEach((el) => { el.classList.remove('active'); el.classList.add('done'); });
        // Judge panel (always visible after a draft): pipeline timing + retrieval provenance.
        try {
            const totalSec = (((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - pipeT0) / 1000;
            const jp = $('judgePanel'), jt = $('judgeTiming'), jr = $('judgeRet'), js = $('judgeSections');
            if (jp) jp.classList.remove('hidden');
            if (jt) jt.textContent = `Pipeline: ${totalSec.toFixed(2)}s`;
            if (jr) jr.textContent = `Retrieval: ${pipeRetMs !== null ? pipeRetMs.toFixed(0) + 'ms' : 'n/a'}${semanticReady ? ' (fused)' : ' (lexical)'}`;
            if (js) js.textContent = `Sections: ${lastRetrieved.map((r) => `${r.statute.code}-${r.statute.section}(${r.confidence})`).join(', ') || 'general format'}`;
            if ($('judgeCopyBtn')) $('judgeCopyBtn').onclick = async () => {
                const payload = `Nyaya-Setu — pipeline ${totalSec.toFixed(2)}s, retrieval ${pipeRetMs?.toFixed(0) ?? 'n/a'}ms${semanticReady ? ' (fused)' : ''}, sections: ${lastRetrieved.map((r) => `${r.statute.code}-${r.statute.section}`).join(', ') || 'none'}, corpus v0.6 (1059 slots)`;
                try { await navigator.clipboard.writeText(payload); $('judgeCopyBtn').textContent = 'Copied ✓'; setTimeout(() => $('judgeCopyBtn').textContent = 'Copy for judges', 1200); } catch { alert(payload); }
            };
        } catch {}
        // Time/cost study log (dev instrument): pipeline seconds vs manual baseline.
        // (Timer already used above for the judge panel — reuse it.)
        try {
            const totalSec2 = (((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - pipeT0) / 1000;
            const m = await import('./devmetrics.js');
            m.logStudyDraft({ lang: selectedLanguage, narrativeChars: pipelineNarrative.length, totalSec: totalSec2, retrievalMs: pipeRetMs, sections: lastRetrieved.length });
        } catch { /* study logging never breaks drafting */ }
        try { saveDraftHistory(); } catch {}
    } catch (err) {
        console.error(err);
        alert(`${t('msgPipelineError')} ` + (err?.message || err));
    } finally {
        $('runBtn').disabled = false;
        $('runBtn').textContent = t('runBtn');
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

$('englishBtn').onclick = () => {
    if (!lastComplaint) return;
    activeView = activeView === 'english' ? 'native' : 'english';
    refreshComplaintView();
};

$('audioBtn').onclick = () => {
    const text = $('complaintOut')?.textContent || '';
    if (text.trim()) {
        speakDraft(text, getSelectedLanguage());
    } else {
        speakRightsBriefing(getSelectedLanguage());
    }
};
$('stopAudioBtn').onclick = stopAudio;
// warm up voice list (some Android browsers load voices async)
try { window.speechSynthesis?.getVoices?.(); window.speechSynthesis && (window.speechSynthesis.onvoiceschanged = () => {}); } catch { /* ignore */ }

// CPGRAMS structured export (reviewable JSON, does not auto-file)
if ($('cpgramsBtn')) {
    $('cpgramsBtn').onclick = () => {
        if (!lastComplaint) return;
        const complainantInfo = {
            name: $('cName')?.value || '',
            parent: $('cParent')?.value || '',
            phone: $('cPhone')?.value || '',
            accused: $('cAccused')?.value || '',
            narrative: $('narrative')?.value || ''
        };
        // entities not stored globally; rebuild minimal from form + narrative
        const schema = toCPGRAMSSchema(complainantInfo, { summary: $('narrative')?.value || '' }, lastRetrieved, getSelectedLanguage());
        downloadCPGRAMSJson(schema);
    };
}
if ($('whatsBtn')) {
    $('whatsBtn').onclick = () => {
        if (!lastComplaint) return;
        const text = ($('complaintOut')?.textContent || '').trim().slice(0, 3500);
        if (!text) return;
        const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank', 'noopener');
    };
}
if ($('copyBtn')) {
    $('copyBtn').onclick = async () => {
        const text = ($('complaintOut')?.textContent || '').trim();
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            $('copyBtn').textContent = '✓ Copied';
            setTimeout(() => { $('copyBtn').textContent = '📋 Copy Draft'; }, 1500);
        } catch {
            // Fallback: select + execCommand
            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            $('copyBtn').textContent = '✓ Copied';
            setTimeout(() => { $('copyBtn').textContent = '📋 Copy Draft'; }, 1500);
        }
    };
}

// Draft history (local-only, on this device) — survives reloads for kiosk follow-ups.
const DRAFTS_KEY = 'nyaya_setu_drafts_v1';
function saveDraftHistory() {
    if (!lastComplaint) return;
    try {
        const list = JSON.parse(localStorage.getItem(DRAFTS_KEY) || '[]');
        list.unshift({ ts: new Date().toISOString(), lang: getSelectedLanguage(), preview: ($('complaintOut')?.textContent || '').slice(0, 120), html: complaintToHtml(lastComplaint, {}, lastRetrieved, getSelectedLanguage()) });
        localStorage.setItem(DRAFTS_KEY, JSON.stringify(list.slice(0, 12)));
        renderDraftHistory();
    } catch { /* quota */ }
}
function renderDraftHistory() {
    const el = $('draftHistory');
    if (!el) return;
    try {
        const list = JSON.parse(localStorage.getItem(DRAFTS_KEY) || '[]');
        if (!list.length) { el.classList.add('hidden'); return; }
        el.classList.remove('hidden');
        el.innerHTML = `<div style="font-size:.78rem;font-weight:600;color:#334155;margin-bottom:6px;">Recent drafts on this device (${list.length})</div>` +
            list.map((d, i) => `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #e2e8f0;font-size:.78rem;"><span>${new Date(d.ts).toLocaleString('en-IN')} · ${d.lang.toUpperCase()} — ${escHtml(d.preview.slice(0, 80))}…</span><button class="secondary" data-restore="${i}" style="font-size:.72rem;padding:4px 8px;">Restore</button></div>`).join('');
        el.querySelectorAll('[data-restore]').forEach((b) => b.addEventListener('click', () => {
            const idx = Number(b.dataset.restore);
            const entry = JSON.parse(localStorage.getItem(DRAFTS_KEY) || '[]')[idx];
            if (!entry) return;
            downloadComplaint(entry.html);
        }));
    } catch { /* ignore */ }
}
try { renderDraftHistory(); } catch {}

// Opt-in cloud fallback toggle (privacy-first, off by default)
// Local-only build: no cloud path exists. No grievance text ever leaves device.

// On-device AI toggle (local-only; rule engine fallback for tabs)
if ($('aiOptin')) {
    $('aiOptin').checked = isAIAssistEnabled() && isWebGPUSupported();
    $('aiOptin').addEventListener('change', (e) => {
        const on = !!e.target.checked;
        if (on && !isWebGPUSupported()) {
            alert('WebGPU not available on this device. Staying on rule engine.');
            e.target.checked = false;
            setAIAssistEnabled(false);
        } else {
            setAIAssistEnabled(on);
            if (on && isWebGPUSupported()) {
                badge.textContent = '⏳ AI models downloading…';
                ensureEngine().then(() => {
                    badge.textContent = '✓ AI Ready';
                    badge.classList.add('ok');
                }).catch(() => { badge.textContent = '⚡ Instant Mode (rule-based, offline)'; });
            }
            if (!on) { try { resetEngine(); } catch { /* ignore */ } try { unloadGuard(); } catch { /* ignore */ } }
        }
    });
}
// All initialization runs at module load above (engine badge, offline index, etc.)
// No separate init() needed — removed broken call that was introduced in commit 1c8b3c6.
