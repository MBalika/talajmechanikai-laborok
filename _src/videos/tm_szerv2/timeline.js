// Szervesanyag-tartalom – izzítási veszteség (EN 17685-1): a 110 °C-on szárított mintát mozsárban aprítjuk, 2 mm-es szitán átszitáljuk;
// a porcelán tégelyt 550 °C-on előizzítjuk, hűtőlapon, majd exszikkátorban hűtjük, mérjük (m_a); 5–15 g talaj (≤ 5 mm réteg), m_c;
// izzítás 550 ± 25 °C-on legalább 2 órán át; hűtőlap, exszikkátor, m_d. w_LOI = (m_c − m_d)/(m_c − m_a) · 100 %; legalább két minta átlaga.
// Minősítés: EN ISO 14688-2 (2–6 % kissé, 6–20 % közepesen, > 20 % erősen szerves).
import { clamp, lerp, smooth, seg } from '../../kit/util.js';
import { mkTime } from '../tm_lab/ui.js';
export const T = mkTime(110, 104); export const { BPM, BEAT, BAR, tb, TOTAL } = T;
export const CHAPTERS = [[0, 'Intro'], [tb(8), 'Eszközök'], [tb(14), 'Előkészítés'], [tb(28), 'Tégely'], [tb(46), 'Bemérés'], [tb(56), 'Izzítás'], [tb(78), 'Kiértékelés'], [tb(96), 'Összegzés']];
export const COL = { hot: '#FF8A4C', acc: '#B48CFF', ok: '#3FE0C5', org: '#C9A15A' };
export const MA = 32.415, MC = 37.915, MD = 37.431, LOI = 100 * (MC - MD) / (MC - MA), LOI2 = 9.0, LOIM = (LOI + LOI2) / 2;
// ---------- ütemterv ----------
export const GRIND = [16.6, 21.6], SHAKE = [22.4, 25.4], SVOFF = [25.6, 26.8];
// tégelyfogós szakaszok (R): az előizzítás (E1–E2) és az izzítás (E4–E5); a kemence ajtaját és az exszikkátor fedelét a bal kéz kezeli
export const TONG1 = [28.0, 45.6], TONG2 = [56.0, 75.6], SPOON = [46.6, 53.4];
export const CLOCK1 = [32.3, 33.6], CLOCKD1 = [40.8, 42.0], CLOCK2 = [60.3, 63.6], CLOCKD2 = [70.8, 72.0];
export const burnK = (t) => t < tb(4) ? smooth(seg(t, tb(0.6), tb(3.4))) : smooth(seg(t, tb(CLOCK2[0] + 0.4), tb(CLOCK2[1] - 0.5)));
// a tégely hőmérséklete (0–1, izzás): a kemencéből kivéve izzik, a hűtőlapon gyorsan sötétül
export const hotK = (t) => { for (const a of [34.3, 64.3]) { if (t >= tb(a) && t < tb(a + 6)) return 1 - smooth(seg(t, tb(a + 0.4), tb(a + 3.2))); } return 0; };
export function scaleM(t) { if (t < tb(44.6)) return 0; if (t < tb(46.5)) return MA; if (t < tb(SPOON[1])) { let m = MA; for (const [b, k] of [[48.9, 0.5], [51.6, 0.5]]) m += 5.5 * k * smooth(seg(t, tb(b), tb(b + 0.5))); return m; }
  if (t < tb(56.9)) return MC; if (t < tb(74.6)) return 0; return MD; }
export function furnT(t) { if (t < tb(4)) return 550; if (t < tb(27)) return 550; if (t >= tb(CLOCK2[0]) && t < tb(CLOCK2[0] + 0.6)) return Math.round(lerp(380, 550, seg(t, tb(CLOCK2[0]), tb(CLOCK2[0] + 0.6)))); return 550; }
export function audioEvents(cuts) {
  const sfx = [{ t: tb(GRIND[0] + 0.3), type: 'hum', dur: tb(GRIND[1] - GRIND[0] - 0.6) - tb(0), g: 0.05, f: 140 }, { t: tb(SHAKE[0] + 0.2), type: 'hum', dur: tb(SHAKE[1] - SHAKE[0] - 0.4) - tb(0), g: 0.06, f: 220 },
    { t: tb(CLOCK2[0]), type: 'hum', dur: tb(3.5) - tb(0), g: 0.08, f: 55 }];
  for (const b of [31.2, 35.6, 39.6, 44.6, 59.2, 65.6, 69.6, 74.6]) sfx.push({ t: tb(b), type: 'latch', g: 0.3 });
  for (const b of [44.7, 49.4, 52.1, 74.7]) sfx.push({ t: tb(b), type: 'databeep', g: 0.4 });
  return { bpm: BPM, total: TOTAL, sfx, cuts, slams: [{ t: tb(4), kind: 'title' }, ...[8, 14, 28, 46, 56, 78, 96].map(b => ({ t: tb(b), kind: 'word' })), { t: tb(100), kind: 'end' }], steps: [] };
}
