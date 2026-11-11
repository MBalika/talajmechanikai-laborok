// Folyási határ – EN ISO 17892-12: ejtőkúp (80 g, 30°; w_L a 20 mm-es behatolásnál) és Casagrande-csésze (w_L 25 ütésnél).
// 2. változat (2026-11-11): lépésről lépésre – eszközök, a paszta (víz, keverés, pihentetés, a csésze töltése, lehúzás), ejtőkúp-mérés
// (leengedés, nullázás, 5 s, leolvasás, ismétlés), víztartalom, további pontok, kiértékelés, Casagrande (töltés, barázda, ütések).
// Mintapélda: közepesen plasztikus agyag.
import { clamp, lerp, smooth, seg } from '../../kit/util.js';
import { mkTime } from '../tm_lab/ui.js';
export const T = mkTime(110, 112); export const { BPM, BEAT, BAR, tb, TOTAL } = T;
export const CHAPTERS = [[0, 'Intro'], [tb(8), 'Eszközök'], [tb(16), 'A paszta'], [tb(32), 'Ejtőkúp'], [tb(46), 'Víztartalom'], [tb(56), 'Több pont'], [tb(68), 'Kiértékelés'], [tb(78), 'Casagrande'], [tb(104), 'Összegzés']];
export const COL = { cone: '#3FE0C5', cas: '#F2C14E', acc: '#B48CFF' };
// ---------- adatok ----------
export const CONE = [[15.7, 41.8], [18.3, 44.6], [21.4, 47.9], [24.1, 50.7]];        // [behatolás mm, w %]
export const REP = [15.6, 15.8];
export const W1 = { mt: 18.42, mw: 33.65, md: 29.16 };                                 // tégely, nedves + tégely, száraz + tégely [g]
const lin = (P) => { const n = P.length, sx = P.reduce((s, p) => s + p[0], 0), sy = P.reduce((s, p) => s + p[1], 0), sxx = P.reduce((s, p) => s + p[0] * p[0], 0), sxy = P.reduce((s, p) => s + p[0] * p[1], 0); const b = (n * sxy - sx * sy) / (n * sxx - sx * sx); return { a: (sy - b * sx) / n, b }; };
export const FIT = lin(CONE); export const WL = FIT.a + FIT.b * 20;
export const CAS = [[34, 44.9], [27, 46.5], [21, 48.4], [16, 50.6]];                  // [ütésszám, w %]
export const FITC = lin(CAS.map(([n, w]) => [Math.log10(n), w])); export const WLC = FITC.a + FITC.b * Math.log10(25);
// ---------- ütemterv ----------
export const WB = [16.6, 18.5], MIXP = [18.8, 23.7], CURE = [23.8, 24.8], FILL = [25.0, 29.2], STRIKE = [29.3, 31.6];
export const CUPMV = [32.2, 33.5], LOWER = [33.7, 36.4], ZERO = [36.6, 37.2], REL = [37.5, 40.3], LIFT = [41.7, 43.5], REP2 = [43.8, 45.9];
export const CUPOUT = [46.2, 47.2], SAMP = [47.4, 49.6], TSCALE = [49.8, 51.0];
export const MORE = [0, 1, 2].map(k => { const b = 57.2 + k * 3.5; return { wb: [b, b + 1.1], rel: [b + 1.6, b + 3.2], pen: CONE[k + 1][0] }; });
export const CFILL = [78.4, 81.4], CLEV = [81.5, 83.0], CGRV = [83.2, 85.6], CRANK = [85.9, 91.4], NBLOW = 27;
export const SCOOPS = [[25.2, 26.5], [26.6, 27.9], [28.0, 29.2]];
// ---------- folyamatok ----------
export const HUP = 0.2, HTOUCH = 0.145;                                                   // a fej magassága (a talp fölött): felhúzva, illetve amikor a kúp csúcsa a pép felszínén
export const headY = (t) => { if (t < tb(LOWER[0] + 0.15)) return t < tb(16) ? HTOUCH : HUP; if (t < tb(LOWER[1])) return lerp(HUP, HTOUCH, smooth(seg(t, tb(LOWER[0] + 0.15), tb(LOWER[1] - 0.1))));
  if (t < tb(LIFT[0] + 0.9)) return HTOUCH; if (t < tb(LIFT[1])) return lerp(HTOUCH, HUP, smooth(seg(t, tb(LIFT[0] + 0.9), tb(LIFT[1] - 0.1)))); if (t < tb(56)) return HUP; return HTOUCH; };
