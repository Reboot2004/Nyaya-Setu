# Nyaya-Setu — Client-Side Indic Legal Co-Pilot

Offline-capable PWA that converts a spoken vernacular grievance into a formal, statute-grounded
police complaint draft (BNS/BNSS 2023) — 100% on-device.

## Pipeline

1. **Vernacular Ingestion** — voice (Web Speech API, hi-IN default) or typed narrative
2. **Entity Extraction** — Llama 3.2 1B Instruct (4-bit, WebGPU via MLC-LLM/WebLLM)
3. **BNS Retrieval** — lexical retrieval over embedded statutory corpus (`data/statutes.js`;
   production: bge-m3 embeddings in IndexedDB from AIKosh gazette data)
4. **Local LLM Drafting** — grounded generation bounded to retrieved sections only
5. **Bilingual Output** — printable complaint PDF + audio rights briefing (Web Speech API)

## Run

```bash
cd nyaya-setu
npm install
npm run dev        # open http://localhost:5173
```

First run downloads the ~700 MB quantized model to browser cache (one-time, then fully offline).

## Architecture Notes

- **Data sovereignty:** no grievance text ever leaves the device; LLM runs via WebGPU.
- **Deterministic grounding:** the LLM never invents section numbers — statutes come only from
  the retrieval layer; generation is programmatically constrained to retrieved sections.
- **Fallback:** devices without WebGPU → hosted Llama 3.1 8B API path (to be wired).
- **Safety:** non-advocate disclaimers appended; Llama Guard 3 input filtering planned.

## Roadmap

- [ ] Expand corpus to full 358 BNS + 150 BNSS sections (AIKosh gazettes)
- [ ] bge-m3 embedding index in IndexedDB (replace lexical scoring)
- [ ] Bhashini parallel corpora for dialectal normalization
- [ ] CPGRAMS-compliant structured export schema
- [ ] Llama Guard 3 safety filter
- [ ] Cloud fallback for legacy devices
