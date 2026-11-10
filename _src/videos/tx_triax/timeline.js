// Triaxiális vizsgálat (UU · CU · CD) – idővonal (110 BPM; hangmintás zene: indiepop → funk → brassy, fejezetenként)
// Szabványok: EN ISO 17892-8 (UU), EN ISO 17892-9 (CU, CD), EN ISO 22475-1 (mintavétel); ASTM D2850, D4767, D7181; BS 1377-8.
// Mintapélda (egy telített, közepesen plasztikus agyag): c_u ≈ 55 kPa; c′ = 5 kPa, φ′ = 27°.
import { clamp, lerp, ease, easeOut, easeIn, smooth, seg } from '../../kit/util.js';
export const BPM = 110, BEAT = 60 / BPM, BAR = 4 * BEAT;
export const tb = (bar, beat = 0) => (bar * 4 + beat) * BEAT;
export const END_BAR = 130;
export const TOTAL = tb(END_BAR) + 2.0;
const inW = (t, b0, b1) => t >= tb(b0) && t < tb(b1);

// ---------- fejezetek ----------
export const CH = { open: 0, title: 4, samp: 8, prep: 22, app: 36, names: 44, UU: 48, CU: 66, CD: 92, cmp: 112, sum: 122, end: 126 };
export const CHAPTERS = [[0, 'Intro'], [tb(8), 'Mintavétel'], [tb(22), 'Próbatest'], [tb(36), 'Készülék'], [tb(48), 'UU'], [tb(66), 'CU'], [tb(92), 'CD'], [tb(112), 'Melyiket?'], [tb(122), 'Összegzés']];
export const COL = { UU: '#FF8A4C', CU: '#3FE0C5', CD: '#F2C14E', water: '#5CC2F2', acc: '#B48CFF' };

// ---------- talaj (mintapélda) ----------
export const SOIL = { cu: 55, c: 5, phi: 27, w: 28.4, rho: 1.95, D: 50, H: 100 };
const PHI = SOIL.phi * Math.PI / 180, KP = Math.tan(Math.PI / 4 + PHI / 2) ** 2, SKP = Math.sqrt(KP);
export const ENV = (s) => SOIL.c + s * Math.tan(PHI);            // τ = c′ + σ′·tg φ′
// UU: σ_c = 100 / 200 / 300 kPa, q_f ≈ 2·c_u (kis szórással)
export const UU = [{ s3: 100, qf: 108 }, { s3: 200, qf: 112 }, { s3: 300, qf: 110 }];
// CU (CIU, normálisan konszolidált): σ′_c = 100 / 200 / 300 kPa, A_f ≈ 0,85
export const CU = [100, 200, 300].map(s3c => { const Af = 0.85, q = (s3c * (KP - 1) + 2 * SOIL.c * SKP) / (1 - Af + Af * KP); return { s3: s3c, qf: q, du: Af * q, s3e: s3c - Af * q }; });
// CD (CID): σ′_3 = 100 / 200 / 300 kPa
export const CD = [100, 200, 300].map(s3 => ({ s3, qf: s3 * (KP - 1) + 2 * SOIL.c * SKP, ev: 3.2 + s3 / 150 }));
// görbék (ε_a %-ban)
export const qUU = (e, qf) => qf * Math.tanh(e / 2.2) * (1 - 0.035 * Math.max(0, e - 9) / 6);
export const qCU = (e, qf) => qf * Math.tanh(e / 2.6) * (1 + 0.02 * Math.min(1, e / 15));
export const uCU = (e, du) => du * Math.pow(Math.tanh(e / 2.0), 0.85);
export const qCD = (e, qf) => qf * Math.tanh(e / 4.6);
export const evCD = (e, ev) => ev * Math.tanh(e / 5.5);               // térfogatcsökkenés (összenyomódás) %
export const EF = { UU: 9, CU: 12, CD: 15 };                          // a törés alakváltozása (UU: csúcs; CU, CD: q_max ≈ a görbe vége)

