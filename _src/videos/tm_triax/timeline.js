// Triaxiális vizsgálat (UU · CU · CD) – EN ISO 17892-8 (UU), EN ISO 17892-9 (CU, CD); ASTM D2850, D4767, D7181; BS 1377-8; Head: Manual of Soil Laboratory Testing.
// 2. változat (2026-11-11): lépésről lépésre – készülék, próbatest (kinyomás, levágás, esztergálás, mérés), beépítés, indítás, UU, CU, CD, kiszerelés, kiértékelés.
// Mintapélda (telített, közepesen plasztikus, normálisan konszolidált agyag): c_u ≈ 55 kPa; c′ = 5 kPa, φ′ = 27°.
import { clamp, lerp, smooth, seg } from '../../kit/util.js';
import { mkTime } from '../tm_lab/ui.js';
export const T = mkTime(110, 136); export const { BPM, BEAT, BAR, tb, TOTAL } = T;
const inW = (t, b0, b1) => t >= tb(b0) && t < tb(b1);
export const CHAPTERS = [[0, 'Intro'], [tb(8), 'Készülék'], [tb(20), 'Próbatest'], [tb(42), 'Beépítés'], [tb(64), 'Indítás'], [tb(72), 'UU'], [tb(86), 'CU'], [tb(106), 'CD'], [tb(116), 'Kiszerelés'], [tb(122), 'Kiértékelés']];
export const COL = { UU: '#FF8A4C', CU: '#3FE0C5', CD: '#F2C14E', water: '#5CC2F2', acc: '#B48CFF' };

// ---------- talaj (mintapélda) ----------
export const SOIL = { cu: 55, c: 5, phi: 27, w: 28.4, rho: 1.95, D: 50, H: 100, m: 382.9 };
const PHI = SOIL.phi * Math.PI / 180, KP = Math.tan(Math.PI / 4 + PHI / 2) ** 2, SKP = Math.sqrt(KP);
export const ENV = (s) => SOIL.c + s * Math.tan(PHI);
export const UU = [{ s3: 100, qf: 108 }, { s3: 200, qf: 112 }, { s3: 300, qf: 110 }];
export const CU = [100, 200, 300].map(s3c => { const Af = 0.85, q = (s3c * (KP - 1) + 2 * SOIL.c * SKP) / (1 - Af + Af * KP); return { s3: s3c, qf: q, du: Af * q, s3e: s3c - Af * q }; });
export const CD = [100, 200, 300].map(s3 => ({ s3, qf: s3 * (KP - 1) + 2 * SOIL.c * SKP, ev: 3.2 + s3 / 150 }));
export const qUU = (e, qf) => qf * Math.tanh(e / 2.2) * (1 - 0.035 * Math.max(0, e - 9) / 6);
export const qCU = (e, qf) => qf * Math.tanh(e / 2.6) * (1 + 0.02 * Math.min(1, e / 15));
export const uCU = (e, du) => du * Math.pow(Math.tanh(e / 2.0), 0.85);
export const qCD = (e, qf) => qf * Math.tanh(e / 4.6);
export const evCD = (e, ev) => ev * Math.tanh(e / 5.5);
export const EF = { UU: 9, CU: 12, CD: 15 };

// ---------- 2. próbatest: kinyomás, levágás, esztergálás ----------
export const EXT = { cap: [20.6, 21.9], push: [22.9, 25.0], cut: [26.3, 26.9] };      // kupak le; kinyomás (zöld gomb); a fűrész áthalad
export const EXT_D = 0.137;                                                           // ennyit tol ki a dugattyú (0,125 m-es darab + a paraffin alatti 12 mm)
export const pushK = (t) => smooth(seg(t, tb(EXT.push[0] + 0.15), tb(EXT.push[1] - 0.1)));
export const cutK = (t) => smooth(seg(t, tb(EXT.cut[0]), tb(EXT.cut[1])));          // a huzal a cső tetején (0: elöl, 1: hátul)
// eszterga: 6 húzás; minden húzás után a bal kéz 60°-kal elfordítja a tányért (a csapjánál)
export const LATHE = { place: 29.0, top: [29.25, 29.85], strokes: Array.from({ length: 6 }, (_, k) => 30.0 + k * 0.72), sd: 0.4, topOff: [34.55, 35.15] };
export const turnAt = (k) => LATHE.strokes[k] + LATHE.sd + 0.03;                      // a k. elfordítás kezdete (0,26 ütem)
export const TURN_D = 0.26;
export function latheAng(t) { let a = 0; for (let k = 0; k < 6; k++) a -= (Math.PI / 3) * smooth(seg(t, tb(turnAt(k)), tb(turnAt(k) + TURN_D))); return a; }   // a tányér szöge (−60° lépések)
export function trimR(t) { const R0 = 0.0362, R1 = 0.025; let n = 0; for (let k = 0; k < 6; k++) n += smooth(seg(t, tb(LATHE.strokes[k] + 0.05), tb(LATHE.strokes[k] + LATHE.sd))); return R0 + (R1 - R0) * n / 6; }
export const SAW2 = { pick: 35.35, start: 35.95, cut: [36.15, 36.75], back: 37.35 };  // a teteje: levágás 100 mm-nél
export const SLICE = [37.0, 37.75];                                                    // a levágott korong a tégelybe (bal kéz)
export const MASS_T = 40.0;                                                            // mérleg

