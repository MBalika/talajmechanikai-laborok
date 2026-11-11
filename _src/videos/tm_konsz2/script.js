// Konszolidációs vizsgálat – feliratok (lépésszámokkal), címkék, leolvasási táblázat, rugós modell, s–√t (Taylor) és s–log t (Casagrande), c_v, k
import { clamp, smooth, seg, win, C, runCaptions, xyChart, L3, chip, badge, clockCard, table, formula, logChart, axisLab, openTitle, endCard, finish } from '../tm_lab/ui.js';
import { springModel } from '../tm_triax/charts.js';
import { LX, BT } from '../tm_lab/room.js';
import * as TL from './timeline.js';
import { tb, TOTAL, CHAPTERS, COL } from './timeline.js';
import { POS } from './app.js';
const B = tb, W3 = (x, y, z) => [LX + x, y, z], lg = Math.log10, f2 = (v) => v.toFixed(2).replace('.', ','), f3 = (v) => v.toFixed(3).replace('.', ',');
// Taylor-szerkesztés
const a1 = (TL.sOf(4) - TL.sOf(1)) / (2 - 1), s0T = TL.sOf(1) - a1;
const bis = (f, lo, hi) => { for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (f(lo) * f(m) <= 0) hi = m; else lo = m; } return (lo + hi) / 2; };
const rt90 = bis((r) => TL.sOf(r * r) - (s0T + a1 * r / 1.15), 3, 30), t90 = rt90 * rt90, s90 = TL.sOf(t90);
// Casagrande-szerkesztés
const ti = 40, dsl = (TL.sOf(ti * 1.05) - TL.sOf(ti / 1.05)) / (2 * lg(1.05)), sec = (TL.sOf(1440) - TL.sOf(480)) / (lg(1440) - lg(480));
const lt100 = (TL.sOf(480) - sec * lg(480) - (TL.sOf(ti) - dsl * lg(ti))) / (dsl - sec), s100C = TL.sOf(ti) + dsl * (lt100 - lg(ti));
const s0C = TL.sOf(0.25) - (TL.sOf(1) - TL.sOf(0.25)), s50 = (s0C + s100C) / 2, t50 = bis((tm) => TL.sOf(tm) - s50, 0.5, 400);
const cvT = 0.848 * TL.HDR ** 2 / t90, cvC = 0.197 * TL.HDR ** 2 / t50;
const tField = 0.848 * 2000 ** 2 / cvT / 60 / 24 / 365;                 // 4 m-es réteg, kétirányú szűrés: H = 2 m, év
const CAPS = [
  [B(8.2), B(10.5), '1.1 Ödométer', ['A cella a keretben, *vízzel elárasztva*']],
  [B(14.2), B(18.4), '2.1 Kétirányú szűrés', ['A víz alul és felül távozik:', '*H = h / 2 = 9,65 mm*']],
  [B(18.5), B(22.9), '2.2 Kiindulás', ['A minta *100 kPa*-on konszolidálódott;', 'az óra állása: *1,462 mm*']],
  [B(23.2), B(24.6), '3.1 Kar megtámasztva', ['A karemelővel alátámasztjuk']],
  [B(24.7), B(27.0), '3.2 Új tárcsa', ['A *100 kPa*-os tárcsa az akasztóra:', 'összesen *200 kPa*']],
  [B(27.1), B(29.6), '3.3 Indulás', ['A kart ütés nélkül ráengedjük,', 'és *egyszerre* indítjuk az órát']],
  [B(29.7), B(34.0), '4.1 Leolvasások', ['6 s, 15 s, 30 s, 1, 2, 4, 8 perc …']],
  [B(34.1), B(41.8), '4.2 Leolvasások', ['… 15, 30 perc, 1, 2, 4, 8, *24 óra*']],
  [B(42.2), B(46.0), '5.1 Mi történik?', ['A terhet először a *víz* viseli']],
  [B(46.1), B(49.8), '5.2 Mi történik?', ['Ahogy kiszivárog, a *váz* veszi át']],
  [B(50.2), B(54.0), '6.1 Taylor-módszer', ['s a *√t* függvényében: a kezdeti', 'szakaszra egyenes illeszthető']],
  [B(54.2), B(58.0), '6.2 90 %-os pont', ['*1,15*-szörös meredekségű egyenes']],
  [B(58.2), B(61.8), '6.3 Konszolidációs tényező', ['*c_v* a *t_{90}*-ből']],
  [B(62.2), B(66.0), '7.1 Casagrande-módszer', ['s a *log t* függvényében:', 'két érintő metszése a *t_{100}*']],
  [B(66.2), B(70.0), '7.2 50 %-os pont', ['t_0 és t_{100} között félúton: *t_{50}*']],
  [B(70.2), B(73.8), '7.3 Kúszás', ['Utána *másodlagos* összenyomódás']],
  [B(74.2), B(78.8), '8.1 Áteresztőképesség', ['c_v = 0,6 mm^2/perc, E_{oed} = 4 MPa']],
  [B(79.0), B(83.8), '8.2 Terepen', ['Egy 4 m-es réteg kétirányú', 'szűréssel: *t_{90} ≈ ' + Math.round(tField) + ' év*']],
];
export function drawOverlay(O, t, ctx) {
  const { proj, C: S } = ctx; const m = S ? S.m : 0;
  openTitle(O, t, B, TOTAL, { q1: 'Mennyi idő alatt süllyed?', q2: 'Lépésről lépésre', title: 'Konszolidációs\nvizsgálat', sub: 'Idő–összenyomódás görbe' });
  for (const [b0, b1, n] of [[8, 14, '1  A készülék'], [14, 23, '2  Kiindulás'], [23, 32, '3  Terhelés'], [32, 42, '4  Leolvasás'], [42, 50, '5  Mi történik?'], [50, 62, '6  Taylor'], [62, 74, '7  Casagrande'], [74, 84, '8  Áteresztőképesség']]) chip(O, n, win(t, B(b0), B(b1), 0.25, 0.25));
  const big = (t > B(8) && t < B(14)) || (t > B(42) && t < B(62)) || (t > B(66) && t < B(84));
  badge(O, 'EN ISO 17892-5', win(t, B(8.2), B(84), 0.4, 0.4) * (big ? 0 : 1));
  const OX = POS.O[0], OZ = POS.O[1];
  if (t > B(8) && t < B(10.7)) for (const [s, p, d, b] of [['MÉRŐÓRA · 0,01 mm', [OX + 0.012, BT + 0.2, OZ + 0.07], [-200, -90], 8.4], ['AKASZTÓ', [OX + 0.8, BT - 0.05, OZ], [140, -40], 9.2], ['IDŐMÉRŐ', [POS.timer[0], BT + 0.03, POS.timer[1]], [-160, 70], 9.6]])
    L3(O, proj, W3(...p), s, win(t, B(b), B(10.6), 0.25, 0.25), { dx: d[0], dy: d[1] });
  if (t > B(10.5) && t < B(14)) table(O, 560, 230, 800, ['Mit?', 'Mivel?'], [['összenyomódás', 'mérőóra · 0,01 mm'], ['idő', 'időmérő'], ['terhelés', 'tárcsák · kar 1:10']], win(t, B(10.6), B(13.95), 0.3, 0.3), { cols: [330, 440], size: 32, rowH: 56, title: '1.2 Mit, mivel mérünk?', color: COL.tay });
  // a víz útja: nyilak a minta tetejétől felfelé és az aljától lefelé
  if (t > B(14.6) && t < B(18.5)) { const a = win(t, B(14.8), B(18.4), 0.25, 0.3); const top = proj(...W3(OX, BT + 0.034 + 0.0206 + 0.02, OZ + 0.04)), bot = proj(...W3(OX, BT + 0.034 + 0.0206, OZ + 0.04));
    for (const dx of [-70, 0, 70]) { if (top.ok) O.arrow(top.x + dx, top.y - 8, top.x + dx, top.y - 100, a, COL.w, 7, 20); if (bot.ok) O.arrow(bot.x + dx, bot.y + 8, bot.x + dx, bot.y + 90, a, COL.w, 7, 20); } }
  if (t > B(28) && t < B(42.1)) { const a = win(t, B(28.1), B(42), 0.3, 0.3); clockCard(O, a, 'ELTELT IDŐ', TL.fmtMin(m), { y: 104 });
    if (t > B(29.6)) table(O, 1290, 190, 520, ['t', 'Δs [mm]'], TL.READ.map(x => [TL.fmtMin(x), f3(TL.sOf(x))]), win(t, B(29.7), B(42), 0.3, 0.3), { n: TL.readAt(m), title: 'Leolvasások', cols: [250, 230], size: 22, rowH: 32, color: COL.tay }); }
  if (t > B(42) && t < B(50.2)) { const a = win(t, B(42.2), B(50), 0.3, 0.3); const k = seg(t, B(43.2), B(49.2)); const U = TL.U(0.9 * k * k * 1.2);
    springModel(O, 560, 210, 800, 560, a, { load: 1, valve: 1, comp: U, u: 0.9 * (1 - U) + 0.05, drip: U < 0.97 ? 1 : 0, t }, { color: COL.tay, labels: true, title: 'Terzaghi rugós modellje' }); }
  if (t > B(50) && t < B(62.2)) { const a = win(t, B(50.2), B(62), 0.35, 0.3); const pts = TL.READ.slice(0, 12).map(x => [Math.sqrt(x), TL.sOf(x)]);
    const l1 = [[0, s0T], [16, s0T + a1 * 16]], l2 = [[0, s0T], [20, s0T + a1 * 20 / 1.15]];
    xyChart(O, 1040, 170, 820, 560, a, { xmax: 20, ymax: 0.6, xticks: [0, 5, 10, 15, 20], yticks: [0, 0.2, 0.4, 0.6], flipY: true, title: 'Taylor · s – √t', yfmt: (v) => v.toFixed(1).replace('.', ',') },
      [{ pts, upto: 1, color: COL.tay, width: 4, dots: 5 }, { pts: l1, upto: clamp(seg(t, B(51.2), B(52.4))), color: C.white, width: 2, dash: [8, 6], glow: false, head: false }, { pts: l2, upto: clamp(seg(t, B(54.6), B(55.8))), color: COL.cas, width: 2, dash: [8, 6], glow: false, head: false }],
      [{ x: rt90, y: s90, color: COL.acc, a: win(t, B(56.0), B(62), 0.3, 0.3), vline: true, text: '√t_{90}', dx: 14, dy: -26, size: 28 }]);
    axisLab(O, 1040, 170, 820, 560, a, '√t [√perc]', 's [mm]', { ylBottom: true });
    if (t > B(58)) formula(O, 110, 170, ['t_{90} ≈ ' + Math.round(t90) + ' perc', 'c_v = 0,848 · H^2 / t_{90}', 'c_v ≈ ' + f2(cvT) + ' mm^2/perc'], win(t, B(58.2), B(62), 0.3, 0.3), { size: 34, title: 'Taylor', color: COL.tay }); }
  if (t > B(62) && t < B(74.2)) { const a = win(t, B(62.2), B(74), 0.35, 0.3); const pts = TL.READ.map(x => [lg(x), TL.sOf(x)]);
    const tg = [[lg(5), TL.sOf(ti) + dsl * (lg(5) - lg(ti))], [lg(800), TL.sOf(ti) + dsl * (lg(800) - lg(ti))]], sc = [[lg(60), TL.sOf(480) + sec * (lg(60) - lg(480))], [lg(1440), TL.sOf(1440)]];
    logChart(O, 1040, 170, 820, 560, a, { xmin: -1, xmax: lg(1440), ymin: 0, ymax: 0.6, xticks: [-1, 0, 1, 2, 3], yticks: [0, 0.2, 0.4, 0.6], flipY: true, title: 'Casagrande · s – log t', yfmt: (v) => v.toFixed(1).replace('.', ',') },
      [{ pts, upto: 1, color: COL.cas, width: 4, dots: 5 }, { pts: tg, upto: clamp(seg(t, B(63.2), B(64.4))), color: C.white, width: 2, dash: [8, 6], glow: false, head: false }, { pts: sc, upto: clamp(seg(t, B(64.0), B(65.2))), color: C.white, width: 2, dash: [8, 6], glow: false, head: false }],
      [{ x: lt100, y: s100C, color: COL.acc, a: win(t, B(65.2), B(74), 0.3, 0.3), vline: true, text: 't_{100}', dx: 12, dy: -26, size: 28 }, { x: lg(t50), y: s50, color: COL.tay, a: win(t, B(66.8), B(74), 0.3, 0.3), vline: true, hline: true, text: 't_{50}', dx: 12, dy: -26, size: 28 },
        { x: lg(1000), y: TL.sOf(1000), color: C.white, a: win(t, B(70.6), B(74), 0.3, 0.3), text: 'kúszás', dx: -60, dy: 30, size: 24 }]);
    axisLab(O, 1040, 170, 820, 560, a, 't [perc]', 's [mm]', { ylBottom: true });
    if (t > B(67.2)) formula(O, 110, 170, ['t_{50} ≈ ' + Math.round(t50) + ' perc', 'c_v = 0,197 · H^2 / t_{50}', 'c_v ≈ ' + f2(cvC) + ' mm^2/perc'], win(t, B(67.4), B(74), 0.3, 0.3), { size: 34, title: 'Casagrande', color: COL.cas }); }
  if (t > B(74) && t < B(79)) formula(O, 110, 190, ['k = c_v · γ_w / E_{oed}', '≈ 2,5 · 10^{−11} m/s'], win(t, B(74.2), B(78.8), 0.3, 0.3), { size: 40, title: 'Áteresztőképesség', color: COL.w });
  if (t > B(78.9) && t < B(84)) formula(O, 110, 190, ['t_{90} = 0,848 · H^2 / c_v', 'H = 2 m: t_{90} ≈ ' + Math.round(tField) + ' év'], win(t, B(79.0), B(83.8), 0.3, 0.3), { size: 38, title: 'Terepen', color: COL.w });
  if (t > B(84) && t < B(88.2)) O.list(110, 170, 820, ['t_{90} ≈ ' + Math.round(t90) + ' perc · t_{50} ≈ ' + Math.round(t50) + ' perc', 'c_v ≈ 0,6 mm^2/perc', 'k ≈ 2,5·10^{−11} m/s', 'Terepen: t = T · H^2 / c_v'], [B(84.2), B(84.6), B(85), B(85.4)], t, win(t, B(84.1), B(88), 0.2, 0.3), { title: 'Összegzés', color: C.accent, mark: '›', size: 30 });
  endCard(O, t, B, TOTAL, 88, 'KONSZOLIDÁCIÓ', null, 'Következik: közvetlen nyíróvizsgálat');
  runCaptions(O, t, CAPS);
  finish(O, t, TOTAL, CHAPTERS);
}
