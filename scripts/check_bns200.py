import json
d = json.load(open('data/official_sections.json', encoding='utf-8'))
for s in ['100', '101', '102', '200', '201', '202', '203', '204', '205', '210', '211', '212', '335', '65', '479']:
    v = d['laws']['BNS'].get(s)
    print('BNS-' + s + ':', (v['title'] + ' | ' + v['text'][:90]) if v else 'MISSING')
