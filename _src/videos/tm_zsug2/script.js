// Zsugorodási határ – feliratok (lépésszámokkal), címkék, táblázatok, képletek, minősítés, w – V diagram
import { clamp, smooth, seg, win, C, FH, FB, up, runCaptions, L3, chip, badge, clockCard, table, formula, xyChart, axisLab, openTitle, endCard, finish } from '../tm_lab/ui.js';
import { LX, BT } from '../tm_lab/room.js';
import * as TL from './timeline.js';
import { tb, TOTAL, CHAPTERS, COL } from './timeline.js';
import { POS, DISHP, FLOOR } from './app.js';
const B = tb, W3 = (x, y, z) => [LX + x, y, z], d1 = (v, n = 1) => v.toFixed(n).replace('.', ',');
const CAPS = [
  [B(8.2), B(10.5), '1.1 Az eszközök', ['Kiszúró gyűrű: *Ø 25 × 25 mm*']],
  [B(14.3), B(16.4), '2.1 A talaj', ['Homogén, *I_C ≈ 0,7*:', '30 mm vastag lap']],
  [B(16.5), B(18.1), '2.2 A gyűrű', ['A toldatos gyűrűt a lapra tesszük']],
  [B(18.3), B(21.9), '2.3 Kiszúrás', ['Függőlegesen, *egyenletesen*', 'nyomjuk az üveglapig']],
  [B(22.0), B(23.8), '2.4 Kiemelés', ['Kissé elfordítjuk, és kiemeljük']],
  [B(24.0), B(25.7), '2.5 A toldat le', ['Fölötte *5 mm* talaj marad']],
  [B(25.8), B(29.0), '2.6 Levágás', ['A spatulával a gyűrű *síkjára*', 'vágjuk: h = 25 mm']],
  [B(29.2), B(31.5), '3.1 Az üvegtálba', ['A tál a mérlegen, *tárázva*']],
  [B(31.6), B(35.5), '3.2 Kitolás', ['A kitolóval leszorítjuk,', 'a gyűrűt *lehúzzuk* róla']],
  [B(35.6), B(37.3), '3.3 Tömeg', ['Nedves tömeg: *m = 23,64 g*']],
  [B(37.4), B(39.8), '3.4 Átmérő', ['*Tolómérővel*, 0,01 mm-re']],
  [B(39.9), B(43.0), '3.4 Méretek', ['*d = 25,00 mm*; a magasság', 'a gyűrűé: *h = 25,0 mm*']],
  [B(43.2), B(45.0), '4.1 Szárítás', ['A tálat félretesszük']],
  [B(45.0), B(49.0), '4.1 Szobahőn', ['*Lassan* szárad, így nem reped:', 'zsugorodik, kivilágosodik']],
  [B(49.2), B(52.0), '4.2 Szárítószekrény', ['Majd *105 °C*-on szárítjuk']],
  [B(52.1), B(54.5), '4.2 Tömegállandóságig', ['Legalább *24 óráig*']],
  [B(54.7), B(58.6), '4.3 Kihűlés után', ['A tálat a mérlegre tesszük']],
  [B(58.8), B(60.6), '5.1 Száraz tömeg', ['*m_d = 18,06 g*']],
  [B(60.7), B(64.0), '5.2 Átmérő', ['A zsugorodott henger: *22,90 mm*']],
  [B(64.1), B(65.3), '5.3 Lefektetjük', ['Egy ujjal, óvatosan']],
  [B(65.4), B(68.6), '5.4 Magasság', ['*h_d = 22,90 mm*']],
  [B(72.2), B(76.5), '6.1 Térfogatok', ['Nedvesen és kiszárítva']],
  [B(76.7), B(81.5), '6.2 Zsugorodás', ['*ε_s*: a lineáris zsugorodás']],
  [B(81.7), B(85.0), '6.3 Minősítés', ['Térfogatváltozás szempontjából *veszélyes*']],
  [B(85.2), B(90.5), '6.4 Zsugorodási határ', ['A száraz térfogat *telített* állapotban']],
  [B(90.7), B(96.8), '6.5 Víztartalom – térfogat', ['*w_S* alatt a térfogat', 'már *nem csökken*']],
];
// minősítő sáv: 0–12 %, 5 %-nál a határ, a mért érték jelölve
function rateBar(O, x, y, w, a, v, k) { if (a <= 0) return; const g = O.g; g.save(); g.globalAlpha = a; const h = 210; g.fillStyle = 'rgba(10,12,14,0.86)'; O.rr(x, y, w, h, 16); g.fill();
  O.font(26, 800, FH); g.fillStyle = COL.red; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillText(up('Lineáris zsugorodás'), x + 26, y + 44);
  const x0 = x + 40, x1 = x + w - 40, by = y + 110, sx = (p) => x0 + (x1 - x0) * p / 12;
  g.fillStyle = 'rgba(63,224,197,0.55)'; O.rr(x0, by - 14, sx(5) - x0, 28, 6); g.fill(); g.fillStyle = 'rgba(255,106,92,0.6)'; O.rr(sx(5), by - 14, x1 - sx(5), 28, 6); g.fill();
  O.font(22, 700, FH); g.fillStyle = 'rgba(255,255,255,0.8)'; g.textAlign = 'center'; for (const p of [0, 5, 10]) g.fillText(p + ' %', sx(p), by + 48);
  O.font(24, 700, FH); g.fillStyle = '#0b0d10'; g.fillText('kedvező', (x0 + sx(5)) / 2, by + 8); g.fillText('veszélyes', (sx(5) + x1) / 2, by + 8);
  const mx = sx(v * k); g.globalAlpha = a * clamp(k * 3); g.fillStyle = C.white; g.beginPath(); g.moveTo(mx, by - 20); g.lineTo(mx - 12, by - 40); g.lineTo(mx + 12, by - 40); g.closePath(); g.fill();
  O.font(30, 800, FB); g.textAlign = 'center'; g.fillText('ε', mx - 34, by - 52); O.font(20, 800, FB); g.fillText('s', mx - 20, by - 46); O.font(30, 800, FB); g.fillText('= ' + d1(v) + ' %', mx + 36, by - 52); g.restore(); }
