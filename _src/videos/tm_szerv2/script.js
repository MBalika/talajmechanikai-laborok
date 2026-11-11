// Szervesanyag-tartalom – feliratok (lépésszámokkal), címkék, táblázatok, képlet, minősítő sáv
import { clamp, smooth, seg, win, C, FH, FB, up, runCaptions, L3, chip, badge, clockCard, table, formula, openTitle, endCard, finish } from '../tm_lab/ui.js';
import { LX, BT } from '../tm_lab/room.js';
import * as TL from './timeline.js';
import { tb, TOTAL, CHAPTERS, COL } from './timeline.js';
import { POS, P } from './app.js';
const B = tb, W3 = (x, y, z) => [LX + x, y, z], d1 = (v, n = 1) => v.toFixed(n).replace('.', ',');
const CAPS = [
  [B(8.2), B(10.5), '1.1 Az eszközök', ['A tégelyt végig *fogóval* fogjuk']],
  [B(14.2), B(16.5), '2.1 A minta', ['*110 °C*-on tömegállandóságig', 'szárított talaj']],
  [B(16.6), B(21.7), '2.2 Aprítás', ['Mozsárban, a törővel', 'a rögöket szétmorzsoljuk']],
  [B(22.2), B(25.5), '2.3 Szitálás', ['*2 mm*-es szitán átszitáljuk']],
  [B(25.6), B(27.7), '2.4 Az átesett rész', ['Ebből veszünk mintát']],
  [B(28.1), B(29.8), '3.1 Tégelyfogó', ['Az üres tégelyt is fogóval fogjuk']],
  [B(29.9), B(32.2), '3.2 Előizzítás', ['Az üres tégely a *550 °C*-os', 'kemencébe kerül']],
  [B(32.3), B(33.6), '3.2 Előizzítás', ['Legalább *20 percig*']],
  [B(33.7), B(36.5), '3.3 Hűtőlap', ['Kivesszük: néhány percig', 'a *fémlapon* hűl']],
  [B(36.6), B(40.7), '3.4 Exszikkátor', ['Melegen az exszikkátorba:', 'a *szilikagél* szárazon tartja']],
  [B(42.0), B(44.6), '3.5 A mérlegre', ['A fogóval a mérlegre tesszük']],
  [B(44.7), B(46.4), '3.6 Az üres tégely', ['*m_a = 32,415 g*']],
  [B(46.6), B(51.8), '4.1 Bemérés', ['*5–15 g* talaj, legfeljebb', '*5 mm* vastag rétegben']],
  [B(52.0), B(55.8), '4.2 Tégely + talaj', ['*m_c = 37,915 g* (5,500 g talaj)']],
  [B(56.0), B(60.2), '5.1 A kemencébe', ['A tégely *fedő nélkül* kerül be']],
  [B(60.3), B(63.5), '5.2 Izzítás', ['*550 ± 25 °C*, legalább *2 óra*:', 'a szerves anyag *elég*']],
  [B(63.7), B(66.5), '5.3 Hűtőlap', ['Néhány percig a fémlapon']],
  [B(66.6), B(70.7), '5.4 Exszikkátor', ['Hogy ne vegyen fel *nedvességet*']],
  [B(72.0), B(74.6), '5.5 A mérlegre', ['A fogóval a mérlegre tesszük']],
  [B(74.7), B(77.8), '5.6 Izzítás után', ['*m_d = 37,431 g*']],
  [B(78.2), B(82.5), '6.1 Izzítási veszteség', ['A tömegcsökkenés a száraz tömegre']],
  [B(82.7), B(86.5), '6.2 Két minta', ['Legalább két meghatározás átlaga']],
  [B(86.7), B(91.0), '6.3 Minősítés', ['6–20 % között: *közepesen szerves*']],
  [B(91.2), B(95.8), '6.4 Agyagban', ['Az agyagásványok *kristályvize*', 'is távozik: a valós érték kisebb']],
];
// minősítő sáv (EN ISO 14688-2): 0–30 %, határok 2, 6, 20 %
function rateBar(O, x, y, w, a, v, k) { if (a <= 0) return; const g = O.g; g.save(); g.globalAlpha = a; const h = 220; g.fillStyle = 'rgba(10,12,14,0.86)'; O.rr(x, y, w, h, 16); g.fill();
  O.font(26, 800, FH); g.fillStyle = COL.org; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillText(up('Szervesanyag-tartalom'), x + 26, y + 44);
  const x0 = x + 40, x1 = x + w - 40, by = y + 118, sx = (p) => x0 + (x1 - x0) * p / 30;
  const segs = [[0, 2, 'rgba(255,255,255,0.18)', ''], [2, 6, 'rgba(201,161,90,0.45)', 'kissé'], [6, 20, 'rgba(201,161,90,0.75)', 'közepesen'], [20, 30, 'rgba(120,80,40,0.95)', 'erősen']];
  for (const [p0, p1, c, s] of segs) { g.fillStyle = c; O.rr(sx(p0), by - 14, sx(p1) - sx(p0) - 2, 28, 5); g.fill(); if (s) { O.font(20, 700, FH); g.fillStyle = '#0b0d10'; g.textAlign = 'center'; g.fillText(s, (sx(p0) + sx(p1)) / 2, by + 7); } }
  O.font(22, 700, FH); g.fillStyle = 'rgba(255,255,255,0.8)'; g.textAlign = 'center'; for (const p of [0, 2, 6, 20, 30]) g.fillText(p + ' %', sx(p), by + 50);
  const mx = sx(v * k); g.globalAlpha = a * clamp(k * 3); g.fillStyle = C.white; g.beginPath(); g.moveTo(mx, by - 20); g.lineTo(mx - 12, by - 40); g.lineTo(mx + 12, by - 40); g.closePath(); g.fill();
  O.font(30, 800, FB); g.textAlign = 'center'; O.rt('w_{LOI} = ' + d1(v) + ' %', mx - 40, by - 58); g.restore(); }
