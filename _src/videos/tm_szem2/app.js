// Szemeloszlási vizsgálat – labor: szárítószekrény → mérleg → nedves szitálás a mosótálcánál → szitasor, rázógép → mérés szitánként
// (halmozott tömeg a mérőtálban) → hidrometrálás (diszpergálószer, felső keverő, 1000 ml-es henger az alacsony asztalon, keverőrúd,
// hidrométer, kontrollhenger hőmérővel, stopper). Minden mozdulatot a laboráns keze végez (tm_lab/act.js, tm_lab/grips3.js).
import { THREE, V, BT, M, cyl, bx, drawScale, drawOven } from '../tm_lab/room.js';
import { Choreo, keyed, still, stdPoses } from '../tm_lab/act.js';
import { diskTop, powerCyl, rimHold, rimSide, rimOblique, bladeTop, fingerPress, flatPalm } from '../tm_lab/grips3.js';
import * as O2 from '../tm_lab/oedo2.js';
import * as SZ from '../tm_lab/szem.js';
import { SV, SH, TR, CY, MX, hydStemY } from '../tm_lab/szem.js';
import * as TL from './timeline.js';
import { tb, OV, WS, SS, WG, HY, cyc } from './timeline.js';
import { clamp, lerp, smooth, seg } from '../../kit/util.js';
const B = (b) => tb(b);
const tv = (a) => (a && a.isVector3) ? a.clone() : V(a[0], a[1], a[2]);
const QI = new THREE.Quaternion();
const sideP = (sd, aim) => { const a = aim.clone().setY(0).normalize(); const s = sd === 'R' ? new THREE.Vector3(a.z, 0, -a.x) : new THREE.Vector3(-a.z, 0, a.x); return s.multiplyScalar(0.94).addScaledVector(a, 0.34).normalize(); };   // oldalról fogás: a tenyér a tárgy felé, oldalról
const qx = (a) => new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), a), qy = (a) => new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), a), qz = (a) => new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), a);
// sima pálya pontokon át (centripetális Catmull–Rom, ívhossz szerint); a forgatás q0 → q1 (opcionálisan saját időzítéssel)
function path(pts, t0, t1, q0 = QI, q1 = q0, qk = null) { const crv = new THREE.CatmullRomCurve3(pts.map(tv), false, 'centripetal');
  return (t) => { const u = smooth(seg(t, t0, t1)); return { p: crv.getPointAt(u), q: q0.clone().slerp(q1, qk ? qk(t) : u) }; }; }
// időszakaszokra bontott póz: [[tKezdet, fn], …] – a legutolsó, már elkezdett szakasz adja
const phases = (L) => (t) => { let f = L[0][1]; for (const [a, g] of L) if (t >= a) f = g; return f(t); };
const lift = (p, h) => [p[0], p[1] + h, p[2]];

// ---- elrendezés (labor-helyi; a laboráns z ≈ −0,6-nál áll, −z felé néz) ----
export const POS = { OVEN: [-3.3, -1.25], T1: [-2.08, -0.98], TRG: [-2.6, -1.12], SCL: -1.75, PAIR: [-1.45, -0.96], LID: [-1.45, -1.2], BRUSH: [-1.42, -0.83], STG: [-1.15, -1.0], BOWL2: [-0.9, -0.88], SHK: [-0.55, -1.0],
  BEAK: [2.55, -1.0], DISP: [2.68, -1.2], MIX: [2.92, -1.08], DW: [3.2, -1.2], BENCH: [3.82, -1.0], BH: 0.62, SED: [3.72, -0.95], CTL: [3.96, -1.1], PLG: [4.07, -0.82], TIMER: [3.32, -0.93], CUPD: [3.27, -1.12] };
const P = SV.P, BH = POS.BH;
const STGp = [POS.STG[0], BT, POS.STG[1]], SHKp = [POS.SHK[0], BT + SH.PY + 0.003, POS.SHK[1]];
const offOf = (k) => k === 8 ? 0 : (8 - k) * P;                                   // a szitasorban: 0 = 8 mm (legfelül) … 7 = 0,063 mm, 8 = gyűjtőtál
const LIDOFF = 8 * P + SV.H - 0.006, CLAMP_DN = SH.PY + 0.003 + LIDOFF + 0.013, CLAMP_UP = 0.44;
const TRAY = [POS.SCL, BT + 0.069, -1.06], TIP = [POS.SCL + 0.09, BT + 0.25, -1.06], PILE = [POS.PAIR[0], BT, POS.PAIR[1]], TILT = 0.95;
const SED0 = [POS.SED[0], BH, POS.SED[1]], CTL0 = [POS.CTL[0], BH, POS.CTL[1]];
const SURF = BH + CY.BASE + CY.ML;                                               // a folyadékfelszín a hengerekben (1000 ml)
let C, X = {};
export function board(g) { g.strokeStyle = '#2b4f9e'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(80, 440); g.lineTo(960, 440); g.moveTo(80, 440); g.lineTo(80, 60); g.stroke();
  g.strokeStyle = '#c0281e'; g.beginPath(); g.moveTo(120, 420); g.bezierCurveTo(380, 400, 520, 120, 900, 90); g.stroke(); g.fillStyle = '#2b4f9e'; g.font = 'italic 700 40px Arial'; g.fillText('S %', 30, 70); g.fillText('log d', 860, 490);
  g.fillStyle = '#c0281e'; g.font = 'italic 600 36px Arial'; g.fillText('C', 560, 300); g.font = 'italic 600 24px Arial'; g.fillText('U', 584, 310); g.font = 'italic 600 36px Arial'; g.fillText(' = d  / d', 598, 300); g.font = 'italic 600 24px Arial'; g.fillText('60', 676, 310); g.fillText('10', 760, 310); }

// ---------------- a szitasor helyzete ----------------
const vib = (t) => TL.shakeOn(t) ? V(0.0022 * Math.sin(t * 57), 0.0012 * Math.abs(Math.sin(t * 57 * 0.5)), 0.0022 * Math.cos(t * 57)) : V();
const stackCarry = path([STGp, lift(STGp, 0.08), [(STGp[0] + SHKp[0]) / 2, BT + 0.2, -1.02], lift(SHKp, 0.07), SHKp], B(SS.stack[0] + 0.25), B(SS.stack[1] - 0.15));
const stackBack = path([SHKp, lift(SHKp, 0.07), [(STGp[0] + SHKp[0]) / 2, BT + 0.2, -1.02], lift(STGp, 0.08), STGp], B(WG.stack[0] + 0.25), B(WG.stack[1] - 0.15));
// a gyűjtőtál (a szitasor alja) helyzete, ha a szitasor egyben van
function stackBase(t) { let s;
  if (t < B(16)) s = { p: tv(SHKp), q: QI.clone() }; else if (t < B(SS.stack[0] + 0.25)) s = { p: tv(STGp), q: QI.clone() }; else if (t < B(SS.stack[1])) s = stackCarry(t);
  else if (t < B(WG.stack[0] + 0.25)) s = { p: tv(SHKp), q: QI.clone() }; else if (t < B(WG.stack[1])) s = stackBack(t); else s = { p: tv(STGp), q: QI.clone() };
  s.p.add(vib(t)); return s; }
