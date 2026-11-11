// Zsugorodási határ – labor: üveglap a 30 mm vastag talajlappal, kiszúró gyűrű toldattal, spatula, kitoló, tolómérő a tartójában,
// mérleg a tárázott üvegtállal, szárítószekrény. Minden mozdulatot a laboráns keze végez (kiszúrás, kiemelés, toldat le, levágás,
// kitolás a tálba, mérés, tolómérő, szárítás szobahőn és 105 °C-on, száraz mérés, lefektetés).
import { THREE, V, BT, M, cyl, bx, drawScale, drawOven } from '../tm_lab/room.js';
import { Choreo, keyed, stdPoses } from '../tm_lab/act.js';
import { diskTop, powerCyl, rimOblique, flatPalm, fingerPress, pinchSide } from '../tm_lab/grips3.js';
import * as KZ from '../tm_lab/konz2.js';
import { SP } from '../tm_lab/konz2.js';
import * as ZS from '../tm_lab/zsug.js';
import { ZR, PU, DISH, CAL, CH } from '../tm_lab/zsug.js';
import * as TL from './timeline.js';
import { tb, RING_ON, PRESS, LIFT, COLL, TRIM, LHOLD, TODISH, PUSH, LHOLD2, CAL1, DRY1, ROOM, TOOVEN, OVENT, BACK, CAL2, TIP, CAL3, CK } from './timeline.js';
import { clamp, lerp, smooth, seg } from '../../kit/util.js';
const B = (b) => tb(b);
const tv = (a) => (a && a.isVector3) ? a.clone() : V(a[0], a[1], a[2]);
const QI = new THREE.Quaternion();
const qy = (a) => new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), a), qz = (a) => new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), a);
// ---- elrendezés (labor-helyi x, z) ----
export const POS = { PLATE: [-2.15, -1.0], SLAB: [-2.22, -1.025], RC0: [-2.08, -0.95], TRIM: [-2.22, -0.925], COLL1: [-2.1, -1.07], SPR: [-1.995, -0.885], PUS: [-2.365, -0.98],
  CALH: [-2.4, -0.832], SCL: -2.52, DRY: [-2.8, -1.02], RINGDN: [-2.7, -1.1], OVEN: [-3.3, -1.25], BODY: -2.16, BODYS: -2.42, SPREST: [-1.904, -0.885] };
const PLY = BT + 0.006, SLABH = 0.03, SLABTOP = PLY + SLABH;
export const DISHP = [POS.SCL, BT + 0.069, -1.06], FLOOR = DISHP[1] + DISH.F;
const DRYP = [POS.DRY[0], BT, POS.DRY[1]], OVB = [POS.OVEN[0], BT + 0.366, POS.OVEN[1] + 0.18];
const RC0 = [POS.RC0[0], PLY, POS.RC0[1]], RSLAB = [POS.SLAB[0], SLABTOP, POS.SLAB[1]], RGLASS = [POS.SLAB[0], PLY, POS.SLAB[1]], RTRIM = [POS.TRIM[0], PLY, POS.TRIM[1]];
const RDISH = [DISHP[0], FLOOR, DISHP[2]], RDN = [POS.RINGDN[0], BT, POS.RINGDN[1]], PUS0 = [POS.PUS[0], BT, POS.PUS[1]];
const QR = qy(Math.PI), tiltR = (a) => QR.clone().premultiply(qz(a));
const tipP = (tip, a) => ({ p: tv(tip).add(V(SP.BL * Math.cos(a), SP.BL * Math.sin(a) + 0.0012, 0)), q: tiltR(a) });
const SPA = 0.2, SPRT = [POS.SPR[0] - 0.1, PLY, POS.SPR[1]];        // nyugalomban a penge hegye az üveglapon, a nyél vége a kis támasztékon (a kéz alá fér)
const CALR = [POS.CALH[0], BT + CH.H + CAL.W / 2, POS.CALH[1]];
let C, X = {};
export function board(g) { g.strokeStyle = '#2b4f9e'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(90, 440); g.lineTo(960, 440); g.moveTo(90, 440); g.lineTo(90, 50); g.stroke();
  g.strokeStyle = '#c0281e'; g.beginPath(); g.moveTo(90, 290); g.lineTo(420, 290); g.lineTo(800, 110); g.stroke(); g.setLineDash([10, 10]); g.strokeStyle = '#2b4f9e'; g.lineWidth = 3; g.beginPath(); g.moveTo(420, 290); g.lineTo(420, 440); g.stroke(); g.setLineDash([]);
  g.fillStyle = '#2b4f9e'; g.font = 'italic 700 40px Arial'; g.fillText('V', 30, 70); g.fillText('w', 900, 490); g.fillText('w', 400, 490); g.font = 'italic 700 26px Arial'; g.fillText('S', 430, 500);
  g.fillStyle = '#c0281e'; g.font = 'italic 600 34px Arial'; g.fillText('telített ág', 600, 170); }

