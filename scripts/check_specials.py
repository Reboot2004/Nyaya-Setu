import json
d = json.load(open('data/official_sections.json', encoding='utf-8'))
SPECIALS = {
    'BNS': ['1', '4', '64', '65', '70', '74', '75', '76', '77', '78', '79', '85', '86', '103', '104', '106', '109', '115', '117', '118', '126', '127', '137', '140', '189', '191', '198', '281', '296', '303', '304', '308', '309', '310', '316', '318', '319', '329', '335', '336', '351', '352', '356'],
    'BNSS': ['35', '37', '144', '173', '175', '176', '479', '480', '530'],
    'BSA': ['23', '32', '63'],
}
MINE = {
    'BNS-104': 'Culpable homicide not amounting to murder',
    'BNS-198': 'Public servant taking bribe',
    'BNS-335': 'Making or possessing counterfeit seal / fraud with intent to commit forgery',
    'BNS-65': 'Punishment for rape in certain cases',
    'BNSS-479': 'Maximum period for detention of undertrial prisoner (Bail)',
    'BSA-32': '(dying declaration entry — actually BSA-26)',
}
for code, secs in SPECIALS.items():
    for s in secs:
        off = d['laws'][code].get(s, {}).get('title', 'MISSING')
        mark = '  <-- CHECK' if s in [k.split('-')[1] for k in MINE if k.startswith(code)] else ''
        print(f'{code}-{s}: official="{off}"{mark}')
