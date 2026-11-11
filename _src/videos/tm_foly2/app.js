// Folyási határ – labor: üveglap a péppel, két spatula, spriccflaska, ejtőkúp-csésze, digitális ejtőkúp-készülék, tégely, mérleg,
// Casagrande-készülék a barázdahúzóval. Minden mozdulatot a laboráns keze végez (tm_lab/act.js, tm_lab/grips3.js).
import { THREE, V, BT, M, cyl, bx, drawScale } from '../tm_lab/room.js';
import { Choreo, keyed, stdPoses } from '../tm_lab/act.js';
import { diskTop, powerCyl, rimOblique, bladeTop, fingerPress, flatPalm } from '../tm_lab/grips3.js';
import * as KZ from '../tm_lab/konz2.js';
import { SP, CUP, FC, CS } from '../tm_lab/konz2.js';
import * as TL from './timeline.js';
import { tb, WB, MIXP, FILL, STRIKE, CUPMV, LOWER, ZERO, REL, LIFT, REP2, CUPOUT, SAMP, TSCALE, MORE, CFILL, CLEV, CGRV, CRANK, SCOOPS } from './timeline.js';
import { clamp, lerp, smooth, seg } from '../../kit/util.js';
const B = (b) => tb(b);
const tv = (a) => (a && a.isVector3) ? a.clone() : V(a[0], a[1], a[2]);
const QI = new THREE.Quaternion();
const qx = (a) => new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), a), qy = (a) => new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), a), qz = (a) => new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), a);
const sideP = (sd, aim) => { const a = aim.clone().setY(0).normalize(); const s = sd === 'R' ? V(a.z, 0, -a.x) : V(-a.z, 0, a.x); return s.multiplyScalar(0.94).addScaledVector(a, 0.34).normalize(); };
function path(pts, t0, t1, q0 = QI, q1 = q0) { const crv = new THREE.CatmullRomCurve3(pts.map(tv), false, 'centripetal'); return (t) => { const u = smooth(seg(t, t0, t1)); return { p: crv.getPointAt(u), q: q0.clone().slerp(q1, u) }; }; }
const lift = (p, h) => [p[0], p[1] + h, p[2]];
// ---- elrendezés ----
export const POS = { PLATE: [-0.98, -1.0], LUMP: [-0.95, -1.0], SPL: [-1.1, -0.885], SPR: [-0.84, -0.885], WB: [-1.22, -1.07], CUP0: [-0.74, -0.9], PEN: [-0.15, -1.1], TIN: [-0.62, -0.87], SCL: 0.3, CAS: [-0.5, -1.05], GRV: [-0.4, -0.88] };
const PLY = BT + 0.006, SEAT = [POS.PEN[0], BT + FC.BASE + 0.004, POS.PEN[1] + FC.CZ], CUP0 = [POS.CUP0[0], BT, POS.CUP0[1]], TIN0 = [POS.TIN[0], BT, POS.TIN[1]], SCLP = [POS.SCL, BT + 0.069, -1.06];
const LUMPP = V(POS.LUMP[0], PLY, POS.LUMP[1]);
let C, X = {};
export function board(g) { g.strokeStyle = '#2b4f9e'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(80, 440); g.lineTo(960, 440); g.moveTo(80, 440); g.lineTo(80, 60); g.stroke();
  g.strokeStyle = '#c0281e'; g.beginPath(); g.moveTo(140, 400); g.lineTo(900, 110); g.stroke(); g.setLineDash([12, 10]); g.beginPath(); g.moveTo(560, 440); g.lineTo(560, 240); g.lineTo(80, 240); g.stroke(); g.setLineDash([]);
  g.fillStyle = '#2b4f9e'; g.font = 'italic 700 40px Arial'; g.fillText('w %', 20, 60); g.fillText('behatolás [mm]', 700, 490); g.fillStyle = '#c0281e'; g.font = 'italic 600 34px Arial'; g.fillText('20 mm', 520, 480); }

