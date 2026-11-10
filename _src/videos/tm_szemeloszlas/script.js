// Szemeloszlási vizsgálat – feliratok, címkék, táblázatok, görbe
import { clamp, lerp, smooth, seg, win, fmt, C, FH, FB, runCaptions, xyChart, fcard, L3, chip, badge, clockCard, table, formula, logChart, logFmt, axisLab, openTitle, endCard, finish, inset } from '../tm_lab/ui.js';
import { LX, BT } from '../tm_lab/room.js';
import * as TL from './timeline.js';
import { tb, TOTAL, CHAPTERS, COL } from './timeline.js';
import { POS } from './app.js';
const B = tb, W3 = (x, y, z) => [LX + x, y, z];
const CAPS = [
  [B(8.3), B(11), 'Szárítás', ['A mintát *105 °C*-on', 'tömegállandóságig szárítjuk']],
  [B(11.1), B(13), 'Bemérés', ['Száraz tömeg: *m_0 = 500 g*']],
  [B(13.1), B(17.5), 'Nedves szitálás', ['A *0,063 mm*-es szitán átmossuk:', 'a finom rész az ülepítéshez kerül']],
  [B(17.6), B(19), 'Újra szárítás', ['A fennmaradt rész *újra* szárad']],
  [B(19.1), B(22), 'Szitasor', ['Lefelé *csökkenő* lyukbőség,', 'a talajt felülre öntjük']],
  [B(22.1), B(23.5), 'Rögzítés', ['Fedél, *szorító*']],
  [B(23.6), B(27), 'Rázás', ['A rázógép *frakciókra* bontja', 'a szemcséket']],
  [B(27.1), B(33), 'Mérés', ['Minden szitán *fennmaradt*', 'tömeg: *m_i*']],
  [B(33.1), B(37), 'Áthullott tömeg', ['Szitánként: *hány %* esett át']],
  [B(37.1), B(40.75), 'Hidrometrálás', ['Finom rész, desztillált víz,', '*diszpergálószer*: 1000 cm³']],
  [B(40.8), B(42), 'Aerométer', ['Rázás után *azonnal* be']],
  [B(42.1), B(47), 'Ülepedés', ['A nagy szemcsék *gyorsabban*', 'ülepednek: *Stokes*-törvény']],
  [B(47.1), B(51), 'Leolvasás', ['A sűrűségből: *d* és *S*,', '0,5 perctől 24 óráig']],
  [B(51.1), B(56), 'Szemeloszlási görbe', ['Szitálás + hidrometrálás:', 'a *teljes* görbe']],
  [B(56.1), B(60), 'Eredmény', ['*Iszapos homok*,', 'széles szemeloszlás']],
];
const lg = (d) => Math.log10(d);
const SIEVE_PTS = TL.SIEVES.map((d, i) => [lg(d), TL.PASS[i]]).reverse();
const HYD_PTS = [...TL.HYD].reverse().map(([m, d, S]) => [lg(d), S]);
const ALL = [...HYD_PTS, ...SIEVE_PTS.filter(p => p[0] > lg(0.063) - 0.001)];
const XT = [-3, -2, -1, 0, 1];
const dstr = (d) => String(d).replace('.', ',');

