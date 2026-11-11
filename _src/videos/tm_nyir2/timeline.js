// Közvetlen nyíróvizsgálat – EN ISO 17892-10 (négyzetes nyíródoboz, 60 × 60 × 20 mm; szélesség/magasság ≥ 2,5), Kis Talajmechanika (2026) 8. fejezet.
// Menet: kiszúrás a zavartalan mintából (keret + toldat, kiemelés, toldat le, lehúzás acélvonalzóval, mérés) → a kocsiban álló, összecsavarozott dobozba
// kitolva → szűrőkő + terhelőfej → az erőmérő karja a felső kerethez → σ (állandó függőleges erő) → víz a kádba → konszolidáció (t_100) →
// rögzítőcsavarok ki, emelőcsavarokkal kis rés → lassú, állandó sebességű nyírás (F, δ_h, δ_v) → nyírási sík → három próbatest (100, 200, 300 kPa) → Coulomb-egyenes.
import { clamp, smooth, seg } from '../../kit/util.js';
import { mkTime } from '../tm_lab/ui.js';
export const T = mkTime(110, 116); export const { BPM, BEAT, BAR, tb, TOTAL } = T;
export const CHAPTERS = [[0, 'Intro'], [tb(8), 'Készülék'], [tb(14), 'Próbatest'], [tb(32), 'Beépítés'], [tb(48), 'Konszolidáció'], [tb(62), 'Nyírás előtt'], [tb(72), 'Nyírás'],
  [tb(86), 'Nyírási sík'], [tb(92), '3 próbatest'], [tb(98), 'Kiértékelés'], [tb(108), 'Összegzés']];
