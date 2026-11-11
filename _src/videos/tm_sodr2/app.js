// Sodrási határ – labor: üveglap a péppel, spatula, a gombóc a tenyerek között, négy rész, sodrás a tenyér alatt 3 mm-es fonálig,
// 3 mm-es összehasonlító pálca, a morzsolódó fonál a tégelybe, fedő, mérleg. Minden mozdulatot a laboráns keze végez.
import { THREE, V, BT, M, cyl, bx, drawScale } from '../tm_lab/room.js';
import { Choreo, keyed, stdPoses } from '../tm_lab/act.js';
import { diskTop, powerCyl, rimOblique, flatPalm } from '../tm_lab/grips3.js';
import * as KZ from '../tm_lab/konz2.js';
import { SP } from '../tm_lab/konz2.js';
import * as TL from './timeline.js';
import { tb, PICK, BALL, PUT, CUT, ROLL1, GATHER, ROLL2, CRUMBLE, SCRAPE, LID, TSCALE } from './timeline.js';
import { clamp, lerp, smooth, seg } from '../../kit/util.js';
const B = (b) => tb(b);
const tv = (a) => (a && a.isVector3) ? a.clone() : V(a[0], a[1], a[2]);
const QI = new THREE.Quaternion();
const qy = (a) => new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), a), qz = (a) => new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), a), qx = (a) => new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), a);
// ---- elrendezés ----
export const POS = { PLATE: [-0.62, -1.0], LUMP: [-0.72, -1.06], WORK: [-0.6, -0.95], ROD: [-0.6, -1.1], SPR: [-0.43, -0.885], TIN: [-0.28, -0.92], LID0: [-0.19, -0.93], SCL: 0.02, BODY: -0.62 };
const PLY = BT + 0.006, LUMPP = V(POS.LUMP[0], PLY, POS.LUMP[1]), WORKP = V(POS.WORK[0], PLY, POS.WORK[1]);
const TIN0 = [POS.TIN[0], BT, POS.TIN[1]], LID0 = [POS.LID0[0], BT, POS.LID0[1]], SCLP = [POS.SCL, BT + 0.069, -1.06];
const SPR0 = [POS.SPR[0], PLY + 0.0012, POS.SPR[1]], QR = qy(Math.PI), tiltR = (a) => QR.clone().premultiply(qz(a));
const BALLC = V(POS.BODY - 0.06, BT + 0.24, -0.97);                      // a gombóc a has előtt, az asztal fölött
let C, X = {};
export function board(g) { g.strokeStyle = '#2b4f9e'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(80, 440); g.lineTo(960, 440); g.moveTo(80, 440); g.lineTo(80, 60); g.stroke();
  g.strokeStyle = '#c0281e'; g.beginPath(); g.moveTo(200, 440); g.lineTo(940, 120); g.stroke(); g.fillStyle = '#2b4f9e'; g.font = 'italic 700 40px Arial'; g.fillText('I', 30, 60); g.font = 'italic 700 26px Arial'; g.fillText('P', 44, 70);
  g.font = 'italic 700 40px Arial'; g.fillText('w', 880, 490); g.font = 'italic 700 26px Arial'; g.fillText('L', 910, 500); g.fillStyle = '#c0281e'; g.font = 'italic 600 34px Arial'; g.fillText('A-vonal', 700, 170); }

