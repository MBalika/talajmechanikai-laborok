// Szemeloszlási vizsgálat – EN ISO 17892-4 (szitálás + hidrometrálás), hazai szitasorral (Kis Talajmechanika).
// 2. változat (2026-11-11): lépésről lépésre – készülék, előkészítés (szárítás, mérés, nedves szitálás), száraz szitálás rázógéppel,
// mérés szitánként (halmozott tömeg), hidrometrálás (diszpergálás, keverőgép, 1000 ml-es henger, keverőrúd, leolvasások), számítás, görbe.
// Mintapélda: iszapos homok, m_d = 500 g; a hidrometráláshoz a 0,063 mm alatti részből 40 g.
import { clamp, lerp, smooth, seg } from '../../kit/util.js';
import { mkTime } from '../tm_lab/ui.js';
export const T = mkTime(110, 128); export const { BPM, BEAT, BAR, tb, TOTAL } = T;
export const CHAPTERS = [[0, 'Intro'], [tb(8), 'Eszközök'], [tb(16), 'Előkészítés'], [tb(30), 'Szitálás'], [tb(48), 'Mérés'], [tb(67), 'Hidrometrálás'], [tb(101), 'Számítás'], [tb(109), 'Görbe'], [tb(120), 'Összegzés']];
export const COL = { sieve: '#F2C14E', hyd: '#5CC2F2', acc: '#B48CFF' };

// ---------- adatok ----------
export const M0 = 500;                                                      // kiszárított minta [g]
export const SIEVES = [8, 4, 2, 1, 0.5, 0.25, 0.125, 0.063];                // felülről lefelé
export const RET = [10, 15, 25, 35, 55, 80, 80, 58];                        // fennmaradt tömeg [g]
export const PAN = 1.4;                                                     // a gyűjtőtálba jutott (a mosás után) [g]
export const MW = 359.8;                                                    // a mosás után kiszárított rész [g]
export const CUM = RET.map((_, i) => RET.slice(0, i + 1).reduce((s, v) => s + v, 0));      // halmozott fennmaradt tömeg
export const PASS = SIEVES.map((_, i) => +(100 * (M0 - CUM[i]) / M0).toFixed(1));          // 98, 95, 90, 83, 72, 56, 40, 28,4
export const FINES = PASS[7];                                               // a 0,063 mm alatti rész aránya [%]
// hidrometrálás: 40 g (a 0,063 mm alatti részből), ρ_s = 2,68 g/cm³, 20 °C; leolvasás R (g/ml), d (mm), S (a teljes mintára, %)
export const MH = 40, RHOS = 2.68, TEMP = 20.4;
const HT = [[0.5, 27.0], [1, 25.4], [2, 23.6], [4, 21.5], [8, 19.2], [15, 17.0], [30, 14.6], [60, 12.3], [120, 10.2], [240, 8.5], [480, 7.0], [1440, 5.2]];
export const HYD = HT.map(([min, S]) => { const Sh = S / FINES; const Rc = 1 + Sh * MH / (RHOS / (RHOS - 1)) / 1000; const R = Rc + 0.0007;
  const Hr = 0.095 + (1.030 - R) / 0.035 * 0.075; const d = Math.sqrt(18 * 1.0e-3 * Hr / ((RHOS - 1) * 1000 * 9.81 * min * 60)) * 1000; return { min, S, R, d, Hr }; });