// ---------------- spatulák ----------------
// a jobb spatula pengéje balra (−x), a balé jobbra (+x) mutat; munka közben a penge vége lefelé billen
const SPR0 = [POS.SPR[0], PLY + 0.0012, POS.SPR[1]], SPL0 = [POS.SPL[0], PLY + 0.0012, POS.SPL[1]];
const QR = qy(Math.PI), QL = QI.clone();
const tiltR = (a) => QR.clone().premultiply(qz(a)), tiltL = (a) => QL.clone().premultiply(qz(-a));
// keverés: a két penge a pép körül köröz és összehajtja
function mixPose(sd) { const a = MIXP[0], b = MIXP[1]; const s = sd === 'R' ? 1 : -1; const rest = sd === 'R' ? SPR0 : SPL0; const Q0 = sd === 'R' ? QR : QL;
  const work = (t) => { const u = seg(t, B(a + 0.55), B(b - 0.55)); const ph = u * Math.PI * 2 * 5 + (sd === 'R' ? 0 : Math.PI); const r = 0.03 + 0.012 * Math.sin(u * 17);
    const p = LUMPP.clone().add(V(s * 0.065 + 0.03 * Math.cos(ph) * 0.6, 0.012 + 0.006 * (0.5 + 0.5 * Math.sin(ph * 2)), 0.02 * Math.sin(ph))); const q = (sd === 'R' ? tiltR : tiltL)(0.38 + 0.12 * Math.sin(ph)); return { p, q }; };
  return (t) => { if (t < B(a + 0.15) || t >= B(b)) return { p: tv(rest), q: Q0.clone() }; const w0 = work(B(a + 0.55)), w1 = work(B(b - 0.55));
    if (t < B(a + 0.55)) { const k = smooth(seg(t, B(a + 0.15), B(a + 0.55))); return { p: tv(rest).lerp(w0.p, k).add(V(0, 0.04 * Math.sin(Math.PI * k), 0)), q: Q0.clone().slerp(w0.q, k) }; }
    if (t < B(b - 0.55)) return work(t); const k = smooth(seg(t, B(b - 0.55), B(b - 0.1))); return { p: w1.p.clone().lerp(tv(rest), k).add(V(0, 0.04 * Math.sin(Math.PI * k), 0)), q: w1.q.clone().slerp(Q0, k) }; }; }