export function drawOverlay(O, t, ctx) {
  const { proj } = ctx;
  openTitle(O, t, B, TOTAL, { q1: 'Mennyi szerves anyag van a talajban?', q2: 'Lépésről lépésre', title: 'Szervesanyag-\ntartalom', sub: 'Izzítási veszteség 550 °C-on' });
  for (const [b0, b1, n] of [[8, 14, '1  Az eszközök'], [14, 28, '2  Előkészítés'], [28, 46, '3  A tégely'], [46, 56, '4  Bemérés'], [56, 78, '5  Izzítás'], [78, 96, '6  Kiértékelés']]) chip(O, n, win(t, B(b0), B(b1), 0.25, 0.25));
  const big = (t > B(8) && t < B(14)) || (t > B(78) && t < B(96));
  badge(O, 'EN 17685-1', win(t, B(14), B(96), 0.4, 0.4) * (big ? 0 : 1));
  if (t > B(8) && t < B(10.7)) for (const [s, p, d, b] of [['KEMENCE · 550 °C', [POS.FURN[0], BT + 0.5, POS.FURN[1]], [-60, -90], 8.4], ['EXSZIKKÁTOR', [POS.DESIC[0], BT + 0.22, POS.DESIC[1]], [-120, -80], 8.8], ['TÉGELY', [P.PL[0], BT + 0.05, P.PL[2]], [90, -100], 9.2],
    ['TÉGELYFOGÓ', [POS.TREST[0], BT + 0.07, POS.TREST[1] + 0.15], [-170, 60], 9.5]])
    L3(O, proj, W3(...p), s, win(t, B(b), B(10.6), 0.25, 0.25), { dx: d[0], dy: d[1] });
  if (t > B(10.5) && t < B(14)) table(O, 560, 230, 800, ['Mit?', 'Mivel?'], [['tömeg', 'mérleg · 0,001 g'], ['izzítás', 'kemence · 550 ± 25 °C'], ['hűtés', 'exszikkátor']], win(t, B(10.6), B(13.95), 0.3, 0.3), { cols: [300, 470], size: 32, rowH: 56, title: '1.2 Mit, mivel mérünk?', color: COL.hot });
  if (t > B(32.3) && t < B(33.65)) clockCard(O, win(t, B(32.35), B(33.6), 0.15, 0.15), '550 °C', '20 perc', { y: 104 });
  for (const a of [40.8, 70.8]) if (t > B(a) && t < B(a + 1.25)) clockCard(O, win(t, B(a + 0.05), B(a + 1.2), 0.15, 0.15), 'SZOBAHŐMÉRSÉKLETIG', '≈ 1 óra', { y: 104 });
  if (t > B(60.3) && t < B(63.65)) clockCard(O, win(t, B(60.35), B(63.6), 0.2, 0.2), '550 °C', Math.min(2, 0.5 + Math.floor(4 * seg(t, B(60.5), B(63.2))) / 2).toFixed(1).replace('.', ',') + ' óra', { y: 104 });
  for (const [a, b, v] of [[44.7, 46.4, '32,415 g'], [52.0, 55.8, '37,915 g'], [74.7, 77.8, '37,431 g']]) if (t > B(a) && t < B(b + 0.1)) L3(O, proj, W3(POS.SCL, BT + 0.035, -0.86), v, win(t, B(a + 0.1), B(b), 0.2, 0.2), { dx: 170, dy: -80 });
  if (t > B(78) && t < B(82.6)) formula(O, 110, 170, ['w_{LOI} = (m_c − m_d) / (m_c − m_a) · 100 %', '= 0,484 / 5,500 · 100 % = ' + d1(TL.LOI) + ' %'], win(t, B(78.2), B(82.5), 0.3, 0.3), { size: 36, title: 'Izzítási veszteség', color: COL.hot });
  if (t > B(82.6) && t < B(86.6)) table(O, 560, 220, 800, ['', 'w_{LOI} [%]'], [['1. tégely', d1(TL.LOI)], ['2. tégely', d1(TL.LOI2)], ['átlag', d1(TL.LOIM)]], win(t, B(82.7), B(86.5), 0.3, 0.3), { cols: [440, 330], size: 32, rowH: 56, title: '6.2 Két meghatározás', color: COL.hot, hi: 2 });
  if (t > B(86.6) && t < B(91.1)) rateBar(O, 110, 190, 900, win(t, B(86.7), B(91), 0.3, 0.3), TL.LOIM, smooth(seg(t, B(87.0), B(87.9))));
  if (t > B(96) && t < B(100.2)) O.list(100, 170, 800, ['Száraz, 2 mm alatti minta', '550 °C, legalább 2 óra', 'Exszikkátorban hűtve mérjük', 'w_{LOI} = ' + d1(TL.LOIM) + ' %: közepesen szerves'], [B(96.3), B(96.8), B(97.3), B(97.8)], t, win(t, B(96.2), B(100), 0.2, 0.3), { title: 'Összegzés', color: C.accent, mark: '›', size: 30 });
  endCard(O, t, B, TOTAL, 100, 'SZERVESANYAG', null, 'Következik: kompressziós vizsgálat');
  runCaptions(O, t, CAPS);
  finish(O, t, TOTAL, CHAPTERS);
}
