// Nyaya-Setu CPGRAMS-compatible structured export (prototype).
// Produces a reviewable JSON envelope a kiosk operator can paste/attach to
// CPGRAMS / State Police portals. Does NOT auto-file anything.
import { STATUTE_METADATA } from '../data/statutes.js';

export function toCPGRAMSSchema(complainantInfo = {}, entities = {}, retrieved = [], uiLanguage = 'en') {
    const now = new Date().toISOString();
    return {
        schema: 'nyaya-setu/cpgrams-draft/v0.4',
        createdAt: now,
        language: (uiLanguage || 'en').toLowerCase(),
        complainant: {
            name: complainantInfo.name || entities.complainantName || '',
            parentName: complainantInfo.parent || entities.parentName || '',
            phone: complainantInfo.phone || '',
            address: complainantInfo.address || '',
            policeStation: complainantInfo.station || '',
            incidentLocation: complainantInfo.location || entities.location || '',
            incidentDate: complainantInfo.date || entities.date || ''
        },
        grievance: {
            narrative: complainantInfo.narrative || entities.summary || '',
            category: entities.category || 'needs_human_review',
            accused: complainantInfo.accused || entities.aggressor || ''
        },
        suggestedProvisions: (retrieved || []).map(({ statute, confidence, score, bhashiniBoost }) => ({
            code: statute.code,
            section: statute.section,
            title: statute.title,
            confidence: confidence || 'low',
            score: score ?? null,
            bhashiniBoost: !!bhashiniBoost,
            source: statute.source || 'https://www.indiacode.nic.in/'
        })),
        provenance: {
            corpusVersion: STATUTE_METADATA.version,
            corpusKind: STATUTE_METADATA.corpusKind,
            retrievalMethod: STATUTE_METADATA.retrievalMethod,
            curatedSections: STATUTE_METADATA.curatedSections,
            officialSources: STATUTE_METADATA.officialSources
        },
        disclaimers: [
            'Computer-assisted draft only; not legal advice; not an FIR.',
            'Verify facts and provisions against https://www.indiacode.nic.in/ before submission.',
            'Free legal aid: NALSA 15100. Emergency: 112.'
        ]
    };
}

export function downloadCPGRAMSJson(obj) {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nyaya-setu-cpgrams-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 500);
}