const withOff = (s, dy) => ({ p: s.p.clone().add(V(0, dy, 0)), q: s.q.clone() });
// mérési ciklus: felvétel a szitasor tetejéről → a mérőtál fölé → hátra billentés (a túlsó perem le) → vissza vízszintesre → a kupacra
function cyclePose(i) { const c = cyc(i); const st = lift(STGp, offOf(i)), pile = lift(PILE, i * P);
  const toTip = path([st, lift(st, 0.06), [(st[0] + TIP[0]) / 2, TIP[1] + 0.03, -1.0], TIP], B(c.a + 0.05), B(c.carry));
  const toPile = path([TIP, [TIP[0] + 0.04, TIP[1] + 0.02, -1.0], lift(pile, 0.07), pile], B(c.level), B(c.set));
  const tilt = (t) => { const k = smooth(seg(t, B(c.carry), B(c.tilt))) * (1 - smooth(seg(t, B(c.tilt + (c.brush ? c.brush[1] - c.tilt + 0.1 : 0.05)), B(c.level)))); return qz(TILT * k); };
  return (t) => { if (t < B(c.a)) return null; if (t < B(c.carry)) return toTip(t); if (t < B(c.level)) return { p: tv(TIP), q: tilt(t) }; if (t < B(c.set)) { const s = toPile(t); s.q = tilt(t); return s; } return { p: tv(pile), q: QI.clone() }; }; }
const CYP = [...Array(9)].map((_, i) => cyclePose(i));
function sievePose(k) { // k: 0–7 szita, 8 gyűjtőtál
  const pairCarry = path([POS.PAIR[0] !== undefined ? [POS.PAIR[0], BT, POS.PAIR[1]] : null, [POS.PAIR[0], BT + 0.07, POS.PAIR[1]], [(POS.PAIR[0] + STGp[0]) / 2, BT + 8 * P + 0.09, -0.99], lift(STGp, 8 * P + 0.025), lift(STGp, 8 * P)], B(SS.pair[0] + 0.2), B(SS.pair[1] - 0.1));
  return (t) => { const cp = CYP[k](t); if (cp) return cp;
    if (k === 0 && t >= B(16) && t < B(SS.pair[1])) return t < B(SS.pair[0] + 0.2) ? { p: V(POS.PAIR[0], BT, POS.PAIR[1]), q: QI.clone() } : pairCarry(t);
    return withOff(stackBase(t), offOf(k)); }; }
const lidOn = path([[POS.LID[0], BT, POS.LID[1]], [POS.LID[0], BT + 0.06, POS.LID[1]], [(POS.LID[0] + STGp[0]) / 2, BT + LIDOFF + 0.08, -1.1], lift(STGp, LIDOFF + 0.03), lift(STGp, LIDOFF)], B(SS.lid[0] + 0.2), B(SS.lid[1] - 0.1));
const lidOff = path([lift(STGp, LIDOFF), lift(STGp, LIDOFF + 0.04), [(POS.LID[0] + STGp[0]) / 2, BT + LIDOFF + 0.08, -1.1], [POS.LID[0], BT + 0.05, POS.LID[1]], [POS.LID[0], BT, POS.LID[1]]], B(WG.lid[0] + 0.2), B(WG.lid[1] - 0.1));
function lidPose(t) { if (t < B(16)) return withOff(stackBase(t), LIDOFF); if (t < B(SS.lid[0] + 0.2)) return { p: V(POS.LID[0], BT, POS.LID[1]), q: QI.clone() }; if (t < B(SS.lid[1])) return lidOn(t);
  if (t < B(WG.lid[0] + 0.2)) return withOff(stackBase(t), LIDOFF); if (t < B(WG.lid[1])) return lidOff(t); return { p: V(POS.LID[0], BT, POS.LID[1]), q: QI.clone() }; }
const clampY = (t) => { if (t < B(16)) return CLAMP_DN; if (t < B(SS.clamp[0] + 0.15)) return CLAMP_UP; if (t < B(SS.clamp[1])) return lerp(CLAMP_UP, CLAMP_DN, smooth(seg(t, B(SS.clamp[0] + 0.15), B(SS.clamp[1] - 0.1))));
  if (t < B(WG.up[0] + 0.1)) return CLAMP_DN; if (t < B(WG.up[1])) return lerp(CLAMP_DN, CLAMP_UP, smooth(seg(t, B(WG.up[0] + 0.1), B(WG.up[1] - 0.1)))); return CLAMP_UP; };
const knobA = (t) => t < B(16) ? 1.1 : 1.1 * smooth(seg(t, B(SS.tight[0] + 0.15), B(SS.tight[1] - 0.1))) * (1 - smooth(seg(t, B(WG.loose[0] + 0.15), B(WG.loose[1] - 0.1))));
const knobTop = (k, t) => V(POS.SHK[0] + (k ? SH.RX : -SH.RX), BT + clampY(t) + 0.03 + 0.026, POS.SHK[1]).add(vib(t));