export const COL = { acc: '#B48CFF', s1: '#3FE0C5', s2: '#F2C14E', s3: '#FF8A4C', w: '#5CC2F2' };
// ---------- mintapélda ----------
export const A_MM2 = 3600, A_M2 = 0.0036, VOL = 72, M_SOIL = 140.4, M_CUT = 96.4, RHO = M_SOIL / VOL;      // mm², m², cm³, g
export const C0 = 8, PHI = 28, TANP = Math.tan(PHI * Math.PI / 180);
export const SIG = [100, 200, 300], TF = SIG.map(s => C0 + s * TANP), FV = SIG.map(s => s * A_M2 * 1000);  // kPa; N
export const SC = 0.25, T100 = 30, VR = 0.01, DMAX = 10;                                                  // konszolidáció (mm, perc); nyírási sebesség (mm/perc); végső elmozdulás (mm)
const shape = (d) => (1 - Math.exp(-d / 0.9)) * (1 - 0.14 * smooth(clamp((d - 3) / 5)));
const PK = (() => { let m = 0; for (let d = 0; d <= 10; d += 0.01) m = Math.max(m, shape(d)); return m; })();
export const tauOf = (d, i = 0) => TF[i] * shape(d) / PK;                                                 // kPa
export const vOf = (d) => -0.06 * Math.min(d, 1.2) / 1.2 + 0.026 * Math.max(0, d - 1.2);                  // függőleges elmozdulás a nyírás alatt (mm, + = emelkedik)
export const DPK = (() => { let m = 0, dm = 0; for (let d = 0; d <= 10; d += 0.01) { const v = shape(d); if (v > m) { m = v; dm = d; } } return dm; })();
// ---------- ütemterv (ütem) ----------
export const ON = [14.4, 15.9], PRESS = [16.1, 18.3], LIFT = [18.5, 20.3], COLL = [20.5, 22.0], LHOLD = [20.3, 22.1], STRIKE = [22.4, 25.6], WEIGH = [25.9, 27.7];
export const TOBOX = [32.2, 34.6], PUSH = [34.8, 38.9], CUTOFF = [39.0, 40.5], CAP = [40.8, 42.6], KNOB = [43.0, 45.0];
export const BTN1 = [48.4, 48.95], RAMDN = [49.0, 50.6], POUR = [51.2, 55.4], FILL = [52.8, 54.4], CONS = [55.6, 61.6];
export const LOCK = [[62.4, 63.9], [64.1, 65.6]], LIFTS = [[66.0, 67.2], [67.4, 68.6]], BTN2 = [69.8, 70.3], SHEAR = [72.0, 84.0], STOP = [84.0, 84.5];
export const PLANE = [86, 92], THREE = [92, 98];
// a kiszúrás mélysége (m): 25 mm a talajlapon át az üveglapig
export const pressD = (t) => 0.025 * smooth(seg(t, tb(PRESS[0] + 0.5), tb(PRESS[1] - 0.3)));
// nyírás: a vízszintes elmozdulás (mm); a hideg nyitásban gyorsan 0 → 8 mm
export const dNow = (t) => { if (t < tb(4)) return 8 * smooth(seg(t, tb(0.3), tb(3.6))); if (t < tb(SHEAR[0])) return 0; if (t < tb(SHEAR[1])) return DMAX * seg(t, tb(SHEAR[0] + 0.2), tb(SHEAR[1] - 0.3)); return t < tb(PLANE[1]) ? DMAX : 0; };
// konszolidáció: a függőleges elmozdulás (mm, + = süllyedés) a terhelés után; a konszolidáció órája (perc)
export const consMin = (t) => t < tb(CONS[0]) ? 0 : 60 * smooth(seg(t, tb(CONS[0] + 0.3), tb(CONS[1] - 0.6)));
export const settle = (t) => { if (t < tb(RAMDN[1] - 0.2)) return 0; const e = 0.03 * smooth(seg(t, tb(RAMDN[1] - 0.2), tb(RAMDN[1]))); return e + (SC - 0.03) * (1 - Math.exp(-3.2 * consMin(t) / T100)); };
export const shearMin = (t) => dNow(t) / VR;
export const lockK = (i, t) => smooth(seg(t, tb(LOCK[i][0] + 0.25), tb(LOCK[i][1] - 0.25)));
export const gapK = (t) => 0.5 * smooth(seg(t, tb(LIFTS[0][0] + 0.25), tb(LIFTS[0][1] - 0.2))) + 0.5 * smooth(seg(t, tb(LIFTS[1][0] + 0.25), tb(LIFTS[1][1] - 0.2)));
export const armK = (t) => smooth(seg(t, tb(KNOB[0] + 0.3), tb(KNOB[1] - 0.3)));
export const fillK = (t) => smooth(seg(t, tb(FILL[0]), tb(FILL[1])));
export function audioEvents(cuts) {
  const sfx = [{ t: tb(RAMDN[0]), type: 'hum', dur: tb(1.5) - tb(0), g: 0.08, f: 120 }, { t: tb(SHEAR[0] + 0.2), type: 'hum', dur: tb(11.5) - tb(0), g: 0.12, f: 52 }, { t: tb(0.3), type: 'hum', dur: tb(3.3) - tb(0), g: 0.1, f: 52 }];
  for (const b of [BTN1[0] + 0.3, BTN2[0] + 0.3, STOP[0]]) sfx.push({ t: tb(b), type: 'databeep', g: 0.45 });
  for (const b of [ON[1] - 0.1, LIFT[1] - 0.1, COLL[1] - 0.1, WEIGH[1] - 0.1, TOBOX[1] - 0.1, CAP[1] - 0.1, CUTOFF[1] - 0.1]) sfx.push({ t: tb(b), type: 'latch', g: 0.3 });
  sfx.push({ t: tb(WEIGH[1]), type: 'databeep', g: 0.35 });
  return { bpm: BPM, total: TOTAL, sfx, cuts, slams: [{ t: tb(4), kind: 'title' }, ...[8, 14, 32, 48, 62, 72, 86, 92, 98, 108].map(b => ({ t: tb(b), kind: 'word' })), { t: tb(112), kind: 'end' }], steps: [] };
}
