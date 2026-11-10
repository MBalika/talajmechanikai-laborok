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
export const CH = { open: 0, title: 4, prep: 8, mount: 20, app: 36, names: 44, UU: 48, CU: 66, CD: 92, cmp: 112, sum: 122, end: 126 };
export const CHAPTERS = [[0, 'Intro'], [tb(8), 'Próbatest'], [tb(20), 'Beépítés'], [tb(36), 'Készülék'], [tb(48), 'UU'], [tb(66), 'CU'], [tb(92), 'CD'], [tb(112), 'Melyiket?'], [tb(122), 'Összegzés']];
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

// ---------- 1. próbatest (labor): a lezárt mintacső kibontása, kinyomás, faragás, mérés ----------
export const DS = 3.75;
export const capOffK = (t) => smooth(seg(t, tb(9), tb(10)));            // a cső végéről a kupak (paraffinnal) lekerül
export const extrudeK = (t) => smooth(seg(t, tb(10, 3), tb(13, 1)));    // a minta kitolása a csőből (a behatolás irányában)
export const pumpA = (t) => (t >= tb(10, 3) && t < tb(13, 1)) ? 0.5 + 0.5 * Math.sin((t - tb(10, 3)) / BEAT * Math.PI) : 0;
const LA0 = tb(13, 3), LA1 = tb(16, 3);
export const trimK = (t) => smooth(seg(t, LA0, LA1));                    // Ø 72,6 → Ø 50 mm
export const latheA = (t) => (Math.floor(seg(t, LA0, LA1) * 8) + smooth(((seg(t, LA0, LA1) * 8) % 1 - 0.55) / 0.45)) * Math.PI / 4;
export const knifeY = (t) => { const u = (seg(t, LA0, LA1) * 8) % 1; return u < 0.55 ? 1 - smooth(u / 0.55) : smooth((u - 0.55) / 0.45); }; // 1 fent, 0 lent
export const SCALE0 = 17.5;                                               // mérleg, víztartalom (17,5–20)
// ---------- 2. beépítés lépésenként (20–38) ----------
// tálcáról a talpra: szűrőkő + papír (20–21), minta két kézzel (21,5–22,5), felső papír + kő + fejlemez (23–24)
export const carry = (t, b0, b1) => smooth(seg(t, tb(b0), tb(b1)));
export const stoneK = (t) => carry(t, 20.25, 21);
export const specK = (t) => carry(t, 21.5, 22.5);
export const topK = (t) => carry(t, 23, 23.75);
export const MOUNT = { stone: tb(21), paper: tb(21), spec: tb(22, 2), cap: tb(23, 3), memb: tb(24, 1), oring: tb(26, 2) };
export const membK = (t) => smooth(seg(t, MOUNT.memb, tb(25, 3)));      // a membránfeszítő leereszkedik, a vákuum elenged
export const oringK = (t) => smooth(seg(t, MOUNT.oring, tb(27, 3)));    // két-két O-gyűrű legördítve
export const strUpK = (t) => smooth(seg(t, tb(27, 3), tb(28, 1)));      // a feszítő lekerül
export const drainK = (t) => smooth(seg(t, tb(28, 2), tb(29, 2)));      // a fejlemez dréncsöve bekötve
export const cellK = (t) => smooth(seg(t, tb(30, 1), tb(31, 3)));       // az akrilhenger leereszkedik
export const nutK = (t) => smooth(seg(t, tb(31, 3), tb(32, 3)));        // a húzórudak anyái
export const fillK = (t) => smooth(seg(t, tb(33), tb(35)));             // feltöltés alulról, légtelenítő nyitva
export const ventK = (t) => smooth(seg(t, tb(35, 1), tb(35, 3)));       // a légtelenítő elzárva
export const appK = (t) => smooth(seg(t, tb(36, 2), tb(37, 2)));        // a tárcsa emel: a rúd felfekszik az erőmérőre

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
  // labor: kupak, kitoló pumpa, eszterga, mérleg, beépítés kattanásai, feltöltés
  sfx.push({ t: tb(9, 2), type: 'latch', g: 0.4 }, { t: tb(10, 3), type: 'pump', dur: tb(2.5), g: 0.25 }, { t: tb(10, 2.7), type: 'blip', g: 0.4 });
  for (let k = 0; k < 8; k++) sfx.push({ t: LA0 + (LA1 - LA0) * (k + 0.55) / 8, type: 'latch', g: 0.25 });
  sfx.push({ t: tb(18), type: 'databeep', g: 0.5 }, { t: tb(19), type: 'databeep', g: 0.5 });
  sfx.push({ t: tb(21), type: 'latch', g: 0.3 }, { t: tb(22, 2), type: 'latch', g: 0.3 }, { t: tb(23, 3), type: 'latch', g: 0.3 });
  for (let k = 0; k < 4; k++) sfx.push({ t: MOUNT.oring + BEAT * (0.7 + k * 0.75), type: 'latch', g: 0.4 });
  sfx.push({ t: tb(31, 3), type: 'latch', g: 0.6 }, { t: tb(32, 1), type: 'latch', g: 0.4 }, { t: tb(33), type: 'hum', dur: tb(2), g: 0.2, f: 60 }, { t: tb(35, 2), type: 'latch', g: 0.5 });
  sfx.push({ t: tb(36, 2), type: 'hydraulic', dur: tb(1), g: 0.25 });
  // vizsgálatok: szivattyú/motor zümmögés a nyírás alatt, B-próbák csipogása
  sfx.push({ t: tb(48, 1), type: 'hydraulic', dur: tb(1), g: 0.25 }, { t: tb(51), type: 'hum', dur: tb(6), g: 0.22, f: 55 }, { t: tb(55), type: 'impact', g: 0.6 });
  for (const [b, bt] of BTESTS) sfx.push({ t: tb(b, bt), type: 'databeep', g: 0.6 });
  sfx.push({ t: tb(79, 2), type: 'hum', dur: tb(4.5), g: 0.2, f: 55 }, { t: tb(84), type: 'impact', g: 0.5 });
  sfx.push({ t: tb(95, 2), type: 'hum', dur: tb(7.5), g: 0.2, f: 55 });
  return { bpm: BPM, total: TOTAL, sfx, cuts,
    slams: [{ t: tb(4), kind: 'title' }, ...[8, 20, 36, 44, 48, 66, 92, 112, 122].map(b => ({ t: tb(b), kind: 'word' })), { t: tb(126), kind: 'end' }],
    steps: [] };
}
