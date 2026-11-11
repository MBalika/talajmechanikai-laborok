// Közvetlen nyíróvizsgálat – labor: üveglap a zavartalan minta szeletével, négyzetes kiszúró keret toldattal, acélvonalzó a tálcán, mérleg;
// a nyírógép (kád-kocsi a nyíródobozzal, motoros hajtás, vízszintes erőmérő állítható karral, függőleges terhelőegység C-keretben), vezérlő, főzőpohár.
// Minden mozdulatot a laboráns keze végez: kiszúrás, kiemelés, toldat le, lehúzás, mérés, a keret a dobozra, kitolás, terhelőfej, az erőmérő karja,
// terhelés (vezérlő), víz a kádba, rögzítőcsavarok ki, emelőcsavarok (rés), indítás.
import { THREE, V, BT, M, cyl, bx, drawScale, drawPC } from '../tm_lab/room.js';
import { Choreo, keyed, stdPoses } from '../tm_lab/act.js';
import { diskTop, powerCyl, flatPalm, fingerPress, pinchSide, bladeTop, boxTop } from '../tm_lab/grips3.js';
import * as O2 from '../tm_lab/oedo2.js';
import * as KZ from '../tm_lab/konz2.js';
import * as NY from '../tm_lab/nyir.js';
import { SB, RG, CAPU, CUT, PSH } from '../tm_lab/nyir.js';
import { pourStream } from '../tm_lab/szem.js';
import * as TL from './timeline.js';
import { tb, ON, PRESS, LIFT, COLL, LHOLD, STRIKE, WEIGH, TOBOX, PUSH, CUTOFF, CAP, KNOB, BTN1, RAMDN, POUR, FILL, CONS, LOCK, LIFTS, BTN2, SHEAR, PLANE } from './timeline.js';
import { clamp, lerp, smooth, seg } from '../../kit/util.js';
const B = (b) => tb(b);
const tv = (a) => (a && a.isVector3) ? a.clone() : V(a[0], a[1], a[2]);
const QI = new THREE.Quaternion();
const qy = (a) => new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), a), qz = (a) => new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), a);
// ---- elrendezés (labor-helyi x, z) ----
export const POS = { RIG: [1.0, -1.02], PLATE: [0.06, -1.0], SLAB: [-0.04, -1.05], CUT0: [-0.03, -0.93], TRIM: [0.18, -0.98], TRAY: [-0.27, -1.0], SCL: 0.36,
  PUS0: [1.23, -0.845], CAP0: [1.12, -0.845], CUTDN: [0.8, -0.845], BEAK0: [1.38, -0.95], CTRL: [1.62, -1.0], PC: 2.05 };
const RX = POS.RIG[0], RZ = POS.RIG[1];
const PLY = BT + 0.006, SLABH = 0.025, SLT = PLY + SLABH;
const BOXTOP = BT + RG.FL + SB.HL + SB.HU, SPECB = BT + RG.FL + SB.FB + SB.ST, PANY = BT + 0.069;
export const W = { BOXTOP, SPECB, RX, RZ };
export function board(g) { g.strokeStyle = '#2b4f9e'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(80, 60); g.lineTo(80, 440); g.lineTo(960, 440); g.stroke();
  g.strokeStyle = '#c0281e'; g.beginPath(); g.moveTo(80, 400); g.lineTo(900, 120); g.stroke(); g.fillStyle = '#2b4f9e'; g.font = 'italic 700 40px Arial'; g.fillText('τ', 30, 80); g.fillText('σ', 900, 490); g.fillStyle = '#c0281e'; g.fillText('τ = c′ + σ · tg φ′', 380, 230); }
let C, X = {};

