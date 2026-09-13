// Browser full-pipeline harness — runs EVERYTHING (not just extraction) inside
// real Chromium: safety gate → extraction (rule+NER live) → fused retrieval
// (real MiniLM wasm embeddings) → draft → CPGRAMS, across all 8 languages.
//
// The WebGPU LLM is skipped automatically when no adapter exists (this sandbox
// has no GPU/SwiftShader); every other layer runs for real, including model
// downloads cached in the Playwright profile dir.
//
// Usage:
//   node tests/browser_full.mjs [base] [--profile DIR] [--from N] [--to M] [--out results.json]
//   base defaults to http://localhost:5174 (pass a number for a localhost port,
//   or a full URL such as the Vercel deployment to test the DEPLOYED build,
//   not just local source).
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import { CASES } from '../data/gold_cases.mjs';

const firstArg = process.argv[2] || '5174';
const BASE = /^\d+$/.test(firstArg) ? `http://localhost:${firstArg}` : firstArg.replace(/\/$/, '');
const arg = (k, d = null) => {
    const i = process.argv.indexOf(k);
    return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d;
};
const PROFILE = arg('--profile', 'C:\\Users\\Harsha\\AppData\\Local\\Temp\\opencode\\chrome-nyaya-profile');
const FROM = Number(arg('--from', 0));
const TO = Number(arg('--to', CASES.length));
const OUT = arg('--out', null);
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const SUBJ_WORDS = {
    en: ['Physical Assault', 'Criminal Intimidation', 'Property Fraud', 'Against Woman', 'Police Procedure'],
    hi: ['हमले', 'धमकी', 'धोखाधड़ी', 'महिला', 'प्रक्रिया'],
    te: ['దాడి', 'బెదిరింపు', 'మోసం', 'మహిళ', 'విధానం'],
    ta: ['தாக்குதல்', 'மிரட்டல்', 'மோசடி', 'பெண்', 'நடைமுறை'],
    bn: ['আক্রমণ', 'হুমকি', 'প্রতারণা', 'নারী', 'প্রক্রিয়া'],
    mr: ['हल्ला', 'धमकी', 'फसवणुक', 'महिला', 'प्रक्रिया'],
    kn: ['ಹಲ್ಲೆ', 'ಬೆದರಿಕೆ', 'ವಂಚನೆ', 'ಮಹಿಳೆ', 'ಪ್ರಕ್ರಿಯೆ'],
    ml: ['ആക്രമണം', 'ഭീഷണി', 'വഞ്ചന', 'തട്ടിപ്പ്', 'സ്ത്രീ', 'നടപടി']
};
const PLACE_LABEL = { en: 'Place of incident', hi: 'घटनास्थल', te: 'సంఘటనా స్థలం', ta: 'சம்பவ இடம்', bn: 'ঘটনাস্থল', mr: 'घटनास्थळ', kn: 'ಘಟನಾ ಸ್ಥಳ', ml: 'സംഭവ സ്ഥലം' };
const DOOM = ['unknown', 'not provided', 'उपलब्ध नहीं', 'అందుబాటులో లేదు', 'கிடைக்கவில்லை', 'পাওয়া যায়নি', 'उपलब्ध नाही', 'ಲಭ್ಯವಿಲ್ಲ', 'ലഭ്യമല്ല'];
const norm = (s) => String(s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
const canon = (s) => { const n = norm(s); return (!n || n === 'unknown' || n === '—' || n === '-') ? 'unknown' : n; };

const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-webgpu', '--use-angle=swiftshader']
});
const ctx = await browser.newContext({ serviceWorkers: 'block' });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('[pageerror]', String(e).split('\n')[0].slice(0, 160)));
await page.goto(`${BASE}/`, { waitUntil: 'load', timeout: 60000 });
console.log('page loaded:', page.url());

