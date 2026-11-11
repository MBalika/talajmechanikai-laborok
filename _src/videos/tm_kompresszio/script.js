// Kompressziós vizsgálat – feliratok (lépésszámokkal), címkék, robbantott ábra, képletek, leolvasási táblázat, görbék, Casagrande-szerkesztés
import { clamp, smooth, seg, win, fmt, C, FH, runCaptions, L3, chip, badge, clockCard, table, formula, logChart, axisLab, openTitle, endCard, finish, xyChart, inset } from '../tm_lab/ui.js';
import { LX, BT } from '../tm_lab/room.js';
import * as TL from './timeline.js';
import { tb, TOTAL, CHAPTERS, COL } from './timeline.js';
import { POS } from './app.js';
const B = tb, W3 = (x, y, z) => [LX + x, y, z], lg = Math.log10, d2 = (v, n = 2) => v.toFixed(n).replace('.', ',');
const O = POS.O[0], OZ = POS.O[1], AX = POS.base0[0], AZ = POS.base0[1];
const CAPS = [
  [B(8.3), B(12), '1.1 Az ödométer', ['Emelőkaros keret: a súly *tízszeresét*', 'adja át a mintára (1:10)']],
  [B(12.2), B(16), '1.2 A cella', ['A minta *merev gyűrűben* van,', 'alatta és fölötte szűrőkő']],
  [B(16.2), B(20), '1.3 Miért így?', ['Oldalra nem tágulhat:', 'csak *függőlegesen* nyomódik össze']],
  [B(20.3), B(23), '2.1 A gyűrű', ['Lemérjük az üres gyűrűt (*m_g*),', 'belül vékonyan zsírozzuk']],
  [B(23.1), B(26), '2.2 Zavartalan minta', ['A gyűrűt *vágóéllel lefelé*', 'a mintára tesszük']],
  [B(26.1), B(30), '2.3 Kiszúrás', ['A gyűrűt *függőlegesen* nyomjuk,', 'előtte késsel faragunk']],
  [B(30.1), B(34), '2.3 Kiszúrás', ['Lassan, rántás nélkül: a minta', 'szerkezete *zavartalan* marad']],
  [B(34.2), B(38), '2.4 Levágás', ['Huzalfűrésszel elvágjuk', 'a gyűrű *alsó élénél*']],
  [B(38.2), B(43), '2.5 Lehúzás', ['Acélvonalzóval *síkra* húzzuk;', 'a levágott részből: *w_0*']],
  [B(43.2), B(46.5), '2.6 Mérés', ['Gyűrű + minta tömege:', 'ebből a *sűrűség*']],
  [B(50.2), B(52), '3.1 Alsó szűrőkő', ['Telített szűrőkő', 'a cella fészkébe']],
  [B(52.1), B(53.6), '3.2 Szűrőpapír', ['A talaj nem jut', 'a kő pórusaiba']],
  [B(53.7), B(55.9), '3.3 A gyűrű', ['A mintás gyűrű', 'középre, a papírra']],
  [B(56.0), B(58.6), '3.4 Felül is', ['Szűrőpapír és *szűrőkő*', 'a minta tetejére']],
  [B(58.7), B(61.6), '3.5 Rögzítőgyűrű', ['A *merev gyűrűt* három csavar', 'szorítja a cella aljához']],
  [B(61.7), B(64), '3.6 Terhelőlap', ['Golyós fészke *középen*', 'adja át a terhet']],
  [B(64.2), B(67), '4.1 A keretbe', ['A cellát a központosítóra,', 'a kar alá tesszük']],
  [B(67.1), B(70.6), '4.2 A kar le', ['A *karemelővel* óvatosan', 'a golyóra engedjük a kart']],
  [B(70.7), B(73), '4.3 Nullázás', ['Kis előterhelés (*< 3 kPa*),', 'a mérőórát *nullázzuk*']],
  [B(73.1), B(78), '4.4 A mérőóra', ['A terhelőlap süllyedését méri:', 'ez a minta *összenyomódása* (Δh)']],
  [B(78.2), B(83), '5.1 A teher', ['A tárcsán a *mintára jutó* feszültség']],
  [B(83.1), B(86.6), '5.2 Felrakás', ['Megtámasztott karra rakjuk,', 'majd *ütés nélkül* ráengedjük']],
  [B(86.7), B(90), '5.3 Indul az óra', ['A ráengedéssel együtt', 'indítjuk az időmérőt']],
  [B(90.1), B(94), '5.4 Leolvasás', ['6 s … 30 perc, 1, 2, 4, 8', 'és *24 óra* múlva olvasunk le']],
  [B(94.2), B(98), '5.5 Lépcsők', ['Minden lépcsőben *kétszerezzük*', 'a terhet, 800 kPa-ig']],
  [B(98.1), B(102), '5.5 Lépcsők', ['Egy lépcső kb. *24 óra*:', 'kivárjuk az összenyomódást']],
  [B(102.2), B(105.5), '6.1 Tehermentesítés', ['800-ról 100 kPa-ra: a minta', 'kissé *expandál*, felemelkedik']],
  [B(105.6), B(109), '6.2 Újraterhelés', ['Vissza 800 kPa-ra:', 'eleinte *merevebb* a talaj']],
  [B(109.2), B(111), '7.1 Kiszerelés', ['A kart felemeljük,', 'a gyűrűt *kivesszük*']],
  [B(111.1), B(114), '7.2 Száraz tömeg', ['*105 °C*-on 24 órát szárítjuk']],
  [B(118.1), B(122), '8.2 σ′ – ε görbe', ['A modulus a teherrel *nő*']],
  [B(122.1), B(125.8), '8.3 log σ′ – e', ['Casagrande-szerkesztés: *σ′_p*']],
];
const EXPL = [['CELLAALJ', 0.0, -1], ['SZŰRŐKŐ', 0.064, 1], ['SZŰRŐPAPÍR', 0.086, -1], ['GYŰRŰ + MINTA', 0.115, 1], ['SZŰRŐPAPÍR', 0.143, -1], ['SZŰRŐKŐ', 0.166, 1], ['RÖGZÍTŐGYŰRŰ', 0.197, -1], ['TERHELŐLAP', 0.235, 1]];
const STEPROWS = TL.SEQ.slice(0, 6).map(q => [String(q.s), d2(TL.hOf(q.e)), d2(TL.sOf(q.e) / TL.H0 * 100, 1), d2(q.e, 3)]);
const LOADPTS = TL.SEQ.slice(0, 6).map(q => [q.s, TL.sOf(q.e) / TL.H0 * 100]), UNPTS = [[800, TL.sOf(TL.SEQ[5].e) / TL.H0 * 100], ...TL.SEQ.slice(6).map(q => [q.s, TL.sOf(q.e) / TL.H0 * 100])];
// Casagrande-szerkesztés (a görbéből számolva)
const CASA = (() => { const e = (x) => TL.eOf(Math.pow(10, x)); const h = 1e-3; let best = null; for (let x = 1.4; x <= 2.8; x += 0.005) { const d1 = (e(x + h) - e(x - h)) / (2 * h), dd = (e(x + h) - 2 * e(x) + e(x - h)) / (h * h); const k = Math.abs(dd) / Math.pow(1 + d1 * d1, 1.5); if (!best || k > best.k) best = { x, k, d1 }; }
  const xm = best.x, em = e(xm), bs = Math.tan(Math.atan(best.d1) / 2), xn = lg(800), en = e(xn); const xi = (en + TL.CC * xn - em + bs * xm) / (bs + TL.CC); return { xm, em, s1: best.d1, bs, xi, ei: em + bs * (xi - xm), sp: Math.pow(10, xi) }; })();