// ---------------- spatula ----------------
const tipP = (tip, a) => ({ p: tip.clone().add(V(SP.BL * Math.cos(a), SP.BL * Math.sin(a) + 0.0012, 0)), q: tiltR(a) });
function rSpatPose(t) {
  const rest = { p: tv(SPR0), q: QR.clone() };
  const between = (a, b, A, Bq) => { const k = smooth(seg(t, B(a), B(b))); return { p: A.p.clone().lerp(Bq.p, k).add(V(0, 0.04 * Math.sin(Math.PI * k), 0)), q: A.q.clone().slerp(Bq.q, k) }; };
  const palmP = () => palmBall(B(PICK[1] - 0.2)).add(V(0.03, 0.015, 0));
  if (t >= B(PICK[0]) && t < B(PICK[1])) { const a = PICK[0], b = PICK[1]; const sc = tipP(LUMPP.clone().add(V(-0.01, 0.012, 0)), 0.3), ov = tipP(palmP().add(V(-0.03, 0.012, 0)), 0.25), dp = tipP(palmP().add(V(-0.025, 0.004, 0)), 0.45);
    if (t < B(a + 0.5)) return between(a, a + 0.5, rest, sc); if (t < B(a + 1.2)) return between(a + 0.5, a + 1.2, sc, ov); if (t < B(a + 1.6)) return between(a + 1.2, a + 1.6, ov, dp); return between(a + 1.6, b, dp, rest); }
  if (t >= B(CUT[0]) && t < B(CUT[1])) { const a = CUT[0], b = CUT[1]; const press = (k, dz) => tipP(WORKP.clone().add(V(0.0, 0.03 - 0.028 * Math.sin(Math.PI * k), dz)), 0.85);
    if (t < B(a + 0.5)) return between(a, a + 0.5, rest, press(0, -0.006)); if (t < B(a + 1.3)) return press(seg(t, B(a + 0.5), B(a + 1.3)), -0.006); if (t < B(a + 1.6)) return between(a + 1.3, a + 1.6, press(0, -0.006), press(0, 0.006));
    if (t < B(a + 2.4)) return press(seg(t, B(a + 1.6), B(a + 2.4)), 0.006); return between(a + 2.4, b, press(0, 0.006), rest); }
  if (t >= B(SCRAPE[0]) && t < B(SCRAPE[1])) { const a = SCRAPE[0], m = (SCRAPE[0] + SCRAPE[1]) / 2, b = SCRAPE[1]; const tin = V(TIN0[0], BT + 0.012, TIN0[2]);
    const trip = (a1, b1, z) => { const k1 = smooth(seg(t, B(a1), B(a1 + (b1 - a1) * 0.45))), k2 = smooth(seg(t, B(a1 + (b1 - a1) * 0.45), B(a1 + (b1 - a1) * 0.8))), k3 = smooth(seg(t, B(a1 + (b1 - a1) * 0.8), B(b1)));
      const s0 = tipP(WORKP.clone().add(V(0.0, 0.0, z)), 0.35), s1 = tipP(WORKP.clone().add(V(-0.1, 0.0, z)), 0.35), ov = tipP(tin.clone().add(V(-0.01, 0.03, 0)), 0.2), dp = tipP(tin.clone().add(V(0.0, 0.002, 0)), 0.5);
      if (k1 < 1) return { p: s0.p.clone().lerp(s1.p, k1), q: s0.q }; if (k2 < 1) return { p: s1.p.clone().lerp(ov.p, k2).add(V(0, 0.04 * Math.sin(Math.PI * k2), 0)), q: s1.q.clone().slerp(ov.q, k2) }; const k = Math.sin(Math.PI * k3); return { p: ov.p.clone().lerp(dp.p, k), q: ov.q.clone().slerp(dp.q, k) }; };
    if (t < B(a + 0.4)) return between(a, a + 0.4, rest, tipP(WORKP.clone().add(V(0.0, 0.0, -0.003)), 0.35)); if (t < B(m)) return trip(a + 0.4, m, -0.003); if (t < B(b - 0.4)) return trip(m, b - 0.4, 0.004);
    return between(b - 0.4, b, tipP(tin.clone().add(V(0.0, 0.002, 0)), 0.5), rest); }
  return rest; }
// ---------------- gombóc a tenyerek között ----------------
// a bal tenyér felfelé néz a gombóc alatt, a jobb tenyér felülről körözve görgeti
const palmBall = (t) => { const k = smooth(seg(t, B(PICK[0] + 0.2), B(PICK[0] + 1.0))) * (1 - smooth(seg(t, B(PUT[0]), B(PUT[1] - 0.2)))); return BALLC.clone().lerp(WORKP.clone().add(V(0, 0.07, 0)), 1 - k); };
const RBALL = 0.0135;
function ballPose(t) { // a gombóc (vagy a négy rész helye)
  if (t < B(PICK[1] - 0.25)) return null;
  if (t < B(PUT[0])) { const c = palmBall(t); const u = seg(t, B(BALL[0] + 0.3), B(BALL[1] - 0.3)); const w = Math.sin(u * Math.PI) * 0.004; return V(c.x + w * Math.cos(u * 40), c.y + RBALL, c.z + w * Math.sin(u * 40)); }
  if (t < B(PUT[1])) { const c = palmBall(t); return c.clone().add(V(0, RBALL, 0)).lerp(WORKP.clone().add(V(0, RBALL, 0)), smooth(seg(t, B(PUT[1] - 0.35), B(PUT[1])))); }
  return WORKP.clone().add(V(0, RBALL, 0)); }