// töltés: a jobb spatula háromszor visz pépet a csészébe; lehúzás: a penge éle előre-hátra a csésze tetején; minta a tégelybe; Casagrande-csésze
const CUPTOP = (cx, cz) => V(cx, BT + CUP.B + CUP.H, cz);
function rSpatPose(t) {
  const rest = { p: tv(SPR0), q: QR.clone() };
  if (t >= B(MIXP[0]) && t < B(MIXP[1])) return mixPose('R')(t);
  const scoopTo = (a, b, from, to, qWork, press = 0.012) => { const k1 = smooth(seg(t, B(a), B(a + (b - a) * 0.3))), k2 = smooth(seg(t, B(a + (b - a) * 0.3), B(a + (b - a) * 0.75))), k3 = smooth(seg(t, B(a + (b - a) * 0.75), B(b)));
    const scoop = from.clone().add(V(-0.02, 0.008, 0)), over = to.clone().add(V(0.02, 0.03, 0)), into = to.clone().add(V(0.0, -press, 0));
    if (k1 < 1) return { p: scoop.clone().add(V(0.03 * (1 - k1), 0.01 * Math.sin(Math.PI * k1), 0)), q: tiltR(0.35) };
    if (k2 < 1) return { p: scoop.clone().lerp(over, k2).add(V(0, 0.05 * Math.sin(Math.PI * k2), 0)), q: tiltR(lerp(0.35, 0.15, k2)) };
    return { p: over.clone().lerp(into, Math.sin(Math.PI * k3)), q: tiltR(lerp(0.15, 0.55, Math.sin(Math.PI * k3))) }; };
  const between = (a, b, A, Bq) => { const k = smooth(seg(t, B(a), B(b))); return { p: A.p.clone().lerp(Bq.p, k).add(V(0, 0.04 * Math.sin(Math.PI * k), 0)), q: A.q.clone().slerp(Bq.q, k) }; };
  const cupC = CUPTOP(CUP0[0], CUP0[2]);
  if (t >= B(FILL[0]) && t < B(STRIKE[1])) {
    if (t < B(SCOOPS[0][0])) return between(FILL[0], SCOOPS[0][0], rest, { p: LUMPP.clone().add(V(0.01, 0.008, 0)), q: tiltR(0.35) });
    for (const [a, b] of SCOOPS) if (t >= B(a) && t < B(b)) return scoopTo(a, b, LUMPP, cupC, null);
    // lehúzás: a penge laposan, két húzás előre-hátra
    const sa = STRIKE[0], sb = STRIKE[1]; const st0 = { p: cupC.clone().add(V(0.035, 0.004, 0.03)), q: tiltR(0.05) };
    if (t < B(sa + 0.35)) return between(SCOOPS[2][1], sa + 0.35, scoopTo(SCOOPS[2][0], SCOOPS[2][1], LUMPP, cupC), st0);
    if (t < B(sb - 0.45)) { const u = seg(t, B(sa + 0.35), B(sb - 0.45)); const z = 0.03 * Math.cos(u * Math.PI * 2); return { p: cupC.clone().add(V(0.035, 0.0013, z)), q: tiltR(0.04) }; }
    return between(sb - 0.45, sb, { p: cupC.clone().add(V(0.035, 0.0013, 0.03)), q: tiltR(0.04) }, rest); }
  if (t >= B(SAMP[0]) && t < B(SAMP[1])) { const cc = CUPTOP(CUP0[0], CUP0[2]); const tin = V(TIN0[0], BT + 0.01, TIN0[2]);
    const a = SAMP[0], b = SAMP[1]; if (t < B(a + 0.45)) return between(a, a + 0.45, rest, { p: cc.clone().add(V(0.01, 0.004, 0)), q: tiltR(0.4) }); if (t < B(b - 0.45)) return scoopTo(a + 0.45, b - 0.45, cc.clone().add(V(0.02, -0.004, 0)), tin, null, 0.004);
    return between(b - 0.45, b, scoopTo(a + 0.45, b - 0.45, cc, tin, null, 0.004), rest); }
  if (t >= B(CFILL[0]) && t < B(CLEV[1])) { const cc = casPaste(); const a = CFILL[0], m = (CFILL[0] + CFILL[1]) / 2, b = CFILL[1];
    if (t < B(a + 0.4)) return between(a, a + 0.4, rest, { p: LUMPP.clone().add(V(0.01, 0.008, 0)), q: tiltR(0.35) });
    if (t < B(m)) return scoopTo(a + 0.4, m, LUMPP, cc, null, 0.004); if (t < B(b)) return scoopTo(m, b, LUMPP, cc, null, 0.004);
    const la = CLEV[0], lb = CLEV[1]; if (t < B(lb - 0.4)) { const u = seg(t, B(la), B(lb - 0.4)); return { p: cc.clone().add(V(0.035 + 0.025 * Math.sin(u * Math.PI * 4), 0.006, -0.02 + 0.04 * u)), q: tiltR(0.08) }; }
    return between(lb - 0.4, lb, { p: cc.clone().add(V(0.035, 0.006, 0.02)), q: tiltR(0.08) }, rest); }
  return rest; }
const casPaste = () => V(POS.CAS[0] + CS.CUPX, BT + CS.HINGE[1] - 0.0215 + 0.02, POS.CAS[1]);
function lSpatPose(t) { if (t >= B(MIXP[0]) && t < B(MIXP[1])) return mixPose('L')(t); return { p: tv(SPL0), q: QL.clone() }; }

// ---------------- a csésze, tégely, flaska, kúp ----------------
function cupPose(t) {
  if (t < B(16)) return { p: tv(SEAT), q: QI.clone() };
  if (t < B(CUPMV[0] + 0.2)) return { p: tv(CUP0), q: QI.clone() };
  if (t < B(CUPOUT[0])) return keyed([{ t: B(CUPMV[0] + 0.2), p: CUP0 }, { t: B(CUPMV[1] - 0.05), p: SEAT, lift: 0.06 }])(t);
  if (t < B(56)) return keyed([{ t: B(CUPOUT[0] + 0.2), p: SEAT }, { t: B(CUPOUT[1] - 0.05), p: CUP0, lift: 0.06 }])(t);
  if (t < B(68)) return { p: tv(SEAT), q: QI.clone() };
  return { p: tv(CUP0), q: QI.clone() }; }
