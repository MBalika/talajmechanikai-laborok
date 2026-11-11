// Triaxiális vizsgálat – feliratok, címkék, diagramok
import { clamp, lerp, smooth, easeOut, ease, seg, win, fmt } from '../../kit/util.js';
import { C, FH, FB } from '../../kit/overlay.js';
import { runCaptions } from '../../kit/hud.js';
import { xyChart, PC } from '../../kit/plots.js';
import { fcard } from '../../kit/x_stab.js';
import * as TL from './timeline.js';
import { tb, BEAT, TOTAL, CHAPTERS, COL, UU, CU, CD, SOIL } from './timeline.js';
import { LX, BT, FRX, FRZ, EXT, LAT, SCL, PC as PCX } from './layout.js';
import { panel, mohr, springModel, micro, bGauge, namesCard, lanes, chip, pressureArrows, hexA } from './charts.js';
const B = tb;
const W3 = (x, y, z) => [LX + x, y, z];
const CYW = BT + 0.2 + 0.2605 + 0.05;              // a minta közepe vizsgálat közben (világ-y)
const CAPS = [
  [B(8, 0.3), B(10.5), 'A minta a laborban', ['Lezárt mintacső a fúrásból:', 'kupak és *paraffin* le']],
  [B(10.6), B(13.5), 'Kinyomás', ['A minta a *behatolás irányában*', 'hagyja el a csövet']],
  [B(13.6), B(17.5), 'Faragás', ['Ø *50 mm*, magasság *2 × átmérő*,', 'a végek merőlegesek']],
  [B(17.6), B(20), 'Adatok', ['Méret, tömeg, *víztartalom*']],
  [B(20.1), B(21.4), 'Talp', ['*Telített* szűrőkő, papír']],
  [B(21.3), B(22.75), 'A minta', ['Két kézzel, *óvatosan* a talpra']],
  [B(22.8), B(24), 'Fejlemez', ['Papír, *szűrőkő*, fejlemez']],
  [B(24.1), B(26.4), 'Gumimembrán', ['A feszítőben *vákuum* tartja,', 'majd ráengedjük a mintára']],
  [B(26.5), B(28.25), 'O-gyűrűk', ['Két-két gyűrű alul és felül:', 'a cellavíz *nem jut* be']],
  [B(28.3), B(30), 'Felső drén', ['A fejlemez csöve', 'a talplemez *furatába*']],
  [B(30.1), B(32.9), 'A cella', ['*Akrilhenger*, majd a húzórudak', 'anyáit meghúzzuk']],
  [B(33), B(36), 'Feltöltés', ['*Légtelenített* víz alulról;', 'ha a légtelenítőn víz jön: *elzárjuk*']],
  [B(36.1), B(38), 'Felfekvés', ['A rúd *felfekszik* az erőmérőre']],
  [B(38.1), B(41), 'Bekötés', ['Cellanyomás, ellennyomás,', '*pórusvíznyomás*-mérő']],
  [B(41.1), B(44), 'Vezérlés', ['Erő, elmozdulás, nyomás:', 'a számítógép *szabályoz és mér*']],
  [B(48, 0.3), B(51), 'UU · cellanyomás', ['A cellavíz *minden oldalról* nyomja,', 'a szelepek *zárva*'], { kc: COL.UU, hc: COL.UU }],
  [B(51, 0.3), B(55), 'UU · nyírás', ['A tárcsa emeli a cellát:', 'a minta *rövidül*, kb. *1 %/perc*'], { kc: COL.UU, hc: COL.UU }],
  [B(55, 0.3), B(58), 'UU · törés', ['Törés: *q_{max}*, vagy ha nincs csúcs,', 'a *15 %*-os alakváltozásnál'], { kc: COL.UU, hc: COL.UU }],
  [B(58, 0.3), B(62), 'Három próbatest', ['Három cellanyomás:', '*ugyanakkora* Mohr-kör'], { kc: COL.UU, hc: COL.UU }],
  [B(62, 0.3), B(66), 'Miért?', ['A többletnyomást a *pórusvíz* veszi fel,', 'a szemcseváz feszültsége *nem nő*'], { kc: COL.UU, hc: COL.UU }],
  [B(66, 0.3), B(69), 'CU · beépítés', ['Most a víz *ki-be* áramolhat'], { kc: COL.CU, hc: COL.CU }],
  [B(69, 0.3), B(74), 'Telítés', ['*Ellennyomás*: a pórusokban maradt', 'levegő a vízben *oldódik*'], { kc: COL.CU, hc: COL.CU }],
  [B(74, 0.3), B(79), 'Konszolidáció', ['Nyitott szelep: a víz kiáramlik,', 'beáll a *σ′_c* hatékony feszültség'], { kc: COL.CU, hc: COL.CU }],
  [B(79, 0.3), B(84), 'CU · nyírás', ['Zárt szelep, *lassú* nyírás:', 'a *pórusvíznyomás* nő, mérjük'], { kc: COL.CU, hc: COL.CU }],
  [B(84, 0.3), B(88), 'Hatékony feszültség', ['*σ′ = σ − u*: minden Mohr-kör', '*Δu*-val balra tolódik'], { kc: COL.CU, hc: COL.CU }],
  [B(88, 0.3), B(92), 'CU · eredmény', ['A hatékony körök érintője:', '*c′* és *φ′*'], { kc: COL.CU, hc: COL.CU }],
  [B(92, 0.3), B(95), 'CD · előkészítés', ['Telítés és konszolidáció,', '*ugyanúgy*, mint a CU-nál'], { kc: COL.CD, hc: COL.CD }],
  [B(95, 0.3), B(100), 'CD · nyírás', ['*Nyitott* szelep, *nagyon lassú* nyírás:', 'a víz elfolyik, *Δu ≈ 0*'], { kc: COL.CD, hc: COL.CD }],
  [B(100, 0.3), B(104), 'Térfogatváltozás', ['Normálisan konszolidált agyag:', 'a térfogata *csökken*'], { kc: COL.CD, hc: COL.CD }],
  [B(104, 0.3), B(108), 'CD · eredmény', ['*Ugyanaz* a c′ és φ′,', 'mint a CU-ból'], { kc: COL.CD, hc: COL.CD }],
  [B(108, 0.3), B(112), 'Lassú, de közvetlen', ['Egy CD-próbatest *napokig*,', 'akár hetekig tart'], { kc: COL.CD, hc: COL.CD }],
];
// ---------- görbék ----------
const curve = (f, e1, n = 120) => Array.from({ length: n + 1 }, (_, i) => { const e = e1 * i / n; return [e, f(e)]; });
const fq = { UU: UU.map(s => curve(e => TL.qUU(e, s.qf), 15)), CU: CU.map(s => curve(e => TL.qCU(e, s.qf), 15)), CD: CD.map(s => curve(e => TL.qCD(e, s.qf), 15)) };
const fu = CU.map(s => curve(e => TL.uCU(e, s.du), 15)), fv = CD.map(s => curve(e => TL.evCD(e, s.ev), 15));
const L3 = (O, proj, p, text, a, o) => { const q = proj(...p); if (q.ok) O.label(q.x, q.y, text, a, o); };