export function build(L, R) {
  stdPoses(); const G = L.G; C = new Choreo(L, { hang: true }); X.C = C; L.pc.g.visible = false;
  L.scl.G.position.set(POS.SCL, BT, -1.05);
  X.plate = KZ.glassPlate3(); X.plate.position.set(POS.PLATE[0], BT, POS.PLATE[1]); G.add(X.plate);
  X.lump = KZ.pasteLump(); X.lump.position.copy(LUMPP); G.add(X.lump);
  X.spR = KZ.spatula2(); G.add(X.spR); C.prop('spR', X.spR, rSpatPose);
  const S = KZ.kmats();
  X.rod = cyl(0.0015, 0.0015, 0.12, S.steel, 0, 0, 0, 10); X.rod.rotation.z = Math.PI / 2; X.rod.position.set(POS.ROD[0], PLY + 0.0015, POS.ROD[1]); G.add(X.rod);
  X.ball = new THREE.Mesh(new THREE.SphereGeometry(RBALL, 28, 18), S.paste); G.add(X.ball);
  X.parts = [0, 1, 2, 3].map(i => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), S.paste); m.scale.set(0.0085, 0.0075, 0.0085); G.add(m); return m; });
  X.thread = new THREE.Group(); G.add(X.thread); X.thr = new THREE.Mesh(new THREE.CapsuleGeometry(1, 1, 6, 16), S.paste); X.thr.rotation.z = Math.PI / 2; X.thread.add(X.thr);
  X.crumbs = [...Array(11)].map(() => { const m = new THREE.Mesh(new THREE.CapsuleGeometry(1, 1, 4, 10), S.paste); m.rotation.z = Math.PI / 2; X.thread.add(m); return m; });
  X.tin = KZ.tin3(); G.add(X.tin); C.prop('tin', X.tin, (t) => t < B(TSCALE[0] + 0.2) ? { p: tv(TIN0), q: QI.clone() } : keyed([{ t: B(TSCALE[0] + 0.2), p: TIN0 }, { t: B(TSCALE[1] - 0.05), p: SCLP, lift: 0.06 }])(t));
  X.lid = new THREE.Group(); X.lid.add(cyl(0.031, 0.031, 0.003, S.alu, 0, 0.0015, 0, 36)); X.lid.add(cyl(0.008, 0.008, 0.004, S.alu, 0, 0.005, 0, 16)); G.add(X.lid);
  C.prop('lid', X.lid, (t) => { if (t < B(LID[0] + 0.2)) return { p: tv(LID0), q: QI.clone() }; const on = [TIN0[0], BT + 0.024, TIN0[2]]; if (t < B(TSCALE[0] + 0.2)) return keyed([{ t: B(LID[0] + 0.2), p: LID0 }, { t: B(LID[1] - 0.05), p: on, lift: 0.04 }])(t);
    return keyed([{ t: B(TSCALE[0] + 0.2), p: on }, { t: B(TSCALE[1] - 0.05), p: [SCLP[0], SCLP[1] + 0.024, SCLP[2]], lift: 0.06 }])(t); });
  // ---------------- a laboráns ----------------
  const Z = -0.6, X0 = POS.BODY;
  C.at(0, 0.7, Z).at(B(13.9), 0.7, Z).at(B(14.0), X0, Z).at(B(51.9), X0, Z).at(B(52.1), -0.5, Z).at(B(57.9), -0.45, Z).at(B(59.6), -0.1, Z, { spd: 0.6 }).at(B(94), -0.1, Z);
  const spG = () => powerCyl('R', V(SP.GRIP, 0, 0), V(1, 0, 0), SP.HR, V(0, -1, 0));
  for (const [a, b] of [PICK, CUT, SCRAPE]) C.hold('R', B(a), B(b), 'spR', spG());
  // bal tenyér felfelé a gombóc alatt (a PICK közepétől a PUT végéig); jobb tenyér felülről görgeti
  C.holdF('L', B(PICK[0] + 0.3), B(PUT[1]), null, (t) => flatPalm('L', palmBall(t), V(0, -1, 0), V(0.25, 0, -1), { gap: 0.002 }));
  C.holdF('R', B(BALL[0]), B(BALL[1]), null, (t) => { const c = ballPose(t) || palmBall(t); return flatPalm('R', c.clone().add(V(0, RBALL, 0)), V(0, 1, 0), V(-0.25, 0, -1), { gap: 0.002 }); });
  // sodrás: a jobb tenyér a fonálon előre-hátra; összegyúrás: lenyomja
  const rollG = (t) => { const r = TL.threadR(t); const z = 0.035 * TL.rollPhase(t); const p = WORKP.clone().add(V(0, 2 * r, z)); return flatPalm('R', p, V(0, 1, 0), V(-0.1, 0, -1), { gap: 0.002 }); };
  C.holdF('R', B(ROLL1[0]), B(ROLL1[1]), null, rollG); C.holdF('R', B(GATHER[0]), B(GATHER[1]), null, rollG); C.holdF('R', B(ROLL2[0]), B(CRUMBLE + 0.2), null, rollG);
  // fedő (bal kéz felülről), a tégely a mérlegre (jobb kéz ferde peremfogással)
  C.hold('L', B(LID[0]), B(LID[1]), 'lid', diskTop('L', V(0, 0.007, 0), 0.008, 0.007, C.aimLocal('L', 'lid', B(LID[0]), [0, 0.006, 0]), { depth: 0.004 }));
  C.hold('R', B(TSCALE[0]), B(TSCALE[1]), 'tin', rimOblique('R', V(0.03, 0.024, 0), V(1, 0, 0), 0.02, 0.03, V(0, 0, -1), { inset: 0.003 }));
  if (typeof window !== 'undefined') window.__X = X;
}

