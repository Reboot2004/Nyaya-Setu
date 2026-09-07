# PWA Install & Lighthouse Checklist — Nyaya-Setu v0.6

Run locally, then on the Vercel URL. Check each box in Chrome DevTools.

## 1) Installability (Chrome → Application → Manifest)

- [ ] Manifest loads: `manifest.webmanifest` shows Name `Nyaya-Setu Legal Co-Pilot`, icons 192 + 512 (maskable), `display: standalone`, `theme_color: #0f172a`.
- [ ] Service worker registered: `sw.js` (CACHE `nyaya-setu-v9`) in Application → Service Workers, status **activated and is running**.
- [ ] **Install prompt** appears: `beforeinstallprompt` shows floating **Install app** button at bottom-right; clicking it opens the OS install dialog; `appinstalled` event hides it.
- [ ] Installed launch: after install, app opens without browser chrome, `start_url: ./index.html`, offline.

## 2) Offline

- [ ] DevTools → Network → **Offline** → reload `/`: app shell + explorer render, `offline.html` only for hard navigation misses.
- [ ] With no network, **Review Facts → Suggested Provisions → Print/PDF → Export CPGRAMS JSON** all work (fused retrieval falls back to lexical).
- [ ] `statute_vectors.json` (2.9 MB) is precached by SW; first-load only.

## 3) Performance (Network → Disable cache, Fast 3G throttle)

- [ ] First paint < 2s on Fast 3G (app shell is 27KB HTML + 181KB index chunk; statutes 674KB and webllm 6MB are lazy). Confirm in Network waterfall: `hf-transformers` / `webllm` only when AI triggered.
- [ ] `ort-wasm-simd-threaded.asyncify-*.wasm` (23 MB) loads lazily, via `instantiateStreaming` (correct MIME `application/wasm`). Check Console: no `compileStreaming failed` warning.
- [ ] Preloads present in `<head>`: `statutes.js` (script), `statute_vectors.json` (fetch), `icon-192.svg` (image).

## 4) Lighthouse (Chrome → Lighthouse → Mobile → All categories)

Generate a report and ensure:

- **PWA** = 100: manifest, SW, icons, offline, theme-color, viewport, start_url all green.
- **Performance** ≥ 85 on Fast 3G throttled: main-thread work < 3s, no layout shift from gate/modals (CLS < 0.1).
- **Accessibility** ≥ 95: gates `role=dialog`/`alertdialog`, textarea `aria-label`, output `aria-live`, form labels `for=` with `autocomplete`, color contrast on badges passes.
- **Best Practices** = 100: no console errors, HTTPS (Vercel), no vulnerable libs flagged.

If Performance < 85, the known remaining cost is `statutes-BH3w-zIR.js` (674KB). Do **not** inline it — it is already code-split and lazy where possible.

## 5) A11y quick QA

- [ ] Tab through gate → form → narrative → Record → Review: focus ring visible, order logical.
- [ ] Screen reader: gate titles announced, fact-review modal traps focus (Esc closes via Go Back).
- [ ] Color: badges on white pass AA (dark blue on #eff6ff, red on white both ≥ 4.5:1).

## 6) Update flow

- [ ] Deploy new `CACHE` version → reload once → Console shows `New version available — reload to update.` → second reload serves new assets (Application → Cache Storage shows `nyaya-setu-v9`).
