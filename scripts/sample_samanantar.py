"""Vendor a small, honest Samanantar sample for Nyaya-Setu's dialect lexicon work.
Streams ai4bharat/samanantar (CC-BY-NC-4.0, IIT-Madras AI4Bharat) per language,
keeps short pairs, prioritizing offence-relevant English sides.
Output: data/samanantar_sample.json (source + license + retrieval date recorded).
"""
import json
import datetime
from datasets import load_dataset

LANGS = ['hi', 'te', 'ta', 'bn', 'mr', 'kn', 'ml']
OFFENCE_WORDS = [
    'hit', 'beat', 'threat', 'cheat', 'fraud', 'stole', 'theft', 'rob', 'attack',
    'kill', 'murder', 'assault', 'abuse', 'stalk', 'rape', 'dowry', 'bribe',
    'kidnap', 'land', 'police', 'wage', 'money', 'stab', 'weapon', 'complaint',
    'thief', 'robbery', 'harass', 'molest', 'accident', 'quarrel', 'fight',
]
PER_LANG_TARGET = 400
PER_LANG_GENERAL = 100
MAX_ROWS_SCAN = 80000

out = {
    'source': 'ai4bharat/samanantar (https://huggingface.co/datasets/ai4bharat/samanantar)',
    'license': 'CC-BY-NC-4.0 (see dataset card; packaging per AI4Bharat note)',
    'paper': 'Ramesh et al., TACL 2022 (Samanantar)',
    'retrievedAt': datetime.date.today().isoformat(),
    'note': 'Short-pair sample for dialect-phrase mining. Not shipped to the app bundle raw; vetted phrases are curated into data/bhashini_lexicon.js with provenance.',
    'pairs': [],
}


def relevant(en):
    el = en.lower()
    return any(w in el for w in OFFENCE_WORDS)


for lang in LANGS:
    print(f'--- {lang} ---', flush=True)
    ds = load_dataset('ai4bharat/samanantar', lang, split='train', streaming=True)
    kept_rel, kept_gen, seen = [], [], 0
    for row in ds:
        seen += 1
        if seen > MAX_ROWS_SCAN:
            break
        en = (row.get('src') or '').strip()
        tx = (row.get('tgt') or '').strip()
        if not en or not tx:
            continue
        if len(en.split()) > 25 or len(tx) > 220:
            continue
        item = {'lang': lang, 'en': en, 'text': tx}
        if relevant(en) and len(kept_rel) < PER_LANG_TARGET - PER_LANG_GENERAL:
            kept_rel.append(item)
        elif len(kept_gen) < PER_LANG_GENERAL and seen % 7 == 0:
            kept_gen.append(item)
        if len(kept_rel) + len(kept_gen) >= PER_LANG_TARGET:
            break
    print(f'kept {len(kept_rel)} relevant + {len(kept_gen)} general (scanned {seen})', flush=True)
    out['pairs'].extend(kept_rel + kept_gen)

with open('data/samanantar_sample.json', 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, indent=1)
print(f"TOTAL {len(out['pairs'])} pairs -> data/samanantar_sample.json")
