// Zsugorodási határ és lineáris zsugorodás – a Kis Talajmechanika eljárása: homogén talaj I_C ≈ 0,7-en, 30 mm vastag lapból
// Ø 25 × 25 mm-es gyűrűvel (toldattal) kiszúrt henger; a gyűrű síkjára vágjuk, a tárázott üvegtálba nyomjuk; tömeg, átmérő (tolómérő);
// szárítás először szobahőn (lassan, repedés nélkül), majd 105 °C-on; száraz tömeg, átmérő, magasság. β_s, ε_s, V_s, w_S.
// Mintapélda (telített kiinduló állapot, ρ_s = 2,70 g/cm³): w = 30,9 % (I_C = 0,70 a folyási és a sodrási határ videó agyagán).
import { clamp, lerp, smooth, seg } from '../../kit/util.js';
import { mkTime } from '../tm_lab/ui.js';
export const T = mkTime(110, 105); export const { BPM, BEAT, BAR, tb, TOTAL } = T;
export const CHAPTERS = [[0, 'Intro'], [tb(8), 'Eszközök'], [tb(14), 'Kiszúrás'], [tb(29), 'Kezdeti adatok'], [tb(43), 'Szárítás'], [tb(59), 'Mérés'], [tb(72), 'Kiértékelés'], [tb(97), 'Összegzés']];
export const COL = { sh: '#F2C14E', acc: '#B48CFF', red: '#FF6A5C', ok: '#3FE0C5' };
export const D0 = 25.0, H0 = 25.0, DD = 22.9, HD = 22.9, M = 23.64, MD = 18.06, RHOS = 2.70, WL = 46.4, WP = 24.3, IP = WL - WP;
export const V0 = Math.PI * (D0 / 10) ** 2 / 4 * (H0 / 10), VD = Math.PI * (DD / 10) ** 2 / 4 * (HD / 10), VS = MD / RHOS;      // cm³
export const BETA = (V0 - VD) / VD, EPS = 100 * (1 - Math.pow(1 / (1 + BETA), 1 / 3)), WS = 100 * (VD - VS) / MD, W0 = 100 * (M - MD) / MD, RHO = M / V0, IC = (WL - W0) / IP;
// ---------- ütemterv ----------
export const RING_ON = [16.4, 18.0], PRESS = [18.2, 21.9], LIFT = [22.0, 23.8], COLL = [24.0, 25.6], TRIM = [25.8, 28.7], LHOLD = [23.9, 28.75];
export const TODISH = [29.2, 31.4], PUSH = [31.6, 35.5], LHOLD2 = [31.5, 35.7], CAL1 = [37.4, 42.6];
export const DRY1 = [43.2, 45.0], ROOM = [45.0, 49.0], TOOVEN = [49.2, 52.0], OVENT = [52.0, 54.6], BACK = [54.6, 58.6];
export const CAL2 = [60.6, 64.2], TIP = [64.0, 65.4], CAL3 = [65.3, 68.6];
// a kiszúrás mélysége (m): a toldatos gyűrű a lap tetejéről az üveglapig (30 mm)
export const pressD = (t) => 0.03 * smooth(seg(t, tb(PRESS[0] + 0.45), tb(PRESS[1] - 0.4)));
// zsugorodás (0 → 1): szobahőn a nagyobb rész, a szárítószekrényben a maradék; a hideg nyitásban gyorsítva
export const shrinkK = (t) => t < tb(4) ? smooth(seg(t, tb(0.4), tb(3.6))) : 0.8 * smooth(seg(t, tb(ROOM[0] + 0.4), tb(ROOM[1] - 0.3))) + 0.2 * smooth(seg(t, tb(OVENT[0] + 0.3), tb(OVENT[1] - 0.3)));
export const dryK = (t) => t < tb(4) ? smooth(seg(t, tb(0.4), tb(3.6))) : 0.55 * smooth(seg(t, tb(ROOM[0] + 0.4), tb(ROOM[1] - 0.3))) + 0.45 * smooth(seg(t, tb(OVENT[0] + 0.3), tb(OVENT[1] - 0.3)));
export const doorA = (t) => (t >= tb(43) && t < tb(59) && !(t >= tb(OVENT[0]) && t < tb(OVENT[1]))) ? -1.57 : 0;
// a tolómérő nyílása (m): kulcsok [ütem, nyílás], közöttük simítva
const ramp = (K) => (t) => { if (t <= tb(K[0][0])) return K[0][1]; for (let i = 1; i < K.length; i++) if (t < tb(K[i][0])) return lerp(K[i - 1][1], K[i][1], smooth(seg(t, tb(K[i - 1][0]), tb(K[i][0])))); return K[K.length - 1][1]; };
export const CK = { up1: 38.4, ov1: 39.3, dn1: 39.8, rd1: 40.3, op1: 41.3, lf1: 41.6, bk1: 42.0,
  up2: 61.6, ov2: 62.2, dn2: 62.6, rd2: 63.0, op2: 63.6, lf2: 63.9, ov3: 65.9, dn3: 66.3, rd3: 66.7, op3: 67.5, lf3: 67.8, bk3: 68.1 };
export const calOpen = ramp([[0, 0.004], [CK.up1, 0.004], [CK.ov1 - 0.2, 0.031], [CK.dn1, 0.031], [CK.rd1, 0.025], [CK.op1, 0.025], [CK.lf1, 0.031], [CK.bk1, 0.031], [CK.bk1 + 0.4, 0.004],
  [CK.up2, 0.004], [CK.ov2 - 0.1, 0.029], [CK.dn2, 0.029], [CK.rd2, 0.0229], [CK.op2, 0.0229], [CK.lf2, 0.028], [CK.dn3, 0.028], [CK.rd3, 0.0229], [CK.op3, 0.0229], [CK.lf3, 0.028], [CK.bk3, 0.028], [CK.bk3 + 0.4, 0.004]]);
// tömeg a mérlegen (g)
export function scaleM(t) { if (t < tb(4)) return lerp(M, MD, smooth(seg(t, tb(0.4), tb(3.6)))); if (t < tb(PUSH[0] + 3.05)) return 0; if (t < tb(DRY1[0] + 0.3)) return M; if (t < tb(BACK[1] - 0.15)) return 0; return MD; }
export function audioEvents(cuts) {
  const sfx = [];
  sfx.push({ t: tb(PRESS[0] + 0.45), type: 'hum', dur: tb(PRESS[1] - PRESS[0] - 0.85) - tb(0), g: 0.05, f: 90 });
  sfx.push({ t: tb(RING_ON[1] - 0.1), type: 'latch', g: 0.3 }, { t: tb(TRIM[0] + 1.1), type: 'latch', g: 0.25 }, { t: tb(TODISH[1] - 0.15), type: 'latch', g: 0.3 }, { t: tb(PUSH[0] + 3.05), type: 'databeep', g: 0.45 });
  for (const b of [CK.rd1, CK.rd2, CK.rd3]) sfx.push({ t: tb(b), type: 'databeep', g: 0.35 });
  sfx.push({ t: tb(BACK[1] - 0.15), type: 'databeep', g: 0.45 }, { t: tb(TIP[0] + 0.9), type: 'latch', g: 0.3 }, { t: tb(TOOVEN[1] - 0.2), type: 'latch', g: 0.35 });
  return { bpm: BPM, total: TOTAL, sfx, cuts, slams: [{ t: tb(4), kind: 'title' }, ...[8, 14, 29, 43, 59, 72, 97].map(b => ({ t: tb(b), kind: 'word' })), { t: tb(101), kind: 'end' }], steps: [] };
}
