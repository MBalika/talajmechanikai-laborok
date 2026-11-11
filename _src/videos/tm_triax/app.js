// Triaxiális vizsgálat – labor: kinyomás (függőleges kinyomó), levágás huzalfűrésszel, esztergálás Ø 50 mm-re, a teteje 100 mm-nél,
// mérés, beépítés (szűrőkő, papír, próbatest, fejlemez, membrán feszítővel, O-gyűrűk, felső drén, akrilhenger, anyák, feltöltés),
// felfekvés, vezérlés, UU / CU / CD a cellában, kiszerelés. Minden mozdulatot a laboráns keze végez (tm_lab/act.js, tm_lab/grips3.js).
import { THREE, V, BT, M, cyl, bx, drawScale, drawPC, setRod } from '../tm_lab/room.js';
import { Choreo, keyed, still, stdPoses } from '../tm_lab/act.js';
import { diskTop, powerCyl, sheetEdge, flatPalm, fingerPress, tipsGrip, wristFromPalm, frame as frame3, horiz } from '../tm_lab/grips3.js';
import * as O2 from '../tm_lab/oedo2.js';
import * as TX from '../tm_lab/triax.js';
import { TD, VE, LT, rodXZ } from '../tm_lab/triax.js';
import * as TL from './timeline.js';
import { tb, EXT, EXT_D, LATHE, SAW2, SLICE, MNT, DIS, BTN_T } from './timeline.js';
import { clamp, lerp, smooth, seg } from '../../kit/util.js';
const B = (b) => tb(b);
const tv = (a) => V(a[0], a[1], a[2]);
// sima pálya pontokon át (centripetális Catmull–Rom, ívhossz szerint, a két végén lassít)
function pathPose(pts, t0, t1, q) { const crv = new THREE.CatmullRomCurve3(pts.map(tv), false, 'centripetal'); const Q = q || new THREE.Quaternion();
  return (t) => ({ p: crv.getPointAt(smooth(seg(t, t0, t1))), q: Q.clone() }); }
// a keretbe elölről, a két oszlop között: fel – a keret elé – hátra a talp fölé – le
function viaFront(A0, D, hi) { const zf = POS.FR[1] + 0.17, h = Math.max(A0[1], D[1]) + (hi ?? 0.06); return [A0, [A0[0], h - 0.02, A0[2] + 0.02], [A0[0] * 0.5 + D[0] * 0.5, h, zf], [D[0], h, zf - 0.02], [D[0], h, D[2] + 0.06], [D[0], D[1] + 0.025, D[2]], D]; }
const qE = (r) => new THREE.Quaternion().setFromEuler(new THREE.Euler(r[0] || 0, r[1] || 0, r[2] || 0, 'YXZ'));
// ---- elrendezés (labor-helyi) ----
export const POS = { EX: [-2.0, -0.42], LAT: [-0.55, -1.0], TRAY: [-0.25, -1.05], TIN: [-0.79, -1.0], TDISC: [-0.78, -0.88], SCL: 0.75, PBOX: [0.93, -0.9], BOWL: [1.08, -1.12],
  FR: [1.45, -1.0], TCAP: [1.78, -0.9], STS: [1.8, -1.12], CELL0: [2.05, -1.0], CTLC: [2.5, -1.28], CTLB: [2.5, -1.05], PC: 3.1 };
const FR = POS.FR, EX = POS.EX, LAT = POS.LAT;
export const FP = (x, y, z) => [FR[0] + x, BT + y, FR[1] + z];          // keret-helyi → labor-helyi
export function board(g) { g.strokeStyle = '#2b4f9e'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(80, 440); g.lineTo(960, 440); g.moveTo(80, 440); g.lineTo(80, 60); g.stroke();
  for (const [cx, r] of [[260, 90], [430, 150], [640, 215]]) { g.beginPath(); g.arc(cx, 440, r, Math.PI, 2 * Math.PI); g.stroke(); }
  g.strokeStyle = '#c0281e'; g.beginPath(); g.moveTo(80, 410); g.lineTo(940, 120); g.stroke();
  g.fillStyle = '#2b4f9e'; g.font = 'italic 700 46px Arial'; g.fillText('τ', 40, 80); g.fillText('σ′', 960, 490); g.fillStyle = '#c0281e'; g.font = 'italic 600 40px Arial'; g.fillText('τ = c′ + σ′ tg φ′', 560, 90); }
let C, X = {};

// ---------------- a vizsgálat állapota → a cella ----------------
export function cellState(t) { const S = TL.test(t); S.shearOn = S.ph === 'CU' || S.ph === 'open'; S.drains = S.ph === 'CU' || S.ph === 'CD'; return S; }
const mounted = (t) => t < B(20) || t >= B(MNT.spec[1]);                       // a próbatest a talpon
const seated = (t) => t < B(20) || (t >= B(MNT.cell[1]) && t < B(DIS.cell[0]));   // a cella a helyén
// a próbatest teteje (a tárcsa-csoport rendszerében) – analitikusan, a deformációs modell szerint
function topAt(t) { const S = cellState(t); const ea = (S.ea || 0) / 100, ev = (S.ev || 0) / 100, ec = ev / 3, Hc = TD.H0 * (1 - ec);
  const ep = S.ph === 'CU' ? 0.07 : S.ph === 'open' ? 0.06 : 1; const sT = Math.sin(Math.PI / 3), cT = Math.cos(Math.PI / 3); const e2 = S.shearOn ? Math.min(ea, ep) : ea;
  const sl = S.shearOn ? Math.max(0, ea - e2) * Hc / sT : 0; return { y: TD.SPB + Hc * (1 - ea), dx: -sl * cT, S, ea, ev, ec, Hc }; }
// a tárcsa emelkedése (keret-helyi y): felfekvéskor TD.APP, közben a minta rövidülése
function plat(t) { const tp = topAt(t); const sh = (TD.SPB + TD.H0) - tp.y;
  if (t < B(20)) return TD.APP + sh; if (t < B(64.75)) return 0; if (t < B(65.9)) return TD.APP * TL.appK(t);
  if (t < B(DIS.down[0])) return TD.APP + sh; return (TD.APP + sh) * (1 - smooth(seg(t, B(DIS.down[0]), B(DIS.down[1])))); }
const PLp = (t) => V(FR[0], BT + plat(t), FR[1]);
const capTop = (t) => { const tp = topAt(t); return tp.y + TD.PAP + TD.STN + TD.CAPH; };