// ---------------- a gyűrű (a toldattal) ----------------
const twist = (t) => 0.35 * smooth(seg(t, B(LIFT[0] + 0.3), B(LIFT[0] + 0.75))) * (1 - smooth(seg(t, B(LIFT[0] + 0.85), B(LIFT[1] - 0.15))));
const ringCarry1 = keyed([{ t: B(RING_ON[0] + 0.2), p: RC0 }, { t: B(RING_ON[1] - 0.1), p: RSLAB, lift: 0.05 }]);
const ringCarry2 = keyed([{ t: B(LIFT[0] + 0.85), p: RGLASS }, { t: B(LIFT[1] - 0.15), p: RTRIM, lift: 0.045 }]);
const ringCarry3 = keyed([{ t: B(TODISH[0] + 0.2), p: RTRIM }, { t: B(TODISH[1] - 0.15), p: RDISH, lift: 0.06 }]);
const ringCarry4 = keyed([{ t: B(PUSH[0] + 3.15), p: [RDISH[0], FLOOR + 0.045, RDISH[2]] }, { t: B(LHOLD2[1] - 0.15), p: RDN, lift: 0.03 }]);
const RYAW = 0.5;                                                  // letételkor a gyűrű (és vele a csípő kéz) a test felé fordul
function ringPose(t) {
  if (t < B(RING_ON[0] + 0.2)) return { p: tv(RC0), q: QI.clone() };
  if (t < B(PRESS[0])) return ringCarry1(t);
  if (t < B(LIFT[0] + 0.85)) { const p = tv(RSLAB); p.y -= TL.pressD(t); return { p, q: qy(twist(t)) }; }
  if (t < B(TODISH[0] + 0.2)) { const s = ringCarry2(t); return { p: s.p, q: qy(twist(t)) }; }
  if (t < B(PUSH[0])) return ringCarry3(t);
  if (t < B(PUSH[0] + 3.15)) { const p = tv(RDISH); p.y += 0.045 * smooth(seg(t, B(PUSH[0] + 1.4), B(PUSH[0] + 2.4))); return { p, q: QI.clone() }; }
  if (t < B(LHOLD2[1])) { const s = ringCarry4(t); return { p: s.p, q: qy(RYAW * smooth(seg(t, B(PUSH[0] + 3.15), B(LHOLD2[1] - 0.3)))) }; }
  return { p: tv(RDN), q: qy(RYAW) }; }
const collOff = keyed([{ t: B(COLL[0] + 0.35), p: [RTRIM[0], PLY + ZR.H, RTRIM[2]] }, { t: B(COLL[0] + 0.8), p: [RTRIM[0], PLY + ZR.H + 0.035, RTRIM[2]] }, { t: B(COLL[1] - 0.15), p: [POS.COLL1[0], PLY, POS.COLL1[1]], lift: 0.01 }]);
function collPose(t) { if (t < B(COLL[0] + 0.35)) { const r = ringPose(t); return { p: V(0, ZR.H, 0).applyQuaternion(r.q).add(r.p), q: r.q }; } return collOff(t); }

