# a handcheck JSON-ok összesítése: munkásonként/kezenként a hibák fajtája és ütemtartománya
import json, sys, collections
for n in sys.argv[1:]:
    R = json.load(open(f'qa/hc_{n}.json')); bad = [h for h in R if h['bad']]
    print(f'== {n}: {len(R)} minta, {len(bad)} hibás')
    g = collections.defaultdict(list)
    for h in bad:
        pf = h.get('penF', None)
        tags = [k for k, v in [('miss', h['miss'] > 2.5), ('bend', h['bend'] > 60), ('twist', h['twist'] > 45), ('body', h['body'] > 1),
                                ('pen', h['pen'] > 2 if pf is not None else h['pen'] > 8), ('ujj', pf is not None and pf > 0.4 * max(1, h.get('nF', 1)))] if v]
        if tags: g[(h['w'], h['s'], ','.join(tags))].append(h)
    for k, v in sorted(g.items()):
        bars = [h['bar'] for h in v]; mx = max(v, key=lambda h: (h['bend'] + h['twist'] + 5 * h['pen'] + 3 * h['miss']))
        print(f"   W{k[0]}{k[1]} {k[2]:14s} b{min(bars)}–{max(bars)} ({len(v)})  max: miss {mx['miss']} bend {mx['bend']} twist {mx['twist']} pen {mx['pen']} {mx.get('penF','')} {list(mx['what'].items())[:3]}")