function tinPose(t) { if (t < B(TSCALE[0] + 0.2)) return { p: tv(TIN0), q: QI.clone() }; return keyed([{ t: B(TSCALE[0] + 0.2), p: TIN0 }, { t: B(TSCALE[1] - 0.05), p: SCLP, lift: 0.06 }])(t); }
// spriccflaska: a pép fölé, a fúvóka balra-le
const WB0 = [POS.WB[0], BT, POS.WB[1]], QWB = qy(-Math.PI / 2);
function wbPose(t) { const runs = [WB]; for (const [a, b] of runs) if (t >= B(a) && t < B(b)) {
    const pp = [LUMPP.x + 0.15, BT + 0.1, LUMPP.z + 0.02]; const to = keyed([{ t: B(a + 0.15), p: WB0 }, { t: B(a + (b - a) * 0.4), p: pp, lift: 0.08 }]); const fro = keyed([{ t: B(b - (b - a) * 0.35), p: pp }, { t: B(b - 0.05), p: WB0, lift: 0.06 }]);
    if (t < B(a + (b - a) * 0.4)) { const s = to(t); s.q = QWB.clone(); return s; } if (t < B(b - (b - a) * 0.35)) { const k = Math.sin(Math.PI * seg(t, B(a + (b - a) * 0.4), B(b - (b - a) * 0.35))); return { p: tv(pp), q: QWB.clone().premultiply(qz(0.75 * k)) }; }
    const s = fro(t); s.q = QWB.clone(); return s; }
  return { p: tv(WB0), q: QWB.clone() }; }
const wbSquirt = (t) => { for (const [a, b] of [WB]) { const u = seg(t, B(a + (b - a) * 0.45), B(b - (b - a) * 0.4)); if (u > 0 && u < 1) return Math.sin(Math.PI * u); } return 0; };
// barázdahúzó: tartóból a csésze fölé, függőlegesen hátulról előre a pépen át, vissza
const QGW = qy(Math.PI / 2).multiply(qz(-Math.PI / 2 + 0.25)), QG0 = QGW.clone(), GRV0 = [POS.GRV[0], BT + 0.042, POS.GRV[1]];
function grvPose(t) { const a = CGRV[0], b = CGRV[1]; const pc = casPaste().add(V(0, 0.004, 0)); const back = pc.clone().add(V(0, 0.0, -0.045)), front = pc.clone().add(V(0, 0.0, 0.045));
  if (t < B(a + 0.15) || t >= B(b)) return { p: tv(GRV0), q: QG0.clone() };
  if (t < B(a + 0.7)) { const k = smooth(seg(t, B(a + 0.15), B(a + 0.7))); return { p: tv(GRV0).lerp(back.clone().add(V(0, 0.03, 0)), k).add(V(0, 0.06 * Math.sin(Math.PI * k), 0)), q: QG0.clone().slerp(QGW, k) }; }
  if (t < B(a + 0.9)) return { p: back.clone().add(V(0, 0.03 * (1 - smooth(seg(t, B(a + 0.7), B(a + 0.9)))), 0)), q: QGW.clone() };
  if (t < B(b - 0.7)) return { p: back.clone().lerp(front, smooth(seg(t, B(a + 0.9), B(b - 0.7)))), q: QGW.clone() };
  const k = smooth(seg(t, B(b - 0.7), B(b))); return { p: front.clone().add(V(0, 0.04 * k, 0)).lerp(tv(GRV0), smooth(seg(t, B(b - 0.45), B(b)))), q: QGW.clone().slerp(QG0, smooth(seg(t, B(b - 0.45), B(b)))) }; }