// ---------------- a tál (minta) ----------------
const OVB = [POS.OVEN[0], BT + 0.366, POS.OVEN[1] + 0.18], T1 = [POS.T1[0], BT, POS.T1[1]], SCLB = [POS.SCL, BT + 0.069, -1.06];
const NESTX = POS.TRG[0], POUR0 = [NESTX + 0.087, BT + 0.27, -1.15 + 0.06], B2 = [POS.BOWL2[0], BT, POS.BOWL2[1]], POUR2 = [POS.PAIR[0] + 0.087, BT + 0.19, POS.PAIR[1]], PTILT = 1.1;
const OUTP = [OVB[0] + 0.12, BT + 0.3, -0.86];
const bowlOut1 = path([OVB, lift(OVB, 0.02), [OVB[0] + 0.01, OVB[1] + 0.035, -0.9], OUTP], B(OV.take[0] + 0.2), B(17.9));
const bowlOut2 = path([OUTP, [-2.6, BT + 0.24, -0.8], [-2.1, BT + 0.19, -0.84], lift(SCLB, 0.05), SCLB], B(18.85), B(OV.take[1] - 0.08));
const bowlOut = (t) => t < B(18.85) ? bowlOut1(t) : bowlOut2(t);
function bowlPose(t) {
  if (t < B(OV.take[0] + 0.15)) return { p: tv(OVB), q: QI.clone() };
  if (t < B(WS.carry[0])) return bowlOut(t);
  if (t < B(WS.pour[0])) return keyed([{ t: B(WS.carry[0] + 0.15), p: SCLB }, { t: B(WS.carry[1] - 0.05), p: POUR0, lift: 0.06 }])(t);
  if (t < B(WS.down[0])) { const k = smooth(seg(t, B(WS.pour[0]), B(WS.pour[0] + 0.45))) * (1 - smooth(seg(t, B(WS.pour[1] - 0.3), B(WS.pour[1])))); return { p: tv(POUR0), q: qz(PTILT * k) }; }
  if (t < B(29.0)) return keyed([{ t: B(WS.down[0] + 0.05), p: POUR0 }, { t: B(WS.down[1] - 0.05), p: T1, lift: 0.03 }])(t);
  if (t < B(30.0)) return { p: tv(OVB), q: QI.clone() };                                           // vissza a szárítószekrénybe (24 óra)
  if (t < B(SS.bowl[0] + 0.15)) return { p: tv(B2), q: QI.clone() };
  if (t < B(SS.pour[0])) return keyed([{ t: B(SS.bowl[0] + 0.15), p: B2 }, { t: B(SS.bowl[1]), p: POUR2, lift: 0.04 }])(t);
  if (t < B(SS.bowlDn[0])) { const k = smooth(seg(t, B(SS.pour[0]), B(SS.pour[0] + 0.45))) * (1 - smooth(seg(t, B(SS.pour[1] - 0.3), B(SS.pour[1])))); return { p: tv(POUR2), q: qz(PTILT * k) }; }
  return keyed([{ t: B(SS.bowlDn[0] + 0.05), p: POUR2 }, { t: B(SS.bowlDn[1] - 0.05), p: B2, lift: 0.03 }])(t); }
const pourK = (t, a, b) => smooth(seg(t, B(a + 0.3), B(a + 0.75))) * (1 - smooth(seg(t, B(b - 0.45), B(b - 0.2))));

// ---------------- mosás ----------------
const NEST = [POS.TRG[0], BT + TR.RAIL, POS.TRG[1] + TR.SPZ];
const swirl = (t) => { const e = smooth(seg(t, B(WS.wash[0] + 0.1), B(WS.wash[0] + 0.5))) * (1 - smooth(seg(t, B(WS.wash[1] - 0.45), B(WS.wash[1] - 0.1)))); const w = (t - B(WS.wash[0])) * 3.4; return V(0.013 * Math.sin(w) * e, 0, 0.011 * Math.cos(w) * e); };
const tapA = (t) => -0.95 * TL.tapK(t);

// ---------------- hidrometrálás ----------------
const BEAK0 = [POS.BEAK[0], BT, POS.BEAK[1]], DISP0 = [POS.DISP[0], BT, POS.DISP[1]], CUP0 = [POS.MIX[0], BT + MX.BASE + 0.004, POS.MIX[1] + MX.CUPZ], DW0 = [POS.DW[0], BT, POS.DW[1]];
const DISP_P = [POS.BEAK[0] + 0.16, BT + 0.2, POS.BEAK[1] + 0.005], BEAK_P = [POS.MIX[0] - 0.115, BT + 0.215, CUP0[2] + 0.02], CUP_P = [POS.SED[0] + 0.125, BH + 0.5, POS.SED[1] + 0.005], DW_P = [POS.SED[0] - 0.165, BH + 0.53, POS.SED[1] + 0.005];
const CUPD = [POS.CUPD[0], BT, POS.CUPD[1]];
const pourPose = (p0, pp, a, b, ang, ax = 'z', back = null) => { const back0 = back || p0; const to = keyed([{ t: B(a + 0.2), p: p0 }, { t: B(a + 0.2 + (b - a) * 0.3), p: pp, lift: 0.05 }]);
  const fro = keyed([{ t: B(b - (b - a) * 0.28), p: pp }, { t: B(b - 0.05), p: back0, lift: 0.04 }]); const q = (k) => ax === 'z' ? qz(ang * k) : qx(ang * k);
  return (t) => { if (t < B(a + 0.2)) return { p: tv(p0), q: QI.clone() }; const t1 = a + 0.2 + (b - a) * 0.3, t2 = b - (b - a) * 0.28;
    if (t < B(t1)) return to(t); if (t < B(t2)) { const k = smooth(seg(t, B(t1), B(t1 + (t2 - t1) * 0.35))) * (1 - smooth(seg(t, B(t2 - (t2 - t1) * 0.3), B(t2)))); return { p: tv(pp).add(V(0, 0.02 * k, 0)), q: q(k) }; } if (t < B(b)) return fro(t); return { p: tv(back0), q: QI.clone() }; }; };
const dispPose = pourPose(DISP0, DISP_P, HY.disp[0], HY.disp[1], 1.85);
const beakPose = pourPose(BEAK0, BEAK_P, HY.beak[0], HY.beak[1], -1.75);
const dwPose = pourPose(DW0, DW_P, HY.water[0], HY.water[1], -1.6);
const headUp = (t) => MX.LIFT * smooth(seg(t, B(HY.cup[0] + 0.2), B(HY.cup[0] + 0.65)));
const cupPose = (() => { const a = HY.cup[0], b = HY.cup[1]; const out = path([CUP0, lift(CUP0, 0.03), [CUP0[0], CUP0[1] + 0.06, CUP0[2] + 0.13], [3.35, BH + 0.52, -1.0], CUP_P], B(a + 0.85), B(a + 1.35));
  const dn = keyed([{ t: B(b - 0.5), p: CUP_P }, { t: B(b - 0.05), p: CUPD, lift: 0.03 }]);
  return (t) => { if (t < B(a + 0.85)) return { p: tv(CUP0), q: QI.clone() }; if (t < B(a + 1.35)) return out(t); if (t < B(b - 0.5)) { const k = smooth(seg(t, B(a + 1.35), B(a + 1.6))) * (1 - smooth(seg(t, B(b - 0.75), B(b - 0.5)))); return { p: tv(CUP_P).add(V(0, 0.02 * k, 0)), q: qz(1.75 * k) }; } if (t < B(b)) return dn(t); return { p: tv(CUPD), q: QI.clone() }; }; })();
