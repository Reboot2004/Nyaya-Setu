// Nyaya-Setu offline index — IndexedDB persistence for prototype corpus.
// Prototype lexical index (not vectors). Provides honest offline-first caching
// with version tracking. Node-safe (no-op outside browser).
const DB_NAME = 'nyaya-setu';
const DB_VERSION = 1;
const STORE = 'statutes';
const META_KEY = 'nyaya_setu_corpus_meta_v1';

function isBrowser() {
    return typeof window !== 'undefined' && typeof indexedDB !== 'undefined';
}

function openDb() {
    return new Promise((resolve, reject) => {
        if (!isBrowser()) return reject(new Error('No IndexedDB in this environment'));
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

export async function cacheStatutesToIDB(statutesList, metadata) {
    if (!isBrowser()) return { success: false, reason: 'no-indexeddb' };
    try {
        const db = await openDb();
        await new Promise((resolve, reject) => {
            const tx = db.transaction(STORE, 'readwrite');
            tx.objectStore(STORE).put({ list: statutesList, meta: metadata || null, cachedAt: new Date().toISOString() }, 'corpus');
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
        try { localStorage.setItem(META_KEY, JSON.stringify({ cachedAt: new Date().toISOString(), count: statutesList.length })); } catch { /* ignore */ }
        return { success: true, count: statutesList.length };
    } catch (err) {
        return { success: false, error: err?.message || String(err) };
    }
}

export async function loadStatutesFromIDB() {
    if (!isBrowser()) return { success: false, reason: 'no-indexeddb' };
    try {
        const db = await openDb();
        const row = await new Promise((resolve, reject) => {
            const tx = db.transaction(STORE, 'readonly');
            const rq = tx.objectStore(STORE).get('corpus');
            rq.onsuccess = () => resolve(rq.result);
            rq.onerror = () => reject(rq.error);
        });
        if (row && Array.isArray(row.list) && row.list.length > 0) return { success: true, list: row.list, meta: row.meta, cachedAt: row.cachedAt };
        return { success: false, reason: 'empty' };
    } catch (err) {
        return { success: false, error: err?.message || String(err) };
    }
}

export async function initOfflineIndex(getFallbackList, metadata) {
    // Try IDB first, else seed it from bundled BASE_STATUTES
    const existing = await loadStatutesFromIDB();
    if (existing.success) return { success: true, source: 'indexeddb', count: existing.list.length, cachedAt: existing.cachedAt };
    try {
        const list = typeof getFallbackList === 'function' ? getFallbackList() : getFallbackList;
        if (Array.isArray(list) && list.length > 0) {
            const res = await cacheStatutesToIDB(list, metadata);
            if (res.success) return { success: true, source: 'bundled-seeded', count: res.count };
        }
    } catch { /* ignore */ }
    return { success: false, source: 'bundled-memory' };
}

export async function clearIDBCorpus() {
    if (!isBrowser()) return { success: false, reason: 'no-indexeddb' };
    try {
        const db = await openDb();
        await new Promise((resolve, reject) => {
            const tx = db.transaction(STORE, 'readwrite');
            tx.objectStore(STORE).delete('corpus');
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
        try { localStorage.removeItem(META_KEY); } catch { /* ignore */ }
        return { success: true };
    } catch (err) {
        return { success: false, error: err?.message || String(err) };
    }
}
