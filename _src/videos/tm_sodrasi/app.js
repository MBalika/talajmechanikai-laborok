// Sodrási határ – üveglap szűrőpapírral, pépgolyó, sodort szál (morzsolódással), 3 mm-es mérőpálca, tégelyek, mérleg
import { THREE, V, BT, M, cyl, bx, MAT, SOILM, clamp, lerp, smooth, seg, mulberry32, drawScale, drawOven, drawPC, reachW, techAt, rest, holdV, poseAtPC, carryPath, gripCylinder, palmOn } from '../tm_lab/room.js';
import { glassPlate, tin } from '../tm_lab/konz.js';
import * as TL from './timeline.js';
const { tb } = TL;
export const POS = { plate: -0.9, scl: -0.2 };
export function board(g) { g.strokeStyle = '#2b4f9e'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(80, 300); g.lineTo(960, 300); g.stroke();
  for (const [x, n] of [[180, 'wS'], [480, 'wP'], [800, 'wL']]) { g.beginPath(); g.moveTo(x, 280); g.lineTo(x, 320); g.stroke(); g.fillStyle = '#c0281e'; g.font = 'italic 700 40px Arial'; g.fillText(n, x - 24, 370); }
  g.fillStyle = '#2b4f9e'; g.font = 'italic 600 30px Arial'; g.fillText('szilárd', 90, 250); g.fillText('képlékeny', 560, 250); g.fillText('folyós', 850, 250); g.fillStyle = '#c0281e'; g.fillText('IP = wL − wP', 420, 460); }
const PZ = -1.0;
export function build(L) {
  const G = L.G, X = L.app = {}; L.scl.G.position.x = POS.scl;
  X.plate = glassPlate(G, POS.plate, PZ); X.paper = bx(-0.12, 0.12, 0.0062, 0.0066, -0.1, 0.1, MAT.paper, X.plate);
  const sm = SOILM('wet', 21); X.ball = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), sm); X.ball.castShadow = true; X.plate.add(X.ball);
  X.thr = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 20), sm); X.thr.rotation.z = Math.PI / 2; X.thr.castShadow = true; X.plate.add(X.thr);
  X.bits = []; const r = mulberry32(3); for (let i = 0; i < 7; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 14), sm); b.rotation.z = Math.PI / 2; b.castShadow = true; X.plate.add(b); X.bits.push({ m: b, dx: (r() - 0.5) * 0.004, dz: (r() - 0.5) * 0.006, rot: (r() - 0.5) * 0.4 }); }
  X.gauge = cyl(0.0015, 0.0015, 0.1, MAT.st, 0, 0.0081, 0.045, 10); X.gauge.rotation.z = Math.PI / 2; X.plate.add(X.gauge);
  X.tin = tin(G, POS.plate + 0.25, -0.95); X.tin2 = tin(G, POS.scl + 0.22, -1.25);
}
export function update(L, t, shot) {
  const X = L.app, inW = (a, b) => t >= tb(a) && t < tb(b); drawOven(L.ovenDisp, 105);
  const th = t < tb(8) ? { ball: 0, d: 3, L: 0.12, crumb: smooth(seg(t, tb(1.5), tb(2.5))) } : TL.thread(t); const y0 = 0.0066;
  const rollZ = th.roll ? Math.sin(t * 7) * 0.012 : 0;
  X.ball.visible = th.ball > 0.02 && t < tb(22); const rb = 0.012 * th.ball + 0.004; X.ball.scale.set(rb * 1.1, rb * 0.85, rb); X.ball.position.set(0, y0 + rb * 0.85, rollZ);
  const showT = (th.ball < 0.98) && !th.crumb && t >= tb(8) && t < tb(22) || (t < tb(8) && false); const r = (th.d || 3) / 2000;
  X.thr.visible = showT && th.L > 0.005; X.thr.scale.set(r, th.L, r); X.thr.position.set(0, y0 + r, rollZ); X.thr.rotation.x = rollZ / Math.max(r, 0.001);
  const cr = th.crumb || 0, showB = cr > 0 && (t < tb(22, 2)); X.bits.forEach((b, i) => { b.m.visible = showB && !(t >= tb(22, 1) && t < tb(23)); const seg_ = th.L / 7; b.m.scale.set(0.0015, seg_ * (1 - 0.18 * cr), 0.0015); b.m.position.set(-th.L / 2 + seg_ * (i + 0.5) + b.dx * cr, y0 + 0.0015, b.dz * cr); b.m.rotation.y = b.rot * cr; });
  // tégely: a darabok bele (22–23), a mérlegre (23–24)
  { const a = V(POS.plate + 0.25, BT, -0.95), b = V(POS.scl, L.scl.panY, -1.06); const k = smooth(seg(t, tb(23), tb(23, 3))); X.tin.position.copy(t < tb(23) ? a : carryPath(a, b, k, 0.07)); X.tin.soil.visible = t >= tb(22, 2); X.tin.visible = t >= tb(8) && t < tb(28);
    drawScale(L.scl.disp, t >= tb(23, 3) && t < tb(26) ? 18.62 : (inW(26, 28) ? 14.94 : 0), 2); X.tin2.soil.visible = true; }
  drawPC(L.pc.scr, t, 'SODRÁSI HATÁR · EN ISO 17892-12', null);
  techPose(L, t, shot, th, rollZ, r);
  return {};
}
function techPose(L, t, shot, th, rollZ, r) {
  const X = L.app, inW = (a, b) => t >= tb(a) && t < tb(b), Lw = (x, y, z) => L.G.localToWorld(V(x, y, z));
  if (inW(8, 22) || t < tb(4)) { const w = techAt(L, POS.plate + 0.06, -0.55); X.plate.updateMatrixWorld(true);
    const top = X.plate.localToWorld(V(0.0, 0.0066 + (th.ball > 0.5 ? 0.02 : 2 * r), rollZ));
    const gR = palmOn(top, V(0, 1, 0), V(-0.1, 0, -1).normalize(), 'R', { curl: 0.12, gap: 0.011 }); gR.pole = V(-0.9, -0.5, -0.3);
    const gL = rest('L', X.plate.localToWorld(V(-0.16, 0.007, 0.06)), V(0.3, 0, -1));
    reachW(w, { R: gR, L: gL }, { look: 0.6, lean: 0.16 }); return; }
  if (inW(22, 24)) { const w = techAt(L, POS.plate + 0.3, -0.55); const c = X.tin.getWorldPosition(V()).add(V(0, 0.011, 0)); reachW(w, { R: holdV('R', c, 0.03, { curl: 0.8 }), L: rest('L', Lw(POS.plate + 0.05, BT + 0.007, -0.93), V(0.3, 0, -1)) }, { look: 0.5, lean: 0.12 }); return; }
  poseAtPC(L);
}
