# Nyaya-Setu — Client-Side Indic Legal Co-Pilot (prototype-0.5)

Offline-first PWA that converts a typed / spoken grievance into a fact-reviewed,
statute-suggested police-complaint draft (BNS/BNSS 2023). Prototype corpus, not legal advice.

## Pipeline (what actually runs — local-only, no cloud)

1. **Vernacular Ingestion** — typed narrative (fully offline) or voice via Web Speech API (needs network in Chrome/Edge) + offline audio memo fallback
2. **Entity Extraction** — rule-based Indic extractor always; Llama 3.2 1B q4 (WebGPU via WebLLM, auto-download once ~700MB, IndexedDB-cached, ctx 1024) refines facts and translates the English gist where available
3. **BNS Retrieval** — fused rank: multilingual MiniLM embeddings (ONNX, CPU-first, `src/semantic.js`) + lexical triggers + Bhashini + typo-tolerant fuzzy + rarity, over `data/statutes.js` (892 slots — 358 BNS + 531 BNSS + 3 key BSA, ~48 curated) with precomputed `data/statute_vectors.json` index (~2.4MB). Lexical path is instant and always the fallback; semantic preloads in background (`scripts/build_vectors.mjs` regenerates vectors).
4. **Deterministic Drafting** — template composes draft from retrieved sections only; LLM never invents section numbers
5. **Bilingual Output** — printable complaint HTML/PDF (English half uses the translated gist when narrated in another language; native half keeps original) + 8-lang audio rights briefing + draft read-aloud + CPGRAMS JSON export + safety screen + emergency interstitial + human review gate
   - Translation is dynamic but weight-free: on-device Llama gist, else an offline 2KB concept-gloss bundle (`src/translate.js`). A dedicated NMT bundle (NLLB-600M, 1.5GB+ quantized) was evaluated and rejected as unshippable on tabs/mobile data.

## Run

```bash
cd nyaya-setu
npm install
npm run dev        # open http://localhost:5173
node tests/evaluate.js  # 27-scenario suite: fused MiniLM+lexical+Bhashini, safety screen, 8 langs
node scripts/verify_no_bleed.mjs  # regression: LLM-shaped JSON garbage never reaches form or draft
node scripts/build_vectors.mjs  # regenerate statute embeddings (needs network once)
```

First AI load downloads the ~700 MB quantized model to browser cache (one-time). Rule engine works without it.

## Architecture Notes (honest — local-only)

- **Data sovereignty:** 100% on-device. No cloud path exists. Only exceptions: Web Speech transcription (browser cloud where used) + one-time HuggingFace weight CDN fetch, then IndexedDB-cached offline.
- **Deterministic grounding:** sections come only from `retrieveSections()`; `draftComplaint()` is a template.
- **Safety:** instant `screenInput()` (`src/safety.js`) + quantized Llama Guard 3 1B q4 local (`src/guard.js`, ctx 512, time-shared engine, 12s timeout, rule fallback) + emergency interstitial + fact-review modal + NALSA 15100.
- **Corpus:** `v0.5-prototype-partial`, lexical (no vectors). Verify at https://www.indiacode.nic.in/ before filing.

## Roadmap

- [x] Bhashini lexicon wired into retrieval (+4 boost, concepts shown)
- [x] IndexedDB offline index + SW precache + manifest icons
- [x] Real evaluation (no mocks) + CPGRAMS JSON + local-only (cloud removed)
- [x] Quantized Guard-3-1B q4 local (time-shared, smooth on tabs) + emergency + PS directory + provenance
- [ ] Full gazette ingestion with doc hash/version/effective date + BSA
- [ ] bge-m3 semantic index (replace lexical) + measured tok/s + memory budget
- [ ] Legal-aid validation + field usability
