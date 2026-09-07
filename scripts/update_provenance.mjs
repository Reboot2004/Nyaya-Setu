import fs from 'fs';
import crypto from 'crypto';
const buf = fs.readFileSync('data/statutes.js');
const h = crypto.createHash('sha256').update(buf).digest('hex');
const vbuf = fs.readFileSync('data/statute_vectors.json');
const vh = crypto.createHash('sha256').update(vbuf).digest('hex');
const p = JSON.parse(fs.readFileSync('data/provenance.json', 'utf8'));
p.sha256 = h;
p.sha256_short = h.slice(0, 16);
p.corpusVersion = '0.6-official-titles';
p.totalSlots = 1059;
p.curatedSections = 56;
p.officialSections = 1003;
p.generatedAt = new Date().toISOString().slice(0, 10);
p.vectorIndex = { file: 'data/statute_vectors.json', model: 'Xenova/paraphrase-multilingual-MiniLM-L12-v2', dim: 384, sha256: vh };
p.officialBasis = {
    BNS: 'https://indialawacts.in/bns.php (358 titles + arrangement summaries; Gazette: indiacode.nic.in)',
    BNSS: 'https://indialawacts.in/bnss.php (531 titles + arrangement summaries; Gazette: indiacode.nic.in)',
    BSA: 'https://indialawacts.in/bsa.php (170 titles + arrangement summaries; Gazette: indiacode.nic.in)',
    note: 'Titles + short summaries mirror the official bare-act arrangement. Full clause text NOT ingested. BNS chapter labels in entries are legacy internal tags (BNS chapters were renumbered vs IPC); section numbers + titles verified.',
};
fs.writeFileSync('data/provenance.json', JSON.stringify(p, null, 2));
console.log('provenance', h.slice(0, 16), 'vectors', vh.slice(0, 16));
