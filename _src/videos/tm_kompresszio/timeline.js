// Kompressziós (ödométeres) vizsgálat – EN ISO 17892-5, lépcsős terhelés; Kis Talajmechanika (2026) 6. fejezet
import { clamp, smooth, seg } from '../../kit/util.js';
import { mkTime } from '../tm_lab/ui.js';
export const T = mkTime(110, 56); export const { BPM, BEAT, BAR, tb, TOTAL } = T;
export const CHAPTERS = [[0, 'Intro'], [tb(8), 'Beépítés'], [tb(20), 'Terhelés'], [tb(35), 'σ–ε'], [tb(40), 'log σ – e'], [tb(46), 'Eredmény']];
export const COL = { acc: '#B48CFF', load: '#F2C14E', un: '#5CC2F2', cc: '#FF8A4C' };
export const E0 = 0.85, CS = 0.05, CC = 0.30, SP = 150, H = 20;                 // e₀, Cs, Cc, σ′p [kPa], H [mm]
export const eOf = (s) => s <= SP ? E0 - CS * Math.log10(s / 5) : E0 - CS * Math.log10(SP / 5) - CC * Math.log10(s / SP);
export const STEPS = [25, 50, 100, 200, 400, 800];
export const PATH = [...STEPS.map(s => ({ s, e: eOf(s) })), { s: 100, e: eOf(800) + CS * Math.log10(8), un: 1 }, { s: 800, e: eOf(800) - 0.004, un: 1 }];
export const epsOf = (e) => (E0 - e) / (1 + E0) * 100;                            // %
export const EOED = 100 / ((epsOf(eOf(200)) - epsOf(eOf(100))) / 100);              // kPa
// lépcsők: 20–32 (2 ütem / lépcső), tehermentesítés 32–33,5, újraterhelés 33,5–35
export function stepAt(t) { if (t < tb(20)) return { i: -1, k: 0 }; if (t < tb(32)) { const u = (t - tb(20)) / (tb(2)); const i = Math.min(5, Math.floor(u)); return { i, k: u - i }; } if (t < tb(33, 2)) return { i: 6, k: seg(t, tb(32), tb(33, 2)) }; return { i: 7, k: seg(t, tb(33, 2), tb(35)) }; }
// a minta összenyomódása (mm) az időben: lépcsőn belül konszolidációs lefutás
export function sNow(t) { const { i, k } = stepAt(t); if (i < 0) return 0; const eA = i === 0 ? E0 : PATH[i - 1].e, eB = PATH[i].e; const kk = i >= 6 ? smooth(clamp(k / 0.8)) : clamp(Math.sqrt(clamp((k - 0.25) / 0.6)) * 1.0); return H * (E0 - (eA + (eB - eA) * kk)) / (1 + E0) / 1; }
export function audioEvents(cuts) {
  const sfx = [{ t: tb(9), type: 'hum', dur: tb(1.5), g: 0.1, f: 80 }, { t: tb(11, 2), type: 'databeep', g: 0.5 }];
  for (let k = 0; k < 6; k++) sfx.push({ t: tb(20 + 2 * k, 1), type: 'latch', g: 0.5 });
  sfx.push({ t: tb(32, 1), type: 'latch', g: 0.4 }, { t: tb(33, 3), type: 'latch', g: 0.4 }, { t: tb(18, 2), type: 'hum', dur: tb(1.5), g: 0.1, f: 200 });
  return { bpm: BPM, total: TOTAL, sfx, cuts, slams: [{ t: tb(4), kind: 'title' }, ...[8, 20, 35, 40, 46].map(b => ({ t: tb(b), kind: 'word' })), { t: tb(52), kind: 'end' }], steps: [] };
}
