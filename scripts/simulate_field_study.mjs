// Simulated field study — automation stand-in for kiosk sessions (item 3).
// Drives the REAL pipeline (rule extraction + lexical gate + fused rank + template
// draft) as scripted personas with realistic perturbations (typos, caps, truncation,
// romanized input), timing every stage. Output matches the dev-panel study CSV
// schema so simulated rows and (later) real field rows are directly comparable.
//
// HONEST LABELING: rows carry origin:'simulated'. This measures machine-side
// pipeline time on THIS hardware — it does NOT replace human usability sessions.
// Run: npm run study  (or: node scripts/simulate_field_study.mjs)
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { performance } from 'perf_hooks';
import { extractEntitiesRuleBased, draftComplaint } from '../src/llm.js';
import { retrieveSections } from '../src/retrieval.js';
import { screenInput } from '../src/safety.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MANUAL = { days: 2.5, rupees: 1000 };

// Personas: { id, desc, lang, narratives[] } — drawn from real complaint shapes.
const PERSONAS = [
    {
        id: 'hi-wage-worker', desc: 'Hindi-speaking wage worker, kiosk-assisted',
        lang: 'hi',
        narratives: [
            'मालिक ने तीन महीने की मजदूरी नहीं दी, 15000 रुपये रोक लिए हैं।',
            'मेरे पड़ोसी ने मुझे धमकी दी कि अगर मैंने उनसे पैसे नहीं दिए तो वह मेरा घर जला देंगे।',
            'उसने कहा जान से मार दूंगा, घर जला दूंगा।',
        ],
    },
    {
        id: 'te-farmer', desc: 'Telugu-speaking farmer, types slowly (short inputs)',
        lang: 'te',
        narratives: [
            'నా జీతం మూడు నెలలుగా ఇవ్వలేదు, డబ్బులు కాజేశారు.',
            'నా వారు అందరూ నన్ను చెడ్డ పదాలతో అసహ్యం చెప్పారు.',
            'Ramu nannu kottadu, nenu hospital ki vellanu.',
        ],
    },
    {
        id: 'ta-student', desc: 'Tamil-speaking student, smartphone user',
        lang: 'ta',
        narratives: [
            'என்னை அடித்தார்கள், ரத்தம் வந்தது. மருத்துவமனை சென்றேன்.',
            'எனக்கு கொலை மிரட்டல் விடுத்தார்.',
            'என்னை ஒருவன் பின்தொடர்ந்து ஈவ்டீசிங் செய்கிறான்.',
        ],
    },
    {
        id: 'en-kiosk-operator', desc: 'Kiosk operator typing fast (typos, caps, long narratives)',
        lang: 'en',
        narratives: [
            'Last Tuesday around 2 PM, Mohan Singh beat me badly with a lathi outside the market.',
            'HE THREATENED TO KILL MY WHOLE FAMILY WITH A KNIFE.',
            'My husband beat me with a rod and says he will kill me tonight. I am hiding at my mother house.',
            'On 5th January, around 9 in the morning, Ramesh came to my house with two unknown men. They abused me, pushed me, hit me with sticks, and threatened to burn my house if I go to the police.',
        ],
    },
    {
        id: 'bn-mr-kn-ml-mixed', desc: 'Mixed-language citizens (bn/mr/kn/ml, one case each)',
        lang: 'mixed',
        narratives: [
            'আমাকে খুনের হুমকি দিয়েছে। ভয় দেখিয়েছে।',
            'माझी चोरी झाली. पैसे चोरून नेले.',
            'ನನ್ನನ್ನು ಹೊಡೆದರು, ರಕ್ತ ಬಂತು.',
            'എന്നെ ഭീഷണിപ്പെടുത്തി, കൊല്ലുമെന്ന് പറഞ്ഞു.',
        ],
    },
];

// Perturbations simulating real input noise. Applied per-run, deterministically.
function perturb(text, variant) {
    if (variant === 'as-typed') return text;
    if (variant === 'lowercased') return text.toLowerCase();
    if (variant === 'truncated-20w') return text.split(/\s+/).slice(0, 20).join(' ');
    if (variant === 'typos-5pct') {
        // deterministic pseudo-typos: swap a char in every ~20th word
        return text.split(' ').map((w, i) => {
            if (i % 7 === 3 && w.length > 5) return w.slice(0, 2) + w.slice(3, 4) + w.slice(2, 3) + w.slice(4);
            return w;
        }).join(' ');
    }
    return text;
}
const VARIANTS = ['as-typed', 'lowercased', 'truncated-20w', 'typos-5pct'];

