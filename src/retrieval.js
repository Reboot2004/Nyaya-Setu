// Statute retrieval with relevance scoring + in-house dialect-phrase normalization.
// Optional: Bhashini NMT translation for better English-title matching (online, credential-gated).
// Official sources: https://www.indiacode.nic.in/ | https://www.aikosh.in/
import { getLoadedStatutes, STATUTE_METADATA, saveDynamicStatutes, resetToDefaultStatutes, BASE_STATUTES } from '../data/statutes.js';
import { normalizeWithBhashini } from '../data/bhashini_lexicon.js';
import { translateToEnglish, detectSourceLang, getCachedTranslation, setCachedTranslation, getLastHash } from './bhashini.js';

const HINDI_STOP = new Set(['है', 'था', 'थी', 'हैं', 'के', 'की', 'का', 'को', 'ने', 'से', 'में', 'पर', 'और', 'या', 'लेकिन', 'मैं', 'मेरा', 'मेरी', 'मुझे', 'उसने', 'वह', 'वे', 'यह', 'इस', 'उस', 'जो', 'तो', 'भी', 'ही', 'अब', 'कि', 'एक']);
const EN_STOP = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'my', 'me', 'i', 'was', 'is', 'he', 'she', 'they', 'his', 'her', 'at', 'by', 'for', 'with', 'from', 'it', 'this', 'that', 'mera', 'meri', 'mere', 'ko', 'ne', 'ka', 'ki', 'ke', 'aur', 'par', 'se',
    // filler verbs/nouns that pollute scoring on tabs
    'very', 'bad', 'badly', 'please', 'give', 'justice', 'support', 'people', 'person', 'things', 'something', 'anything', 'money']);
// Minimal stop sets so Telugu/Tamil/Bengali/Marathi/Kannada/Malayalam narratives aren't polluted
const TE_STOP = new Set(['నా', 'మరియు', 'లో', 'కోసం', 'అని', 'ఈ', 'ఆ', 'వారు', 'చేశారు', 'ఉంది', 'ఉన్నారు']);
const TA_STOP = new Set(['என்', 'மற்றும்', 'இல்', 'என்று', 'இந்த', 'அந்த', 'அவர்']);
const BN_STOP = new Set(['আমার', 'এবং', 'এর', 'থেকে', 'এই', 'সেই']);
const MR_STOP = new Set(['माझे', 'आणि', 'मध्ये', 'हे', 'ते']);
const KN_STOP = new Set(['ನನ್ನ', 'ಮತ್ತು', 'ದಲ್ಲಿ', 'ಈ', 'ಆ']);
const ML_STOP = new Set(['എന്റെ', 'ഒപ്പം', 'ൽ', 'ഈ', 'ആ']);
const ALL_STOP = new Set([...EN_STOP, ...HINDI_STOP, ...TE_STOP, ...TA_STOP, ...BN_STOP, ...MR_STOP, ...KN_STOP, ...ML_STOP]);

// edit-distance-1 fuzzy match for latin tokens >=5 chars (typo tolerance:
// threatene→threatened, farud→fraud incl. adjacent transpositions). Cheap on tabs.
function fuzzyHit(a, b) {
    if (a === b) return true;
    if (!/^[a-z]+$/.test(a) || !/^[a-z]+$/.test(b)) return false;
    if (Math.abs(a.length - b.length) > 1 || a.length < 5) return false;
    // adjacent transposition (Damerau): farud↔fraud
    if (a.length === b.length) {
        let diff = [];
        for (let k = 0; k < a.length; k++) if (a[k] !== b[k]) diff.push(k);
        if (diff.length === 2 && diff[1] === diff[0] + 1 && a[diff[0]] === b[diff[1]] && a[diff[1]] === b[diff[0]]) return true;
    }
    let i = 0, j = 0, edits = 0;
    while (i < a.length && j < b.length) {
        if (a[i] === b[j]) { i++; j++; continue; }
        if (++edits > 1) return false;
        if (a.length === b.length) { i++; j++; }
        else if (a.length > b.length) i++;
        else j++;
    }
    edits += (a.length - i) + (b.length - j);
    return edits <= 1;
}

// rarity weight: precomputed per-trigger document frequency over corpus (computed lazily once)
let dfCache = null;
function docFreq(triggerLower) {
    if (!dfCache) {
        dfCache = new Map();
        try {
            for (const s of getLoadedStatutes()) {
                const seen = new Set();
                for (const t of (s.triggers || [])) {
                    const k = String(t).toLowerCase();
                    if (!seen.has(k)) { seen.add(k); dfCache.set(k, (dfCache.get(k) || 0) + 1); }
                }
            }
        } catch { /* ignore */ }
    }
    return dfCache.get(triggerLower) || 1;
}
function isCuratedStatute(s) {
    return s?.verified === 'curated';
}

