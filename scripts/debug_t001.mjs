import { retrieveSections } from '../src/retrieval.js';
import { retrieveFused, ensureSemantic } from '../src/semantic.js';
const n = 'Last Tuesday around 2 PM, Mohan Singh beat me badly with a lathi outside the market. He hit my head and I bled a lot. I had to go to the hospital and got 5 stitches.';
const lex = retrieveSections(n, 25);
console.log('LEX TOP:', lex.slice(0, 6).map((r) => `${r.statute.id} s=${r.score} c=${r.confidence}`).join(' | '));
await ensureSemantic();
const fused = await retrieveFused(n, lex, 5);
console.log('FUSED:', fused.map((r) => `${r.statute.id}(${r.confidence},${r.origin},sem=${r.semanticScore})`).join(' | '));