export function build(L, R) {
  stdPoses(); const G = L.G; C = new Choreo(L, { hang: true }); X.C = C; L.pc.g.visible = false;
  L.scl.G.position.set(POS.SCL, BT, -1.05);
  X.plate = KZ.glassPlate3(); X.plate.position.set(POS.PLATE[0], BT, POS.PLATE[1]); G.add(X.plate);
  X.lump = KZ.pasteLump(); X.lump.position.copy(LUMPP); G.add(X.lump);
  X.spR = KZ.spatula2(); G.add(X.spR); C.prop('spR', X.spR, rSpatPose); X.spL = KZ.spatula2(); G.add(X.spL); C.prop('spL', X.spL, lSpatPose);
  X.wb = KZ.washBottle(); G.add(X.wb); C.prop('wb', X.wb, wbPose);
  X.spray = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 8), new THREE.MeshStandardMaterial({ color: 0xcfe9f7, transparent: true, opacity: 0.6, roughness: 0.02, depthWrite: false })); X.spray.visible = false; G.add(X.spray);
  X.cup = KZ.coneCup(); G.add(X.cup); C.prop('cup', X.cup, cupPose);
  X.pen = KZ.penetrometer(); X.pen.position.set(POS.PEN[0], BT, POS.PEN[1]); G.add(X.pen);
  X.tin = KZ.tin3(); G.add(X.tin); C.prop('tin', X.tin, tinPose);
  X.cas = KZ.casagrande2(); X.cas.position.set(POS.CAS[0], BT, POS.CAS[1]); G.add(X.cas);
  X.grv = KZ.groover(); G.add(X.grv); C.prop('grv', X.grv, grvPose);
  { const h = new THREE.Group(); h.position.set(POS.GRV[0], BT, POS.GRV[1]); G.add(h); bx(-0.02, 0.02, 0, 0.022, -0.02, 0.02, KZ.kmats().dark, h); }
  { const f = new THREE.PointLight(0xfff2e2, 3.5, 3.5, 1.6); f.position.set(-0.9, 2.0, 0.2); G.add(f); }

  // ---------------- a laboráns ----------------
  const Z = -0.6, aimL = (sd, pr, b, pl) => C.aimLocal(sd, pr, B(b), pl), aimW = (sd, b, p) => C.aimLab(sd, B(b), p);
  C.at(0, 0.8, Z).at(B(15.9), 0.8, Z).at(B(16.0), -1.0, Z).at(B(24.9), -1.0, Z).at(B(25.2), -0.78, Z).at(B(31.7), -0.78, Z).at(B(32.0), -0.74, Z).at(B(33.3), -0.3, -0.56).at(B(41.0), -0.24, -0.56)
   .at(B(46.0), -0.26, -0.56).at(B(47.3), -0.72, Z).at(B(49.7), -0.68, Z).at(B(51.0), 0.12, Z, { spd: 0.6 }).at(B(55.9), 0.12, Z).at(B(56.0), -0.24, -0.56).at(B(67.9), -0.24, -0.56).at(B(68.0), 0.8, Z).at(B(77.9), 0.8, Z).at(B(78.0), -0.8, Z).at(B(81.5), -0.78, Z).at(B(83.1), -0.52, Z).at(B(104), -0.5, Z);
  // spatulák: kalapácsfogás a nyélen, a hüvelyk a penge felé, tenyér lefelé
  const spG = (sd) => powerCyl(sd, V(SP.GRIP, 0, 0), V(1, 0, 0), SP.HR, V(0, -1, 0));
  C.hold('R', B(MIXP[0]), B(MIXP[1]), 'spR', spG('R')); C.hold('L', B(MIXP[0]), B(MIXP[1]), 'spL', spG('L'));
  C.hold('R', B(FILL[0]), B(STRIKE[1]), 'spR', spG('R')); C.hold('R', B(SAMP[0]), B(SAMP[1]), 'spR', spG('R')); C.hold('R', B(CFILL[0]), B(CLEV[1]), 'spR', spG('R'));
  // flaska oldalról
  const wbG = (b) => powerCyl('R', V(0, 0.07, 0), V(0, 1, 0), 0.036, sideP('R', aimL('R', 'wb', b, [0, 0.07, 0])));
  C.hold('R', B(WB[0]), B(WB[1]), 'wb', wbG(WB[0]));
  // a csésze: bal kéz tartja töltéskor és lehúzáskor (ferde peremfogás), jobb kéz viszi (oldalról)
  const cupHold = (sd) => rimOblique(sd, V(sd === 'L' ? -CUP.RO : CUP.RO, CUP.H + CUP.B, 0), V(sd === 'L' ? -1 : 1, 0, 0), 0.03, CUP.RO, V(0, 0, -1), { inset: 0.003 });
  C.hold('L', B(SCOOPS[0][0]), B(STRIKE[1] - 0.3), 'cup', cupHold('L')); C.hold('L', B(SAMP[0] + 0.3), B(SAMP[1] - 0.4), 'cup', cupHold('L'));
  const cupG = (b) => rimOblique('R', V(CUP.RO, CUP.H + CUP.B, 0), V(1, 0, 0), 0.03, CUP.RO, V(0, 0, -1), { inset: 0.003 });
  C.hold('R', B(CUPMV[0]), B(CUPMV[1]), 'cup', cupG(CUPMV[0])); C.hold('R', B(CUPOUT[0]), B(CUPOUT[1]), 'cup', cupG(CUPOUT[0]));
  // ejtőkúp: finomállító gomb (bal kéz felülről), nullázó és kioldó (jobb mutatóujj), a kúp visszatolása (jobb kéz csípőfogás a gyűrűn)
  const knobC = (t) => V(POS.PEN[0] + FC.KNOB[0], BT + TL.headY(t) + FC.HEAD_H + 0.018, POS.PEN[1] + FC.KNOB[2] - 0.02);
  const knobG = (t) => { const c = knobC(t); const a0 = C.aimLab('L', B(LOWER[0]), c); return diskTop('L', c, 0.016, 0.018, a0.applyAxisAngle(V(0, 1, 0), 0.8 * Math.sin(seg(t, B(LOWER[0]), B(LOWER[1])) * Math.PI * 3)), { depth: 0.007 }); };
  C.holdF('L', B(LOWER[0]), B(LOWER[1]), null, knobG); C.holdF('L', B(LIFT[0] + 0.85), B(LIFT[1]), null, knobG);
  { const zp = V(POS.PEN[0] + FC.ZERO[0], BT + TL.HTOUCH + FC.ZERO[1], POS.PEN[1] + FC.CZ + 0.039); C.hold('R', B(ZERO[0]), B(ZERO[1]), null, fingerPress('R', zp, aimW('R', ZERO[0], zp), { n: V(0, 0, 1) })); }
  const btnP = (t) => V(POS.PEN[0] + FC.BTN[0], BT + TL.headY(t) + FC.HEAD_H + 0.012, POS.PEN[1] + FC.BTN[2] - 0.02);
  C.hold('R', B(REL[0]), B(REL[1]), null, fingerPress('R', btnP(B(REL[0])), aimW('R', REL[0], btnP(B(REL[0])))));
  for (const m of MORE) C.hold('R', B(m.rel[0]), B(m.rel[0] + 1.0), null, fingerPress('R', btnP(B(m.rel[0])), aimW('R', m.rel[0], btnP(B(m.rel[0])))));
  C.holdF('R', B(LIFT[0]), B(LIFT[0] + 0.85), null, (t) => { const top = V(POS.PEN[0], BT + TL.HTOUCH - FC.TIP - TL.coneDrop(t) / 1000 + 0.196, POS.PEN[1] + FC.CZ); return bladeTop('R', top, aimW('R', LIFT[0], top), 0.022, { down: 0.006 }); });
  // tégely a mérlegre (ferde peremfogás)
  C.hold('R', B(TSCALE[0]), B(TSCALE[1]), 'tin', rimOblique('R', V(0.03, 0.024, 0), V(1, 0, 0), 0.02, 0.03, V(0, 0, -1), { inset: 0.003 }));
  // Casagrande: barázdahúzó (tőrfogás, a hegy lefelé), a bal kéz az alaplapon; hajtókar (felülről, a hüvelyk a készülék felé)
  C.hold('R', B(CGRV[0]), B(CGRV[1]), 'grv', (() => { const g = powerCyl('R', V(-0.06, 0, 0), V(-1, 0, 0), 0.0075, V(0, 0, -1)); return g; })());
  C.holdF('R', B(CRANK[0]), B(CRANK[1]), null, (t) => { const a = TL.crankA(t); const c = V(POS.CAS[0] + CS.CRANK[0] + 0.026, BT + CS.CRANK[1] - CS.CRR * Math.sin(a), POS.CAS[1] + CS.CRANK[2] + CS.CRR * Math.cos(a)); return powerCyl('R', c, V(-1, 0, 0), 0.008, V(0, -1, 0)); });
  if (typeof window !== 'undefined') window.__X = X;
}