// ---------------- kiszúró keret, toldat, próbatest ----------------
const CUT0 = [POS.CUT0[0], PLY, POS.CUT0[1]], CSLAB = [POS.SLAB[0], SLT, POS.SLAB[1]], CGLASS = [POS.SLAB[0], PLY, POS.SLAB[1]], CTRIM = [POS.TRIM[0], PLY, POS.TRIM[1]];
const CSCL = [POS.SCL, PANY, -1.06], CBOX = [RX, BOXTOP, RZ], CDN = [POS.CUTDN[0], BT, POS.CUTDN[1]];
const cutK1 = keyed([{ t: B(ON[0] + 0.2), p: CUT0 }, { t: B(ON[1] - 0.1), p: CSLAB, lift: 0.05 }]);
const cutK2 = keyed([{ t: B(LIFT[0] + 0.5), p: CGLASS }, { t: B(LIFT[0] + 0.9), p: [CGLASS[0], CGLASS[1] + 0.04, CGLASS[2]] }, { t: B(LIFT[1] - 0.15), p: CTRIM, lift: 0.02 }]);
const cutK3 = keyed([{ t: B(WEIGH[0] + 0.2), p: CTRIM }, { t: B(WEIGH[1] - 0.15), p: CSCL, lift: 0.06 }]);
const cutK4 = keyed([{ t: B(TOBOX[0] + 0.2), p: CSCL }, { t: B(TOBOX[1] - 0.6), p: [RX, BOXTOP + 0.035, RZ], lift: 0.03 }, { t: B(TOBOX[1] - 0.15), p: CBOX }]);
const cutK5 = keyed([{ t: B(CUTOFF[0] + 0.2), p: CBOX }, { t: B(CUTOFF[0] + 0.6), p: [RX, BOXTOP + 0.06, RZ] }, { t: B(CUTOFF[1] - 0.15), p: CDN, lift: 0.04 }]);
const twist = (t) => 0.25 * Math.sin(Math.PI * smooth(seg(t, B(LIFT[0] + 0.15), B(LIFT[0] + 0.5))));         // kiemelés előtt kissé elfordítja (leválik a talpáról)
function cutPose(t) {
  if (t < B(ON[0] + 0.2)) return { p: tv(CUT0), q: QI.clone() };
  if (t < B(PRESS[0])) return cutK1(t);
  if (t < B(LIFT[0] + 0.5)) { const p = tv(CSLAB); p.y -= TL.pressD(t); return { p, q: qy(twist(t)) }; }
  if (t < B(WEIGH[0])) return cutK2(t);
  if (t < B(TOBOX[0])) return cutK3(t);
  if (t < B(CUTOFF[0])) return cutK4(t);
  return cutK5(t); }
const COLLDN = [0.12, PLY, -1.09];
const collK = keyed([{ t: B(COLL[0] + 0.35), p: [CTRIM[0], PLY + CUT.H, CTRIM[2]] }, { t: B(COLL[0] + 0.8), p: [CTRIM[0], PLY + CUT.H + 0.03, CTRIM[2]] }, { t: B(COLL[1] - 0.15), p: COLLDN, lift: 0.02 }]);
function collPose(t) { if (t < B(COLL[0] + 0.35)) { const c = cutPose(t); return { p: V(0, CUT.H, 0).applyQuaternion(c.q).add(c.p), q: c.q }; } return collK(t); }
// acélvonalzó: a tálca hornyában élére állítva; két kézzel a keret mögé, lesüllyeszti a keret síkjáig, és maga felé húzva lehúzza a fölösleget
const RU0 = { p: [POS.TRAY[0], BT + 0.0155, POS.TRAY[1] - 0.002], r: [0, 0, 0] };
const rulerK = keyed([{ t: B(STRIKE[0] + 0.2), ...RU0 }, { t: B(STRIKE[0] + 0.95), p: [CTRIM[0], PLY + CUT.H + 0.006, CTRIM[2] - 0.07], lift: 0.06 }, { t: B(STRIKE[0] + 1.2), p: [CTRIM[0], PLY + CUT.H + 0.0002, CTRIM[2] - 0.05] },
  { t: B(STRIKE[0] + 2.1), p: [CTRIM[0], PLY + CUT.H + 0.0002, CTRIM[2] + 0.06] }, { t: B(STRIKE[1] - 0.3), ...RU0, lift: 0.05 }]);
const strikeK = (t) => { const z = rulerK(t).p.z - CTRIM[2]; return t < B(STRIKE[0] + 1.2) ? 0 : t > B(STRIKE[0] + 2.2) ? 1 : clamp((z + CUT.A) / (2 * CUT.A)); };
// kitoló: a gombot felülről fogja; a keret fölé, a lap a próbatest tetejére, lenyomja a dobozba (34 mm), felemeli, vissza
const PUS0 = [POS.PUS0[0], BT, POS.PUS0[1]];
const PTOP = BOXTOP + CUT.H, PIN = SPECB + SB.H;                           // a kitoló lapjának alja: a keret tetején → a dobozban a próbatest tetején
const pusK = keyed([{ t: B(PUSH[0] + 0.25), p: PUS0 }, { t: B(PUSH[0] + 1.0), p: [RX, PTOP + 0.012, RZ], lift: 0.05 }, { t: B(PUSH[0] + 1.35), p: [RX, PTOP, RZ] },
  { t: B(PUSH[0] + 2.5), p: [RX, PIN, RZ] }, { t: B(PUSH[0] + 2.75), p: [RX, PIN, RZ] }, { t: B(PUSH[0] + 3.15), p: [RX, PTOP + 0.03, RZ] }, { t: B(PUSH[1] - 0.12), p: PUS0, lift: 0.015 }]);
