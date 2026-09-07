import fs from 'fs';
const lines = fs.readFileSync('data/field_study_simulated.csv', 'utf8').split('\n').filter(Boolean);
const head = lines[0].split(',');
const rows = lines.slice(1).map((l) => {
    // simple quoted-CSV split
    const cells = l.match(/("[^"]*"|[^,]+)/g) || [];
    const o = {};
    head.forEach((h, i) => { o[h] = (cells[i] || '').replace(/^"|"$/g, ''); });
    return o;
});
for (const r of rows) {
    if (r.assertPass === 'false') {
        console.log(`${r.persona} | ${r.variant} | acc=${r.accepted} expAcc=${r.expectedAccept} | expHit=${r.expectedHit} | chars=${r.narrativeChars}`);
    }
}
