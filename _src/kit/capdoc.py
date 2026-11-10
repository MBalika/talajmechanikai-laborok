# Feliratok kigyűjtése a script.js-ből forgatókönyv-összefoglalóhoz
# python3 kit/capdoc.py <video_dir> "<cím>" <fájlnév.html> [megjegyzés]
import re, sys, json, os
d, title, fname = sys.argv[1], sys.argv[2], sys.argv[3]
note = sys.argv[4] if len(sys.argv) > 4 else ''
tl = open(os.path.join(d, 'timeline.js')).read()
bpm = float(re.search(r'BPM = ([\d.]+)', tl).group(1)); endb = float(re.search(r'END_BAR = ([\d.]+)', tl).group(1))
tot = endb * 240 / bpm + 2
mj = json.load(open(os.path.join(d, 'music.json')))
out = [f"## {title}  (~{int(tot // 60)}:{int(round(tot % 60)):02d}, {mj.get('genre')} {bpm:g} BPM)", f"Fájl: `…\\Claude videók\\Munkaterhatarolas_v2\\{fname}`", '']
if note: out += [f"*{note}*", '']
for line in open(os.path.join(d, 'script.js')):
    m = re.match(r"^\s*\[B_?\(([\d.]+)(?:,\s*([\d.]+))?\),\s*B_?\(([\d.]+)(?:,\s*([\d.]+))?\),\s*'([^']*)',\s*\[(.*)\]\]", line)
    if not m: continue
    b0 = float(m.group(1)); b1 = float(m.group(3)); kick = m.group(5)
    qs = [q.replace('*', '') for q in re.findall(r"'((?:[^'\\]|\\.)*)'", m.group(6))]
    out.append(f"- **{kick}** (ütem {b0:g}–{b1:g}): " + ' '.join(qs))
print('\n'.join(out) + '\n')
