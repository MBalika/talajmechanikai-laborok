// Szemeloszlási vizsgálat – EN ISO 17892-4 (szitálás + hidrometrálás), a Kis Talajmechanika (2026) szerinti hazai szitasorral
import { clamp, smooth, seg } from '../../kit/util.js';
import { mkTime } from '../tm_lab/ui.js';
export const T = mkTime(110, 64); export const { BPM, BEAT, BAR, tb, TOTAL } = T;
export const CHAPTERS = [[0, 'Intro'], [tb(8), 'Előkészítés'], [tb(19), 'Szitálás'], [tb(37), 'Hidrometrálás'], [tb(51), 'Görbe'], [tb(56), 'Összegzés']];
export const COL = { sieve: '#F2C14E', hyd: '#5CC2F2', acc: '#B48CFF' };
// mintapélda: iszapos homok, m_0 = 500 g
export const M0 = 500;
export const SIEVES = [8, 4, 2, 1, 0.5, 0.25, 0.125, 0.063];
export const RET = [0, 15, 25, 35, 55, 80, 90, 60];                         // fennmaradt tömeg [g]
export const PASS = SIEVES.map((d, i) => +(100 * (M0 - RET.slice(0, i + 1).reduce((s, v) => s + v, 0)) / M0).toFixed(1));   // 100, 97, 92, 85, 74, 58, 40, 28
export const HYD = [[0.5, 0.062, 27], [1, 0.044, 25], [2, 0.031, 23], [5, 0.020, 20], [15, 0.0115, 16.5], [45, 0.0067, 13], [120, 0.0041, 10.5], [300, 0.0026, 9], [1440, 0.0012, 7]]; // [perc, d mm, S %]
export const RES = { d10: 0.0036, d30: 0.071, d60: 0.27, Cu: 76, Cc: 5.1, clay: 8, silt: 20, sand: 64, gravel: 8 };
// mozgások
export const ovenK = (t) => (t >= tb(8) && t < tb(11)) ? 1 : 0;
export const bowlOutK = (t) => smooth(seg(t, tb(8, 3), tb(10, 1)));
export const bowlScaleK = (t) => smooth(seg(t, tb(11), tb(11, 3)));
export const washK = (t) => seg(t, tb(13, 2), tb(16, 3));
export const pourK = (t) => smooth(seg(t, tb(19, 2), tb(21)));
export const tiltK = (t) => smooth(seg(t, tb(20), tb(20, 2))) * (1 - smooth(seg(t, tb(21, 2), tb(22))));
export const shakeOn = (t) => t >= tb(23, 2) && t < tb(26, 3);
export const lidK = (t) => smooth(seg(t, tb(22), tb(22, 3)));
export const weighI = (t) => clamp((t - tb(27)) / (tb(33) - tb(27)) * 8, 0, 8);   // hány szita mérése zajlott le (27–33)
export const cylShakeK = (t) => seg(t, tb(38, 2), tb(40, 2));
export const hydInK = (t) => smooth(seg(t, tb(41), tb(41, 3)));
export const hydClock = (t) => { const u = clamp(seg(t, tb(42), tb(47)), 0, 1); return 0.5 * Math.pow(2880, u); };   // 0,5 perc → 24 óra (log-időben)
export const fmtClock = (m) => m < 60 ? (m < 1 ? '30 s' : Math.round(m) + ' perc') : (m < 1440 ? (m / 60).toFixed(m < 600 ? 1 : 0).replace('.', ',') + ' óra' : '24 óra');
export function audioEvents(cuts) {
  const sfx = [];
  sfx.push({ t: tb(8, 2), type: 'latch', g: 0.5 }, { t: tb(10, 3), type: 'latch', g: 0.4 }, { t: tb(11, 3), type: 'databeep', g: 0.5 });
  sfx.push({ t: tb(13, 2), type: 'hum', dur: tb(3.2), g: 0.12, f: 140 });
  sfx.push({ t: tb(22, 3), type: 'latch', g: 0.5 }, { t: tb(23, 2), type: 'hum', dur: tb(3.25), g: 0.28, f: 48 });
  for (let k = 0; k < 8; k++) sfx.push({ t: tb(27) + (tb(33) - tb(27)) * (k + 0.6) / 8, type: 'databeep', g: 0.35 });
  sfx.push({ t: tb(41, 3), type: 'latch', g: 0.3 });
  for (let k = 0; k < 9; k++) sfx.push({ t: tb(42) + (tb(47) - tb(42)) * Math.log(HYD[k][0] / 0.5) / Math.log(2880), type: 'blip', g: 0.3 });
  return { bpm: BPM, total: TOTAL, sfx, cuts, slams: [{ t: tb(4), kind: 'title' }, ...[8, 19, 37, 51].map(b => ({ t: tb(b), kind: 'word' })), { t: tb(60), kind: 'end' }], steps: [] };
}
