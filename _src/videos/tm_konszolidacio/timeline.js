// Konszolidációs vizsgálat – ödométer, egy terhelési lépcső (100 → 200 kPa) idő–összenyomódás görbéje; Taylor (√t) és Casagrande (log t)
// EN ISO 17892-5; Kis Talajmechanika (2026) 7. fejezet; T₉₀ = 0,848, T₅₀ = 0,197; k = c_v·γ_w / E_oed
import { clamp, smooth, seg } from '../../kit/util.js';
import { mkTime } from '../tm_lab/ui.js';
export const T = mkTime(110, 48); export const { BPM, BEAT, BAR, tb, TOTAL } = T;
export const CHAPTERS = [[0, 'Intro'], [tb(8), 'Lépcső'], [tb(12), 'Leolvasás'], [tb(20), 'Taylor'], [tb(28), 'Casagrande'], [tb(35), 'k'], [tb(40), 'Összegzés']];
export const COL = { acc: '#B48CFF', tay: '#3FE0C5', cas: '#F2C14E', w: '#5CC2F2' };
export const HDR = 9.65, CV = 0.6, SI = 0.02, SP = 0.50, EOED = 4000;            // mm, mm²/perc, mm, mm, kPa
export const Tv = (tm) => CV * tm / (HDR * HDR);
export function U(T) { if (T < 0.2) return Math.sqrt(4 * T / Math.PI); let u = 1; for (let m = 0; m < 6; m++) { const M = Math.PI / 2 * (2 * m + 1); u -= 2 / (M * M) * Math.exp(-M * M * T); } return u; }
export const T90 = 0.848 * HDR * HDR / CV, T50 = 0.197 * HDR * HDR / CV;          // perc
export const sOf = (tm) => SI * Math.min(1, tm / 0.05) + SP * U(Tv(tm)) + (tm > 3 * T90 ? 0.012 * Math.log10(tm / (3 * T90)) : 0);
export const READ = [0.1, 0.25, 0.5, 1, 2, 4, 8, 15, 30, 60, 120, 240, 480, 1440];
export const clockMin = (t) => t < tb(12) ? (t < tb(10) ? 0 : 0.1 * smooth(seg(t, tb(10), tb(12)))) : 0.1 * Math.pow(14400, clamp(seg(t, tb(12), tb(20))));   // 0,1 → 1440 perc (log)
export const fmtMin = (m) => m < 1 ? Math.round(m * 60) + ' s' : m < 60 ? Math.round(m) + ' perc' : m < 1440 ? (m / 60).toFixed(m < 600 ? 1 : 0).replace('.', ',') + ' óra' : '24 óra';
export function audioEvents(cuts) {
  const sfx = [{ t: tb(9), type: 'latch', g: 0.5 }, { t: tb(10), type: 'databeep', g: 0.6 }];
  READ.forEach(m => sfx.push({ t: tb(12) + (tb(20) - tb(12)) * Math.log(m / 0.1) / Math.log(14400), type: 'blip', g: 0.28 }));
  return { bpm: BPM, total: TOTAL, sfx, cuts, slams: [{ t: tb(4), kind: 'title' }, ...[8, 12, 20, 28, 35, 40].map(b => ({ t: tb(b), kind: 'word' })), { t: tb(44), kind: 'end' }], steps: [] };
}
