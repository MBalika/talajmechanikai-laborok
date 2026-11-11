// Sodrási határ – feliratok, w_P, I_P, I_C táblák
import { clamp, smooth, seg, win, C, runCaptions, L3, chip, badge, table, formula, openTitle, endCard, finish } from '../tm_lab/ui.js';
import { LX, BT } from '../tm_lab/room.js';
import * as TL from './timeline.js';
import { tb, TOTAL, CHAPTERS, COL } from './timeline.js';
import { POS } from './app.js';
const B = tb, W3 = (x, y, z) => [LX + x, y, z];
const CAPS = [
  [B(8.3), B(11), 'Előkészítés', ['A pépből *kb. 10 g*, kicsit', 'szikkasztjuk, golyóvá formáljuk']],
  [B(11.1), B(16.5), 'Sodrás', ['Tenyérrel, *egyenletes* nyomással', 'szállá sodorjuk a lapon']],
  [B(16.6), B(19.5), 'Nem reped?', ['*3 mm*-nél még ép: összegyúrjuk,', 'és újra sodorjuk (szárad)']],
  [B(19.6), B(22), 'Morzsolódás', ['A szál *3 mm*-nél reped: ez a', 'plasztikus határ']],
  [B(22.1), B(24), 'Tégely', ['A darabok *gyorsan* tégelybe']],
  [B(24.1), B(28), 'Víztartalom', ['Mérés, szárítás *105 °C*-on,', 'két párhuzamos: *w_P = 24,6 %*']],
  [B(28.1), B(34), 'Plaszticitási index', ['*I_P = w_L − w_P*:', 'a képlékeny tartomány']],
  [B(34.1), B(40), 'Konzisztenciaindex', ['A talaj *állapota*']],
];
export function drawOverlay(O, t, ctx) {
  const { proj } = ctx;
  openTitle(O, t, B, TOTAL, { q1: 'Meddig gyúrható?', q2: 'Amíg 3 mm-es szál sodorható', title: 'Sodrási határ', sub: 'Plasztikus határ · w_P' });
  for (const [b0, b1, n] of [[8, 22, '1  Sodrás'], [22, 28, '2  Víztartalom'], [28, 40, '3  Indexek']]) chip(O, n, win(t, B(b0), B(b1), 0.25, 0.25));
  badge(O, 'EN ISO 17892-12', win(t, B(8.2), B(40), 0.4, 0.4));
  if (t > B(8) && t < B(11)) L3(O, proj, W3(POS.plate - 0.08, BT + 0.007, -1.05), 'SZŰRŐPAPÍR', win(t, B(8.9), B(11), 0.3, 0.3), { dx: -170, dy: -90 });
  if (t > B(15.5) && t < B(17)) L3(O, proj, W3(POS.plate - 0.03, BT + 0.009, -0.955), '3 mm-es PÁLCA', win(t, B(15.6), B(16.9), 0.25, 0.25), { dx: -200, dy: -150, color: C.white });
  if (t > B(15.5) && t < B(17)) L3(O, proj, W3(POS.plate + 0.02, BT + 0.008, -1.0), 'SZÁL · Ø 3 mm · ÉP', win(t, B(15.8), B(16.9), 0.25, 0.25), { dx: 190, dy: -130 });
  if (t > B(24) && t < B(28.2)) table(O, 1180, 170, 600, ['minta', 'w [%]'], [['1.', '24,4'], ['2.', '24,8'], ['w_P', '24,6']], win(t, B(24.4), B(28), 0.3, 0.3), { n: clamp(seg(t, B(24.5), B(27)) * 3, 0, 3), title: 'Két párhuzamos', cols: [300, 260], size: 30, rowH: 48, hi: 2 });
  if (t > B(28) && t < B(34.2)) { const a = win(t, B(28.2), B(34), 0.3, 0.3); formula(O, 120, 170, ['I_P = w_L − w_P = 22,3 %'], a, { size: 42, title: 'Plaszticitási index', color: COL.ip });
    table(O, 1180, 170, 620, ['talajtípus', 'I_P [%]'], [['iszap', '10–15'], ['sovány agyag', '15–20'], ['közepes agyag', '20–30'], ['kövér agyag', '> 30']], win(t, B(30.2), B(34), 0.3, 0.3), { n: clamp(seg(t, B(30.4), B(32.6)) * 4, 0, 4), title: 'Osztályozás', cols: [360, 220], size: 28, rowH: 46, hi: smooth(seg(t, B(32.4), B(32.8))) > 0.5 ? 2 : -1 }); }
  if (t > B(34) && t < B(40.2)) { const a = win(t, B(34.2), B(40), 0.3, 0.3); formula(O, 120, 170, ['I_C = (w_L − w) / I_P ≈ 0,75'], a, { size: 40, title: 'w = 30,2 %', color: COL.ic });
    table(O, 1180, 170, 620, ['konzisztencia', 'I_C'], [['nagyon puha', '0–0,25'], ['puha', '0,26–0,50'], ['gyúrható', '0,51–0,75'], ['merev', '0,76–1,00'], ['kemény', '> 1']], win(t, B(36.2), B(40), 0.3, 0.3), { n: clamp(seg(t, B(36.4), B(39)) * 5, 0, 5), title: 'Állapot', cols: [360, 220], size: 28, rowH: 46, hi: smooth(seg(t, B(38.4), B(38.8))) > 0.5 ? 2 : -1 }); }
  endCard(O, t, B, TOTAL, 40, 'SODRÁSI HATÁR', '3 mm-nél morzsolódó szál · w_P', 'Következik: zsugorodási határ');
  runCaptions(O, t, CAPS);
  finish(O, t, TOTAL, CHAPTERS);
}
