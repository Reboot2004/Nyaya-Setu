import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractEntitiesRuleBased, draftComplaint } from '../src/llm.js';
import { retrieveSections } from '../src/retrieval.js';

describe('E2E Complaint Output Tests', () => {

    const TODAY_IN = new Date().toLocaleDateString('en-IN');

    const LANGUAGES = [
        { code: 'en', label: 'English' },
        { code: 'hi', label: 'Hindi' },
        { code: 'te', label: 'Telugu' },
        { code: 'ta', label: 'Tamil' },
        { code: 'bn', label: 'Bengali' },
        { code: 'mr', label: 'Marathi' },
        { code: 'kn', label: 'Kannada' },
        { code: 'ml', label: 'Malayalam' },
    ];

    const TEST_NARRATIVES = [
        {
            name: 'Assault - English',
            lang: 'en',
            text: 'On 15th August 2025, my neighbor Mohan Singh hit me with a lathi near the market. I was bleeding and had to go to hospital.',
            expectSections: ['115'],
            expectCategory: 'assault',
        },
        {
            name: 'Threat - Hindi',
            lang: 'hi',
            text: 'मेरे पड़ोसी ने मुझे धमकी दी कि वह मुझे जान से मार देगा। उसने कहा कि अगर मैंने पैसे नहीं दिए तो वह मेरा घर जला देगा।',
            expectSections: ['351'],
            expectCategory: 'intimidation',
        },
        {
            name: 'Wage Theft - Hindi',
            lang: 'hi',
            text: 'मजदूरी नहीं दी। तीन महीने से 15000 रुपये रोक लिए।',
            expectSections: ['336'],
            expectCategory: 'property_fraud',
        },
        {
            name: 'Dowry - Telugu',
            lang: 'te',
            text: 'నా అత్తమామలు నన్ను దహేజం కోసం చిత్రహింస చేశారు. నన్ను భోజనం చేయనివ్వలేదు.',
            expectSections: ['85'],
            expectCategory: 'women_safety',
        },
    ];

    const COMPLAINANT = {
        name: 'Test User',
        parent: 'S/o Test Father',
        address: '123 Test Street',
        phone: '9876543210',
    };

    for (const tc of TEST_NARRATIVES) {
        it(`${tc.name} — complaint has date, sections, category`, async () => {
            const entities = extractEntitiesRuleBased(tc.text, tc.lang);
            const retrieved = await retrieveSections(tc.text, 5);

            const retrievedSections = retrieved.map((r) => r.statute.section);
            for (const es of (tc.expectSections || [])) {
                assert.ok(retrievedSections.includes(es),
                    `Retrieval missing section ${es}, got: ${retrievedSections.join(',')}`);
            }

            const complaint = await draftComplaint(COMPLAINANT, entities, retrieved, tc.lang);
            const native = complaint.native;
            const english = complaint.english;

            assert.ok(native.includes(TODAY_IN) || english.includes(TODAY_IN),
                `Complaint must contain today's date (${TODAY_IN}). Got: ${native.slice(-200)}`);

            assert.ok(native.includes('Test User') || english.includes('Test User'),
                'Complaint must contain complainant name');

            for (const es of (tc.expectSections || [])) {
                assert.ok(native.includes(es) || english.includes(es),
                    `Complaint must mention section ${es}`);
            }

            const catLabels = {
                assault: ['Physical assault', 'assault', 'హల్లె', 'హత్య'],
                intimidation: ['Criminal intimidation', 'threat', 'धमकी', 'ధమకి', 'బెదరికె'],
                property_fraud: ['Property fraud', 'property', 'धोखाधड़ी', 'संपत्ति', 'మోసం', 'వంచన'],
                women_safety: ['Offence against woman', 'woman', 'dowry', 'మహిళ', 'వధు', 'మహిళె'],
            };
            if (tc.expectCategory) {
                const labels = catLabels[tc.expectCategory] || [];
                const hasCat = labels.some((l) => native.includes(l) || english.includes(l));
                assert.ok(hasCat, `Complaint must mention category "${tc.expectCategory}"`);
            }

            assert.ok(native.length > 200, `Complaint too short: ${native.length} chars`);
        });
    }

    it('Complaint has all required structural fields', async () => {
        const entities = extractEntitiesRuleBased(
            'On 15th August 2025, my neighbor Mohan Singh hit me with a lathi near the market.',
            'en'
        );
        const retrieved = await retrieveSections(
            'On 15th August 2025, my neighbor Mohan Singh hit me with a lathi near the market.',
            5
        );
        const complaint = await draftComplaint(
            { name: 'Rahul Kumar', parent: 'S/o Ram Kumar', address: 'Delhi', phone: '9876543210' },
            entities, retrieved, 'en'
        );
        const text = complaint.english;
        assert.ok(text.includes('To,'), 'Missing "To," header');
        assert.ok(text.includes('Police Station'), 'Missing "Police Station"');
        assert.ok(text.includes('Subject:'), 'Missing Subject line');
        assert.ok(text.includes('FIR'), 'Missing FIR reference');
        assert.ok(text.includes('Relevant legal sections'), 'Missing sections heading');
        assert.ok(text.includes('Request'), 'Missing request section');
        assert.ok(text.includes('Signature'), 'Missing signature field');
        assert.ok(text.includes('Rahul Kumar'), 'Missing complainant name');
    });

    it('All 8 languages produce valid complaint structure', async () => {
        const entities = extractEntitiesRuleBased('My neighbor threatened to kill me.', 'en');
        const retrieved = await retrieveSections('My neighbor threatened to kill me.', 5);

        for (const lang of LANGUAGES) {
            const complaint = await draftComplaint(
                { name: 'Test User', parent: '', address: '', phone: '' },
                entities, retrieved, lang.code
            );
            const text = complaint.native;
            assert.ok(text.length > 150,
                `${lang.label} complaint too short: ${text.length} chars`);
            assert.ok(text.includes(TODAY_IN),
                `${lang.label} complaint missing today's date (${TODAY_IN}). Got: ${text.slice(-200)}`);
            assert.ok(text.includes('Test User'),
                `${lang.label} complaint missing complainant name`);
        }
    });

    it('Complaint sections come from retrieval only (no invented sections)', async () => {
        const entities = extractEntitiesRuleBased('My neighbor threatened to kill me.', 'en');
        const retrieved = await retrieveSections('My neighbor threatened to kill me.', 5);
        const complaint = await draftComplaint(
            { name: 'Test User' }, entities, retrieved, 'en'
        );
        const text = complaint.english;
        const sectionMatches = text.match(/BNS-\d+/gi) || [];
        const retrievedCodes = retrieved.map((r) => `${r.statute.code}-${r.statute.section}`);
        for (const sec of sectionMatches) {
            assert.ok(retrievedCodes.some((rc) => rc.toLowerCase() === sec.toLowerCase()),
                `Section ${sec} in complaint but not in retrieval results`);
        }
    });
});
