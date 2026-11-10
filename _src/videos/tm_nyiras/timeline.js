// Közvetlen nyíróvizsgálat – EN ISO 17892-10, nyíródoboz 60 × 60 × 20 mm; Kis Talajmechanika (2026) 8. fejezet
import { clamp, smooth, seg } from '../../kit/util.js';
import { mkTime } from '../tm_lab/ui.js';
export const T = mkTime(110, 50); export const { BPM, BEAT, BAR, tb, TOTAL } = T;
export const CHAPTERS = [[0, 'Intro'], [tb(8), 'Beépítés'], [tb(15), 'Terhelés'], [tb(20), 'Nyírás'], [tb(32), 'Coulomb'], [tb(38), 'Nyírási sík'], [tb(42), 'Összegzés']];
export const COL = { acc: '#B48CFF', s1: '#3FE0C5', s2: '#F2C14E', s3: '#FF8A4C' };
export const C0 = 8, PHI = 28, TANP = Math.tan(PHI * Math.PI / 180);
export const SIG = [100, 200, 300], TF = SIG.map(s => C0 + s * TANP);
const shape = (d) => (1 - Math.exp(-d / 0.9)) * (1 - 0.14 * smooth(clamp((d - 3) / 5)));
const PK = (() => { let m = 0; for (let d = 0; d <= 10; d += 0.01) m = Math.max(m, shape(d)); return m; })();
export const tauOf = (d, i) => TF[i] * shape(d) / PK;
export const vOf = (d) => -0.08 * Math.min(d, 1) + 0.05 * Math.max(0, d - 1);       // függőleges elmozdulás (mm), + = emelkedik
export const dNow = (t) => 10 * seg(t, tb(20, 2), tb(27, 2));                         // vízszintes elmozdulás (mm)
export const pinK = (t) => smooth(seg(t, tb(18, 1), tb(19)));
export function audioEvents(cuts) {
  const sfx = [{ t: tb(8, 2), type: 'hum', dur: tb(1.5), g: 0.1, f: 80 }, { t: tb(10), type: 'databeep', g: 0.5 }, { t: tb(13), type: 'latch', g: 0.4 }, { t: tb(16), type: 'latch', g: 0.5 }, { t: tb(18, 2), type: 'latch', g: 0.4 }, { t: tb(18, 3), type: 'latch', g: 0.4 },
    { t: tb(20, 2), type: 'hum', dur: tb(7), g: 0.22, f: 52 }, { t: tb(39), type: 'latch', g: 0.4 }];
  return { bpm: BPM, total: TOTAL, sfx, cuts, slams: [{ t: tb(4), kind: 'title' }, ...[8, 15, 20, 32, 38, 42].map(b => ({ t: tb(b), kind: 'word' })), { t: tb(46), kind: 'end' }], steps: [] };
}
