// Triaxiális vizsgálat – feliratok (lépésszámokkal), címkék, mérési táblázat, képletek, UU / CU / CD ábrák, összegzés
import { clamp, smooth, seg, win, fmt, C, FH, runCaptions, L3, chip, badge, clockCard, table, formula, openTitle, endCard, finish, xyChart, axisLab } from '../tm_lab/ui.js';
import { fcard } from '../../kit/x_stab.js';
import { LX, BT } from '../tm_lab/room.js';
import { TD } from '../tm_lab/triax.js';
import * as TL from './timeline.js';
import { tb, TOTAL, CHAPTERS, COL, UU, CU, CD, SOIL, BEAT } from './timeline.js';
import { POS, FP } from './app.js';
import { mohr, springModel, micro, bGauge, namesCard, lanes, pressureArrows } from './charts.js';
const B = tb, W3 = (x, y, z) => [LX + x, y, z], FW = (x, y, z) => { const p = FP(x, y, z); return [LX + p[0], p[1], p[2]]; };
const uu = { kc: COL.UU, hc: COL.UU }, cu = { kc: COL.CU, hc: COL.CU }, cd = { kc: COL.CD, hc: COL.CD };
const CAPS = [
  [B(8.3), B(10.9), '1.1 A cella', ['A próbatest *gumimembránban* áll,', 'körülötte víz: a *cellanyomás*']],
  [B(11.0), B(13.8), '1.2 A terhelőkeret', ['A tárcsa *egyenletesen* emel,', 'a rúd az *erőmérőnek* nyomódik']],
  [B(13.9), B(16.25), '1.3 Nyomások', ['Két szabályozó: *cellanyomás*,', '*ellennyomás*; alul *pórusvíznyomás*']],
  [B(20.3), B(22.5), '2.1 A mintacső', ['Lezárt cső a fúrásból:', '*kupak* és *paraffin* le']],
  [B(22.6), B(25.5), '2.2 Kinyomás', ['A minta a *behatolás irányában*', 'hagyja el a csövet']],
  [B(25.6), B(27.6), '2.3 Levágás', ['Huzalfűrésszel kb. *12 cm*-t', 'vágunk le']],
  [B(27.7), B(29.6), '2.4 Az esztergára', ['Két kézzel, *óvatosan*;', 'felül sablonkorong']],
  [B(29.7), B(32.1), '2.5 Esztergálás', ['A kés a két *Ø 50 mm*-es', 'sablonkorong peremén fut le']],
  [B(32.2), B(34.6), '2.5 Esztergálás', ['Minden húzás után *60°*-ot fordítunk,', 'amíg a palást körben sima']],
  [B(34.7), B(38.4), '2.6 A magasság', ['*H = 2D = 100 mm*-nél levágjuk;', 'a levágott részből: *w_0*']],
  [B(38.5), B(42), '2.7 Mérés', ['Tömeg és méretek:', 'ebből a *sűrűség*']],
  [B(42.2), B(44.4), '3.1 Talp', ['*Telített* szűrőkő,', 'rá szűrőpapír']],
  [B(44.5), B(46.4), '3.2 A próbatest', ['Két kézzel, *középre*', 'a talpra']],
  [B(46.5), B(48.9), '3.3 Fejlemez', ['Papír, *szűrőkő*,', 'majd a fejlemez']],
  [B(49.0), B(52.4), '3.4 Gumimembrán', ['A feszítőben *vákuum* tartja,', 'majd ráengedjük a mintára']],
  [B(52.5), B(55.0), '3.5 O-gyűrűk', ['Két-két gyűrű alul és felül:', 'a cellavíz *nem jut be*']],
  [B(55.1), B(56.9), '3.6 Felső drén', ['A fejlemez csövét', '*bekötjük*']],
  [B(57.0), B(59.6), '3.7 A cella', ['Az *akrilhengert* elölről', 'a próbatest fölé engedjük']],
  [B(59.7), B(61.1), '3.8 Rögzítés', ['A húzórudak *anyái*']],
  [B(61.2), B(64.0), '3.9 Feltöltés', ['*Légtelenített* víz alulról; ha a', 'légtelenítőn víz jön: *elzárjuk*']],
  [B(64.2), B(66.5), '4.1 Felfekvés', ['A tárcsa emel: a rúd', '*felfekszik* az erőmérőre']],
  [B(66.6), B(68.8), '4.2 Vezérlés', ['Erő, elmozdulás, nyomás:', 'a számítógép *szabályoz és mér*']],
  [B(72.3), B(74.6), '5.1 Cellanyomás', ['*σ_c* minden oldalról,', 'a szelepek *zárva*'], uu],
  [B(74.7), B(77.4), '5.2 Nyírás', ['A tárcsa emeli a cellát:', 'a minta *rövidül*, kb. *1 %/perc*'], uu],
  [B(77.5), B(80.5), '5.3 Törés', ['*q_{max}*, vagy ha nincs csúcs,', 'a *15 %*-os alakváltozásnál'], uu],
  [B(80.6), B(82.9), '5.4 Három próbatest', ['Három cellanyomás:', '*ugyanakkora* Mohr-kör'], uu],
  [B(83.0), B(86), '5.5 Miért?', ['A többletet a *pórusvíz* veszi fel,', 'a szemcseváz *nem* terhelődik'], uu],
  [B(86.3), B(89.1), '6.1 Új próbatest', ['Oldalt *szűrőpapír-csíkok*:', 'rövidebb a víz útja'], cu],
  [B(89.2), B(93.5), '6.2 Telítés', ['*Ellennyomás*: a levegő a vízben', 'oldódik; kell: *B ≥ 0,95*'], cu],
  [B(93.6), B(97.5), '6.3 Konszolidáció', ['Nyitott szelep: a víz kiáramlik,', 'beáll a *σ′_c* hatékony feszültség'], cu],
  [B(97.6), B(101.5), '6.4 Nyírás', ['Zárt szelep, *lassú* nyírás:', 'mérjük a *pórusvíznyomást*'], cu],
  [B(101.6), B(103.6), '6.5 Hatékony feszültség', ['*σ′ = σ − u*:', 'a körök *Δu*-val balra'], cu],
  [B(103.7), B(106), '6.6 Eredmény', ['A hatékony körök érintője:', '*c′* és *φ′*'], cu],
  [B(106.3), B(108.6), '7.1 Előkészítés', ['Telítés, konszolidáció:', '*mint a CU-nál*'], cd],
  [B(108.7), B(112.2), '7.2 Nyírás', ['*Nyitott* szelep, *nagyon lassú*:', '*Δu ≈ 0*, mérjük a *ΔV*-t'], cd],
  [B(112.3), B(116), '7.3 Eredmény', ['*Ugyanaz* a c′ és φ′;', 'egy próbatest *napokig* tart'], cd],
  [B(116.2), B(119), '8.1 Szétszerelés', ['A tárcsa le, a víz ki,', 'a cellát *leemeljük*']],
  [B(119.1), B(122), '8.2 Törési kép', ['Lerajzoljuk a törést, majd', '*víztartalom* a teljes próbatestből']],
  [B(122.3), B(125.5), '9.1 Számítás', ['Nyírás közben a keresztmetszet *nő*']],
];
// ---- görbék ----
const curve = (f, e1, n = 120) => Array.from({ length: n + 1 }, (_, i) => { const e = e1 * i / n; return [e, f(e)]; });
const fq = { UU: UU.map(s => curve(e => TL.qUU(e, s.qf), 15)), CU: CU.map(s => curve(e => TL.qCU(e, s.qf), 15)), CD: CD.map(s => curve(e => TL.qCD(e, s.qf), 15)) };
const fu = CU.map(s => curve(e => TL.uCU(e, s.du), 15)), fv = CD.map(s => curve(e => TL.evCD(e, s.ev), 15));
const SPC = () => TD.SPB + 0.05;                                     // a próbatest közepe (tárcsa-csoport)

