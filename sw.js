// Nyaya-Setu Service Worker — offline-first PWA caching (prototype).
// Local-only: app shell + 2.4MB MiniLM statute-vector index cached. Llama-3.2-1B,
// Guard-3-1B and MiniLM weights are runtime-cached (Cache API) on first load.
const CACHE = 'nyaya-setu-v7';
const ASSETS = [
    './',
    './index.html',
    './manifest.webmanifest',
    './icon-192.svg',
    './icon-512.svg',
    './src/main.js',
    './src/llm.js',
    './src/retrieval.js',
    './src/output.js',
    './src/ui_translations.js',
    './src/safety.js',
    './src/guard.js',
    './src/cpgrams.js',
    './src/offline_store.js',
    './src/voice.js',
    './src/emergency.js',
    './data/statutes.js',
    './data/statute_vectors.json',
    './data/categories.js',
    './data/bhashini_lexicon.js',
    './data/ps_directory.js',
    './data/provenance.json'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE).then((c) => c.addAll(ASSETS).catch((err) => console.warn('SW precache partial:', err)))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    );
    self.clients.claim();
});

self.addEventListener('fetch', (e) => {
    if (e.request.method !== 'GET') return;
    const url = new URL(e.request.url);
    // Same-origin: cache-first, then network + runtime cache
    if (url.origin === self.location.origin) {
        e.respondWith(
            caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
                if (res.ok) {
                    const copy = res.clone();
                    caches.open(CACHE).then((c) => c.put(e.request, copy));
                }
                return res;
            }).catch(() => caches.match('./index.html')))
        );
    }
    // Model CDN / cross-origin: network-first, no caching here (browser handles model cache)
});
