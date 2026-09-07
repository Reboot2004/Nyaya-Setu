// Nyaya-Setu semantic retrieval — multilingual MiniLM (ONNX, CPU/WASM-first).
// Replaces brute-force trigger lists as the primary ranker: statute vectors are
// precomputed at build time (scripts/build_vectors.mjs) and shipped as a ~2.4MB
// static index; the query embeds on-device. No server, no GPU required.
// Lazy-loaded (dynamic import) so first paint stays instant on tabs.
import { getLoadedStatutes } from './retrieval.js';

const MODEL = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';
const INDEX_URL = './data/statute_vectors.json';

let extractorPromise = null;
let vectorsCache = null;
let activeDevice = null;

function l2norm(arr) {
    let s = 0;
    for (const v of arr) s += v * v;
    const n = Math.sqrt(s) || 1;
    return arr.map((v) => v / n);
}

async function loadTransformers() {
    // Dynamic import keeps the main bundle light; vite code-splits this chunk.
    return await import('@huggingface/transformers');
}

export async function ensureSemantic(onProgress) {
    if (vectorsCache && extractorPromise) {
        return { ready: true, device: activeDevice, model: MODEL };
    }
    const { pipeline } = await loadTransformers();
    // Node uses execution providers (cpu); browsers use wasm/webgpu backends.
    const isNode = typeof window === 'undefined' || (typeof process !== 'undefined' && process.versions?.node);
    const hasWebGPU = typeof navigator !== 'undefined' && 'gpu' in navigator;
    const devices = isNode ? ['cpu'] : hasWebGPU ? ['webgpu', 'wasm'] : ['wasm'];
    let lastErr;
    for (const device of devices) {
        try {
            onProgress?.({ device, text: `Loading embedding model (${device})…` });
            extractorPromise = pipeline('feature-extraction', MODEL, { dtype: 'q8', device });
            await extractorPromise;
            activeDevice = device;
            break;
        } catch (err) {
            lastErr = err;
            extractorPromise = null;
        }
    }
    if (!extractorPromise) throw lastErr || new Error('Embedding engine unavailable');
    if (!vectorsCache) {
        onProgress?.({ text: 'Loading statute vector index…' });
        const isNodeEnv = typeof window === 'undefined';
        if (isNodeEnv) {
            // @vite-ignore: node-only branch (eval harness / build scripts), never bundled
            const fs = await import(/* @vite-ignore */ 'fs');
            const path = await import(/* @vite-ignore */ 'path');
            const { fileURLToPath } = await import(/* @vite-ignore */ 'url');
            const here = path.dirname(fileURLToPath(import.meta.url));
            vectorsCache = JSON.parse(fs.readFileSync(path.join(here, '..', 'data', 'statute_vectors.json'), 'utf-8'));
        } else {
            const res = await fetch(INDEX_URL, { cache: 'force-cache' });
            if (!res.ok) throw new Error(`Vector index HTTP ${res.status}`);
            vectorsCache = await res.json();
        }
    }
    return { ready: true, device: activeDevice, model: MODEL };
}

export function getSemanticStatus() {
    return { ready: !!(vectorsCache && extractorPromise), device: activeDevice, model: MODEL };
}

function cosine(a, b) {
    let s = 0;
    for (let i = 0; i < a.length; i++) s += a[i] * b[i];
    return s; // inputs L2-normalized
}

export async function embedQuery(text) {
    const { ready } = await ensureSemantic();
    if (!ready) throw new Error('Semantic engine not ready');
    const extractor = await extractorPromise;
    const out = await extractor(String(text || '').slice(0, 512), { pooling: 'mean', normalize: false });
    return l2norm(Array.from(out.data));
}

// Raw semantic top-K over the whole corpus: [{ id, cos }]
export async function retrieveSemanticRaw(narrative, topK = 25) {
    const q = await embedQuery(narrative);
    const entries = Object.entries(vectorsCache.vectors);
    const scored = entries.map(([id, vec]) => ({ id, cos: cosine(q, vec) }));
    scored.sort((a, b) => b.cos - a.cos);
    return scored.slice(0, topK);
}

function isCuratedStatute(s) {
    return s?.verified === 'curated';
}

// Fused rank: 0.55 semantic + 0.45 lexical(+dialect lexicon), curated bonus.
// Pool hygiene (no demo noise): semantic-only PLACEHOLDERS enter only at cos>=0.50;
// curated entries always enter. Lexical entries always enter (thresholded upstream).
// Returns items shaped like retrieveSections() plus { semanticScore, origin }.
const SEM_PLACEHOLDER_FLOOR = 0.50;
export async function retrieveFused(narrative, lexicalResults, topK = 5, weights = { sem: 0.55, lex: 0.45 }) {
    const statutes = getLoadedStatutes();
    const byId = new Map(statutes.map((s) => [s.id, s]));
    const semTop = await retrieveSemanticRaw(narrative, 30);
    const semMap = new Map(semTop.map((r) => [r.id, r.cos]));
    const lexMax = Math.max(1, ...lexicalResults.map((r) => r.score || 0));
    const pool = new Map();
    for (const { id, cos } of semTop) {
        const st = byId.get(id);
        if (!st) continue;
        if (!isCuratedStatute(st) && cos < SEM_PLACEHOLDER_FLOOR) continue;
        pool.set(id, { id, cos, lex: null });
    }
    for (const r of lexicalResults) {
        const id = r.statute.id;
        if (!pool.has(id)) pool.set(id, { id, cos: semMap.get(id) ?? null, lex: r });
        else pool.get(id).lex = r;
    }
    const ranked = [];
    for (const entry of pool.values()) {
        const statute = byId.get(entry.id);
        if (!statute) continue;
        // lexical norm: best of relative (fair when the whole query is weak) and
        // absolute-anchored (score 14 ~= certain hit), so lone weak-but-only signals
        // keep their confidence instead of collapsing to low.
        const lexN = entry.lex ? Math.max((entry.lex.score || 0) / lexMax, Math.min(1, (entry.lex.score || 0) / 14)) : null;
        const semN = entry.cos === null ? null : (entry.cos * 0.5 + 0.5);
        let combined;
        if (lexN !== null && semN !== null) combined = weights.sem * semN + weights.lex * lexN;
        else if (lexN !== null) combined = lexN;
        else combined = weights.sem * semN;
        const curated = isCuratedStatute(statute);
        if (curated) combined += 0.04;
        const origin = entry.lex && entry.cos !== null ? 'both' : entry.lex ? 'lexical' : 'semantic';
        ranked.push({ statute, combined, semCos: entry.cos, lex: entry.lex || null, curated, origin });
    }
    ranked.sort((a, b) => b.combined - a.combined);
    return ranked.slice(0, topK).map((r) => {
        const confidence = r.combined > 0.62 ? 'high' : r.combined > 0.52 ? 'medium' : 'low';
        return {
            statute: r.statute,
            score: +(r.combined * 10).toFixed(2),
            triggerHits: r.lex?.triggerHits ?? 0,
            confidence,
            semanticScore: r.semCos === null ? null : +r.semCos.toFixed(3),
            origin: r.origin,
            bhashiniBoost: !!r.lex?.bhashiniBoost,
            bhashiniConcepts: r.lex?.bhashiniConcepts || [],
            source: r.lex?.source || r.statute.source
        };
    });
}