export function drawOverlay(O, t, ctx) {
  const { proj, shot, C: S } = ctx; const g = O.g; const pl = (b) => 0;
  openTitle(O, t, B, TOTAL, { q1: 'Mennyit bír a talaj?', q2: 'Addig nyomjuk, amíg el nem törik', title: 'Triaxiális\nvizsgálat', sub: 'UU · CU · CD, lépésről lépésre' });
  const CHP = [[8, 20, '1  A készülék', C.accent], [20, 42, '2  A próbatest', C.accent], [42, 64, '3  Beépítés', C.accent], [64, 72, '4  Indítás', C.accent],
    [72, 86, '5  UU · nem konszolidált, drénezetlen', COL.UU], [86, 106, '6  CU · konszolidált, drénezetlen', COL.CU], [106, 116, '7  CD · konszolidált, drénezett', COL.CD], [116, 122, '8  Kiszerelés', C.accent], [122, 133, '9  Kiértékelés', C.accent]];
  for (const [b0, b1, n, c] of CHP) chip(O, n, win(t, B(b0), B(b1), 0.25, 0.25), c);
  const clk = TL.realClock(t); const tblOn = (t > B(16.2) && t < B(20)) || clk;
  badge(O, 'EN ISO 17892-8, -9', win(t, B(9.2), B(72), 0.4, 0.4) * (1 - (tblOn ? 1 : 0)));
  // a cella pillanatnyi helye (a tárcsa emelkedése a jelenetből)
  const plY = ctx.L && ctx.L.G ? null : null;
  const cy = (y) => { const X = (typeof window !== 'undefined') ? window.__X : null; const p = X ? X.PL.position.y - BT : 0; return BT + p + y; };
  const cellW = (x, y, z) => W3(POS.FR[0] + x, cy(y), POS.FR[1] + z);
  // ---- 1.1 a cella részei
  if (false) { const L = [['AKRILHENGER', cellW(TD.CYR, TD.CY0 + 0.2, 0.0), [170, -80], 9.6]];
    for (const [s, p, d, b] of L) L3(O, proj, p, s, win(t, B(b), B(11.0), 0.25, 0.25), { dx: d[0], dy: d[1] }); }
  // ---- 1.2 a keret: erőmérő, elmozdulásmérő, motoros tárcsa; σ_1 = σ_3 + q
  if (t > B(11.0) && t < B(13.85)) { const a = (b) => win(t, B(b), B(13.75), 0.25, 0.25);
    L3(O, proj, FW(0.07, TD.LCB - 0.1, 0), 'ELMOZDULÁSMÉRŐ', a(11.8), { dx: 180, dy: -40 });
    formula(O, 100, 170, ['σ_1 = σ_3 + q'], win(t, B(12.2), B(13.75), 0.3, 0.3), { size: 40, title: null, color: COL.acc }); }
  // ---- 1.3 szabályozók, pórusvíznyomás-mérő
  if (t > B(13.7) && t < B(16.3)) { const a = (b) => win(t, B(b), B(16.2), 0.25, 0.25);
    L3(O, proj, W3(POS.CTLC[0] - 0.1, BT + 0.14, POS.CTLC[1]), 'σ_3', a(14.3), { dx: 60, dy: -150 }); L3(O, proj, W3(POS.CTLB[0] + 0.05, BT + 0.13, POS.CTLB[1] + 0.07), 'u_B · ΔV', a(14.7), { dx: 120, dy: 90 });
    L3(O, proj, cellW(0.1 * Math.cos(0.95) + 0.05, TD.CB + 0.015, 0.1 * Math.sin(0.95) + 0.04), 'u', a(15.1), { dx: -230, dy: 110 }); }
  // ---- 1.4 mit, mivel mérünk?
  if (t > B(16.2) && t < B(20.1)) { const a = win(t, B(16.3), B(20), 0.3, 0.3); O.fade(0.35 * a);
    table(O, 520, 210, 880, ['Mit mérünk?', 'Mivel?'], [['Erő', 'erőmérő'], ['Rövidülés', 'elmozdulásmérő'], ['Cellanyomás', 'nyomásszabályozó'], ['Pórusvíznyomás', 'nyomásmérő'], ['Térfogatváltozás', 'térfogatmérő']], a,
      { n: clamp(seg(t, B(16.4), B(17.9)) * 5, 0, 5), title: null, cols: [440, 420], size: 34, rowH: 58 }); }
  // ---- 2. próbatest
  if (t > B(22.6) && t < B(25.6)) L3(O, proj, W3(POS.EX[0] + 0.15, 0.72, POS.EX[1] - 0.05), 'HIDRAULIKUS KINYOMÓ', win(t, B(23), B(25.5), 0.3, 0.3), { dx: 170, dy: -60 });
  if (t > B(29.7) && t < B(32.2)) L3(O, proj, W3(POS.LAT[0], BT + 0.185, POS.LAT[1] + 0.02), 'Ø 50 mm', win(t, B(30.3), B(32.1), 0.3, 0.3), { dx: -170, dy: -90 });
  if (t > B(38.0) && t < B(38.6)) {}
  if (t > B(38.5) && t < B(42.1)) { const a = win(t, B(39.95), B(42), 0.2, 0.25); L3(O, proj, W3(POS.SCL, BT + 0.03, -0.86), 'm = 382,9 g', a, { dx: -200, dy: -120 });
    formula(O, 1080, 170, ['D_0 = 50 mm · H_0 = 100 mm', 'ρ = m / V = 1,95 g/cm³', 'w_0 = 28,4 %'], win(t, B(40.1), B(42), 0.3, 0.3), { size: 34, title: null, color: COL.acc }); }
  // ---- 3. beépítés
  if (t > B(49.0) && t < B(52.4)) L3(O, proj, W3(POS.FR[0] + 0.034, BT + TD.CAPTOP + 0.05, POS.FR[1]), 'MEMBRÁNFESZÍTŐ', win(t, B(49.6), B(52.3), 0.25, 0.25), { dx: 200, dy: -70 });
  if (t > B(61.2) && t < B(64)) L3(O, proj, cellW(0.058, TD.CY0 + TD.TOPY + TD.TPH + 0.012, 0.03), 'LÉGTELENÍTŐ', win(t, B(61.6), B(63.9), 0.25, 0.25), { dx: 170, dy: -70 });
  if (t > B(64.2) && t < B(66.6)) L3(O, proj, FW(0, TD.LCB + 0.03, 0), 'ERŐMÉRŐ', win(t, B(64.6), B(66.5), 0.25, 0.25), { dx: -170, dy: -60 });
  // ---- 4.3 a két betű
  if (t > B(68.8) && t < B(72.2)) { O.fade(0.35 * win(t, B(68.8), B(72), 0.3, 0.3)); namesCard(O, 560, 250, 800, win(t, B(68.8), B(72), 0.3, 0.3), t, B(69.0), BEAT); }
  // ---- vizsgálatok: HUD, óra
  const hudA = (b0, b1) => win(t, B(b0), B(b1), 0.3, 0.3);
  if (S && t > B(72.3) && t < B(80.5)) O.hud([{ k: 'σ_c', v: fmt(S.sc, 0), u: 'kPa', color: COL.UU }, { k: 'ε_a', v: fmt(S.ea, 1), u: '%', color: COL.UU }, { k: 'q', v: fmt(S.q, 0), u: 'kPa', hi: true, color: COL.UU }], hudA(72.4, 80.4));
  if (S && t > B(89.2) && t < B(93.6)) O.hud([{ k: 'u_B', v: fmt(S.uB, 0), u: 'kPa', color: COL.CU }], hudA(89.4, 93.5));
  if (S && t > B(93.6) && t < B(97.6)) O.hud([{ k: 'σ′_c', v: fmt(S.sc - S.u, 0), u: 'kPa', color: COL.CU }, { k: 'ΔV', v: fmt(S.ev, 1), u: '%', color: COL.CU }, { k: 'IDŐ', v: fmt(TL.conReal(t), 0), u: 'perc', color: COL.CU }], hudA(93.7, 97.5));
  if (S && t > B(97.6) && t < B(101.6)) O.hud([{ k: 'ε_a', v: fmt(S.ea, 1), u: '%', color: COL.CU }, { k: 'q', v: fmt(S.q, 0), u: 'kPa', color: COL.CU }, { k: 'Δu', v: fmt(S.u - 300, 0), u: 'kPa', hi: true, color: C.water }], hudA(97.7, 101.5));
  if (S && t > B(108.7) && t < B(112.3)) O.hud([{ k: 'ε_a', v: fmt(S.ea, 1), u: '%', color: COL.CD }, { k: 'q', v: fmt(S.q, 0), u: 'kPa', color: COL.CD }, { k: 'ΔV', v: fmt(S.ev - 3.1, 1), u: '%', hi: true, color: C.water }], hudA(108.8, 112.2));
  if (clk) clockCard(O, win(t, B(clk.b[0]), B(clk.b[1]), 0.3, 0.3), clk.k, clk.v + ' ' + clk.u);
  // ---- UU
  if (t > B(72.3) && t < B(74.7)) pressureArrows(O, proj, cellW(0, SPC(), 0), 0.03, 0.1, win(t, B(72.5), B(74.6), 0.3, 0.3) * (S ? clamp(S.sc / 200) : 0), C.water, 4, 60);
  if (t > B(74.7) && t < B(80.6)) { const a = win(t, B(74.9), B(80.5), 0.35, 0.3); const e = S ? S.ea : 0;
    xyChart(O, 1080, 270, 790, 460, a, { xmax: 16, ymax: 140, xticks: [0, 5, 10, 15], yticks: [0, 50, 100], title: null }, [{ pts: fq.UU[1], upto: clamp(e / 15), color: COL.UU, width: 4 }],
      [{ x: TL.EF.UU, y: TL.qUU(TL.EF.UU, UU[1].qf), text: 'q_{max}', color: C.white, a: win(t, B(77.6), B(80.5), 0.3, 0.3), hline: true }]);
    axisLab(O, 1080, 270, 790, 460, a, 'ε_a [%]', 'q [kPa]'); }
  if (t > B(80.6) && t < B(86.2)) { const a = win(t, B(80.6), B(86), 0.35, 0.35), k = (b) => smooth(seg(t, B(b), B(b + 0.8)));
    const cs = UU.map((s, i) => ({ s3: s.s3, s1: s.s3 + s.qf, color: COL.UU, k: k(80.8 + i * 0.45), dots: true }));
    mohr(O, 1080, 250, 790, 470, a, { smax: 460, tmax: 200, sstep: 100, xl: 'σ [kPa]' }, cs, [{ tau: SOIL.cu, color: C.white, k: k(81.9), label: 'c_u ≈ 55 kPa · φ_u = 0', lk: k(82.1), ls: 30, ldx: 0, size: 28 }]);
    if (t > B(83.0)) springModel(O, 120, 250, 760, 470, win(t, B(83.2), B(86), 0.35, 0.3), { load: smooth(seg(t, B(83.5), B(84.3))), valve: 0, comp: 0, u: 0.15 + 0.7 * smooth(seg(t, B(83.7), B(84.5))), t }, { color: COL.UU, labels: false }); }
  // ---- CU
  if (t > B(86.3) && t < B(89.2)) { const a = (b) => win(t, B(b), B(89.1), 0.3, 0.3); L3(O, proj, cellW(0.02, SPC() + 0.02, 0.02), 'OLDALSÓ DRÉN', a(86.8), { dx: -200, dy: -80, color: COL.CU });
    L3(O, proj, cellW(0.024, TD.CY0 + TD.PED + 0.003, 0.005), 'VIZES SZŰRŐKŐ', a(87.4), { dx: -200, dy: 70, color: C.water }); }
  if (t > B(89.2) && t < B(93.6)) { const a = win(t, B(89.4), B(93.5), 0.3, 0.3); micro(O, 1270, 470, 170, a, { air: 1 - (S ? S.sat : 0) }); bGauge(O, 1470, 330, 400, TL.bNow(t), a * smooth(seg(t, B(90, 2), B(90, 3)))); }
  if (t > B(93.6) && t < B(97.6)) { const a = win(t, B(93.8), B(97.5), 0.3, 0.3), tm = TL.conReal(t);
    const pts = Array.from({ length: 121 }, (_, i) => { const tt = 150 * i / 120; return [Math.sqrt(tt), 3.1 * TL.Ucon(tt)]; });
    const ch = xyChart(O, 1080, 270, 790, 460, a, { xmax: 12.5, ymax: 3.6, xticks: [0, 2, 4, 6, 8, 10, 12], yticks: [0, 1, 2, 3], title: null }, [{ pts, upto: clamp(tm / 150), color: COL.CU, width: 4 }],
      [{ x: Math.sqrt(TL.T100), y: 3.1, text: 't_{100} = 60 perc', color: C.white, a: smooth(seg(t, B(96.2), B(96.9))), vline: true }]);
    if (ch) { const k = smooth(seg(t, B(95.6), B(96.5))); g.save(); g.globalAlpha = a * k; g.strokeStyle = 'rgba(255,255,255,0.7)'; g.setLineDash([8, 6]); g.lineWidth = 2; g.beginPath(); g.moveTo(ch.sx(0), ch.sy(0)); g.lineTo(ch.sx(Math.sqrt(TL.T100) * 1.05), ch.sy(3.1 * 1.05)); g.moveTo(ch.sx(0), ch.sy(3.1)); g.lineTo(ch.sx(12.5), ch.sy(3.1)); g.stroke(); g.restore(); }
    axisLab(O, 1080, 270, 790, 460, a, '√t [√perc]', 'ΔV [%]'); }
  if (t > B(97.6) && t < B(101.6)) { const a = win(t, B(97.8), B(101.5), 0.35, 0.3); const e = S ? S.ea : 0;
    xyChart(O, 1080, 270, 790, 230, a, { xmax: 16, ymax: 180, xticks: [0, 5, 10, 15], yticks: [0, 80, 160], title: 'q' }, [{ pts: fq.CU[1], upto: clamp(e / 15), color: COL.CU, width: 4 }]);
    xyChart(O, 1080, 510, 790, 230, a, { xmax: 16, ymax: 140, xticks: [0, 5, 10, 15], yticks: [0, 60, 120], title: 'Δu' }, [{ pts: fu[1], upto: clamp(e / 15), color: C.water, width: 4 }]);
    axisLab(O, 1080, 510, 790, 230, a, 'ε_a [%]', ''); }
  if (t > B(100.9) && t < B(101.6)) L3(O, proj, cellW(-0.02, SPC() + 0.01, 0.02), 'NYÍRÁSI SÍK', win(t, B(101.0), B(101.5), 0.15, 0.2), { dx: -230, dy: -40, color: COL.CU });
  if (t > B(101.6) && t < B(106.2)) { const a = win(t, B(101.6), B(106), 0.35, 0.35), k = (b) => smooth(seg(t, B(b), B(b + 0.8))), sh = (i) => smooth(seg(t, B(102.4 + i * 0.4), B(103.4 + i * 0.4)));
    const cs = []; CU.forEach((s, i) => { const d = s.du * sh(i); void 0; cs.push({ s3: s.s3, s1: s.s3 + s.qf, color: 'rgba(255,255,255,0.6)', dash: [8, 7], w: 2.5, k: k(101.8 + i * 0.2), alpha: 1 - 0.4 * sh(i) });
      cs.push({ s3: s.s3 - d, s1: s.s3 + s.qf - d, color: COL.CU, k: sh(i) > 0.001 ? 1 : 0, w: 3.5, label: i === 2 && t < B(103.6) ? '← Δu' : null, lk: sh(2), lsize: 26 }); });
    mohr(O, 1080, 250, 790, 470, a, { smax: 540, tmax: 240, sstep: 100 }, cs, [{ c: SOIL.c, phi: SOIL.phi, color: C.white, k: k(103.6), label: 'c′ = 5 kPa · φ′ = 27°', lk: k(103.9), ls: 330, ldx: -10, size: 28 }]); }
  // ---- CD
  if (t > B(108.7) && t < B(112.3)) { const a = win(t, B(108.8), B(112.2), 0.35, 0.3); const e = S ? S.ea : 0;
    xyChart(O, 1080, 270, 790, 230, a, { xmax: 16, ymax: 400, xticks: [0, 5, 10, 15], yticks: [0, 150, 300], title: 'q' }, [{ pts: fq.CD[1], upto: clamp(e / 15), color: COL.CD, width: 4 }]);
    xyChart(O, 1080, 510, 790, 230, a, { xmax: 16, ymax: 5, xticks: [0, 5, 10, 15], yticks: [0, 2, 4], title: 'ε_{vol}' }, [{ pts: fv[1], upto: clamp(e / 15), color: C.water, width: 4 }]);
    axisLab(O, 1080, 510, 790, 230, a, 'ε_a [%]', '');
    if (t < B(110.6)) springModel(O, 120, 250, 760, 470, win(t, B(108.9), B(110.5), 0.3, 0.3), { load: 1, valve: 1, comp: smooth(seg(t, B(109.1), B(110.4))), u: 0.08, drip: 1, t }, { color: COL.CD, labels: false }); }
  if (t > B(112.3) && t < B(116.2)) { const a = win(t, B(112.3), B(116), 0.35, 0.35), k = (b) => smooth(seg(t, B(b), B(b + 0.8)));
    const cs = [...CU.map(s => ({ s3: s.s3e, s1: s.s3e + s.qf, color: COL.CU, w: 2.5, k: k(112.5), alpha: 0.55 })), ...CD.map((s, i) => ({ s3: s.s3, s1: s.s3 + s.qf, color: COL.CD, k: k(112.8 + i * 0.5), w: 3.5, dots: true }))];
    mohr(O, 1080, 250, 790, 470, a, { smax: 860, tmax: 380, sstep: 200 }, cs, [{ c: SOIL.c, phi: SOIL.phi, color: C.white, k: k(114.3), label: 'c′ = 5 kPa · φ′ = 27°', lk: k(114.8), ls: 520, ldx: -10, size: 28 }]); }
  // ---- 8. kiszerelés
  if (t > B(119.1) && t < B(122)) L3(O, proj, cellW(-0.03, SPC(), 0), 'HORDÓSODÁS', win(t, B(119.4), B(121.9), 0.25, 0.3), { dx: -260, dy: -60, color: COL.CD });
  // ---- 9. kiértékelés
  if (t > B(122.3) && t < B(125.6)) formula(O, 110, 190, ['ε_a = Δh / H_0', 'A = A_0 / (1 − ε_a)', 'q = F / A'], win(t, B(122.6), B(125.5), 0.3, 0.3), { size: 40, title: null, color: COL.acc });
  if (t > B(125.6) && t < B(130.6)) { O.fade(0.4 * win(t, B(125.6), B(130.5), 0.3, 0.3)); lanes(O, 360, 200, 1200, win(t, B(125.7), B(127.9), 0.3, 0.3), t, B(125.9), B(1.6));
    const a = win(t, B(127.8), B(130.5), 0.35, 0.35);
    fcard(O, 140, 300, 800, a, seg(t, B(127.8), B(128.3)), [{ s: 'c_u  ·  φ_u = 0', size: 44, color: COL.UU }, { s: 'rövid táv: pl. töltés építése', size: 32 }], 'UU', { color: COL.UU });
    fcard(O, 980, 300, 800, a, seg(t, B(128.3), B(128.8)), [{ s: 'c′  ·  φ′', size: 44, color: COL.CD }, { s: 'hosszú táv: pl. rézsű', size: 32 }], 'CU · CD', { color: COL.CD }); }
  if (t > B(130.5) && t < B(133.2)) O.list(120, 200, 860, ['UU: c_u, gyors', 'CU: c′, φ′ + Δu', 'CD: c′, φ′, lassú', 'Legalább 3 próbatest'], [B(130.6), B(130.9), B(131.2), B(131.5)], t, win(t, B(130.5), B(133), 0.2, 0.4), { title: 'Összegzés', color: C.accent, mark: '›', size: 34 });
  endCard(O, t, B, TOTAL, 133, 'TRIAXIÁLIS', null, 'Talajmechanikai laborok · 9 / 9');
  runCaptions(O, t, CAPS);
  if (S && S.fail > 0 && (S.ph === 'open' || S.ph === 'CU')) { const tp = S.ph === 'open' ? B(2) : B(100.9); if (t >= tp && t < tp + 0.25) O.flash((1 - (t - tp) / 0.25) * 0.35); }
  finish(O, t, TOTAL, CHAPTERS);
}