// ---------------- spatula: felvétel, vágás a gyűrű síkján (a túlsó oldaltól maga felé húzva), a levágott korong a talajlapra ----------------
const TRT = PLY + ZR.H;                                           // a gyűrű teteje a vágáskor
const TIPX = POS.TRIM[0] - 0.012, Z0 = POS.TRIM[1] - 0.035, Z1 = POS.TRIM[1] + 0.0025, ZS_ = POS.SLAB[1] + 0.026;
export const TCUT = TRIM[0] + 0.7 + 0.6 * (((POS.TRIM[1] + 0.0125 - 0.011) - Z0) / (Z1 - Z0));   // a vágás vége: a penge közeli éle túljut a csonkon
function spatPose(t) {
  const rest = tipP(SPRT, SPA);
  if (t < B(TRIM[0]) || t >= B(TRIM[1])) return rest;
  const a = TRIM[0]; const sweepZ = (k) => lerp(Z0, Z1, k);
  const P0 = tipP([TIPX, TRT, Z0], 0), P1 = tipP([TIPX, TRT, Z1], 0), P2 = tipP([TIPX, SLABTOP + 0.008, ZS_], 0), P3 = tipP([TIPX, SLABTOP + 0.0004, ZS_], 0), P4 = tipP([TIPX + 0.045, SLABTOP + 0.0004, ZS_], 0);
  const btw = (A, Bq, a1, b1, arc = 0) => { const k = smooth(seg(t, B(a1), B(b1))); return { p: A.p.clone().lerp(Bq.p, k).add(V(0, arc * Math.sin(Math.PI * k), 0)), q: A.q.clone().slerp(Bq.q, k) }; };
  if (t < B(a + 0.7)) return btw(rest, P0, a + 0.15, a + 0.7, 0.04);
  if (t < B(a + 1.3)) { const k = seg(t, B(a + 0.7), B(a + 1.3)); return tipP([TIPX, TRT, sweepZ(k)], 0); }
  if (t < B(a + 1.8)) return btw(P1, P2, a + 1.3, a + 1.8, 0.01);
  if (t < B(a + 2.05)) return btw(P2, P3, a + 1.8, a + 2.05);
  if (t < B(a + 2.35)) return btw(P3, P4, a + 2.05, a + 2.35);
  return btw(P4, rest, a + 2.35, TRIM[1] - 0.05, 0.03); }
// ---------------- kitoló ----------------
const pusPose = (() => { const hi = [RDISH[0], FLOOR + 0.025 + 0.04, RDISH[2]], on = [RDISH[0], FLOOR + 0.025, RDISH[2]], up = [RDISH[0], FLOOR + 0.025 + 0.075, RDISH[2]];
  return keyed([{ t: B(PUSH[0] + 0.25), p: PUS0 }, { t: B(PUSH[0] + 0.8), p: hi, lift: 0.06 }, { t: B(PUSH[0] + 1.3), p: on }, { t: B(PUSH[0] + 2.5), p: on }, { t: B(PUSH[0] + 3.0), p: up }, { t: B(PUSH[1] - 0.12), p: PUS0, lift: 0.01 }]); })();
// ---------------- tolómérő: a mérőcsőrök közti középpont kulcsai (M), a nyílás a timeline-ból ----------------
const SPC = [DISHP[0], FLOOR, DISHP[2]];                                 // a próbatest talpának közepe
const calM = (() => { const r = (open) => [CALR[0] + CAL.J0 + open / 2, CALR[1], CALR[2]]; const R0 = r(0.004), Ru = [R0[0], R0[1] + 0.06, R0[2]], Rh = [R0[0], R0[1] + 0.03, R0[2]];
  const Sd = [SPC[0], FLOOR + 0.049, SPC[2]], Sa = [SPC[0], FLOOR + 0.084, SPC[2]], Ld = [SPC[0] + 0.0229, FLOOR + 0.049, SPC[2]], La = [Ld[0], FLOOR + 0.084, Ld[2]], Pk = [SPC[0] + 0.03, FLOOR + 0.125, SPC[2] + 0.015];
  return keyed([{ t: B(CAL1[0] + 0.2), p: R0 }, { t: B(CK.up1), p: Ru }, { t: B(CK.ov1), p: Sa }, { t: B(CK.dn1), p: Sd }, { t: B(CK.lf1), p: Sd }, { t: B(CK.bk1), p: Sa }, { t: B(CK.bk1 + 0.4), p: Rh }, { t: B(CAL1[1] - 0.05), p: R0 },
    { t: B(CAL2[0] + 0.2), p: R0 }, { t: B(CK.up2), p: Ru }, { t: B(CK.ov2), p: Sa }, { t: B(CK.dn2), p: Sd }, { t: B(CK.op2), p: Sd }, { t: B(CK.lf2), p: Sa }, { t: B(CK.lf2 + 0.4), p: Pk }, { t: B(CAL3[0]), p: Pk },
    { t: B(CK.ov3), p: La }, { t: B(CK.dn3), p: Ld }, { t: B(CK.lf3), p: Ld }, { t: B(CK.bk3), p: La }, { t: B(CK.bk3 + 0.3), p: Rh }, { t: B(CAL3[1] - 0.05), p: R0 }]); })();