export function build(L, R) {
  stdPoses(); const G = L.G; const A = O2.mats2(); C = new Choreo(L, { hang: true }); X.C = C;
  L.scl.G.position.set(POS.SCL, BT, -1.05); L.pc.g.position.x = POS.PC;
  // ---- kinyomó, kupak, fűrész ----
  X.ve = TX.vExtruder(); X.ve.position.set(EX[0], 0, EX[1]); G.add(X.ve);
  X.cap0 = TX.tubeCap(); G.add(X.cap0); const CAP_A = [EX[0], VE.TT, EX[1]], CAP_B = [EX[0] + 0.4, VE.SHY, EX[1] - 0.075];
  C.prop('cap0', X.cap0, keyed([{ t: B(EXT.cap[0] + 0.25), p: CAP_A }, { t: B(EXT.cap[0] + 0.6), p: [CAP_A[0], CAP_A[1] + 0.05, CAP_A[2]] }, { t: B(EXT.cap[1] - 0.05), p: CAP_B, lift: 0.04 }]));
  X.rack1 = TX.sawRack(); X.rack1.position.set(EX[0] + 0.38, VE.SHY, EX[1] + 0.03); G.add(X.rack1);
  X.saw1 = O2.wireSaw(); G.add(X.saw1); const SW1 = [EX[0] + 0.38, VE.SHY + TX.SAW_UP, EX[1] + 0.03], CUTY = VE.TT + 0.0012;
  X.saw1Pose = keyed([{ t: B(25.85), p: SW1 }, { t: B(26.15), p: [EX[0], CUTY + 0.14, EX[1] - 0.055], lift: 0.06 }, { t: B(EXT.cut[0]), p: [EX[0], CUTY, EX[1] - 0.055] },
    { t: B(EXT.cut[1]), p: [EX[0], CUTY, EX[1] + 0.07] }, { t: B(27.45), p: SW1, lift: 0.04 }]);
  C.prop('saw1', X.saw1, X.saw1Pose);
  // ---- a darab (talajhenger): levágás után kézben, esztergán, mérlegen, a talpra ----
  X.piece = TX.soilCyl(false); G.add(X.piece);
  C.prop('piece', X.piece, piecePose, (t) => t >= B(EXT.cut[1]) && t < B(MNT.spec[1]));
  X.slice = TX.soilCyl(false); X.slice.set(TD.R0, 0.025); G.add(X.slice);
  const SL0 = [LAT[0], BT + LT.TT + 0.01 + 0.1, LAT[1]], SL1 = [POS.TIN[0], BT + 0.004, POS.TIN[1]];
  C.prop('slice', X.slice, (t) => t < B(SLICE[0] + 0.2) ? still(SL0)(t) : keyed([{ t: B(SLICE[0] + 0.2), p: SL0 }, { t: B(SLICE[1] - 0.05), p: SL1, lift: 0.06 }])(t), (t) => t >= B(SAW2.cut[1]) && t < B(SLICE[1]));
  // ---- eszterga, sablonkorong, kés, tálca, tégely ----
  X.lat = TX.soilLathe(); X.lat.position.set(LAT[0], BT, LAT[1]); G.add(X.lat);
  X.tdisc = new THREE.Group(); X.tdisc.add(cyl(TD.R0, TD.R0, 0.008, M(0xaab0b6, { metalness: 0.35, roughness: 0.55 }), 0, 0.004, 0, 40)); X.tdisc.add(cyl(0.008, 0.008, 0.006, A.dark, 0, 0.011, 0, 16)); G.add(X.tdisc);
  const TD0 = [POS.TDISC[0], BT, POS.TDISC[1]];
  C.prop('tdisc', X.tdisc, (t) => { if (t < B(LATHE.top[0] + 0.2)) return still(TD0)(t); if (t < B(LATHE.top[1] - 0.05)) return keyed([{ t: B(LATHE.top[0] + 0.2), p: TD0 }, { t: B(LATHE.top[1] - 0.05), p: [LAT[0], BT + LT.TT + 0.01 + 0.125, LAT[1]], lift: 0.06 }])(t);
    if (t < B(LATHE.topOff[0] + 0.2)) { const q = new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), lathRot(t)); return { p: V(LAT[0], BT + LT.TT + 0.01 + 0.125, LAT[1]), q }; }
    return keyed([{ t: B(LATHE.topOff[0] + 0.2), p: [LAT[0], BT + LT.TT + 0.01 + 0.125, LAT[1]] }, { t: B(LATHE.topOff[1] - 0.05), p: TD0, lift: 0.06 }])(t); });
  X.tray = O2.toolTray(); X.tray.position.set(POS.TRAY[0], BT, POS.TRAY[1]); G.add(X.tray);
  X.knife = trimKnife(); G.add(X.knife); C.prop('knife', X.knife, knifePose);
  X.rack2 = TX.sawRack(); X.rack2.position.set(POS.TRAY[0], BT, -0.9); G.add(X.rack2);
  X.saw2 = O2.wireSaw(); G.add(X.saw2); const SW2 = [POS.TRAY[0], BT + TX.SAW_UP, -0.9], CUT2 = BT + LT.TT + 0.01 + 0.1 + 0.0012;
  X.saw2Pose = keyed([{ t: B(SAW2.pick + 0.2), p: SW2 }, { t: B(SAW2.start), p: [LAT[0], CUT2 + 0.07, LAT[1] - 0.06], lift: 0.06 }, { t: B(SAW2.cut[0]), p: [LAT[0], CUT2, LAT[1] - 0.06] },
    { t: B(SAW2.cut[1]), p: [LAT[0], CUT2, LAT[1] + 0.07] }, { t: B(SAW2.back - 0.05), p: SW2, lift: 0.04 }]);
  C.prop('saw2', X.saw2, X.saw2Pose);
  X.tin = O2.tin2(); X.tin.position.set(POS.TIN[0], BT, POS.TIN[1]); G.add(X.tin);
  // ---- beépítés kellékei ----
  X.bowl = O2.waterBowl(); X.bowl.position.set(POS.BOWL[0], BT, POS.BOWL[1]); G.add(X.bowl);
  X.box = O2.paperBox(); X.box.position.set(POS.PBOX[0], BT, POS.PBOX[1]); X.box.scale.setScalar(0.75); G.add(X.box);
  X.sts = TX.stretcherStand(); X.sts.position.set(POS.STS[0], BT, POS.STS[1]); G.add(X.sts);
  // ---- terhelőkeret, tárcsa-csoport, cella ----
  X.F = TX.loadFrame(); X.F.position.set(FR[0], BT, FR[1]); G.add(X.F);
  X.PL = TX.platenGroup(); G.add(X.PL); C.prop('pl', X.PL, (t) => ({ p: PLp(t), q: new THREE.Quaternion() }));
  X.spec = TX.buildSpecimen(X.PL);
  const memM = new THREE.MeshStandardMaterial({ color: 0xb08a5a, transparent: true, opacity: 0.3, roughness: 0.25, depthWrite: false });
  X.memB = new THREE.Mesh(new THREE.CylinderGeometry(TD.R0 + 0.0008, TD.R0 + 0.0008, 0.026, 40, 1, true), memM); X.PL.add(X.memB);
  X.memT = new THREE.Mesh(new THREE.CylinderGeometry(TD.R0 + 0.0016, TD.R0 + 0.0016, 0.024, 40, 1, true), memM); X.PL.add(X.memT);
  X.ringsB = [TX.oRing(), TX.oRing()]; X.ringsT = [TX.oRing(), TX.oRing()]; X.ringsB.concat(X.ringsT).forEach(o => X.PL.add(o));
  X.drainT = new THREE.Mesh(new THREE.BufferGeometry(), M(0xd8e2e8, { roughness: 0.3 })); X.PL.add(X.drainT); X.drainKey = '';
  X.drainEnd = new THREE.Object3D(); G.add(X.drainEnd);
  const DE0 = FP(0.055, TD.CY0 + 0.004, 0.03);
  C.prop('drainEnd', X.drainEnd, (t) => { if (t < B(MNT.drain[0] + 0.15)) return still(DE0)(t); const dst = () => { const p = PLp(t); const tp = topAt(t); return [p.x + tp.dx + 0.016, p.y + capTop(t) + 0.011, p.z]; };
    if (t < B(MNT.drain[1] - 0.1)) return keyed([{ t: B(MNT.drain[0] + 0.15), p: DE0 }, { t: B(MNT.drain[1] - 0.1), p: dst(), lift: 0.04 }])(t); return still(dst())(t); });
  // szűrőkövek, papírok, fejlemez
  X.stoneB = TX.stone50(); X.paperB = TX.paper50(); X.paperT = TX.paper50(); X.stoneT = TX.stone50(); X.tcap = TX.topCap(); G.add(X.stoneB, X.paperB, X.paperT, X.stoneT, X.tcap);
  const SB = [[POS.BOWL[0] - 0.03, BT + 0.006, POS.BOWL[1]], [POS.BOWL[0] + 0.035, BT + 0.006, POS.BOWL[1] - 0.02]], PB = [POS.PBOX[0] + 0.0045, BT + 0.0135, POS.PBOX[1]];
  const onPL = (t, y, dx = 0) => { const p = PLp(t); return { p: V(p.x + dx, p.y + y, p.z), q: new THREE.Quaternion() }; };
  const placeOn = (t, k, A0, y, lift, dyHold = 0) => { if (t < B(k[0] + 0.2)) return still(A0)(t); if (t < B(k[1] - 0.05)) { const d = onPL(B(k[1]), y).p; return pathPose(viaFront(A0, [d.x, d.y + dyHold, d.z], lift), B(k[0] + 0.2), B(k[1] - 0.05))(t); } return null; };
  C.prop('stoneB', X.stoneB, (t) => (t >= B(20) && placeOn(t, MNT.stoneB, SB[0], TD.CY0 + TD.PED, 0.08)) || onPL(t, TD.CY0 + TD.PED));
  C.prop('paperB', X.paperB, (t) => (t >= B(20) && placeOn(t, MNT.paperB, PB, TD.CY0 + TD.PED + TD.STN, 0.06, 0.03)) || (t < B(MNT.paperB[1]) && t >= B(MNT.paperB[1] - 0.05) ? keyed([{ t: B(MNT.paperB[1] - 0.05), p: onPL(t, TD.CY0 + TD.PED + TD.STN + 0.03).p.toArray() }, { t: B(MNT.paperB[1]), p: onPL(t, TD.CY0 + TD.PED + TD.STN).p.toArray() }])(t) : onPL(t, TD.CY0 + TD.PED + TD.STN)), (t) => t < B(20) || t >= B(MNT.paperB[0]));
  const topPart = (t, off) => { const tp = topAt(t); return onPL(t, tp.y + off, tp.dx); };
  C.prop('paperT', X.paperT, (t) => (t >= B(20) && placeOn(t, MNT.paperT, PB, TD.SPB + TD.H0, 0.05, 0.03)) || (t < B(MNT.paperT[1]) && t >= B(MNT.paperT[1] - 0.05) ? keyed([{ t: B(MNT.paperT[1] - 0.05), p: topPart(t, 0.03).p.toArray() }, { t: B(MNT.paperT[1]), p: topPart(t, 0).p.toArray() }])(t) : topPart(t, 0)), (t) => t < B(20) || t >= B(MNT.paperT[0]));
  C.prop('stoneT', X.stoneT, (t) => (t >= B(20) && placeOn(t, MNT.stoneT, SB[1], TD.SPB + TD.H0 + TD.PAP, 0.08)) || topPart(t, TD.PAP));
  const TC0 = [POS.TCAP[0], BT, POS.TCAP[1]];
  C.prop('tcap', X.tcap, (t) => (t >= B(20) && placeOn(t, MNT.cap, TC0, TD.CAPB, 0.08)) || topPart(t, TD.PAP + TD.STN));
  // membránfeszítő (az állványról; leengedés a minta köré, a gyűrűk legördítése, vissza)
  X.str = TX.stretcher(); G.add(X.str);
  C.prop('str', X.str, strPose, (t) => t >= B(20));
  // akrilhenger-egység (a sarokban áll, két kézzel a húzórudaknál fogva a helyére)
  X.cyl = TX.cellUnit(); G.add(X.cyl); C.prop('cyl', X.cyl, cylPose);
  X.water = new THREE.Mesh(new THREE.CylinderGeometry(TD.CYRI - 0.0003, TD.CYRI - 0.0003, 1, 48, 1, false), new THREE.MeshStandardMaterial({ color: 0x3f8cb8, transparent: true, opacity: 0.2, roughness: 0.05, depthWrite: false })); X.water.renderOrder = 11; X.cyl.add(X.water);
  X.wsurf = new THREE.Mesh(new THREE.RingGeometry(0.03, TD.CYRI - 0.0005, 48).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x9fd4f0, transparent: true, opacity: 0.45, roughness: 0.02, depthWrite: false, side: THREE.DoubleSide })); X.wsurf.renderOrder = 12; X.cyl.add(X.wsurf);
  const ram = TX.ramParts(G); X.ram = ram;
  // szabályozók, adatgyűjtő, csövek
  X.ctlC = TX.controller(); X.ctlC.position.set(POS.CTLC[0], BT, POS.CTLC[1]); G.add(X.ctlC);
  X.ctlB = TX.controller(); X.ctlB.position.set(POS.CTLB[0], BT, POS.CTLB[1]); G.add(X.ctlB);
  bx(FR[0] + 0.36, FR[0] + 0.5, BT, BT + 0.06, FR[1] - 0.42, FR[1] - 0.3, M(0x2a2e33), G);   // adatgyűjtő
  X.tubeC = TX.flowTube(G, 0x3d7cc9); X.tubeB = TX.flowTube(G, 0x3d7cc9);
  X.cable = new THREE.Mesh(new THREE.BufferGeometry(), A.black); G.add(X.cable); X.cableKey = '';
  choreo(L); if (typeof window !== 'undefined') window.__X = X;
}
// hosszú vágókés (penge 140 mm, nyél 100 mm): origó a penge tövénél; nyél −x, penge +x, a penge síkja xy (normálisa z)
function trimKnife() { const A = O2.mats2(); const g = new THREE.Group(); const h = cyl(0.0105, 0.0095, 0.1, A.black, -0.05, 0, 0, 16); h.rotation.z = Math.PI / 2; g.add(h);
  const s = new THREE.Shape(); s.moveTo(0, -0.01); s.lineTo(0.13, -0.006); s.lineTo(0.14, 0.0); s.lineTo(0.13, 0.008); s.lineTo(0, 0.01); s.lineTo(0, -0.01);
  const bl = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.0014, bevelEnabled: false }), A.steel); bl.position.z = -0.0007; bl.castShadow = true; g.add(bl); return g; }