// a teljes görbe pontjai (d mm, S %), növekvő d szerint
export const CURVE = [...HYD.map(h => [h.d, h.S]).reverse(), ...SIEVES.map((d, i) => [d, PASS[i]]).reverse(), [16, 100]];
export const atS = (S) => { const P = CURVE; for (let i = 0; i < P.length - 1; i++) { const [d0, s0] = P[i], [d1, s1] = P[i + 1]; if (S >= s0 && S <= s1) { const k = (S - s0) / (s1 - s0); return Math.pow(10, Math.log10(d0) + k * (Math.log10(d1) - Math.log10(d0))); } } return null; };
export const atD = (d) => { const P = CURVE; const x = Math.log10(d); for (let i = 0; i < P.length - 1; i++) { const x0 = Math.log10(P[i][0]), x1 = Math.log10(P[i + 1][0]); if (x >= x0 && x <= x1) return P[i][1] + (x - x0) / (x1 - x0) * (P[i + 1][1] - P[i][1]); } return x < Math.log10(P[0][0]) ? P[0][1] : 100; };
export const RES = (() => { const d10 = atS(10), d30 = atS(30), d60 = atS(60); const clay = atD(0.002), silt = FINES - clay, sand = PASS[2] - FINES, grav = 100 - PASS[2];
  return { d10, d30, d60, Cu: d60 / d10, Cc: d30 * d30 / (d10 * d60), clay, silt, sand, grav }; })();

// ---------- ütemterv (ütemben) ----------
export const OV = { take: [16.75, 19.95] };
export const MASS_T = 20.1;
export const WS = { carry: [21.6, 22.55], pour: [22.65, 23.75], down: [23.85, 24.45], tapOn: [24.55, 25.05], wash: [25.15, 28.35], tapOff: [28.45, 28.95] };
export const SS = { bowl: [30.3, 31.0], pour: [31.0, 32.25], bowlDn: [32.25, 32.95], pair: [33.35, 34.45], lid: [34.6, 35.55], stack: [35.8, 37.6], clamp: [37.85, 38.85], tight: [38.95, 40.15], start: [40.4, 40.9], shake: [41.0, 47.0] };
export const WG = { loose: [48.2, 49.2], up: [49.25, 50.0], stack: [50.3, 51.8], lid: [51.95, 52.7], first: 52.9, fast0: 56.8, fastD: 1.0 };
// mérési ciklus (i: 0 = 8 mm … 7 = 0,063 mm, 8 = gyűjtőtál): [felvétel, átvitel vége, billentés vége, (kefe), vissza, letétel]
export function cyc(i) { if (i === 0) { const b = WG.first; return { a: b, carry: b + 0.65, tilt: b + 1.15, brush: [b + 1.3, b + 2.5], level: b + 2.85, set: b + 3.5, end: b + 3.65 }; }
  const b = WG.fast0 + (i - 1) * WG.fastD; return { a: b, carry: b + 0.3, tilt: b + 0.5, brush: null, level: b + 0.68, set: b + 0.88, end: b + 0.96 }; }
export const CHECK = [WG.fast0 + 8 * WG.fastD + 0.1, 67];
export const HY = { disp: [67.6, 69.2], soak: [69.3, 70.4], beak: [70.7, 72.1], btn: [72.35, 72.75], mix: [72.75, 74.2], cup: [74.4, 76.7], water: [76.95, 78.6], plg: [79.0, 80.2], strokes: [80.2, 82.0], plgOut: [82.0, 82.85], go: [83.0, 83.35],
  hin: [83.6, 84.95], read: [85.0, 89.0], hout: [89.1, 90.3], lapse: [90.6, 97.0], therm: [93.2, 95.6], end: [97.0, 101] };
