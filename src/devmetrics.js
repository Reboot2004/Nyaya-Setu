// Nyaya-Setu developer metrics — debug/study instruments, NOT citizen flow.
// Everything stays in localStorage on this device. Export for reports.
// - Benchmark history: tok/s, retrieval ms, memory per run + device hints.
// - Time/cost study: per-draft pipeline timing vs manual baseline
//   (2–3 days wait + ₹500–1500 petition-writer fee, midpoints 2.5d / ₹1000).
const BENCH_KEY = 'nyaya_setu_bench_log_v1';
const STUDY_KEY = 'nyaya_setu_study_log_v1';
export const MANUAL_BASELINE = { days: 2.5, rupees: 1000 };

function read(key) {
    try {
        const raw = (typeof window !== 'undefined' && window.localStorage) ? localStorage.getItem(key) : null;
        const arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? arr : [];
    } catch { return []; }
}
function write(key, arr) {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.setItem(key, JSON.stringify(arr.slice(-200)));
            return true;
        }
    } catch { /* ignore */ }
    return false;
}

export function deviceHints() {
    const nav = (typeof navigator !== 'undefined' && navigator) || {};
    return {
        userAgent: String(nav.userAgent || '').slice(0, 120),
        hardwareConcurrency: nav.hardwareConcurrency || null,
        deviceMemoryGB: nav.deviceMemory || null,
        webgpu: typeof navigator !== 'undefined' && 'gpu' in navigator,
        onLine: typeof navigator !== 'undefined' ? !!navigator.onLine : null,
    };
}

export function logBenchmark(entry) {
    const log = read(BENCH_KEY);
    log.push({ ts: new Date().toISOString(), ...deviceHints(), ...(entry || {}) });
    write(BENCH_KEY, log);
    return log.length;
}

export function logStudyDraft({ lang, narrativeChars, totalSec, retrievalMs, sections }) {
    const log = read(STUDY_KEY);
    const secs = Number(totalSec) || 0;
    log.push({
        ts: new Date().toISOString(),
        lang: lang || 'en',
        narrativeChars: Number(narrativeChars) || 0,
        totalSec: +secs.toFixed(1),
        retrievalMs: retrievalMs === undefined || retrievalMs === null ? null : +Number(retrievalMs).toFixed(1),
        sections: Number(sections) || 0,
        baselineDays: MANUAL_BASELINE.days,
        baselineRupees: MANUAL_BASELINE.rupees,
        savedDays: +(MANUAL_BASELINE.days - secs / 86400).toFixed(2),
        savedRupees: MANUAL_BASELINE.rupees,
    });
    write(STUDY_KEY, log);
    return log.length;
}

export function studyAggregates() {
    const log = read(STUDY_KEY);
    if (!log.length) return { n: 0 };
    const secs = log.map((r) => r.totalSec).sort((a, b) => a - b);
    const median = secs[Math.floor(secs.length / 2)];
    return {
        n: log.length,
        medianSec: median,
        maxSec: secs[secs.length - 1],
        estDaysSaved: +(log.reduce((a, r) => a + (r.savedDays || 0), 0)).toFixed(1),
        estRupeesSaved: log.reduce((a, r) => a + (r.savedRupees || 0), 0),
        byLang: log.reduce((m, r) => { m[r.lang] = (m[r.lang] || 0) + 1; return m; }, {}),
    };
}

export function downloadJson(filename, obj) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 500);
}

export function downloadCsv(filename, rows) {
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const head = Object.keys(rows[0] || { note: 'empty' });
    const csv = [head.join(',')].concat(rows.map((r) => head.map((h) => esc(r[h])).join(','))).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 500);
}

export function getBenchLog() { return read(BENCH_KEY); }
export function getStudyLog() { return read(STUDY_KEY); }
export function clearStudy() {
    try { window.localStorage.removeItem(STUDY_KEY); } catch { /* ignore */ }
}