function tokenize(text) {
    // Split on whitespace and punctuation, but preserve complete Indic syllables intact
    return text
        .toLowerCase()
        .split(/[\s,।,.!?;:()\[\]{}"'—–\-\/\\|]+/)
        .map((t) => t.trim())
        .filter((t) => t.length > 1 && !ALL_STOP.has(t));
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
    const matchedTerms = [];
    const tokenSet = new Set(tokens);
    // raw words incl. stopwords: sibling check must see "me" in "kill me"
    const rawSet = new Set(lowerText.split(/[\s,।,.!?;:()\[\]{}"'—–\-\/\\|]+/).map((w) => w.trim()).filter(Boolean));

    for (const tok of tokens) {
        let hit = false;
        let rareBonus = 0;
        for (const t of (statute.triggers || [])) {
            const tl = t.toLowerCase();
            // whole-phrase hit (strong, e.g. "land grab", "dhamki")
            if (tl.includes(tok) || tok.includes(tl)) {
                // guard: mere substring of a long phrase by a short generic token
                // ("work"→"workplace", "kho"→"khoon") must NOT count
                const words = tl.split(/[\s\-/]+/);
                const wholeWord = words.includes(tok);
                // guard: lone common verb from a multi-word trigger ("गया" in "उठा ले गया")
                // counts only if a sibling word of the same trigger is also present
                if (wholeWord && words.length > 1 && tok.length < 5) {
                    const sibling = words.some((w) => w !== tok && w.length >= 2 && (tokenSet.has(w) || rawSet.has(w)));
                    if (sibling) { hit = true; }
                } else {
                    const longSub = Math.min(tok.length, tl.length) >= 8;
                    const wordSub = words.some((w) => w.length >= 5 && (w.includes(tok) && tok.length >= 5 || tok.includes(w) && w.length >= 5));
                    if (wholeWord || longSub || wordSub) { hit = true; }
                }
            }
            if (!hit && (fuzzyHit(tok, tl) || fuzzyHit(tl, tok))) { hit = true; }
            if (!hit) {
                // word-level fuzzy for multi-word triggers
                const words = tl.split(/[\s\-/]+/);
                for (const w of words) {
                    if (w.length >= 5 && tok.length >= 5 && fuzzyHit(tok, w)) { hit = true; break; }
                }
            }
            if (hit) {
                // rarity bonus: distinctive triggers (drugged, kabza) outrank generic ones
                const df = docFreq(tl);
                rareBonus = Math.max(rareBonus, df <= 2 ? 2 : df <= 6 ? 1 : 0);
                break;
            }
        }
        if (hit) {
            score += 3 + rareBonus;
            triggerHits++;
            if (matchedTerms.length < 6) matchedTerms.push(tok);
        } else if (haystack.includes(tok)) {
            score += 1;
        }
    }

    return { score, triggerHits, negHits, matchedTerms };
}

/**
 * Retrieve matching BNS/BNSS sections for a given narrative.
 * Uses minScore per statute + dialect-phrase colloquial boost + optional Bhashini NMT.
 */
export async function retrieveSections(narrative, topK = 4) {
    const statutesList = getLoadedStatutes();
    const tokens = tokenize(narrative);
    const lowerText = (narrative || '').toLowerCase();
    const bhashini = normalizeWithBhashini(narrative || '');
    const suggestedSet = new Set(bhashini.suggestedSections || []);

    // Optional translation: translate to English for better title matching.
    let translatedTokens = null;
    if (narrative && narrative.trim().length > 10) {
        try {
            const narrHash = narrative.trim().slice(0, 100);
            const cached = getCachedTranslation();
            if (cached.translated && getLastHash() === narrHash) {
                translatedTokens = tokenize(cached.translated);
            } else {
                const srcLang = detectSourceLang(narrative);
                if (srcLang !== 'en') {
                    const { translated } = await translateToEnglish(narrative, srcLang);
                    if (translated) {
                        translatedTokens = tokenize(translated);
                        setCachedTranslation(translated, srcLang, narrHash);
                    }
                }
            }
        } catch { /* translation unavailable — fall through to lexical-only */ }
    }

    const scored = statutesList
        .map((s) => {
            const { score, triggerHits, negHits, matchedTerms } = scoreStatute(s, tokens, lowerText);
            let finalScore = score;
            let finalTriggerHits = triggerHits;

            const bhashiniBoost = suggestedSet.has(String(s.section));
            if (bhashiniBoost) {
                finalScore += 4;
                finalTriggerHits += 1;
            }
            const effectiveMinScore = s.minScore || 4;
            // Confidence is based on base score only (not translation boost).
            const confidence = finalScore > 8 ? 'high' : finalScore > 5 ? 'medium' : 'low';

            // Translation boost: small bonus for ranking only, does NOT affect confidence.
            let translationBoost = 0;
            if (translatedTokens) {
                for (const tok of translatedTokens) {
                    const haystack = `${s.title} ${(s.triggers || []).join(' ')}`.toLowerCase();
                    if (haystack.includes(tok) && !tokens.includes(tok)) {
                        translationBoost += 1;
                    }
                }
            }

            return {
                statute: s,
                score: finalScore + translationBoost,
                triggerHits: finalTriggerHits,
                negHits,
                matchedTerms,
                bhashiniBoost,
                bhashiniConcepts: bhashini.normalizedConcepts || [],
                curated: isCuratedStatute(s),
                source: s.source || STATUTE_METADATA.officialSources[0],
                confidence,
                meetsThreshold: finalScore >= effectiveMinScore && finalTriggerHits >= 1
            };
        })
        .filter((r) => r.meetsThreshold)
        .sort((a, b) => ((b.curated ? 1 : 0) - (a.curated ? 1 : 0)) || (b.score - a.score));
    const seen = new Set();
    const deduped = [];
    for (const r of scored) {
        const key = String(r.statute.section);
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(r);
        if (deduped.length >= topK) break;
    }

    return deduped;
}

export function getBhashiniNormalization(narrative) {
    return normalizeWithBhashini(narrative || '');
}

export { STATUTE_METADATA, getLoadedStatutes, saveDynamicStatutes, resetToDefaultStatutes, BASE_STATUTES };