// keverőrúd: tartóban áll → be a hengerbe → 4 löket → vissza
const PLG0 = [POS.PLG[0], BH + 0.002, POS.PLG[1]], PLGin = [POS.SED[0], BH + CY.BASE + 0.012, POS.SED[1]];
const plgPose = (() => { const up = 0.5; const ins = path([PLG0, lift(PLG0, up), [(PLG0[0] + PLGin[0]) / 2, BH + up + 0.03, -1.04], [PLGin[0], BH + up, PLGin[2]], [PLGin[0], PLGin[1] + 0.27, PLGin[2]]], B(HY.plg[0] + 0.2), B(HY.plg[1]));
  const outP = path([[PLGin[0], PLGin[1] + 0.27, PLGin[2]], [PLGin[0], BH + up, PLGin[2]], [(PLG0[0] + PLGin[0]) / 2, BH + up + 0.03, -1.04], lift(PLG0, up), PLG0], B(HY.plgOut[0] + 0.05), B(HY.plgOut[1] - 0.05));
  return (t) => { if (t < B(HY.plg[0] + 0.2)) return { p: tv(PLG0), q: QI.clone() }; if (t < B(HY.plg[1])) return ins(t);
    if (t < B(HY.strokes[1])) { const u = seg(t, B(HY.strokes[0]), B(HY.strokes[1])); const y = PLGin[1] + 0.27 * (0.5 + 0.5 * Math.cos(u * Math.PI * 2 * 4)); return { p: V(PLGin[0], y, PLGin[2]), q: QI.clone() }; }
    if (t < B(HY.plgOut[0] + 0.05)) return { p: V(PLGin[0], PLGin[1] + 0.27, PLGin[2]), q: QI.clone() }; if (t < B(HY.plgOut[1])) return outP(t); return { p: tv(PLG0), q: QI.clone() }; }; })();
// hidrométer: a kontrollhengerben úszik; be a szuszpenzióba (a leolvasás előtt), ki, egy második ciklus a gyorsított szakaszban
export const rhoAt = (m) => { const H = TL.HYD; if (m <= H[0].min) return H[0].R + (1 - m / H[0].min) * 0.0015; for (let i = 0; i < H.length - 1; i++) if (m <= H[i + 1].min) { const k = Math.log(m / H[i].min) / Math.log(H[i + 1].min / H[i].min); return lerp(H[i].R, H[i + 1].R, k); } return H[H.length - 1].R; };
const RCTL = 1.0012;
const floatY = (rho) => SURF - hydStemY(rho);
const hydCtl = () => V(CTL0[0] - 0.012, floatY(RCTL), CTL0[2] + 0.008);
const H2 = { in: [90.8, 91.55], out: [92.25, 93.0] };
function hydPose(t) { const ctl = hydCtl(); const sedAt = (tt) => V(SED0[0] + 0.004, floatY(rhoAt(TL.hydMin(tt))), SED0[2] + 0.004);
  const move = (a, b, from, to) => { const top = BH + CY.H + 0.03 - 0.0; const lf = Math.max(0, top - Math.min(from.y, to.y)) + 0.02;
    return path([from, from.clone().add(V(0, lf * 0.6, 0)), from.clone().lerp(to, 0.5).add(V(0, lf + 0.02, 0.03)), to.clone().add(V(0, lf * 0.6, 0)), to], B(a + 0.15), B(b - 0.08))(t); };
  if (t < B(HY.hin[0] + 0.15)) return { p: ctl, q: QI.clone() }; if (t < B(HY.hin[1])) return move(HY.hin[0], HY.hin[1], ctl, sedAt(B(HY.hin[1])));
  if (t < B(HY.hout[0] + 0.15)) return { p: sedAt(t), q: QI.clone() }; if (t < B(HY.hout[1])) return move(HY.hout[0], HY.hout[1], sedAt(B(HY.hout[0] + 0.15)), ctl);
  if (t < B(H2.in[0] + 0.15)) return { p: ctl, q: QI.clone() }; if (t < B(H2.in[1])) return move(H2.in[0], H2.in[1], ctl, sedAt(B(H2.in[1])));
  if (t < B(H2.out[0] + 0.15)) return { p: sedAt(t), q: QI.clone() }; if (t < B(H2.out[1])) return move(H2.out[0], H2.out[1], sedAt(B(H2.out[0] + 0.15)), ctl);
  return { p: ctl, q: QI.clone() }; }
export const hydInSed = (t) => (t >= B(HY.hin[1]) && t < B(HY.hout[0] + 0.15)) || (t >= B(H2.in[1]) && t < B(H2.out[0] + 0.15));