const pushY = (t) => t < B(PUSH[0] + 1.35) ? PTOP : t > B(PUSH[0] + 2.5) ? PIN : pusK(t).p.y;
// terhelőfej: a csapját felülről fogja; a doboz fölé, majd függőlegesen a próbatestre
const CAP0 = [POS.CAP0[0], BT, POS.CAP0[1]];
const capK = keyed([{ t: B(CAP[0] + 0.25), p: CAP0 }, { t: B(CAP[1] - 0.7), p: [RX, BOXTOP + 0.035, RZ], lift: 0.06 }, { t: B(CAP[1] - 0.15), p: [RX, SPECB + SB.H, RZ] }]);
// a próbatest magassága (m) és a nyírás (mm)
const specH = (t) => { if (t < B(STRIKE[0])) return 0.025; if (t < B(STRIKE[1])) return 0.025 - 0.005 * strikeK(t); const s = TL.settle(t); const v = (t >= B(SHEAR[0]) && t < B(PLANE[1])) || t < B(4) ? TL.vOf(TL.dNow(t)) : 0; return SB.H - (s - v) / 1000; };
// főzőpohár: oldalról fogja, a kád fölé emeli, a kocsi felé (−x) billenti
const BEAK0 = [POS.BEAK0[0], BT, POS.BEAK0[1]], BEAKP = [1.22, BT + 0.19, -0.99], PANG = 1.5;
const beakK1 = keyed([{ t: B(POUR[0] + 0.25), p: BEAK0 }, { t: B(FILL[0] - 0.35), p: BEAKP, lift: 0.06 }]), beakK2 = keyed([{ t: B(FILL[1] + 0.35), p: BEAKP }, { t: B(POUR[1] - 0.12), p: BEAK0, lift: 0.03 }]);
const pourK = (t) => smooth(seg(t, B(FILL[0] - 0.35), B(FILL[0] + 0.15))) * (1 - smooth(seg(t, B(FILL[1] - 0.15), B(FILL[1] + 0.35))));
function beakPose(t) { if (t < B(POUR[0] + 0.25)) return { p: tv(BEAK0), q: QI.clone() }; if (t < B(FILL[0] - 0.35)) return beakK1(t); if (t < B(FILL[1] + 0.35)) return { p: tv(BEAKP), q: qz(PANG * pourK(t)) }; return beakK2(t); }
// ---------------- gép-állapot ----------------
const ramTip = (t) => { const engaged = RG.FL + SB.FB + SB.ST + specH(t) + CAPU.BALL; if (t < B(4)) return engaged; if (t < B(RAMDN[0])) return RG.RAMUP; if (t < B(RAMDN[1])) return lerp(RG.RAMUP, engaged, smooth(seg(t, B(RAMDN[0]), B(RAMDN[1])))); return t < B(PLANE[1]) ? engaged : RG.RAMUP; };
const armX = (t) => t < B(4) ? 0 : RG.ARMRET * (1 - TL.armK(t));
const capPose = (t) => { if (t < B(4) || t >= B(CAP[1] - 0.15)) return { p: V(RX, SPECB + specH(t), RZ), q: QI.clone() }; return capK(t); };