export function drawOverlay(O, t, ctx) {
  const { proj } = ctx;
  openTitle(O, t, B, TOTAL, { q1: 'Mennyit zsugorodik a talaj?', q2: 'Lépésről lépésre', title: 'Zsugorodási\nhatár', sub: 'Lineáris zsugorodás és w_S' });
  for (const [b0, b1, n] of [[8, 14, '1  Az eszközök'], [14, 29, '2  Kiszúrás'], [29, 43, '3  Kezdeti adatok'], [43, 59, '4  Szárítás'], [59, 72, '5  Száraz méretek'], [72, 97, '6  Kiértékelés']]) chip(O, n, win(t, B(b0), B(b1), 0.25, 0.25));
  const big = (t > B(8) && t < B(14)) || (t > B(68.6) && t < B(97));
  badge(O, 'Kis Talajmechanika · 2.6', win(t, B(8.2), B(97), 0.4, 0.4) * (big ? 0 : 1));
  if (t > B(8) && t < B(10.7)) for (const [s, p, d, b] of [['GYŰRŰ + TOLDAT', [POS.RC0[0], BT + 0.04, POS.RC0[1]], [150, -90], 8.5], ['KITOLÓ', [POS.PUS[0], BT + 0.12, POS.PUS[1]], [-150, -70], 8.9], ['TOLÓMÉRŐ', [POS.CALH[0] + 0.1, BT + 0.06, POS.CALH[1]], [120, 70], 9.3], ['ÜVEGTÁL · MÉRLEG', [DISHP[0], FLOOR + 0.015, DISHP[2]], [-200, -60], 9.7]])
    L3(O, proj, W3(...p), s, win(t, B(b), B(10.6), 0.25, 0.25), { dx: d[0], dy: d[1] });
  if (t > B(10.5) && t < B(14)) table(O, 560, 230, 800, ['Mit?', 'Mivel?'], [['átmérő, magasság', 'tolómérő · 0,01 mm'], ['tömeg', 'mérleg · 0,01 g'], ['száraz tömeg', '105 °C · mérleg']], win(t, B(10.6), B(13.95), 0.3, 0.3), { cols: [360, 410], size: 32, rowH: 56, title: '1.2 Mit, mivel mérünk?', color: COL.sh });
  if (t > B(35.6) && t < B(37.4)) L3(O, proj, W3(DISHP[0], BT + 0.035, -0.86), '23,64 g', win(t, B(35.8), B(37.3), 0.2, 0.2), { dx: 170, dy: -80 });
  if (t > B(58.7) && t < B(60.6)) L3(O, proj, W3(DISHP[0], BT + 0.035, -0.86), '18,06 g', win(t, B(58.9), B(60.5), 0.2, 0.2), { dx: 170, dy: -80 });
  for (const [b0, b1, v, dx] of [[TL.CK.rd1, TL.CK.op1, 'Ø 25,00 mm', 0], [TL.CK.rd2, TL.CK.op2, 'Ø 22,90 mm', 0], [TL.CK.rd3, TL.CK.op3, 'h = 22,90 mm', 0.0229]])
    if (t > B(b0 - 0.1) && t < B(b1 + 0.2)) L3(O, proj, W3(DISHP[0] + dx, FLOOR + 0.05, DISHP[2]), v, win(t, B(b0), B(b1 + 0.15), 0.2, 0.2), { dx: -220, dy: -90 });
  if (t > B(45) && t < B(49.05)) clockCard(O, win(t, B(45.1), B(49), 0.2, 0.2), 'SZOBAHŐN', Math.max(1, Math.round(4 * seg(t, B(45.3), B(48.6)))) + ' nap', { y: 104 });
  if (t > B(52) && t < B(54.65)) clockCard(O, win(t, B(52.1), B(54.6), 0.2, 0.2), '105 °C', '24 óra', { y: 104 });
  if (t > B(68.6) && t < B(72.1)) table(O, 560, 220, 800, ['', 'nedves', 'száraz'], [['d [mm]', '25,00', '22,90'], ['h [mm]', '25,0', '22,90'], ['m [g]', '23,64', '18,06'], ['w [%]', d1(TL.W0), '0']], win(t, B(68.7), B(72), 0.3, 0.3), { cols: [300, 230, 230], size: 32, rowH: 54, title: '5.5 Mérési adatok', color: COL.sh });
  if (t > B(72) && t < B(76.6)) formula(O, 110, 170, ['V = π · 2,50^2 · 2,50 / 4 = ' + d1(TL.V0, 2) + ' cm^3', 'V_d = π · 2,29^2 · 2,29 / 4 = ' + d1(TL.VD, 2) + ' cm^3'], win(t, B(72.2), B(76.5), 0.3, 0.3), { size: 38, title: 'Térfogatok', color: COL.sh });
  if (t > B(76.6) && t < B(81.6)) formula(O, 110, 170, ['β_s = (V − V_d) / V_d = ' + d1(TL.BETA, 2), 'ε_s = 1 − (1 / (1 + β_s))^{1/3}', '= (25,0 − 22,9) / 25,0 = ' + d1(TL.EPS) + ' %'], win(t, B(76.7), B(81.5), 0.3, 0.3), { size: 38, title: 'Zsugorodás', color: COL.sh });
  if (t > B(81.6) && t < B(85.1)) rateBar(O, 110, 190, 820, win(t, B(81.7), B(85), 0.3, 0.3), TL.EPS, smooth(seg(t, B(82.0), B(82.9))));
  if (t > B(85.1) && t < B(90.6)) formula(O, 110, 170, ['V_s = m_d / ρ_s = ' + d1(TL.VS, 2) + ' cm^3', 'w_S = (V_d − V_s) · ρ_w / m_d', '= ' + d1(TL.WS) + ' %'], win(t, B(85.2), B(90.5), 0.3, 0.3), { size: 36, title: 'Zsugorodási határ', color: COL.sh });
  if (t > B(90.6) && t < B(97.1)) { const a = win(t, B(90.7), B(97), 0.3, 0.3), k = clamp(seg(t, B(91.2), B(92.9))), k2 = win(t, B(93.1), B(97), 0.3, 0.3), k3 = win(t, B(94.6), B(97), 0.3, 0.3);
    xyChart(O, 980, 160, 900, 600, a, { xmin: 0, xmax: 50, ymin: 8, ymax: 13, xticks: [0, 10, 20, 30, 40, 50], yticks: [8, 9, 10, 11, 12, 13], title: 'Víztartalom – térfogat' },
      [{ pts: [[TL.W0, TL.V0], [TL.WS, TL.VD], [0, TL.VD]], upto: k, color: COL.sh, width: 4, dots: 7, glow: false, head: false },
        { pts: [[TL.WS, 8], [TL.WS, TL.VD]], upto: k2, color: C.white, width: 2, dash: [8, 6], glow: false, head: false },
        { pts: [[TL.WP, 8], [TL.WP, 13]], upto: k3, color: 'rgba(255,255,255,0.35)', width: 1.5, dash: [6, 6], glow: false, head: false }, { pts: [[TL.WL, 8], [TL.WL, 13]], upto: k3, color: 'rgba(255,255,255,0.35)', width: 1.5, dash: [6, 6], glow: false, head: false }],
      [{ x: TL.WS, y: TL.VD, color: COL.acc, a: k2, text: 'w_S = ' + d1(TL.WS) + ' %', dx: -60, dy: -54, size: 28 }, { x: TL.W0, y: TL.V0, color: COL.sh, a: a * k, text: 'w = ' + d1(TL.W0) + ' %', dx: 16, dy: 10, size: 24 },
        { x: TL.WP, y: 13, color: C.white, a: k3, text: 'w_P', dx: 8, dy: 24, size: 24 }, { x: TL.WL, y: 13, color: C.white, a: k3, text: 'w_L', dx: 8, dy: 24, size: 24 }]);
    axisLab(O, 980, 160, 900, 600, a, 'w [%]', 'V [cm^3]', { ylBottom: true }); }
  if (t > B(97) && t < B(101.2)) O.list(100, 170, 780, ['Ø 25 × 25 mm, I_C ≈ 0,7', 'Szobahőn, majd 105 °C-on', 'ε_s = ' + d1(TL.EPS) + ' % > 5 %', 'w_S = ' + d1(TL.WS) + ' %'], [B(97.3), B(97.8), B(98.3), B(98.8)], t, win(t, B(97.2), B(101), 0.2, 0.3), { title: 'Összegzés', color: C.accent, mark: '›', size: 30 });
  endCard(O, t, B, TOTAL, 101, 'ZSUGORODÁSI HATÁR', null, 'Következik: szervesanyag-tartalom');
  runCaptions(O, t, CAPS);
  finish(O, t, TOTAL, CHAPTERS);
}