export function build(L, R) {
  stdPoses(); const G = L.G; C = new Choreo(L, { hang: true }); X.C = C; L.pc.g.visible = false;
  L.scl.G.position.set(POS.SCL, BT, -1.05);
  // ---- tárgyak ----
  X.bowl = SZ.dish(0.09, 0.05); G.add(X.bowl); C.prop('bowl', X.bowl, bowlPose);
  X.trg = SZ.trough(); X.trg.position.set(POS.TRG[0], BT, POS.TRG[1]); G.add(X.trg);
  X.w063 = SZ.sieve(0.063); X.w2 = SZ.sieve(2); G.add(X.w063, X.w2);
  C.prop('w063', X.w063, (t) => ({ p: tv(NEST).add(swirl(t)), q: QI.clone() })); C.prop('w2', X.w2, (t) => ({ p: tv(NEST).add(V(0, P, 0)).add(swirl(t)), q: QI.clone() }));
  X.sv = TL.SIEVES.map((ap, k) => { const s = SZ.sieve(ap); G.add(s); C.prop('S' + k, s, sievePose(k)); return s; });
  X.pan = SZ.sieve(0); G.add(X.pan); C.prop('S8', X.pan, sievePose(8)); X.sv.push(X.pan);
  X.lid = SZ.sieveLid(); G.add(X.lid); C.prop('lid', X.lid, lidPose);
  X.shk = SZ.shaker(); X.shk.position.set(POS.SHK[0], BT, POS.SHK[1]); G.add(X.shk);
  X.tray = SZ.dish(0.085, 0.035, SZ.smats().alu); X.tray.position.set(...TRAY); G.add(X.tray);
  X.brush = SZ.brush(); G.add(X.brush); C.prop('brush', X.brush, brushPose);
  X.stream = SZ.pourStream(0x9a8462, 0.85); G.add(X.stream); X.wstream = SZ.pourStream(0x6a5038, 0.8); G.add(X.wstream);
  // hidrometrálás: főzőpohár, diszpergálószer, keverő, csésze, desztillált víz – a nagy asztalon; alacsony asztal a hengerekkel
  X.beak = SZ.beaker(); G.add(X.beak); C.prop('beak', X.beak, beakPose);
  X.disp = SZ.bottle('Na-HMF\n40 g/l', 0.034, 0.16, 0xd23a2a); G.add(X.disp); C.prop('disp', X.disp, dispPose);
  X.mix = SZ.mixer(); X.mix.position.set(POS.MIX[0], BT, POS.MIX[1]); G.add(X.mix);
  X.cup = SZ.mixCup(); G.add(X.cup); C.prop('cup', X.cup, cupPose);
  X.dw = SZ.bottle('desztillált\nvíz', 0.045, 0.22, 0x2f6fb5); G.add(X.dw); C.prop('dw', X.dw, dwPose);
  { const b = new THREE.Group(); b.position.set(POS.BENCH[0], 0, POS.BENCH[1]); G.add(b); const A = L.mats; bx(-0.34, 0.34, BH - 0.035, BH, -0.3, 0.3, A.lam, b);
    for (const [x, z] of [[-0.31, -0.27], [0.31, -0.27], [-0.31, 0.27], [0.31, 0.27]]) bx(x - 0.02, x + 0.02, 0, BH - 0.035, z - 0.02, z + 0.02, A.al, b); bx(-0.31, 0.31, 0.12, 0.14, -0.27, 0.27, A.al, b); }
  X.sed = SZ.sedCyl(); X.sed.position.set(...SED0); G.add(X.sed);
  X.ctl = SZ.sedCyl({ clear: true }); X.ctl.position.set(...CTL0); G.add(X.ctl);
  X.therm = SZ.thermometer(); X.therm.position.set(CTL0[0] + 0.016, BH + CY.BASE + 0.02, CTL0[2] - 0.012); X.therm.rotation.z = -0.07; G.add(X.therm);
  X.hyd = SZ.hydrometer(); G.add(X.hyd); C.prop('hyd', X.hyd, hydPose);
  X.plg = SZ.plunger(); G.add(X.plg); C.prop('plg', X.plg, plgPose);
  { const h = new THREE.Group(); h.position.set(POS.PLG[0], BH, POS.PLG[1]); G.add(h); const A = L.mats; bx(-0.035, 0.035, 0, 0.01, -0.035, 0.035, A.dk, h); h.add(cyl(0.005, 0.005, 0.4, A.st, 0.022, 0.2, 0, 10));
    const cl = new THREE.Mesh(new THREE.TorusGeometry(0.008, 0.002, 6, 16, Math.PI * 1.4), A.st); cl.rotation.x = Math.PI / 2; cl.position.set(0.012, 0.36, 0); h.add(cl); }
  X.timer = O2.timer(); X.timer.position.set(POS.TIMER[0], BT, POS.TIMER[1]); G.add(X.timer);

  // ---------------- a laboráns ----------------
  const Z = -0.6, aimL = (sd, pr, b, pl) => C.aimLocal(sd, pr, B(b), pl), aimW = (sd, b, p) => C.aimLab(sd, B(b), p);
  C.at(0, 1.6, Z).at(B(15.9), 1.6, Z).at(B(16.0), -3.32, Z).at(B(17.4), -3.32, Z).at(B(17.95), -3.2, -0.5).at(B(18.85), -3.2, -0.5).at(B(19.85), -1.78, -0.58).at(B(21.6), -1.78, -0.58).at(B(22.5), -2.55, -0.57)
   .at(B(23.8), -2.55, -0.57).at(B(24.35), -2.3, Z).at(B(24.6), -2.6, -0.56).at(B(28.95), -2.6, -0.56).at(B(29.95), -2.6, Z)
   .at(B(30.0), -0.93, Z).at(B(30.45), -0.93, Z).at(B(31.0), -1.34, -0.56).at(B(32.25), -1.34, -0.56).at(B(32.95), -1.0, Z).at(B(33.4), -1.32, Z).at(B(35.6), -1.32, Z).at(B(36.2), -1.15, Z).at(B(37.4), -0.55, -0.5, { spd: 0.28 }).at(B(37.6), -0.55, -0.5)
   .at(B(47.9), -0.55, -0.5).at(B(50.55), -0.55, -0.5).at(B(51.7), -1.15, Z, { spd: 0.28 }).at(B(52.0), -1.3, Z).at(B(52.85), -1.45, Z).at(B(66.9), -1.45, Z)
   .at(B(67.0), 2.68, Z).at(B(70.5), 2.68, Z).at(B(70.75), 2.76, Z).at(B(74.3), 2.98, Z).at(B(75.35), 2.98, Z).at(B(75.9), 3.7, -0.4).at(B(76.2), 3.7, -0.4).at(B(76.75), 3.45, -0.5)
   .at(B(77.1), 3.5, -0.45).at(B(77.6), 3.55, -0.4).at(B(78.65), 3.62, -0.4).at(B(79.2), 3.66, -0.4).at(B(82.85), 3.66, -0.4).at(B(83.05), 3.55, -0.45).at(B(83.4), 3.55, -0.45).at(B(83.7), 3.8, -0.4).at(B(97), 3.8, -0.4);
  // szárítószekrény ajtaja (bal kéz a fogantyún, az ajtóval együtt mozog)
  const doorG = (t) => { const th = TL.doorA(t); const h = V(-0.35, 0, 0.3); const loc = (x, y, z) => V(x, y, z).applyAxisAngle(V(0, 1, 0), th).add(h).add(V(POS.OVEN[0], BT, POS.OVEN[1]));
    const c = loc(0.62, 0.325, 0.0425 + 0.004); const Pn = V(0, 0, -1).applyAxisAngle(V(0, 1, 0), th); return powerCyl('L', c, V(0, 1, 0), 0.013, Pn); };
  // tál két kézzel oldalról (kézfogás-helyzet: hüvelyk a peremen, ujjak a falon)
  const bowlG = (sd, pr, r, h) => rimOblique(sd, V((sd === 'L' ? -1 : 1) * (r + 0.003), h + 0.002, 0), V(sd === 'L' ? -1 : 1, 0, 0), 0.03, r + 0.003, V(0, 0, -1), { inset: 0.008 });
  const both = (a, b, pr, g) => { C.hold('L', B(a), B(b), pr, g('L')); C.hold('R', B(a), B(b), pr, g('R')); };
  both(OV.take[0], OV.take[1], 'bowl', (sd) => bowlG(sd, 'bowl', 0.09, 0.05));
  both(WS.carry[0], WS.down[1], 'bowl', (sd) => bowlG(sd, 'bowl', 0.09, 0.05));
  // csap: jobb kéz felülről a karon (a kar a hüvelyk felé mutat)
  const tapG = (t) => { const th = tapA(t); const base = V(POS.TRG[0], BT + TR.H + 0.2, POS.TRG[1] - TR.D / 2 - 0.025); const A = V(0, 0.25, 0.97).normalize().applyAxisAngle(V(0, 1, 0), th);
    const c = V(0, 0.03, 0.078).applyAxisAngle(V(0, 1, 0), th).add(base); return powerCyl('R', c, A, 0.0058, V(0, -1, 0)); };
  C.holdF('R', B(WS.tapOn[0]), B(WS.tapOn[1]), null, tapG); C.holdF('R', B(WS.tapOff[0]), B(WS.tapOff[1]), null, tapG);
  // szita két kézzel oldalról (a keret peremén)
  const sieveG = (sd) => rimOblique(sd, V((sd === 'L' ? -1 : 1) * (SV.R + SV.T), SV.H, 0), V(sd === 'L' ? -1 : 1, 0, 0), SV.H - SV.SK, SV.R + SV.T, V(0, 0, -1), { inset: 0.003 });
  const stackG = (sd) => { const N = V(sd === 'L' ? -0.8 : 0.8, 0, 0.6); return rimOblique(sd, N.clone().multiplyScalar(SV.R + SV.T).add(V(0, SV.H, 0)), N, SV.H - SV.SK, SV.R + SV.T, V(sd === 'L' ? 0.35 : -0.35, 0, -1), { alpha: 0.45 }); };
  both(WS.wash[0], WS.wash[1], 'w2', sieveG);
  both(SS.pair[0], SS.pair[1], 'S0', sieveG);
  both(SS.bowl[0], SS.bowlDn[1], 'bowl', (sd) => bowlG(sd, 'bowl', 0.09, 0.05));
  const lidG = (sd) => rimOblique(sd, V((sd === 'L' ? -1 : 1) * 0.1045, 0.012, 0), V(sd === 'L' ? -1 : 1, 0, 0), 0.011, 0.1045, V(0, 0, -1), { inset: 0.012, alpha: 0.9 });
  both(SS.lid[0], SS.lid[1], 'lid', lidG); both(WG.lid[0], WG.lid[1], 'lid', lidG);
  both(SS.stack[0], SS.stack[1], 'S4', stackG); both(WG.stack[0], WG.stack[1], 'S4', stackG);
  // leszorító gombok: precíziós korongfogás felülről; meghúzáskor a kéz a gombbal fordul
  const knobG = (sd, k) => (t) => { const c = knobTop(k, t); const a0 = C.aimLab(sd, B(SS.clamp[0]), c); return diskTop(sd, c, SH.KR, 0.026, a0.applyAxisAngle(V(0, 1, 0), -(knobA(t) - 0.55) * (k ? 1 : -1) * 0.9), { depth: 0.008 }); };
  for (const [a, b] of [[SS.clamp[0], SS.tight[1]], [WG.loose[0], WG.up[1]]]) { C.holdF('L', B(a), B(b), null, knobG('L', 0)); C.holdF('R', B(a), B(b), null, knobG('R', 1)); }
  { const bp = V(POS.SHK[0] + X.shk.btnP.x, BT + X.shk.btnP.y, POS.SHK[1] + X.shk.btnP.z); C.hold('R', B(SS.start[0]), B(SS.start[1]), null, fingerPress('R', bp, aimW('R', SS.start[0], bp), { n: V(0, 0, 1) })); }
  // mérés: két kéz a szitán; az első ciklusban a jobb kéz a kefét veszi, a bal tartja a szitát
  for (let i = 0; i < 9; i++) { const c = cyc(i); const pr = 'S' + i;
    if (c.brush) { C.hold('L', B(c.a), B(c.set), pr, sieveG('L')); C.hold('R', B(c.a), B(c.tilt), pr, sieveG('R')); C.hold('R', B(c.level - 0.05), B(c.set), pr, sieveG('R'));
      C.holdF('R', B(c.brush[0]), B(c.brush[1]), null, brushG); }
    else both(c.a, c.set, pr, sieveG); }
  // hidrometrálás – álló henger (palack, pohár, csésze, gomb) oldalról: a tenyér a tárgy felé néz, az ujjak előre körbefogják
  const btlG = (sd, pr, r, h) => (b) => powerCyl(sd, V(0, h * 0.42, 0), V(0, 1, 0), r, sideP(sd, aimL(sd, pr, b, [0, h * 0.42, 0])));
  C.hold('R', B(HY.disp[0]), B(HY.disp[1]), 'disp', btlG('R', 'disp', 0.034, 0.16)(HY.disp[0]));
  C.hold('L', B(HY.beak[0]), B(HY.beak[1]), 'beak', btlG('L', 'beak', 0.0445, 0.125)(HY.beak[0]));
  { const bp = V(POS.MIX[0] + X.mix.btnP.x, BT + X.mix.btnP.y, POS.MIX[1] + X.mix.btnP.z); C.hold('R', B(HY.btn[0]), B(HY.btn[1]), null, fingerPress('R', bp, aimW('R', HY.btn[0], bp), { n: V(0, 0, 1) })); }
  C.holdF('L', B(HY.cup[0]), B(HY.cup[0] + 1.05), null, (t) => { const c = V(POS.MIX[0], BT + MX.HEADY + 0.065 + headUp(t), POS.MIX[1] + MX.CUPZ); return powerCyl('L', c, V(0, 1, 0), MX.MR, sideP('L', C.aimLab('L', B(HY.cup[0]), c))); });
  C.hold('R', B(HY.cup[0] + 0.6), B(HY.cup[1]), 'cup', btlG('R', 'cup', 0.046, MX.CUP_H)(HY.cup[0] + 0.6));
  C.hold('L', B(HY.water[0]), B(HY.water[1]), 'dw', btlG('L', 'dw', 0.045, 0.22)(HY.water[0]));
  C.hold('R', B(HY.plg[0]), B(HY.plgOut[1]), 'plg', powerCyl('R', V(0, X.plg.knobY, 0), V(0, 1, 0), 0.011, sideP('R', aimL('R', 'plg', HY.plg[0], [0, X.plg.knobY, 0]))));
  C.holdF('L', B(HY.strokes[0] - 0.15), B(HY.strokes[1] + 0.1), null, (t) => { const c = V(SED0[0], BH + 0.3, SED0[2]); return powerCyl('L', c, V(0, 1, 0), CY.RO, sideP('L', C.aimLab('L', B(HY.strokes[0]), c))); });
  { const bp = V(POS.TIMER[0] + 0.028, BT + 0.028, POS.TIMER[1]); C.hold('L', B(HY.go[0]), B(HY.go[1]), null, fingerPress('L', bp, aimW('L', HY.go[0], bp))); }
  const hydG = (b) => bladeTop('R', V(0, X.hyd.L - 0.004, 0), aimL('R', 'hyd', b, [0, X.hyd.L, 0]), 2 * SZ.HY.SR, { down: 0.012 });
  for (const [a, b] of [HY.hin, HY.hout, H2.in, H2.out]) C.hold('R', B(a), B(b), 'hyd', hydG(a));
  { const f = new THREE.PointLight(0xdfe8ff, 5, 4.5, 1.6); f.position.set(3.2, 2.1, 0.4); G.add(f); }
  if (typeof window !== 'undefined') window.__X = X;
}
// kefe: a szita helyi rendszerében söpör a túlsó (lent lévő) perem felé; a nyél a közeli perem fölött a kéz felé
const BR0 = [POS.BRUSH[0] - 0.04, BT + 0.03, POS.BRUSH[1]], BRQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI, -0.16));   // a fej balra, a nyél jobbra (ahogy használja)
function brushInSieve(t) { const c = cyc(0); const s = CYP[0](t) || { p: tv(TIP), q: qz(TILT) }; const u = seg(t, B(c.brush[0] + 0.3), B(c.brush[1] - 0.25));
  const xs = 0.02 - 0.065 * (0.5 - 0.5 * Math.cos(u * Math.PI * 3)), zs = 0.03 * Math.sin(u * Math.PI * 2);
  const lp = V(xs, SV.MY + 0.034, zs), lq = qz(0.3).multiply(qy(Math.PI)); return { p: lp.applyQuaternion(s.q).add(s.p), q: s.q.clone().multiply(lq) }; }
