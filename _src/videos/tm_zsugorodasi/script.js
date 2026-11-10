// Zsugorodási határ – feliratok, mérések, ε_s és w_S, w–V ábra
import { clamp, smooth, seg, win, fmt, C, runCaptions, xyChart, L3, chip, badge, clockCard, table, formula, axisLab, openTitle, endCard, finish } from '../tm_lab/ui.js';
import { LX, BT } from '../tm_lab/room.js';
import * as TL from './timeline.js';
import { tb, TOTAL, CHAPTERS, COL } from './timeline.js';
import { POS } from './app.js';
const B = tb, W3 = (x, y, z) => [LX + x, y, z], f1 = (v) => v.toFixed(1).replace('.', ','), f2 = (v) => v.toFixed(2).replace('.', ',');
const CAPS = [
  [B(8.3), B(11), 'Előkészítés', ['Homogén talaj, a víztartalmat', '*I_C ≈ 0,7*-re állítjuk']],
  [B(11.1), B(14), 'Kiszúrás', ['Vékonyfalú gyűrűvel', '*Ø 25 × 25 mm*-es henger']],
  [B(14.1), B(16), 'Tömeg', ['Nedves tömeg: *m = 24,30 g*']],
  [B(16.1), B(19), 'Méretek', ['Átmérő és magasság', '*tolómérővel*']],
  [B(19.1), B(23), 'Szárítás', ['Először *szobahőmérsékleten*:', 'lassan, repedés nélkül']],
  [B(23.1), B(26), 'Kályha', ['Majd *105 °C*-on', 'tömegállandóságig']],
  [B(26.1), B(29), 'Száraz méretek', ['Átmérő, magasság, *m_d*']],
  [B(29.1), B(33), 'Lineáris zsugorodás', ['*ε_s > 5 %*: *veszélyes*']],
  [B(33.1), B(38), 'Zsugorodási határ', ['Telített, de *már nem* zsugorodik']],
  [B(38.1), B(41), 'Konzisztencia', ['*w_S < w_P < w_L*']],
];
export function drawOverlay(O, t, ctx) {
  const { proj } = ctx;
  openTitle(O, t, B, TOTAL, { q1: 'Mennyit zsugorodik?', q2: 'Kiszárítjuk és megmérjük', title: 'Zsugorodási\nhatár', sub: 'Lineáris zsugorodás és w_S' });
  for (const [b0, b1, n] of [[8, 19, '1  Próbatest'], [19, 26, '2  Szárítás'], [26, 29, '3  Mérés'], [29, 41, '4  Kiértékelés']]) chip(O, n, win(t, B(b0), B(b1), 0.25, 0.25));
  badge(O, 'Kis Talajmechanika · 2.6', win(t, B(8.2), B(41), 0.4, 0.4));
  if (t > B(11) && t < B(14)) L3(O, proj, W3(POS.plate + 0.013, BT + 0.06, -1.0), 'KISZÚRÓGYŰRŰ', win(t, B(11.5), B(14), 0.3, 0.3), { dx: 160, dy: -110 });
  if (t > B(16) && t < B(19)) table(O, 1240, 170, 560, ['', 'nedves'], [['d [mm]', '25,0'], ['h [mm]', '25,0'], ['m [g]', '24,30'], ['V [cm³]', f2(TL.V0)]], win(t, B(16.4), B(19), 0.3, 0.3), { title: 'Kezdeti adatok', cols: [260, 260], size: 30, rowH: 48 });
  if (t > B(19) && t < B(23)) clockCard(O, win(t, B(19.3), B(23), 0.3, 0.3), 'SZOBAHŐN', Math.max(1, Math.round(4 * seg(t, B(19.2), B(22.8)))) + ' nap');
  if (t > B(26) && t < B(29.2)) table(O, 1240, 170, 560, ['', 'száraz'], [['d [mm]', '22,9'], ['h [mm]', '22,9'], ['m_d [g]', '18,66'], ['V_d [cm³]', f2(TL.VD)]], win(t, B(26.4), B(29), 0.3, 0.3), { title: 'Kiszárítva', cols: [260, 260], size: 30, rowH: 48 });
  if (t > B(29) && t < B(33.2)) { const a = win(t, B(29.2), B(33), 0.3, 0.3); formula(O, 120, 170, ['β_s = (V − V_d) / V_d = ' + f2(TL.BETA), 'ε_s = 1 − (1 / (1 + β_s))^{1/3}', 'ε_s = ' + f1(TL.EPS) + ' %  > 5 %'], a, { size: 38, title: 'Lineáris zsugorodás', color: COL.red }); }
  if (t > B(33) && t < B(41.2)) { const a = win(t, B(33.2), B(41), 0.3, 0.3); if (t < B(38)) formula(O, 120, 170, ['V_s = m_d / ρ_s = ' + f2(TL.VS) + ' cm³', 'w_S = (V_d − V_s) · ρ_w / m_d', 'w_S = ' + f1(TL.WS) + ' %'], win(t, B(33.2), B(38), 0.3, 0.3), { size: 38, title: 'Zsugorodási határ', color: COL.vol });
    const k = seg(t, B(33.6), B(35.6)); const pts = [[TL.W0, TL.V0], [TL.WS, TL.VD], [0, TL.VD]];
    const r = xyChart(O, 1040, 170, 820, 520, a, { xmin: 0, xmax: 50, ymin: 8, ymax: 14, xticks: [0, 10, 20, 30, 40, 50], yticks: [8, 10, 12, 14], title: 'Víztartalom – térfogat' }, [{ pts, upto: k, color: COL.vol, width: 5, dots: 6 }],
      [{ x: TL.WS, y: TL.VD, color: COL.acc, a: win(t, B(35.4), B(41), 0.3, 0.3), vline: true, text: 'w_S = 13,5 %', dx: 12, dy: -30, size: 28 }, { x: 24.6, y: 8, color: C.white, a: win(t, B(38.2), B(41), 0.3, 0.3), text: 'w_P', dx: -14, dy: -24, size: 26 }, { x: 46.9, y: 8, color: C.white, a: win(t, B(38.5), B(41), 0.3, 0.3), text: 'w_L', dx: -14, dy: -24, size: 26 }]);
    axisLab(O, 1040, 170, 820, 520, a, 'w [%]', 'V [cm³]'); }
  if (t > B(38) && t < B(41.2)) O.list(120, 200, 760, ['ε_s = 8,4 % (veszélyes)', 'w_S = 13,5 %', 'w_P = 24,6 %', 'w_L = 46,9 %'], [B(38.2), B(38.6), B(39), B(39.4)], t, win(t, B(38.1), B(41), 0.2, 0.3), { title: 'Eredmény', color: C.accent, mark: '›', size: 34 });
  endCard(O, t, B, TOTAL, 41, 'ZSUGORODÁS', 'lineáris zsugorodás · w_S', 'Következik: szervesanyag-tartalom');
  runCaptions(O, t, CAPS);
  finish(O, t, TOTAL, CHAPTERS);
}
