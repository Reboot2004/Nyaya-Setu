// Deterministic statutory retrieval over IndiaAI AIKosh Legislative Corpus & Gazette Mirrors
// Augmented with Bhashini Indic Dialectal Normalizer for multilingual vernacular grounding.
import { getLoadedStatutes, STATUTE_METADATA, saveDynamicStatutes, resetToDefaultStatutes, BASE_STATUTES } from '../data/statutes.js';
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
    const statutesList = getLoadedStatutes();
    const tokens = tokenize(narrative);
    
    // 1. Pass through Bhashini Vernacular Normalizer
    const { normalizedConcepts, suggestedSections } = normalizeWithBhashini(narrative);

    // 2. Score against active statutory corpus
    const scored = statutesList.map((s) => {
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

/**
 * Sync / Hot-Reload statutory database from a remote JSON feed or uploaded dataset.
 */
export async function syncStatutesFromSource(sourceUrl) {
    try {
        const url = sourceUrl || 'https://raw.githubusercontent.com/Reboot2004/Nyaya-Setu/main/data/statutes_feed.json';
        const res = await fetch(url, { cache: 'no-cache' });
        if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
            saveDynamicStatutes(data);
            return { success: true, count: data.length, source: url };
        }
        throw new Error('Invalid statute schema array.');
    } catch (err) {
        console.warn('Remote sync error, maintaining local cache:', err);
        return { success: false, error: err.message };
    }
}

export { STATUTE_METADATA, getLoadedStatutes, saveDynamicStatutes, resetToDefaultStatutes, BASE_STATUTES };
