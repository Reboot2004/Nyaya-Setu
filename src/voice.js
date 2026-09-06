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
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    memoChunks = [];
    memoRecorder = new MediaRecorder(stream);
    memoRecorder.ondataavailable = (e) => { if (e.data?.size) memoChunks.push(e.data); };
    memoRecorder.start();
    return true;
}

export function stopOfflineMemo() {
    return new Promise((resolve) => {
        if (!memoRecorder) return resolve(null);
        memoRecorder.onstop = () => {
            const blob = new Blob(memoChunks, { type: memoRecorder.mimeType || 'audio/webm' });
            try { memoRecorder.stream?.getTracks()?.forEach((t) => t.stop()); } catch { /* ignore */ }
            memoRecorder = null;
            resolve(blob);
        };
        try { memoRecorder.stop(); } catch { resolve(null); }
    });
}
