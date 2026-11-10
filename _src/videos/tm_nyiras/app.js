// Közvetlen nyíróvizsgálat – nyíródoboz vízkádban, emelőkaros normálterhelés (az ödométer keretéből), motoros hajtás, erőmérő
import { THREE, V, BT, M, cyl, bx, MAT, SOILM, setRod, clamp, lerp, smooth, seg, drawScale, drawOven, drawPC, reachW, techAt, rest, holdV, holdBoth, poseAtPC, carryPath, gripCylinder, palmOn, screen } from '../tm_lab/room.js';
import { glassPlate, drawNum } from '../tm_lab/konz.js';
import { oedometer, setOedo } from '../tm_lab/oedo.js';
import * as TL from './timeline.js';
const { tb } = TL;
export const POS = { app: -0.9, plate: -1.75, scl: -2.35, stack: 0.3 };
export function board(g) { g.strokeStyle = '#2b4f9e'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(80, 60); g.lineTo(80, 440); g.lineTo(960, 440); g.stroke();
  g.strokeStyle = '#c0281e'; g.beginPath(); g.moveTo(80, 400); g.lineTo(900, 120); g.stroke(); g.fillStyle = '#2b4f9e'; g.font = 'italic 700 40px Arial'; g.fillText('τ', 30, 80); g.fillText('σ', 900, 490); g.fillStyle = '#c0281e'; g.fillText('τ = c + σ tg φ', 420, 230); }
