// Sodrási (plasztikus) határ – EN ISO 17892-12: a pasztából ~20 g, gombóc, négy rész; sodrás az üveglapon 3 mm-es fonálig;
// ha nem morzsolódik, újra összegyúrjuk (szárad) és újra sodorjuk; a morzsolódó fonál a tégelybe → víztartalom; két meghatározás átlaga.
// Plasztikus index: I_P = w_L − w_P; plaszticitási diagram (A-vonal). Mintapélda: a folyási határ videó agyaga (w_L = 46,4 %).
import { clamp, lerp, smooth, seg } from '../../kit/util.js';
import { mkTime } from '../tm_lab/ui.js';
export const T = mkTime(110, 94); export const { BPM, BEAT, BAR, tb, TOTAL } = T;
export const CHAPTERS = [[0, 'Intro'], [tb(8), 'Eszközök'], [tb(14), 'Előkészítés'], [tb(26), 'Sodrás'], [tb(52), 'Tégelybe'], [tb(60), 'Víztartalom'], [tb(72), 'Plasztikus index'], [tb(86), 'Összegzés']];
export const COL = { pl: '#FF8A4C', acc: '#B48CFF', ll: '#3FE0C5' };
export const WL = 46.4;
export const T1 = { mt: 16.20, mw: 24.85, md: 23.17 }, T2 = { mt: 15.95, mw: 24.40, md: 22.74 };
export const w1 = (T1.mw - T1.md) / (T1.md - T1.mt) * 100, w2 = (T2.mw - T2.md) / (T2.md - T2.mt) * 100, WP = (w1 + w2) / 2, IP = WL - WP;
// ---------- ütemterv ----------
export const PICK = [14.4, 16.6], BALL = [16.8, 21.6], PUT = [21.6, 22.4], CUT = [22.6, 25.6];
export const ROLL1 = [26.6, 39.8], GATHER = [40.0, 43.4], ROLL2 = [43.6, 50.4], CRUMBLE = 49.6;
export const SCRAPE = [52.2, 56.4], LID = [56.6, 57.8], TSCALE = [58.0, 59.6];
// a fonál sugara (m): az első sodrás 5 → 2,2 mm, összegyúrás, a második 5 → 1,5 mm, majd morzsolódik
export const R0 = 0.005, RW = 0.0022, RP = 0.0015;
export const threadR = (t) => { if (t < tb(ROLL1[0] + 0.3)) return R0; if (t < tb(ROLL1[1])) return lerp(R0, RW, smooth(seg(t, tb(ROLL1[0] + 0.3), tb(ROLL1[1] - 0.3))));
  if (t < tb(GATHER[0] + 0.4)) return RW; if (t < tb(GATHER[1])) return lerp(RW, R0, smooth(seg(t, tb(GATHER[0] + 0.4), tb(GATHER[1] - 0.4))));
  if (t < tb(ROLL2[0] + 0.3)) return R0; if (t < tb(CRUMBLE)) return lerp(R0, RP, smooth(seg(t, tb(ROLL2[0] + 0.3), tb(CRUMBLE)))); return RP; };
export const rollPhase = (t) => { for (const [a, b] of [[ROLL1[0] + 0.3, ROLL1[1] - 0.3], [ROLL2[0] + 0.3, CRUMBLE]]) if (t >= tb(a) && t < tb(b)) { const u = seg(t, tb(a), tb(b)); return Math.sin(u * Math.PI * 2 * (b - a) * 1.6); } return 0; };
export const crumbK = (t) => smooth(seg(t, tb(CRUMBLE), tb(CRUMBLE + 0.6)));
export function audioEvents(cuts) {
  const sfx = [];
  sfx.push({ t: tb(ROLL1[0] + 0.3), type: 'hum', dur: tb(ROLL1[1] - ROLL1[0] - 0.6) - tb(0), g: 0.05, f: 180 }, { t: tb(ROLL2[0] + 0.3), type: 'hum', dur: tb(CRUMBLE - ROLL2[0] - 0.3) - tb(0), g: 0.05, f: 180 });
  sfx.push({ t: tb(CRUMBLE), type: 'latch', g: 0.4 }, { t: tb(2.0), type: 'latch', g: 0.35 }, { t: tb(LID[1] - 0.1), type: 'latch', g: 0.35 }, { t: tb(TSCALE[1] - 0.1), type: 'databeep', g: 0.45 });
  return { bpm: BPM, total: TOTAL, sfx, cuts, slams: [{ t: tb(4), kind: 'title' }, ...[8, 14, 26, 52, 60, 72, 86].map(b => ({ t: tb(b), kind: 'word' })), { t: tb(90), kind: 'end' }], steps: [] };
}
