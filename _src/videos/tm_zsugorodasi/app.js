// Zsugorodási határ – üveglap talajtömbbel, kiszúrógyűrű, Ø 25 × 25 mm-es henger, tolómérő, óraüveg, szárítószekrény
import { THREE, V, BT, M, cyl, bx, MAT, SOILM, screen, clamp, lerp, smooth, seg, drawScale, drawOven, drawPC, reachW, techAt, rest, holdV, poseAtPC, carryPath, gripCylinder, palmOn } from '../tm_lab/room.js';
import { glassPlate, spatula, drawNum } from '../tm_lab/konz.js';
import * as TL from './timeline.js';
const { tb } = TL;
export const POS = { plate: -1.0, scl: -0.3, glass: 0.25, oven: -3.3 };
export function board(g) { g.strokeStyle = '#2b4f9e'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(80, 440); g.lineTo(960, 440); g.moveTo(80, 440); g.lineTo(80, 60); g.stroke();
  g.strokeStyle = '#c0281e'; g.beginPath(); g.moveTo(80, 330); g.lineTo(380, 330); g.lineTo(880, 110); g.stroke(); g.setLineDash([12, 10]); g.beginPath(); g.moveTo(380, 330); g.lineTo(380, 440); g.stroke(); g.setLineDash([]);
  g.fillStyle = '#2b4f9e'; g.font = 'italic 700 40px Arial'; g.fillText('V', 30, 70); g.fillText('w', 920, 490); g.fillStyle = '#c0281e'; g.fillText('wS', 350, 490); }
