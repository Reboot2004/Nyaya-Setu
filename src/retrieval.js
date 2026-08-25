// Lightweight in-browser lexical retrieval over the statutory corpus.
// Production upgrade path: replace scoring with bge-m3 embeddings stored in IndexedDB (4MB vector store).
import { STATUTES } from '../data/statutes.js';

const STOP = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'my', 'me', 'i', 'was', 'is', 'he', 'she', 'they', 'his', 'her', 'at', 'by', 'for', 'with', 'from', 'it', 'this', 'that']);

function tokenize(text) {
    return text
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
        .split(/\s+/)
        .filter((t) => t.length > 1 && !STOP.has(t));
}

export function retrieveSections(narrative, topK = 4) {
    const tokens = tokenize(narrative);
    const scored = STATUTES.map((s) => {
        let score = 0;
        const hay = `${s.title} ${s.text} ${s.triggers.join(' ')}`.toLowerCase();
        for (const tok of tokens) {
            // Trigger phrases are strong signals (colloquial → statutory mapping)
            if (s.triggers.some((t) => t.includes(tok) || tok.includes(t))) score += 3;
            else if (hay.includes(tok)) score += 1;
        }
        return { statute: s, score };
    })
        .filter((r) => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);

    return scored;
}
