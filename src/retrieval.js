// Deterministic statutory retrieval over IndiaAI AIKosh Legislative Corpus
// Augmented with Bhashini Indic Dialectal Normalizer for multilingual vernacular grounding.
import { STATUTES, STATUTE_METADATA } from '../data/statutes.js';
import { normalizeWithBhashini } from '../data/bhashini_lexicon.js';

const STOP = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'my', 'me', 'i', 'was', 'is', 'he', 'she', 'they', 'his', 'her', 'at', 'by', 'for', 'with', 'from', 'it', 'this', 'that', 'me', 'mera', 'meri', 'mere', 'ko', 'ne', 'ka', 'ki', 'ke', 'aur', 'par', 'se']);

function tokenize(text) {
    return text
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
        .split(/\s+/)
        .filter((t) => t.length > 1 && !STOP.has(t));
}

/**
 * Retrieves matching BNS / BNSS statutory provisions using hybrid Bhashini normalization + AIKosh indexing.
 */
export function retrieveSections(narrative, topK = 4) {
    const tokens = tokenize(narrative);
    
    // 1. Pass through Bhashini Vernacular Normalizer
    const { normalizedConcepts, suggestedSections } = normalizeWithBhashini(narrative);

    // 2. Score against AIKosh statutory corpus
    const scored = STATUTES.map((s) => {
        let score = 0;
        const hay = `${s.title} ${s.text} ${s.triggers.join(' ')}`.toLowerCase();

        // Direct section boost if matched by Bhashini dialectal lexicon
        if (suggestedSections.includes(s.section)) {
            score += 5;
        }

        // Trigger phrases match
        for (const tok of tokens) {
            if (s.triggers.some((t) => t.toLowerCase().includes(tok) || tok.includes(t.toLowerCase()))) {
                score += 3;
            } else if (hay.includes(tok)) {
                score += 1;
            }
        }

        return { 
            statute: s, 
            score,
            source: s.source || STATUTE_METADATA.source,
            bhashiniNormalized: normalizedConcepts.length > 0
        };
    })
        .filter((r) => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);

    return scored;
}

export { STATUTE_METADATA };