// ---------- 3. beépítés ----------
export const MNT = { stoneB: [42.4, 43.15], paperB: [43.35, 43.95], spec: [44.6, 45.9], paperT: [46.5, 47.05], stoneT: [47.25, 47.85], cap: [48.05, 48.7],
  str: [49.1, 54.95], strK: [49.85, 50.6], vac: 51.25, ringB: 52.15, ringT: 53.45, drain: [55.3, 56.1], cell: [57.1, 59.3], nuts: [[59.65, 60.1], [59.7, 60.15], [60.3, 60.75]],
  valve: [61.25, 61.65], vent: [61.35, 61.75], fill: [61.7, 62.95], ventC: [63.15, 63.55] };
export const fillK = (t) => smooth(seg(t, tb(MNT.fill[0]), tb(MNT.fill[1])));
export const ventOpen = (t) => t >= tb(MNT.vent[0] + 0.2) && t < tb(MNT.ventC[0] + 0.2);
// ---------- 4. indítás ----------
export const BTN_T = [64.45, 64.8];                                                     // ▲ gomb
export const appK = (t) => smooth(seg(t, tb(64.75), tb(65.9)));                       // gyors közelítés: a rúd felfekszik az erőmérőre
// ---------- 8. kiszerelés ----------
export const DIS = { down: [115.7, 116.4], drain: [116.35, 117.0], cell: [117.15, 118.75] };

