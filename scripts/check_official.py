import json
d = json.load(open('data/official_sections.json', encoding='utf-8'))
for code in ['BNS', 'BNSS', 'BSA']:
    chs = {}
    for s, v in d['laws'][code].items():
        chs[v['chapter']] = chs.get(v['chapter'], 0) + 1
    print(code, len(chs), 'distinct chapters')
    for name in sorted(chs)[:40]:
        print('   ', name, chs[name])
for sid in [('BNS', '115'), ('BNS', '303'), ('BNSS', '173'), ('BSA', '63'), ('BSA', '23')]:
    v = d['laws'][sid[0]][sid[1]]
    print(sid, '|', v['chapter'], '|', v['title'], '| textlen', len(v['text']))
print('empty-text count:', sum(1 for c in d['laws'].values() for v in c.values() if not v['text']))
