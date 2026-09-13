// Nyaya-Setu CPU NER fallback — multilingual token-classification via transformers.js.
// Sits between instant regex rules and the 700MB WebLLM model:
//   rules (instant, offline) → NER (~100-180MB q8, CPU/WASM, lazy) → LLM (WebGPU).
// Only fills UNKNOWN slots (location/aggressor); never overrides confident rule
// values. Best-effort: lazy-loaded, cached, timeout-guarded, fails soft to null
// so the pipeline never blocks on model download. Skipped in Node tests unless
// explicitly enabled (keeps the 252-test suite offline + fast).
import { hasPossessiveBefore } from './shared_sanitize.js';

// Small multilingual NER checkpoints (Xenova ONNX). Tried in order; first that
// loads wins and is cached. q8 + wasm keeps low-end tabs usable.
const NER_CANDIDATES = [
    'Xenova/distilbert-base-multilingual-cased-ner-hrl',
    'Xenova/bert-base-multilingual-cased-ner-hrl',
    'Xenova/xlm-roberta-base-ner-hrl'
];

let nerPromise = null;
let activeModel = null;
let activeDevice = null;

async function loadTransformers() {
    return await import('@huggingface/transformers');
}

function pickDevices() {
    const isNode = typeof window === 'undefined' || (typeof process !== 'undefined' && process.versions?.node);
    if (isNode) return ['cpu'];
    const hasWebGPU = typeof navigator !== 'undefined' && 'gpu' in navigator;
    return hasWebGPU ? ['webgpu', 'wasm'] : ['wasm'];
}

export async function ensureNER(onProgress) {
    if (nerPromise) return { ready: true, model: activeModel, device: activeDevice };
    const { pipeline } = await loadTransformers();
    const devices = pickDevices();
    let lastErr = null;
    for (const model of NER_CANDIDATES) {
        for (const device of devices) {
            try {
                onProgress?.({ model, device, text: `Loading NER model (${model}, ${device})…` });
                nerPromise = pipeline('token-classification', model, {
                    dtype: 'q8',
                    device,
                    aggregation_strategy: 'simple'
                });
                await nerPromise;
                activeModel = model;
                activeDevice = device;
                return { ready: true, model, device };
            } catch (err) {
                lastErr = err;
                nerPromise = null;
            }
        }
    }
    throw lastErr || new Error('NER engine unavailable');
}

export function getNERStatus() {
    return { ready: !!nerPromise, model: activeModel, device: activeDevice };
}

function cleanWord(w) {
    return String(w || '').replace(/^##/, '').replace(/^[#\s,;:.!?()"'`]+|[#\s,;:.!?()"'`]+$/g, '').trim();
}

// A model span is usable only if it occurs in the narrative as a standalone
// token/span — not as a subword shard of a longer word ('ட்டு' inside 'திருட்டு',
// 'ळे' inside 'शाळेत'). Tokenizers split Indic words aggressively, so without
// this check fragments leak into the FIR draft.
const SEP = '[\\s,;:.!?()"\'`।॥—–-]';
function occursAsStandaloneToken(narrative, word) {
    const text = String(narrative || '');
    const w = String(word || '').trim();
    if (!w) return false;
    const toks = text.split(new RegExp(SEP + '+')).filter(Boolean);
    if (toks.includes(w)) return true;
    const esc = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp('(^|' + SEP + ')' + esc + '($|' + SEP + ')').test(text);
}

// Map raw token-classification entities to { location, aggressor }.
// - LOC/GPE/FAC → location (first high-confidence, possessive-filtered)
// - PER → aggressor (first high-confidence)
// Scores below 0.6 are ignored to avoid shipping model noise into an FIR draft.
export function mapNerEntities(entities, narrative) {
    if (!Array.isArray(entities) || !entities.length) return { location: null, aggressor: null };
    const locGroups = new Set(['LOC', 'GPE', 'FAC', 'LOCATION']);
    const perGroups = new Set(['PER', 'PERSON']);
    let location = null;
    let aggressor = null;
    for (const e of entities) {
        const group = String(e.entity_group || e.entity || '').toUpperCase().replace(/^B-/, '').replace(/^I-/, '');
        const word = cleanWord(e.word);
        const score = typeof e.score === 'number' ? e.score : 0;
        // Never invent: drop low-confidence hits, subword fragments ('##…' pieces
        // like 'ळे'/'தி' that slip through aggregation), and 1-2 char shards.
        // A missed short name stays '—' in the draft — the safe direction.
        if (!word || word.includes('##') || word.length < 3 || score < 0.6) continue;
        // Fragment guard: the span must occur standalone in the narrative —
        // rejects shards like 'ட்டு' (inside 'திருட்டு') that pass the length floor.
        if (!occursAsStandaloneToken(narrative, word)) continue;
        if (!location && locGroups.has(group)) {
            if (!hasPossessiveBefore(narrative, word)) location = word;
        } else if (!aggressor && perGroups.has(group)) {
            if (!hasPossessiveBefore(narrative, word)) aggressor = word;
        }
        if (location && aggressor) break;
    }
    return { location, aggressor };
}

export async function extractEntitiesNER(narrative, opts = {}) {
    const text = String(narrative || '').trim();
    if (!text) return null;
    try {
        await ensureNER(opts.onProgress);
        const ner = await nerPromise;
        const out = await ner(text.slice(0, 512));
        return mapNerEntities(out, text);
    } catch {
        return null;
    }
}

export async function preloadNER(onProgress) {
    try {
        await ensureNER(onProgress);
        return getNERStatus();
    } catch {
        return getNERStatus();
    }
}
