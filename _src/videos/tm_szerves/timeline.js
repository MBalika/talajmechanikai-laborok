// Szervesanyag-tartalom – izzítási veszteség 550 °C-on, EN 17685-1:2023 (földművek, kémiai vizsgálatok); osztályozás: EN ISO 14688-2
import { clamp, smooth, seg } from '../../kit/util.js';
import { mkTime } from '../tm_lab/ui.js';
export const T = mkTime(110, 44); export const { BPM, BEAT, BAR, tb, TOTAL } = T;
export const CHAPTERS = [[0, 'Intro'], [tb(8), 'Előkészítés'], [tb(17), 'Izzítás'], [tb(26), 'Számítás'], [tb(31), 'Értelmezés']];
export const COL = { acc: '#B48CFF', hot: '#FF8A4C', ok: '#3FE0C5' };
export const MC = 32.415, M1 = 42.415, M2 = 41.535, LOI = 100 * (M1 - M2) / (M1 - MC), LOI2 = 9.0, LOIm = (LOI + 9.0) / 2;
export const grindK = (t) => seg(t, tb(8, 2), tb(10, 3));
export const tongK1 = (t) => smooth(seg(t, tb(11, 2), tb(13)));      // kályhából (előizzítás) az exszikkátorba
export const fillK = (t) => smooth(seg(t, tb(14, 2), tb(16)));
export const tongK2 = (t) => smooth(seg(t, tb(17), tb(18, 2)));      // a mérlegről a kemencébe
export const doorK = (t) => (t >= tb(11) && t < tb(13, 2)) || (t >= tb(17) && t < tb(18, 3)) || (t >= tb(23) && t < tb(24, 2)) || t < tb(4) ? 1 : 0;
export const burnK = (t) => t < tb(4) ? 0.7 : smooth(seg(t, tb(19), tb(22, 3)));
export const tongK3 = (t) => smooth(seg(t, tb(23), tb(24, 2)));      // a kemencéből az exszikkátorba
export const furnT = (t) => t < tb(4) ? 550 : t < tb(19) ? (t >= tb(11) && t < tb(14) ? 550 : 25) : Math.round(25 + 525 * smooth(seg(t, tb(19), tb(20)))) ;
export function audioEvents(cuts) {
  const sfx = [{ t: tb(8, 2), type: 'hum', dur: tb(2.2), g: 0.12, f: 120 }, { t: tb(13), type: 'latch', g: 0.4 }, { t: tb(14), type: 'databeep', g: 0.4 }, { t: tb(16), type: 'databeep', g: 0.4 }, { t: tb(18, 3), type: 'latch', g: 0.5 },
    { t: tb(19), type: 'hum', dur: tb(4), g: 0.2, f: 50 }, { t: tb(24, 2), type: 'latch', g: 0.4 }, { t: tb(25, 2), type: 'databeep', g: 0.5 }];
  return { bpm: BPM, total: TOTAL, sfx, cuts, slams: [{ t: tb(4), kind: 'title' }, ...[8, 17, 26, 31].map(b => ({ t: tb(b), kind: 'word' })), { t: tb(40), kind: 'end' }], steps: [] };
}