function brushPose(t) { const c = cyc(0); const a = c.brush[0], b = c.brush[1];
  if (t < B(a + 0.05) || t >= B(b)) return { p: tv(BR0), q: BRQ.clone() };
  const s0 = brushInSieve(B(a + 0.3)), s1 = brushInSieve(B(b - 0.25));
  if (t < B(a + 0.3)) { const k = smooth(seg(t, B(a + 0.05), B(a + 0.3))); const p = tv(BR0).lerp(s0.p, k).add(V(0, 0.06 * Math.sin(Math.PI * k), 0)); return { p, q: BRQ.clone().slerp(s0.q, k) }; }
  if (t < B(b - 0.25)) return brushInSieve(t);
  const k = smooth(seg(t, B(b - 0.25), B(b))); const p = s1.p.clone().lerp(tv(BR0), k).add(V(0, 0.06 * Math.sin(Math.PI * k), 0)); return { p, q: s1.q.clone().slerp(BRQ, k) }; }
function brushG(t) { const s = brushPose(t); const A = V(1, 0, 0).applyQuaternion(s.q), c = V(-0.088, 0, 0).applyQuaternion(s.q).add(s.p); const dn = V(0, -1, 0).applyQuaternion(s.q); return powerCyl('R', c, A, 0.0085, dn); }

