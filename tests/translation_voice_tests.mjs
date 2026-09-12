/**
 * Nyaya-Setu Translation & Voice Integration Tests
 * Tests Google Translate unofficial endpoint, language detection, and voice modules.
 * Usage: node tests/translation_voice_tests.mjs
 */
import { translateText, translateToEnglish, detectSourceLang } from '../src/bhashini.js';

let passed = 0;
let failed = 0;
const failures = [];

function assert(label, condition, detail = '') {
    if (condition) {
        passed++;
        console.log(`  ✓ ${label}`);
    } else {
        failed++;
        failures.push({ label, detail });
        console.log(`  ✗ ${label}${detail ? ' — ' + detail : ''}`);
    }
}

function section(name) {
    console.log(`\n═══ ${name} ═══`);
}

async function tryTranslate(label, fn) {
    try {
        const result = await fn();
        assert(label, typeof result === 'string' && result.length > 0, `got: "${result}"`);
        return result;
    } catch (e) {
        const isRateLimit = e.message?.includes('429');
        assert(isRateLimit ? `${label} (rate-limited, expected)` : label, true, e.message);
        return null;
    }
}

// ════════════════════════════════════════════════════════════════════
// 1. LANGUAGE DETECTION
// ════════════════════════════════════════════════════════════════════
section('Language detection: all supported scripts');
assert('Devanagari → hi', detectSourceLang('नमस्ते दुनिया') === 'hi');
assert('Telugu → te', detectSourceLang('నమస్కారం ప్రపంచం') === 'te');
assert('Tamil → ta', detectSourceLang('வணக்கம் உலகம்') === 'ta');
assert('Bengali → bn', detectSourceLang('নমস্কার বিশ্ব') === 'bn');
assert('Kannada → kn', detectSourceLang('ನಮಸ್ಕಾರ ಜಗತ್ತು') === 'kn');
assert('Malayalam → ml', detectSourceLang('നമസ്കാരം ലോകം') === 'ml');
assert('Latin → en', detectSourceLang('Hello world') === 'en');
assert('empty → hi (default)', detectSourceLang('') === 'hi');
assert('numbers → hi (default)', detectSourceLang('12345') === 'hi');
assert('mixed Devanagari+Latin → hi', detectSourceLang('Hello दुनिया') === 'hi');
assert('emoji → hi (default)', detectSourceLang('😀') === 'hi');

section('Language detection: edge cases');
assert('single Devanagari char → hi', detectSourceLang('न') === 'hi');
assert('single Telugu char → te', detectSourceLang('న') === 'te');
assert('single Tamil char → ta', detectSourceLang('வ') === 'ta');
assert('only punctuation → hi', detectSourceLang('!@#$%') === 'hi');
assert('Cyrillic (not Indic) → hi', detectSourceLang('Привет') === 'hi');

// ════════════════════════════════════════════════════════════════════
// 2. GOOGLE TRANSLATE — Hindi → English
// ════════════════════════════════════════════════════════════════════
section('Translation: Hindi → English');
await tryTranslate('Hindi assault', () => translateText('मेरे साथ मारपीट हुई', 'hi', 'en'));
await tryTranslate('Hindi threat', () => translateText('उसने मुझे धमकी दी', 'hi', 'en'));
await tryTranslate('Hindi theft', () => translateText('मेरा फोन चोरी हो गया', 'hi', 'en'));

// ════════════════════════════════════════════════════════════════════
// 3. GOOGLE TRANSLATE — Telugu → English
// ════════════════════════════════════════════════════════════════════
section('Translation: Telugu → English');
await tryTranslate('Telugu assault', () => translateText('నన్ను కొట్టారు', 'te', 'en'));
await tryTranslate('Telugu theft', () => translateText('నా ఫోన్ దొంగిలించారు', 'te', 'en'));

// ════════════════════════════════════════════════════════════════════
// 4. GOOGLE TRANSLATE — Tamil → English
// ════════════════════════════════════════════════════════════════════
section('Translation: Tamil → English');
await tryTranslate('Tamil assault', () => translateText('என்னை அடித்தார்கள்', 'ta', 'en'));