// ---------- 1. mintavétel (terep) ----------
// üreges csőspirál a 3,75 m-es mintavételi mélységig (agyagban); a központi dugó már kint; vékonyfalú cső (Ø 76 mm) benyomva 0,8 m-re
export const DS = 3.75, SEG = 1.5, TUBE = 0.9, PUSH = 0.8;
// a mintavevő alja (világ-y): leengedés → statikus benyomás → kiemelés
export function sampler(t) {
  if (t < tb(11)) return { y: 1.65, core: 0, on: inW(t, 8, 11) };
  if (t < tb(12, 2)) return { y: lerp(1.65, -DS, smooth(seg(t, tb(11), tb(12, 2)))), core: 0, on: true };
  if (t < tb(14, 2)) { const u = smooth(seg(t, tb(12, 3), tb(14, 1))); return { y: -DS - PUSH * u, core: PUSH * u, on: true, push: u > 0 && u < 1 }; }
  if (t < tb(15)) return { y: -DS - PUSH, core: PUSH, on: true };
  if (t < tb(16, 2)) return { y: lerp(-DS - PUSH, 1.65, smooth(seg(t, tb(15), tb(16, 2)))), core: PUSH, on: true };
  return { y: 1.65, core: PUSH, on: t < tb(18) };
}
export const fieldOn = (t) => t < tb(18);
export const crateOn = (t) => inW(t, 18, 22);
export const waxK = (t) => smooth(seg(t, tb(18, 1), tb(19, 1)));     // paraffin + kupak a végeken

// ---------- 2. próbatest ----------
export const extrudeK = (t) => smooth(seg(t, tb(22, 2), tb(24, 3)));   // a minta kitolása a csőből
export const pumpA = (t) => (t >= tb(22, 2) && t < tb(24, 3)) ? 0.5 + 0.5 * Math.sin((t - tb(22, 2)) / BEAT * Math.PI) : 0;
export const trimK = (t) => smooth(seg(t, tb(25, 2), tb(28, 2)));      // Ø 72,6 → Ø 50 mm
export const latheA = (t) => (Math.floor(seg(t, tb(25, 2), tb(28, 2)) * 8) + smooth(((seg(t, tb(25, 2), tb(28, 2)) * 8) % 1 - 0.55) / 0.45)) * Math.PI / 4;
export const knifeY = (t) => { const u = (seg(t, tb(25, 2), tb(28, 2)) * 8) % 1; return u < 0.55 ? 1 - smooth(u / 0.55) : smooth((u - 0.55) / 0.45); }; // 1 fent, 0 lent
// beépítés
export const MOUNT = { stone: tb(32, 0), paper: tb(32, 1), spec: tb(32, 2), cap: tb(33, 1), memb: tb(33, 3), oring: tb(35, 0) };
export const membK = (t) => smooth(seg(t, MOUNT.memb, tb(34, 3)));      // a membránfeszítő leereszkedik
export const oringK = (t) => smooth(seg(t, MOUNT.oring, tb(35, 3)));
export const cellK = (t) => smooth(seg(t, tb(36, 1), tb(37, 3)));      // az akrilhenger leereszkedik
export const fillK = (t) => smooth(seg(t, tb(38), tb(39, 3)));         // a cella feltöltése vízzel

