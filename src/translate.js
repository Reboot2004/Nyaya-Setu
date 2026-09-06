// Nyaya-Setu dynamic translation — zero new model weights.
// Why no NMT bundle: the only browser-ready all-Indic translator (NLLB-200-600M)
// is 1.5GB+ even quantized — impossible for tabs and mobile data. Instead:
//  1. Llama-3.2-1B (already auto-downloaded for extraction) translates short
//     grievance gists on-device where WebGPU exists.
//  2. Everywhere else, an offline 2KB gloss bundle turns detected Bhashini
//     concepts into a readable gist. Original text is always kept alongside,
//     and the citizen review gate verifies before export.
import { ensureEngine, isWebGPUSupported, isAIAssistEnabled } from './llm.js';
import { normalizeWithBhashini } from '../data/bhashini_lexicon.js';

const LANG_NAMES = { en: 'English', hi: 'Hindi', te: 'Telugu', ta: 'Tamil', bn: 'Bengali', mr: 'Marathi', kn: 'Kannada', ml: 'Malayalam' };

// Offline gloss bundle: canonical concept -> one-line gist (en/hi/te + en fallback).
// Covers all 12 Bhashini lexicon canonicals; runs on every device, no download.
export const CONCEPT_GLOSS = {
    assault_hurt: {
        en: 'Physical assault reported (beating/hurt).',
        hi: 'मारपीट की शिकायत है।',
        te: 'దాడి/గాయం జరిగినట్లు ఫిర్యాదు.'
    },
    criminal_intimidation: {
        en: 'Criminal threats/intimidation reported.',
        hi: 'धमकी की शिकायत है।',
        te: 'బెదిరింపుల ఫిర్యాదు ఉంది.'
    },
    intentional_insult: {
        en: 'Verbal abuse and insults reported.',
        hi: 'गाली-गलौज की शिकायत है।',
        te: 'దూషణల ఫిర్యాదు ఉంది.'
    },
    theft: {
        en: 'Theft reported (belongings stolen).',
        hi: 'चोरी की शिकायत है।',
        te: 'దొంగతనం ఫిర్యాదు ఉంది.'
    },
    extortion: {
        en: 'Extortion reported (forced money demand).',
        hi: 'जबरन वसूली (हफ्ता/रंगदारी) की शिकायत है।',
        te: 'బలవంతపు డబ్బు వసూలు ఫిర్యాదు ఉంది.'
    },
    cheating_fraud: {
        en: 'Fraud/cheating reported (money taken by deceit).',
        hi: 'धोखाधड़ी की शिकायत है।',
        te: 'మోసం ఫిర్యాదు ఉంది.'
    },
    breach_of_trust: {
        en: 'Breach of trust reported (entrusted money/property kept back).',
        hi: 'अमानत में खयानत की शिकायत है।',
        te: 'నమ్మకద్రోహం ఫిర్యాదు ఉంది.'
    },
    forgery: {
        en: 'Forgery reported (fake documents/signatures).',
        hi: 'जाली दस्तावेज़ की शिकायत है।',
        te: 'నకిలీ పత్రాల ఫిర్యాదు ఉంది.'
    },
    women_harassment: {
        en: 'Harassment of a woman reported (eve-teasing/stalking).',
        hi: 'महिला उत्पीड़न की शिकायत है।',
        te: 'మహిళా వేధింపుల ఫిర్యాదు ఉంది.'
    },
    dowry_domestic_cruelty: {
        en: 'Domestic cruelty / dowry harassment reported.',
        hi: 'घरेलू हिंसा / दहेज उत्पीड़न की शिकायत है।',
        te: 'గృహహింస / వరకట్న వేధింపుల ఫిర్యాదు ఉంది.'
    },
    criminal_trespass_encroachment: {
        en: 'Land/house encroachment reported.',
        hi: 'जमीन/घर पर कब्जे की शिकायत है।',
        te: 'భూ ఆక్రమణ ఫిర్యాదు ఉంది.'
    },
    police_fir_refusal: {
        en: 'Police reportedly refused to register the complaint.',
        hi: 'पुलिस द्वारा शिकायत दर्ज न करने की बात है।',
        te: 'పోలీసులు ఫిర్యాదు తీసుకోలేదని పేర్కొన్నారు.'
    }
};

// Offline gist from detected concepts. Returns null when nothing detected.
export function glossNarrative(narrative, targetLang = 'en') {
    const { normalizedConcepts } = normalizeWithBhashini(narrative || '');
    if (!normalizedConcepts.length) return null;
    const l = (targetLang || 'en').toLowerCase();
    const lines = normalizedConcepts
        .map((c) => CONCEPT_GLOSS[c]?.[l] || CONCEPT_GLOSS[c]?.en)
        .filter(Boolean);
    if (!lines.length) return null;
    return { text: lines.join(' '), source: 'gloss-bundle', concepts: normalizedConcepts };
}

function withTimeout(promise, ms) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('translate-timeout')), ms))
    ]);
}

// Dynamic gist translation via on-device Llama. Falls back: gloss bundle, then original.
export async function translateGist(text, fromLang = 'auto', toLang = 'en', timeoutMs = 25000) {
    const value = (text || '').trim();
    const from = (fromLang || 'auto').toLowerCase();
    const to = (toLang || 'en').toLowerCase();
    if (!value) return { text: '', source: 'empty' };
    if (from === to) return { text: value, source: 'original' };
    if (!isAIAssistEnabled() || !isWebGPUSupported()) {
        return glossNarrative(value, to) || { text: value, source: 'original' };
    }
    try {
        const eng = await withTimeout(ensureEngine(), timeoutMs);
        const fromName = LANG_NAMES[from] || 'the citizen’s language';
        const toName = LANG_NAMES[to] || 'English';
        const reply = await withTimeout(eng.chat.completions.create({
            messages: [
                { role: 'system', content: `Translate the citizen grievance from ${fromName} to ${toName}. Reply with ONLY the translation, no quotes, no explanation, no extra sentences.` },
                { role: 'user', content: value.slice(0, 600) }
            ],
            temperature: 0.1,
            max_tokens: 350
        }), timeoutMs);
        let out = (reply.choices[0]?.message?.content || '').trim().replace(/^["'`\s]+|["'`\s]+$/g, '');
        // validation: non-empty, not JSON, sane length, not a bare echo of the prompt
        if (!out || out.length < 3 || /^[{[].*[}\]]$/.test(out) || out.length > value.length * 4 + 50) {
            throw new Error('bad-translation');
        }
        return { text: out, source: 'llama-3.2-1b' };
    } catch {
        return glossNarrative(value, to) || { text: value, source: 'original' };
    }
}