const calPose = (t) => { const m = calM(t); return { p: m.p.add(V(-(CAL.J0 + TL.calOpen(t) / 2), 0, 0)), q: QI.clone() }; };
// ---------------- üvegtál ----------------
const dishPose = (() => { const k1 = keyed([{ t: B(DRY1[0] + 0.2), p: DISHP }, { t: B(DRY1[1] - 0.15), p: DRYP, lift: 0.05 }]);
  const k2 = keyed([{ t: B(TOOVEN[0] + 0.2), p: DRYP }, { t: B(TOOVEN[0] + 0.9), p: [DRYP[0] - 0.04, BT + 0.16, -0.94] }, { t: B(TOOVEN[0] + 2.0), p: [POS.OVEN[0] + 0.04, OVB[1] + 0.02, -0.9] }, { t: B(TOOVEN[1] - 0.4), p: [OVB[0], OVB[1] + 0.012, OVB[2]] }, { t: B(TOOVEN[1] - 0.15), p: OVB }]);
  const k3 = keyed([{ t: B(BACK[0] + 0.2), p: OVB }, { t: B(BACK[0] + 0.5), p: [OVB[0], OVB[1] + 0.012, OVB[2]] }, { t: B(BACK[0] + 1.1), p: [POS.OVEN[0] + 0.02, OVB[1] + 0.02, -0.9] }, { t: B(BACK[0] + 1.8), p: [-3.18, BT + 0.27, -0.86] },
    { t: B(BACK[0] + 3.0), p: [-2.62, BT + 0.19, -0.9] }, { t: B(BACK[1] - 0.4), p: [DISHP[0], DISHP[1] + 0.03, DISHP[2]] }, { t: B(BACK[1] - 0.15), p: DISHP }]);
  return (t) => { if (t < B(DRY1[0])) return { p: tv(DISHP), q: QI.clone() }; if (t < B(TOOVEN[0])) return k1(t); if (t < B(BACK[0])) return k2(t); return k3(t); }; })();
// ---------------- próbatest: zsugorodás, lefektetés ----------------
const tipA = (t) => { const a = 0.9 * smooth(seg(t, B(TIP[0] + 0.3), B(TIP[0] + 0.8))); const f = seg(t, B(TIP[0] + 0.8), B(TIP[0] + 1.0)); return t < B(TIP[0] + 0.8) ? a : 0.9 + (Math.PI / 2 - 0.9) * f * f; };

