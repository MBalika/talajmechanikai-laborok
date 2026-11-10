// Szervesanyag-tartalom – feliratok, tömegek, w_LOI, osztályozás
import { clamp, smooth, seg, win, C, runCaptions, L3, chip, badge, clockCard, table, formula, openTitle, endCard, finish } from '../tm_lab/ui.js';
import { LX, BT } from '../tm_lab/room.js';
import * as TL from './timeline.js';
import { tb, TOTAL, CHAPTERS, COL } from './timeline.js';
import { POS } from './app.js';
const B = tb, W3 = (x, y, z) => [LX + x, y, z], f3 = (v) => v.toFixed(3).replace('.', ','), f1 = (v) => v.toFixed(1).replace('.', ',');
const CAPS = [
  [B(8.3), B(11), 'Előkészítés', ['*110 °C*-on szárítva, aprítva,', 'a *2 mm* alatti rész kell']],
  [B(11.1), B(14), 'Tégely', ['Kiizzítva, *exszikkátorban* hűtve,', 'majd lemérve: *m_c*']],
  [B(14.1), B(17), 'Bemérés', ['*0,5–15 g* talaj, vékony rétegben']],
  [B(17.1), B(19), 'Kemencébe', ['Fogóval, a tégelyek *nyitva*']],
  [B(19.1), B(23), 'Izzítás', ['*550 ± 25 °C*, legalább *2 óra*:', 'a szerves anyag *elég*']],
  [B(23.1), B(26), 'Hűtés, mérés', ['Exszikkátorban hűl, hogy ne vegyen', 'fel nedvességet: *m_2*']],
  [B(26.1), B(31), 'Izzítási veszteség', ['Legalább *két* párhuzamos minta']],
  [B(31.1), B(36), 'Értelmezés', ['Agyagban *kristályvíz* is távozik']],
];
export function drawOverlay(O, t, ctx) {
  const { proj } = ctx;
  openTitle(O, t, B, TOTAL, { q1: 'Mennyi benne a szerves anyag?', q2: 'Elégetjük 550 °C-on', title: 'Szervesanyag-\ntartalom', sub: 'Izzítási veszteség' });
  for (const [b0, b1, n] of [[8, 17, '1  Előkészítés'], [17, 26, '2  Izzítás'], [26, 31, '3  Számítás'], [31, 40, '4  Értelmezés']]) chip(O, n, win(t, B(b0), B(b1), 0.25, 0.25));
  badge(O, 'EN 17685-1', win(t, B(8.2), B(40), 0.4, 0.4));
  if (t > B(11) && t < B(14)) { L3(O, proj, W3(POS.des, BT + 0.17, -1.1), 'EXSZIKKÁTOR', win(t, B(11.6), B(14), 0.3, 0.3), { dx: -170, dy: -90 }); L3(O, proj, W3(POS.furn, BT + 0.5, -1.15), 'IZZÍTÓKEMENCE', win(t, B(12), B(14), 0.3, 0.3), { dx: 150, dy: -90 }); }
  if (t > B(19) && t < B(23)) clockCard(O, win(t, B(19.3), B(23), 0.3, 0.3), 'IZZÍTÁS', (2 * seg(t, B(19.2), B(22.8))).toFixed(1).replace('.', ',') + ' óra', { color: COL.hot });
  if (t > B(14) && t < B(26.2)) { const rows = [['m_c (üres tégely)', f3(TL.MC)], ['m_1 (+ talaj)', t > B(15.8) ? f3(TL.M1) : '…'], ['m_2 (izzítás után)', t > B(25.2) ? f3(TL.M2) : '…']];
    table(O, 1180, 170, 680, ['tömeg', '[g]'], rows, win(t, B(15.4), B(26), 0.3, 0.3), { n: t < B(17) ? 1 + clamp(seg(t, B(15.6), B(16.6))) : t < B(25) ? 2 : 3, title: 'Mérések', cols: [440, 200], size: 28, rowH: 46 }); }
  if (t > B(26) && t < B(31.2)) { const a = win(t, B(26.2), B(31), 0.3, 0.3); formula(O, 120, 170, ['w_{LOI} = (m_1 − m_2) / (m_1 − m_c) · 100 %', 'w_{LOI} = 0,880 / 10,000 · 100 = 8,8 %', 'két minta átlaga: 8,9 %'], a, { size: 38, title: 'Izzítási veszteség', color: COL.hot }); }
  if (t > B(31) && t < B(36.2)) table(O, 1180, 170, 640, ['szervesanyag', '%'], [['gyengén szerves', '2–6'], ['közepesen szerves', '6–20'], ['erősen szerves', '> 20']], win(t, B(31.4), B(36), 0.3, 0.3), { title: 'EN ISO 14688-2', cols: [400, 200], size: 30, rowH: 50, hi: seg(t, B(33), B(33.4)) > 0.5 ? 1 : -1 });
  if (t > B(36) && t < B(40.2)) O.list(120, 200, 820, ['Száraz, 2 mm alatti minta', '550 °C, legalább 2 óra', 'Exszikkátorban hűtve mérni', 'Eredmény: w_{LOI} ≈ 8,9 %'], [B(36.2), B(36.6), B(37), B(37.4)], t, win(t, B(36.1), B(40), 0.2, 0.3), { title: 'Összegzés', color: C.accent, mark: '›', size: 32 });
  endCard(O, t, B, TOTAL, 40, 'SZERVES ANYAG', 'izzítási veszteség · 550 °C', 'Következik: kompressziós vizsgálat');
  runCaptions(O, t, CAPS);
  finish(O, t, TOTAL, CHAPTERS);
}
