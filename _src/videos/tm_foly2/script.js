// Folyási határ – feliratok (lépésszámokkal), címkék, táblázatok, képletek, diagramok (w – behatolás, w – log N)
import { clamp, smooth, seg, win, C, runCaptions, L3, chip, badge, clockCard, table, formula, xyChart, logChart, axisLab, openTitle, endCard, finish } from '../tm_lab/ui.js';
import { LX, BT } from '../tm_lab/room.js';
import * as TL from './timeline.js';
import { tb, TOTAL, CHAPTERS, COL } from './timeline.js';
import { POS } from './app.js';
const B = tb, W3 = (x, y, z) => [LX + x, y, z], lg = Math.log10, d1 = (v, n = 1) => v.toFixed(n).replace('.', ',');
const WL = d1(TL.WL), WLC = d1(TL.WLC);
const CAPS = [
  [B(8.3), B(11.8), '1.1 Az ejtőkúp', ['*80 g*-os, *30°*-os kúp; a csésze', 'Ø 55 mm, 40 mm mély']],
  [B(12.2), B(13.7), '1.2 Casagrande', ['Ütögetett sárgaréz csésze']],
  [B(16.3), B(18.5), '2.1 Desztillált víz', ['A 0,4 mm alatti talajhoz', 'desztillált vizet adunk']],
  [B(18.8), B(23.7), '2.2 Keverés', ['Két spatulával *legalább 10 percig*,', 'egyenletes pasztává']],
  [B(23.8), B(24.9), '2.3 Pihentetés', ['*24 óra*, letakarva']],
  [B(25.0), B(29.2), '2.4 A csésze töltése', ['Rétegenként, *légbuborék nélkül*', 'nyomkodjuk a csészébe']],
  [B(29.3), B(31.7), '2.5 Lehúzás', ['A spatula élével *síkra* húzzuk']],
  [B(32.0), B(33.6), '3.1 A kúp alá', ['A csészét a talpra tesszük']],
  [B(33.7), B(36.4), '3.2 Leengedés', ['A kúp csúcsa épp *érintse*', 'a pép felszínét']],
  [B(36.5), B(37.4), '3.3 Nullázás', ['A kijelző: *0,0*']],
  [B(37.5), B(40.3), '3.4 Elengedés', ['A kúp *5 másodpercig* süllyed']],
  [B(40.4), B(41.6), '3.5 Leolvasás', ['Behatolás: *15,6 mm*']],
  [B(41.7), B(43.6), '3.6 Vissza', ['A kúpot visszatoljuk,', 'a fejet felemeljük']],
  [B(43.8), B(46.0), '3.7 Ismétlés', ['Eltérés < *0,5 mm*: átlag 15,7 mm']],
  [B(46.2), B(49.6), '4.1 Minta', ['A kúp helyéről *~10 g*-ot', 'tégelybe teszünk']],
  [B(49.8), B(51.1), '4.2 Mérés', ['Nedves tömeg']],
  [B(51.2), B(52.4), '4.3 Szárítás', ['*105 °C*, 24 óra']],
  [B(52.5), B(56.0), '4.4 Víztartalom', ['A száraz tömegből: *w*']],
  [B(56.2), B(59.5), '5.1 Több pont', ['Vizet adunk, újra keverünk:', 'a pép *lágyabb* lesz']],
  [B(59.8), B(63.9), '5.2 Négy pont', ['A behatolás *15 és 25 mm* között']],
  [B(64.2), B(67.8), '5.3 Minden pontnál', ['Behatolás és *víztartalom*']],
  [B(68.2), B(72.6), '6.1 w – behatolás', ['A pontokra *egyenes* illeszkedik']],
  [B(72.8), B(77.8), '6.2 Folyási határ', ['A *20 mm*-hez tartozó víztartalom']],
  [B(78.2), B(81.4), '7.1 Casagrande-csésze', ['A pépet a csészébe tesszük']],
  [B(81.5), B(83.0), '7.2 Lehúzás', ['Vízszintesen, *10 mm* vastagon']],
  [B(83.2), B(85.7), '7.3 Barázda', ['Középen, a csukló', '*tengelyére merőlegesen*']],
  [B(85.9), B(91.4), '7.4 Ütések', ['*2 ütés másodpercenként*: a csésze', '10 mm-ről a talplapra esik']],
  [B(91.6), B(96.0), '7.5 Záródás', ['A barázda alja *10 mm* hosszon', 'összezárul: *N = 27*']],
  [B(96.2), B(99.8), '7.6 Kiértékelés', ['4 pont, log N tengely']],
  [B(100.0), B(103.8), '7.7 Eredmény', ['*25 ütésnél* olvassuk le']],
];
export function drawOverlay(O, t, ctx) {
  const { proj } = ctx;
  openTitle(O, t, B, TOTAL, { q1: 'Mikor kezd folyni a talaj?', q2: 'Lépésről lépésre', title: 'Folyási\nhatár', sub: 'Ejtőkúp és Casagrande-csésze' });
  for (const [b0, b1, n] of [[8, 16, '1  Az eszközök'], [16, 32, '2  A paszta'], [32, 46, '3  Ejtőkúp'], [46, 56, '4  Víztartalom'], [56, 68, '5  Több pont'], [68, 78, '6  Kiértékelés'], [78, 104, '7  Casagrande-módszer']]) chip(O, n, win(t, B(b0), B(b1), 0.25, 0.25));
  const big = (t > B(13.7) && t < B(16)) || (t > B(52.4) && t < B(56)) || (t > B(64) && t < B(78)) || (t > B(96) && t < B(104.2));
  badge(O, 'EN ISO 17892-12', win(t, B(8.2), B(104), 0.4, 0.4) * (big ? 0 : 1));
  const PX = POS.PEN[0], PZ = POS.PEN[1] + 0.035, CX = POS.CAS[0], CZ = POS.CAS[1];
  if (t > B(8) && t < B(12)) for (const [s, p, d, b] of [['KÚP · 80 g · 30°', [PX, BT + 0.13, PZ], [-230, 40], 8.6], ['KIOLDÓGOMB', [PX + 0.034, BT + 0.31, PZ + 0.03], [150, -60], 9.4], ['KIJELZŐ', [PX - 0.01, BT + 0.25, PZ + 0.04], [-190, -80], 10.2]])
    L3(O, proj, W3(...p), s, win(t, B(b), B(11.9), 0.25, 0.25), { dx: d[0], dy: d[1] });
  if (t > B(12) && t < B(13.8)) for (const [s, p, d, b] of [['HAJTÓKAR', [CX + 0.13, BT + 0.06, CZ + 0.03], [140, 50], 12.4]])
    L3(O, proj, W3(...p), s, win(t, B(b), B(13.7), 0.25, 0.25), { dx: d[0], dy: d[1] });
  if (t > B(13.7) && t < B(16)) table(O, 600, 230, 720, ['Mit?', 'Mivel?'], [['behatolás', 'ejtőkúp · 0,1 mm'], ['ütésszám', 'Casagrande'], ['víztartalom', 'mérleg · 105 °C']], win(t, B(13.8), B(15.9), 0.3, 0.3), { cols: [300, 390], size: 32, rowH: 56, title: '1.3 Mit, mivel mérünk?', color: COL.cone });
  if (t > B(23.8) && t < B(24.95)) clockCard(O, win(t, B(23.85), B(24.9), 0.15, 0.15), 'PIHENTETÉS', '24 óra', { y: 104 });
  if (t > B(51.2) && t < B(52.45)) clockCard(O, win(t, B(51.25), B(52.4), 0.15, 0.15), '105 °C', '24 óra', { y: 104 });
  if (t > B(52.4) && t < B(56)) formula(O, 110, 170, ['w = (m_n − m_{sz}) / (m_{sz} − m_t)', '= (33,65 − 29,16) / (29,16 − 18,42)', '= 41,8 %'], win(t, B(52.6), B(55.9), 0.3, 0.3), { size: 36, title: 'Víztartalom', color: COL.cone });
  const rows = TL.CONE.map(([p, w]) => [d1(p), d1(w)]);
  if (t > B(56) && t < B(68)) { let n = 1; for (const m of TL.MORE) n += clamp((t - B(m.rel[0] + 1.3)) / 0.5); table(O, 1350, 150, 520, ['behatolás [mm]', 'w [%]'], rows, win(t, B(56.2), B(67.9), 0.3, 0.3), { n, cols: [290, 190], size: 28, rowH: 46, title: 'Ejtőkúp', color: COL.cone }); }
  if (t > B(68) && t < B(78)) { const a = win(t, B(68.2), B(77.9), 0.3, 0.3); const k = clamp(seg(t, B(69), B(70.5))), k2 = clamp(seg(t, B(73), B(74.2)));
    const line = [[14, TL.FIT.a + TL.FIT.b * 14], [26, TL.FIT.a + TL.FIT.b * 26]];
    xyChart(O, 980, 160, 900, 600, a, { xmin: 14, xmax: 26, ymin: 40, ymax: 52, xticks: [14, 16, 18, 20, 22, 24, 26], yticks: [40, 42, 44, 46, 48, 50, 52], title: 'Víztartalom – behatolás' },
      [{ pts: TL.CONE, upto: 1, color: COL.cone, width: 0.001, dots: 8, glow: false, head: false }, { pts: line, upto: k, color: COL.cone, width: 3, glow: false, head: false },
        { pts: [[20, 40], [20, TL.WL], [14, TL.WL]], upto: k2, color: C.white, width: 2, dash: [8, 6], glow: false, head: false }],
      [{ x: 20, y: TL.WL, color: COL.acc, a: a * k2, text: 'w_L = ' + WL + ' %', dx: 16, dy: -40, size: 30 }]);
    axisLab(O, 980, 160, 900, 600, a, 'behatolás [mm]', 'w [%]', { ylBottom: true }); }
  if (t > B(91.6) && t < B(96)) L3(O, proj, W3(CX - 0.015, BT + 0.075, CZ), '10 mm', win(t, B(92.0), B(95.9), 0.25, 0.25), { dx: -170, dy: -70 });
  if (t > B(96) && t < B(104.2)) { const a = win(t, B(96.2), B(104), 0.3, 0.3); const k = clamp(seg(t, B(97), B(98.4))), k2 = clamp(seg(t, B(100.2), B(101.4)));
    const P = TL.CAS.map(([n, w]) => [lg(n), w]); const line = [[lg(12), TL.FITC.a + TL.FITC.b * lg(12)], [lg(40), TL.FITC.a + TL.FITC.b * lg(40)]];
    logChart(O, 980, 160, 900, 600, a, { xmin: lg(12), xmax: lg(40), ymin: 42, ymax: 52, xticks: [lg(15), lg(20), lg(25), lg(30), lg(40)], yticks: [42, 44, 46, 48, 50, 52], title: 'Víztartalom – ütésszám' },
      [{ pts: P, upto: 1, color: COL.cas, width: 0.001, dots: 8, glow: false, head: false }, { pts: line, upto: k, color: COL.cas, width: 3, glow: false, head: false },
        { pts: [[lg(25), 42], [lg(25), TL.WLC], [lg(12), TL.WLC]], upto: k2, color: C.white, width: 2, dash: [8, 6], glow: false, head: false }],
      [{ x: lg(25), y: TL.WLC, color: COL.acc, a: a * k2, text: 'w_L = ' + WLC + ' %', dx: 16, dy: -40, size: 30 }]);
    axisLab(O, 980, 160, 900, 600, a, 'N (log)', 'w [%]', { ylBottom: true }); }
  if (t > B(104) && t < B(108.2)) O.list(100, 170, 760, ['Ejtőkúp: 80 g, 30°, 20 mm', 'Casagrande: 25 ütés', 'w_L ≈ ' + WL + ' %', 'Négy pontból, egyenessel'], [B(104.3), B(104.8), B(105.3), B(105.8)], t, win(t, B(104.2), B(108), 0.2, 0.3), { title: 'Összegzés', color: C.accent, mark: '›', size: 30 });
  endCard(O, t, B, TOTAL, 108, 'FOLYÁSI HATÁR', null, 'Következik: sodrási határ');
  runCaptions(O, t, CAPS);
  finish(O, t, TOTAL, CHAPTERS);
}
