// UI i18n parity: every visible string must exist in all 8 languages, demo
// samples must cover all 8 languages, and every element id wired in
// applyUiLanguage must exist in index.html (else a language silently keeps
// stale/English text — the exact bug class from the Telugu screenshot).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { UI_TEXT } from '../src/ui_translations.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const mainJs = fs.readFileSync(path.join(root, 'src', 'main.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

let pass = 0, fail = 0;
const ok = (cond, msg) => {
    if (cond) pass++;
    else { fail++; console.log('  FAIL ' + msg); }
};

// 1. Dictionary parity: all 8 langs carry every en key, non-empty.
const langs = Object.keys(UI_TEXT);
const base = Object.keys(UI_TEXT.en);
ok(langs.length === 8, '8 languages present, got ' + langs.length);
for (const l of langs) {
    const missing = base.filter((k) => !(k in UI_TEXT[l]));
    const empty = base.filter((k) => typeof UI_TEXT[l][k] !== 'string' || !UI_TEXT[l][k].trim());
    ok(!missing.length && !empty.length, `${l}: missing=[${missing.join(',')}] empty=[${empty.join(',')}]`);
}

// 2. Demo samples: one per language (source-text check; main.js is DOM-bound).
const sampleBlock = (mainJs.match(/const DEMO_SAMPLES = \{([\s\S]*?)\};/) || [])[1] || '';
for (const l of langs) {
    ok(new RegExp(`lang:\\s*'${l}'`).test(sampleBlock), `DEMO_SAMPLES has a '${l}' entry`);
}
for (const l of langs) {
    ok(html.includes(`data-sample=`) && new RegExp(`data-sample="[a-z]+-[a-z]+"`).test(html), 'sample buttons present');
}
const btnLangs = [...html.matchAll(/data-sample="([a-z]+)-/g)].map((m) => m[1]);
for (const l of langs) {
    ok(btnLangs.includes(l), `sample button for '${l}' present`);
}

// 3. applyUiLanguage wiring: every $('id') it touches must exist in index.html.
// Dynamic/conditional ids that legitimately live elsewhere are allowlisted.
const fnBody = (mainJs.match(/export function applyUiLanguage\(\) \{([\s\S]*?)\n\}/) || [])[1] || '';
const wiredIds = [...new Set([...fnBody.matchAll(/\$\('([A-Za-z]+)'\)/g)].map((m) => m[1]))];
const htmlIds = new Set([...html.matchAll(/id="([A-Za-z]+)"/g)].map((m) => m[1]));
const ALLOW = new Set(['rootHtml']); // documentElement alias, always present
const missingIds = wiredIds.filter((id) => !htmlIds.has(id) && !ALLOW.has(id));
ok(wiredIds.length > 30, `applyUiLanguage wires ${wiredIds.length} ids`);
ok(!missingIds.length, `wired ids missing from index.html: [${missingIds.join(',')}]`);

console.log(`UI I18N TESTS: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