// ---- warmup: embeddings + NER (real downloads, cached in profile) ----
const warm = await page.evaluate(async (base) => {
    const out = {};
    try {
        const sem = await import(base + '/src/semantic.js');
        const t0 = performance.now();
        await sem.ensureSemantic();
        out.semantic = { ok: true, ms: Math.round(performance.now() - t0), ...sem.getSemanticStatus() };
    } catch (e) { out.semantic = { ok: false, err: String(e).slice(0, 160) }; }
    try {
        const ner = await import(base + '/src/ner.js');
        const t0 = performance.now();
        await ner.ensureNER();
        out.ner = { ok: true, ms: Math.round(performance.now() - t0), ...ner.getNERStatus() };
    } catch (e) { out.ner = { ok: false, err: String(e).slice(0, 160) }; }
    try {
        const llm = await import(base + '/src/llm.js');
        out.webgpu = llm.isWebGPUSupported();
        out.webgpuAdapter = ('gpu' in navigator) ? !!(await navigator.gpu.requestAdapter().catch(() => null)) : false;
    } catch (e) { out.webgpu = 'import-fail'; }
    return out;
}, BASE);
console.log('warmup:', JSON.stringify(warm));

// ---- per-case full pipeline ----
const results = [];
for (const c of CASES.slice(FROM, TO)) {
    try {
        const r = await page.evaluate(async ({ base, c }) => {
            const llm = await import(base + '/src/llm.js');
            const ret = await import(base + '/src/retrieval.js');
            const sem = await import(base + '/src/semantic.js');
            const actm = await import(base + '/src/main_is_actionable.js');
            const emgm = await import(base + '/src/emergency.js');
            const cpm = await import(base + '/src/cpgrams.js');
            const t0 = performance.now();
            const entities = await llm.extractEntities(c.text);
            const lex = await ret.retrieveSections(c.text, 25);
            let fused = null, semErr = null, semOn = false;
            try {
                fused = await sem.retrieveFused(c.text, lex, 10);
                semOn = Array.isArray(fused) && fused.some((x) => x.origin === 'both' || x.origin === 'semantic');
            } catch (e) { semErr = String(e).slice(0, 100); }
            const retrievedAll = (Array.isArray(fused) && fused.length) ? fused : lex.slice(0, 10);
            const retrieved = retrievedAll.filter((x) => x.confidence !== 'low').slice(0, 5);
            const actionable = actm.isActionableComplaint(c.text, entities, lex.slice(0, 3));
            let emergency = false;
            try { emergency = !!emgm.detectEmergency(c.text).emergency; } catch {}
            const draft = await llm.draftComplaint(
                { name: '', parent: '', phone: '', accused: '', date: '', narrative: c.text },
                entities, retrieved, c.lang);
            const native = draft.native || draft.english || '';
            let cp = null, cpErr = null;
            try { cp = cpm.toCPGRAMSSchema({ narrative: c.text }, entities, retrieved, c.lang); }
            catch (e) { cpErr = String(e).slice(0, 100); }
            return {
                id: c.id, ms: Math.round(performance.now() - t0),
                entities: { location: entities.location, aggressor: entities.aggressor, category: entities.category, src: entities.extractionSource || 'rule' },
                lexTop: lex.slice(0, 3).map((x) => `${x.statute.code}-${x.statute.section}(${x.confidence || '?'})`),
                fusedTop: retrievedAll.slice(0, 3).map((x) => `${x.statute.code}-${x.statute.section}(${x.confidence || '?'}/${x.origin || '?'})`),
                retrieved: retrieved.map((x) => ({ code: x.statute.code, section: String(x.statute.section), conf: x.confidence, origin: x.origin || null })),
                actionable, emergency, semOn, semErr,
                draftText: native.slice(0, 5000), cp, cpErr
            };
        }, { base: BASE, c: { id: c.id, text: c.text, lang: c.lang } }, { timeout: 180000 });

        // ---- node-side scoring ----
        const g = c.gold;
        const extOk = { loc: canon(r.entities.location) === canon(g.location), aggr: canon(r.entities.aggressor) === canon(g.aggressor), cat: norm(r.entities.category) === norm(g.category) };
        const retOk = r.retrieved.length > 0 && r.retrieved.every((x) => x.code && x.section && ['high', 'medium', 'low'].includes(x.conf));
        const subjLine = (r.draftText.split('\n').find((l) => /subject|विषय|విషయం|பொருள்|বিষয়|ವಿಷಯ|വിഷയം/i.test(l)) || '').trim();
        const subjOk = (SUBJ_WORDS[c.lang] || []).some((w) => subjLine.includes(w));
        const doomHit = DOOM.find((d) => r.draftText.toLowerCase().includes(d.toLowerCase()));
        const placeRe = new RegExp(`${PLACE_LABEL[c.lang]}\\s*:?\\s*—`);
        const placeOk = canon(g.location) === 'unknown' ? placeRe.test(r.draftText) : r.draftText.includes(g.location);
        const secOk = r.retrieved.length === 0 || r.draftText.includes(`${r.retrieved[0].code}`) && r.draftText.includes(`${r.retrieved[0].section}`);
        const cpStr = r.cp ? JSON.stringify(r.cp) : '';
        const cpOk = !!r.cp && !/unknown/i.test(cpStr);
        results.push({ id: c.id, lang: c.lang, ms: r.ms, src: r.entities.src, extOk, retOk, retN: r.retrieved.length, semOn: r.semOn, semErr: r.semErr, lexTop: r.lexTop, fusedTop: r.fusedTop, actionable: r.actionable, emergency: r.emergency, subjOk, subjLine: subjLine.slice(0, 90), doomHit: doomHit || null, placeOk, secOk, cpOk, cpErr: r.cpErr });
        const flags = [extOk.loc && extOk.aggr && extOk.cat ? '' : ' EXT', retOk ? '' : ' RET', subjOk ? '' : ' SUBJ', doomHit ? ' DOOM!' : '', placeOk ? '' : ' PLACE', secOk ? '' : ' SEC', r.actionable ? '' : ' GATE', cpOk ? '' : ' CPGRAMS'].join('');
        console.log(`${c.id} [${c.lang}] ${r.ms}ms src=${r.entities.src} sem=${r.semOn ? 'on' : 'off'} top=${r.fusedTop.join(' ')}${flags}`);
    } catch (e) {
        results.push({ id: c.id, lang: c.lang, error: String(e).split('\n')[0].slice(0, 200) });
        console.log(`${c.id} [${c.lang}] ERROR ${String(e).split('\n')[0].slice(0, 120)}`);
    }
}

