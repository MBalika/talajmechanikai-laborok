// Folyási határ – feliratok, táblázatok, szemilogaritmikus kiértékelés
import { clamp, smooth, seg, win, fmt, C, FH, runCaptions, L3, chip, badge, clockCard, table, formula, logChart, axisLab, openTitle, endCard, finish } from '../tm_lab/ui.js';
import { LX, BT } from '../tm_lab/room.js';
import * as TL from './timeline.js';
import { tb, TOTAL, CHAPTERS, COL } from './timeline.js';
import { POS } from './app.js';
const B = tb, W3 = (x, y, z) => [LX + x, y, z], lg = Math.log10, d2 = (v) => v.toFixed(1).replace('.', ',');
const CAPS = [
  [B(8.3), B(12), 'Előkészítés', ['A 0,4 mm alatti részt desztillált', 'vízzel *homogén péppé* keverjük']],
  [B(12.1), B(15), 'Csésze', ['*Légbuborék nélkül* töltjük,', 'a felszínt lesimítjuk']],
  [B(15.1), B(19), 'Ejtőkúp', ['*80 g*, 30°-os kúp: a csúcs', 'éppen érinti a felszínt']],
  [B(19.1), B(22), 'Elengedés', ['*5 s* alatt a pépbe hatol,', 'a behatolást mérjük']],
  [B(22.1), B(25), 'Ismétlés', ['*Háromszor*, az átlag számít']],
  [B(25.1), B(28), 'Víztartalom', ['A kráter mellől tégelybe:', 'mérés, *szárítás* 105 °C-on']],
  [B(28.1), B(32), 'Újabb pontok', ['Víz hozzá, újrakeverés:', '*3–4* különböző víztartalom']],
  [B(32.1), B(37), 'Kiértékelés', ['Szemilogaritmikus ábra:', 'a *20 mm*-hez tartozó w a *w_L*']],
  [B(37.1), B(39), 'Casagrande-csésze', ['Szabványos *árok* a pépben']],
  [B(39.1), B(43), 'Ütések', ['A csésze *1 cm*-ről esik,', 'amíg az árok össze nem zárul']],
  [B(43.1), B(45), 'Kiértékelés', ['*25 ütés* → *w_L*']],
];
export function drawOverlay(O, t, ctx) {
  const { proj } = ctx;
  openTitle(O, t, B, TOTAL, { q1: 'Mikor folyik a talaj?', q2: 'A kúp megmondja', title: 'Folyási határ', sub: 'Ejtőkúp és Casagrande-csésze' });
  for (const [b0, b1, n] of [[8, 15, '1  Előkészítés'], [15, 32, '2  Ejtőkúp'], [32, 37, '3  Kiértékelés'], [37, 45, '4  Casagrande'], [45, 48, '5  Eredmény']]) chip(O, n, win(t, B(b0), B(b1), 0.25, 0.25));
  badge(O, 'EN ISO 17892-12', win(t, B(8.2), B(48), 0.4, 0.4));
  if (t > B(8) && t < B(12)) L3(O, proj, W3(POS.plate - 0.12, BT + 0.01, -1.08), 'ÜVEGLAP', win(t, B(8.8), B(12), 0.3, 0.3), { dx: -150, dy: -110 });
  if (t > B(15) && t < B(19)) L3(O, proj, W3(POS.cone, BT + 0.09, -1.12), 'KÚP · 80 g · 30°', win(t, B(15.6), B(19), 0.3, 0.3), { dx: 170, dy: -110 });
  if (t > B(19) && t < B(22)) clockCard(O, win(t, B(19.3), B(22), 0.3, 0.3), 'BEHATOLÁS', '5 s');
  if (t > B(22) && t < B(25.2)) { const n = clamp(seg(t, B(22.2), B(24.8)) * 4, 0, 4); table(O, 1180, 170, 600, ['mérés', 'd [mm]'], [['1.', '15,4'], ['2.', '15,8'], ['3.', '15,6'], ['átlag', '15,6']], win(t, B(22.2), B(25), 0.3, 0.3), { n, title: 'Ejtőkúp', cols: [300, 260], size: 30, rowH: 48, hi: 3 }); }
  if (t > B(37) && t < B(39)) L3(O, proj, W3(POS.cas - 0.02, BT + 0.09, -1.05), 'ÁROKHÚZÓ', win(t, B(37.9), B(39), 0.25, 0.25), { dx: -170, dy: -90 });
  if (t > B(39) && t < B(43)) L3(O, proj, W3(POS.cas + 0.1, BT + 0.065, -1.01), 'SZÁMLÁLÓ', win(t, B(39.4), B(43), 0.3, 0.3), { dx: 160, dy: -100 });
  // pontok és kiértékelés (ejtőkúp)
  if (t > B(28) && t < B(37.2)) { const a = win(t, B(28.3), B(37), 0.35, 0.3); const n = t < B(32) ? 1 + clamp(seg(t, B(28.5), B(31.8)) * 3, 0, 3) : 4;
    if (t < B(32)) table(O, 1180, 170, 600, ['d [mm]', 'w [%]'], TL.CONE.map(([d, w]) => [d2(d), d2(w)]), a, { n, title: 'Mérési pontok', cols: [280, 280], size: 30, rowH: 48 });
    else { const pts = TL.CONE.map(([d, w]) => [lg(d), w]); const k = seg(t, B(32.4), B(34));
      const r = logChart(O, 1000, 170, 860, 560, a, { xmin: lg(12), xmax: lg(30), ymin: 38, ymax: 54, xticks: [lg(15), lg(20), lg(25), lg(30)], yticks: [40, 44, 48, 52], title: 'Ejtőkúp · szemilogaritmikus' },
        [{ pts: pts, upto: 1, color: COL.cone, width: 0.001, dots: 7, glow: false, head: false }, { pts: [[lg(13), TL.WL + (lg(13) - lg(20)) * 47.1], [lg(28), TL.WL + (lg(28) - lg(20)) * 47.1]], upto: k, color: C.white, width: 3 }],
        [{ x: lg(20), y: TL.WL, color: COL.acc, a: win(t, B(34.3), B(37), 0.3, 0.3), vline: true, hline: true, text: 'w_L = 46,9 %', dx: 16, dy: -26, size: 30 }]);
      axisLab(O, 1000, 170, 860, 560, a, 'd [mm]', 'w [%]'); } }
  // Casagrande
  if (t > B(39) && t < B(43)) clockCard(O, win(t, B(39.3), B(43), 0.3, 0.3), 'ÜTÉSSZÁM', String(TL.blows(t)));
  if (t > B(43) && t < B(48.2)) { const a = win(t, B(43.2), B(48), 0.35, 0.3); const pts = TL.CAS.map(([N, w]) => [lg(N), w]); const k = seg(t, B(43.4), B(44.4)); const s = -17.4;
    logChart(O, 1000, 170, 860, 560, a, { xmin: 1.0, xmax: lg(50), ymin: 42, ymax: 53, xticks: [1, lg(20), lg(25), lg(40)], yticks: [44, 48, 52], title: 'Casagrande · szemilogaritmikus' },
      [{ pts, upto: 1, color: COL.cas, width: 0.001, dots: 7, glow: false, head: false }, { pts: [[lg(12), TL.WL_CAS + (lg(12) - lg(25)) * s], [lg(45), TL.WL_CAS + (lg(45) - lg(25)) * s]], upto: k, color: C.white, width: 3 }],
      [{ x: lg(25), y: TL.WL_CAS, color: COL.acc, a: win(t, B(44.3), B(48), 0.3, 0.3), vline: true, hline: true, text: 'w_L = 47,2 %', dx: 16, dy: -26, size: 30 }]);
    axisLab(O, 1000, 170, 860, 560, a, 'N [ütés]', 'w [%]'); }
  if (t > B(45) && t < B(48.2)) formula(O, 120, 170, ['Ejtőkúp: w_L = 46,9 %', 'Casagrande: w_L = 47,2 %'], win(t, B(45.2), B(48), 0.3, 0.3), { size: 40, title: 'Folyási határ' });
  endCard(O, t, B, TOTAL, 48, 'FOLYÁSI HATÁR', '20 mm behatolás · 25 ütés', 'Következik: sodrási határ');
  runCaptions(O, t, CAPS);
  finish(O, t, TOTAL, CHAPTERS);
}
