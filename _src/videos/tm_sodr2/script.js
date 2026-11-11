// Sodrási határ – feliratok (lépésszámokkal), címkék, képletek, plaszticitási diagram
import { clamp, smooth, seg, win, C, runCaptions, L3, chip, badge, clockCard, table, formula, xyChart, axisLab, openTitle, endCard, finish } from '../tm_lab/ui.js';
import { LX, BT } from '../tm_lab/room.js';
import * as TL from './timeline.js';
import { tb, TOTAL, CHAPTERS, COL } from './timeline.js';
import { POS } from './app.js';
const B = tb, W3 = (x, y, z) => [LX + x, y, z], d1 = (v, n = 1) => v.toFixed(n).replace('.', ',');
const CAPS = [
  [B(8.3), B(11.0), '1.1 Az eszközök', ['Üveglap, spatula, *3 mm*-es pálca,', 'tégely fedővel, mérleg']],
  [B(14.3), B(16.7), '2.1 Minta', ['A pasztából *~20 g*-ot veszünk']],
  [B(16.8), B(21.5), '2.2 Gombóc', ['A tenyerek között görgetjük:', 'a kéz melege kissé *szárítja*']],
  [B(22.5), B(25.7), '2.3 Négy rész', ['A gombócot négy részre osztjuk']],
  [B(26.6), B(32.0), '3.1 Sodrás', ['Az üveglapon, a tenyérrel', '*egyenletes* fonállá sodorjuk']],
  [B(32.2), B(39.8), '3.1 Sodrás', ['Percenként *80–90* oda-vissza,', 'amíg a fonál *3 mm* vastag']],
  [B(40.0), B(43.4), '3.2 Nem morzsolódik?', ['Túl nedves: összegyúrjuk,', 'és *újra sodorjuk*']],
  [B(43.6), B(49.4), '3.3 Újra', ['A pálcával *összevetjük*', 'az átmérőt']],
  [B(49.6), B(51.9), '3.4 Morzsolódik', ['*3 mm*-nél szétesik: elértük', 'a sodrási határt']],
  [B(52.2), B(56.5), '4.1 A tégelybe', ['A darabokat *azonnal*', 'a tégelybe tesszük']],
  [B(56.6), B(57.9), '4.2 Fedő', ['Ne száradjon tovább']],
  [B(58.0), B(60.0), '4.3 Mérés', ['Nedves tömeg']],
  [B(60.2), B(61.3), '5.1 Szárítás', ['*105 °C*, 24 óra']],
  [B(61.4), B(65.8), '5.2 Víztartalom', ['A száraz tömegből: *w*']],
  [B(66.0), B(71.8), '5.3 Két meghatározás', ['Másik három részből is;', 'az átlag a *w_P*']],
  [B(72.2), B(77.8), '6.1 Plasztikus index', ['*I_P = w_L − w_P*: ennyi vízben', '*képlékeny* a talaj']],
  [B(78.0), B(85.8), '6.2 Plaszticitási diagram', ['Az *A-vonal* fölött: agyag']],
];
export function drawOverlay(O, t, ctx) {
  const { proj } = ctx;
  openTitle(O, t, B, TOTAL, { q1: 'Mikor morzsolódik a talaj?', q2: 'Lépésről lépésre', title: 'Sodrási\nhatár', sub: 'Sodrás 3 mm-es fonálig' });
  for (const [b0, b1, n] of [[8, 14, '1  Az eszközök'], [14, 26, '2  Előkészítés'], [26, 52, '3  Sodrás'], [52, 60, '4  A tégelybe'], [60, 72, '5  Víztartalom'], [72, 86, '6  Plasztikus index']]) chip(O, n, win(t, B(b0), B(b1), 0.25, 0.25));
  const big = (t > B(11) && t < B(14)) || (t > B(61.3) && t < B(86));
  badge(O, 'EN ISO 17892-12', win(t, B(8.2), B(86), 0.4, 0.4) * (big ? 0 : 1));
  if (t > B(8) && t < B(11.1)) for (const [s, p, d, b] of [['3 mm-es PÁLCA', [POS.ROD[0], BT + 0.008, POS.ROD[1]], [-170, -80], 8.6], ['TÉGELY + FEDŐ', [POS.TIN[0], BT + 0.02, POS.TIN[1]], [150, -80], 9.4]])
    L3(O, proj, W3(...p), s, win(t, B(b), B(11), 0.25, 0.25), { dx: d[0], dy: d[1] });
  if (t > B(11) && t < B(14)) table(O, 600, 230, 720, ['Mit?', 'Mivel?'], [['fonál átmérője', '3 mm-es pálca'], ['víztartalom', 'mérleg · 105 °C']], win(t, B(11.1), B(13.9), 0.3, 0.3), { cols: [330, 360], size: 32, rowH: 56, title: '1.2 Mit, mivel mérünk?', color: COL.pl });
  if (t > B(43.6) && t < B(52)) { const r = TL.threadR(t) * 2000; L3(O, proj, W3(POS.WORK[0] - 0.05, BT + 0.008, POS.WORK[1]), 'Ø ' + d1(r) + ' mm', win(t, B(44.2), B(51.9), 0.25, 0.25), { dx: -180, dy: -90 }); }
  if (t > B(60.2) && t < B(61.35)) clockCard(O, win(t, B(60.25), B(61.3), 0.15, 0.15), '105 °C', '24 óra', { y: 104 });
  if (t > B(61.3) && t < B(66)) formula(O, 110, 170, ['w = (m_n − m_{sz}) / (m_{sz} − m_t)', '= (24,85 − 23,17) / (23,17 − 16,20)', '= ' + d1(TL.w1) + ' %'], win(t, B(61.5), B(65.9), 0.3, 0.3), { size: 36, title: 'Víztartalom', color: COL.pl });
  if (t > B(66) && t < B(72)) table(O, 600, 220, 720, ['', 'w [%]'], [['1. meghatározás', d1(TL.w1)], ['2. meghatározás', d1(TL.w2)], ['átlag: w_P', d1(TL.WP)]], win(t, B(66.1), B(71.9), 0.3, 0.3), { cols: [420, 270], size: 32, rowH: 56, title: 'Sodrási határ', color: COL.pl, hi: 2 });
  if (t > B(72) && t < B(78)) formula(O, 110, 170, ['I_P = w_L − w_P', '= ' + d1(TL.WL) + ' − ' + d1(TL.WP) + ' = ' + d1(TL.IP) + ' %'], win(t, B(72.3), B(77.9), 0.3, 0.3), { size: 40, title: 'Plasztikus index', color: COL.pl });
  if (t > B(78) && t < B(86.2)) { const a = win(t, B(78.1), B(86), 0.3, 0.3), k = clamp(seg(t, B(79), B(80.5)));
    xyChart(O, 980, 160, 900, 600, a, { xmin: 0, xmax: 80, ymin: 0, ymax: 50, xticks: [0, 20, 35, 50, 70], yticks: [0, 10, 20, 30, 40, 50], title: 'Plaszticitási diagram' },
      [{ pts: [[20, 0], [80, 43.8]], upto: 1, color: C.white, width: 2.5, glow: false, head: false }, { pts: [[35, 0], [35, 50]], upto: 1, color: 'rgba(255,255,255,0.35)', width: 1.5, dash: [6, 6], glow: false, head: false }, { pts: [[50, 0], [50, 50]], upto: 1, color: 'rgba(255,255,255,0.35)', width: 1.5, dash: [6, 6], glow: false, head: false },
        { pts: [[TL.WL, TL.IP]], upto: k, color: COL.pl, width: 0.001, dots: 11, glow: false, head: false }],
      [{ x: 66, y: 34, color: C.white, a, text: 'A-vonal', dx: 0, dy: 0, size: 24 }, { x: TL.WL, y: TL.IP, color: COL.pl, a: a * k, text: 'CI · közepes plaszticitású agyag', dx: -380, dy: -46, size: 26 }]);
    axisLab(O, 980, 160, 900, 600, a, 'w_L [%]', 'I_P [%]', { ylBottom: true }); }
  if (t > B(86) && t < B(90.2)) O.list(100, 170, 760, ['Sodrás 3 mm-es fonálig', 'Morzsolódáskor: w_P', 'Két meghatározás átlaga', 'I_P = w_L − w_P'], [B(86.3), B(86.8), B(87.3), B(87.8)], t, win(t, B(86.2), B(90), 0.2, 0.3), { title: 'Összegzés', color: C.accent, mark: '›', size: 30 });
  endCard(O, t, B, TOTAL, 90, 'SODRÁSI HATÁR', null, 'Következik: zsugorodási határ');
  runCaptions(O, t, CAPS);
  finish(O, t, TOTAL, CHAPTERS);
}
