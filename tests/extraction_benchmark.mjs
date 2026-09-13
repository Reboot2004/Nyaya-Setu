// Nyaya-Setu extraction benchmark — 3 systems x 3 metrics.
//
// Systems:  (1) rule-based regex  (2) CPU NER (transformers.js)  (3) WebLLM (WebGPU)
// Metrics:  location accuracy / aggressor accuracy / category accuracy
//           (NER produces no category — reported as n/a).
//
// Gold labels are HUMAN truth, deliberately NOT fitted to the implementation —
// a miss is a finding, not a failure. Exit code is always 0 (measurement, not gate).
//
// Usage:
//   node tests/extraction_benchmark.mjs            # rule + NER (60s load budget) + combined
//   node tests/extraction_benchmark.mjs --skip-ner # rules only (offline, fast)
//   NER_BUDGET_MS=120000 node tests/extraction_benchmark.mjs
//
// NOTE: the LLM column needs WebGPU (browser). In Node it reports SKIPPED with
// the reason; run the same gold set in the browser console to fill that column.
import { extractEntitiesRuleBased, extractEntities, isWebGPUSupported } from '../src/llm.js';
import { extractEntitiesNER, mapNerEntities } from '../src/ner.js';
import { CASES } from './gold_cases.mjs';

const SKIP_NER = process.argv.includes('--skip-ner');
const NER_BUDGET_MS = Number(process.env.NER_BUDGET_MS || 60000);

// Mock model outputs → NER post-processing (mapNerEntities). Always runs offline:
// measures whether the shared possessive guard + score floor + tag mapping work,
// independent of model download.
const NER_MOCK_CASES = [
    { narrative: 'Near the bus stop, Ramu hit me', modelOut: [{ entity_group: 'LOC', word: 'bus stop', score: 0.91 }, { entity_group: 'PER', word: 'Ramu', score: 0.96 }], gold: { location: 'bus stop', aggressor: 'Ramu' } },
    { narrative: 'my village sarpanch election', modelOut: [{ entity_group: 'LOC', word: 'village', score: 0.88 }], gold: { location: null, aggressor: null } },
    { narrative: 'मेरे गांव में चोरी', modelOut: [{ entity_group: 'LOC', word: 'गांव', score: 0.85 }], gold: { location: null, aggressor: null } },
    { narrative: 'Ramu hit me', modelOut: [{ entity_group: 'PER', word: 'Ramu', score: 0.31 }], gold: { location: null, aggressor: null } },
    { narrative: 'मंदिर में चोरी हुई', modelOut: [{ entity_group: 'LOC', word: 'मंदिर', score: 0.8 }], gold: { location: 'मंदिर', aggressor: null } },
    { narrative: 'nothing happened', modelOut: [], gold: { location: null, aggressor: null } },
    // Regression: subword fragments must never leak into a draft (found live: 'ळे', 'தி', 'ட்டு').
    { narrative: 'शाळेत चोरी', modelOut: [{ entity_group: 'PER', word: 'ळे', score: 0.9 }], gold: { location: null, aggressor: null } },
    { narrative: 'Ramu hit me', modelOut: [{ entity_group: 'PER', word: '##mu', score: 0.9 }], gold: { location: null, aggressor: null } },
    { narrative: 'பள்ளியில் திருட்டு', modelOut: [{ entity_group: 'PER', word: 'ட்டு', score: 0.9 }], gold: { location: null, aggressor: null } }
];

