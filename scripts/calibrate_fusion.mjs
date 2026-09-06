// Calibrate fused retrieval thresholds against the eval dataset.
// Run: node scripts/calibrate_fusion.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { retrieveSections } from '../src/retrieval.js';
import { retrieveFused, ensureSemantic } from '../src/semantic.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataset = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'tests', 'evaluation_dataset.json'), 'utf-8'));

await ensureSemantic();
console.log('semantic engine ready');
for (const tc of dataset.test_cases) {
    const lex = retrieveSections(tc.narrative, 25);
    const fused = await retrieveFused(tc.narrative, lex, 5);
    const got = fused.map((r) => `${r.statute.code}-${r.statute.section}(${r.confidence},${r.origin},${r.semanticScore})`).join(' | ') || 'none';
    const exp = tc.expected_sections.join(',') || 'NONE';
    const hit = tc.expected_sections.length === 0
        ? (fused.every((r) => r.confidence === 'low') ? 'ok-empty' : 'NOISY')
        : (tc.expected_sections.every((s) => fused.some((r) => `${r.statute.code}-${r.statute.section}` === s)) ? 'HIT' : 'MISS');
    console.log(`[${tc.id}] exp:${exp} -> ${got} :: ${hit}`);
}
