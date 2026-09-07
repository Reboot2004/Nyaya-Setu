// Nyaya-Setu voice notes: honest online/offline split.
// Web Speech API (transcription) needs network in Chrome/Edge and is NOT offline.
// Typed input works fully offline. MediaRecorder memo works offline (audio stored
// locally, no transcription) so a citizen can still preserve narration at a kiosk.
export function isSpeechRecognitionAvailable() {
    if (typeof window === 'undefined') return false;
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function voiceNeedsNetworkNote() {
    return 'Voice transcription needs network in most browsers; typing works fully offline.';
}

let memoRecorder = null;
let memoChunks = [];

export function isMemoRecording() {
    return !!memoRecorder && memoRecorder.state === 'recording';
}

export async function startOfflineMemo() {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        throw new Error('Audio recording not supported in this browser.');
    }
    memoChunks = [];
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    memoRecorder = new MediaRecorder(stream);
    // keep a handle to the stream for reliable cleanup on tab/mobile browsers
    memoRecorder.stream = stream;
    memoRecorder.ondataavailable = (e) => { if (e.data?.size) memoChunks.push(e.data); };
    memoRecorder.start();
    return true;
}

export function stopOfflineMemo() {
    return new Promise((resolve) => {
        if (!memoRecorder) return resolve(null);
        const stream = memoRecorder.stream || null;
        memoRecorder.onstop = () => {
            const blob = new Blob(memoChunks, { type: memoRecorder.mimeType || 'audio/webm' });
            try { stream?.getTracks()?.forEach((t) => t.stop()); } catch { /* ignore */ }
            memoRecorder = null;
            memoChunks = [];
            resolve(blob);
        };
        try { memoRecorder.stop(); } catch { resolve(null); }
    });
}
