// Zsugorodási határ és lineáris zsugorodás – a Kis Talajmechanika (2026) eljárása (Ø 25 × 25 mm-es henger, I_C ≈ 0,7, kétlépcsős szárítás)
import { clamp, smooth, seg } from '../../kit/util.js';
import { mkTime } from '../tm_lab/ui.js';
export const T = mkTime(110, 44); export const { BPM, BEAT, BAR, tb, TOTAL } = T;
export const CHAPTERS = [[0, 'Intro'], [tb(8), 'Próbatest'], [tb(19), 'Szárítás'], [tb(26), 'Mérés'], [tb(29), 'Kiértékelés']];
export const COL = { acc: '#B48CFF', red: '#FF5A4C', ok: '#3FE0C5', vol: '#F2C14E' };
export const D0 = 25.0, H0 = 25.0, DD = 22.9, HD = 22.9, M = 24.30, MD = 18.66, RHOS = 2.70;
export const V0 = Math.PI * (D0 / 10) ** 2 / 4 * (H0 / 10), VD = Math.PI * (DD / 10) ** 2 / 4 * (HD / 10), VS = MD / RHOS;      // cm³
export const BETA = (V0 - VD) / VD, EPS = 100 * (1 - Math.pow(1 / (1 + BETA), 1 / 3)), WS = 100 * (VD - VS) / MD, W0 = 100 * (M - MD) / MD;
// zsugorodás az időben (0 → 1): szobahőn a nagyobb rész, a kályhában a maradék
export const shrinkK = (t) => t < tb(8) ? 1 : 0.8 * smooth(seg(t, tb(19, 2), tb(22, 3))) + 0.2 * smooth(seg(t, tb(23, 2), tb(25, 2)));
export const ringK = (t) => smooth(seg(t, tb(11, 2), tb(13)));
export const caliK = (t) => smooth(seg(t, tb(16, 2), tb(17, 2)));
export const caliK2 = (t) => smooth(seg(t, tb(26, 2), tb(27, 2)));
export function audioEvents(cuts) {
  const sfx = [{ t: tb(11, 2), type: 'hum', dur: tb(1.5), g: 0.1, f: 80 }, { t: tb(14, 2), type: 'databeep', g: 0.5 }, { t: tb(17, 2), type: 'latch', g: 0.4 }, { t: tb(23), type: 'latch', g: 0.5 }, { t: tb(27, 2), type: 'latch', g: 0.4 }, { t: tb(28), type: 'databeep', g: 0.5 }];
  return { bpm: BPM, total: TOTAL, sfx, cuts, slams: [{ t: tb(4), kind: 'title' }, ...[8, 19, 26, 29].map(b => ({ t: tb(b), kind: 'word' })), { t: tb(41), kind: 'end' }], steps: [] };
}
