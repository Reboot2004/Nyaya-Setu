// Mine data/samanantar_sample.json for dialect-phrase candidates per lexicon concept.
// Prints tgt-side phrases where the EN side matches a canonical's English terms.
// Reviewer vets output before merging into data/bhashini_lexicon.js (with provenance).
// Run: node scripts/mine_samanantar.mjs [concept]
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { BHASHINI_COLLOQUIAL_LEXICON } from '../data/bhashini_lexicon.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sample = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'samanantar_sample.json'), 'utf-8'));
const only = process.argv[2];

for (const entry of BHASHINI_COLLOQUIAL_LEXICON) {
    if (only && entry.canonical !== only) continue;
    const enTerms = (entry.terms.en || []).map((t) => t.toLowerCase());
    const seen = new Map();
    for (const p of sample.pairs) {
        const el = p.en.toLowerCase();
        if (enTerms.some((t) => t.length >= 4 && el.includes(t))) {
            const key = `${p.lang} :: ${p.text}`;
            if (!seen.has(key)) seen.set(key, p.en);
        }
    }
    console.log(`\n### ${entry.canonical} -> [${entry.targetSections.join(',')}] (${seen.size} candidates)`);
    for (const [k, en] of [...seen.entries()].slice(0, 12)) {
        console.log(`  [${k}]  <= "${en.slice(0, 80)}"`);
    }
}