// ---------------------------------------------------------------------------
// Scoring helpers
// ---------------------------------------------------------------------------
const norm = (s) => String(s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
const canon = (s) => {
    const n = norm(s);
    return (!n || n === 'unknown' || n === '—' || n === '-') ? 'unknown' : n;
};
const hit = (gold, pred) => (canon(gold) === canon(pred) ? 1 : 0);

function pct(n, d) {
    return d ? `${((100 * n) / d).toFixed(1)}%` : 'n/a';
}

const withTimeout = (p, ms, label) =>
    Promise.race([
        p,
        new Promise((_, rej) => setTimeout(() => rej(new Error(`${label} timed out after ${ms}ms`)), ms))
    ]);

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const ruleScore = { loc: 0, aggr: 0, cat: 0 };
const nerScore = { loc: 0, aggr: 0 };
const combScore = { loc: 0, aggr: 0, cat: 0 };
const misses = [];
let nerLive = false;
let nerNote = '';

if (!SKIP_NER) {
    try {
        await withTimeout((async () => { await (await import('../src/ner.js')).ensureNER(); })(), NER_BUDGET_MS, 'NER load');
        nerLive = true;
        nerNote = 'live model';
    } catch (err) {
        nerNote = `SKIPPED (${err.message})`;
    }
} else {
    nerNote = 'SKIPPED (--skip-ner)';
}

const llmAvailable = isWebGPUSupported();
const llmNote = llmAvailable ? 'live model' : 'SKIPPED (no WebGPU in this runtime — run gold set in browser to fill this column)';

for (const c of CASES) {
    const r = extractEntitiesRuleBased(c.text);
    ruleScore.loc += hit(c.gold.location, r.location);
    ruleScore.aggr += hit(c.gold.aggressor, r.aggressor);
    ruleScore.cat += hit(c.gold.category, r.category);

    let n = null;
    if (nerLive) {
        try {
            n = await withTimeout(extractEntitiesNER(c.text), 20000, `NER infer ${c.id}`);
            if (n) {
                nerScore.loc += hit(c.gold.location, n.location ?? 'unknown');
                nerScore.aggr += hit(c.gold.aggressor, n.aggressor ?? 'unknown');
            }
        } catch { n = { location: null, aggressor: null, _err: true }; }
    }

    // Combined = full pipeline (rule + NER supplement + LLM when present).
    const combined = await extractEntities(c.text, { ner: nerLive });
    combScore.loc += hit(c.gold.location, combined.location);
    combScore.aggr += hit(c.gold.aggressor, combined.aggressor);
    combScore.cat += hit(c.gold.category, combined.category);

    const rl = hit(c.gold.location, r.location), ra = hit(c.gold.aggressor, r.aggressor), rc = hit(c.gold.category, r.category);
    if (!(rl && ra && rc)) {
        misses.push(
            `${c.id} [${c.lang}] loc gold=${canon(c.gold.location)} rule=${canon(r.location)}` +
            (nerLive && n ? ` ner=${canon(n.location ?? 'unknown')}` : '') +
            ` | aggr gold=${canon(c.gold.aggressor)} rule=${canon(r.aggressor)}` +
            (nerLive && n ? ` ner=${canon(n.aggressor ?? 'unknown')}` : '') +
            ` | cat gold=${c.gold.category} rule=${r.category}`
        );
    }
}

// NER post-processing on mock outputs (offline, always runs)
let mockOk = 0;
for (const m of NER_MOCK_CASES) {
    const out = mapNerEntities(m.modelOut, m.narrative);
    if (canon(out.location ?? 'unknown') === canon(m.gold.location ?? 'unknown') &&
        canon(out.aggressor ?? 'unknown') === canon(m.gold.aggressor ?? 'unknown')) mockOk++;
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
const N = CASES.length;
const row = (name, l, a, c, note = '') =>
    `${name.padEnd(28)} loc ${String(l).padEnd(8)} aggr ${String(a).padEnd(8)} cat ${String(c).padEnd(8)} ${note}`;

console.log('════════════════════════════════════════════════════════════════════');
console.log(`EXTRACTION BENCHMARK: ${N} gold cases (human truth, 8 languages)`);
console.log('════════════════════════════════════════════════════════════════════');
console.log(row('rule-based', pct(ruleScore.loc, N), pct(ruleScore.aggr, N), pct(ruleScore.cat, N),
    `(${ruleScore.loc}/${ruleScore.aggr}/${ruleScore.cat} of ${N})`));
console.log(row('NER (live model)', nerLive ? pct(nerScore.loc, N) : 'SKIPPED', nerLive ? pct(nerScore.aggr, N) : 'SKIPPED', 'n/a', nerNote));
console.log(row('LLM (WebGPU)', 'SKIPPED', 'SKIPPED', 'SKIPPED', llmNote));
console.log(row('combined pipeline', pct(combScore.loc, N), pct(combScore.aggr, N), pct(combScore.cat, N),
    `(${combScore.loc}/${combScore.aggr}/${combScore.cat} of ${N}, src varies)`));
console.log(row('NER post-proc (mock outs)', pct(mockOk, NER_MOCK_CASES.length), '—', '—',
    `(${mockOk}/${NER_MOCK_CASES.length} offline)`));
console.log('────────────────────────────────────────────────────────────');
console.log('MISSES (gold vs rule — each is a finding, not a failure):');
for (const m of misses) console.log('  • ' + m);
console.log('════════════════════════════════════════════════════════════════════');

process.exit(0);