// ---------- vizsgálatok: a cella állapota ----------
// ph: 'open' | 'pre' | 'UU' | 'CU' | 'CD' | null; sc: cellanyomás, uB: ellennyomás, u: pórusvíz (kPa); ea: tengelyirányú alakváltozás (%);
// q: deviátor (kPa); ev: térfogatváltozás (%); vlv: drénszelep nyitva (1) / zárva (0); flow: >0 a mintából ki, <0 be; sat: telítettség (0..1)
export const UUB = { sc: [72.4, 73.3], shear: [74.7, 79.1] }, CUB = { sat: [89.3, 93.35], con: [93.65, 97.3], shear: [97.7, 101.4] }, CDB = { pre: [106.4, 108.4], shear: [108.7, 112.1] };
export function test(t) {
  const S = { ph: null, k: 1, sc: 0, uB: 0, u: 0, ea: 0, q: 0, ev: 0, vlv: 0, flow: 0, sat: 0, cons: 0, fail: 0 };
  if (t < tb(8)) { const e = t < tb(4) ? lerp(3, 13, smooth(seg(t, 0.2, tb(3, 2)))) : 4; return { ...S, ph: 'open', sc: 500, uB: 300, u: 300, ea: e, q: 0, fail: smooth(seg(t, tb(1, 3), tb(2, 1))), sat: 1, cons: 1, ev: 3.1 }; }
  if (t < tb(72)) { S.ph = t < tb(20) ? 'pre' : null; return S; }
  if (t < tb(86)) { // UU: σ_c = 200 kPa (2. próbatest), a szelepek végig zárva
    S.ph = 'UU'; const sc = 200 * smooth(seg(t, tb(UUB.sc[0]), tb(UUB.sc[1]))); S.sc = sc; S.u = sc; S.vlv = 0;
    const e = 15 * seg(t, tb(UUB.shear[0]), tb(UUB.shear[1])); S.ea = e; S.q = qUU(e, UU[1].qf); S.fail = smooth(seg(t, tb(77.4), tb(78.2)));
    return S;
  }
  if (t < tb(106)) { // CU (2. próbatest: σ′_c = 200 kPa)
    S.ph = 'CU'; const c = CU[1];
    const sk = seg(t, tb(CUB.sat[0]), tb(CUB.sat[1])); const st = Math.min(3, Math.floor(sk * 4)), sf = smooth((sk * 4 - st) / 0.35);
    const uB = sk <= 0 ? 0 : Math.min(300, (st + sf) * 100);
    S.uB = uB; S.sc = uB + 10; S.u = uB; S.vlv = sk > 0 ? 1 : 0; S.flow = sk > 0 && sk < 1 ? -0.6 : 0; S.sat = smooth(sk);
    const bt = bTest(t); if (bt) { S.vlv = 0; S.sc += 50 * bt.k; S.u += 50 * bt.k * bt.B; S.flow = 0; }
    if (t >= tb(CUB.con[0])) { const ck = conK(t), r = smooth(seg(t, tb(CUB.con[0]), tb(CUB.con[0] + 0.5))); S.sc = 300 + 200 * r; S.u = 300 + 190 * (1 - ck) * r; S.vlv = 1; S.flow = t < tb(CUB.con[1]) ? (1 - ck) * 1.0 + 0.1 : 0; S.cons = ck; S.ev = 3.1 * ck; S.sat = 1; }
    if (t >= tb(CUB.shear[0])) { const e = 15 * seg(t, tb(CUB.shear[0]), tb(CUB.shear[1])); S.vlv = 0; S.flow = 0; S.ea = e; S.q = qCU(e, c.qf); S.u = 300 + uCU(e, c.du); S.sc = 500; S.cons = 1; S.ev = 3.1;
      S.fail = smooth(seg(t, tb(100.6), tb(101.3))); }
    return S;
  }
  // CD (2. próbatest: σ′_3 = 200 kPa); 116 után a kiszerelésig az utolsó állapot marad
  S.ph = 'CD'; const c = CD[1];
  const pre = seg(t, tb(CDB.pre[0]), tb(CDB.pre[1])); S.uB = 300 * smooth(Math.min(1, pre * 2)); S.sc = S.uB + 10 + 200 * smooth(seg(t, tb(107.4), tb(107.8))); S.u = S.uB; S.vlv = 1;
  S.flow = pre > 0 && pre < 0.5 ? -0.6 : pre >= 0.5 && pre < 1 ? 0.8 : 0; S.cons = smooth(seg(t, tb(107.4), tb(108.4))); S.ev = 3.1 * S.cons; S.sat = 1;
  if (t >= tb(CDB.shear[0])) { const e = 15 * seg(t, tb(CDB.shear[0]), tb(CDB.shear[1])); S.sc = 500; S.u = 300; S.vlv = 1; S.ea = e; S.q = qCD(e, c.qf); S.ev = 3.1 + evCD(e, c.ev); S.flow = e > 0 && e < 15 ? 0.45 : 0; S.cons = 1;
    S.fail = smooth(seg(t, tb(111.3), tb(112.1))); }
  if (t >= tb(DIS.down[0])) { const k = smooth(seg(t, tb(DIS.down[0]), tb(DIS.down[1]))); S.sc = 500 * (1 - k); S.u = 300 * (1 - k); S.uB = S.u; S.q = S.q * (1 - k); S.flow = 0; }
  return S;
}
// B-próbák a telítés lépcsői után: [ütem, ütemrész, B]
export const BTESTS = [[90, 2.6, 0.62], [91, 2.6, 0.81], [92, 2.6, 0.91], [93, 1.8, 0.97]];
export function bTest(t) {
  for (const [b, bt, B] of BTESTS) { const t0 = tb(b, bt) - BEAT * 0.9, t1 = tb(b, bt) + BEAT * 0.4; if (t >= t0 && t < t1) return { B, k: smooth(seg(t, t0, t0 + BEAT * 0.45)) * (1 - smooth(seg(t, t1 - BEAT * 0.25, t1))) }; }
  return null;
}
export function bNow(t) { let B = null; for (const [b, bt, v] of BTESTS) if (t >= tb(b, bt) - BEAT * 0.4) B = v; return B; }
// konszolidáció: t_100 = 60 perc; a látvány a CUB.con szakaszban (0…150 perc)
export const T100 = 60;
export const conReal = (t) => 150 * seg(t, tb(CUB.con[0] + 0.2), tb(CUB.con[1] - 0.2));
export function Ucon(tm) { const T = Math.PI / 4 * tm / T100; return T < 0.217 ? Math.sqrt(4 * T / Math.PI) : 1 - (8 / (Math.PI ** 2)) * Math.exp(-(Math.PI ** 2) * T / 4); }
export const conK = (t) => Ucon(conReal(t));
// valós idő (a HUD-on)
export function realClock(t) {
  if (inW(t, UUB.shear[0] - 0.4, 80.4)) return { k: 'NYÍRÁS IDEJE', v: Math.round(15 * seg(t, tb(UUB.shear[0]), tb(UUB.shear[1]))), u: 'perc', b: [UUB.shear[0] - 0.3, 80.3] };
  if (inW(t, CUB.shear[0] - 0.4, 101.6)) return { k: 'NYÍRÁS IDEJE', v: (4.3 * seg(t, tb(CUB.shear[0]), tb(CUB.shear[1]))).toFixed(1).replace('.', ','), u: 'óra', b: [CUB.shear[0] - 0.3, 101.5] };
  if (inW(t, CDB.shear[0] - 0.4, 112.3)) return { k: 'NYÍRÁS IDEJE', v: Math.round(21 * seg(t, tb(CDB.shear[0]), tb(CDB.shear[1]))), u: 'óra', b: [CDB.shear[0] - 0.3, 112.2] };
  return null;
}