export function build(L, R) {
  stdPoses(); const G = L.G; C = new Choreo(L, { hang: true }); X.C = C; L.pc.g.visible = false;
  L.scl.G.position.set(POS.SCL, BT, -1.05);
  X.plate = KZ.glassPlate3(); X.plate.position.set(POS.PLATE[0], BT, POS.PLATE[1]); G.add(X.plate);
  X.slab = ZS.soilSlab(0.09, SLABH, 0.08); X.slab.position.set(POS.SLAB[0], PLY, POS.SLAB[1]); G.add(X.slab);
  X.ring = ZS.cutRing(); G.add(X.ring); C.prop('ring', X.ring, ringPose);
  X.coll = ZS.collar(); G.add(X.coll); C.prop('coll', X.coll, collPose);
  X.spR = KZ.spatula2(); G.add(X.spR); C.prop('spR', X.spR, spatPose);
  bx(POS.SPREST[0] - 0.01, POS.SPREST[0] + 0.01, BT, BT + 0.038, POS.SPREST[1] - 0.012, POS.SPREST[1] + 0.012, M(0x3a2c22, { roughness: 0.6 }), G);   // spatulatámasz
  X.slice = ZS.slice(); G.add(X.slice);
  X.pus = ZS.pusher(); G.add(X.pus); C.prop('pus', X.pus, pusPose);
  X.calH = ZS.calHolder(); X.calH.position.set(POS.CALH[0], BT, POS.CALH[1]); G.add(X.calH);
  X.cal = ZS.caliper(); G.add(X.cal); C.prop('cal', X.cal, calPose);
  X.dish = ZS.glassDish(); G.add(X.dish); C.prop('dish', X.dish, dishPose);
  X.spec = ZS.specimen(); X.dish.add(X.spec);
  // a levágott korong helye a pengén (a vágás végén)
  { const s = spatPose(B(TCUT)); const m = new THREE.Matrix4().compose(s.p, s.q, V(1, 1, 1)).invert(); X.sliceLoc = V(POS.TRIM[0], TRT + 0.0024, POS.TRIM[1]).applyMatrix4(m); }
  // ---------------- a laboráns ----------------
  const Z = -0.6;
  C.at(0, POS.BODY, Z).at(B(14.0), POS.BODY, Z).at(B(29.6), POS.BODY, Z).at(B(31.0), POS.BODYS, Z, { spd: 0.15 })
   .at(B(43.5), POS.BODYS, Z).at(B(44.6), -2.74, Z, { spd: 0.25 }).at(B(45.0), -2.74, Z).at(B(45.02), 0.5, Z).at(B(48.98), 0.5, Z).at(B(49.0), -2.74, Z)
   .at(B(49.7), -2.74, Z).at(B(51.0), -3.28, Z, { spd: 0.3 }).at(B(52.0), -3.28, Z).at(B(52.02), 0.5, Z).at(B(54.58), 0.5, Z).at(B(54.6), -3.28, Z)
   .at(B(56.3), -3.28, Z).at(B(57.9), POS.BODYS, Z, { spd: 0.3 }).at(B(105), POS.BODYS, Z);
  const aimL = (sd, pr, b, pl) => C.aimLocal(sd, pr, B(b), pl);
  // gyűrű a toldattal: korongfogás felülről a toldat peremén
  const collG = (b) => diskTop('R', V(0, ZR.CH, 0), ZR.RO, ZR.CH, aimL('R', 'coll', b, [0, ZR.CH, 0]), { depth: 0.005 });
  C.hold('R', B(RING_ON[0]), B(RING_ON[1]), 'coll', collG(RING_ON[0]));
  // kiszúrás: a jobb tenyér a toldat tetején nyom
  C.hold('R', B(PRESS[0]), B(PRESS[1]), 'coll', flatPalm('R', V(0, ZR.CH, 0), V(0, 1, 0), aimL('R', 'coll', PRESS[0], [0, ZR.CH, 0]), { gap: 0.003 }));
  C.hold('R', B(LIFT[0]), B(LIFT[1]), 'coll', collG(LIFT[0]));
  C.hold('R', B(COLL[0]), B(COLL[1]), 'coll', collG(COLL[0]));
  // a gyűrű oldalt-felülről csípve (hüvelyk elöl, mutató- és középső ujj hátul): a tengely fölötti tér szabad marad
  const ringPinch = pinchSide('L', V(0, ZR.H, 0), ZR.RO, V(-1, 0, 1), V(1, 0, 1), { depth: 0.01 });
  C.hold('L', B(LHOLD[0]), B(LHOLD[1]), 'ring', ringPinch);
  // a tálnál a megszokott csípés; a letételkor (alacsonyan, a test előtt) a kéz meredekebben, felülről fog
  const pinchLow = (k) => pinchSide('L', V(0, ZR.H, 0), ZR.RO, V(-1, 0, 1), V(1, 0, 1), { depth: 0.01, fy: 0.5 + 0.3 * k, palmOut: 0.07 - 0.02 * k, palmH: 0.04 + 0.02 * k });
  C.holdF('L', B(LHOLD2[0]), B(LHOLD2[1]), 'ring', (t) => pinchLow(Math.round(4 * smooth(seg(t, B(PUSH[0] + 3.2), B(LHOLD2[1] - 0.2)))) / 4));
  // spatula: erőfogás a nyélen (tenyér lefelé, hüvelyk a penge felé)
  C.hold('R', B(TRIM[0]), B(TRIM[1]), 'spR', powerCyl('R', V(SP.GRIP, 0, 0), V(1, 0, 0), SP.HR, V(0, -1, 0)));
  // gyűrű a tálba: korongfogás a gyűrű peremén
  C.hold('R', B(TODISH[0]), B(TODISH[1]), 'ring', diskTop('R', V(0, ZR.H, 0), ZR.RO, ZR.H, aimL('R', 'ring', TODISH[0], [0, ZR.H, 0]), { depth: 0.008 }));
  // kitoló: a fogantyú tetejét felülről fogja (korongfogás), így nyomja le és emeli ki
  C.hold('R', B(PUSH[0]), B(PUSH[1]), 'pus', diskTop('R', V(0, PU.HY1, 0), PU.HR, 0.05, C.aimLab('R', B(PUSH[0] + 1.5), [RDISH[0], 1, RDISH[2]]), { depth: 0.012 }));
  // tolómérő: a kijelzős házat felülről fogja, a hüvelyk a rúdon a csőrök felé (a tolóházzal együtt mozog)
  const calG = (t) => powerCyl('R', V(CAL.J0 + TL.calOpen(t) + CAL.HX, 0.002, 0), V(-1, 0, 0), 0.009, V(0, -1, 0));
  C.holdF('R', B(CAL1[0]), B(CAL1[1]), 'cal', calG); C.holdF('R', B(CAL2[0]), B(CAL3[1]), 'cal', calG);
  // üvegtál két kézzel, oldalról (hüvelyk a peremen, az ujjak a falon)
  const dishG = (sd) => rimOblique(sd, V((sd === 'L' ? -1 : 1) * DISH.R, DISH.H, 0), V(sd === 'L' ? -1 : 1, 0, 0), DISH.H, DISH.R, V(0, 0, -1), { inset: 0.004 });
  for (const [a, b] of [DRY1, TOOVEN, BACK]) { C.hold('L', B(a), B(b), 'dish', dishG('L')); C.hold('R', B(a), B(b), 'dish', dishG('R')); }
  // lefektetés: a bal mutatóujj a próbatest bal oldalát a teteje közelében jobbra billenti
  C.holdF('L', B(TIP[0] + 0.25), B(TIP[0] + 0.85), null, (t) => { const r = 0.0229 / 2, h = 0.0229, a = tipA(t); const q = qz(-a); const piv = V(r, 0, 0);
    const pt = V(-r, h - 0.004, 0).sub(piv).applyQuaternion(q).add(piv).add(V(SPC[0], SPC[1], SPC[2])); const n = V(-1, 0.25, 0).normalize().applyQuaternion(q);
    return fingerPress('L', pt, V(1, 0, -0.3), { n, F: V(0.5, -0.6, -0.62), P: V(-0.55, -0.8, 0) }); });
  if (typeof window !== 'undefined') window.__X = X;
}

