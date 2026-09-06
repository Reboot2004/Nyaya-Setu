// Smoke test: offline STT wiring (Whisper tiny) on a silent WAV.
// Run: node tests/stt_smoke.mjs  (downloads model once, then cached)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const wav = fs.readFileSync(path.join(__dirname, 'silence_test.wav'));
// minimal WAV decode: 16-bit mono PCM after 44-byte header, resample assum. 16kHz
const pcm = new Int16Array(wav.buffer, wav.byteOffset + 44, (wav.length - 44) / 2);
const float = Float32Array.from(pcm, (v) => v / 32768);

const { pipeline } = await import('@huggingface/transformers');
const pipe = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny', { dtype: 'q8', device: 'cpu' });
const out = await pipe(float, { language: 'english', task: 'transcribe', chunk_length_s: 30, return_timestamps: false });
console.log('transcript:', JSON.stringify(out?.text ?? null));
console.log('STT_SMOKE_OK');
