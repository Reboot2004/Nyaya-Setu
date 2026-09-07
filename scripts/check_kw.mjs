import fs from 'fs';
const t = fs.readFileSync('src/main_is_actionable.js', 'utf8');
for (const w of ['ಕಳ್ಳತನ', 'ಕದ್ದ', 'घुसून', 'पीक', 'शेतात']) {
    console.log(JSON.stringify(w), t.includes(w));
}
const n = 'ನನ್ನ ಮೊಬೈಲ್ ಕಳ್ಳತನವಾಗಿದೆ.';
console.log('narr includes kw:', ['ಕಳ್ಳತನ', 'ಕದ್ದ'].some((k) => n.includes(k)));