// ---------- folyamatok ----------
export const doorA = (t) => (t >= tb(16) && t < tb(29)) ? -1.57 : 0;   // a 2. fejezetben az ajtó nyitva (a laboráns már kinyitotta), a szárítás alatt zárva
export const washK = (t) => seg(t, tb(WS.wash[0]), tb(WS.wash[1]));
export const tapK = (t) => smooth(seg(t, tb(WS.tapOn[0] + 0.1), tb(WS.tapOn[1] - 0.05))) * (1 - smooth(seg(t, tb(WS.tapOff[0] + 0.1), tb(WS.tapOff[1] - 0.05))));
export const shakeOn = (t) => (t >= tb(SS.shake[0]) && t < tb(SS.shake[1])) || t < tb(4);
export const shakeSec = (t) => t < tb(SS.start[0]) ? 600 : t < tb(SS.shake[0]) ? 600 : 600 * (1 - clamp(seg(t, tb(SS.shake[0]), tb(SS.shake[1] - 0.3))));
// hidrometrálás: eltelt idő (perc) a stopper indulásától; a valós időt a leolvasások közt log-skálán gyorsítjuk
export const hydMin = (t) => { if (t < tb(HY.go[1])) return 0; if (t < tb(HY.read[0])) return 0.5 * seg(t, tb(HY.go[1]), tb(HY.read[0]));
  if (t < tb(HY.read[1])) { const u = seg(t, tb(HY.read[0]), tb(HY.read[1])); return 0.5 * Math.pow(8, u); }        // 0,5 → 4 perc
  if (t < tb(HY.lapse[0])) return 4 + 1.5 * seg(t, tb(HY.read[1]), tb(HY.lapse[0]));
  const u = seg(t, tb(HY.lapse[0]), tb(HY.lapse[1])); return 5.5 * Math.pow(1440 / 5.5, u); };
export const fmtMin = (m) => m < 1 ? Math.round(m * 60) + ' s' : m < 60 ? (m < 10 ? m.toFixed(1).replace('.', ',') : Math.round(m)) + ' perc' : m < 1440 ? (m / 60).toFixed(m < 600 ? 1 : 0).replace('.', ',') + ' óra' : '24 óra';
export const READS = [[85.6, 0], [86.6, 1], [87.6, 2], [88.6, 3]];          // [ütem, HYD index] – az első négy leolvasás (hidrométer a hengerben)
export const LAPSE = [[91.6, 4], [92.4, 5], [93.0, 6], [93.6, 7], [94.2, 8], [94.8, 9], [95.4, 10], [96.4, 11]];
// a szuszpenzió állapota (0: frissen kevert … 1: 24 óra)
export const settleK = (t) => t < tb(HY.go[1]) ? 0 : clamp(Math.log(1 + hydMin(t)) / Math.log(1441));

export function audioEvents(cuts) {
  const sfx = [];
  sfx.push({ t: tb(OV.take[0] + 0.3), type: 'latch', g: 0.3 }, { t: tb(MASS_T), type: 'databeep', g: 0.45 });
  sfx.push({ t: tb(WS.tapOn[1]), type: 'hum', dur: tb(WS.tapOff[1] - WS.tapOn[1]) - tb(0), g: 0.12, f: 140 });
  sfx.push({ t: tb(SS.pair[1]), type: 'latch', g: 0.3 }, { t: tb(SS.lid[1]), type: 'latch', g: 0.3 }, { t: tb(SS.stack[1]), type: 'latch', g: 0.35 }, { t: tb(SS.tight[1]), type: 'latch', g: 0.35 });
  sfx.push({ t: tb(SS.start[0] + 0.2), type: 'blip', g: 0.45 }, { t: tb(SS.shake[0]), type: 'hum', dur: tb(SS.shake[1] - SS.shake[0]) - tb(0), g: 0.26, f: 48 }, { t: 0.05, type: 'hum', dur: tb(3.9), g: 0.2, f: 48 });
  for (let i = 0; i < 9; i++) sfx.push({ t: tb(cyc(i).tilt + 0.1), type: 'databeep', g: 0.3 });
  sfx.push({ t: tb(HY.btn[0] + 0.2), type: 'blip', g: 0.4 }, { t: tb(HY.mix[0]), type: 'hum', dur: tb(HY.mix[1] - HY.mix[0]) - tb(0), g: 0.18, f: 190 }, { t: tb(HY.go[0] + 0.15), type: 'blip', g: 0.5 });
  for (const [b] of [...READS, ...LAPSE]) sfx.push({ t: tb(b), type: 'blip', g: 0.3 });
  return { bpm: BPM, total: TOTAL, sfx, cuts, slams: [{ t: tb(4), kind: 'title' }, ...[8, 16, 30, 48, 67, 101, 109, 120].map(b => ({ t: tb(b), kind: 'word' })), { t: tb(124), kind: 'end' }], steps: [] };
}