const KB = 0.14;                                                         // a penge hossza
// a tányér elfordulása (rotation.y): 60°-os lépések pozitív irányban (a csapok a laboráns felől nézve jobbra mennek)
const lathRot = (t) => -TL.latheAng(t);
// ---- a darab helyzete ----
const PIECE_H = 0.125;
function piecePose(t) {
  const onLathe = (tt) => ({ p: V(LAT[0], BT + LT.TT + 0.01, LAT[1]), q: new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), lathRot(tt)) });
  const cutPos = [EX[0], VE.TT, EX[1]];
  if (t < B(27.75)) return still(cutPos)(t);
  if (t < B(28.05)) return keyed([{ t: B(27.75), p: cutPos }, { t: B(28.05), p: [EX[0], VE.TT + 0.06, EX[1] + 0.05] }])(t);
  if (t < B(28.75)) { const b = C.bodyAt(t); const f = V(Math.sin(b.ry), 0, Math.cos(b.ry)); return { p: V(b.x, 0, b.z).addScaledVector(f, 0.38).add(V(0, VE.TT + 0.06, 0)).add(V(0, -0.1 * smooth(seg(t, B(28.05), B(28.75))), 0)), q: new THREE.Quaternion() }; }
  if (t < B(LATHE.place)) { const b = C.bodyAt(B(28.75)); const f = V(Math.sin(b.ry), 0, Math.cos(b.ry)); const a = V(b.x, 0, b.z).addScaledVector(f, 0.38).add(V(0, VE.TT - 0.04, 0)); return keyed([{ t: B(28.75), p: a.toArray() }, { t: B(LATHE.place), p: onLathe(t).p.toArray(), lift: 0.02 }])(t); }
  if (t < B(38.6)) return onLathe(t);
  // a mérlegre (két kézzel; séta közben a test előtt), majd a talpra
  const SC = [POS.SCL, BT + 0.069, -1.06];
  if (t < B(39.85)) { const s0 = onLathe(B(38.6)).p; if (t < B(38.9)) return keyed([{ t: B(38.6), p: s0.toArray() }, { t: B(38.9), p: [s0.x, s0.y + 0.07, s0.z + 0.04] }])(t);
    if (t < B(39.55)) { const b = C.bodyAt(t); return { p: V(b.x, BT + LT.TT + 0.01 + 0.07, b.z - 0.4 + 0.04 * Math.sin(Math.PI * seg(t, B(38.9), B(39.55)))), q: new THREE.Quaternion() }; }
    const b = C.bodyAt(B(39.55)); return keyed([{ t: B(39.55), p: [b.x, BT + LT.TT + 0.01 + 0.07, b.z - 0.4] }, { t: B(39.85), p: SC, lift: 0.01 }])(t); }
  if (t < B(MNT.spec[0] + 0.2)) return still(SC)(t);
  const d = PLp(B(MNT.spec[1])); if (t >= B(MNT.spec[1] - 0.05)) return still([d.x, d.y + TD.SPB, d.z])(t); return pathPose(viaFront(SC, [d.x, d.y + TD.SPB, d.z], 0.05), B(MNT.spec[0] + 0.2), B(MNT.spec[1] - 0.05))(t);
}
// ---- a kés: tálcán fekve → húzások a sablonkorongok peremén (+x oldal) → vissza ----
const K_REST = { p: [POS.TRAY[0] - 0.05, BT + 0.02 + 0.0105, POS.TRAY[1] - 0.06], r: [-Math.PI / 2, 0, 0] };   // a nyél balra, a tálca szélén túl
const KQ_USE = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(V(0, -1, 0), V(0, 0, -1), V(1, 0, 0)));   // penge lefelé, a lapja a minta felé
const KZ = LAT[1], rAfter = (k) => 0.0362 + (TD.R0 - 0.0362) * (k + 1) / 6, KXk = (k) => LAT[0] + rAfter(Math.max(0, Math.min(5, k))) + 0.0008;   // a penge a húzás utáni palást mentén
const K_TOP = BT + LT.TT + 0.01 + 0.125 + 0.008 + 0.008 + KB, K_BOT = BT + LT.TT + 0.01 + 0.003 + KB;   // a penge tövének magassága a húzás elején / végén
function knifePose(t) {
  const S = LATHE.strokes; const r0 = { p: tv(K_REST.p), q: qE(K_REST.r) };
  if (t < B(29.55)) return r0; const up = (y, k) => ({ p: V(KXk(k), y, KZ), q: KQ_USE.clone() });
  if (t < B(S[0] - 0.05)) { const k = smooth(seg(t, B(29.55), B(S[0] - 0.05))); const a = r0.p, b = V(KXk(0), K_TOP + 0.02, KZ); const p = a.clone().lerp(b, k); p.y += 0.06 * Math.sin(Math.PI * k); return { p, q: r0.q.clone().slerp(KQ_USE, smooth(seg(t, B(29.6), B(S[0] - 0.15)))) }; }
  for (let k = 0; k < 6; k++) { const a = B(S[k]), m = B(S[k] + LATHE.sd), e = k < 5 ? B(S[k + 1]) : B(S[5] + LATHE.sd + 0.2);
    if (t < a) return up(K_TOP + 0.02, k); if (t < m) return up(lerp(K_TOP, K_BOT, smooth((t - a) / (m - a))), k); if (t < e) { const u = smooth((t - m) / (e - m)); const o = up(lerp(K_BOT, K_TOP + 0.02, u), k); o.p.x = lerp(KXk(k), KXk(k + 1), u); return o; } }
  const tE = B(S[5] + LATHE.sd + 0.2); if (t > B(34.55)) return r0; const k = smooth(seg(t, tE, B(34.55))); const a = V(KXk(5), K_TOP + 0.02, KZ), b = r0.p; const p = a.clone().lerp(b, k); p.y += 0.05 * Math.sin(Math.PI * k);
  return { p, q: KQ_USE.clone().slerp(r0.q, smooth(seg(t, tE + B(0.1), B(34.45)))) };
}
// ---- membránfeszítő ----
const ST0 = () => [POS.STS[0], BT + 0.012 + 0.065, POS.STS[1]];
function strPose(t) {
  const m = MNT, s0 = ST0(); if (t < B(m.str[0] + 0.2)) return still(s0)(t);
  const c = (y) => { const p = PLp(t); return [p.x, p.y + y, p.z]; };
  const yAbove = TD.CAPTOP + 0.012 + 0.065, yMid = TD.SPB + TD.H0 / 2, yBot = TD.CY0 + 0.0135 + 0.048, yTop = TD.CAPB + 0.011 - 0.048;   // a gyűrűk legördítéséhez: alsó pár a talpra, felső pár a fejlemezre
  if (t < B(m.strK[0])) return pathPose(viaFront(s0, [FR[0], BT + yAbove, FR[1]], 0.03).slice(0, -2).concat([[FR[0], BT + yAbove, FR[1]]]), B(m.str[0] + 0.2), B(m.strK[0]))(t);
  if (t > B(m.str[1] - 0.5)) return pathPose(viaFront(s0, [FR[0], BT + yAbove + 0.01, FR[1]], 0.03).slice(0, -2).concat([[FR[0], BT + yAbove + 0.01, FR[1]]]).reverse(), B(m.str[1] - 0.5), B(m.str[1] - 0.05))(t);
  return keyed([{ t: B(m.strK[0]), p: [FR[0], BT + yAbove, FR[1]] }, { t: B(m.strK[1]), p: c(yMid) }, { t: B(m.vac + 0.25), p: c(yMid) },
    { t: B(m.ringB - 0.2), p: c(yBot) }, { t: B(m.ringB + 0.4), p: c(yBot) }, { t: B(m.ringT - 0.25), p: c(yTop) }, { t: B(m.ringT + 0.4), p: c(yTop) }, { t: B(m.str[1] - 0.5), p: c(yAbove + 0.01) }, { t: B(m.str[1] - 0.05), p: s0, lift: 0.04 }])(t);
}
// ---- az akrilhenger-egység ----
const CYL0 = () => [POS.CELL0[0], BT, POS.CELL0[1]];
function cylPose(t) {
  const seatAt = (tt) => { const p = PLp(tt); return [p.x, p.y + TD.CY0, p.z]; };
  if (t < B(20)) return { p: tv(seatAt(t)), q: new THREE.Quaternion() };
  const yT = BT + TD.CAPTOP + 0.014, c0 = CYL0();
  if (t < B(MNT.cell[0] + 0.25)) return still(c0)(t);
  const zf = FR[1] + 0.25, m = MNT.cell;
  if (t < B(m[1] - 0.05)) return pathPose([c0, [c0[0] - 0.02, BT + 0.06, c0[2] + 0.12], [FR[0] + 0.36, BT + 0.16, zf], [FR[0] + 0.14, yT + 0.01, zf], [FR[0], yT, zf - 0.03], [FR[0], yT, FR[1] + 0.06], [FR[0], yT - 0.02, FR[1]], seatAt(B(m[1]))], B(m[0] + 0.25), B(m[1] - 0.05))(t);
  if (t < B(DIS.cell[0] + 0.25)) return { p: tv(seatAt(t)), q: new THREE.Quaternion() };
  const s = seatAt(B(DIS.cell[0] + 0.25)); const d = DIS.cell;
  if (t >= B(d[1] - 0.05)) return still(c0)(t);
  return pathPose([s, [FR[0], yT - 0.02, FR[1]], [FR[0], yT, FR[1] + 0.06], [FR[0], yT, zf - 0.03], [FR[0] + 0.14, yT + 0.01, zf], [FR[0] + 0.36, BT + 0.16, zf], [c0[0] - 0.02, BT + 0.06, c0[2] + 0.12], c0], B(d[0] + 0.25), B(d[1] - 0.05))(t);
}

