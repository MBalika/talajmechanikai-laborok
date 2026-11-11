// Közvetlen nyíróvizsgálat – feliratok, τ–δ és függőleges elmozdulás, Coulomb-egyenes
import { clamp, smooth, seg, win, fmt, C, runCaptions, xyChart, L3, chip, badge, clockCard, table, formula, axisLab, openTitle, endCard, finish } from '../tm_lab/ui.js';
import { LX, BT } from '../tm_lab/room.js';
import * as TL from './timeline.js';
import { tb, TOTAL, CHAPTERS, COL } from './timeline.js';
import { POS } from './app.js';
const B = tb, W3 = (x, y, z) => [LX + x, y, z], f1 = (v) => v.toFixed(1).replace('.', ',');
const CS = [COL.s1, COL.s2, COL.s3];
const curve = (i) => Array.from({ length: 101 }, (_, k) => [k / 10, TL.tauOf(k / 10, i)]), vcur = Array.from({ length: 101 }, (_, k) => [k / 10, TL.vOf(k / 10)]);
const CAPS = [
  [B(8.3), B(11), 'Minta', ['Négyzetes kiszúró:', '*60 × 60 × 20 mm*']],
  [B(11.1), B(15), 'Nyíródoboz', ['Két, egymáson elcsúsztatható keret,', 'alul-felül *szűrőkő*, felül terhelőlap']],
  [B(15.1), B(18), 'Normálfeszültség', ['*σ = 100 kPa*, majd a konszolidáció', 'kivárása']],
  [B(18.1), B(20), 'Rögzítők ki', ['A két keret *szétválik*']],
  [B(20.1), B(24), 'Nyírás', ['Az alsó keret *lassan, állandó*', 'sebességgel elmozdul']],
  [B(24.1), B(28), 'Mérés', ['Nyíróerő, vízszintes és', '*függőleges* elmozdulás']],
  [B(28.1), B(32), 'Három próbatest', ['*100, 200, 300 kPa*', 'normálfeszültséggel']],
  [B(32.1), B(38), 'Coulomb-egyenes', ['A törési pontokra illesztve:', '*c′* és *φ′*']],
  [B(38.1), B(42), 'Nyírási sík', ['*Ott törik el,* ahol mi akarjuk:', 'a két keret határán']],
];
export function drawOverlay(O, t, ctx) {
  const { proj, C: S } = ctx; const d = S ? S.d : 0;
  openTitle(O, t, B, TOTAL, { q1: 'Hol törik el?', q2: 'Ott, ahol mi akarjuk', title: 'Közvetlen\nnyíróvizsgálat', sub: 'Nyíródoboz · c′ és φ′' });
  for (const [b0, b1, n] of [[8, 20, '1  Beépítés'], [20, 32, '2  Nyírás'], [32, 38, '3  Kiértékelés'], [38, 46, '4  Nyírási sík']]) chip(O, n, win(t, B(b0), B(b1), 0.25, 0.25));
  badge(O, 'EN ISO 17892-10', win(t, B(8.2), B(46), 0.4, 0.4));
  if (t > B(11) && t < B(15)) L3(O, proj, W3(POS.app + 0.045, BT + 0.04 + 0.075, -1.12), 'NYÍRÓDOBOZ', win(t, B(13.2), B(15), 0.3, 0.3), { dx: -170, dy: -110 });
  if (t > B(18) && t < B(20)) L3(O, proj, W3(POS.app - 0.04, BT + 0.04 + 0.1, -1.08), 'RÖGZÍTŐCSAP', win(t, B(18.2), B(20), 0.25, 0.25), { dx: -170, dy: -90 });
  if (t > B(20) && t < B(28)) { L3(O, proj, W3(POS.app - 0.17, BT + 0.04 + 0.076, -1.12), 'ERŐMÉRŐ', win(t, B(20.6), B(24), 0.3, 0.3), { dx: -120, dy: -120 }); clockCard(O, win(t, B(24.2), B(28), 0.3, 0.3), 'NYÍRÁS', Math.round(8 * seg(t, B(20.5), B(27.5))) + ' óra', { y: 104 }); }
  // τ–δ és v–δ (20–32)
  if (t > B(20) && t < B(32.2)) { const a = win(t, B(20.4), B(32), 0.35, 0.3); const up = (i) => t < B(28) ? (i === 0 ? clamp(d / 10) : 0) : (i === 0 ? 1 : clamp(seg(t, B(28.3 + (i - 1) * 1.2), B(29.5 + (i - 1) * 1.2))));
    xyChart(O, 1080, 170, 790, 380, a, { xmax: 10, ymax: 180, xticks: [0, 2, 4, 6, 8, 10], yticks: [0, 50, 100, 150], title: 'τ – δ' }, [0, 1, 2].map(i => ({ pts: curve(i), upto: up(i), color: CS[i], width: 4 })),
      t > B(29) ? [0, 1, 2].map(i => ({ x: 3.4, y: TL.TF[i], color: CS[i], a: win(t, B(29.6 + i * 0.4), B(32), 0.3, 0.3), text: TL.SIG[i] + ' kPa', dx: 14, dy: -18, size: 22 })) : []);
    axisLab(O, 1080, 170, 790, 380, a, 'δ [mm]', 'τ [kPa]');
    if (t < B(28)) { xyChart(O, 1080, 570, 790, 260, a, { xmax: 10, ymin: -0.15, ymax: 0.45, xticks: [0, 5, 10], yticks: [0, 0.2, 0.4], title: 'függőleges elmozdulás', yfmt: (v) => v.toFixed(1).replace('.', ',') }, [{ pts: vcur, upto: clamp(d / 10), color: C.water || '#5CC2F2', width: 4 }]); axisLab(O, 1080, 570, 790, 260, a, 'δ [mm]', 'v [mm]'); } }
  // Coulomb (32–38)
  if (t > B(32) && t < B(38.2)) { const a = win(t, B(32.2), B(38), 0.35, 0.3); const ln = [[0, TL.C0], [350, TL.C0 + 350 * TL.TANP]];
    xyChart(O, 1040, 170, 820, 560, a, { xmax: 350, ymax: 200, xticks: [0, 100, 200, 300], yticks: [0, 50, 100, 150, 200], title: 'Coulomb-egyenes' },
      [{ pts: TL.SIG.map((s, i) => [s, TL.TF[i]]), upto: 1, color: COL.s2, width: 0.001, dots: 8, glow: false, head: false }, { pts: ln, upto: clamp(seg(t, B(33), B(34.2))), color: C.white, width: 3 }],
      [{ x: 0, y: TL.C0, color: COL.acc, a: win(t, B(34.4), B(38), 0.3, 0.3), text: 'c′ = 8 kPa', dx: 14, dy: -24, size: 26 }, { x: 250, y: TL.C0 + 250 * TL.TANP, color: COL.acc, a: win(t, B(34.8), B(38), 0.3, 0.3), text: 'φ′ = 28°', dx: 16, dy: 30, size: 28 }]);
    axisLab(O, 1040, 170, 820, 560, a, 'σ [kPa]', 'τ [kPa]');
    formula(O, 120, 170, ['τ = c′ + σ · tg φ′', 'c′ = 8 kPa, φ′ = 28°'], win(t, B(34.6), B(38), 0.3, 0.3), { size: 40, title: 'Nyírószilárdság', color: COL.s2 }); }
  if (t > B(38) && t < B(42)) L3(O, proj, W3(POS.app + 0.012, BT + 0.0665, -1.12 + 0.031), 'NYÍRÁSI SÍK', win(t, B(39.2), B(42), 0.3, 0.3), { dx: 170, dy: -130, color: COL.s3 });
  if (t > B(42) && t < B(46.2)) O.list(120, 200, 820, ['A nyírási sík előre adott', 'Lassú nyírás: nincs többlet-u', 'Legalább 3 normálfeszültség', 'c′ = 8 kPa, φ′ = 28°'], [B(42.2), B(42.6), B(43), B(43.4)], t, win(t, B(42.1), B(46), 0.2, 0.3), { title: 'Összegzés', color: C.accent, mark: '›', size: 32 });
  endCard(O, t, B, TOTAL, 46, 'NYÍRÓDOBOZ', 'közvetlen nyírás · Coulomb-egyenes', 'Következik: triaxiális vizsgálat');
  runCaptions(O, t, CAPS);
  finish(O, t, TOTAL, CHAPTERS);
}
