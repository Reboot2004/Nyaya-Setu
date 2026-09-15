// Parity tests for the on-site technique comparison (src/technique_compare.js).
// Offline: scoring core + rule column on the 8-case subset (no downloads —
// NER/LLM columns are exercised in the browser panel, not here).
import { COMPARE_CASES, COMPARE_IDS, scorePrediction } from '../src/technique_compare.js';
import { extractEntitiesRuleBased, applyLLMEntities } from '../src/llm.js';
import { groundedSpan } from '../src/shared_sanitize.js';

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

// 4. groundedSpan: quote-from-text or nothing.
ok(groundedSpan('Near the bus stop, Ramu hit me', 'bus stop') === 'bus stop', 'quoted span accepted');
ok(groundedSpan('Ramu and Shyam beat me', 'village') === null, 'invented place rejected');
ok(groundedSpan('anything', 'unknown') === null, 'unknown rejected');
ok(groundedSpan('anything', '') === null, 'empty rejected');

// 5. applyLLMEntities: gap-fill only — rules stand, models quote or lose.
{
    const rule = extractEntitiesRuleBased('Near the bus stop, Ramu hit me'); // loc bus stop, aggr Ramu
    const out = applyLLMEntities('Near the bus stop, Ramu hit me', rule,
        { location: 'bus stand', aggressor: 'Mohan', category: 'intimidation' });
    ok(out.location === rule.location && out.aggressor === rule.aggressor && out.category === rule.category,
        'known rule values survive a disagreeing model');
}
{
    // E04 from the device screenshot: model invented a location for a text with none.
    const text = 'Ramu and Shyam beat me';
    const rule = extractEntitiesRuleBased(text);
    const out = applyLLMEntities(text, rule, { location: 'village', aggressor: 'Ramu', category: 'assault' });
    ok(out.location === 'unknown', 'invented location cannot fill an unknown slot, got ' + out.location);
    ok(out.aggressor === 'Ramu and Shyam', 'rule aggressor kept');
}
{
    // Genuine gap-fill: unknown slot + quoted + valid span is accepted.
    const text = 'Ramu hit me near the bus stop';
    const rule = { ...extractEntitiesRuleBased(text), location: 'unknown' };
    const out = applyLLMEntities(text, rule, { location: 'bus stop' });
    ok(out.location === 'bus stop', 'quoted valid span fills unknown, got ' + out.location);
}
{
    // Quoted but possessive: "my village" is in the text yet still not a place.
    const text = 'I was going to vote for my village sarpanch but strangers threatened me';
    const rule = { ...extractEntitiesRuleBased(text), location: 'unknown' };
    const out = applyLLMEntities(text, rule, { location: 'village' });
    ok(out.location === 'unknown', 'possessive rejected even when quoted, got ' + out.location);
}
{
    // Category: rule stands unless it abstained.
    const r1 = applyLLMEntities('Ramu hit me', { ...extractEntitiesRuleBased('Ramu hit me'), category: 'assault' }, { category: 'intimidation' });
    ok(r1.category === 'assault', 'rule category kept');
    const r2 = applyLLMEntities('blah blah nothing', { ...extractEntitiesRuleBased('blah blah nothing'), category: 'needs_human_review' }, { category: 'intimidation' });
    ok(r2.category === 'intimidation', 'abstained rule takes valid model category, got ' + r2.category);
    const r3 = applyLLMEntities('blah blah nothing', { ...extractEntitiesRuleBased('blah blah nothing'), category: 'needs_human_review' }, {});
    ok(r3.category === 'needs_human_review', 'garbage model output falls back');
}

console.log(`TECHNIQUE COMPARE TESTS: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
