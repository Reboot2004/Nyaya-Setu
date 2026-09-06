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
            try { env.useBrowserCache = true; } catch { /* ignore */ }
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

// Transcribe an audio Blob (webm/wav) fully on-device. Returns plain text.
export async function transcribeBlob(blob, appLang = 'en', onProgress) {
    const pipe = await ensureSTT(onProgress);
    const language = WHISPER_LANG[(appLang || 'en').toLowerCase()] || 'english';
    let url = null;
    try {
        // Transformers.js accepts URL / File / Blob audio input
        url = (typeof URL !== 'undefined' && URL.createObjectURL) ? URL.createObjectURL(blob) : blob;
        const out = await pipe(url, {
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