// ---------------- koreográfia ----------------
function choreo(L) {
  const z = -0.6, aimL = (sd, pr, b, pl) => C.aimLocal(sd, pr, B(b), pl), aimW = (sd, b, p) => C.aimLab(sd, B(b), p);
  // állomások (érkezési idők)
  const ez = EX[1] + 0.42; C.at(0, POS.PC, -0.62).at(B(19.97), POS.PC, -0.62).at(B(20.0), EX[0], ez).at(B(21.3), EX[0], ez).at(B(21.75), EX[0] + 0.3, ez).at(B(22.3), EX[0], ez)
   .at(B(25.45), EX[0], ez).at(B(25.8), EX[0] + 0.38, ez).at(B(26.15), EX[0], ez).at(B(26.95), EX[0], ez).at(B(27.35), EX[0] + 0.38, ez).at(B(27.65), EX[0], ez).at(B(27.95), EX[0], ez).at(B(28.8), LAT[0] - 0.02, z)
   .at(B(35.15), LAT[0] - 0.02, z).at(B(35.4), -0.4, z).at(B(35.85), LAT[0] - 0.02, z).at(B(37.0), LAT[0] - 0.02, z).at(B(37.3), -0.42, z).at(B(37.6), LAT[0] - 0.08, z).at(B(38.55), LAT[0] - 0.05, z).at(B(39.55), POS.SCL, z)
   .at(B(42.2), 1.22, z).at(B(42.9), 1.38, z).at(B(43.3), 1.18, z).at(B(43.7), 1.38, z).at(B(44.5), POS.SCL + 0.02, z).at(B(45.5), 1.43, z)
   .at(B(46.35), 1.2, z).at(B(46.8), 1.4, z).at(B(47.15), 1.22, z).at(B(47.55), 1.42, z).at(B(47.95), 1.55, z).at(B(48.35), 1.45, z)
   .at(B(49.0), 1.68, z).at(B(49.6), 1.45, z).at(B(54.4), 1.45, z).at(B(54.85), 1.68, z).at(B(55.25), 1.45, z)
   .at(B(57.0), 1.98, z).at(B(57.45), 1.98, z).at(B(57.95), 1.8, -0.45).at(B(58.35), 1.47, -0.45).at(B(58.85), 1.45, z).at(B(59.3), 1.45, z).at(B(64.9), 1.45, z).at(B(66.6), POS.PC, -0.62)
   .at(B(115.8), POS.PC, -0.62).at(B(116.9), 1.45, z).at(B(117.55), 1.45, z).at(B(117.9), 1.47, -0.45).at(B(118.3), 1.8, -0.45).at(B(118.7), 1.98, z).at(B(121.0), 1.95, z).at(B(123.5), POS.PC, -0.62);
  // számítógépnél: bal kéz a billentyűzeten, jobb az egéren (tenyér lefelé)
  const pcHands = (a, b) => { const pc = L.pc.g; const kb = V(POS.PC - 0.07, BT + 0.024, -1.15 + 0.235), ms = V(POS.PC + 0.32, BT + 0.02, -1.15 + 0.245);
    C.hold('L', B(a), B(b), null, flatPalm('L', kb, V(0, 1, 0), V(0.15, 0, -1), { gap: 0.012 })); C.hold('R', B(a), B(b), null, flatPalm('R', ms, V(0, 1, 0), V(0, 0, -1), { gap: 0.004 })); };
  pcHands(0, 19.0); pcHands(66.9, 115.3); pcHands(123.8, 140);
  // 2.1 kupak: precíziós korongfogás felülről
  C.hold('R', B(EXT.cap[0]), B(EXT.cap[1]), 'cap0', diskTop('R', V(0, 0.03, 0), 0.042, 0.03, aimL('R', 'cap0', EXT.cap[0], [0, 0.03, 0]), { depth: 0.008 }));
  // 2.2 kinyomás: bal mutatóujj a kezelődoboz zöld gombján (függőleges lap, elölről)
  { const bp = V(EX[0] + X.ve.btnUp.x, X.ve.btnUp.y, EX[1] + X.ve.btnUp.z); C.hold('L', B(EXT.push[0]), B(EXT.push[1]), null, fingerPress('L', bp, aimW('L', EXT.push[0], bp), { n: V(0, 0, 1) })); }
  // 2.3 huzalfűrész: erőfogás a fogantyúkon; fekve felülről, használatban kívülről (tenyér befelé, hüvelyk fel)
  const sawK = (pose) => (t) => { const e = new THREE.Euler().setFromQuaternion(pose(t).q, 'YXZ'); return clamp(1 - Math.abs(e.x) / (Math.PI / 2)); };
  const sawG = (name, pose, sd, x) => (t) => { const s = C.propPose(name, t); const k = sawK(pose)(t); const Al = V(0, Math.cos(0.5 * k), -Math.sin(0.5 * k));
    const A = Al.clone().applyQuaternion(s.q), c = V(x, 0, 0).addScaledVector(Al, 0.012).applyQuaternion(s.q).add(s.p); const P = V(0, -1, 0).lerp(V(-Math.sign(x), 0, 0), smooth(k)).normalize(); return powerCyl(sd, c, A, 0.011, P); };
  X.sawK1 = sawK(X.saw1Pose); X.sawK2 = sawK(X.saw2Pose);
  C.holdF('L', B(25.85), B(27.45), null, sawG('saw1', X.saw1Pose, 'L', -0.14)); C.holdF('R', B(25.85), B(27.45), null, sawG('saw1', X.saw1Pose, 'R', 0.14));
  // 2.4 a darab két tenyér között (függőleges tenyér befelé, ujjak előre)
  const palms = (pr, b0, b1, r, h) => { C.hold('L', B(b0), B(b1), pr, flatPalm('L', V(-r, h / 2, 0), V(-1, 0, 0), V(0, 0.05, -1))); C.hold('R', B(b0), B(b1), pr, flatPalm('R', V(r, h / 2, 0), V(1, 0, 0), V(0, 0.05, -1))); };
  palms('piece', 27.7, LATHE.place, 0.0362, PIECE_H);
  // sablonkorong a tetejére (bal kéz), majd le
  C.hold('L', B(LATHE.top[0]), B(LATHE.top[1]), 'tdisc', diskTop('L', V(0, 0.014, 0), TD.R0, 0.014, aimL('L', 'tdisc', LATHE.top[0], [0, 0.01, 0]), { depth: 0.005 }));
  C.holdF('L', B(LATHE.topOff[0]), B(LATHE.topOff[1]), 'tdisc', (t) => diskTop('L', V(0, 0.014, 0), TD.R0, 0.014, aimL('L', 'tdisc', LATHE.topOff[0], [0, 0.01, 0]), { depth: 0.005 }));
  // 2.5 kés: felvétel a tálcáról (tenyér lefelé, hüvelyk a nyél vége felé), húzások (kézfogás-helyzet: hüvelyk fel, tenyér a minta felé)
  C.holdF('R', B(29.5), B(34.6), null, (t) => { const k = C.propPose('knife', t); const c = V(-0.055, 0, 0).applyQuaternion(k.q).add(k.p), Ah = V(-1, 0, 0).applyQuaternion(k.q);
    const v = clamp(-V(1, 0, 0).applyQuaternion(k.q).y); const P = V(0, -1, 0).lerp(V(-1, 0, 0), smooth(v)).normalize(); return powerCyl('R', c, Ah, 0.0102, P); });
  // a tányér forgatása: a bal kéz a bal elöl álló csapot fogja (kézfogás: hüvelyk fel, tenyér jobbra), és jobbra tolja
  // egy folytonos fogás: fordításkor a csapon, közte a keze kívül, a tányér előtt ívben megy vissza a következő csaphoz (nem a próbatest fölött)
  { const t0 = TL.turnAt(0), t5 = TL.turnAt(5) + TL.TURN_D; C.holdF('L', B(t0 - 0.02), B(t5 + 0.02), null, (t) => { let k = 0; for (let j = 0; j < 6; j++) if (t >= B(TL.turnAt(j) - 0.02)) k = j;
    const e = B(TL.turnAt(k) + TL.TURN_D + 0.02); if (t <= e || k === 5) return powerCyl('L', pegW(k, t), V(0, 1, 0), 0.009, V(1, 0, 0.15));
    const n = B(TL.turnAt(k + 1) - 0.02); const u = smooth(seg(t, e, n)); const a0 = 75, a1 = 135; const a = (a0 + (a1 - a0) * u) * Math.PI / 180; const r = 0.075 + 0.05 * Math.sin(Math.PI * u);
    const c = V(LAT[0] + r * Math.cos(a), BT + LT.TT + 0.045 + 0.03 * Math.sin(Math.PI * u), LAT[1] + r * Math.sin(a)); return powerCyl('L', c, V(0, 1, 0), 0.009 + 0.012 * Math.sin(Math.PI * u), V(1, 0, 0.15)); }); }
  // 2.6 huzalfűrész a tetejénél; a levágott korong a tégelybe
  C.holdF('L', B(SAW2.pick), B(SAW2.back), null, sawG('saw2', X.saw2Pose, 'L', -0.14)); C.holdF('R', B(SAW2.pick), B(SAW2.back), null, sawG('saw2', X.saw2Pose, 'R', 0.14));
  C.hold('L', B(SLICE[0]), B(SLICE[1]), 'slice', diskTop('L', V(0, 0.025, 0), TD.R0, 0.025, aimL('L', 'slice', SLICE[0], [0, 0.02, 0]), { depth: 0.008 }));
  // 2.7 a próbatest a mérlegre (két tenyér között)
  palms('piece', 38.55, 39.9, TD.R0, TD.H0);
  // 3.1 szűrőkő (bal kéz, korongfogás), szűrőpapír (a szélén csípve)
  const stoneG = (sd, pr, b) => diskTop(sd, V(0, TD.STN, 0), TD.R0, TD.STN, aimL(sd, pr, b, [0, TD.STN, 0]), { depth: 0.0025, palmH: 0.04 });
  C.hold('L', B(MNT.stoneB[0]), B(MNT.stoneB[1]), 'stoneB', stoneG('L', 'stoneB', MNT.stoneB[0]));
  const paperG = (sd, pr, b) => { const a = aimL(sd, pr, b, [0, 0, 0]); const s = sd === 'L' ? 1 : -1; const e = V(a.z, 0, -a.x).multiplyScalar(s * TD.R0 * 0.45).addScaledVector(a, -TD.R0 * 0.88); e.y = TD.PAP / 2; return sheetEdge(sd, e, a, TD.PAP); };
  C.hold('L', B(MNT.paperB[0]), B(MNT.paperB[1]), 'paperB', paperG('L', 'paperB', MNT.paperB[0]));
  // 3.2 a próbatest a talpra
  palms('piece', MNT.spec[0], MNT.spec[1], TD.R0, TD.H0);
  // 3.3 papír, szűrőkő (bal kéz), fejlemez (jobb kéz)
  C.hold('L', B(MNT.paperT[0]), B(MNT.paperT[1]), 'paperT', paperG('L', 'paperT', MNT.paperT[0]));
  C.hold('L', B(MNT.stoneT[0]), B(MNT.stoneT[1]), 'stoneT', stoneG('L', 'stoneT', MNT.stoneT[0]));
  C.hold('R', B(MNT.cap[0]), B(MNT.cap[1]), 'tcap', diskTop('R', V(0, TD.CAPH, 0), TD.R0 + 0.001, TD.CAPH, aimL('R', 'tcap', MNT.cap[0], [0, TD.CAPH, 0]), { depth: 0.006 }));
  // 3.4–3.5 membránfeszítő két tenyér között (függőleges tenyér befelé, ujjak előre)
  C.hold('L', B(MNT.str[0]), B(MNT.str[1]), 'str', flatPalm('L', V(-0.0335, 0, 0), V(-1, 0, 0), V(0, 0.08, -1), { gap: 0.002 }));
  C.hold('R', B(MNT.str[0]), B(MNT.str[1]), 'str', flatPalm('R', V(0.0335, 0, 0), V(1, 0, 0), V(0, 0.08, -1), { gap: 0.002 }));
  // 3.6 felső drén: a cső végét hüvelyk és mutatóujj közé csípi, és a fejlemez csonkjára húzza
  C.holdF('R', B(MNT.drain[0]), B(MNT.drain[1]), 'drainEnd', () => { const fr = frame3('R', V(-0.35, -0.3, -1), V(-0.75, -0.6, 0.2)); const tips = { T: fr.L.clone().multiplyScalar(0.0035), I: fr.L.clone().multiplyScalar(-0.0035).add(V(0, 0.002, 0)) };
    const W = wristFromPalm(fr, fr.F.clone().multiplyScalar(-0.06).addScaledVector(fr.P, -0.025)); return tipsGrip('R', W, fr, tips, { flex: { M: [0.9, 1.0, 0.55], R: [1.0, 1.1, 0.6], P: [1.05, 1.1, 0.6] } }); });
  // 3.7 a cella: két kéz a két elülső húzórúdon (erőfogás, hüvelyk fel, tenyér a rúd felé)
  const rodG = (sd, k) => { const [x, z] = rodXZ(k); return powerCyl(sd, V(x, 0.07, z), V(0, 1, 0), 0.006, V(sd === 'R' ? -1 : 1, 0, -0.25).normalize()); };
  C.hold('R', B(MNT.cell[0]), B(MNT.cell[1]), 'cyl', rodG('R', 0)); C.hold('L', B(MNT.cell[0]), B(MNT.cell[1]), 'cyl', rodG('L', 1));
  C.hold('R', B(DIS.cell[0]), B(DIS.cell[1]), 'cyl', rodG('R', 0)); C.hold('L', B(DIS.cell[0]), B(DIS.cell[1]), 'cyl', rodG('L', 1));
  // 3.8 anyák: hárompontos fogás a hatlapú anyán, csavaró mozdulat
  const nutG = (sd, k, b0, b1) => { const [x, z] = rodXZ(k); const pc = V(x, TD.TOPY + TD.TPH + 0.016, z); const a0 = aimL(sd, 'cyl', b0, pc.toArray());
    C.holdF(sd, B(b0), B(b1), 'cyl', (t) => { const w = Math.sin(seg(t, B(b0), B(b1)) * Math.PI * 2) * 0.3; return diskTop(sd, pc, 0.012, 0.016, a0.clone().applyAxisAngle(V(0, 1, 0), w), { palmH: 0.036, spread: 46, depth: 0.005 }); }); };
  nutG('R', 0, ...MNT.nuts[0]); nutG('L', 1, ...MNT.nuts[1]); nutG('R', 2, ...MNT.nuts[2]);
  // 3.9 cellaszelep (bal kéz: a karját hüvelyk és mutatóujj közé fogja, 90°-kal elfordítja), légtelenítő (jobb kéz: kinyit, majd elzár)
  C.holdF('L', B(MNT.valve[0]), B(MNT.valve[1]), 'pl', (t) => { const v = X.PL.valves[0]; v.g.updateMatrix(); const rot = (Math.PI / 2) * (1 - smooth(seg(t, B(MNT.valve[0] + 0.1), B(MNT.valve[1] - 0.1))));
    const c = V(0.016, 0.0085 + 0.009, 0).add(V(0.018, 0, 0).applyAxisAngle(V(0, 1, 0), rot)).applyMatrix4(v.g.matrix); const dir = V(1, 0, 0).applyAxisAngle(V(0, 1, 0), rot).transformDirection(v.g.matrix); const n = V(0, 1, 0).cross(dir).normalize();
    const fr = frame3('L', V(0.15, -0.35, -1), V(0.05, -1, 0)); const tips = { T: c.clone().addScaledVector(n, 0.0035 + 0.007).add(V(0, 0.001, 0)), I: c.clone().addScaledVector(n, -0.0035 - 0.007).add(V(0, 0.001, 0)) };
    const W = wristFromPalm(fr, c.clone().addScaledVector(fr.F, -0.045).add(V(0, 0.035, 0))); return tipsGrip('L', W, fr, tips, { flex: { M: [0.85, 0.95, 0.5], R: [0.95, 1.05, 0.55], P: [1.0, 1.05, 0.6] } }); });
  const ventG = (b0, b1, dir) => C.holdF('R', B(b0), B(b1), 'cyl', (t) => { const w = dir * Math.sin(seg(t, B(b0), B(b1)) * Math.PI) * 0.35; const a0 = aimL('R', 'cyl', b0, [0.058, TD.TOPY + TD.TPH + 0.016, 0.03]);
    return diskTop('R', V(0.058, TD.TOPY + TD.TPH + 0.016, 0.03), 0.009, 0.007, a0.applyAxisAngle(V(0, 1, 0), w), { palmH: 0.034, spread: 52, depth: 0.003 }); });
  ventG(MNT.vent[0], MNT.vent[1], 1); ventG(MNT.ventC[0], MNT.ventC[1], -1);
  // 4.1 ▲ gomb a keret paneljén (jobb mutatóujj, elölről)
  { const bp = V(...FP(0.02, 0.07, 0.178)); C.hold('R', B(BTN_T[0]), B(BTN_T[1]), null, fingerPress('R', bp, aimW('R', BTN_T[0], bp), { n: V(0, 0, 1) })); }
}
// a k. csap világhelyzete (labor-helyi): a forgó tányér peremén, 135°-nál (bal elöl) indul
function pegW(k, t) { const phi = (135 + k * 60) * Math.PI / 180; const r = 0.075; const p = V(r * Math.cos(phi), LT.TT + 0.045, r * Math.sin(phi)).applyAxisAngle(V(0, 1, 0), lathRot(t)); return p.add(V(LAT[0], BT, LAT[1])); }

