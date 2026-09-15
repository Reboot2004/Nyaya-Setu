// Build-time: precompute multilingual MiniLM embeddings for all statutes.
// Run: node scripts/build_vectors.mjs
// Output: data/statute_vectors.json { model, dim, version, vectors: { "<CODE>-<sec>": [...] } }
// Vectors are L2-normalized float32 rounded to 4 decimals (~1.5-2MB for 892 statutes).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pipeline } from '@huggingface/transformers';
import { BASE_STATUTES, STATUTE_METADATA, getEnrichedStatutes } from '../data/statutes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODEL = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';
const OUT = path.join(__dirname, '..', 'data', 'statute_vectors.json');

function l2norm(arr) {
    let s = 0;
    for (const v of arr) s += v * v;
    const n = Math.sqrt(s) || 1;
    return arr.map((v) => Math.round((v / n) * 10000) / 10000);
}

console.log(`Loading embedding model ${MODEL} (downloads once, then cached)...`);
const extractor = await pipeline('feature-extraction', MODEL, { dtype: 'q8' });
// Embed the ENRICHED corpus (title keywords merged, placeholder boilerplate
// replaced by titles) so vectors encode substance, not boilerplate.
const CORPUS = getEnrichedStatutes(BASE_STATUTES);
console.log('Model ready. Embedding', CORPUS.length, 'statutes...');

const vectors = {};
let done = 0;
for (const s of CORPUS) {
    // Keywords first: the first 10 triggers feed the embedding, and for
    // enriched entries the derived title keywords must not be cut off behind
    // section-number triggers ("bns 330", ...). Curated entries keep their
    // hand-tuned order (enrichment skips them, so triggers are untouched).
    const kw = [...(s.triggers || [])].sort((a, b) => {
        const num = (t) => /^(bns|bnss|bsa)?\s*section\s*\d+|^(bns|bnss|bsa)\s*\d+|\u0927\u093E\u0930\u093E\s*\d+|\u0c38\u0c46\u0c15\u0ccd\u0c37\u0c28\u0ccd\s*\d+/i.test(String(t)) ? 1 : 0;
        return num(a) - num(b);
    });
    const text = `${s.code} Section ${s.section}: ${s.title}. ${s.text}. Keywords: ${kw.slice(0, 10).join(', ')}`;
    const out = await extractor(text, { pooling: 'mean', normalize: false });
    vectors[s.id] = l2norm(Array.from(out.data));
    if (++done % 100 === 0) console.log(`  ${done}/${CORPUS.length}`);
}

const dim = vectors[CORPUS[0].id].length;
fs.writeFileSync(OUT, JSON.stringify({ model: MODEL, dim, version: STATUTE_METADATA.version, count: CORPUS.length, vectors }));
console.log(`Wrote ${OUT} (${(fs.statSync(OUT).size / 1048576).toFixed(2)} MB, dim=${dim})`);