export function drawOverlay(O, t, ctx) {
  const { proj, shot } = ctx; const g = O.g;
  openTitle(O, t, B, TOTAL, { q1: 'Milyen szemcsékből áll?', q2: 'Szitával és ülepítéssel mérjük', title: 'Szemeloszlási\nvizsgálat', sub: 'Szitálás és hidrometrálás' });
  const CHP = [[8, 19, '1  Előkészítés'], [19, 37, '2  Szitálás'], [37, 51, '3  Hidrometrálás'], [51, 60, '4  Eredmény']];
  for (const [b0, b1, n] of CHP) chip(O, n, win(t, B(b0), B(b1), 0.25, 0.25));
  badge(O, 'EN ISO 17892-4', win(t, B(8.2), B(60), 0.4, 0.4));
  // 3D címkék
  if (t > B(8) && t < B(11)) L3(O, proj, W3(POS.oven, BT + 0.62, -1.0), 'SZÁRÍTÓSZEKRÉNY', win(t, B(8.6), B(11), 0.3, 0.3), { dx: 150, dy: -90 });
  if (t > B(13) && t < B(17.5)) L3(O, proj, W3(POS.sink + 0.1, BT + 0.09, -1.16), 'SZITA · 0,063 mm', win(t, B(13.8), B(17.3), 0.3, 0.3), { dx: 170, dy: -120 });
  if (t > B(19) && t < B(22)) L3(O, proj, W3(POS.shk - 0.1, BT + 0.4, -1.12), 'SZITASOR', win(t, B(19.6), B(22), 0.3, 0.3), { dx: -200, dy: -60 });
  if (t > B(23.5) && t < B(27)) L3(O, proj, W3(POS.shk - 0.18, BT + 0.08, -1.0), 'RÁZÓGÉP', win(t, B(24), B(27), 0.3, 0.3), { dx: -180, dy: -100 });
  if (t > B(30) && t < B(33)) TL.SIEVES.forEach((d, i) => L3(O, proj, W3(POS.rows[i % 4], BT + 0.055, i < 4 ? -1.33 : -1.06), dstr(d), win(t, B(30.3 + i * 0.12), B(33), 0.25, 0.25), { dx: 0, dy: -70, size: 26, color: C.white }));
  if (t > B(37) && t < B(40.75)) L3(O, proj, W3(POS.cyl, BT + 0.42, -1.1), 'MÉRŐHENGER', win(t, B(37.5), B(40.5), 0.3, 0.3), { dx: -200, dy: -70 });
  if (t > B(40.75) && t < B(42)) L3(O, proj, W3(POS.cyl, BT + 0.47, -1.1), 'AEROMÉTER', win(t, B(40.9), B(42), 0.2, 0.25), { dx: 160, dy: -60 });
  // rázás ideje
  if (t > B(23.5) && t < B(27)) clockCard(O, win(t, B(23.8), B(27), 0.3, 0.3), 'RÁZÁS', Math.round(10 * seg(t, B(23.5), B(26.75))) + ' perc');
  // szitálási táblázat + átesett %
  if (t > B(27) && t < B(37.2)) { const a = win(t, B(27.2), B(37), 0.35, 0.3); const n = clamp(TL.weighI(t) + 0.02, 0, 8);
    const rows = TL.SIEVES.map((d, i) => [dstr(d), TL.RET[i], t > B(33) ? fmt(TL.PASS[i], 0) : '']);
    table(O, 1180, 150, 680, ['d [mm]', 'm_i [g]', 'S [%]'], rows, a, { n, title: 'Szitálás · m_0 = 500 g', cols: [220, 220, 220], size: 27, rowH: 44, hi: t < B(33) ? Math.min(7, Math.floor(TL.weighI(t))) : -1 }); }
  if (t > B(33) && t < B(37.2)) formula(O, 120, 170, ['S_i = (m_0 − Σm_i) / m_0 · 100 %'], win(t, B(33.3), B(37), 0.3, 0.3), { size: 40 });
  // ülepedés: Stokes
  if (t > B(42) && t < B(47.2)) { const a = win(t, B(42.2), B(47), 0.35, 0.3); clockCard(O, a, 'ELTELT IDŐ', TL.fmtClock(TL.hydClock(t)));
    inset(O, 1560, 560, 210, a, (gg, x0, y0, s) => { gg.fillStyle = '#6b5440'; gg.fillRect(x0, y0, s, s); const u = seg(t, B(42), B(47)); const sz = [10, 6, 3.5, 2];
      for (let i = 0; i < 70; i++) { const k = i % 4, r = sz[k], v = [3.2, 1.3, 0.45, 0.15][k]; const x = x0 + ((i * 53) % 97) / 97 * s, y = y0 + ((i * 37) % 89) / 89 * s * 0.5 + u * v * s * 0.9; if (y > y0 + s - r) continue; gg.fillStyle = ['#d9c19a', '#c4a57a', '#a98d6a', '#8f7a62'][k]; gg.beginPath(); gg.arc(x, y, r, 0, 7); gg.fill(); }
      gg.fillStyle = 'rgba(255,255,255,0.0)'; }, { title: 'Ülepedés' });
    formula(O, 1350, 860, ['v ~ d^2'], win(t, B(43.5), B(47), 0.3, 0.3), { size: 40 }); }
  // görbe: szita (33–37), hidrometrálás (47–51), teljes (51–60)
  { const a = t > B(33) && t < B(37.2) ? win(t, B(33.6), B(37), 0.35, 0.3) : t > B(47) && t < B(60.2) ? win(t, B(47.2), B(60), 0.35, 0.3) : 0;
    if (a > 0) { const x = t < B(40) ? 1180 : 1040, y = t < B(40) ? 610 : 170, w = t < B(40) ? 680 : 820, h = t < B(40) ? 400 : 560;
      const sp = { pts: SIEVE_PTS, upto: t < B(40) ? clamp(seg(t, B(33.8), B(36.5))) : 1, color: COL.sieve, width: 4, dots: 5 };
      const hp = { pts: HYD_PTS, upto: t < B(47) ? 0 : clamp(seg(t, B(47.6), B(50.5))), color: COL.hyd, width: 4, dots: 5 };
      const marks = []; if (t > B(51)) { const mk = (d, S, txt, b) => marks.push({ x: lg(d), y: S, text: txt, color: C.white, a: win(t, B(b), B(60), 0.25, 0.3), vline: true, dy: -22, size: 22 }); mk(TL.RES.d10, 10, 'd_{10}', 52.5); mk(TL.RES.d30, 30, 'd_{30}', 53); mk(TL.RES.d60, 60, 'd_{60}', 53.5); }
      const r = logChart(O, x, y, w, h, a, { xmin: -3, xmax: 1, ymax: 100, xticks: XT, yticks: [0, 20, 40, 60, 80, 100], title: t < B(40) ? null : 'Szemeloszlási görbe' }, [sp, hp], marks.map(m => ({ ...m, text: null })));
      axisLab(O, x, y, w, h, a, 'd [mm]', 'S [%]');
      if (t > B(51) && r) { const ab = win(t, B(51.3), B(60), 0.3, 0.3); g.save(); g.globalAlpha = a * ab; const fr = [[-3, lg(0.002), 'AGYAG'], [lg(0.002), lg(0.063), 'ISZAP'], [lg(0.063), lg(2), 'HOMOK'], [lg(2), 1, 'KAVICS']];
        fr.forEach(([x0, x1, n], i) => { g.fillStyle = i % 2 ? 'rgba(255,255,255,0.05)' : 'rgba(180,140,255,0.08)'; g.fillRect(r.sx(x0), r.T, r.sx(x1) - r.sx(x0), r.B - r.T); O.font(20, 800, FH); g.fillStyle = 'rgba(255,255,255,0.65)'; g.textAlign = 'center'; g.textBaseline = 'top'; g.fillText(n, (r.sx(x0) + r.sx(x1)) / 2, r.T + 6); });
        for (const m of marks) { g.globalAlpha = a * m.a; O.font(22, 800, FH); g.fillStyle = C.white; g.textAlign = 'left'; g.textBaseline = 'middle'; O.rt(m.text, r.sx(m.x) + 8, r.sy(m.y) - 16); } g.restore(); } } }
  if (t > B(47) && t < B(51.2)) { const a = win(t, B(47.3), B(51), 0.3, 0.3); const rows = TL.HYD.filter((_, i) => i % 2 === 0).map(([m, d, S]) => [TL.fmtClock(m), dstr(d), fmt(S, 0)]);
    table(O, 120, 170, 560, ['t', 'd [mm]', 'S [%]'], rows, a, { n: clamp(seg(t, B(47.4), B(50)) * 5.5, 0, 5), title: 'Hidrometrálás', cols: [190, 190, 160], size: 26, rowH: 42 }); }
  if (t > B(53.8) && t < B(60.2)) formula(O, 120, 170, ['C_U = d_{60} / d_{10} ≈ 76', 'C_C = d_{30}^2 / (d_{60} · d_{10}) ≈ 5'], win(t, B(54), B(60), 0.3, 0.3), { size: 36, title: 'Görbe jellemzői' });
  if (t > B(56) && t < B(60.2)) table(O, 120, 430, 560, ['Frakció', '%'], [['agyag', TL.RES.clay], ['iszap', TL.RES.silt], ['homok', TL.RES.sand], ['kavics', TL.RES.gravel]], win(t, B(56.3), B(60), 0.3, 0.3), { title: 'Iszapos homok (siSa)', cols: [380, 160], size: 28, rowH: 44 });
  endCard(O, t, B, TOTAL, 60, 'SZEMELOSZLÁS', 'szitálás + hidrometrálás', 'Következik: folyási határ');
  runCaptions(O, t, CAPS);
  finish(O, t, TOTAL, CHAPTERS);
}
