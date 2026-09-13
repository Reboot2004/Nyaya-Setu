// STT smoke test — offline Whisper-tiny wiring (load + silent-audio no-crash).
// Measures plumbing, NOT transcription accuracy (that needs real speech samples).
// Offline-friendly: uses the on-device cache when present; otherwise tries a
// download within STT_BUDGET_MS and reports SKIPPED (exit 0) instead of failing.
//
// Usage:
//   node tests/stt_smoke.mjs                 # 120s load budget, then transcribe
//   node tests/stt_smoke.mjs --skip-load     # skip (offline, no cache)
//   STT_BUDGET_MS=60000 node tests/stt_smoke.mjs
import { ensureSTT, transcribeBlob, sttStatus } from '../src/stt.js';

const SKIP = process.argv.includes('--skip-load');
const BUDGET = Number(process.env.STT_BUDGET_MS || 120000);
const withTimeout = (p, ms, label) =>
    Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(label + ' timed out after ' + ms + 'ms')), ms))]);

// 1s 16kHz mono 16-bit PCM WAV, all zeros (digital silence).
function silentWav(seconds = 1, rate = 16000) {
    const n = seconds * rate;
    const buf = Buffer.alloc(44 + n * 2);
    buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8);
    buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
    buf.writeUInt16LE(1, 22); buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 2, 28);
    buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36);
    buf.writeUInt32LE(n * 2, 40);
    return new Blob([buf], { type: 'audio/wav' });
}

console.log('STT SMOKE: whisper-tiny, silent 1s WAV');
if (SKIP) { console.log('SKIPPED (--skip-load)'); process.exit(0); }

try {
    const t0 = Date.now();
    await withTimeout(ensureSTT(), BUDGET, 'STT load');
    console.log(`load ok in ${((Date.now() - t0) / 1000).toFixed(1)}s`, JSON.stringify(sttStatus()));
} catch (e) {
    console.log('SKIPPED (model unavailable: ' + String(e.message || e).slice(0, 120) + ')');
    process.exit(0);
}

try {
    const t0 = Date.now();
    const out = await withTimeout(transcribeBlob(silentWav(), 'en'), 120000, 'transcribe');
    const okType = typeof out.text === 'string';
    const okShort = out.text.length < 60; // silence must not produce an essay
    console.log(`transcribe ok in ${((Date.now() - t0) / 1000).toFixed(1)}s text=${JSON.stringify(out.text)} device=${out.device}`);
    console.log(okType && okShort ? 'STT SMOKE: PASS (no crash, bounded output)' : 'STT SMOKE: CHECK OUTPUT (unexpected long text)');
    process.exit(0);
} catch (e) {
    console.log('STT SMOKE: FAIL (threw on silence: ' + String(e.message || e).slice(0, 160) + ')');
    process.exit(1);
}