export function update(L, t, shot) {
  C.update(t);
  // pép az üveglapon: fogy a töltéskor
  { let k = 1; for (const [a, b] of SCOOPS) k -= 0.12 * smooth(seg(t, B(a + (b - a) * 0.25), B(a + (b - a) * 0.35))); if (t >= B(SAMP[0])) k -= 0; if (t >= B(CFILL[0])) k -= 0.2 * smooth(seg(t, B(CFILL[0] + 0.4), B(CFILL[1] - 0.3)));
    const w = t > B(MIXP[0] + 0.5) && t < B(MIXP[1] - 0.5) ? 1 : 0; X.lump.set(Math.max(0.3, k), w, t); X.lump.m.material.color.setScalar(t > B(WB[1]) ? 0.92 : 1); }
  // spatulán a pép (töltés közben)
  { let on = false; for (const [a, b] of SCOOPS) if (t > B(a + (b - a) * 0.3) && t < B(a + (b - a) * 0.85)) on = true; for (const [a, b] of [[SAMP[0] + 0.45, SAMP[1] - 0.45], [CFILL[0] + 0.4, (CFILL[0] + CFILL[1]) / 2], [(CFILL[0] + CFILL[1]) / 2, CFILL[1]]]) if (t > B(a + (b - a) * 0.3) && t < B(a + (b - a) * 0.85)) on = true; X.spR.blob.visible = on; }
  // spriccflaska sugara
  { const s = wbSquirt(t); X.spray.visible = s > 0.02; if (s > 0.02) { L.G.updateMatrixWorld(true); const a = X.wb.localToWorld(X.wb.tip.clone()).sub(L.G.position), b = LUMPP.clone().add(V(0.02, 0.015, 0.0)); const d = b.clone().sub(a); X.spray.position.copy(a).addScaledVector(d, 0.5); X.spray.scale.set(0.0018 * s, d.length(), 0.0018 * s); X.spray.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); } }
  // csésze: töltés, kupac, lehúzás, kráter
  { let f = 0, mound = 0, cr = 0; SCOOPS.forEach(([a, b], i) => { f += 0.38 * smooth(seg(t, B(a + (b - a) * 0.75), B(b))); }); if (t < B(16)) f = 1; f = Math.min(1, f);
    if (t >= B(SCOOPS[2][1])) mound = 1 - smooth(seg(t, B(STRIKE[0] + 0.4), B(STRIKE[1] - 0.5))); if (t >= B(16) && t < B(SCOOPS[0][0])) f = 0;
    const d = TL.coneDrop(t) / 1000; cr = d; if (t >= B(LIFT[0] + 0.5) && t < B(56)) cr = TL.REP[0] / 1000; if (t >= B(SAMP[0] + 0.6)) cr = 0; if (t >= B(56) && t < B(68)) { f = 1; mound = 0; } if (t >= B(68)) { f = 0.75; cr = 0; }
    X.cup.set(f, mound, cr); }
  // ejtőkúp: fej, kúp, kijelző
  { X.pen.set(TL.headY(t), TL.coneDrop(t) / 1000); X.pen.btn.position.y = FC.HEAD_H + 0.006 - ((t > B(REL[0] + 0.2) && t < B(REL[1] - 0.1)) || MORE.some(m => t > B(m.rel[0] + 0.2) && t < B(m.rel[0] + 0.9)) ? 0.004 : 0);
    X.pen.knob.rotation.y = 4 * TL.headY(t) / 0.06; const v = TL.dispMM(t); KZ.drawMM(X.pen.disp, v === null ? '– –,–' : v.toFixed(1).replace('.', ',')); }
  // tégely, mérleg
  { X.tin.soil.visible = t > B(SAMP[1] - 0.6); const m = t > B(TSCALE[1] - 0.05) ? (t < B(52.2) ? TL.W1.mw : TL.W1.md) : 0; drawScale(L.scl.disp, m, 2); }
  // Casagrande: pép, barázda, csésze emelése, számláló
  { const filled = smooth(seg(t, B(CFILL[0] + 0.6), B(CFILL[1] - 0.2))); X.cas.paste.visible = t > B(CFILL[0] + 0.6) || t < B(16); X.cas.paste.scale.set(1, Math.max(0.05, t < B(16) ? 1 : filled), 1);
    const gr = t < B(16) || t > B(CGRV[0] + 1.0); X.cas.grooveL.visible = gr; if (gr) { const k = t < B(16) ? 1 : clamp(seg(t, B(CGRV[0] + 0.9), B(CGRV[1] - 0.7))); const cl = t < B(16) ? 1 : TL.grooveClose(t); X.cas.setGroove(0.07 * Math.max(0.03, k), 0.01 * cl); }
    X.cas.cupG.rotation.x = TL.cupLift(t) / 0.07; X.cas.crank.rotation.x = -TL.crankA(t); const n = TL.blowAt(t); const g = X.cas.disp.g; g.fillStyle = '#0d1f14'; g.fillRect(0, 0, 160, 64); g.fillStyle = '#9fe36a'; g.font = '700 46px Arial'; g.textAlign = 'center'; g.fillText(String(t < B(16) ? 27 : n), 80, 50); X.cas.disp.t.needsUpdate = true; }
  C.apply(t, L.tech, shot && shot.look !== undefined ? { look: shot.look } : {});
  return { X, C };
}
export const __X = X;