export function build(L, R) {
  stdPoses(); const G = L.G; C = new Choreo(L, { hang: true }); X.C = C;
  L.scl.G.position.set(POS.SCL, BT, -1.05); L.pc.g.position.x = POS.PC;
  // előkészítés: üveglap, talajlap, keret + toldat, tálca az acélvonalzóval
  X.plate = KZ.glassPlate3(); X.plate.position.set(POS.PLATE[0], BT, POS.PLATE[1]); G.add(X.plate);
  X.slab = NY.soilSlabSq(0.12, SLABH, 0.1); X.slab.position.set(POS.SLAB[0], PLY, POS.SLAB[1]); G.add(X.slab);
  X.cut = NY.cutter(); G.add(X.cut); C.prop('cut', X.cut, cutPose);
  X.coll = NY.cutCollar(); G.add(X.coll); C.prop('coll', X.coll, collPose);
  X.tray = O2.toolTray(); X.tray.position.set(POS.TRAY[0], BT, POS.TRAY[1]); G.add(X.tray);
  X.ruler = O2.straightEdge(); G.add(X.ruler); C.prop('ruler', X.ruler, rulerK);
  X.crumbs = NY.strikeCrumbs(); X.crumbs.position.set(CTRIM[0], PLY, CTRIM[2] + 0.04); G.add(X.crumbs);
  X.spec = NY.shearSpec(); G.add(X.spec);
  X.pus = NY.pusherSq(); G.add(X.pus); C.prop('pus', X.pus, pusK);
  X.cap = NY.capUnit(); G.add(X.cap); C.prop('cap', X.cap, capPose);
  // a gép, a vezérlő, a főzőpohár
  X.rig = NY.shearRig(); X.rig.position.set(RX, BT, RZ); G.add(X.rig);
  X.ctl = NY.controlUnit(); X.ctl.position.set(POS.CTRL[0], BT, POS.CTRL[1]); X.ctl.rotation.y = -0.25; G.add(X.ctl);
  X.beak = O2.beaker(); G.add(X.beak); { const gm = new THREE.MeshStandardMaterial({ color: 0xcfe3ea, transparent: true, opacity: 0.55, roughness: 0.08, metalness: 0.1, side: THREE.DoubleSide, depthWrite: false }); X.beak.traverse(m => { if (m.isMesh && m.material === O2.mats2().glass) m.material = gm; }); } C.prop('beak', X.beak, beakPose); X.stream = pourStream(0x8fc4dc, 0.6); G.add(X.stream);
  // kábelek: a vezérlőtől a motorhoz, az erőmérőhöz és a terhelőegységhez (az asztalon, a gép mögött)
  { const cab = (pts, r = 0.0035) => { const c = new THREE.CatmullRomCurve3(pts.map(tv)); const m = new THREE.Mesh(new THREE.TubeGeometry(c, 40, r, 6, false), NY.nmats().cable); G.add(m); };
    const cb = [POS.CTRL[0] - 0.05, BT + 0.02, POS.CTRL[1] - 0.08];
    cab([cb, [1.45, BT + 0.004, -1.2], [1.33, BT + 0.004, -1.1], [RX + 0.25, BT + 0.06, RZ - 0.06]]);
    cab([[cb[0] + 0.02, cb[1], cb[2]], [1.5, BT + 0.004, -1.26], [1.0, BT + 0.004, -1.27], [0.64, BT + 0.004, -1.2], [RX - 0.33, BT + 0.1, RZ - 0.04]]);
    cab([[cb[0] - 0.02, cb[1], cb[2]], [1.42, BT + 0.004, -1.3], [1.1, BT + 0.004, -1.3], [RX + 0.05, BT + 0.4, RZ - 0.2], [RX + 0.03, BT + 0.6, RZ - 0.04]]); }
  // ---------------- a laboráns ----------------
  const Z = -0.6;
  C.at(0, -0.12, Z).at(B(18.9), -0.12, Z).at(B(20.0), 0.05, Z).at(B(22.0), 0.05, Z).at(B(22.45), -0.26, Z).at(B(22.75), -0.26, Z).at(B(23.2), 0.18, Z).at(B(24.5), 0.18, Z).at(B(25.05), -0.26, Z).at(B(25.45), -0.26, Z)
   .at(B(25.9), 0.05, Z).at(B(26.4), 0.05, Z).at(B(27.3), 0.2, Z).at(B(32.3), 0.2, Z).at(B(33.6), 0.88, Z).at(B(34.4), 0.88, Z).at(B(34.9), 0.95, Z).at(B(38.2), 0.95, Z).at(B(38.7), 1.05, Z).at(B(39.6), 1.05, Z).at(B(40.4), 0.95, Z).at(B(41.9), 0.95, Z).at(B(42.4), 0.87, Z)
   .at(B(45.2), 0.86, Z).at(B(47.6), 1.5, Z).at(B(50.7), 1.5, Z).at(B(51.25), 1.42, Z).at(B(55.5), 1.42, Z).at(B(56.2), 1.62, Z).at(B(61.6), 1.62, Z).at(B(62.35), 0.82, Z)
   .at(B(63.9), 0.82, Z).at(B(64.1), 0.87, Z).at(B(65.6), 0.87, Z).at(B(66.0), 1.15, Z).at(B(68.7), 1.15, Z).at(B(69.7), 1.5, Z).at(B(70.6), 1.5, Z).at(B(71.3), 1.62, Z).at(B(116), 1.62, Z);
  const aimL = (sd, pr, b, pl) => C.aimLocal(sd, pr, B(b), pl);
  // keret + toldat: felülről a toldat peremén (sík lapokon)
  const collG = (b) => boxTop('R', V(0, CUT.CH, 0), CUT.O, CUT.CH, aimL('R', 'coll', b, [0, CUT.CH, 0]), { depth: 0.005 });
  C.hold('R', B(ON[0]), B(ON[1]), 'coll', collG(ON[0]));
  C.hold('R', B(PRESS[0]), B(PRESS[1]), 'coll', flatPalm('R', V(0, CUT.CH, 0), V(0, 1, 0), aimL('R', 'coll', PRESS[0], [0, CUT.CH, 0]), { gap: 0.003 }));
  C.hold('R', B(LIFT[0]), B(LIFT[1]), 'coll', collG(LIFT[0])); C.hold('R', B(COLL[0]), B(COLL[1]), 'coll', collG(COLL[0]));
  // a keretet balról csípi (hüvelyk elöl, mutató- és középső ujj hátul), a toldat alatt
  { const dx = 0.016; C.hold('L', B(LHOLD[0]), B(LHOLD[1]), 'cut', pinchSide('L', V(0, CUT.H, 0), Math.hypot(CUT.O, dx), V(-1, 0, 0), V(0, 0, 1), { dx, depth: 0.006 })); }
  // acélvonalzó: két kézzel a felső élén
  C.hold('L', B(STRIKE[0] + 0.15), B(STRIKE[1] - 0.25), 'ruler', bladeTop('L', V(-0.1, 0.03, 0), V(0, 0, -1), 0.002)); C.hold('R', B(STRIKE[0] + 0.15), B(STRIKE[1] - 0.25), 'ruler', bladeTop('R', V(0.1, 0.03, 0), V(0, 0, -1), 0.002));
  // a keret (mintával): felülről, sík lapokon
  const cutG = (sd, b) => boxTop(sd, V(0, CUT.H, 0), CUT.O, CUT.H, aimL(sd, 'cut', b, [0, CUT.H, 0]), { depth: 0.006 });
  C.hold('R', B(WEIGH[0]), B(WEIGH[1]), 'cut', cutG('R', WEIGH[0])); C.hold('R', B(TOBOX[0]), B(TOBOX[1]), 'cut', cutG('R', TOBOX[0])); C.hold('L', B(CUTOFF[0]), B(CUTOFF[1]), 'cut', cutG('L', CUTOFF[0]));
  // kitoló: a gombját felülről
  C.hold('R', B(PUSH[0]), B(PUSH[1]), 'pus', diskTop('R', V(0, PSH.K1, 0), PSH.KR, PSH.K1 - PSH.K0, C.aimLab('R', B(PUSH[0] + 1.5), [RX, 1, RZ]), { depth: 0.012 }));
  // terhelőfej: a csapját felülről
  C.hold('R', B(CAP[0]), B(CAP[1]), 'cap', diskTop('R', V(0, 0.006 + CAPU.PLT + CAPU.BOSSH, 0), CAPU.BOSSR, CAPU.BOSSH, C.aimLab('R', B(CAP[1] - 0.5), [RX, 1, RZ]), { depth: 0.005 }));
  // az erőmérő karjának állítógombja (bal kéz): korongfogás, csavaró mozdulat
  { const kp = V(RX + RG.KNOB[0], BT + RG.KNOB[1], RZ + RG.KNOB[2]); const a0 = C.aimLab('L', B(KNOB[0]), kp);
    C.holdF('L', B(KNOB[0]), B(KNOB[1]), null, (t) => { const w = Math.sin(seg(t, B(KNOB[0] + 0.25), B(KNOB[1] - 0.2)) * Math.PI * 4) * 0.28; return diskTop('L', kp, 0.013, 0.014, a0.clone().applyAxisAngle(V(0, 1, 0), w), { palmH: 0.04, depth: 0.005 }); }); }
  // vezérlő gombjai (jobb mutatóujj)
  const btnW = (k) => X.ctl.localToWorld(X.ctl.btnPt(k)).sub(G.position);
  X.ctl.updateMatrixWorld(true); G.updateMatrixWorld(true);
  const nW = X.ctl.panN.clone().applyQuaternion(X.ctl.quaternion);
  for (const [a, b, k] of [[BTN1[0], BTN1[1], 'load'], [BTN2[0], BTN2[1], 'start']]) { const p = btnW(k), q = p.clone().add(V(0.031, 0, 0.02)); C.hold('R', B(a), B(b), null, fingerPress('R', q, C.aimLab('R', B(a), p), { n: nW })); }   // a kéz-modell mutatóujja ~3 cm-rel balra-előre esik a céltól: kiegyenlítve
  // főzőpohár: oldalról, a tenyér a falán
  { const aim = C.aimLab('R', B(POUR[0] + 0.25), BEAK0); const a = aim.clone().setY(0).normalize(); const sp = V(a.z, 0, -a.x).multiplyScalar(0.94).addScaledVector(a, 0.34).normalize();
    C.hold('R', B(POUR[0]), B(POUR[1]), 'beak', powerCyl('R', V(0, 0.05, 0), V(0, 1, 0), 0.044, sp)); }
  // rögzítőcsavarok (elöl) és emelőcsavarok (jobb oldalt): korongfogás a recézett fejen, csavaró mozdulat
  const screwG = (getP, r, h, b0, b1, turns, dep) => { const a0 = C.aimLab('R', B(b0), getP(B(b0))); return (t) => { const w = Math.sin(seg(t, B(b0 + 0.2), B(b1 - 0.2)) * Math.PI * 2 * turns) * 0.3; return diskTop('R', getP(t), r, h, a0.clone().applyAxisAngle(V(0, 1, 0), w), { palmH: 0.035, spread: 48, depth: dep }); }; };
  LOCK.forEach(([a, b], i) => C.holdF('R', B(a), B(b), null, screwG((t) => lockTop(i, t), SB.LOCKR, SB.LOCKH, a, b, 3, 0.004)));
  LIFTS.forEach(([a, b], i) => C.holdF('R', B(a), B(b), null, screwG((t) => liftTop(i, t), SB.LIFTR, SB.LIFTH, a, b, 1, 0.003)));
  if (typeof window !== 'undefined') window.__X = X;
}
// a csavarfejek teteje (labor-helyi): a felső keretben, a kocsival együtt
function lockTop(i, t) { const x = (i ? 1 : -1) * SB.EARX; return V(RX + x, BOXTOP + SB.LOCKH + 0.008 * TL.lockK(i, t) + gapY(t), RZ + (SB.O + SB.EARZ) / 2); }
function liftTop(i, t) { const z = (i ? -1 : 1) * SB.LIFTZ; return V(RX + SB.LIFTX, BOXTOP + SB.LIFTH + gapY(t), RZ + z); }
const gapY = (t) => 0.0007 * TL.gapK(t) * (t < B(PLANE[1]) ? 1 : 0);

