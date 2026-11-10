# Forgatókönyv-dokumentum a readload mérés képernyőszövegeiből (négyütemes szakaszonként)
import json, re, sys
V = [
 ('s1', '1. Elcsúszás az alapsíkon', 'electro', '1_Elcsuszas_video.html', 'https://claude.ai/artifact/SGXVFXh6X925948JRJ9vm3',
  'Szögtámfal, földnyomás; δ = φ′cv (monolit) vagy ⅔φ′cv (előregyártott); drénezetlen 0,4·Vd korlát; Rp;d csak ½–⅔; munkaárok ásása kotrógéppel (az Rp;d eltűnése); Austin-gát 1911.'),
 ('s2', '2. Felborulás és külpontosság', 'afro', '2_Felborulas_video.html', 'https://claude.ai/artifact/6zkmjCp8tYKhJP7vEAV133',
  'Reklámtábla 6×3 m, 8 m oszlop, 3×3 m alap; EQU 1,1/0,9/1,5; forgáspont kőzeten sarok, talajon B/10; B/6 (régi) és B/3 / 0,6r; hasznos alapfelület; szélerőmű-példa (e = 6,7 m < 0,59·R).'),
 ('s3', '3. Felúszás', 'futurebass', '3_Feluszas_video.html', 'https://claude.ai/artifact/XrJ28awua2kLQst3k1Kf1x',
  'Mélygarázs 30×15×6 m; UPL 1,00/0,90/1,50/0; oldalfal-súrlódás, Td ≈ 2620 kN; zárókép: önsúly + leterhelés + horgony + falsúrlódás ≥ felhajtóerő; a) túlnyújtás b) mikrocölöpök c) leszívás d) elárasztás; Kossuth tér 2013.'),
 ('s4', '4. Általános állékonyság', 'dubstep', '4_Altalanos_allekonysag_video.html', 'https://claude.ai/artifact/JMVzEK7JDRBJZq5mTwD57G',
  'Löszrézsű 8 m, 1:1,5, ház két sávalappal (a megoldásoknál H/3-ra hátrébb kerül); egyszerűsített Bishop, DA-3 (γφ = γc = 1,35); megfigyelési módszer; Kulcs 2011, Dunaszekcső 2008, Hongkong 1972.'),
 ('s5', '5. Összefoglaló és kvíz', 'chiptune', '5_Osszefoglalo_kviz_video.html', 'https://claude.ai/artifact/4UCLzDTNw29rTmorZBeUJE',
  'Kitalált folyóparti lakópark: üres esővíztározó (felúszás), szögtámfal (elcsúszás), reklámpilon a teraszon (felborulás), ház a löszparton (általános állékonyság); tényezőtábla, DA-1/2*/3, EQU/UPL/HYD; négy kvízkérdés (kérdés és válaszok 3 ütemig, megoldás 2 ütem).'),
]
out = []
for key, title, genre, fname, art, note in V:
    d = json.load(open(f'qa/read/{key}_final.json')); bpm = d['bpm']; BAR = 240 / bpm; tot = d['total']
    out += [f"## {title}  (~{int(tot // 60)}:{int(round(tot % 60)):02d}, {genre} {bpm:g} BPM, átlag {sum(i['n'] for i in d['items']) / tot:.1f} kar/s)",
            f"Fájl: `…\\Claude videók\\Stabilitas\\{fname}`", f"Artifact: {art}", '', f"*{note}*", '']
    seg = {}
    for it in d['items']:
        t = it['txt'].strip()
        if len(re.sub(r'\W', '', t)) < 3 or re.fullmatch(r'[\d\s,.%✓✗×−–-]+', t): continue
        k = int(it['t0'] / BAR // 4) * 4
        L = seg.setdefault(k, [])
        if t not in L: L.append(t)
    for k in sorted(seg):
        out.append(f"- **ütem {k}–{k + 4}:** " + ' · '.join(seg[k]))
    out.append('')
print('\n'.join(out))
