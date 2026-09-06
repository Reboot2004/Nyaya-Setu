import { draftComplaint } from '../src/llm.js';

const badEntities = {
    summary: { name: 'Unknown', parentName: 'Unknown', aggressor: '6 people (Zilla head)' },
    complainantName: '"Unknown"',
    parentName: '"Unknown"',
    aggressor: '{"name": "Unknown", "description": "hit me, then drugged me"}',
    date: '{"date": "2023-02-20"}',
    location: '{"place": "Unknown location"}',
    category: 'assault|intimidation|property_fraud|women_safety|procedure',
    events: ['x']
};
const badForm = {
    name: '"Unknown"', parent: '"Unknown"', phone: '', address: '', station: '',
    accused: '{"name": "Unknown", "description": "hit me"}',
    location: '{"place": "Unknown location"}', date: '',
    narrative: 'hit me, then drugged me. 6 people/ zilla head. threatene'
};
const d = await draftComplaint(badForm, badEntities, [], 'en');
const t = d.english;
const leaks = t.match(/\{[^}]*"(name|place|date)"[^}]*\}/g) || [];
console.log('JSON leaks:', leaks.length);
console.log('quoted-Unknown present:', t.includes('"Unknown"'));
console.log('incident-date line:', t.split('\n').find((l) => l.includes('• Date:')));
console.log('accused line:', t.split('\n').find((l) => l.includes('Description:')));
if (leaks.length > 0 || t.includes('"Unknown"')) {
    console.error('FAIL: bleed-through detected');
    process.exit(1);
}
console.log('PASS: no JSON bleed, no quoted Unknown');
