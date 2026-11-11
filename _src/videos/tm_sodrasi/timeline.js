// Sodrási (plasztikus) határ – EN ISO 17892-12, a Kis Talajmechanika (2026) szerint: 3 mm-es szál, morzsolódás
import { clamp, smooth, seg } from '../../kit/util.js';
import { mkTime } from '../tm_lab/ui.js';
export const T = mkTime(110, 44); export const { BPM, BEAT, BAR, tb, TOTAL } = T;
export const CHAPTERS = [[0, 'Intro'], [tb(8), 'Sodrás'], [tb(22), 'Víztartalom'], [tb(28), 'Indexek']];
export const COL = { acc: '#B48CFF', ip: '#3FE0C5', ic: '#F2C14E' };
export const WL = 46.9, WP = 24.6, W = 30.2, IP = 22.3, IC = 0.75;
// a szál: átmérő (mm) és hossz (m) az időben – két sodrás: 11–16,5 (nem reped), 17,5–20 (3 mm-nél morzsolódik)
export function thread(t) {
  const r1 = smooth(seg(t, tb(11), tb(15, 3))), r2 = smooth(seg(t, tb(17, 2), tb(19, 2)));
  if (t < tb(11)) return { ball: 1, d: 0, L: 0 };
  if (t < tb(15, 3)) return { ball: 0, d: 9 - 6 * r1, L: 0.03 + 0.09 * r1, roll: true };
  if (t < tb(16, 3)) return { ball: 0, d: 3, L: 0.12 };                       // 3 mm-nél még ép: megmutatjuk
  if (t < tb(17, 2)) { const k = smooth(seg(t, tb(16, 3), tb(17, 1))); return { ball: k, d: 3 + 5 * k, L: 0.12 - 0.09 * k, reform: true }; }
  if (t < tb(19, 2)) return { ball: 0, d: 9 - 6 * r2, L: 0.03 + 0.09 * r2, roll: true };
  return { ball: 0, d: 3, L: 0.12, crumb: smooth(seg(t, tb(19, 2), tb(20, 1))) };
}
// a kéz felemelése, hogy a szál látsszon (0…1)
export function lift(t) { const up = (a, b, c, d) => Math.min(smooth(seg(t, a, b)), 1 - smooth(seg(t, c, d)));
  return Math.max(up(tb(13, 1), tb(13, 2), tb(13, 3), tb(14)), up(tb(15, 2), tb(15, 3), tb(16, 3), tb(17)), up(tb(18, 3), tb(19), tb(20), tb(20, 1))); }
export function audioEvents(cuts) {
  const sfx = [];
  sfx.push({ t: tb(19, 2), type: 'latch', g: 0.4 }, { t: tb(19, 3), type: 'latch', g: 0.3 }, { t: tb(23), type: 'latch', g: 0.4 }, { t: tb(24), type: 'databeep', g: 0.5 }, { t: tb(26), type: 'databeep', g: 0.5 });
  return { bpm: BPM, total: TOTAL, sfx, cuts, slams: [{ t: tb(4), kind: 'title' }, ...[8, 22, 28].map(b => ({ t: tb(b), kind: 'word' })), { t: tb(40), kind: 'end' }], steps: [] };
}
