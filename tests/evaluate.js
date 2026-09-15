/**
 * Evaluation Framework for Nyaya-Setu Complaint Pipeline
 * Calls REAL pipeline functions (not mocks):
 * - extractEntitiesRuleBased() from src/llm.js
 * - retrieveSections() from src/retrieval.js (lexical + dialect-phrase lexicon)
 * - isActionableComplaint() from src/main_is_actionable.js (shared with the app)
 *
 * Usage: node tests/evaluate.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { retrieveSections } from '../src/retrieval.js';
import { extractEntitiesRuleBased } from '../src/llm.js';
import { screenInput } from '../src/safety.js';
import { isActionableComplaint } from '../src/main_is_actionable.js';

let fusedAvailable = false;
try {
    const sem = await import('../src/semantic.js');
    await sem.ensureSemantic();
    fusedAvailable = true;
} catch (err) {
    console.log(`Semantic engine unavailable in eval (${err?.message || err}); using lexical path.\n`);
}

async function retrieveFinalEval(narrative, topK = 5) {
    const lex = await retrieveSections(narrative, 25);
    if (!fusedAvailable) return lex.slice(0, topK);
    try {
        const { retrieveFused } = await import('../src/semantic.js');
        const fused = await retrieveFused(narrative, lex, topK);
        return (Array.isArray(fused) && fused.length) ? fused : lex.slice(0, topK);
    } catch {
        return lex.slice(0, topK);
    }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATASET_PATH = path.join(__dirname, 'evaluation_dataset.json');
const dataset = JSON.parse(fs.readFileSync(DATASET_PATH, 'utf-8'));

// Category families: dataset uses fine labels, extractor uses coarse taxonomy
const CATEGORY_FAMILY = {
    assault: ['assault', 'grievous_hurt', 'hurt', 'abuse_of_authority', 'physical_assault'],
    intimidation: ['intimidation', 'threat', 'defamation', 'insult', 'verbal_abuse'],
    property_fraud: ['property_fraud', 'property_crime', 'theft', 'fraud', 'cheating', 'extortion'],
    women_safety: ['women_safety', 'sexual_harassment', 'dowry', 'domestic_violence'],
    needs_human_review: ['needs_human_review', 'unknown', 'general_offence', 'procedure']
};
function categoryMatch(expected, actual) {
    if (!expected || !actual) return false;
    if (expected === actual) return true;
    for (const family of Object.values(CATEGORY_FAMILY)) {
        if (family.includes(expected) && family.includes(actual)) return true;
    }
    return false;
}

class EvaluationFramework {
    constructor(testCases) {
        this.testCases = testCases;
        this.results = [];
        this.metrics = { total: 0, passed: 0, failed: 0, entityRecall: [], sectionRecall: [], filteringAccuracy: [] };
    }
    evaluateEntityExtraction(expected, actual) {
        const matches = {
            // summary: fuzzy first-word overlap (synthetic summaries vary).
            // Golds are English gists, so score the English gist (summaryEn),
            // not the localized UI summary.
            summary: (() => {
                const actualSummary = actual.summaryEn || actual.summary;
                if (!expected.summary || !actualSummary) return false;
                const a = expected.summary.toLowerCase().split(/\s+/)[0];
                const b = actualSummary.toLowerCase();
                return b.includes(a) || expected.summary.toLowerCase().includes(b.split(/\s+/)[0]);
            })(),
            aggressor: actual.aggressor === expected.aggressor || (expected.aggressor !== 'unknown' && actual.aggressor.toLowerCase().includes(expected.aggressor.toLowerCase().split(' ')[0])) || (expected.aggressor === 'unknown' && actual.aggressor === 'unknown'),
            date: actual.date === expected.date || (expected.date !== 'unknown' && actual.date.toLowerCase().includes(String(expected.date).toLowerCase().split(' ')[0])) || (expected.date === 'unknown' && actual.date === 'unknown'),
            location: actual.location === expected.location || (expected.location !== 'unknown' && actual.location.toLowerCase().includes(String(expected.location).toLowerCase().split(' ')[0])) || (expected.location === 'unknown' && actual.location === 'unknown'),
            category: categoryMatch(expected.category, actual.category)
        };
        const recall = Object.values(matches).filter(Boolean).length / Object.keys(matches).length;
        return { matches, recall };
    }
    evaluateSectionRetrieval(expectedSections, retrievedSections) {
        if (expectedSections.length === 0) {
            return { precision: retrievedSections.length === 0 ? 1.0 : 0.0, recall: 1.0, f1: retrievedSections.length === 0 ? 1.0 : 0.0 };
        }
        const retrieved = retrievedSections.map((r) => `${r.statute.code}-${r.statute.section}`);
        const matches = expectedSections.filter((s) => retrieved.includes(s));
        const recall = matches.length / expectedSections.length;
        const precision = matches.length / Math.max(retrieved.length, 1);
        return { recall, precision, f1: 2 * (recall * precision) / (recall + precision + 0.0001) };
    }
    async evaluate() {
        console.log('\n=== Nyaya-Setu Evaluation (REAL pipeline, prototype-0.6) ===\n');
        console.log(`Running ${this.testCases.length} test cases...\n`);
        for (const tc of this.testCases) {
            this.metrics.total++;
            console.log(`\n[${tc.id}] ${tc.language.toUpperCase()} - expect:${tc.expected_entities.aggressor} / ${tc.expected_sections.join(', ') || 'NO STATUTE'}`);
            console.log(`  Narrative: "${tc.narrative.substring(0, 70)}..."`);
            // REAL calls (mirrors src/main.js exactly: safety -> entities -> lexical gate
            // preview (top 2) -> fused final rank (top 5) -> gate on LEXICAL preview)
            const safety = screenInput(tc.narrative);
            const actualEntities = extractEntitiesRuleBased(tc.narrative);
            const gatePreview = await retrieveSections(tc.narrative, 3);
            const retrieved = await retrieveFinalEval(tc.narrative, 5);
            const filterResult = safety.ok && isActionableComplaint(tc.narrative, actualEntities, gatePreview);
            if (!safety.ok) console.log(`  Safety blocked: ${safety.reasons.join(', ')}`);
            if (retrieved.some((r) => r.origin)) console.log(`  Origins: ${retrieved.map((r) => r.origin || '?').join(',')}`);
            console.log(`  Actual entities: aggressor=${actualEntities.aggressor} date=${actualEntities.date} loc=${actualEntities.location} cat=${actualEntities.category}`);
            console.log(`  Retrieved: ${retrieved.map((r) => `${r.statute.code}-${r.statute.section}(${r.confidence})`).join(', ') || 'none'}`);
            const entityEval = this.evaluateEntityExtraction(tc.expected_entities, actualEntities);
            this.metrics.entityRecall.push(entityEval.recall);
            console.log(`  Entity Recall: ${(entityEval.recall * 100).toFixed(0)}% ${JSON.stringify(entityEval.matches)}`);
            const sectionEval = this.evaluateSectionRetrieval(tc.expected_sections, retrieved);
            this.metrics.sectionRecall.push(sectionEval.recall);
            console.log(`  Section Recall: ${(sectionEval.recall * 100).toFixed(0)}% | P:${sectionEval.precision.toFixed(2)} F1:${sectionEval.f1.toFixed(2)}`);
            const filterOk = (tc.should_accept === filterResult) ? 1.0 : 0.0;
            this.metrics.filteringAccuracy.push(filterOk);
            console.log(`  ${filterOk ? 'PASS' : 'FAIL'} Actionability: expected=${tc.should_accept} got=${filterResult}`);
            if (filterOk === 1.0) this.metrics.passed++; else this.metrics.failed++;
        }
        this.printSummary();
    }
    printSummary() {
        const avg = (a) => (a.reduce((x, y) => x + y, 0) / Math.max(a.length, 1) * 100).toFixed(1);
        console.log('\n=== Evaluation Summary (REAL) ===\n');
        console.log(`Total: ${this.metrics.total} | Passed filtering: ${this.metrics.passed} | Failed: ${this.metrics.failed}`);
        console.log(`  Entity Extraction Recall: ${avg(this.metrics.entityRecall)}%`);
        console.log(`  Statute Retrieval Recall: ${avg(this.metrics.sectionRecall)}%`);
        console.log(`  Filtering Accuracy: ${avg(this.metrics.filteringAccuracy)}%`);
        console.log(`\nCorpus: 0.6-official-titles (1059 slots, 56 curated, 0 placeholders) | Retrieval: fused MiniLM+lexical+dialect-lexicon${fusedAvailable ? '' : ' (lexical-only fallback)'} | Extractor: rule-based`);
        console.log('Note: LLM WebGPU path not exercised in Node; rule engine is the offline fallback.\n');
    }
}

const testCases = dataset.test_cases;
const framework = new EvaluationFramework(testCases);
await framework.evaluate();
