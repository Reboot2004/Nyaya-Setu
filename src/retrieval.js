// Statute retrieval with relevance scoring + Bhashini dialectal normalization.
// Lexical-trigger scoring (prototype). No vector embeddings yet — see STATUTE_METADATA.retrievalMethod.
// Official sources: https://www.indiacode.nic.in/ | https://www.aikosh.in/
import { getLoadedStatutes, STATUTE_METADATA, saveDynamicStatutes, resetToDefaultStatutes, BASE_STATUTES } from '../data/statutes.js';
import { normalizeWithBhashini } from '../data/bhashini_lexicon.js';

const HINDI_STOP = new Set(['है', 'था', 'थी', 'हैं', 'के', 'की', 'का', 'को', 'ने', 'से', 'में', 'पर', 'और', 'या', 'लेकिन', 'मैं', 'मेरा', 'मेरी', 'मुझे', 'उसने', 'वह', 'वे', 'यह', 'इस', 'उस', 'जो', 'तो', 'भी', 'ही', 'अब', 'कि', 'एक']);
const EN_STOP = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'my', 'me', 'i', 'was', 'is', 'he', 'she', 'they', 'his', 'her', 'at', 'by', 'for', 'with', 'from', 'it', 'this', 'that', 'mera', 'meri', 'mere', 'ko', 'ne', 'ka', 'ki', 'ke', 'aur', 'par', 'se']);

function tokenize(text) {
    // Split on whitespace and punctuation, but preserve complete Indic syllables intact
    return text
        .toLowerCase()
        .split(/[\s,।,.!?;:()\[\]{}"'—–\-\/\\|]+/)
        .map((t) => t.trim())
        .filter((t) => t.length > 1 && !EN_STOP.has(t) && !HINDI_STOP.has(t));
}

/**
 * Score a statute against the narrative.
 * Returns: { score, triggerHits, negHits }
 */
function scoreStatute(statute, tokens, lowerText) {
    let score = 0;
    let triggerHits = 0;
    let negHits = 0;

    // Check negative triggers first — if any neg trigger matches, statute is excluded
    if (Array.isArray(statute.negTriggers)) {
        for (const neg of statute.negTriggers) {
            if (lowerText.includes(neg.toLowerCase())) {
                negHits++;
            }
        }
        // If narrative clearly is about something else (2+ neg triggers), skip this statute
        if (negHits >= 2) return { score: 0, triggerHits: 0, negHits };
    }

    const haystack = `${statute.title} ${statute.text} ${(statute.triggers || []).join(' ')}`.toLowerCase();

    for (const tok of tokens) {
        const triggerMatch = (statute.triggers || []).some(
            (t) => t.toLowerCase().includes(tok) || tok.includes(t.toLowerCase())
        );
        if (triggerMatch) {
            score += 3;
            triggerHits++;
        } else if (haystack.includes(tok)) {
            score += 1;
        }
    }

    return { score, triggerHits, negHits };
}

/**
 * Retrieve matching BNS/BNSS sections for a given narrative.
 * Uses minScore per statute + Bhashini colloquial boost to prevent weak matches
 * while catching vernacular phrasing (mar-peet, dhamki, gali-galoch, etc.).
 */
export function retrieveSections(narrative, topK = 4) {
    const statutesList = getLoadedStatutes();
    const tokens = tokenize(narrative);
    const lowerText = (narrative || '').toLowerCase();
    const bhashini = normalizeWithBhashini(narrative || '');
    const suggestedSet = new Set(bhashini.suggestedSections || []);

    const scored = statutesList
        .map((s) => {
            const { score, triggerHits, negHits } = scoreStatute(s, tokens, lowerText);
            let finalScore = score;
            let finalTriggerHits = triggerHits;
            const bhashiniBoost = suggestedSet.has(String(s.section));
            if (bhashiniBoost) {
                finalScore += 4;
                finalTriggerHits += 1;
            }
            const effectiveMinScore = s.minScore || 4;
            return {
                statute: s,
                score: finalScore,
                triggerHits: finalTriggerHits,
                negHits,
                bhashiniBoost,
                bhashiniConcepts: bhashini.normalizedConcepts || [],
                source: s.source || STATUTE_METADATA.officialSources[0],
                confidence: finalScore > 8 ? 'high' : finalScore > 5 ? 'medium' : 'low',
                meetsThreshold: finalScore >= effectiveMinScore && finalTriggerHits >= 1
            };
        })
        .filter((r) => r.meetsThreshold)
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);

    return scored;
}

export function getBhashiniNormalization(narrative) {
    return normalizeWithBhashini(narrative || '');
}

/**
 * Sync statutory corpus from a remote verified JSON feed.
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
        throw new Error('Invalid statute schema.');
    } catch (err) {
        console.warn('Remote sync error, using local corpus:', err);
        return { success: false, error: err.message };
    }
}

export { STATUTE_METADATA, getLoadedStatutes, saveDynamicStatutes, resetToDefaultStatutes, BASE_STATUTES };