export function build(L) {
  const G = L.G, X = L.app = {}; L.scl.G.position.x = POS.scl;
  X.plate = glassPlate(G, POS.plate, -1.0); X.block = bx(-0.05, 0.05, 0.006, 0.05, -0.04, 0.04, SOILM('wet', 31), X.plate); X.sp = spatula(G); X.sp.position.set(POS.plate + 0.13, BT + 0.007, -0.9); X.sp.rotation.set(0, -1.2, 0);
  const sm = SOILM('wet', 33); X.spec = new THREE.Group(); G.add(X.spec); X.specM = cyl(1, 1, 1, sm, 0, 0.5, 0, 36); X.spec.add(X.specM); X.sm = sm;
  // repedések (szárításkor): vékony sötét vonalak a palástra
  X.cracks = []; for (let i = 0; i < 5; i++) { const c = bx(-0.0004, 0.0004, 0, 1, -0.00005, 0.00005, M(0x1d1712), null); c.position.set(Math.cos(i * 1.3) * 0.0, 0.1 + i * 0.15, 0); c.rotation.y = i * 1.25; c.scale.y = 0.4 + 0.1 * i; X.specM.add(c); X.cracks.push(c); }
  X.ring = new THREE.Mesh(new THREE.CylinderGeometry(0.0128, 0.0128, 0.03, 32, 1, true), new THREE.MeshStandardMaterial({ color: 0xc3c8cd, metalness: 0.85, roughness: 0.2, side: THREE.DoubleSide })); G.add(X.ring);
  // tolómérő: a szár x irányban, a pofák −z felé
  { const K = new THREE.Group(); G.add(K); X.cal = K; const st = MAT.st; bx(-0.09, 0.07, -0.002, 0.002, -0.006, 0.006, st, K); bx(-0.09, -0.084, -0.002, 0.002, -0.045, -0.006, st, K);
    X.jaw = new THREE.Group(); K.add(X.jaw); bx(-0.003, 0.003, -0.0025, 0.0025, -0.045, 0.008, st, X.jaw); bx(0.0, 0.03, -0.004, 0.004, -0.004, 0.012, M(0x2a2d32), X.jaw); X.calDisp = screen(X.jaw, 0.026, 0.01, 128, 48, 0.015, 0.0042, 0.004, -Math.PI / 2); }
  X.glass = cyl(0.04, 0.03, 0.006, MAT.glass, POS.glass, BT + 0.003, -1.05, 32); G.add(X.glass);
}
export function update(L, t, shot) {
  const X = L.app, inW = (a, b) => t >= tb(a) && t < tb(b); drawOven(L.ovenDisp, 105);
  const sk = TL.shrinkK(t), sc = 1 - (1 - TL.DD / TL.D0) * sk; const R = 0.0125 * sc, H = 0.025 * sc;
  // a próbatest helye: tömbben (kiszúrás) → mérleg → tolómérő → óraüveg (szobahő) → kályha → óraüveg (mérés)
  let p = null; if (inW(11, 14)) p = V(POS.plate, BT + 0.006 + 0.044 - 0.025 * TL.ringK(t) - 0.0, -1.0); else if (inW(14, 16)) p = V(POS.scl, L.scl.panY, -1.06); else if (inW(16, 19) || inW(26, 29)) p = V(POS.glass, BT + 0.006, -1.05); else if (inW(19, 23)) p = V(POS.glass, BT + 0.006, -1.05); else if (inW(23, 26)) p = V(POS.oven, BT + 0.206, -1.18); else if (t < tb(8)) p = V(POS.glass, BT + 0.006, -1.05);
  X.spec.visible = !!p && !inW(11, 13); if (p) { X.spec.position.copy(p); X.specM.scale.set(R, H, R); X.specM.position.y = H / 2; }
  X.sm.color.setRGB(1 + 0.35 * sk, 1 + 0.3 * sk, 1 + 0.25 * sk); X.cracks.forEach((c, i) => { c.visible = sk > 0.35 + i * 0.1; });
  X.block.visible = t >= tb(8) && t < tb(14); X.ring.visible = inW(11, 14); if (X.ring.visible) X.ring.position.set(POS.plate, BT + 0.006 + 0.044 + 0.015 - 0.03 * TL.ringK(t) + 0.0, -1.0);
  // tolómérő a próbatesten (16–19 nedvesen, 26–29 szárazon)
  { const on = inW(16, 19) || inW(26, 29) || t < tb(4); X.cal.visible = on; const k = t < tb(4) ? 1 : inW(16, 19) ? TL.caliK(t) : TL.caliK2(t); const d = 2 * R + 0.012 * (1 - k);
    X.cal.position.set(POS.glass + 0.084 - 0.0 - d / 2 + 0.003, BT + 0.006 + H * 0.55, -1.05 + 0.02); X.jaw.position.set(-0.084 + d + 0.006, 0, 0); X.cal.position.x = POS.glass + 0.084 - d / 2 - 0.006 - 0.0; drawNum(X.calDisp, (d * 1000 - 0.0).toFixed(1).replace('.', ',')); }
  L.ovenDoor.rotation.y = inW(23, 26) ? -1.9 : 0; L.ovenGlow.intensity = inW(23, 26) ? 1.6 : 0;
  drawScale(L.scl.disp, inW(14, 16) ? TL.M : inW(28, 29) ? TL.MD : 0, 2);
  drawPC(L.pc.scr, t, 'ZSUGORODÁSI HATÁR', null);
  techPose(L, t, shot); return {};
}
function techPose(L, t, shot) {
  const X = L.app, inW = (a, b) => t >= tb(a) && t < tb(b), Lw = (x, y, z) => L.G.localToWorld(V(x, y, z));
  if (inW(8, 11)) { const w = techAt(L, POS.plate + 0.08, -0.55); const c = Lw(POS.plate, BT + 0.05, -1.0); const gR = palmOn(c.clone().add(V(0.01 * Math.sin(t * 5), 0, 0)), V(0, 1, 0), V(-0.1, 0, -1).normalize(), 'R', { curl: 0.4, gap: 0.02 }); gR.pole = V(-0.9, -0.5, -0.3);
    reachW(w, { R: gR, L: rest('L', Lw(POS.plate - 0.15, BT + 0.007, -0.93), V(0.3, 0, -1)) }, { look: 0.55, lean: 0.15 }); return; }
  if (inW(11, 13.5)) { const w = techAt(L, POS.plate + 0.08, -0.55); const c = X.ring.getWorldPosition(V()).add(V(0, 0.015, 0)); const gR = palmOn(c, V(0, 1, 0), V(-0.1, 0, -1).normalize(), 'R', { curl: 0.5, gap: 0.02 }); gR.pole = V(-0.9, -0.5, -0.3);
    reachW(w, { R: gR, L: rest('L', Lw(POS.plate - 0.15, BT + 0.007, -0.93), V(0.3, 0, -1)) }, { look: 0.55, lean: 0.15 }); return; }
  if (inW(16, 19) || inW(26, 29)) { const w = techAt(L, POS.glass + 0.12, -0.55); X.cal.updateMatrixWorld(true); const c = X.cal.localToWorld(V(0.05, 0, 0)); const gR = gripCylinder(c, V(1, 0, 0), 0.006, V(0, -0.5, -1).normalize(), 'R', { curl: 1.0, palmOff: 0.012 }); gR.pole = V(-0.9, -0.5, -0.3);
    reachW(w, { R: gR, L: rest('L', Lw(POS.glass - 0.15, BT + 0.004, -0.93), V(0.3, 0, -1)) }, { look: 0.6, lean: 0.14 }); return; }
  poseAtPC(L);
}
