// Közvetlen nyíróvizsgálat – feliratok (lépésszámokkal), címkék, táblázatok, τ–δ és függőleges elmozdulás, Coulomb-egyenes
import { clamp, smooth, seg, win, C, runCaptions, xyChart, L3, chip, badge, clockCard, table, formula, axisLab, openTitle, endCard, finish } from '../tm_lab/ui.js';
import { LX, BT } from '../tm_lab/room.js';
import * as TL from './timeline.js';
import { tb, TOTAL, CHAPTERS, COL } from './timeline.js';
import { POS, W } from './app.js';
const B = tb, W3 = (x, y, z) => [LX + x, y, z], f1 = (v) => v.toFixed(1).replace('.', ',');
const RX = POS.RIG[0], RZ = POS.RIG[1];
const CS = [COL.s1, COL.s2, COL.s3];
const curve = (i) => Array.from({ length: 101 }, (_, k) => [k / 10, TL.tauOf(k / 10, i)]), vcur = Array.from({ length: 101 }, (_, k) => [k / 10, TL.vOf(k / 10)]);
const FPK = TL.TF.map(t => Math.round(t * TL.A_M2 * 1000));
const CAPS = [
  [B(8.2), B(10.5), '1.1 Nyírógép', ['Két, egymáson *elcsúszó* keret']],
  [B(14.2), B(16.0), '2.1 Kiszúró keret', ['*60 × 60 × 20 mm*, toldattal']],
  [B(16.1), B(18.4), '2.2 Kiszúrás', ['Függőlegesen, egyenletesen', 'az üveglapig nyomjuk']],
  [B(18.5), B(20.4), '2.3 Kiemelés', ['A minta a keretben marad']],
  [B(20.5), B(22.2), '2.4 A toldat le', ['A keret fölött 5 mm talaj marad']],
  [B(22.4), B(25.7), '2.5 Lehúzás', ['Acélvonalzóval, a keret síkjára']],
  [B(25.9), B(27.9), '2.6 Mérés', ['A kerettel együtt mérjük']],
  [B(32.2), B(34.7), '3.1 A doboz a kocsiban', ['A két keret *összecsavarozva*,', 'alul szűrőkő']],
  [B(34.8), B(38.9), '3.2 Kitolás', ['A mintát a kitolóval', 'a dobozba nyomjuk']],
  [B(39.0), B(40.6), '3.3 A keret le', ['A minta a dobozban marad']],
  [B(40.8), B(42.7), '3.4 Terhelőfej', ['Szűrőkő és terhelőlap, golyóval']],
  [B(43.0), B(45.1), '3.5 Az erőmérő karja', ['A felső keret füléhez állítjuk']],
  [B(45.3), B(47.9), '3.6 A felső keret áll', ['Nyíráskor az *erőmérő* tartja:', 'ez méri a nyíróerőt']],
  [B(48.2), B(50.9), '4.1 Normálfeszültség', ['*σ = 100 kPa*: a terhelőegység', 'állandó, *360 N* erővel nyom']],
  [B(51.2), B(55.4), '4.2 Víz a kádba', ['A minta végig *víz alatt* van']],
  [B(55.6), B(58.6), '4.3 Konszolidáció', ['Megvárjuk, amíg a süllyedés megáll']],
  [B(58.7), B(61.9), '4.4 Nyírási sebesség', ['A t_{100}-ból: elég lassú ahhoz,', 'hogy a víz *ki tudjon szivárogni*']],
  [B(62.2), B(65.7), '5.1 Rögzítőcsavarok ki', ['Ettől kezdve a két keret szabad']],
  [B(65.9), B(68.8), '5.2 Rés', ['Az emelőcsavarokkal ~0,5 mm-rel', 'megemeljük a felső keretet']],
  [B(69.6), B(71.8), '5.3 Indítás', ['*v = 0,01 mm/perc*, állandó sebesség']],
  [B(72.2), B(75.8), '6.1 Nyírás', ['Az alsó keret elmozdul,', 'a felső áll']],
  [B(76.0), B(79.8), '6.2 Mérés', ['Nyíróerő, vízszintes és', '*függőleges* elmozdulás']],
  [B(80.0), B(83.8), '6.3 Csúcs', ['Utána a τ kissé csökken,', 'a minta *tágul*']],
  [B(84.0), B(85.9), '6.4 Vége', ['δ = 10 mm: kb. *17 óra*']],
  [B(86.2), B(91.8), '7.1 Nyírási sík', ['*Ott törik,* ahol mi akarjuk:', 'a két keret határán']],
  [B(92.2), B(97.8), '8.1 Három próbatest', ['*100, 200 és 300 kPa*', 'normálfeszültséggel']],
  [B(98.2), B(101.8), '9.1 Csúcsértékek', ['*τ_f = F / A*, A = 36 cm^2']],
  [B(102.0), B(107.8), '9.2 Coulomb-egyenes', ['A három pontra illesztve:', '*c′* és *φ′*']],
];
export function drawOverlay(O, t, ctx) {
  const { proj, C: S } = ctx; const d = S && S.d !== undefined ? S.d : 0;
  openTitle(O, t, B, TOTAL, { q1: 'Hol törik el a talaj?', q2: 'Ott, ahol mi akarjuk', title: 'Közvetlen\nnyíróvizsgálat', sub: 'Nyíródoboz · c′ és φ′' });
  for (const [b0, b1, n] of [[8, 14, '1  A készülék'], [14, 32, '2  A próbatest'], [32, 48, '3  Beépítés'], [48, 62, '4  Konszolidáció'], [62, 72, '5  Nyírás előtt'], [72, 86, '6  Nyírás'],
    [86, 92, '7  Nyírási sík'], [92, 98, '8  Három próbatest'], [98, 108, '9  Kiértékelés']]) chip(O, n, win(t, B(b0), B(b1), 0.25, 0.25));
  const big = (t > B(10.5) && t < B(14)) || (t > B(92) && t < B(108));
  badge(O, 'EN ISO 17892-10', win(t, B(8.2), B(108), 0.4, 0.4) * (big ? 0 : 1));
  // 1.1 címkék
  if (t > B(8) && t < B(10.7)) for (const [s, p, dd, b] of [['TERHELŐEGYSÉG', [RX, BT + 0.52, RZ + 0.03], [-150, -70], 8.4], ['NYÍRÓDOBOZ', [RX, BT + 0.09, RZ + 0.05], [-200, 90], 8.8], ['ERŐMÉRŐ', [RX - 0.26, BT + 0.15, RZ], [-120, -110], 9.2], ['MOTOR', [RX + 0.23, BT + 0.13, RZ + 0.06], [120, 90], 9.5]])
    L3(O, proj, W3(...p), s, win(t, B(b), B(10.6), 0.25, 0.25), { dx: dd[0], dy: dd[1] });
  if (t > B(10.5) && t < B(14)) table(O, 520, 210, 880, ['Mit?', 'Mivel?'], [['nyíróerő', 'erőmérő · 1 N'], ['elmozdulások', 'útadók · 0,001 mm'], ['normálerő', 'terhelőegység']],
    win(t, B(10.6), B(13.95), 0.3, 0.3), { cols: [420, 440], size: 30, rowH: 54, title: '1.2 Mit, mivel mérünk?', color: COL.s1 });
  // 2.6–2.7 tömeg, sűrűség
  if (t > B(25.9) && t < B(28)) L3(O, proj, W3(POS.SCL, BT + 0.035, -0.86), '236,8 g', win(t, B(26.6), B(27.9), 0.2, 0.2), { dx: 170, dy: -80 });
  if (t > B(28) && t < B(32)) formula(O, 110, 180, ['m = 236,8 − 96,4 = 140,4 g', 'ρ = m / V = 140,4 / 72 = 1,95 g/cm^3'], win(t, B(28.1), B(31.8), 0.3, 0.3), { size: 38, title: '2.7 Sűrűség', color: COL.s1 });
  // 3.6 a kar füle, 4.1 a terhelőrúd
  // 4.3 konszolidáció: óra
  if (t > B(55.6) && t < B(62)) { const m = TL.consMin(t); clockCard(O, win(t, B(55.7), B(61.9), 0.2, 0.2), 'ELTELT IDŐ', m < 59.5 ? Math.round(m) + ' perc' : '1 óra', { y: 104 }); }
  // 5.2 rés
  if (t > B(67.6) && t < B(69)) L3(O, proj, W3(RX + 0.045, BT + 0.068, RZ - 0.03), 'RÉS ≈ 0,5 mm', win(t, B(67.7), B(68.9), 0.2, 0.2), { dx: 140, dy: -90 });
  // 6 nyírás: τ–δ és v–δ
  if (t > B(72) && t < B(86.2)) { const a = win(t, B(72.4), B(86), 0.35, 0.3); clockCard(O, win(t, B(72.4), B(85.9), 0.3, 0.3), 'NYÍRÁS', f1(TL.shearMin(t) / 60) + ' óra', { y: 104 });
    xyChart(O, 1090, 200, 780, 360, a, { xmax: 10, ymax: 80, xticks: [0, 2, 4, 6, 8, 10], yticks: [0, 20, 40, 60, 80], title: 'τ – δ' }, [{ pts: curve(0), upto: clamp(d / 10), color: CS[0], width: 4 }]);
    axisLab(O, 1090, 200, 780, 360, a, 'δ [mm]', 'τ [kPa]');
    xyChart(O, 1090, 600, 780, 250, a, { xmax: 10, ymin: -0.1, ymax: 0.2, xticks: [0, 5, 10], yticks: [-0.1, 0, 0.1, 0.2], title: 'függőleges elmozdulás', yfmt: (v) => v.toFixed(1).replace('.', ',') }, [{ pts: vcur, upto: clamp(d / 10), color: COL.w, width: 4 }]);
    axisLab(O, 1090, 600, 780, 250, a, 'δ [mm]', 'δ_v [mm]'); }
  // 7 nyírási sík
  if (t > B(86) && t < B(92)) L3(O, proj, W3(RX - 0.005, BT + 0.068, RZ + 0.03), 'NYÍRÁSI SÍK', win(t, B(87.2), B(91.8), 0.3, 0.3), { dx: 170, dy: -130, color: COL.s3 });
  // 8 három próbatest
  if (t > B(92) && t < B(98.2)) { const a = win(t, B(92.3), B(98), 0.35, 0.3); const up = (i) => clamp(seg(t, B(92.6 + i * 1.6), B(94.0 + i * 1.6)));
    xyChart(O, 560, 210, 900, 520, a, { xmax: 10, ymax: 180, xticks: [0, 2, 4, 6, 8, 10], yticks: [0, 50, 100, 150], title: 'τ – δ' }, [0, 1, 2].map(i => ({ pts: curve(i), upto: up(i), color: CS[i], width: 4 })),
      [0, 1, 2].map(i => ({ x: 6.5, y: TL.tauOf(6.5, i), color: CS[i], a: win(t, B(93.6 + i * 1.6), B(98), 0.3, 0.3), text: 'σ = ' + TL.SIG[i] + ' kPa', dx: 14, dy: -16, size: 24 })));
    axisLab(O, 560, 210, 900, 520, a, 'δ [mm]', 'τ [kPa]'); }
  // 9.1 csúcsértékek
  if (t > B(98) && t < B(102)) table(O, 520, 220, 880, ['σ [kPa]', 'F_{max} [N]', 'τ_f [kPa]'], TL.SIG.map((s, i) => [String(s), String(FPK[i]), f1(TL.TF[i])]), win(t, B(98.2), B(101.8), 0.3, 0.3),
    { cols: [280, 300, 300], size: 32, rowH: 58, title: '9.1 A három próbatest csúcsa', color: COL.s2 });
  // 9.2 Coulomb
  if (t > B(102) && t < B(108.2)) { const a = win(t, B(102.2), B(108), 0.35, 0.3); const ln = [[0, TL.C0], [350, TL.C0 + 350 * TL.TANP]];
    xyChart(O, 1040, 180, 820, 560, a, { xmax: 350, ymax: 200, xticks: [0, 100, 200, 300], yticks: [0, 50, 100, 150, 200], title: 'Coulomb-egyenes' },
      [{ pts: TL.SIG.map((s, i) => [s, TL.TF[i]]), upto: 1, color: COL.s2, width: 0.001, dots: 8, glow: false, head: false }, { pts: ln, upto: clamp(seg(t, B(103), B(104.2))), color: C.white, width: 3 }],
      [{ x: 0, y: TL.C0, color: COL.acc, a: win(t, B(104.4), B(108), 0.3, 0.3), text: 'c′ = 8 kPa', dx: 14, dy: -24, size: 26 }, { x: 250, y: TL.C0 + 250 * TL.TANP, color: COL.acc, a: win(t, B(104.8), B(108), 0.3, 0.3), text: 'φ′ = 28°', dx: 16, dy: 30, size: 28 }]);
    axisLab(O, 1040, 180, 820, 560, a, 'σ [kPa]', 'τ [kPa]');
    formula(O, 110, 200, ['τ = c′ + σ · tg φ′', 'c′ = 8 kPa, φ′ = 28°'], win(t, B(104.6), B(108), 0.3, 0.3), { size: 40, title: 'Nyírószilárdság', color: COL.s2 }); }
  if (t > B(108) && t < B(112.2)) O.list(110, 190, 820, ['60 × 60 × 20 mm, két keret', 'σ állandó, lassú nyírás', 'Legalább három próbatest', 'c′ = 8 kPa, φ′ = 28°'], [B(108.2), B(108.6), B(109), B(109.4)], t, win(t, B(108.1), B(112), 0.2, 0.3), { title: 'Összegzés', color: C.accent, mark: '›', size: 32 });
  endCard(O, t, B, TOTAL, 112, 'NYÍRÓDOBOZ', null, 'Következik: triaxiális vizsgálat');
  runCaptions(O, t, CAPS);
  finish(O, t, TOTAL, CHAPTERS);
}
