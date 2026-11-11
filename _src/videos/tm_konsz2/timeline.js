// Konszolidációs vizsgálat – EN ISO 17892-5: egy terhelési lépcső (100 → 200 kPa) idő–összenyomódás görbéje az ödométerben (kétirányú szűrés);
// a lépcső: kar megtámasztása a karemelővel → 100 kPa-os tárcsa az akasztóra → a kar ütés nélküli ráengedése és az időmérő egyidejű indítása →
// leolvasások 6 s … 24 óra. Kiértékelés: Taylor (√t, t_90) és Casagrande (log t, t_50), c_v, másodlagos összenyomódás, k = c_v · γ_w / E_oed.
import { clamp, smooth, seg } from '../../kit/util.js';
import { mkTime } from '../tm_lab/ui.js';
export const T = mkTime(110, 92); export const { BPM, BEAT, BAR, tb, TOTAL } = T;
export const CHAPTERS = [[0, 'Intro'], [tb(8), 'Készülék'], [tb(14), 'Kiindulás'], [tb(23), 'Terhelés'], [tb(32), 'Leolvasás'], [tb(42), 'Mi történik?'], [tb(50), 'Taylor'], [tb(62), 'Casagrande'], [tb(74), 'k'], [tb(84), 'Összegzés']];
export const COL = { acc: '#B48CFF', tay: '#3FE0C5', cas: '#F2C14E', w: '#5CC2F2' };
export const HDR = 9.65, CV = 0.6, SI = 0.02, SP = 0.50, EOED = 4000, R0 = 1.462;     // mm, mm²/perc, mm, mm, kPa, a mérőóra a lépcső elején (mm)
export const Tv = (tm) => CV * tm / (HDR * HDR);
export function U(T) { if (T < 0.2) return Math.sqrt(4 * T / Math.PI); let u = 1; for (let m = 0; m < 6; m++) { const M = Math.PI / 2 * (2 * m + 1); u -= 2 / (M * M) * Math.exp(-M * M * T); } return u; }
export const T90 = 0.848 * HDR * HDR / CV, T50 = 0.197 * HDR * HDR / CV;          // perc
export const sOf = (tm) => tm <= 0 ? 0 : SI * Math.min(1, tm / 0.05) + SP * U(Tv(tm)) + (tm > 3 * T90 ? 0.012 * Math.log10(tm / (3 * T90)) : 0);
export const READ = [0.1, 0.25, 0.5, 1, 2, 4, 8, 15, 30, 60, 120, 240, 480, 1440];
// ---------- ütemterv ----------
export const JUP = [23.6, 24.2], DISC = [24.8, 26.8], JDN = [27.3, 27.9], TPRESS = [27.55, 27.95], RUN = [28.0, 40.0];
// az eltelt idő (perc): a futás alatt logaritmikus gyorsítás 0,1 → 1440 perc; a hideg nyitásban is
export const clockMin = (t) => { if (t < tb(4)) return 0.1 * Math.pow(14400, clamp(seg(t, tb(0.3), tb(3.6)))); if (t < tb(RUN[0])) return 0; if (t < tb(RUN[0] + 0.25)) return 0.1 * smooth(seg(t, tb(RUN[0]), tb(RUN[0] + 0.25)));
  return 0.1 * Math.pow(14400, clamp(seg(t, tb(RUN[0] + 0.25), tb(RUN[1])))); };
export const sAt = (t) => t < tb(4) ? sOf(clockMin(t)) : t < tb(RUN[0]) ? 0 : sOf(clockMin(t));
export const fmtMin = (m) => m < 1 ? Math.round(m * 60) + ' s' : m < 60 ? Math.round(m) + ' perc' : m < 1440 ? (m / 60).toFixed(m < 600 ? 1 : 0).replace('.', ',') + ' óra' : '24 óra';
export const readAt = (m) => READ.filter(x => x <= m * 1.0001).length;
export function audioEvents(cuts) {
  const sfx = [{ t: tb(DISC[1] - 0.15), type: 'latch', g: 0.45 }, { t: tb(JDN[1]), type: 'latch', g: 0.4 }, { t: tb(TPRESS[1] - 0.05), type: 'databeep', g: 0.55 }];
  READ.forEach(m => sfx.push({ t: tb(RUN[0] + 0.25) + (tb(RUN[1]) - tb(RUN[0] + 0.25)) * Math.log(m / 0.1) / Math.log(14400), type: 'blip', g: 0.25 }));
  return { bpm: BPM, total: TOTAL, sfx, cuts, slams: [{ t: tb(4), kind: 'title' }, ...[8, 14, 23, 32, 42, 50, 62, 74, 84].map(b => ({ t: tb(b), kind: 'word' })), { t: tb(88), kind: 'end' }], steps: [] };
}