const ok = results.filter((r) => !r.error);
const N = ok.length;
const pct = (n) => (N ? (100 * n / N).toFixed(1) + '%' : 'n/a');
console.log('════════════════════════════════════════════════════════════');
console.log(`BROWSER FULL-PIPELINE: ${N}/${results.length} cases completed`);
console.log(`extract  loc ${pct(ok.filter((r) => r.extOk.loc).length)}  aggr ${pct(ok.filter((r) => r.extOk.aggr).length)}  cat ${pct(ok.filter((r) => r.extOk.cat).length)}`);
console.log(`retrieval schema-ok ${pct(ok.filter((r) => r.retOk).length)}  semantic-fused ${pct(ok.filter((r) => r.semOn).length)}  gate-pass ${pct(ok.filter((r) => r.actionable).length)}`);
console.log(`draft  dynamic-subject ${pct(ok.filter((r) => r.subjOk).length)}  no-doom ${pct(ok.filter((r) => !r.doomHit).length)}  place ${pct(ok.filter((r) => r.placeOk).length)}  sections ${pct(ok.filter((r) => r.secOk).length)}`);
console.log(`cpgrams-ok ${pct(ok.filter((r) => r.cpOk).length)}  avg ${Math.round(ok.reduce((s, r) => s + (r.ms || 0), 0) / Math.max(1, N))}ms/case`);
console.log('════════════════════════════════════════════════════════════');
if (OUT) { fs.writeFileSync(OUT, JSON.stringify({ warmup: warm, results }, null, 1)); console.log('wrote', OUT); }
await browser.close();
console.log('BROWSER FULL DONE');