let fused = null;
let fusedAvailable = false;
try {
    const sem = await import('../src/semantic.js');
    await sem.ensureSemantic();
    fused = sem.retrieveFused;
    fusedAvailable = true;
} catch (err) {
    console.log(`Semantic unavailable (${err?.message}); lexical-only timing.\n`);
}

const rows = [];
const machine = `${os.cpus()[0]?.model || 'unknown'} x${os.cpus().length}, ${(os.totalmem() / 1073741824).toFixed(1)}GB RAM`;

for (const persona of PERSONAS) {
    for (const base of persona.narratives) {
        for (const variant of VARIANTS) {
            const narrative = perturb(base, variant);
            if (narrative.trim().length < 15) continue;
            const t0 = performance.now();
            const safety = screenInput(narrative);
            const tEntities0 = performance.now();
            const entities = extractEntitiesRuleBased(narrative);
            const tEntities1 = performance.now();
            const gatePreview = retrieveSections(narrative, 2);
            const tGate = performance.now();
            let retrieved = gatePreview;
            let origin = 'lexical';
            if (fusedAvailable && safety.ok) {
                try {
                    retrieved = await fused(narrative, retrieveSections(narrative, 25), 5);
                    origin = 'fused';
                } catch { /* keep lexical */ }
            }
            const tRet = performance.now();
            let sections = 0;
            if (safety.ok) {
                const strong = retrieved.filter((r) => r.confidence === 'high' || r.confidence === 'medium');
                const draftList = (strong.length ? strong : retrieved.slice(0, 2)).slice(0, 3);
                const draft = await draftComplaint(
                    { name: '', parent: '', phone: '', address: '', station: '', accused: '', location: '', date: '', narrative },
                    entities, draftList, persona.lang === 'mixed' ? 'en' : persona.lang, {}
                );
                sections = draftList.length;
                if (!draft.english || draft.english.length < 100) throw new Error('draft too short');
            }
            const t1 = performance.now();
            const totalSec = (t1 - t0) / 1000;
            const unknowns = ['complainantName', 'parentName', 'aggressor', 'date', 'location']
                .filter((k) => !entities[k] || entities[k] === 'unknown').length;
            rows.push({
                ts: new Date().toISOString(),
                origin: 'simulated',
                machine: process.env.NYAYA_MACHINE || 'dev-machine',
                persona: persona.id,
                variant,
                lang: persona.lang,
                narrativeChars: narrative.length,
                entitiesMs: +((tEntities1 - tEntities0).toFixed(1)),
                retrievalMs: +((tRet - tGate).toFixed(1)),
                rankOrigin: origin,
                totalSec: +totalSec.toFixed(2),
                sections,
                accepted: safety.ok,
                entityUnknowns: unknowns,
                baselineDays: MANUAL.days,
                baselineRupees: MANUAL.rupees,
                savedDays: +(MANUAL.days - totalSec / 86400).toFixed(2),
                savedRupees: MANUAL.rupees,
            });
        }
    }
}

const outCsv = path.join(__dirname, '..', 'data', 'field_study_simulated.csv');
const head = Object.keys(rows[0]);
const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
fs.writeFileSync(outCsv, [head.join(',')].concat(rows.map((r) => head.map((h) => esc(r[h])).join(','))).join('\n'));
console.log(`Wrote ${outCsv} (${rows.length} simulated runs)`);

// Summary by persona
const byPersona = {};
for (const r of rows) {
    (byPersona[r.persona] = byPersona[r.persona] || []).push(r.totalSec);
}
console.log('\n=== Simulated field study (AUTOMATION — not human sessions) ===');
console.log(`Machine: ${machine}`);
for (const [p, secs] of Object.entries(byPersona)) {
    secs.sort((a, b) => a - b);
    const med = secs[Math.floor(secs.length / 2)];
    console.log(`  ${p}: n=${secs.length} median=${med.toFixed(2)}s max=${secs[secs.length - 1].toFixed(2)}s`);
}
const all = rows.map((r) => r.totalSec).sort((a, b) => a - b);
console.log(`Overall median pipeline: ${all[Math.floor(all.length / 2)].toFixed(2)}s vs manual baseline ${MANUAL.days} days + ₹${MANUAL.rupees}`);
console.log(`Accepted: ${rows.filter((r) => r.accepted).length}/${rows.length} | Avg unknowns/draft: ${(rows.reduce((a, r) => a + r.entityUnknowns, 0) / rows.length).toFixed(1)}`);
