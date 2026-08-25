// Nyaya-Setu Service Worker — offline-first PWA caching
const CACHE = 'nyaya-setu-v1';
const ASSETS = ['./', './index.html', './manifest.webmanifest'];

self.addEventListener('install', (e) => {
    e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
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
    // Cache-first for same-origin; network-first for model CDN assets
    if (new URL(e.request.url).origin === self.location.origin) {
        e.respondWith(
            caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
                const copy = res.clone();
                caches.open(CACHE).then((c) => c.put(e.request, copy));
                return res;
            }))
        );
    }
});
