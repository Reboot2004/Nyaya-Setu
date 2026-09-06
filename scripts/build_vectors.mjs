// Build-time: precompute multilingual MiniLM embeddings for all statutes.
// Run: node scripts/build_vectors.mjs
// Output: data/statute_vectors.json { model, dim, version, vectors: { "<CODE>-<sec>": [...] } }
// Vectors are L2-normalized float32 rounded to 4 decimals (~1.5-2MB for 892 statutes).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pipeline } from '@huggingface/transformers';
import { BASE_STATUTES, STATUTE_METADATA } from '../data/statutes.js';

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
console.log('Model ready. Embedding', BASE_STATUTES.length, 'statutes...');

const vectors = {};
let done = 0;
for (const s of BASE_STATUTES) {
    const text = `${s.code} Section ${s.section}: ${s.title}. ${s.text}. Keywords: ${(s.triggers || []).slice(0, 10).join(', ')}`;
    const out = await extractor(text, { pooling: 'mean', normalize: false });
    vectors[s.id] = l2norm(Array.from(out.data));
    if (++done % 100 === 0) console.log(`  ${done}/${BASE_STATUTES.length}`);
}

const dim = vectors[BASE_STATUTES[0].id].length;
fs.writeFileSync(OUT, JSON.stringify({ model: MODEL, dim, version: STATUTE_METADATA.version, count: BASE_STATUTES.length, vectors }));
console.log(`Wrote ${OUT} (${(fs.statSync(OUT).size / 1048576).toFixed(2)} MB, dim=${dim})`);