// ---------------- frissítés ----------------
export function update(L, t, shot) {
  C.update(t);
  const S = cellState(t), tp = topAt(t);
  // kinyomó: a minta a csőben (a dugattyú tolja), kupak; levágás után a cső tetejéig
  { const k = TL.pushK(t); const top0 = VE.TT - 0.012; const cut = t >= B(EXT.cut[1]); const top = cut ? VE.TT : top0 + EXT_D * k; X.ve.setCore(top - 0.45, top); }
  // darab: méret (esztergálás, a teteje levágva)
  { const r = t < B(LATHE.strokes[0]) ? 0.0362 : TL.trimR(t); const h = t < B(SAW2.cut[1]) ? PIECE_H : TD.H0; X.piece.set(r, h); }
  // eszterga: tányér forgása, csapok, forgács
  X.lat.turn.rotation.y = lathRot(t); { let n = 0; for (let k = 0; k < 6; k++) n += clamp(seg(t, B(LATHE.strokes[k]), B(LATHE.strokes[k] + LATHE.sd))); X.lat.setChips(t < B(LATHE.strokes[0]) ? 0 : (n / 6) * 0.95 + 0.05); X.lat.chips.visible = t > B(LATHE.strokes[0]) && t < B(42); }
  X.tin.soil.visible = t > B(SLICE[1] - 0.05);
  X.saw1.hL.rotation.x = X.saw1.hR.rotation.x = -0.5 * X.sawK1(t); X.saw2.hL.rotation.x = X.saw2.hR.rotation.x = -0.5 * X.sawK2(t);
  // mérleg
  { let m = 0; if (t > B(MASSON) && t < B(MNT.spec[0] + 0.3)) m = TL.SOIL.m; drawScale(L.scl.disp, m, 1); }
  // ---- a cella ----
  const mt = mounted(t);
  const ep = S.ph === 'CU' ? 0.07 : S.ph === 'open' ? 0.06 : 1;
  const flash = S.shearOn && S.fail > 0 ? Math.exp(-Math.max(0, t - (S.ph === 'open' ? B(2) : B(100.9))) * 2.5) : 0;
  const glow = t >= B(72) && !(shot && shot.cut) ? clamp(((S.u || 0) - (S.uB || 0)) / 260, 0, 1) * 0.32 : 0;
  const memOn = mt && (t < B(20) || t >= B(MNT.vac));
  const top = X.spec.set({ y0: TD.SPB, H: TD.H0, R: TD.R0, ea: (S.ea || 0) / 100, ep, shearOn: !!S.shearOn, ev: (S.ev || 0) / 100, flash, glow, drains: S.drains && (t < B(20) || t >= B(86)), memb: memOn, vis: mt, vconst: S.ph === 'CD' ? 0.35 : 1 });
  X.memB.visible = memOn; X.memB.position.y = TD.CY0 + 0.017; X.memT.visible = memOn; X.memT.position.set(top.dx, top.y + 0.013, 0);
  const rOn = (b) => t < B(20) || t >= B(b);
  X.ringsB.forEach((o, i) => { o.visible = memOn && rOn(MNT.ringB + i * 0.25); o.position.set(0, TD.CY0 + 0.009 + i * 0.011, 0); });
  X.ringsT.forEach((o, i) => { o.visible = memOn && rOn(MNT.ringT + i * 0.25); o.position.set(top.dx, top.y + TD.PAP + TD.STN + 0.006 + i * 0.008, 0); });
  { const strOn = t >= B(20) && t < B(MNT.str[1] + 0.1); X.str.mem.visible = t < B(MNT.vac); X.str.rings.forEach((o, i) => { o.visible = strOn && !(t >= B(i < 2 ? MNT.ringB + i * 0.25 : MNT.ringT + (i - 2) * 0.25)); }); }
  // felső drén: a talplemez csonkjától a fejlemezig (vagy a szabad végéig)
  { const p0 = V(0.045, TD.CY0 + 0.002, -0.034); let p1; if (t < B(20) || t >= B(MNT.drain[1])) p1 = V(top.dx + 0.016, top.y + TD.PAP + TD.STN + TD.CAPH + 0.011, 0); else p1 = X.PL.worldToLocal(X.drainEnd.getWorldPosition(V()));
    const key = p1.toArray().map(v => v.toFixed(4)).join(','); if (key !== X.drainKey) { X.drainKey = key; X.drainT.geometry.dispose(); const mid = p0.clone().lerp(p1, 0.5); mid.x = Math.max(mid.x, 0.045); mid.z = -0.03;
      const pts = [p0, p0.clone().add(V(0.004, 0.02, 0.002)), mid, p1.clone().add(V(0.004, -0.02, -0.01)), p1]; X.drainT.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.0016, 6); }
    X.drainT.visible = t < B(20) || t >= B(MNT.paperB[0]); }
  // cella: víz, légtelenítő, csepp
  { const ws = t < B(20) ? 1 : t < B(MNT.fill[0]) ? 0 : t < B(DIS.drain[0]) ? TL.fillK(t) : 1 - smooth(seg(t, B(DIS.drain[0]), B(DIS.drain[1])));
    X.water.visible = ws > 0.01 && !(shot && shot.cut); const wh = (TD.CYH - 0.006) * ws; X.water.scale.y = Math.max(0.001, wh); X.water.position.y = 0.003 + wh / 2; X.wsurf.visible = X.water.visible && ws < 0.995; X.wsurf.position.y = 0.003 + wh;
    const vo = TL.ventOpen(t); X.cyl.vent.position.y = TD.TOPY + TD.TPH + (vo ? 0.004 : 0); X.cyl.vent.rotation.y = vo ? 1.2 : 0;
    const dk = (t - B(62.75)) / (TL.BEAT * 0.5); X.cyl.drip.visible = vo && t > B(62.75) && t < B(MNT.ventC[0] + 0.2); X.cyl.drip.position.set(0.058 + 0.012, TD.TOPY + TD.TPH + 0.016 - 0.03 * (dk % 1), 0.03);
    X.cyl.walls.forEach(m => { m.visible = !(shot && shot.cut); });
    MNT.nuts.forEach(([a, b], k) => { X.cyl.nuts[k].rotation.y = 2.5 * smooth(seg(t, B(a), B(b))); }); }
  // terhelőrúd: a fejlemezen (vagy a felemelt cellában a perselyben lóg); elmozdulásmérő a rúd konzolján, csúcsa a fedőlapon
  { const se = seated(t); const cp = X.cyl.position; let rb, rx = 0, rz = 0; const capW = PLp(t).y + top.y + TD.PAP + TD.STN + TD.CAPH;
    if (se) { rb = capW; rx = FR[0] + top.dx; rz = FR[1]; } else { rb = cp.y + TD.RAMHANG; rx = cp.x; rz = cp.z; if (mt && Math.hypot(cp.x - FR[0], cp.z - FR[1]) < 0.01) rb = Math.max(rb, capW); }
    const rt = rb + TD.PLEN; setRod(X.ram.ram, V(rx, rb, rz), V(se ? FR[0] : rx, rt, rz));
    const lv = se; X.ram.lvdt.visible = X.ram.tip.visible = lv; if (lv) { const ly = rt - 0.045; X.ram.lvdt.position.set(FR[0], ly, FR[1]); setRod(X.ram.tip, V(FR[0] + 0.07, cp.y + TD.TOPY + TD.TPH, FR[1]), V(FR[0] + 0.07, ly - 0.0925, FR[1])); } }
  X.F.setJack(plat(t));
  // szelepek: 0 cellanyomás (feltöltéstől nyitva), 1–2 drének (CU/CD szerint)
  { const v0 = t < B(20) || (t >= B(MNT.valve[0] + 0.2) && t < B(DIS.cell[0])); const vd = S.ph === 'CU' || S.ph === 'CD' || S.ph === 'open' ? (S.vlv ? 1 : 0) : 0;
    X.PL.valves.forEach((v, i) => { let o = i === 0 ? (t >= B(MNT.valve[0]) && t < B(MNT.valve[1]) ? smooth(seg(t, B(MNT.valve[0] + 0.1), B(MNT.valve[1] - 0.1))) : v0 ? 1 : 0) : vd;
      v.h.rotation.y = (Math.PI / 2) * (1 - o); v.ring.material.color.setHex(o > 0.5 ? 0x3ddc84 : 0xff4d3a); v.ring.visible = t < B(20) || t >= B(MNT.valve[0]); }); }
  // csövek: cellanyomás (0. szelep → cellanyomás-szabályozó), ellennyomás (1. szelep → ellennyomás-szabályozó)
  { L.G.updateMatrixWorld(true); X.PL.updateMatrixWorld(true); const vw = (i) => L.G.worldToLocal(X.PL.valves[i].g.localToWorld(V(0.03, 0, 0)));
    const show = true; X.tubeC.m.visible = X.tubeB.m.visible = show;
    const pc = vw(0), pb = vw(1); const cC = V(POS.CTLC[0] - 0.3, BT + 0.05, POS.CTLC[1]), cB = V(POS.CTLB[0] - 0.3, BT + 0.05, POS.CTLB[1]);
    X.tubeC.set([pc, pc.clone().add(V(-0.03, -0.02, 0.02)), V(pc.x - 0.06, BT + 0.012, pc.z - 0.02), V(FR[0] - 0.26, BT + 0.012, FR[1] - 0.3), V(FR[0] + 0.3, BT + 0.012, FR[1] - 0.34), V(cC.x - 0.12, BT + 0.012, cC.z), cC]);
    X.tubeB.set([pb, pb.clone().add(V(0.03, -0.02, -0.01)), V(pb.x + 0.06, BT + 0.012, pb.z - 0.06), V(FR[0] + 0.3, BT + 0.012, FR[1] - 0.17), V(cB.x - 0.14, BT + 0.012, cB.z - 0.02), cB]);
    X.tubeC.flow(t, t >= B(MNT.fill[0]) && t < B(MNT.fill[1]) ? -1 : 0); X.tubeB.flow(t, -(S.flow || 0));
    const pp = L.G.worldToLocal(X.PL.ppt.localToWorld(V(0.075, 0, 0))); const key = pp.toArray().map(v => v.toFixed(3)).join(','); if (key !== X.cableKey) { X.cableKey = key; X.cable.geometry.dispose();
      X.cable.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([pp, pp.clone().add(V(0.04, -0.01, 0.02)), V(pp.x + 0.07, BT + 0.004, pp.z + 0.02), V(FR[0] + 0.3, BT + 0.004, FR[1] - 0.05), V(FR[0] + 0.36, BT + 0.03, FR[1] - 0.33)]), 40, 0.0022, 6); } }
  // kijelzők
  TX.drawCtl(X.ctlC.sc, 'CELLANYOMÁS', 'σ', 'c', S.sc || 0, 'kPa'); TX.drawCtl(X.ctlB.sc, S.ph === 'UU' || S.ph === null || S.ph === 'pre' ? 'ELLENNYOMÁS' : 'ELLENNYOMÁS', 'u', 'B', S.ph === 'UU' ? null : (S.uB || 0), 'kPa');
  X.ctlC.pis.position.x = 0.045 + 0.15 * clamp((S.sc || 0) / 600, 0, 1); X.ctlB.pis.position.x = 0.045 + 0.15 * clamp(0.5 + (S.ev || 0) / 12, 0, 1);
  TX.drawPanel(X.F.panel, t >= B(72) && t < B(116) ? (S.ea || 0).toFixed(2).replace('.', ',') + ' %' : (plat(t) * 1000).toFixed(1).replace('.', ',') + ' mm');
  drawPCscreen(L, S, t);
  // laboráns
  C.apply(t, L.tech, shot && shot.look !== undefined ? { look: shot.look } : {});
  return S;
}
const MASSON = 39.9;
function drawPCscreen(L, S, t) {
  drawPC(L.pc.scr, t, 'TRIAXIÁLIS VIZSGÁLAT' + (S.ph && S.ph !== 'pre' && S.ph !== 'open' ? '  ·  ' + S.ph : ''), (g) => {
    const Lx = 90, Rx = 640, Ty = 100, By = 540; g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 2; g.beginPath(); g.moveTo(Lx, Ty); g.lineTo(Lx, By); g.lineTo(Rx, By); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.6)'; g.font = '600 22px Arial'; g.textAlign = 'left'; g.fillText('q [kPa]', Lx - 70, Ty - 14); g.fillText('ε [%]', Rx - 50, By + 36);
    const col = TL.COL[S.ph] || '#B48CFF'; const qmax = S.ph === 'CD' ? 400 : S.ph === 'CU' ? 200 : 150; const fq = S.ph === 'UU' ? (e) => TL.qUU(e, TL.UU[1].qf) : S.ph === 'CU' ? (e) => TL.qCU(e, TL.CU[1].qf) : S.ph === 'CD' ? (e) => TL.qCD(e, TL.CD[1].qf) : null;
    if (fq && S.ea > 0) { g.strokeStyle = col; g.lineWidth = 5; g.beginPath(); for (let e = 0; e <= S.ea; e += 0.1) { const x = Lx + e / 16 * (Rx - Lx), y = By - fq(e) / qmax * (By - Ty); if (e === 0) g.moveTo(x, y); else g.lineTo(x, y); } g.stroke(); }
    const rows = [['σc', (S.sc || 0).toFixed(0) + ' kPa'], ['u', (S.u || 0).toFixed(0) + ' kPa'], ['ε', (S.ea || 0).toFixed(2) + ' %'], ['q', (S.q || 0).toFixed(1) + ' kPa'], ['ΔV', (S.ev || 0).toFixed(2) + ' %']];
    g.font = '700 30px Arial'; rows.forEach(([k, v], i) => { g.fillStyle = 'rgba(255,255,255,0.6)'; g.textAlign = 'left'; g.fillText(k, 690, 140 + i * 82); g.fillStyle = '#ffffff'; g.textAlign = 'right'; g.fillText(v, 1000, 140 + i * 82); }); });
}
