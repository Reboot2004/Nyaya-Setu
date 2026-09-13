// Nyaya-Setu offline speech-to-text — Whisper tiny (ONNX, CPU/WASM-first).
// Zero new patterns: lazy-loaded like src/semantic.js, one-time download then
// cached (browser Cache API), works fully offline afterwards. Slow on tabs
// (30s audio ≈ 30-60s CPU decode) so it runs with progress + never blocks typing.
// Web Speech API stays the fast path where network exists.
import { isWebGPUSupported } from './llm.js';

const MODEL = 'Xenova/whisper-tiny';
const WHISPER_LANG = { en: 'english', hi: 'hindi', te: 'telugu', ta: 'tamil', bn: 'bengali', mr: 'marathi', kn: 'kannada', ml: 'malayalam' };

let pipePromise = null;
let activeDevice = null;

async function loadTransformers() {
    return await import('@huggingface/transformers');
}

export function sttStatus() {
    return { ready: !!pipePromise, device: activeDevice, model: MODEL };
}

export async function ensureSTT(onProgress) {
    if (pipePromise) return pipePromise;
    const { pipeline, env } = await loadTransformers();
    try {
        // allow remote model fetch; cache aggressively for offline reuse
        if (env) {
            env.allowRemoteModels = true;
            // Browser Cache API does not exist in Node — setting it there makes
            // every later fetch throw "Browser cache is not available".
            if (typeof window !== 'undefined') {
                try { env.useBrowserCache = true; } catch { /* ignore */ }
            }
        }
    } catch { /* ignore */ }
    const isNode = typeof window === 'undefined';
    const devices = isNode ? ['cpu'] : (isWebGPUSupported() ? ['webgpu', 'wasm'] : ['wasm']);
    let lastErr;
    for (const device of devices) {
        try {
            onProgress?.({ device, text: `Loading offline voice model (${device}, once)…` });
            pipePromise = pipeline('automatic-speech-recognition', MODEL, {
                dtype: 'q8',
                device,
            });
            await pipePromise;
            activeDevice = device;
            return pipePromise;
        } catch (err) {
            lastErr = err;
            pipePromise = null;
        }
    }
    pipePromise = null;
    throw lastErr || new Error('Offline voice engine unavailable');
}

// Minimal WAV decode (16-bit PCM / 32-bit float, any rate/channels → 16kHz mono).
// Transformers.js decodes Blob URLs via AudioContext, which does not exist in
// Node — so there we pass raw samples directly (its own suggested workaround).
async function wavBlobToMono16k(blob) {
    const buf = Buffer.from(await blob.arrayBuffer());
    const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    const ascii = (o, n) => String.fromCharCode(...buf.subarray(o, o + n));
    if (ascii(0, 4) !== 'RIFF' || ascii(8, 4) !== 'WAVE') throw new Error('Not a WAV file');
    let fmt = null, dataOff = 0, dataLen = 0;
    for (let o = 12; o + 8 <= buf.length;) {
        const id = ascii(o, 4);
        const size = view.getUint32(o + 4, true);
        if (id === 'fmt ') {
            fmt = {
                audioFormat: view.getUint16(o + 8, true),
                channels: view.getUint16(o + 10, true),
                sampleRate: view.getUint32(o + 12, true),
                bits: view.getUint16(o + 22, true)
            };
        } else if (id === 'data') { dataOff = o + 8; dataLen = size; break; }
        o += 8 + size + (size % 2);
    }
    if (!fmt || !dataLen) throw new Error('Unparseable WAV');
    const bytesPerSample = fmt.bits / 8;
    const frames = Math.floor(dataLen / (bytesPerSample * fmt.channels));
    const mono = new Float32Array(frames);
    for (let i = 0; i < frames; i++) {
        let s = 0;
        for (let ch = 0; ch < fmt.channels; ch++) {
            const p = dataOff + (i * fmt.channels + ch) * bytesPerSample;
            let v = 0;
            if (fmt.audioFormat === 3 && fmt.bits === 32) v = view.getFloat32(p, true);
            else if (fmt.bits === 16) v = view.getInt16(p, true) / 32768;
            else if (fmt.bits === 8) v = (view.getUint8(p) - 128) / 128;
            else if (fmt.bits === 32) v = view.getInt32(p, true) / 2147483648;
            s += v;
        }
        mono[i] = s / fmt.channels;
    }
    if (fmt.sampleRate === 16000) return mono;
    const outLen = Math.floor((mono.length * 16000) / fmt.sampleRate);
    const out = new Float32Array(outLen);
    for (let i = 0; i < outLen; i++) {
        const pos = (i * mono.length) / outLen;
        const i0 = Math.floor(pos), i1 = Math.min(mono.length - 1, i0 + 1), f = pos - i0;
        out[i] = mono[i0] * (1 - f) + mono[i1] * f;
    }
    return out;
}
// Transcribe an audio Blob (webm/wav) fully on-device. Returns plain text.
export async function transcribeBlob(blob, appLang = 'en', onProgress) {
    const pipe = await ensureSTT(onProgress);
    const language = WHISPER_LANG[(appLang || 'en').toLowerCase()] || 'english';
    let url = null;
    let input = blob;
    try {
        if (typeof window === 'undefined') {
            // Node has no AudioContext for URL decoding — pass raw samples.
            try { input = await wavBlobToMono16k(blob); }
            catch { input = blob; }
        } else if (typeof URL !== 'undefined' && URL.createObjectURL) {
            url = URL.createObjectURL(blob);
            input = url;
        }
        const out = await pipe(input, {
            language,
            task: 'transcribe',
            chunk_length_s: 30,
            return_timestamps: false,
        });
        const text = String(out?.text || '').trim();
        return { text, language, device: activeDevice };
    } finally {
        try { if (url && typeof url === 'string' && URL.revokeObjectURL) URL.revokeObjectURL(url); } catch { /* ignore */ }
    }
}
