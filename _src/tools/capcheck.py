import re,sys,glob
BAD_END = re.compile(r"(\s[=≤≥<>≈·×/+−±→:]|\(|\(pl\.|\bpl\.|\bkb\.|\bill\.|\bún\.|\s(a|az|s|e|egy|és|A|Az|Egy)|\b(kedvező|kedvezőtlen|esetleges|passzív|aktív|tervezési|karakterisztikus|parciális|általános|belső|hasznos|drénezetlen|saját|új|régi|nagy|kis)|\d)$")
BAD_START = re.compile(r"^([=≤≥<>≈·×/+−±→]|kN|kPa|m\b|m²|m³|°|%|esetleges\b|teher\b|földellenállás|érték|tényező|állékonyság)")
for f in sorted(glob.glob('videos/s*/script.js')):
    s=open(f).read()
    for m in re.finditer(r"\[\s*'((?:[^'\\]|\\.)*)',\s*'((?:[^'\\]|\\.)*)'\s*\]", s):
        a,b=m.group(1).strip(),m.group(2).strip()
        sa=re.sub(r'[*_{}]','',a); sb=re.sub(r'[*_{}]','',b)
        if BAD_END.search(sa) or BAD_START.search(sb):
            print(f.split('/')[1], '|', a, '||', b)
