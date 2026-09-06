# Nyaya-Setu — Client-Side Indic Legal Co-Pilot (prototype-0.4)

Offline-first PWA that converts a typed / spoken grievance into a fact-reviewed,
statute-suggested police-complaint draft (BNS/BNSS 2023). Prototype corpus, not legal advice.

## Pipeline (what actually runs)

1. **Vernacular Ingestion** — typed narrative (fully offline) or voice via Web Speech API (needs network in Chrome/Edge) + offline audio memo fallback
2. **Entity Extraction** — rule-based Indic extractor on all devices; Llama 3.2 1B (WebGPU via WebLLM) optionally refines facts where available
3. **BNS Retrieval** — lexical + Bhashini colloquial boost over prototype corpus (`data/statutes.js`: 889 slots, ~45 curated, rest placeholders); IndexedDB offline cache (`src/offline_store.js`)
4. **Deterministic Drafting** — template composes draft from retrieved sections only; LLM never invents section numbers
5. **Bilingual Output** — printable complaint HTML/PDF + 8-lang audio rights briefing + CPGRAMS JSON export + safety screen + human review gate

## Run

```bash
cd nyaya-setu
npm install
npm run dev        # open http://localhost:5173
node tests/evaluate.js  # real pipeline evaluation (rule engine + lexical+Bhashini)
```

First AI load downloads the ~700 MB quantized model to browser cache (one-time). Rule engine works without it.

## Architecture Notes (honest)

- **Data sovereignty:** on-device by default. Exceptions that leave device: optional IP geo lookup (to be removed in §3), Web Speech transcription (browser cloud), opt-in cloud assist only (off by default, `src/cloud_fallback.js`).
- **Deterministic grounding:** sections come only from `retrieveSections()`; `draftComplaint()` is a template.
- **Safety:** rule-based `screenInput()` (`src/safety.js`) + mandatory fact-review modal + `unknown` defaults + NALSA 15100 disclaimer. Llama Guard 3 not bundled (hook: `window.__nyayaGuard`).
- **Corpus:** `v0.4-prototype-partial`, lexical (no vectors). Verify at https://www.indiacode.nic.in/ before filing.

## Roadmap

- [x] Bhashini lexicon wired into retrieval (+4 boost, concepts shown)
- [x] IndexedDB offline index + SW precache + manifest icons
- [x] Real evaluation (no mocks) + CPGRAMS JSON + opt-in cloud path
- [ ] Full gazette ingestion with doc hash/version/effective date + BSA
- [ ] bge-m3 semantic index (replace lexical) + measured tok/s + memory budget
- [ ] Llama Guard 3 on-device + emergency screen + legal-aid validation + field usability