const dropCurve = (u, pen) => pen * (1 - Math.exp(-u * 9)) / (1 - Math.exp(-9));
export const coneDrop = (t) => { // mm
  if (t < tb(4)) return dropCurve(clamp(seg(t, tb(1.6), tb(2.6))), REP[0]);
  if (t >= tb(REL[0] + 0.25) && t < tb(LIFT[0] + 0.5)) return dropCurve(clamp(seg(t, tb(REL[0] + 0.25), tb(REL[1]))), REP[0]);
  if (t >= tb(LIFT[0] + 0.5) && t < tb(LIFT[0] + 0.85)) return REP[0] * (1 - smooth(seg(t, tb(LIFT[0] + 0.5), tb(LIFT[0] + 0.85))));
  for (const m of MORE) if (t >= tb(m.rel[0] + 0.25) && t < tb(m.rel[1] + 0.4)) return dropCurve(clamp(seg(t, tb(m.rel[0] + 0.25), tb(m.rel[0] + 1.2))), m.pen);
  return 0; };
export const dispMM = (t) => { if (t < tb(ZERO[0] + 0.3) && t >= tb(16)) return null; if (t >= tb(REP2[0]) && t < tb(REP2[1])) return REP[1]; return coneDrop(t); };
export const blowAt = (t) => Math.min(NBLOW, Math.floor(seg(t, tb(CRANK[0] + 0.2), tb(CRANK[1] - 0.2)) * NBLOW + 1e-6));
export const crankA = (t) => seg(t, tb(CRANK[0] + 0.2), tb(CRANK[1] - 0.2)) * NBLOW * Math.PI * 2;
export const cupLift = (t) => { if (t < tb(CRANK[0] + 0.2) || t > tb(CRANK[1] - 0.2)) return 0; const a = (crankA(t) % (Math.PI * 2)) / (Math.PI * 2); return a < 0.8 ? 0.01 * Math.sin(a / 0.8 * Math.PI / 2) : 0.01 * (1 - (a - 0.8) / 0.2) ** 3; };
export const grooveClose = (t) => clamp((blowAt(t) - 14) / (NBLOW - 14));            // a barázda alja záródik (0 → 10 mm hosszon)
export function audioEvents(cuts) {
  const sfx = [];
  sfx.push({ t: tb(WB[0] + 0.9), type: 'hum', dur: tb(0.6) - tb(0), g: 0.08, f: 400 });
  for (const [a, b] of [[MIXP[0] + 0.5, MIXP[1] - 0.5]]) sfx.push({ t: tb(a), type: 'hum', dur: tb(b - a) - tb(0), g: 0.06, f: 220 });
  sfx.push({ t: tb(CUPMV[1] - 0.1), type: 'latch', g: 0.3 }, { t: tb(ZERO[0] + 0.25), type: 'blip', g: 0.4 }, { t: tb(REL[0] + 0.25), type: 'latch', g: 0.55 }, { t: tb(40.3), type: 'databeep', g: 0.5 }, { t: tb(1.6), type: 'latch', g: 0.5 });
  sfx.push({ t: tb(TSCALE[1] - 0.1), type: 'databeep', g: 0.4 });
  for (const m of MORE) sfx.push({ t: tb(m.rel[0] + 0.25), type: 'latch', g: 0.45 }, { t: tb(m.rel[0] + 1.3), type: 'databeep', g: 0.35 });
  for (let k = 0; k < NBLOW; k++) sfx.push({ t: tb(CRANK[0] + 0.2) + (tb(CRANK[1] - 0.2) - tb(CRANK[0] + 0.2)) * (k + 0.85) / NBLOW, type: 'latch', g: 0.22 });
  return { bpm: BPM, total: TOTAL, sfx, cuts, slams: [{ t: tb(4), kind: 'title' }, ...[8, 16, 32, 46, 56, 68, 78, 104].map(b => ({ t: tb(b), kind: 'word' })), { t: tb(108), kind: 'end' }], steps: [] };
}
