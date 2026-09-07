"""Fetch official section titles + citizen-length explanations from indialawacts.in
(BNS/BNSS/BSA bare-act pages; text mirrors the official Gazette arrangement).
Output: data/official_sections.json { BNS: {sec: {title, text, chapter}}, ... }
with source URLs + retrieval date. Re-run to refresh; generator consumes it.
"""
import json
import re
import html
import datetime
import requests

UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'}
PAGES = {
    'BNS': 'https://indialawacts.in/bns.php',
    'BNSS': 'https://indialawacts.in/bnss.php',
    'BSA': 'https://indialawacts.in/bsa.php',
}

TAG = re.compile(r'<[^>]+>')


def clean(s):
    s = html.unescape(TAG.sub(' ', s or ''))
    return re.sub(r'\s+', ' ', s).strip()


def parse(page, code):
    print(f'fetching {code} ...', flush=True)
    t = requests.get(PAGES[code], headers=UA, timeout=120).text
    print(f'  {len(t)} chars', flush=True)
    # chapter headings: ## Chapter XX: Name  (in HTML: "Chapter X ..." h2 or strong)
    chapters = [(m.start(), m.group(1).strip(), m.group(2).strip())
                for m in re.finditer(r'Chapter ([IVXLCDM]+|\d+)\s*:\s*([^<\n]{3,120})', t)]
    # section headings: Section N: Title
    heads = [(m.start(), m.group(1), m.group(2).strip())
             for m in re.finditer(r'Section (\d+)\s*:\s*([^<\n]{2,160})', t)]
    print(f'  chapters={len(chapters)} sections={len(heads)}', flush=True)
    out = {}
    for i, (pos, sec, title) in enumerate(heads):
        end = heads[i + 1][0] if i + 1 < len(heads) else len(t)
        span = t[pos:end]
        ch = ''
        for cpos, cnum, cname in chapters:
            if cpos < pos:
                ch = f'Chapter {cnum}: {cname}'
        # first Explanation block in the span = citizen-length summary
        expl = ''
        em = re.search(r'<strong>Explanation</strong>\s*:?\s*(.*?)Source\s*:', span, re.S)
        if em:
            expl = clean(em.group(1))[:600]
        out[sec] = {'title': clean(title)[:160], 'text': expl, 'chapter': ch}
    return out


data = {
    'sources': {k: v for k, v in PAGES.items()},
    'basis': 'Section headings + Explanation summaries mirror the official Gazette arrangement (see also indiacode.nic.in / e-Gazette). Full clause text NOT ingested — verify at https://www.indiacode.nic.in/.',
    'retrievedAt': datetime.date.today().isoformat(),
    'laws': {code: parse(code, code) for code in PAGES},
}
for code, secs in data['laws'].items():
    print(code, len(secs), 'sections')
with open('data/official_sections.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=1)
print('wrote data/official_sections.json')
