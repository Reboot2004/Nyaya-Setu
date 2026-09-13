// On-site technique comparison — Rules vs Rules+NER vs Full (LLM when present).
// Powers the website's "technique test" panel AND stays importable in Node for
// parity tests. Scoring core is DOM-free; the panel in index.html renders rows.
//
// Subset of data/gold_cases.mjs (8 quick cases, EN/HI/TE/TA) so a phone can run
// it in ~1-2 min even with on-device LLM inference.
import { extractEntitiesRuleBased, extractEntities, isWebGPUSupported, isWebGPUUsable, ensureEngine, getEngineStatus } from './llm.js';
import { getNERStatus, ensureNER } from './ner.js';
import { CASES } from '../data/gold_cases.mjs';

export const COMPARE_IDS = ['E02', 'E03', 'E04', 'E06', 'E08', 'H01', 'T02', 'A01'];
export const COMPARE_CASES = CASES.filter((c) => COMPARE_IDS.includes(c.id));

const norm = (s) => String(s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
const canon = (s) => {
    const n = norm(s);
    return (!n || n === 'unknown' || n === '—' || n === '-') ? 'unknown' : n;
};

// DOM-free: score one prediction against gold. Same semantics as
// tests/extraction_benchmark.mjs (keep the two in sync).
export function scorePrediction(gold, pred) {
    return {
        loc: canon(pred.location) === canon(gold.location),
        aggr: canon(pred.aggressor) === canon(gold.aggressor),
        cat: norm(pred.category) === norm(gold.category)
    };
}

const pick = (e) => ({ location: e.location, aggressor: e.aggressor, category: e.category });

export async function runTechniqueComparison(onProgress) {
    // NER loads once up front (not per case): one ~129MB download, then fast.
    // If it can't load here, every row falls back to rules immediately instead
    // of stalling on per-case timeouts.
    let nerReady = false;
    try {
        onProgress?.({ done: 0, total: COMPARE_CASES.length, id: 'ner-load' });
        await Promise.race([
            ensureNER(),
            new Promise((_, rej) => setTimeout(() => rej(new Error('ner budget')), 30000))
        ]);
        nerReady = getNERStatus().ready;
    } catch { nerReady = false; }
    const rows = [];
    const totals = {
        rule: { loc: 0, aggr: 0, cat: 0, n: COMPARE_CASES.length },
        nerAssist: { loc: 0, aggr: 0, cat: 0, n: COMPARE_CASES.length },
        full: { loc: 0, aggr: 0, cat: 0, n: COMPARE_CASES.length }
    };
    let i = 0;
    // Probe once: attempting a 700MB LLM download on a device whose WebGPU is
    // present-but-broken would stall every row. Fall back to rules immediately.
    // A working adapter is not enough either (downloads can still be blocked) —
    // so also require the model host to answer a cheap HEAD first. Cached models
    // still need this only once per panel run.
    let llmUsable = false;
    let llmNote = 'rule (no usable WebGPU LLM on this device)';
    try {
        llmUsable = await isWebGPUUsable();
        if (llmUsable) {
            const hostOk = await Promise.race([
                fetch('https://huggingface.co/api/models/mlc-ai/Llama-3.2-1B-Instruct-q4f32_1-MLC', { method: 'HEAD' })
                    .then((r) => r.ok).catch(() => false),
                new Promise((resolve) => setTimeout(() => resolve(false), 8000))
            ]);
            if (!hostOk) { llmUsable = false; llmNote = 'rule (model host unreachable — offline? LLM skipped)'; }
        }
    } catch { llmUsable = false; }
    // Engine warmup ONCE (not per row): a ~700MB first download can take minutes,
    // and a broken network would stall every row. Budget it; on failure all rows
    // fall back to rules with an honest note. Cached engines warm up in seconds.
    let engineReady = false;
    if (llmUsable) {
        try {
            onProgress?.({ done: 0, total: COMPARE_CASES.length, id: 'llm-warmup' });
            await Promise.race([
                ensureEngine(),
                new Promise((_, rej) => setTimeout(() => rej(new Error('llm budget')), 180000))
            ]);
            engineReady = true;
        } catch { engineReady = false; llmNote = 'rule (LLM engine failed to load — see note; rules shown)'; }
    }
    for (const c of COMPARE_CASES) {
        onProgress?.({ done: i, total: COMPARE_CASES.length, id: c.id });
        const rule = pick(extractEntitiesRuleBased(c.text));
        let nerAssist = { ...rule, note: nerReady ? 'rule+ner' : 'ner-unavailable (rules shown)' };
        if (nerReady) {
            try {
                const e = await extractEntities(c.text, { ner: true, nerTimeoutMs: 15000 });
                nerAssist = { ...pick(e), note: e.extractionSource || 'rule+ner' };
            } catch { nerAssist = { ...rule, note: 'ner-error (rules shown)' }; }
        }
        let full = { ...rule, note: llmNote };
        if (engineReady) {
            try {
                const e = await extractEntities(c.text);
                full = { ...pick(e), note: e.extractionSource || 'rule' };
            } catch { full = { ...rule, note: 'llm-error (rules shown)' }; }
        }
        const row = {
            id: c.id, lang: c.lang, text: c.text, gold: c.gold,
            rule: { ...rule, score: scorePrediction(c.gold, rule) },
            nerAssist: { ...nerAssist, score: scorePrediction(c.gold, nerAssist) },
            full: { ...full, score: scorePrediction(c.gold, full) }
        };
        for (const [key, t] of [['rule', totals.rule], ['nerAssist', totals.nerAssist], ['full', totals.full]]) {
            if (row[key].score.loc) t.loc++;
            if (row[key].score.aggr) t.aggr++;
            if (row[key].score.cat) t.cat++;
        }
        rows.push(row);
        i++;
    }
    onProgress?.({ done: COMPARE_CASES.length, total: COMPARE_CASES.length, id: null });
    return {
        meta: {
            webgpu: isWebGPUSupported(),
            webgpuUsable: llmUsable,
            engine: (() => { try { return getEngineStatus(); } catch { return { mode: 'unknown' }; } })(),
            ner: (() => { try { return getNERStatus(); } catch { return { ready: false }; } })()
        },
        rows,
        totals
    };
}
