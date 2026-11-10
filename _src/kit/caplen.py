import re,sys
for f in sys.argv[1:]:
    n0=0
    for line in open(f):
        m=re.match(r"^\s*\[B\(.*?,\s*'[^']*',\s*\[(.*)\]\]", line)
        if not m: continue
        for q in re.findall(r"'((?:[^'\\]|\\.)*)'", m.group(1)):
            n0+=1; n=len(q.replace('*',''))
            if n>80: print(f, n, q)
    print(f, 'lines', n0)