export const SP_CASA = Math.round(CASA.sp / 5) * 5;
const EOED = 100 / ((TL.sOf(TL.eOf(200)) - TL.sOf(TL.eOf(100))) / TL.H0) / 1000;
export function drawOverlay(O2, t, ctx) {
  const O_ = O2, { proj } = ctx;
  openTitle(O_, t, B, TOTAL, { q1: 'Mennyit nyomódik össze a talaj?', q2: 'Lépésről lépésre', title: 'Kompressziós vizsgálat', sub: 'Ödométer · EN ISO 17892-5' });
  for (const [b0, b1, n] of [[8, 20, '1  A készülék'], [20, 50, '2  A minta bekészítése'], [50, 64, '3  Beépítés a cellába'], [64, 78, '4  A cella a keretben'], [78, 102, '5  Terhelés lépcsőkben'], [102, 109, '6  Tehermentesítés'], [109, 114, '7  Kiszerelés'], [114, 129, '8  Kiértékelés']]) chip(O_, n, win(t, B(b0), B(b1), 0.25, 0.25));
  const tblOn = (t > B(90) && t < B(94.2)) || (t > B(114) && t < B(118.2));
  badge(O_, 'EN ISO 17892-5', win(t, B(8.2), B(129), 0.4, 0.4) * (1 - (tblOn ? 1 : 0)) * (1 - win(t, B(86.6), B(94.1), 0.2, 0.2)));
  // 1.1 a keret részei
  if (t > B(8) && t < B(12.1)) { const L = [['EMELŐKAR · 1:10', [O + 0.32, BT + 0.17, OZ], [-60, -150], 8.5], ['AKASZTÓ', [O + 0.72, BT - 0.05, OZ], [90, -40], 9.1], ['SÚLYTÁRCSÁK', [POS.stand[0], 0.66, POS.stand[1]], [120, -150], 9.7], ['MÉRŐÓRA', [O + 0.012, BT + 0.2, OZ + 0.064], [-170, -110], 10.3], ['KAREMELŐ', [O + 0.38, BT + 0.08, OZ], [-60, 130], 10.9]];
    for (const [s, p, d, b] of L) L3(O_, proj, W3(...p), s, win(t, B(b), B(12), 0.25, 0.25), { dx: d[0], dy: d[1] }); }
  // 1.2 robbantott ábra
  if (t > B(12) && t < B(20)) { EXPL.forEach(([s, y, sd], i) => L3(O_, proj, W3(AX + sd * 0.055, BT + y + 0.006, AZ), s, win(t, B(12.4 + i * 0.42), B(16.1), 0.2, 0.25), { dx: sd * 150, dy: -20 })); }
  if (t > B(16) && t < B(20)) L3(O_, proj, W3(AX + 0.042, BT + 0.115, AZ), 'Ø 75 × 20 mm', win(t, B(16.3), B(20), 0.3, 0.3), { dx: 170, dy: -40 });
  // 1.3 gátolt oldalirány: kis vázlat
  if (t > B(16) && t < B(20)) inset(O_, 1610, 330, 150, win(t, B(16.4), B(20), 0.3, 0.3), (g, x, y, s) => { g.fillStyle = '#6a5a48'; g.fillRect(x + 80, y + 120, 140, 70); g.fillStyle = '#c9ced3'; g.fillRect(x + 66, y + 110, 14, 90); g.fillRect(x + 220, y + 110, 14, 90);
      g.strokeStyle = COL.load; g.fillStyle = COL.load; g.lineWidth = 6; for (const xx of [110, 150, 190]) { g.beginPath(); g.moveTo(x + xx, y + 40); g.lineTo(x + xx, y + 100); g.stroke(); g.beginPath(); g.moveTo(x + xx - 10, y + 92); g.lineTo(x + xx + 10, y + 92); g.lineTo(x + xx, y + 110); g.fill(); }
      g.strokeStyle = '#ff6a5a'; g.lineWidth = 5; for (const [x0, dir] of [[50, -1], [250, 1]]) { g.beginPath(); g.moveTo(x + x0, y + 140); g.lineTo(x + x0 + dir * 24, y + 164); g.moveTo(x + x0 + dir * 24, y + 140); g.lineTo(x + x0, y + 164); g.stroke(); }
      g.fillStyle = '#fff'; g.font = '700 26px Inter, Arial'; g.textAlign = 'center'; g.fillText('ε_x = 0', x + 150, y + 245); }, { title: 'Gátolt oldalirány' });
  // 2.1 / 2.6 mérleg
  if (t > B(21.6) && t < B(23)) L3(O_, proj, W3(POS.scale, BT + 0.03, -0.86), 'm_g = 112,40 g', win(t, B(21.7), B(23), 0.2, 0.25), { dx: 150, dy: -120 });
  if (t > B(44.6) && t < B(50.1)) { L3(O_, proj, W3(POS.scale, BT + 0.03, -0.86), 'm_g + m = 282,00 g', win(t, B(44.7), B(46.6), 0.2, 0.25), { dx: 150, dy: -120 });
    formula(O_, 1080, 170, ['m = 282,00 − 112,40 = 169,6 g', 'V = A · h_0 = 44,18 · 2,00 = 88,4 cm³', 'ρ = m / V = 1,92 g/cm³'], win(t, B(46.6), B(50), 0.3, 0.3), { size: 34, title: 'Kezdeti adatok', color: COL.acc }); }
  if (t > B(26) && t < B(34)) L3(O_, proj, W3(POS.plate[0] + 0.04, BT + 0.05, POS.plate[1]), 'VÁGÓÉL', win(t, B(26.6), B(29.5), 0.25, 0.25), { dx: 170, dy: 60 });
  if (t > B(42) && t < B(43.2)) L3(O_, proj, W3(POS.plate[0] + 0.18, BT + 0.03, POS.plate[1] + 0.07), 'w_0 = 31,5 %', win(t, B(42.1), B(43.2), 0.2, 0.2), { dx: 140, dy: -90 });
  // 4.3 előterhelés, nullázás
  if (t > B(70.6) && t < B(73)) L3(O_, proj, W3(O + 0.012, BT + 0.165, OZ + 0.075), t < B(72.2) ? '0,17 mm → 0' : '0,00 mm', win(t, B(70.8), B(73), 0.2, 0.2), { dx: -190, dy: -100 });
  // 4.4 a mérőóra: mit mér – a mérőcsúcs a terhelőlap üllőjén, 1 osztás = 0,01 mm; ε = Δh / h_0
  if (t > B(73) && t < B(78.1)) { L3(O_, proj, W3(O + 0.012, BT + 0.104, OZ + 0.064), 'mérőcsúcs a terhelőlapon', win(t, B(73.6), B(78), 0.2, 0.2), { dx: 170, dy: 90 });
    L3(O_, proj, W3(O + 0.012, BT + 0.19, OZ + 0.075), '1 osztás = 0,01 mm', win(t, B(74.6), B(78), 0.2, 0.2), { dx: -200, dy: -90 });
    formula(O_, 100, 170, ['ε = Δh / h_0'], win(t, B(75.6), B(78), 0.3, 0.3), { size: 36, title: 'Fajlagos összenyomódás', color: COL.acc }); }
  // 5.1 a teher kiszámítása
  if (t > B(78) && t < B(83.2)) formula(O_, 110, 170, ['A = 44,18 cm² (Ø 75 mm)', 'F = σ′ · A = 25 kPa · 44,18 cm² = 110 N', '1:10 karral: 11 N → 1,13 kg'], win(t, B(79.4), B(83), 0.3, 0.3), { size: 34, title: 'Mekkora tárcsa kell?', color: COL.load });
  // 5.3–5.4 időmérő, leolvasások
  if (t > B(86.6) && t < B(94.2)) { const m = TL.minAt(t); const v = m < 1 ? Math.round(m * 60) + ' s' : m < 60 ? fmt(m, m < 10 ? 1 : 0) + ' perc' : fmt(m / 60, m < 600 ? 1 : 0) + ' óra'; clockCard(O_, win(t, B(86.8), B(94), 0.2, 0.25), 'ELTELT IDŐ', t < B(86.9) ? '0 s' : v, { y: 104 });
    const RW = [[0.1, '6 s'], [1, '1 perc'], [4, '4 perc'], [15, '15 perc'], [60, '1 óra'], [240, '4 óra'], [1440, '24 óra']]; const n = RW.filter(([mm]) => m >= mm).length;
    table(O_, 1406, 190, 450, ['t', 's [mm]'], RW.map(([mm, l]) => [l, d2(TL.s25(mm), 3)]), win(t, B(88), B(94), 0.3, 0.3), { n, title: '25 kPa', cols: [200, 220], size: 28, rowH: 44, hi: n - 1 }); }
  // 5.5–6 σ′–ε görbe épül (a tárcsás jelenet fölött)
  if (t > B(94) && t < B(109.2)) { const a = win(t, B(94.3), B(109), 0.3, 0.3); const done = TL.SEQ.map((q, i) => t > B(TL.STEP_T[i].run[1]) ? 1 : 0); const nL = done.slice(0, 6).reduce((s, v) => s + v, 0), nU = done.slice(6).reduce((s, v) => s + v, 0);
    xyChart(O_, 1150, 150, 710, 420, a, { xmax: 900, ymax: 16, xticks: [0, 200, 400, 600, 800], yticks: [0, 5, 10, 15], flipY: true, title: 'σ′ – ε (lépcsők vége)' },
      [{ pts: LOADPTS, upto: (nL - 1) / 5, color: COL.load, width: 4, dots: 6 }, { pts: UNPTS, upto: nU > 0 ? (nU) / 6 : 0, color: COL.un, width: 4, dots: 6 }], []);
    axisLab(O_, 1150, 150, 710, 420, a, 'σ′ [kPa]', 'ε [%]', { ylBottom: true }); }
  // 7 kiszerelés
  if (t > B(111.1) && t < B(114)) { clockCard(O_, win(t, B(111.2), B(114), 0.2, 0.2), '105 °C', '24 óra', { y: 104 }); L3(O_, proj, W3(POS.scale, BT + 0.03, -0.86), 'm_d = 128,9 g (+ gyűrű)', win(t, B(112), B(114), 0.2, 0.2), { dx: 160, dy: -110 }); }
  // 8.1 hézagtényező
  if (t > B(114) && t < B(118.2)) { const a = win(t, B(114.2), B(118), 0.3, 0.3); formula(O_, 100, 170, ['H_s = m_d / (ρ_s · A) = 10,81 mm', 'e = (h − H_s) / H_s', 'e_0 = (20,00 − 10,81) / 10,81 = 0,85'], a, { size: 32, title: 'Hézagtényező', color: COL.acc });
    table(O_, 1120, 170, 740, ['σ′ [kPa]', 'h [mm]', 'ε [%]', 'e'], STEPROWS, a, { n: clamp(seg(t, B(115.6), B(117.7)) * 6, 0, 6), title: 'Lépcsők vége', cols: [190, 180, 160, 180], size: 28, rowH: 44 }); }
  // 8.2 σ′–ε, E_oed
  if (t > B(118) && t < B(122.2)) { const a = win(t, B(118.2), B(122), 0.3, 0.3);
    xyChart(O_, 1040, 170, 820, 560, a, { xmax: 900, ymax: 16, xticks: [0, 200, 400, 600, 800], yticks: [0, 5, 10, 15], flipY: true, title: 'Kompressziós görbe (σ′ – ε)' },
      [{ pts: LOADPTS, upto: 1, color: COL.load, width: 4, dots: 6 }, { pts: UNPTS, upto: 1, color: COL.un, width: 4, dots: 6 }, { pts: [[100, LOADPTS[2][1]], [200, LOADPTS[3][1]]], upto: clamp(seg(t, B(119), B(119.8))), color: C.white, width: 6, glow: false, head: false }],
      []);
    axisLab(O_, 1040, 170, 820, 560, a, 'σ′ [kPa]', 'ε [%]', { ylBottom: true });
    formula(O_, 100, 170, ['E_{oed} = Δσ′ / Δε', '100 → 200 kPa: ' + d2(EOED, 1) + ' MPa'], win(t, B(119.2), B(122), 0.3, 0.3), { size: 36, title: 'Összenyomódási modulus', color: COL.load }); }
  // 8.3 log σ′ – e, Casagrande
  if (t > B(122) && t < B(129.2)) { const a = win(t, B(122.2), B(129), 0.3, 0.3); const P = TL.SEQ.slice(0, 6).map(q => [lg(q.s), q.e]); const U = [[lg(800), TL.SEQ[5].e], ...TL.SEQ.slice(6).map(q => [lg(q.s), q.e])];
    const curve = []; for (let x = 1.0; x <= lg(800) + 1e-6; x += 0.02) curve.push([x, TL.eOf(Math.pow(10, x))]);
    const K = CASA, k1 = clamp(seg(t, B(123), B(123.6))), k2 = clamp(seg(t, B(123.6), B(124.2))), k3 = clamp(seg(t, B(124.2), B(124.8))), k4 = clamp(seg(t, B(124.8), B(125.4)));
    const hor = [[K.xm, K.em], [K.xm + 0.6, K.em]], tan = [[K.xm - 0.35, K.em - K.s1 * 0.35], [K.xm + 0.5, K.em + K.s1 * 0.5]], bis = [[K.xm, K.em], [K.xm + 0.6, K.em + K.bs * 0.6]], nc = [[lg(800), TL.eOf(800)], [K.xi - 0.12, TL.eOf(800) + TL.CC * (lg(800) - K.xi + 0.12)]];
    logChart(O_, 1040, 170, 820, 560, a, { xmin: 1, xmax: 3, ymin: 0.55, ymax: 0.9, xticks: [1, lg(20), lg(50), 2, lg(200), lg(500), 3], yticks: [0.6, 0.7, 0.8, 0.9], title: 'log σ′ – e', yfmt: (v) => v.toFixed(1).replace('.', ',') },
      [{ pts: curve, upto: 1, color: COL.load, width: 3, glow: false, head: false }, { pts: P, upto: 1, color: COL.load, width: 0.001, dots: 6, glow: false, head: false }, { pts: U, upto: 1, color: COL.un, width: 3, dots: 6, glow: false, head: false },
        { pts: hor, upto: k1, color: C.white, width: 2, dash: [6, 6], glow: false, head: false }, { pts: tan, upto: k2, color: C.white, width: 2, dash: [6, 6], glow: false, head: false }, { pts: bis, upto: k3, color: COL.acc, width: 2, glow: false, head: false }, { pts: nc, upto: k4, color: COL.cc, width: 2, dash: [8, 6], glow: false, head: false }],
      [{ x: K.xm, y: K.em, color: C.white, a: win(t, B(122.8), B(129), 0.2, 0.3), text: 'max. görbület', dx: -210, dy: 40, size: 24 }, { x: K.xi, y: K.ei, color: COL.acc, a: win(t, B(125.4), B(129), 0.3, 0.3), vline: true, text: 'σ′_p ≈ ' + SP_CASA + ' kPa', dx: 14, dy: -34, size: 28 }]);
    axisLab(O_, 1040, 170, 820, 560, a, 'σ′ [kPa]', 'e', { ylBottom: true });
  }
  if (t > B(125.7) && t < B(129.2)) O_.list(100, 170, 760, ['Ø 75 × 20 mm, gátolt oldalirány', 'E_{oed} ≈ ' + d2(EOED, 1) + ' MPa (100–200 kPa)', 'σ′_p ≈ ' + SP_CASA + ' kPa', 'C_c = 0,30 · C_s = 0,05'], [B(125.9), B(126.3), B(126.7), B(127.1)], t, win(t, B(125.8), B(129), 0.2, 0.3), { title: 'Eredmény', color: C.accent, mark: '›', size: 30 });
  endCard(O_, t, B, TOTAL, 129, 'KOMPRESSZIÓ', null, 'Következik: konszolidáció');
  runCaptions(O_, t, CAPS);
  finish(O_, t, TOTAL, CHAPTERS);
}