// ---------- hangok ----------
export function audioEvents(cuts) {
  const sfx = [];
  sfx.push({ t: tb(21.3), type: 'latch', g: 0.35 }, { t: tb(EXT.push[0] + 0.1), type: 'blip', g: 0.4 }, { t: tb(EXT.push[0] + 0.15), type: 'hydraulic', dur: tb(EXT.push[1] - EXT.push[0] - 0.25) - tb(0), g: 0.25 });
  sfx.push({ t: tb(EXT.cut[1]), type: 'latch', g: 0.3 }, { t: tb(SAW2.cut[1]), type: 'latch', g: 0.3 });
  LATHE.strokes.forEach(b => sfx.push({ t: tb(b + LATHE.sd * 0.6), type: 'latch', g: 0.2 }));
  sfx.push({ t: tb(MASS_T), type: 'databeep', g: 0.45 });
  for (const b of [MNT.stoneB[1], MNT.spec[1], MNT.cap[1], MNT.ringB, MNT.ringB + 0.25, MNT.ringT, MNT.ringT + 0.25, MNT.cell[1]]) sfx.push({ t: tb(b), type: 'latch', g: 0.35 });
  MNT.nuts.forEach(([a, b]) => sfx.push({ t: tb(b - 0.05), type: 'latch', g: 0.3 }));
  sfx.push({ t: tb(MNT.fill[0]), type: 'hum', dur: tb(MNT.fill[1] - MNT.fill[0]) - tb(0), g: 0.18, f: 60 }, { t: tb(MNT.ventC[1] - 0.1), type: 'latch', g: 0.45 });
  sfx.push({ t: tb(BTN_T[0] + 0.2), type: 'blip', g: 0.4 }, { t: tb(64.8), type: 'hydraulic', dur: tb(1.1) - tb(0), g: 0.22 });
  sfx.push({ t: tb(UUB.sc[0]), type: 'hydraulic', dur: tb(0.9) - tb(0), g: 0.22 }, { t: tb(UUB.shear[0]), type: 'hum', dur: tb(UUB.shear[1] - UUB.shear[0]) - tb(0), g: 0.2, f: 55 }, { t: tb(77.7), type: 'impact', g: 0.5 });
  for (const [b, bt] of BTESTS) sfx.push({ t: tb(b, bt), type: 'databeep', g: 0.55 });
  sfx.push({ t: tb(CUB.shear[0]), type: 'hum', dur: tb(CUB.shear[1] - CUB.shear[0]) - tb(0), g: 0.2, f: 55 }, { t: tb(100.9), type: 'impact', g: 0.5 });
  sfx.push({ t: tb(CDB.shear[0]), type: 'hum', dur: tb(CDB.shear[1] - CDB.shear[0]) - tb(0), g: 0.2, f: 55 });
  sfx.push({ t: tb(DIS.cell[1] - 0.1), type: 'latch', g: 0.35 });
  return { bpm: BPM, total: TOTAL, sfx, cuts,
    slams: [{ t: tb(4), kind: 'title' }, ...[8, 20, 42, 64, 72, 86, 106, 116, 122].map(b => ({ t: tb(b), kind: 'word' })), { t: tb(133), kind: 'end' }], steps: [] };
}