export function update(L, t, shot) {
  C.update(t);
  { let k = 1; k -= 0.25 * smooth(seg(t, B(PICK[0] + 0.5), B(PICK[0] + 0.9))); X.lump.set(k, 0, t); }
  X.spR.blob.position.x = SP.BL * 0.8; X.spR.blob.visible = (t > B(PICK[0] + 0.55) && t < B(PICK[0] + 1.5)) || [[SCRAPE[0] + 0.4 + 0.45 * 1.9, SCRAPE[0] + 0.4 + 0.8 * 1.9], [ (SCRAPE[0] + SCRAPE[1]) / 2 + 0.45 * 1.7, (SCRAPE[0] + SCRAPE[1]) / 2 + 0.8 * 1.7]].some(([a, b]) => t > B(a) && t < B(b));
  // gombóc, négy rész
  { const bp = ballPose(t); const cut = t >= B(CUT[0] + 2.4); X.ball.visible = !!bp && !cut; if (bp) X.ball.position.copy(bp);
    X.parts.forEach((m, i) => { const sh = [[-0.012, -0.012], [0.012, -0.012], [-0.012, 0.012], [0.012, 0.012]][i]; m.visible = cut && !(i === 0 && t >= B(ROLL1[0])); const sp = smooth(seg(t, B(CUT[0] + 2.4), B(CUT[1])));
      m.position.set(WORKP.x + sh[0] * (1 + sp) + (i === 0 ? 0 : 0.0), PLY + 0.0072, WORKP.z + sh[1] * (1 + sp)); if (i > 0) m.position.x += 0.06; }); }
  // fonál: térfogat-állandó henger; a morzsolódáskor darabokra esik
  { const cold = t < B(4); const on = cold || (t >= B(ROLL1[0]) && t < B(SCRAPE[0] + 0.4 + 0.45 * 1.9)); X.thread.visible = on; const r = cold ? TL.RP : TL.threadR(t), Vol = Math.PI * TL.R0 * TL.R0 * 0.013, len = Vol / (Math.PI * r * r);
    const z = cold ? 0 : 0.0175 * TL.rollPhase(t); X.thread.position.set(WORKP.x, PLY + r, WORKP.z + z); X.thr.rotation.x = TL.rollPhase(t) * 3; const ck = cold ? smooth(seg(t, B(1.2), B(2.2))) : TL.crumbK(t); const L0 = Math.max(0, len - 2 * r);
    X.thr.visible = ck < 0.02; X.thr.scale.set(r, L0, r);
    X.crumbs.forEach((m, i) => { m.visible = ck >= 0.02; const n = X.crumbs.length, seg_ = len / n; const xc = -len / 2 + seg_ * (i + 0.5); m.scale.set(r, Math.max(0.0005, seg_ * (1 - 0.3 * ck) - 2 * r), r); m.position.set(xc * (1 + 0.08 * ck), 0, 0.003 * ck * Math.sin(i * 2.3)); m.rotation.y = 0.25 * ck * Math.sin(i * 1.7); });
    // a kaparás: a darabok eltűnnek a tégelybe
    const gone = clamp(seg(t, B(SCRAPE[0] + 0.4), B(SCRAPE[1] - 0.6))); X.crumbs.forEach((m, i) => { if (i / X.crumbs.length < gone * 1.1) m.visible = false; }); }
  // tégely, mérleg
  { X.tin.soil.visible = t > B(SCRAPE[0] + 1.6); const m = t > B(TSCALE[1] - 0.05) ? (t < B(61.2) ? TL.T1.mw : TL.T1.md) : 0; drawScale(L.scl.disp, m, 2); }
  C.apply(t, L.tech, shot && shot.look !== undefined ? { look: shot.look } : {});
  return { X, C };
}
export const __X = X;