// ---------- 3. vizsgálatok: a cella állapota ----------
// fázis: 'UU' | 'CU' | 'CD' | null; k: minta sorszáma (0..2); sc: cellanyomás, uB: ellennyomás, u: pórusvíz,
// ea: tengelyirányú alakváltozás (%), q: deviátor (kPa), ev: térfogatváltozás (%), vlv: drénszelep nyitva (1) / zárva (0),
// flow: >0 a mintából ki, <0 be (vízáramlás a drénben), sat: telítettség-látvány (0..1)
export function test(t) {
  const S = { ph: null, k: 1, sc: 0, uB: 0, u: 0, ea: 0, q: 0, ev: 0, vlv: 0, flow: 0, sat: 0, cons: 0, fail: 0, fast: 1 };
  if (t < tb(40)) { S.sc = 0; return S; }
  if (t < tb(48)) { S.sc = 0; S.ph = 'pre'; return S; }
  if (t < tb(66)) { // UU: σ_c = 200 kPa (2. minta), szelepek végig zárva
    S.ph = 'UU'; const sc = 200 * smooth(seg(t, tb(48, 1), tb(49, 2))); S.sc = sc; S.u = sc; S.vlv = 0;
    const e = 15 * seg(t, tb(51), tb(57)); S.ea = e; S.q = qUU(e, UU[1].qf); S.fail = smooth(seg(t, tb(54, 2), tb(55, 2)));
    if (t >= tb(58)) { S.ea = 15; S.q = qUU(15, UU[1].qf); S.fail = 1; }
    return S;
  }
  if (t < tb(92)) { // CU (2. minta: σ′_c = 200 kPa)
    S.ph = 'CU'; const c = CU[1];
    // telítés: ellennyomás lépcsőkben 0 → 300 kPa, a cellanyomás 10 kPa-lal fölötte; B-ellenőrzések
    const sk = seg(t, tb(69, 2), tb(73, 2)); const st = Math.min(3, Math.floor(sk * 4)), sf = smooth((sk * 4 - st) / 0.35);
    const uB = sk <= 0 ? 0 : Math.min(300, (st + sf) * 100);
    S.uB = uB; S.sc = uB + 10; S.u = uB; S.vlv = 1; S.flow = sk > 0 && sk < 1 ? -0.6 : 0; S.sat = smooth(sk);
    // B-próba (zárt szelep, +50 kPa cellanyomás) minden lépcső után
    const bt = bTest(t); if (bt) { S.vlv = 0; S.sc += 50 * bt.k; S.u += 50 * bt.k * bt.B; S.flow = 0; }
    if (t >= tb(74)) { // konszolidáció: σ_c = 300 + 200, nyitott szelep, a víz kiáramlik
      const ck = conK(t); S.sc = 300 + 200 * smooth(seg(t, tb(74), tb(74, 2))); S.u = 300 + 190 * (1 - ck) * smooth(seg(t, tb(74), tb(74, 2))); S.vlv = 1; S.flow = t < tb(79) ? (1 - ck) * 1.0 + 0.1 : 0; S.cons = ck; S.ev = 3.1 * ck; S.sat = 1;
    }
    if (t >= tb(79)) { // nyírás: zárt szelep, Δu mérve
      const e = 15 * seg(t, tb(79, 2), tb(84)); S.vlv = 0; S.flow = 0; S.ea = e; S.q = qCU(e, c.qf); S.u = 300 + uCU(e, c.du); S.sc = 500; S.cons = 1; S.ev = 3.1;
      S.fail = smooth(seg(t, tb(83), tb(84))); if (t >= tb(84)) { S.ea = 15; S.q = qCU(15, c.qf); S.u = 300 + uCU(15, c.du); S.fail = 1; }
    }
    return S;
  }
  if (t < tb(112)) { // CD (2. minta: σ′_3 = 200 kPa)
    S.ph = 'CD'; const c = CD[1];
    const pre = seg(t, tb(92, 1), tb(95)); S.uB = 300 * smooth(Math.min(1, pre * 2)); S.sc = S.uB + 10 + 200 * smooth(seg(t, tb(93, 3), tb(94, 1))); S.u = S.uB; S.vlv = 1;
    S.flow = pre > 0 && pre < 0.5 ? -0.6 : pre >= 0.55 && pre < 1 ? 0.8 : 0; S.cons = smooth(seg(t, tb(93, 3), tb(95))); S.ev = 3.1 * S.cons; S.sat = 1;
    if (t >= tb(95)) { const e = 15 * seg(t, tb(95, 2), tb(103)); S.sc = 500; S.u = 300; S.vlv = 1; S.ea = e; S.q = qCD(e, c.qf); S.ev = 3.1 + evCD(e, c.ev); S.flow = e > 0 && e < 15 ? 0.45 : 0; S.cons = 1;
      S.fail = smooth(seg(t, tb(102), tb(103))); if (t >= tb(103)) { S.ea = 15; S.q = qCD(15, c.qf); S.ev = 3.1 + evCD(15, c.ev); S.fail = 1; S.flow = 0; } }
    return S;
  }
  return S;
}
// B-próbák a telítés lépcsői után: [ütem, B]
export const BTESTS = [[70, 3, 0.62], [71, 3, 0.81], [72, 3, 0.91], [73, 2.5, 0.97]];
export function bTest(t) {
  for (const [b, bt, B] of BTESTS) { const t0 = tb(b, bt) - BEAT * 0.9, t1 = tb(b, bt) + BEAT * 0.4; if (t >= t0 && t < t1) return { B, k: smooth(seg(t, t0, t0 + BEAT * 0.45)) * (1 - smooth(seg(t, t1 - BEAT * 0.25, t1))) }; }
  return null;
}
export function bNow(t) { let B = null; for (const [b, bt, v] of BTESTS) if (t >= tb(b, bt) - BEAT * 0.4) B = v; return B; }
// konszolidáció: a √t szerinti lefutás (t_100 = 60 perc), a látvány 74–79 ütem közt
export const T100 = 60;
export const conReal = (t) => 150 * seg(t, tb(74, 1), tb(78, 2));     // valós idő, perc (0…150)
export function Ucon(tm) { const T = Math.PI / 4 * tm / T100; return T < 0.217 ? Math.sqrt(4 * T / Math.PI) : 1 - (8 / (Math.PI ** 2)) * Math.exp(-(Math.PI ** 2) * T / 4); }   // a √t-egyenes a végértéket t_100-nál metszi
export const conK = (t) => Ucon(conReal(t));
// valós idő (a HUD-on): UU nyírás ~15 perc; CU nyírás ~4,3 óra; CD nyírás ~20 óra
export function realClock(t) {
  if (inW(t, 51, 58)) return { k: 'NYÍRÁS IDEJE', v: Math.round(15 * seg(t, tb(51), tb(57))), u: 'perc' };
  if (inW(t, 79, 85)) return { k: 'NYÍRÁS IDEJE', v: (4.3 * seg(t, tb(79, 2), tb(84))).toFixed(1).replace('.', ','), u: 'óra' };
  if (inW(t, 95, 104)) return { k: 'NYÍRÁS IDEJE', v: Math.round(21 * seg(t, tb(95, 2), tb(103))), u: 'óra' };
  return null;
}

