// Parity tests for the on-site technique comparison (src/technique_compare.js).
// Offline: scoring core + rule column on the 8-case subset (no downloads —
// NER/LLM columns are exercised in the browser panel, not here).
import { COMPARE_CASES, COMPARE_IDS, scorePrediction } from '../src/technique_compare.js';
import { extractEntitiesRuleBased } from '../src/llm.js';

let pass = 0, fail = 0;
const ok = (cond, msg) => {
    if (cond) { pass++; /* console.log('  ok ' + msg); */ }
    else { fail++; console.log('  FAIL ' + msg); }
};

// 1. Subset integrity: 8 known ids, all present in the shared gold set.
ok(COMPARE_CASES.length === 8, 'compare set has 8 cases, got ' + COMPARE_CASES.length);
ok(COMPARE_IDS.every((id) => COMPARE_CASES.some((c) => c.id === id)), 'every COMPARE_ID resolves');
ok(COMPARE_CASES.every((c) => c.gold && typeof c.gold.location === 'string' && typeof c.gold.aggressor === 'string' && typeof c.gold.category === 'string'), 'golds well-formed');

// 2. Scoring semantics match tests/extraction_benchmark.mjs.
ok(scorePrediction({ location: 'bus stop', aggressor: 'Ramu', category: 'assault' },
    { location: 'Bus Stop', aggressor: 'ramu', category: 'assault' }).loc, 'case-insensitive loc');
ok(!scorePrediction({ location: 'village', aggressor: 'x', category: 'y' },
    { location: 'unknown', aggressor: 'x', category: 'y' }).loc, 'unknown != real place');
ok(scorePrediction({ location: 'unknown', aggressor: 'unknown', category: 'intimidation' },
    { location: 'unknown', aggressor: '—', category: 'intimidation' }).aggr, 'dash counts as unknown');
ok(!scorePrediction({ location: 'a', aggressor: 'b', category: 'assault' },
    { location: 'a', aggressor: 'b', category: 'intimidation' }).cat, 'category mismatch detected');

// 3. Rule column on the subset (regression anchor — update deliberately if rules change).
const totals = { loc: 0, aggr: 0, cat: 0 };
for (const c of COMPARE_CASES) {
    const s = scorePrediction(c.gold, extractEntitiesRuleBased(c.text));
    if (s.loc) totals.loc++;
    if (s.aggr) totals.aggr++;
    if (s.cat) totals.cat++;
}
ok(totals.loc === 8 && totals.aggr === 8 && totals.cat === 8,
    `rule totals 8/8/8 on subset, got ${totals.loc}/${totals.aggr}/${totals.cat}`);

console.log(`TECHNIQUE COMPARE TESTS: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
