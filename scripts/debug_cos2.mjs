import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pipeline } from '@huggingface/transformers';
import { BASE_STATUTES } from '../data/statutes.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const V = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'statute_vectors.json'), 'utf-8'));
const ex = await pipeline('feature-extraction', 'Xenova/paraphrase-multilingual-MiniLM-L12-v2', { dtype: 'q8', device: 'cpu' });
const norm = (a) => { let s = 0; for (const v of a) s += v * v; const n = Math.sqrt(s) || 1; return a.map((v) => v / n); };
const q = norm(Array.from((await ex('Last Tuesday around 2 PM, Mohan Singh beat me badly with a lathi outside the market. He hit my head and I bled a lot. I had to go to the hospital and got 5 stitches.', { pooling: 'mean', normalize: false })).data));
const cos = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };
for (const id of ['BNS-115', 'BNS-117', 'BNS-118']) {
    console.log(id, 'cos=', cos(q, V.vectors[id]).toFixed(3));
}
const s115 = BASE_STATUTES.find((s) => s.id === 'BNS-115');
console.log('115 embed source would be:', `${s115.code} Section ${s115.section}: ${s115.title}. ${s115.text}. Keywords: ${(s115.triggers || []).slice(0, 10).join(', ')}`.slice(0, 200));
