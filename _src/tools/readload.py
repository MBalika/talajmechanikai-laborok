# Olvashatóság-mérés: a videó minden képkockáján rögzíti a kirajzolt szöveget (sorokra csoportosítva),
# majd egy R karakter/másodperc sebességű „olvasót” szimulál.
# usage: python3 tools/readload.py <html> <BPM> [R=13] [dt=0.2] [json_out]
import asyncio, sys, json, re, os
from playwright.async_api import async_playwright

html = os.path.abspath(sys.argv[1]); BPM = float(sys.argv[2])
R = float(sys.argv[3]) if len(sys.argv) > 3 else 13.0
DT = float(sys.argv[4]) if len(sys.argv) > 4 else 0.2
OUT = sys.argv[5] if len(sys.argv) > 5 else None
BAR = 4 * 60 / BPM

INIT = r"""
(() => {
  for (const P of [WebGLRenderingContext.prototype, WebGL2RenderingContext.prototype]) {
    for (const k of ['drawArrays','drawElements','drawArraysInstanced','drawElementsInstanced','drawRangeElements','clear','blitFramebuffer']) if (P[k]) P[k] = function(){};
  }
  window.__rec = null;
  window.__hook = () => {
    const c = document.getElementById('c2d').getContext('2d'); if (c.__hooked) return; c.__hooked = true;
    const f = c.fillText;
    c.fillText = function(s, x, y, ...r) {
      if (window.__rec) { const m = this.getTransform(); const fs = +((/(\d+(?:\.\d+)?)px/.exec(this.font) || [0, 16])[1]); const al = this.textAlign; let w = 0; try { w = CanvasRenderingContext2D.prototype.measureText.call(this, String(s)).width; } catch (e) {} let x0 = x; if (al === 'center') x0 = x - w / 2; else if (al === 'right' || al === 'end') x0 = x - w; window.__rec.push([String(s), this.globalAlpha, fs * m.a, Math.round(m.a*x0 + m.c*y + m.e), Math.round(m.b*x0 + m.d*y + m.f), w * m.a]); }
      return f.call(this, s, x, y, ...r);
    };
  };
})();
"""

def clean(s):
    return re.sub(r'[_{}]', '', s).replace(' ', ' ').replace('⁠', '').replace('‑', '-').replace(' ', ' ').strip()

async def capture():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width': 960, 'height': 540})
        await pg.add_init_script(INIT)
        pg.set_default_timeout(300000)
        await pg.goto('file://' + html + '?render')
        await pg.wait_for_function('window.ready === true || window.initError', timeout=300000)
        err = await pg.evaluate('window.initError || null')
        if err: print('INITERR', err); sys.exit(1)
        await pg.evaluate('window.__hook()')
        total = await pg.evaluate('window.TOTAL')
        frames = await pg.evaluate("""([total, dt]) => { const out = []; for (let t = 0; t <= total; t += dt) { window.__rec = []; window.renderAt(t); out.push([t, window.__rec]); } window.__rec = null; return out; }""", [total, DT])
        await b.close()
        return total, frames

def lines_of(rec):
    # egymás után kirajzolt, folytatólagos darabok (alsó index, kiemelt szó, sorkizárt szavak) egy sort alkotnak
    out = []; cur = None
    for s, a, fs, x, y, w in rec:
        if not s.strip(): continue
        if cur and -0.2 * cur['fs'] <= x - cur['xe'] <= 1.6 * cur['fs'] and abs(y - cur['y']) <= 0.75 * cur['fs']:
            sep = ' ' if x - cur['xe'] > 0.18 * cur['fs'] else ''
            cur['txt'] += sep + s; cur['amin'] = min(cur['amin'], a); cur['xe'] = x + w
        else:
            if cur: out.append(cur)
            cur = {'fs': fs, 'y': y, 'xe': x + w, 'txt': s, 'amin': a}
    if cur: out.append(cur)
    res = []
    for L in out:
        txt = clean(re.sub(r'\s+', ' ', L['txt']))
        if len(re.sub(r'\W', '', txt)) < 2: continue
        res.append((txt, L['amin'], L['y']))
    return res

def analyse(total, frames):
    vis = {}  # szöveg -> [(t, y)] amikor olvasható (alfa ≥ 0,5)
    for t, rec in frames:
        seen = set()
        for txt, a, y in lines_of(rec):
            if a >= 0.5 and txt not in seen: seen.add(txt); vis.setdefault(txt, []).append((t, y))
    items = []
    for txt, ts in vis.items():
        ts.sort(); s = ts[0][0]; prev = s; y0 = ts[0][1]
        for t, y in ts[1:] + [(1e9, 0)]:
            if t - prev > 3.0:
                items.append({'txt': txt, 't0': s, 't1': prev + DT, 'y': y0}); s = t; y0 = y
            prev = t
    # a 30 s-nál tovább látható elemek (fejezetsáv, lépésjelző) navigáció, nem olvasandó szöveg
    items = [i for i in items if 0.39 <= i['t1'] - i['t0'] <= 30]
    # pörgő számkijelzők (mélység, nyomás …): csak az első értéket kell elolvasni
    NUM = re.compile(r'^[−\-+±]?\s?[\d.,\s]+\s?(m|mm|cm|kN|kPa|MPa|MN/m2|kN/m2|%|°|s|m/s|nT|Hz|ms|t|perc|óra|nap)?$')   # (2026-11-10: időkijelző is pörgő szám)
    items.sort(key=lambda i: i['t0']); seenNum = []
    keep = []
    for i in items:
        if NUM.match(i['txt']):
            if any(abs(i['t0'] - t) < 12 for t in seenNum): continue
            seenNum.append(i['t0'])
        keep.append(i)
    items = keep
    items.sort(key=lambda i: (round(i['t0'] / 0.4), i['y']))
    free = 0.0
    for it in items:
        n = len(it['txt']); it['n'] = n; need = n / R
        st = max(it['t0'], free); fin = st + need
        it['start'] = st; it['fin'] = fin; it['late'] = max(0.0, fin - it['t1'])
        free = min(fin, it['t1']) if fin > it['t1'] else fin
    return items

async def main():
    total, frames = await capture()
    items = analyse(total, frames)
    nb = int(total / BAR) + 1
    seg = {}
    for it in items:
        k = int(it['t0'] / BAR // 4) * 4
        seg.setdefault(k, [0, 0.0, 0])
        seg[k][0] += it['n']; seg[k][1] += it['late'] * R; seg[k][2] += 1 if it['late'] > 0.3 else 0
    tot_chars = sum(i['n'] for i in items); missed = sum(min(i['n'], i['late'] * R) for i in items)
    print(f'{os.path.basename(os.path.dirname(os.path.dirname(html)))}: {total:.1f} s, {len(items)} szövegsor, {tot_chars} karakter, átlag {tot_chars/total:.1f} kar/s; R = {R:.0f} kar/s mellett el nem olvasott ≈ {missed:.0f} kar ({100*missed/max(1,tot_chars):.0f} %)')
    for k in sorted(seg):
        n, miss, cnt = seg[k]; dur = 4 * BAR
        print(f'  ütem {k:>2}–{k+4:<2}: {n:4d} kar / {dur:.1f} s = {n/dur:5.1f} kar/s  késés {miss:4.0f} kar  {"!!" if miss > 20 else ""}')
    if OUT:
        json.dump({'total': total, 'bpm': BPM, 'R': R, 'items': items}, open(OUT, 'w'), ensure_ascii=False, indent=0)

asyncio.run(main())