// ---------- hangok ----------
export function audioEvents(cuts) {
  const sfx = [];
  // terep: fúrógép alapjárat, hidraulikus benyomás, kiemelés
  sfx.push({ t: tb(8), type: 'engine', dur: tb(10) - tb(8) + tb(0, 2), g: 0.3, f: 36 });
  sfx.push({ t: tb(11), type: 'hydraulic', dur: tb(1.5), g: 0.3 }, { t: tb(12, 3), type: 'hydraulic', dur: tb(1.6), g: 0.45 }, { t: tb(15), type: 'hydraulic', dur: tb(1), g: 0.35 });
  sfx.push({ t: tb(18, 1), type: 'latch', g: 0.5 }, { t: tb(19, 1), type: 'latch', g: 0.5 });
  // labor: kitoló pumpa, eszterga, kattanások
  sfx.push({ t: tb(22, 2), type: 'pump', dur: tb(2.25), g: 0.25 }, { t: tb(22, 1.7), type: 'blip', g: 0.4 });
  for (let k = 0; k < 8; k++) sfx.push({ t: tb(25, 2) + (tb(28, 2) - tb(25, 2)) * (k + 0.55) / 8, type: 'latch', g: 0.25 });
  sfx.push({ t: tb(30), type: 'databeep', g: 0.5 }, { t: tb(31), type: 'databeep', g: 0.5 });
  sfx.push({ t: MOUNT.oring + BEAT * 0.6, type: 'latch', g: 0.4 }, { t: MOUNT.oring + BEAT * 1.6, type: 'latch', g: 0.4 }, { t: tb(37, 3), type: 'latch', g: 0.6 });
  sfx.push({ t: tb(38), type: 'hum', dur: tb(2), g: 0.2, f: 60 });
  // vizsgálatok: szivattyú/motor zümmögés a nyírás alatt, B-próbák csipogása
  sfx.push({ t: tb(48, 1), type: 'hydraulic', dur: tb(1), g: 0.25 }, { t: tb(51), type: 'hum', dur: tb(6), g: 0.22, f: 55 }, { t: tb(55), type: 'impact', g: 0.6 });
  for (const [b, bt] of BTESTS) sfx.push({ t: tb(b, bt), type: 'databeep', g: 0.6 });
  sfx.push({ t: tb(79, 2), type: 'hum', dur: tb(4.5), g: 0.2, f: 55 }, { t: tb(84), type: 'impact', g: 0.5 });
  sfx.push({ t: tb(95, 2), type: 'hum', dur: tb(7.5), g: 0.2, f: 55 });
  return { bpm: BPM, total: TOTAL, sfx, cuts,
    slams: [{ t: tb(4), kind: 'title' }, ...[8, 22, 36, 44, 48, 66, 92, 112, 122].map(b => ({ t: tb(b), kind: 'word' })), { t: tb(126), kind: 'end' }],
    steps: [] };
}
