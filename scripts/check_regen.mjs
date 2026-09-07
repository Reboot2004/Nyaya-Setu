import fs from 'fs';
const t = fs.readFileSync('data/statutes.js', 'utf8');
console.log('RIGHTS:', t.includes('export const RIGHTS_BRIEFING'));
console.log('has BSA-26:', t.includes('"BSA-26"'));
console.log('has BSA-32:', t.includes('"BSA-32"'));
console.log('size MB:', (fs.statSync('data/statutes.js').size / 1048576).toFixed(2));
console.log('has verified curated:', t.includes("verified: 'curated'") || t.includes('"verified": "curated"'));