export function update(L, t, shot) {
  C.update(t);
  // gyűrű-mag: kiszúráskor a lap tetejéig; kiemelve 30 mm (a toldatban 5 mm); levágva 25 mm; a tálban a próbatest veszi át
  { let y1 = 0; if (t >= B(PRESS[0])) y1 = TL.pressD(t); if (t >= B(PRESS[1])) y1 = 0.03; if (t >= B(TCUT)) y1 = ZR.H; if (t >= B(TODISH[1] - 0.15) || t < B(PRESS[0])) y1 = 0; X.ring.setCore(0, y1); }
  X.slab.hole.visible = t >= B(LIFT[0] + 0.9);
  // levágott korong: a csonk a gyűrű fölött (a vágásig a gyűrű-mag része), a pengén, majd a talajlapon
  { const a = TRIM[0]; X.slice.visible = t >= B(TCUT);
    if (t >= B(TCUT) && t < B(a + 2.05)) { const s = C.propPose('spR', t); X.slice.position.copy(X.sliceLoc.clone().applyQuaternion(s.q).add(s.p)); X.slice.quaternion.copy(s.q.clone().multiply(QR.clone().invert())); }
    else if (t >= B(a + 2.05)) { X.slice.position.set(POS.TRIM[0], SLABTOP + 0.0028 * (1 - smooth(seg(t, B(a + 2.2), B(a + 2.35)))), ZS_ + 0.0015); X.slice.quaternion.identity(); } }
  // próbatest a tálban
  { const k = TL.shrinkK(t), d = lerp(0.025, 0.0229, k); X.spec.visible = t < B(4) || t >= B(TODISH[1] - 0.15); X.spec.set(d, d, TL.dryK(t));
    const a = t >= B(TIP[0]) ? tipA(t) : 0; const r = d / 2; const q = qz(-a); const piv = V(r, 0, 0); X.spec.quaternion.copy(q); X.spec.position.copy(piv.clone().sub(piv.clone().applyQuaternion(q))).add(V(0, DISH.F, 0)); }
  // tolómérő
  { const o = TL.calOpen(t); X.cal.set(o); const s = (o * 1000).toFixed(2).replace('.', ','); if (X._cal !== s) { ZS.drawCal(X.cal.disp, s); X._cal = s; } }
  // mérleg, szárítószekrény
  { const m = TL.scaleM(t); const k = m.toFixed(2); if (X._m !== k) { drawScale(L.scl.disp, m, 2); X._m = k; } }
  L.ovenDoor.rotation.y = TL.doorA(t); if (!X._ov) { drawOven(L.ovenDisp, 105); X._ov = 1; } L.ovenGlow.intensity = (t >= B(OVENT[0]) && t < B(OVENT[1])) ? 0.6 : 0;
  C.apply(t, L.tech, shot && shot.look !== undefined ? { look: shot.look } : {});
  return { X, C };
}
export const __X = X;
