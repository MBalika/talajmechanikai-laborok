// Folyási határ – EN ISO 17892-12 (ejtőkúp 80 g / 30°, 20 mm; Casagrande-csésze, 25 ütés) – Kis Talajmechanika (2026)
import { clamp, smooth, seg } from '../../kit/util.js';
import { mkTime } from '../tm_lab/ui.js';
export const T = mkTime(110, 52); export const { BPM, BEAT, BAR, tb, TOTAL } = T;
export const CHAPTERS = [[0, 'Intro'], [tb(8), 'Előkészítés'], [tb(15), 'Ejtőkúp'], [tb(32), 'Kiértékelés'], [tb(37), 'Casagrande'], [tb(45), 'Eredmény']];
export const COL = { cone: '#3FE0C5', cas: '#F2C14E', acc: '#B48CFF' };
// mintapélda: közepes agyag
export const CONE = [[15.6, 41.8], [18.3, 44.6], [21.4, 47.9], [24.1, 50.7]];          // [behatolás mm, w %]
export const WL = 46.9;
export const CAS = [[34, 44.9], [27, 46.5], [21, 48.4], [16, 50.6]];                  // [ütésszám, w %]
export const WL_CAS = 47.2;
export const REP = [15.4, 15.8, 15.6];
// mozgások
export const mixK = (t) => seg(t, tb(8, 2), tb(11, 3));
export const fillK = (t) => smooth(seg(t, tb(12, 2), tb(14, 2)));
export const lowerK = (t) => smooth(seg(t, tb(15, 2), tb(17, 2)));      // a kúp a felszínig
export const dropK = (t) => smooth(seg(t, tb(19, 1), tb(19, 2)));       // elengedés: behatolás
export const repI = (t) => clamp(Math.floor(seg(t, tb(22), tb(25)) * 3), 0, 2);
export const crankA = (t) => seg(t, tb(39), tb(43)) * 27 * Math.PI * 2;  // 27 ütés
export const blows = (t) => Math.min(27, Math.floor(seg(t, tb(39), tb(43)) * 27 + 0.0001));
export function audioEvents(cuts) {
  const sfx = [];
  sfx.push({ t: tb(15, 2), type: 'hum', dur: tb(2), g: 0.12, f: 90 }, { t: tb(19, 1), type: 'latch', g: 0.6 }, { t: tb(19, 3), type: 'databeep', g: 0.5 });
  for (let k = 0; k < 3; k++) sfx.push({ t: tb(22) + (tb(25) - tb(22)) * (k + 0.4) / 3, type: 'latch', g: 0.35 });
  sfx.push({ t: tb(26), type: 'databeep', g: 0.4 }, { t: tb(31), type: 'databeep', g: 0.4 });
  for (let k = 0; k < 27; k++) sfx.push({ t: tb(39) + (tb(43) - tb(39)) * (k + 0.5) / 27, type: 'latch', g: 0.22 });
  return { bpm: BPM, total: TOTAL, sfx, cuts, slams: [{ t: tb(4), kind: 'title' }, ...[8, 15, 32, 37, 45].map(b => ({ t: tb(b), kind: 'word' })), { t: tb(48), kind: 'end' }], steps: [] };
}
