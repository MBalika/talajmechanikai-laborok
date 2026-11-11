// Konszolidációs vizsgálat – feliratok, rugós modell, s–√t (Taylor) és s–log t (Casagrande), c_v, k
import { clamp, smooth, seg, win, fmt, C, runCaptions, xyChart, L3, chip, badge, clockCard, table, formula, logChart, axisLab, openTitle, endCard, finish } from '../tm_lab/ui.js';
import { springModel } from '../tx_triax/charts.js';
import { LX, BT } from '../tm_lab/room.js';
import * as TL from './timeline.js';
import { tb, TOTAL, CHAPTERS, COL } from './timeline.js';
import { POS } from './app.js';
const B = tb, W3 = (x, y, z) => [LX + x, y, z], lg = Math.log10, f2 = (v) => v.toFixed(2).replace('.', ','), f1 = (v) => v.toFixed(1).replace('.', ',');
// Taylor-szerkesztés
const a1 = (TL.sOf(4) - TL.sOf(1)) / (2 - 1), s0T = TL.sOf(1) - a1;
const bis = (f, lo, hi) => { for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (f(lo) * f(m) <= 0) hi = m; else lo = m; } return (lo + hi) / 2; };
const rt90 = bis((r) => TL.sOf(r * r) - (s0T + a1 * r / 1.15), 3, 30), t90 = rt90 * rt90, s90 = TL.sOf(t90), s100T = s0T + (s90 - s0T) / 0.9;
// Casagrande-szerkesztés
const ti = 40, dsl = (TL.sOf(ti * 1.05) - TL.sOf(ti / 1.05)) / (2 * lg(1.05)), sec = (TL.sOf(1440) - TL.sOf(480)) / (lg(1440) - lg(480));
const lt100 = (TL.sOf(480) - sec * lg(480) - (TL.sOf(ti) - dsl * lg(ti))) / (dsl - sec), t100 = Math.pow(10, lt100), s100C = TL.sOf(ti) + dsl * (lt100 - lg(ti));
const s0C = TL.sOf(0.25) - (TL.sOf(1) - TL.sOf(0.25)), s50 = (s0C + s100C) / 2, t50 = bis((tm) => TL.sOf(tm) - s50, 0.5, 400);
const cvT = 0.848 * TL.HDR ** 2 / t90, cvC = 0.197 * TL.HDR ** 2 / t50;
const CAPS = [
  [B(8.3), B(12), 'Egy lépcső', ['100 → *200 kPa*; a víz alul és', 'felül távozik: *H = h / 2*']],
  [B(12.1), B(16), 'Leolvasások', ['6 s, 15 s, 30 s, 1, 2, 4 perc …', '*24 óráig* olvassuk a mérőórát']],
  [B(16.1), B(20), 'Mi történik?', ['A terhet először a *víz* viseli,', 'ahogy kiáramlik, átveszi a *váz*']],
  [B(20.1), B(24), 'Taylor-módszer', ['s a *√t* függvényében: a kezdeti', 'szakaszra egyenes illeszthető']],
  [B(24.1), B(28), '90 %-os pont', ['*1,15*-szörös egyenes: *t_{90}*']],
  [B(28.1), B(32), 'Casagrande-módszer', ['s a *log t* függvényében:', 'két érintő metszése a *t_{100}*']],
  [B(32.1), B(35), 'Kúszás', ['Utána *másodlagos* összenyomódás']],
  [B(35.1), B(40), 'Áteresztőképesség', ['*k* a konszolidációból']],
];
export function drawOverlay(O, t, ctx) {
  const { proj, C: S } = ctx; const g = O.g; const m = S ? S.m : 0;
  openTitle(O, t, B, TOTAL, { q1: 'Mennyi idő alatt süllyed?', q2: 'Amíg a víz kijut', title: 'Konszolidációs\nvizsgálat', sub: 'Idő–összenyomódás görbe' });
  for (const [b0, b1, n] of [[8, 20, '1  Mérés'], [20, 28, '2  Taylor'], [28, 35, '3  Casagrande'], [35, 44, '4  Eredmény']]) chip(O, n, win(t, B(b0), B(b1), 0.25, 0.25));
  badge(O, 'EN ISO 17892-5', win(t, B(8.2), B(44), 0.4, 0.4));
  // víz ki: nyilak a minta tetejétől és aljától (10–12)
  if (t > B(10) && t < B(12.2)) { const a = win(t, B(10.2), B(12), 0.2, 0.3); const top = proj(...W3(POS.oed, BT + 0.04 + 0.034 + 0.015, -1.12)), bot = proj(...W3(POS.oed, BT + 0.04 + 0.012, -1.12));
    for (const dx of [-60, 0, 60]) { if (top.ok) O.arrow(top.x + dx, top.y - 10, top.x + dx, top.y - 110, a, COL.w, 7, 20); if (bot.ok) O.arrow(bot.x + dx, bot.y + 10, bot.x + dx, bot.y + 100, a, COL.w, 7, 20); } }
  if (t > B(12) && t < B(20.2)) { const a = win(t, B(12.2), B(20), 0.3, 0.3); clockCard(O, a, 'ELTELT IDŐ', TL.fmtMin(m));
    if (t > B(16)) { const U = TL.U(TL.Tv(m)); springModel(O, 1080, 380, 760, 470, win(t, B(16.2), B(20), 0.3, 0.3), { load: 1, valve: 1, comp: U, u: 0.9 * (1 - U) + 0.05, drip: U < 0.97 ? 1 : 0, t }, { color: COL.tay, labels: true }); }
    if (t < B(16)) { const n = TL.READ.filter(x => x <= m).length; table(O, 1240, 360, 560, ['t', 's [mm]'], TL.READ.slice(0, 7).map(x => [TL.fmtMin(x), f2(TL.sOf(x))]), a, { n, title: 'Leolvasások', cols: [260, 260], size: 26, rowH: 40 }); } }
  // Taylor
  if (t > B(20) && t < B(28.2)) { const a = win(t, B(20.2), B(28), 0.35, 0.3); const pts = TL.READ.slice(0, 12).map(x => [Math.sqrt(x), TL.sOf(x)]);
    const l1 = [[0, s0T], [16, s0T + a1 * 16]], l2 = [[0, s0T], [20, s0T + a1 * 20 / 1.15]];
    xyChart(O, 1040, 170, 820, 560, a, { xmax: 20, ymax: 0.6, xticks: [0, 5, 10, 15, 20], yticks: [0, 0.2, 0.4, 0.6], flipY: true, title: 'Taylor · s – √t', yfmt: (v) => v.toFixed(1).replace('.', ',') },
      [{ pts, upto: 1, color: COL.tay, width: 4, dots: 5 }, { pts: l1, upto: clamp(seg(t, B(21), B(22))), color: C.white, width: 2, dash: [8, 6], glow: false, head: false }, { pts: l2, upto: clamp(seg(t, B(24.2), B(25.2))), color: COL.cas, width: 2, dash: [8, 6], glow: false, head: false }],
      [{ x: rt90, y: s90, color: COL.acc, a: win(t, B(25.4), B(28), 0.3, 0.3), vline: true, text: '√t_{90}', dx: 14, dy: -26, size: 28 }]);
    axisLab(O, 1040, 170, 820, 560, a, '√t [√perc]', 's [mm]', { ylBottom: true });
    if (t > B(25.2)) formula(O, 120, 170, ['t_{90} ≈ ' + Math.round(t90) + ' perc', 'c_v = T_{90} · H^2 / t_{90}', 'c_v ≈ ' + f2(cvT) + ' mm²/perc'], win(t, B(25.3), B(28), 0.3, 0.3), { size: 34, title: 'Taylor', color: COL.tay }); }
  // Casagrande
  if (t > B(28) && t < B(35.2)) { const a = win(t, B(28.2), B(35), 0.35, 0.3); const pts = TL.READ.map(x => [lg(x), TL.sOf(x)]);
    const tg = [[lg(5), TL.sOf(ti) + dsl * (lg(5) - lg(ti))], [lg(800), TL.sOf(ti) + dsl * (lg(800) - lg(ti))]], sc = [[lg(60), TL.sOf(480) + sec * (lg(60) - lg(480))], [lg(1440), TL.sOf(1440)]];
    logChart(O, 1040, 170, 820, 560, a, { xmin: -1, xmax: lg(1440), ymin: 0, ymax: 0.6, xticks: [-1, 0, 1, 2, 3], yticks: [0, 0.2, 0.4, 0.6], flipY: true, title: 'Casagrande · s – log t', yfmt: (v) => v.toFixed(1).replace('.', ',') },
      [{ pts, upto: 1, color: COL.cas, width: 4, dots: 5 }, { pts: tg, upto: clamp(seg(t, B(29), B(30))), color: C.white, width: 2, dash: [8, 6], glow: false, head: false }, { pts: sc, upto: clamp(seg(t, B(29.5), B(30.5))), color: C.white, width: 2, dash: [8, 6], glow: false, head: false }],
      [{ x: lt100, y: s100C, color: COL.acc, a: win(t, B(30.6), B(35), 0.3, 0.3), vline: true, text: 't_{100}', dx: 12, dy: -26, size: 28 }, { x: lg(t50), y: s50, color: COL.tay, a: win(t, B(31.2), B(35), 0.3, 0.3), vline: true, hline: true, text: 't_{50}', dx: 12, dy: -26, size: 28 }]);
    axisLab(O, 1040, 170, 820, 560, a, 't [perc]', 's [mm]', { ylBottom: true });
    if (t > B(31.2)) formula(O, 120, 170, ['t_{50} ≈ ' + Math.round(t50) + ' perc', 'c_v = 0,197 · H^2 / t_{50}', 'c_v ≈ ' + f2(cvC) + ' mm²/perc'], win(t, B(31.4), B(35), 0.3, 0.3), { size: 34, title: 'Casagrande', color: COL.cas }); }
  if (t > B(35) && t < B(40.2)) formula(O, 120, 200, ['c_v = 0,6 mm²/perc = 1,0 · 10^{−8} m²/s', 'k = c_v · γ_w / E_{oed}', 'k = 1,0·10^{−8} · 10 / 4000 ≈ 2,5·10^{−11} m/s'], win(t, B(35.2), B(40), 0.3, 0.3), { size: 36, title: 'Áteresztőképesség', color: COL.w });
  if (t > B(40) && t < B(44.2)) O.list(120, 200, 820, ['t_{90} ≈ 132 perc · t_{50} ≈ 31 perc', 'c_v ≈ 0,6 mm²/perc', 'k ≈ 2,5·10^{−11} m/s', 'Terepen: t = T · H^2 / c_v'], [B(40.2), B(40.6), B(41), B(41.4)], t, win(t, B(40.1), B(44), 0.2, 0.3), { title: 'Összegzés', color: C.accent, mark: '›', size: 32 });
  endCard(O, t, B, TOTAL, 44, 'KONSZOLIDÁCIÓ', 'idő–összenyomódás · c_v', 'Következik: közvetlen nyíróvizsgálat');
  runCaptions(O, t, CAPS);
  finish(O, t, TOTAL, CHAPTERS);
}