const OZ = -1.12, SB = 0.03;          // a nyíródoboz fél-szélessége (60 mm)
export function build(L) {
  const G = L.G, X = L.app = {}; L.scl.G.position.x = POS.scl; const st = MAT.st, fr = M(0x2f6a9a, { roughness: 0.45 });
  X.O = oedometer(G, POS.app, OZ); X.O.cell.visible = false;
  const A = new THREE.Group(); X.O.add(A); X.A = A;
  // sínek, kád (a mozgó rész), motor, erőmérő
  bx(-0.25, 0.3, 0.04, 0.046, -0.06, 0.06, st, A); X.bath = new THREE.Group(); A.add(X.bath); const bm = new THREE.MeshStandardMaterial({ color: 0xb9bec4, metalness: 0.7, roughness: 0.3, side: THREE.DoubleSide });
  bx(-0.08, 0.08, 0.046, 0.05, -0.08, 0.08, bm, X.bath); for (const [x0, x1, z0, z1] of [[-0.08, 0.08, -0.08, -0.076], [-0.08, 0.08, 0.076, 0.08], [-0.08, -0.076, -0.08, 0.08], [0.076, 0.08, -0.08, 0.08]]) bx(x0, x1, 0.05, 0.085, z0, z1, bm, X.bath);
  X.bWater = bx(-0.076, 0.076, 0.05, 0.08, -0.076, 0.076, MAT.water, X.bath); X.bWater.renderOrder = 11;
  const ringBox = (y0, y1, par) => { const m = M(0xd6dde2, { metalness: 0.85, roughness: 0.2 }); for (const [x0, x1, z0, z1] of [[-0.045, 0.045, -0.045, -SB], [-0.045, 0.045, SB, 0.045], [-0.045, -SB, -SB, SB], [SB, 0.045, -SB, SB]]) bx(x0, x1, y0, y1, z0, z1, m, par); };
  X.lower = new THREE.Group(); X.bath.add(X.lower); ringBox(0.05, 0.066, X.lower); X.lower.add(bx(-SB, SB, 0.05, 0.054, -SB, SB, MAT.stone, null));
  X.specL = bx(-SB, SB, 0.054, 0.0645, -SB, SB, SOILM('sand', 71), X.lower);
  X.upper = new THREE.Group(); A.add(X.upper); ringBox(0.0665, 0.086, X.upper); X.specU = bx(-SB, SB, 0.0645, 0.074, -SB, SB, SOILM('sand', 71), X.upper);
  X.topS = bx(-SB, SB, 0.074, 0.082, -SB, SB, MAT.stone, X.upper); X.cap = bx(-SB + 0.001, SB - 0.001, 0.082, 0.1, -SB + 0.001, SB - 0.001, M(0xd6dde2, { metalness: 0.5, roughness: 0.3 }), X.upper);
  X.pins = [V(-0.04, 0.076, 0.04), V(0.04, 0.076, -0.04)].map(p => { const c = cyl(0.003, 0.003, 0.04, M(0xd23a2a), p.x, p.y, p.z, 8); A.add(c); c.home = p.clone(); return c; });
  bx(0.2, 0.3, 0.046, 0.14, -0.06, 0.06, fr, A); X.push = cyl(0.007, 0.007, 1, st, 0, 0, 0, 10); A.add(X.push);
  bx(-0.26, -0.2, 0.046, 0.16, -0.04, 0.04, fr, A); X.lc = cyl(0.018, 0.018, 0.04, M(0x2f343a, { metalness: 0.5 }), -0.17, 0.076, 0, 20); X.lc.rotation.z = Math.PI / 2; A.add(X.lc); X.arm = cyl(0.006, 0.006, 1, st, 0, 0, 0, 10); A.add(X.arm);
  X.disp = screen(A, 0.07, 0.025, 192, 64, 0.25, 0.12, 0.061);
  // kiszúró (négyzetes) és minta a lapon
  X.plate = glassPlate(G, POS.plate, -1.0); X.block = bx(-0.07, 0.07, 0.006, 0.05, -0.06, 0.06, SOILM('sand', 71), X.plate);
  X.cutter = new THREE.Group(); G.add(X.cutter); ringBox(0.0, 0.025, X.cutter); X.cutSpec = bx(-SB, SB, 0.0025, 0.0225, -SB, SB, SOILM('sand', 71), X.cutter);
  X.stack = []; for (let i = 0; i < 6; i++) { const c = X.O.discs[i].clone(); G.add(c); X.stack.push(c); } X.cDisc = X.O.discs[0].clone(); G.add(X.cDisc);
}
export function update(L, t, shot) {
  const X = L.app, O = X.O, inW = (a, b) => t >= tb(a) && t < tb(b); drawOven(L.ovenDisp, 105);
  const d = t < tb(4) ? 9 * smooth(seg(t, 0.2, tb(3.5))) : t >= tb(38) ? 10 : t >= tb(20) ? TL.dNow(t) : 0; const v = TL.vOf(d) / 1000;
  const nDisc = t < tb(4) ? 2 : t >= tb(16, 2) ? 2 : t >= tb(15, 3) ? 1 : 0;
  setOedo(O, { s: -v, nDisc, water: 0, yokeOn: t < tb(4) || t >= tb(15) }); O.cell.visible = false;
  // a doboz: a kád (alsó fél) +x irányban mozog; a felső fél áll (az erőmérőhöz kötve)
  X.bath.position.x = d / 1000; const mounted = t < tb(4) || t >= tb(13); X.lower.visible = X.upper.visible = mounted; X.upper.position.y = v; X.bWater.visible = t < tb(4) || t >= tb(17);
  X.pins.forEach((p, i) => { const k = t < tb(4) ? 1 : TL.pinK(t); p.visible = mounted && (t < tb(4) ? false : k < 0.98); p.position.copy(p.home).add(V(0, 0.05 * k, 0)); });
  setRod(X.push, V(0.2, 0.066, 0), V(0.08 + d / 1000, 0.066, 0)); setRod(X.arm, V(-0.15, 0.076, 0), V(-0.045, 0.076, 0));
  drawNum(X.disp, t >= tb(20) || t < tb(4) ? 'δ ' + d.toFixed(2).replace('.', ',') + ' mm' : 'δ 0,00 mm');
  // nyírási sík (38–42): a felső fél leemelve, a minta elcsúszott fele látszik
  if (inW(38, 42)) { const k = smooth(seg(t, tb(38, 1), tb(39))); X.upper.position.y = v + 0.1 * k; X.specU.visible = true; }
  // kiszúrás (8–11), beépítés (11–13)
  { let p = null; const cut = smooth(seg(t, tb(8, 2), tb(10, 2))); if (inW(8, 11)) p = V(POS.plate, BT + 0.006 + 0.044 - 0.02 * cut, -1.0); else if (inW(11, 13)) p = carryPath(V(POS.plate, BT + 0.03, -1.0), V(POS.app, BT + 0.054, OZ), smooth(seg(t, tb(11), tb(12, 3))), 0.14);
    X.cutter.visible = !!p; if (p) X.cutter.position.copy(p); X.cutSpec.visible = t >= tb(9, 2); X.block.visible = t >= tb(8) && t < tb(11); }
  // tárcsák
  { const carry = inW(15, 16.25); X.cDisc.visible = carry; X.stack.forEach((c, i) => { c.visible = i < 6 - nDisc - (carry ? 1 : 0); c.position.set(POS.stack, BT + i * 0.02, -1.05); });
    if (carry) { O.updateMatrixWorld(true); const hang = L.G.worldToLocal(O.localToWorld(O.hangTop.clone())); X.cDisc.position.copy(carryPath(V(POS.stack, BT + (5 - nDisc) * 0.02, -1.05), hang, smooth(seg(t, tb(15), tb(16))), 0.08)); } }
  drawPC(L.pc.scr, t, 'KÖZVETLEN NYÍRÁS · EN ISO 17892-10', (g) => { g.strokeStyle = '#3FE0C5'; g.lineWidth = 5; g.beginPath(); for (let x = 0; x <= d; x += 0.1) { const X0 = 80 + x / 10 * 860, Y0 = 540 - TL.tauOf(x, 0) / 180 * 440; x ? g.lineTo(X0, Y0) : g.moveTo(X0, Y0); } g.stroke(); });
  techPose(L, t, shot); return { d };
}
function techPose(L, t, shot) {
  const X = L.app, O = X.O, inW = (a, b) => t >= tb(a) && t < tb(b), Lw = (x, y, z) => L.G.localToWorld(V(x, y, z));
  if (inW(8, 11)) { const w = techAt(L, POS.plate + 0.08, -0.55); const c = X.cutter.getWorldPosition(V()).add(V(0, 0.025, 0)); const gR = palmOn(c, V(0, 1, 0), V(-0.1, 0, -1).normalize(), 'R', { curl: 0.5, gap: 0.02 }); gR.pole = V(-0.9, -0.5, -0.3);
    reachW(w, { R: gR, L: rest('L', Lw(POS.plate - 0.15, BT + 0.007, -0.93), V(0.3, 0, -1)) }, { look: 0.55, lean: 0.15 }); return; }
  if (inW(11, 13)) { const x = X.cutter.position.x; const w = techAt(L, x + 0.05, -0.55); const c = X.cutter.getWorldPosition(V()).add(V(0, 0.012, 0)); reachW(w, holdBoth(c, 0.045, { curl: 0.6 }), { look: 0.55, lean: 0.15 }); return; }
  if (X.cDisc.visible) { const c = X.cDisc.getWorldPosition(V()).add(V(0, 0.01, 0)); const w = techAt(L, (POS.app + 0.86 + POS.stack) / 2 + 0.05, -0.55); reachW(w, holdBoth(c, 0.06, { curl: 0.6 }), { look: 0.5, lean: 0.12 }); return; }
  if (inW(18, 19.5)) { const w = techAt(L, POS.app + 0.08, -0.55); const pin = X.pins[0].visible ? X.pins[0] : X.pins[1]; const c = pin.getWorldPosition(V()).add(V(0, 0.015, 0)); reachW(w, { R: holdV('R', c, 0.004, { curl: 1.2 }), L: rest('L', Lw(POS.app - 0.25, BT + 0.04, -0.98), V(0.3, 0, -1)) }, { look: 0.6, lean: 0.15 }); return; }
  poseAtPC(L);
}
