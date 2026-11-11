// Kompressziós (ödométeres) vizsgálat – EN ISO 17892-5 (lépcsős terhelés); Kis Talajmechanika (2026) 6. fejezet, 7. gyakorlat
// 2. változat (2026-11-11): lépésről lépésre – készülék, mintabekészítés, beépítés, keret, terhelés, leolvasás, tehermentesítés, kiszerelés, kiértékelés.
import { clamp, smooth, seg } from '../../kit/util.js';
import { mkTime } from '../tm_lab/ui.js';
export const T = mkTime(110, 132); export const { BPM, BEAT, BAR, tb, TOTAL } = T;
export const CHAPTERS = [[0, 'Intro'], [tb(8), 'Készülék'], [tb(20), 'Minta'], [tb(50), 'Cella'], [tb(64), 'Keret'], [tb(78), 'Terhelés'], [tb(102), 'Tehermentesítés'], [tb(114), 'Kiértékelés']];
export const COL = { acc: '#B48CFF', load: '#F2C14E', un: '#5CC2F2', cc: '#FF8A4C', ok: '#7BD88F' };
// ---- talaj (mintapélda): telített agyag, w₀ = 31,5 %, ρ_s = 2,70 g/cm³ → e₀ = 0,85; H_s = 10,81 mm; σ′_p ≈ 150 kPa, C_c = 0,30, C_s = 0,05
export const E0 = 0.85, CS = 0.05, CC = 0.30, SP = 150, H0 = 20.0, HS = 10.81, A_CM2 = 44.18, M_RING = 112.40, M_SOIL = 169.6, M_DRY = 128.9, RHO = 1.92, W0 = 31.5;
const lg = Math.log10, W = 0.12;
export const eOf = (s) => { const x = lg(Math.max(1, s)); return E0 - CS * (x - 1) - (CC - CS) * W * Math.log(1 + Math.exp((x - lg(SP)) / W)); };   // visszaterhelési ág (C_s) → szűzág (C_c), sima átmenet σ′_p körül
export const E800 = eOf(800);
export const eUn = (s) => E800 + CS * lg(800 / s), eRe = (s) => eUn(s) - 0.004 * clamp(lg(s / 100) / lg(8));
export const hOf = (e) => HS * (1 + e);                 // mm
export const sOf = (e) => H0 - hOf(e);                  // összenyomódás a nullázás óta (mm)
// terhelési sor: [σ′, e a lépcső végén, felrakott/levett tárcsa (kPa felirat)]
export const DISCS = [25, 25, 50, 100, 200, 400];       // a sorrend a felrakás sorrendje (25 + 25 + 50 + 100 + 200 + 400 = 800 kPa)
export const SEQ = [
  { s: 25, e: eOf(25), add: 0 }, { s: 50, e: eOf(50), add: 1 }, { s: 100, e: eOf(100), add: 2 }, { s: 200, e: eOf(200), add: 3 }, { s: 400, e: eOf(400), add: 4 }, { s: 800, e: eOf(800), add: 5 },
  { s: 400, e: eUn(400), rem: 5, un: 1 }, { s: 200, e: eUn(200), rem: 4, un: 1 }, { s: 100, e: eUn(100), rem: 3, un: 1 },
  { s: 200, e: eRe(200), add: 3, re: 1 }, { s: 400, e: eRe(400), add: 4, re: 1 }, { s: 800, e: eRe(800) - 0.002, add: 5, re: 1 },
];
// ---- időzítés (ütem) ----
// egy lépcső: kar megtámasztása (kézikerék) → tárcsa fel/le → kar leengedése (a teher ekkor hat) → lefutás
export const STEP_T = [
  { up: 83.0, disc: [84.0, 85.6], down: [86.15, 86.75], run: [86.75, 94.0] },                // 25 kPa – részletesen: kar megtámasztva, tárcsa fel, kar le, óra indul
  // további lépcsők (gyorsítva): a tárcsát ütés nélkül, kézben megtartva engedjük az akasztóra – a teher a letételkor hat
  ...[0, 1, 2, 3, 4].map(i => { const b = 94.2 + i * 1.55; return { disc: [b + 0.25, b + 1.2], down: [b + 1.2, b + 1.2], run: [b + 1.2, b + 1.55] }; }),
  ...[0, 1, 2, 3, 4, 5].map(i => { const b = 102.2 + i * 1.12; return { disc: [b + 0.12, b + 0.92], down: [b + 0.92, b + 0.92], run: [b + 0.92, b + 1.12] }; }),
];
// a minta összenyomódása (mm) az időben: az utolsó lefutott lépcső e-je és a következő lefutása (konszolidációs alak)
// 25 kPa-os lépcső: a gyorsított óra (perc) a futás ütemében – logaritmikus, hogy a korai leolvasások is látsszanak
export const minAt = (t) => { const S = STEP_T[0]; const k = clamp((t - tb(S.down[1])) / (tb(S.run[1]) - tb(S.down[1]))); return t < tb(S.down[1]) ? 0 : 0.05 * Math.pow(1440 / 0.05, k); };
export function eAt(t) {
  let e = E0; for (let i = 0; i < SEQ.length; i++) { const S = STEP_T[i]; const t0 = tb(S.down[1]), t1 = tb(S.run[1]); if (t < t0) return e;
    if (i === 0) { if (t < t1) return (H0 - s25(minAt(t))) / HS - 1; e = SEQ[0].e; continue; }
    const k = clamp((t - t0) / Math.max(0.01, t1 - t0)); const eB = SEQ[i].e; if (t < t1) return e + (eB - e) * smooth(clamp(k / 0.85)); e = eB; }
  return e;
}
export const sAt = (t) => sOf(eAt(t));
// a terhelés a tárcsák szerint (kPa): mely tárcsák vannak az akasztón
export function discsOn(t) { const on = new Set(); for (let i = 0; i < SEQ.length; i++) { const S = STEP_T[i], q = SEQ[i]; const tm = tb((S.disc[0] + S.disc[1]) / 2 + 0.25); if (t < tm) break; if (q.add !== undefined) on.add(q.add); if (q.rem !== undefined) on.delete(q.rem); } return on; }
// 25 kPa-os lépcső leolvasási időpontjai (perc) és az akkori összenyomódás (mm)
export const READS = [0.1, 0.25, 0.5, 1, 2, 4, 8, 15, 30, 60, 120, 240, 480, 1440];
export const s25 = (min) => sOf(eOf(25)) * (1 - Math.exp(-Math.pow(min / 18, 0.55))) / (1 - Math.exp(-Math.pow(1440 / 18, 0.55)));
export function audioEvents(cuts) {
  const sfx = [];
  for (const S of STEP_T) { sfx.push({ t: tb(S.disc[1] - 0.15), type: 'latch', g: 0.45 }); }
  sfx.push({ t: tb(21.5), type: 'databeep', g: 0.35 }, { t: tb(44.7), type: 'databeep', g: 0.35 }, { t: tb(86.8), type: 'databeep', g: 0.45 });
  for (let k = 0; k < 4; k++) sfx.push({ t: tb(27.6 + 2 * k), type: 'latch', g: 0.25 });
  return { bpm: BPM, total: TOTAL, sfx, cuts, slams: [{ t: tb(4), kind: 'title' }, ...[8, 20, 50, 64, 78, 102, 109, 114].map(b => ({ t: tb(b), kind: 'word' })), { t: tb(129), kind: 'end' }], steps: [] };
}
