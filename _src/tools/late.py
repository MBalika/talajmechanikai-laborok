import json, sys
B = 60 / 110 * 4
for d in sys.argv[1:]:
    j = json.load(open(f'qa/read_{d}.json')); print('==', d)
    for x in j['items']:
        m = min(x['n'], x['late'] * 13)
        if m > 2: print(f"  {x['t0']/B:6.1f}-{x['t1']/B:5.1f} miss {m:5.1f} n{x['n']:3d} st{x['start']/B:6.1f} {x['txt'][:60]!r}")