export function update(L, t, shot) {
  C.update(t);
  // szárítószekrény
  L.ovenDoor.rotation.y = TL.doorA(t); drawOven(L.ovenDisp, 105); L.ovenGlow.intensity = TL.doorA(t) < -0.05 ? 0.6 : 0;
  // tál: a minta (a mosás után üres, a szárítás után a visszamosott rész)
  { let k = 1; if (t >= B(WS.pour[0])) k = 1 - pourK(t, WS.pour[0], WS.pour[1]) * 0 - smooth(seg(t, B(WS.pour[0] + 0.45), B(WS.pour[1] - 0.25))); if (t >= B(29.0)) k = 0.75; if (t >= B(SS.pour[0])) k = 0.75 * (1 - smooth(seg(t, B(SS.pour[0] + 0.45), B(SS.pour[1] - 0.25)))); X.bowl.setSoil(k, t >= B(29.0) && t < B(30) ? SZ.smats().sand : undefined); }
  // mérleg: a tál (500,0 g, tárázva), később a mérőtál halmozott tömege
  { let m = 0; if (t > B(MASS_SET) && t < B(WS.carry[0] + 0.2)) m = TL.M0;
    if (t >= B(48)) { for (let i = 0; i < 9; i++) { const c = cyc(i); const v = i < 8 ? TL.CUM[i] : TL.CUM[7] + TL.PAN; if (t > B(c.tilt)) m = v; else if (t > B(c.carry)) m = (i ? (i < 8 ? TL.CUM[i - 1] : TL.CUM[7]) : 0) + (v - (i ? (i < 8 ? TL.CUM[i - 1] : TL.CUM[7]) : 0)) * smooth(seg(t, B(c.carry), B(c.tilt))); } }
    drawScale(L.scl.disp, m, 1); X.tray.setSoil(clamp(m / 360) * (t >= B(48) ? 1 : 0)); X.tray.visible = t >= B(30); }
  // mosás: csap, vízsugár, a tálca vize (zavaros → tiszta), a két szita
  { const tp = TL.tapK(t); X.trg.lever.rotation.y = tapA(t); const sw = X.w2.position; X.trg.setStream(tp, BT + 0.06 + P + SV.MY + 0.01 - BT - 0.0); X.trg.stream.position.x = sw.x - POS.TRG[0]; X.trg.stream.position.z = sw.z - POS.TRG[1];
    const wk = TL.washK(t); const dirty = tp > 0.05 ? 1 - smooth(clamp((wk - 0.2) / 0.75)) : 0; X.trg.water.material.color.setRGB(lerp(0.55, 0.42, dirty), lerp(0.66, 0.31, dirty), lerp(0.72, 0.2, dirty)); X.trg.water.material.opacity = 0.35 + 0.35 * dirty;
    const lvl = 0.006 + 0.01 * smooth(seg(t, B(WS.tapOn[1]), B(WS.wash[0] + 1.0))) * (1 - smooth(seg(t, B(WS.tapOff[1]), B(30)))); X.trg.water.scale.y = lvl; X.trg.water.position.y = 0.008 + lvl / 2;
    const poured = smooth(seg(t, B(WS.pour[0] + 0.45), B(WS.pour[1] - 0.25)));
    X.w2.setSoil(t < B(WS.pour[0]) ? 0 : lerp(poured * 150, 50, smooth(clamp((wk - 0.1) / 0.6))) ); X.w063.setSoil(t < B(WS.wash[0]) ? 0 : 90 * smooth(clamp((wk - 0.15) / 0.6))); }
  // szitasor: talaj (öntés után mind a felsőn; rázás közben szétoszlik; méréskor kiürül)
  { const poured = t < B(SS.pour[0]) ? 0 : smooth(seg(t, B(SS.pour[0] + 0.45), B(SS.pour[1] - 0.25))); const dist = smooth(seg(t, B(SS.shake[0] + 0.3), B(SS.shake[0] + 3.5)));
    const chap1 = t < B(16);
    X.sv.forEach((s, k) => { const fin = k < 8 ? TL.RET[k] : TL.PAN; let m = chap1 ? fin : k === 0 ? lerp(TL.MW * poured, fin, dist) : fin * dist; if (t >= B(48)) { const c = cyc(k); if (t > B(c.carry)) m = fin * (1 - smooth(seg(t, B(c.carry), B(c.tilt)))); } s.setSoil(Math.min(m, 90)); }); }
  // szemcsesugár: tálból a szitára, szitáról a mérőtálba
  { let a = null, b = null, r = 0; L.G.updateMatrixWorld(true);
    const lip = (obj, loc) => obj.localToWorld(loc.clone()).sub(L.G.position);
    if (t > B(WS.pour[0]) && t < B(WS.pour[1])) { const k = pourK(t, WS.pour[0], WS.pour[1]); if (k > 0.02) { a = lip(X.bowl, V(-0.092, 0.05, 0)); b = V(a.x, BT + TR.RAIL + P + SV.MY + 0.012, a.z); r = 0.009 * k; } }
    if (t > B(SS.pour[0]) && t < B(SS.pour[1])) { const k = pourK(t, SS.pour[0], SS.pour[1]); if (k > 0.02) { a = lip(X.bowl, V(-0.092, 0.05, 0)); b = V(a.x, BT + SV.MY + 0.012, a.z); r = 0.009 * k; } }
    for (let i = 0; i < 9; i++) { const c = cyc(i); if (t > B(c.carry) && t < B(c.tilt + 0.25)) { const k = smooth(seg(t, B(c.carry + 0.12), B(c.carry + 0.3))) * (1 - smooth(seg(t, B(c.tilt), B(c.tilt + 0.25)))); if (k > 0.02) { a = lip(X.sv[i], V(-SV.R, SV.H, 0)); b = V(a.x, TRAY[1] + 0.012, a.z); r = 0.007 * k; } } }
    X.stream.set(a, b, r); }
  // rázógép
  { X.shk.setClamp(clampY(t)); X.shk.knobs.forEach((k, i) => { k.rotation.y = (i ? -1 : 1) * knobA(t) * 1.6; }); X.shk.vib.position.copy(vib(t));
    const run = TL.shakeOn(t); SZ.drawShaker(X.shk.disp, t < B(4) ? 420 - t : TL.shakeSec(t), 1.5, run); }
  // hidrometrálás: folyadékok, keverő, henger, keverőrúd, hidrométer, stopper
  { X.disp.visible = true; X.beak.setLiq(t < B(HY.disp[0] + 0.5) ? 0.08 : t < B(HY.beak[0]) ? lerp(0.08, 1, smooth(seg(t, B(HY.disp[0] + 0.6), B(HY.disp[1] - 0.5)))) : 1 - smooth(seg(t, B(HY.beak[0] + 0.55), B(HY.beak[1] - 0.45))), 0x6a5038);
    const cupK = t < B(HY.beak[0] + 0.55) ? 0 : t < B(HY.cup[0] + 1.35) ? smooth(seg(t, B(HY.beak[0] + 0.6), B(HY.beak[1] - 0.45))) : 1 - smooth(seg(t, B(HY.cup[0] + 1.45), B(HY.cup[1] - 0.6))); X.cup.setLiq(cupK);
    X.mix.setHead(headUp(t)); X.mix.shaft.rotation.y = t > B(HY.mix[0]) && t < B(HY.mix[1]) ? t * 60 : 0;
    const vol = t < B(HY.cup[0] + 1.45) ? 0 : t < B(HY.water[0]) ? 350 * smooth(seg(t, B(HY.cup[0] + 1.45), B(HY.cup[1] - 0.6))) : 350 + 650 * smooth(seg(t, B(HY.water[0] + 0.6), B(HY.water[1] - 0.5)));
    const sk = TL.settleK(t); const mixed = t < B(HY.strokes[0]) ? 0.8 : 1; const col = new THREE.Color(0x5e4630).lerp(new THREE.Color(0xb59c78), sk * 0.75); X.sed.setLiq(vol, col.getHex(), lerp(0.93, 0.62, sk) * mixed + (1 - mixed) * 0.85);
    X.sed.setSed(t < B(HY.strokes[0]) ? 0.006 : 0.0005 + 0.011 * sk);
    X.disp.cap.visible = !(t > B(HY.disp[0] + 0.2) && t < B(HY.disp[1] - 0.1)); X.dw.cap.visible = !(t > B(HY.water[0] + 0.2) && t < B(HY.water[1] - 0.1));
    { L.G.updateMatrixWorld(true); const at = (o, v) => o.localToWorld(v.clone()).sub(L.G.position); let a = null, b = null, r = 0; const pk = (h) => pourK(t, h[0] + 0.2 + (h[1] - h[0]) * 0.3, h[1] - (h[1] - h[0]) * 0.28);
      if (t > B(HY.disp[0]) && t < B(HY.disp[1])) { const k = pk(HY.disp); if (k > 0.02) { a = at(X.disp, V(0, 0.165, 0)); b = V(a.x, BT + 0.003 + 0.105 * X.beak.liq.scale.y / 0.105, a.z); r = 0.004 * k; } }
      if (t > B(HY.beak[0]) && t < B(HY.beak[1])) { const k = pk(HY.beak); if (k > 0.02) { a = at(X.beak, V(0.046, 0.125, 0)); b = V(a.x, BT + MX.BASE + 0.03, a.z); r = 0.006 * k; } }
      if (t > B(HY.cup[0] + 1.3) && t < B(HY.cup[1] - 0.45)) { const k = smooth(seg(t, B(HY.cup[0] + 1.4), B(HY.cup[0] + 1.6))) * (1 - smooth(seg(t, B(HY.cup[1] - 0.8), B(HY.cup[1] - 0.55)))); if (k > 0.02) { a = at(X.cup, V(-MX.CUP_R, MX.CUP_H, 0)); b = V(a.x, BH + CY.BASE + 0.1, a.z); r = 0.006 * k; } }
      if (t > B(HY.water[0]) && t < B(HY.water[1])) { const k = pk(HY.water); if (k > 0.02) { a = at(X.dw, V(0, 0.225, 0)); b = V(a.x, BH + CY.BASE + 0.25, a.z); r = 0.005 * k; } }
      X.wstream.set(a, b, r); X.wstream.material.color.setHex(t > B(HY.water[0]) && t < B(HY.water[1]) || t < B(HY.disp[1]) ? 0xcfe6f2 : 0x6a5038); }
    X.plg.visible = true; X.timer.visible = true; const sec = TL.hydMin(t) * 60; O2.drawTimer(X.timer.scr, sec < 3600 ? Math.floor(sec / 60) + ':' + String(Math.floor(sec % 60)).padStart(2, '0') : Math.floor(sec / 3600) + ' h ' + String(Math.floor((sec % 3600) / 60)).padStart(2, '0')); }
  C.apply(t, L.tech, shot && shot.look !== undefined ? { look: shot.look } : {});
  return { X, C };
}
const MASS_SET = OV.take[1] - 0.1;
export const __X = X;