export function drawOverlay(O, t, ctx) {
  const { proj, shot, C: S } = ctx; const g = O.g;
  // ---- hideg nyitás
  O.letterbox(t < B(4) ? 1 - smooth(seg(t, B(3.75), B(4))) : 0, 110);
  if (t < B(4.1)) { const ga = win(t, B(0.3), B(3.95), 0.3, 0.25); if (ga > 0) { g.save(); g.globalAlpha = ga; const grd = g.createLinearGradient(0, 0, 1300, 0); grd.addColorStop(0, 'rgba(6,7,9,0.8)'); grd.addColorStop(0.75, 'rgba(6,7,9,0.25)'); grd.addColorStop(1, 'rgba(6,7,9,0)'); g.fillStyle = grd; g.fillRect(0, 0, 1920, 1080); g.restore(); }
    O.bigLine('Mennyit bír a talaj?', t - B(0.5), win(t, B(0.5), B(3.9), 0.35, 0.3), 450, 104, C.white, { x: 130, align: 'left' });
    O.bigLine('Addig nyomjuk, amíg el nem törik', t - B(2.2), win(t, B(2.2), B(3.95), 0.3, 0.25), 570, 66, C.accent, { x: 130, align: 'left' });
  }
  O.titleCard(t - B(4), win(t, B(4), B(8), 0.05, 0.5), { kicker: 'Talajmechanikai laborok', title: 'Triaxiális\nvizsgálat', sub: 'A mintától a nyírószilárdságig' });
  // ---- fejezet-chipek
  const CHP = [[8, 20, '1  Próbatest', C.accent], [20, 36, '2  Beépítés', C.accent], [36, 44, '3  A készülék', C.accent], [48, 66, 'UU  nem konszolidált, drénezetlen', COL.UU],
    [66, 92, 'CU  konszolidált, drénezetlen', COL.CU], [92, 112, 'CD  konszolidált, drénezett', COL.CD], [112, 122, 'Melyiket mikor?', C.accent]];
  for (const [b0, b1, n, c] of CHP) chip(O, n, win(t, B(b0), B(b1), 0.25, 0.25), c);
  // ---- 1. próbatest
  if (t > B(10.5) && t < B(13.5)) L3(O, proj, W3(EXT.x - 0.22, BT + 0.13, EXT.z), 'HIDRAULIKUS KITOLÓ', win(t, B(11), B(13.5), 0.3, 0.3), { dx: -60, dy: -170 });
  if (t > B(13.5) && t < B(17.5)) { L3(O, proj, W3(LAT.x - 0.02, BT + 0.31, LAT.z - 0.13), 'TALAJESZTERGA', win(t, B(14), B(17.5), 0.3, 0.3), { dx: -200, dy: -60 });
    L3(O, proj, W3(LAT.x + 0.03, BT + 0.06, LAT.z + 0.02), 'Ø 50 mm', win(t, B(15.3), B(17.5), 0.3, 0.3), { dx: 170, dy: 90, color: C.white }); }
  if (t > B(17.5) && t < B(20)) { L3(O, proj, W3(SCL.x - 0.05, BT + 0.05, SCL.z + 0.12), 'm = 382,9 g', win(t, B(18.2), B(20), 0.3, 0.3), { dx: -240, dy: -150, color: C.white });
    L3(O, proj, W3(SCL.x + 0.275, BT + 0.025, SCL.z + 0.05), 'w = 28,4 %', win(t, B(18.9), B(20), 0.3, 0.3), { dx: 120, dy: -140 }); }
  // ---- 2. beépítés
  const tx = (x, y, z) => W3(FRX + x, BT + y, FRZ + z);
  if (t > B(30) && t < B(32.9)) L3(O, proj, tx(0.074, 0.38, 0), 'AKRILCELLA', win(t, B(30.6), B(32.9), 0.3, 0.3), { dx: 170, dy: -60 });
  if (t > B(36) && t < B(38)) { L3(O, proj, W3(FRX, BT + 0.83, FRZ), 'ERŐMÉRŐ', win(t, B(36.4), B(38), 0.3, 0.3), { dx: -150, dy: -80 }); }
  if (t > B(38) && t < B(44)) { const a = (b) => win(t, B(b), B(44), 0.3, 0.3);
    L3(O, proj, W3(1.45, BT + 0.14, -1.32), 'CELLANYOMÁS', a(38.6), { dx: -40, dy: -170 });
    L3(O, proj, W3(1.45, BT + 0.14, -1.08), 'ELLENNYOMÁS', a(39.2), { dx: 60, dy: 120 });
  }
  // ---- betűk
  if (t > B(44) && t < B(48.2)) { O.fade(0.35 * win(t, B(44), B(48), 0.3, 0.3)); namesCard(O, 560, 250, 800, win(t, B(44), B(48), 0.3, 0.3), t, B(44.5), BEAT); }
  // ---- vizsgálatok: HUD
  const hudA = (b0, b1) => win(t, B(b0), B(b1), 0.3, 0.3);
  if (S && t > B(48) && t < B(58)) O.hud([{ k: 'σ_c', v: fmt(S.sc, 0), u: 'kPa', color: COL.UU }, { k: 'ε_a', v: fmt(S.ea, 1), u: '%', color: COL.UU }, { k: 'q', v: fmt(S.q, 0), u: 'kPa', hi: true, color: COL.UU }], hudA(48.5, 58));
  if (S && t > B(69) && t < B(74.2)) O.hud([{ k: 'u_B', v: fmt(S.uB, 0), u: 'kPa', color: COL.CU }], hudA(69.3, 74));
  if (S && t > B(74) && t < B(79.2)) O.hud([{ k: 'σ′_c', v: fmt(S.sc - S.u, 0), u: 'kPa', color: COL.CU }, { k: 'ΔV', v: fmt(S.ev, 1), u: '%', color: COL.CU }, { k: 'IDŐ', v: fmt(TL.conReal(t), 0), u: 'perc', color: COL.CU }], hudA(74.3, 79));
  if (S && t > B(79) && t < B(84.2)) O.hud([{ k: 'ε_a', v: fmt(S.ea, 1), u: '%', color: COL.CU }, { k: 'q', v: fmt(S.q, 0), u: 'kPa', color: COL.CU }, { k: 'Δu', v: fmt(S.u - 300, 0), u: 'kPa', hi: true, color: C.water }], hudA(79.3, 84));
  if (S && t > B(98) && t < B(104.2)) O.hud([{ k: 'ε_a', v: fmt(S.ea, 1), u: '%', color: COL.CD }, { k: 'q', v: fmt(S.q, 0), u: 'kPa', color: COL.CD }, { k: 'ΔV', v: fmt(S.ev - 3.1, 1), u: '%', hi: true, color: C.water }], hudA(98.2, 104));
  const clk = TL.realClock(t); if (clk) { const a = win(t, ...([[51, 58], [79, 85], [95, 104]].find(([b0, b1]) => t >= B(b0) && t < B(b1)) || [0, 0]).map(b => B(b)), 0.3, 0.3);
    g.save(); g.globalAlpha = a; g.fillStyle = 'rgba(10,12,14,0.78)'; O.rr(1406, 182, 450, 64, 12); g.fill(); O.font(24, 700, FH); g.fillStyle = C.dim; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('⏱  ' + clk.k, 1428, 214);
    O.font(40, 800, FH); g.fillStyle = C.white; g.textAlign = 'right'; g.fillText(clk.v + ' ' + clk.u, 1834, 216); g.restore(); }
  // ---- UU
  if (t > B(48) && t < B(51.2)) { const a = win(t, B(48.6), B(51), 0.3, 0.3) * (S ? clamp(S.sc / 200) : 0); pressureArrows(O, proj, W3(FRX, CYW, FRZ), 0.03, 0.1, a, C.water, 4, 60);
  }
  if (t > B(51) && t < B(58.2)) { const a = win(t, B(51.2), B(58), 0.35, 0.3); const e = S ? S.ea : 0;
    xyChart(O, 1080, 270, 790, 460, a, { xmax: 16, ymax: 140, xticks: [0, 5, 10, 15], yticks: [0, 50, 100], xlabel: '', ylabel: '', title: null }, [{ pts: fq.UU[1], upto: clamp(e / 15), color: COL.UU, width: 4 }],
      [{ x: TL.EF.UU, y: TL.qUU(TL.EF.UU, UU[1].qf), text: 'q_{max}', color: C.white, a: win(t, B(55, 1), B(58), 0.3, 0.3), hline: true }]);
    axisLab(O, 1080, 270, 790, 460, a, 'ε_a [%]', 'q [kPa]'); }
  if (t > B(55) && t < B(58)) L3(O, proj, W3(FRX - 0.03, CYW, FRZ), 'HORDÓSODÁS', win(t, B(55.6), B(58), 0.25, 0.3), { dx: 150, dy: -250, color: COL.UU });
  if (t > B(82.5) && t < B(84.2)) L3(O, proj, W3(FRX - 0.02, CYW + 0.01, FRZ + 0.02), 'NYÍRÁSI SÍK', win(t, B(83.1), B(84.1), 0.2, 0.2), { dx: 160, dy: -250, color: COL.CU });
  if (t > B(102) && t < B(104)) L3(O, proj, W3(FRX - 0.03, CYW, FRZ), 'HORDÓSODÁS', win(t, B(102.4), B(104), 0.25, 0.3), { dx: 150, dy: -250, color: COL.CD });
  if (t > B(58) && t < B(66.2)) { const a = win(t, B(58), B(66), 0.35, 0.35), k = (b) => smooth(seg(t, B(b), B(b + 0.8)));
    const cs = UU.map((s, i) => ({ s3: s.s3, s1: s.s3 + s.qf, color: COL.UU, k: k(58.4 + i * 0.9), label: 'σ_3 = ' + s.s3, lk: k(58.8 + i * 0.9), dots: true }));
    const mx = t < B(62) ? 1080 : 1080; mohr(O, mx, 250, 790, 470, a, { smax: 460, tmax: 200, sstep: 100, xl: 'σ [kPa]' }, cs, [{ tau: SOIL.cu, color: C.white, k: k(60.9), label: 'c_u ≈ 55 kPa · φ_u = 0', lk: k(61.3), ls: 30, ldx: 0, size: 28 }]);
    if (t > B(62)) { const sa = win(t, B(62.6), B(66), 0.35, 0.3); O.fade(0); springModel(O, 120, 250, 760, 470, sa, { load: smooth(seg(t, B(62.8), B(63.6))), valve: 0, comp: 0, u: 0.15 + 0.7 * smooth(seg(t, B(63), B(63.8))), t }, { color: COL.UU }); } }
  // ---- CU
  if (t > B(66) && t < B(69)) { const a = (b) => win(t, B(b), B(69), 0.3, 0.3); L3(O, proj, W3(FRX + 0.02, CYW + 0.02, FRZ + 0.02), 'OLDALSÓ DRÉN', a(66.8), { dx: 190, dy: -80, color: COL.CU });
    L3(O, proj, W3(FRX + 0.024, CYW - 0.053, FRZ + 0.005), 'VIZES SZŰRŐKŐ', a(67.3), { dx: 190, dy: 60, color: C.water }); }
  if (t > B(69) && t < B(74.2)) { const a = win(t, B(69.3), B(74), 0.3, 0.3); const sat = S ? S.sat : 0;
    micro(O, 1270, 470, 170, a, { air: 1 - sat }); bGauge(O, 1470, 330, 400, TL.bNow(t), a * smooth(seg(t, B(70, 2.5), B(70, 3.5))));
  }
  if (t > B(74) && t < B(79.2)) { const a = win(t, B(74.3), B(79), 0.3, 0.3), tm = TL.conReal(t);
    const pts = Array.from({ length: 121 }, (_, i) => { const tt = 150 * i / 120; return [Math.sqrt(tt), 3.1 * TL.Ucon(tt)]; });
    const ch = xyChart(O, 1080, 270, 790, 460, a, { xmax: 12.5, ymax: 3.6, xticks: [0, 2, 4, 6, 8, 10, 12], yticks: [0, 1, 2, 3], title: null, xlabel: '', ylabel: '' }, [{ pts, upto: clamp(tm / 150), color: COL.CU, width: 4 }],
      [{ x: Math.sqrt(TL.T100), y: 3.1, text: 't_{100} = 60 perc', color: C.white, a: smooth(seg(t, B(77, 2), B(78))), vline: true }]);
    if (ch) { const k = smooth(seg(t, B(76, 2), B(77, 2))); g.save(); g.globalAlpha = a * k; g.strokeStyle = 'rgba(255,255,255,0.7)'; g.setLineDash([8, 6]); g.lineWidth = 2; g.beginPath(); g.moveTo(ch.sx(0), ch.sy(0)); g.lineTo(ch.sx(Math.sqrt(TL.T100) * 1.05), ch.sy(3.1 * 1.05)); g.moveTo(ch.sx(0), ch.sy(3.1)); g.lineTo(ch.sx(12.5), ch.sy(3.1)); g.stroke(); g.restore(); }
    axisLab(O, 1080, 270, 790, 460, a, '√t [√perc]', 'ΔV [%]');
  }
  if (t > B(79) && t < B(84.2)) { const a = win(t, B(79.3), B(84), 0.35, 0.3); const e = S ? S.ea : 0;
    xyChart(O, 1080, 270, 790, 230, a, { xmax: 16, ymax: 180, xticks: [0, 5, 10, 15], yticks: [0, 80, 160], title: 'q', xlabel: '', ylabel: '' }, [{ pts: fq.CU[1], upto: clamp(e / 15), color: COL.CU, width: 4 }]);
    xyChart(O, 1080, 510, 790, 230, a, { xmax: 16, ymax: 140, xticks: [0, 5, 10, 15], yticks: [0, 60, 120], title: 'Δu', xlabel: '', ylabel: '' }, [{ pts: fu[1], upto: clamp(e / 15), color: C.water, width: 4 }]);
    axisLab(O, 1080, 510, 790, 230, a, 'ε_a [%]', ''); }
  if (t > B(84) && t < B(92.2)) { const a = win(t, B(84), B(92), 0.35, 0.35), k = (b) => smooth(seg(t, B(b), B(b + 0.8))), sh = (i) => smooth(seg(t, B(85.2 + i * 0.5), B(86.4 + i * 0.5)));
    const cs = []; CU.forEach((s, i) => { const d = s.du * sh(i); cs.push({ s3: s.s3, s1: s.s3 + s.qf, color: 'rgba(255,255,255,0.6)', dash: [8, 7], w: 2.5, k: k(84.4 + i * 0.25), alpha: 1 - 0.4 * sh(i) });
      cs.push({ s3: s.s3 - d, s1: s.s3 + s.qf - d, color: COL.CU, k: sh(i) > 0.001 ? 1 : 0, w: 3.5, label: i === 2 && t < B(88) ? '← Δu' : null, lk: sh(2), lsize: 26 }); });
    mohr(O, 1080, 250, 790, 470, a, { smax: 540, tmax: 240, sstep: 100 }, cs, [{ c: SOIL.c, phi: SOIL.phi, color: C.white, k: k(88.6), label: 'c′ = 5 kPa · φ′ = 27°', lk: k(89.2), ls: 330, ldx: -10, size: 28 }]);
    // feszültségút (p′–q) kis ablakban
    if (t > B(89.5)) { const sa = win(t, B(89.6), B(92), 0.3, 0.3); const ESP = CU.map(s => curve(e => TL.qCU(e, s.qf), 15, 60).map(([e, q], j) => [s.s3 + q / 3 - TL.uCU(e, s.du), q]));
      xyChart(O, 120, 260, 640, 400, sa, { xmax: 360, ymax: 240, xticks: [0, 100, 200, 300], yticks: [0, 100, 200], title: null, xlabel: '', ylabel: '' }, ESP.map(p => ({ pts: p, upto: smooth(seg(t, B(89.8), B(91))), color: COL.CU, width: 3.5 })));
      axisLab(O, 120, 260, 640, 400, sa, 'p′ [kPa]', 'q [kPa]'); } }
  // ---- CD
  if (t > B(92) && t < B(95)) { g.save(); g.globalAlpha = win(t, B(92.3), B(95), 0.3, 0.3); O.font(40, 800, FH); g.fillStyle = COL.CD; g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillText('GYORSÍTVA ›››', 1850, 214); g.restore(); }
  if (t > B(95) && t < B(104.2)) { const a = win(t, B(98.2), B(104), 0.35, 0.3); const e = S ? S.ea : 0;
    xyChart(O, 1080, 270, 790, 230, a, { xmax: 16, ymax: 400, xticks: [0, 5, 10, 15], yticks: [0, 150, 300], title: 'q', xlabel: '', ylabel: '' }, [{ pts: fq.CD[1], upto: clamp(e / 15), color: COL.CD, width: 4 }]);
    xyChart(O, 1080, 510, 790, 230, a, { xmax: 16, ymax: 5, xticks: [0, 5, 10, 15], yticks: [0, 2, 4], title: 'ε_{vol}', xlabel: '', ylabel: '' }, [{ pts: fv[1], upto: clamp(e / 15), color: C.water, width: 4 }]);
    axisLab(O, 1080, 510, 790, 230, a, 'ε_a [%]', '');
    if (t > B(95.5) && t < B(98.6)) springModel(O, 600, 250, 760, 470, win(t, B(95.8), B(98.4), 0.3, 0.3), { load: 1, valve: 1, comp: smooth(seg(t, B(96.2), B(98.2))), u: 0.08, drip: 1, t }, { color: COL.CD, labels: false }); }
  if (t > B(104) && t < B(112.2)) { const a = win(t, B(104), B(112), 0.35, 0.35), k = (b) => smooth(seg(t, B(b), B(b + 0.8)));
    const cs = [...CU.map(s => ({ s3: s.s3e, s1: s.s3e + s.qf, color: COL.CU, w: 2.5, k: k(104.3), alpha: 0.55 })), ...CD.map((s, i) => ({ s3: s.s3, s1: s.s3 + s.qf, color: COL.CD, k: k(104.6 + i * 0.6), w: 3.5, dots: true }))];
    mohr(O, 1080, 250, 790, 470, a, { smax: 860, tmax: 380, sstep: 200 }, cs, [{ c: SOIL.c, phi: SOIL.phi, color: C.white, k: k(106.4), label: 'c′ = 5 kPa · φ′ = 27°', lk: k(107), ls: 520, ldx: -10, size: 28 }]);
  }
  // ---- melyiket mikor?
  if (t > B(112) && t < B(122.2)) { O.fade(0.4 * win(t, B(112), B(122), 0.3, 0.3)); lanes(O, 360, 220, 1200, win(t, B(112.2), B(116), 0.3, 0.3), t, B(112.6), B(3));
    const a = win(t, B(116), B(122), 0.35, 0.35);
    fcard(O, 140, 260, 800, a, seg(t, B(116), B(116.6)), [{ s: 'c_u  ·  φ_u = 0', size: 46, color: COL.UU }, { s: 'rövid távú, drénezetlen', size: 32 }, { s: 'pl. töltés építése közben', size: 30, color: C.dim }], 'UU', { color: COL.UU });
    fcard(O, 980, 260, 800, a, seg(t, B(117), B(117.6)), [{ s: 'c′  ·  φ′', size: 46, color: COL.CD }, { s: 'hosszú távú, drénezett', size: 32 }, { s: 'pl. rézsű évek múlva', size: 30, color: C.dim }], 'CU · CD', { color: COL.CD }); }
  // ---- összegzés
  if (t > B(122) && t < B(126.2)) O.list(120, 200, 860, ['UU: c_u, gyors', 'CU: c′, φ′ + Δu mérés', 'CD: c′, φ′, lassú', 'Legalább 3 próbatest'], [B(122, 1), B(122, 3), B(123, 1), B(123, 3)], t, win(t, B(122), B(126), 0.2, 0.4), { title: 'Összegzés', color: C.accent, mark: '›', size: 34 });
  if (t > B(126)) { const a = win(t, B(126), TOTAL + 1, 0.05, 0.1);
    O.fade(0.45 * a, '#000'); O.slam('TRIAXIÁLIS', t - B(126), a, { y: 450, size: 170, sub: 'egy minta, három út' });
    O.bigLine('Talajmechanikai laborok · 9 / 9', t - B(127), win(t, B(127), TOTAL + 1, 0.4, 0.1), 700, 44, C.dim);
    O.fade(smooth(seg(t, TOTAL - 1.2, TOTAL)), '#000'); }
  runCaptions(O, t, CAPS);
  if (Math.abs(t - B(4)) < 0.2 && t >= B(4)) O.flash((1 - (t - B(4)) / 0.2) * 0.7);
  if (S && S.fail > 0 && (S.ph === 'open' || S.ph === 'CU') ) { const tp = S.ph === 'open' ? B(2) : B(83, 2); if (t >= tp && t < tp + 0.25 && shot.lab) O.flash((1 - (t - tp) / 0.25) * 0.35); }
  O.vignette(0.38);
  O.progress(t, TOTAL, CHAPTERS, 0.85);
  O.grainPass(t, 0.035);
}
// tengelyfeliratok indexes jelöléssel (az xyChart sima szöveget ír)
function axisLab(O, x, y, w, h, a, xl, yl) {
  if (a <= 0) return; const g = O.g; g.save(); g.globalAlpha = a; O.font(20, 700, FH); g.fillStyle = 'rgba(255,255,255,0.85)'; g.textBaseline = 'alphabetic';
  if (xl) { g.textAlign = 'right'; O.rt(xl, x + w - 30, y + h - 14); }
  if (yl) { g.textAlign = 'left'; O.rt(yl, x + 86, y + 92); }
  g.restore();
}