export function update(L, t, shot) {
  C.update(t);
  const d = TL.dNow(t), dm = d / 1000;
  // gép: kocsi (−x), a felső keret áll, rés, csavarok, kar, terhelőrúd, útadók, víz
  const rig = X.rig, bx_ = rig.box; rig.car.position.x = -dm; bx_.upper.position.set(dm, gapY(t), 0); rig.setPush(-dm); rig.setHLv(-dm);
  bx_.lock.forEach((s, i) => { const k = t < B(4) ? 1 : TL.lockK(i, t); s.position.y = s.home.y + 0.008 * k; s.rotation.y = -k * Math.PI * 6; });
  bx_.lift.forEach((s, i) => { s.rotation.y = TL.gapK(t) * Math.PI * 2; });
  rig.arm.position.x = armX(t); rig.knob.rotation.y = TL.armK(t) * Math.PI * 4;
  rig.setRam(ramTip(t));
  rig.setWater(t < B(4) ? RG.FL + 0.06 : RG.FL + 0.06 * TL.fillK(t));
  // próbatest: a keretben (egy darab) → kitolva a dobozba (két rész: az alsó a kocsival elmozdul)
  { const h = specH(t); const sp = X.spec; let vis = t < B(4) || t >= B(LIFT[0] + 0.5);
    if (t >= B(4) && t < B(PUSH[0] + 1.35)) { const c = cutPose(t); sp.position.copy(c.p); sp.quaternion.copy(c.q); sp.set(h, 0, true); }
    else if (t >= B(4) && t < B(PUSH[0] + 2.5)) { sp.position.set(RX, pushY(t) - SB.H, RZ); sp.quaternion.identity(); sp.set(h, 0, true); }
    else { sp.position.set(RX, SPECB, RZ); sp.quaternion.identity(); sp.set(h, -dm, false); }
    sp.visible = vis; }
  X.slab.hole.visible = t >= B(LIFT[0] + 0.9);
  X.crumbs.show(t < B(STRIKE[0] + 1.6) ? 0 : clamp(seg(t, B(STRIKE[0] + 1.6), B(STRIKE[0] + 2.2))));
  // főzőpohár: víz, sugár
  { const k = TL.fillK(t); X.beak.setLevel(0.8 * (1 - k) + 0.05); const pk = pourK(t); if (pk > 0.85 && t > B(FILL[0]) && t < B(FILL[1])) { const s = beakPose(t); const lip = V(-0.042, 0.12, 0).applyQuaternion(s.q).add(s.p); X.stream.set(lip, V(lip.x - 0.004, BT + RG.FL + 0.06 * k + 0.002, lip.z), 0.0035); } else X.stream.set(null); }
  // mérleg
  { const m = (t > B(WEIGH[1] - 0.1) && t < B(TOBOX[0] + 0.5)) ? TL.M_SOIL + TL.M_CUT : 0; const k = m.toFixed(1); if (X._m !== k) { drawScale(L.scl.disp, m, 1); X._m = k; } }
  // vezérlő kijelzője
  { const sig = t < B(4) ? 100 : t < B(RAMDN[0]) ? 0 : t < B(RAMDN[1]) ? Math.round(100 * smooth(seg(t, B(RAMDN[0]), B(RAMDN[1])))) : t < B(PLANE[1]) ? 100 : 0;
    const shear = t < B(4) || (t >= B(SHEAR[0]) && t < B(PLANE[1]));
    const F = shear ? TL.tauOf(d, 0) * TL.A_M2 * 1000 : 0; const dv = (t < B(4) ? 0 : TL.settle(t)) - (shear ? TL.vOf(d) : 0);
    const st = t < B(4) || (t >= B(SHEAR[0]) && t < B(SHEAR[1])) ? 'NYÍRÁS' : (t >= B(CONS[0]) && t < B(CONS[1])) ? 'KONSZOLIDÁCIÓ' : '';
    const key = [sig, Math.round(F), d.toFixed(2), dv.toFixed(3), st].join('|'); if (X._c !== key) { NY.drawCtl(X.ctl.scr, { sig: String(sig), F: String(Math.round(F)), dh: d.toFixed(2).replace('.', ','), dv: (-dv).toFixed(3).replace('.', ','), state: st }); X._c = key; } }
  // számítógép: τ–δ görbe a nyírás alatt
  if (t >= B(SHEAR[0]) && t < B(PLANE[0])) drawPC(L.pc.scr, t, 'Közvetlen nyírás · σ = 100 kPa', (g) => { g.strokeStyle = '#3FE0C5'; g.lineWidth = 5; g.beginPath(); for (let x = 0; x <= d; x += 0.1) { const X0 = 80 + x / 10 * 860, Y0 = 540 - TL.tauOf(x, 0) / 80 * 440; x ? g.lineTo(X0, Y0) : g.moveTo(X0, Y0); } g.stroke(); });
  // nyírási sík (metszet): az elülső falak, fülek, csavarok, a kád elülső fala és a víz rejtve
  { const cut = (t >= B(PLANE[0]) && t < B(PLANE[1])) || t < B(4); const hide = [bx_.lowW[1], bx_.upW[1], rig.walls[0], ...bx_.frontParts]; hide.forEach(m => m.visible = !cut); if (cut) rig.water.visible = false;
    bx_.setSlip(t < B(4) ? smooth(seg(t, B(2.2), B(3.2))) : cut ? smooth(seg(t, B(PLANE[0] + 0.8), B(PLANE[0] + 1.8))) : 0, dm); }
  C.apply(t, L.tech, shot && shot.look !== undefined ? { look: shot.look } : {});
  return { X, C, d };
}
export const __X = X;