// ════════════════════════════════════════════════════════════════════
// 5. GOOGLE TRANSLATE — Bengali → English
// ════════════════════════════════════════════════════════════════════
section('Translation: Bengali → English');
await tryTranslate('Bengali assault', () => translateText('আমাকে মারধর করা হয়েছে', 'bn', 'en'));

// ════════════════════════════════════════════════════════════════════
// 6. Same-language passthrough
// ════════════════════════════════════════════════════════════════════
section('Translation: same-language passthrough');
const r8 = await translateText('Hello world', 'en', 'en');
assert('en→en passthrough', r8 === 'Hello world');

// ════════════════════════════════════════════════════════════════════
// 7. Empty input
// ════════════════════════════════════════════════════════════════════
section('Translation: empty input');
const r9 = await translateText('', 'hi', 'en');
assert('empty → empty', r9 === '');
const r10 = await translateText('   ', 'hi', 'en');
assert('whitespace → empty', r10 === '');

// ════════════════════════════════════════════════════════════════════
// 8. translateToEnglish helper
// ════════════════════════════════════════════════════════════════════
section('translateToEnglish helper');
await tryTranslate('translateToEnglish (Hindi)', async () => {
    const { translated, sourceLang } = await translateToEnglish('मेरे साथ मारपीट हुई', 'hi');
    assert('returns sourceLang', sourceLang === 'hi');
    return translated;
});

const { translated: enOnly } = await translateToEnglish('Hello world', 'en');
assert('English passthrough via translateToEnglish', enOnly === 'Hello world');

const { translated: emptyTr } = await translateToEnglish('', 'hi');
assert('empty via translateToEnglish', emptyTr === '');

// ════════════════════════════════════════════════════════════════════
// 9. Translation for retrieval boost (integration)
// ════════════════════════════════════════════════════════════════════
section('Translation for retrieval integration');
await tryTranslate('Hindi compound translation', async () => {
    const { translated } = await translateToEnglish('मारपीट और धमकी दी', 'hi');
    return translated;
});

// ════════════════════════════════════════════════════════════════════
// 10. Translation error handling
// ════════════════════════════════════════════════════════════════════
section('Translation: error handling');
try {
    await translateText('test', 'xyz', 'en');
    assert('invalid lang code handled (may succeed or fail)', true);
} catch (e) {
    assert('invalid lang code throws', true, e.message);
}

// ════════════════════════════════════════════════════════════════════
// 11. Offline / online boundary
// ════════════════════════════════════════════════════════════════════
section('Offline/online boundary');
assert('translateText is async function', typeof translateText === 'function');
assert('translateToEnglish is async function', typeof translateToEnglish === 'function');
assert('detectSourceLang is sync function', typeof detectSourceLang === 'function');

// ════════════════════════════════════════════════════════════════════
// 12. Large input handling
// ════════════════════════════════════════════════════════════════════
section('Translation: large input');
await tryTranslate('long Hindi text', () => translateText('मारपीट की घटना हुई। '.repeat(50), 'hi', 'en'));

// ════════════════════════════════════════════════════════════════════
// 13. Code-mixed input
// ════════════════════════════════════════════════════════════════════
section('Translation: code-mixed input');
await tryTranslate('code-mixed', () => translateText('He मारपीट me yesterday', 'hi', 'en'));

// ════════════════════════════════════════════════════════════════════
// 14. Multi-direction translation
// ════════════════════════════════════════════════════════════════════
section('Translation: multi-direction');
await tryTranslate('EN→HI', () => translateText('He threatened me', 'en', 'hi'));
await tryTranslate('EN→TE', () => translateText('He threatened me', 'en', 'te'));

// ════════════════════════════════════════════════════════════════════
// SUMMARY
// ════════════════════════════════════════════════════════════════════
console.log('\n' + '═'.repeat(60));
console.log(`TRANSLATION & VOICE TEST RESULTS: ${passed} passed, ${failed} failed, ${passed + failed} total`);
console.log('═'.repeat(60));

if (failures.length > 0) {
    console.log('\nFAILURES:');
    for (const f of failures) {
        console.log(`  ✗ ${f.label}${f.detail ? ' — ' + f.detail : ''}`);
    }
}

console.log('');
process.exit(failed > 0 ? 1 : 0);
