// Kompressziós vizsgálat – ödométer emelőkaros kerettel, kiszúrógyűrű, beépítés, lépcsős terhelés tárcsákkal
import { THREE, V, BT, M, cyl, bx, MAT, SOILM, clamp, lerp, smooth, seg, drawScale, drawOven, drawPC, reachW, techAt, rest, holdV, holdBoth, poseAtPC, carryPath, gripCylinder, palmOn } from '../tm_lab/room.js';
import { glassPlate } from '../tm_lab/konz.js';
import { oedometer, setOedo } from '../tm_lab/oedo.js';
import * as TL from './timeline.js';
const { tb, BEAT } = TL;
export const POS = { oed: -1.0, plate: -1.75, scl: -2.35, stack: 0.22 };
export function board(g) { g.strokeStyle = '#2b4f9e'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(80, 60); g.lineTo(80, 440); g.lineTo(960, 440); g.stroke();
  g.strokeStyle = '#c0281e'; g.beginPath(); g.moveTo(100, 110); g.lineTo(420, 150); g.lineTo(900, 400); g.stroke(); g.fillStyle = '#2b4f9e'; g.font = 'italic 700 40px Arial'; g.fillText('e', 30, 80); g.fillText('log σ′', 820, 490); g.fillStyle = '#c0281e'; g.fillText('Cc', 700, 260); g.fillText('σ′p', 400, 200); }
const OZ = -1.12;
export function build(L) {
  const G = L.G, X = L.app = {}; L.scl.G.position.x = POS.scl;
  X.O = oedometer(G, POS.oed, OZ);
  X.plate = glassPlate(G, POS.plate, -1.0); X.block = bx(-0.07, 0.07, 0.006, 0.05, -0.06, 0.06, SOILM('clay', 61), X.plate);
  // a kézben vitt gyűrű (mintával) és a stack a padon
  X.cRing = new THREE.Group(); G.add(X.cRing); { const rm = new THREE.MeshStandardMaterial({ color: 0xd6dde2, metalness: 0.85, roughness: 0.2, side: THREE.DoubleSide }); const r = new THREE.Mesh(new THREE.CylinderGeometry(0.0395, 0.0395, 0.02, 48, 1, true), rm); r.position.y = 0.01; X.cRing.add(r); X.cSpec = cyl(0.0375, 0.0375, 0.02, SOILM('clay', 61), 0, 0.01, 0, 40); X.cRing.add(X.cSpec); }
  X.stack = []; for (let i = 0; i < 7; i++) { const d = X.O.discs[i]; const c = d.clone(); G.add(c); X.stack.push(c); }
  X.cDisc = X.O.discs[0].clone(); G.add(X.cDisc);
}
export function update(L, t, shot) {
  const X = L.app, O = X.O, inW = (a, b) => t >= tb(a) && t < tb(b); drawOven(L.ovenDisp, 105);
  // kiszúrás (8–11), mérés (11–13), beépítés (13–17), keretbe (17–20)
  const cut = smooth(seg(t, tb(8, 2), tb(10, 2)));
  { let p = null; if (inW(8, 11)) p = V(POS.plate, BT + 0.006 + 0.044 + 0.02 * (1 - cut) - 0.02 * cut + 0.0, -1.0); else if (inW(11, 13)) p = carryPath(V(POS.plate, BT + 0.03, -1.0), V(POS.scl, L.scl.panY, -1.06), smooth(seg(t, tb(11), tb(11, 3))), 0.08); else if (inW(13, 15)) p = carryPath(V(POS.scl, L.scl.panY, -1.06), V(POS.oed, BT + 0.04 + 0.014, OZ), smooth(seg(t, tb(13), tb(14, 2))), 0.14);
    X.cRing.visible = !!p; if (p) X.cRing.position.copy(p); X.cSpec.visible = t >= tb(9, 2); X.block.visible = t >= tb(8) && t < tb(11); X.block.scale.y = 1; }
  drawScale(L.scl.disp, inW(11, 13) && t > tb(11, 3) ? 288.4 : 0);
  const mounted = t < tb(4) || t >= tb(14, 2); const topOn = t < tb(4) || t >= tb(16); const yokeOn = t < tb(4) || t >= tb(17, 2); const water = t < tb(4) ? 1 : smooth(seg(t, tb(18, 2), tb(19, 3)));
  const st = TL.stepAt(t); let nDisc = t < tb(4) ? 4 : st.i < 0 ? 0 : st.i <= 5 ? st.i + (st.k > 0.3 ? 1 : 0) : st.i === 6 ? (st.k > 0.4 ? 3 : 6) : (st.k > 0.4 ? 6 : 3);
  const s = t < tb(4) ? 0.0012 + 0.0004 * smooth(seg(t, tb(1), tb(2))) : t >= tb(35) ? TL.H * (TL.E0 - TL.PATH[7].e) / (1 + TL.E0) / 1000 : TL.sNow(t) / 1000;
  setOedo(O, { s, nDisc, water, specVis: mounted, ringVis: mounted, topVis: topOn, yokeOn });
  if (inW(15, 16)) { O.top.visible = true; O.top.position.y += 0.08 * (1 - smooth(seg(t, tb(15, 1), tb(15, 3)))); }
  // tárcsák a padon (amit még nem tett fel) és a kézben vitt tárcsa
  { const carryOn = st.i >= 0 && st.i <= 5 && st.k < 0.3 && t >= tb(20); const off = st.i === 6 && st.k < 0.4; X.cDisc.visible = carryOn || off;
    const stackN = 7 - (st.i < 0 ? 0 : Math.min(7, nDisc + (carryOn ? 1 : 0)));
    X.stack.forEach((d, i) => { d.visible = i < stackN; d.position.set(POS.stack, BT + i * 0.02, -1.05); });
    if (X.cDisc.visible) { O.updateMatrixWorld(true); const hang = L.G.worldToLocal(O.localToWorld(O.hangTop.clone())); const a = V(POS.stack, BT + stackN * 0.02, -1.05);
      const k = carryOn ? smooth(clamp(st.k / 0.28)) : smooth(clamp(st.k / 0.38)); X.cDisc.position.copy(carryOn ? carryPath(a, hang, k, 0.08) : carryPath(hang, a, k, 0.08)); } }
  drawPC(L.pc.scr, t, 'ÖDOMÉTER · EN ISO 17892-5', null);
  techPose(L, t, shot, st); return {};
}
function techPose(L, t, shot, st) {
  const X = L.app, O = X.O, inW = (a, b) => t >= tb(a) && t < tb(b), Lw = (x, y, z) => L.G.localToWorld(V(x, y, z));
  if (inW(8, 11)) { const w = techAt(L, POS.plate + 0.08, -0.62); const c = X.cRing.getWorldPosition(V()).add(V(0, 0.02, 0)); const gR = palmOn(c, V(0, 1, 0), V(-0.1, 0, -1).normalize(), 'R', { curl: 0.5, gap: 0.02 }); gR.pole = V(-0.9, -0.5, -0.3);
    reachW(w, { R: gR, L: rest('L', Lw(POS.plate - 0.15, BT + 0.007, -0.93), V(0.3, 0, -1)) }, { look: 0.55, lean: 0.15 }); return; }
  if (inW(11, 15)) { const x = X.cRing.position.x; const w = techAt(L, x + 0.05, -0.62); const c = X.cRing.getWorldPosition(V()).add(V(0, 0.016, 0)); reachW(w, holdBoth(c, 0.0395, { curl: 0.35 }), { look: 0.55, lean: 0.15 }); return; }
  if (inW(15, 16)) { const w = techAt(L, POS.oed + 0.05, -0.62); O.updateMatrixWorld(true); const c = O.top.getWorldPosition(V()).add(V(0, 0.014, 0)); reachW(w, { R: holdV('R', c, 0.037, { curl: 0.7 }), L: rest('L', Lw(POS.oed - 0.2, BT + 0.04, -0.98), V(0.3, 0, -1)) }, { look: 0.6, lean: 0.15 }); return; }
  if (inW(17, 19.5)) { const w = techAt(L, POS.oed + 0.1, -0.62); O.updateMatrixWorld(true); const c = O.dialG.localToWorld(V(0.02, 0, 0.03)); const gR = palmOn(c, V(0, 0, 1), V(0, 1, 0), 'R', { curl: 0.5, gap: 0.02 }); gR.pole = V(-0.9, -0.5, -0.3);
    reachW(w, { R: gR, L: rest('L', Lw(POS.oed - 0.2, BT + 0.04, -0.98), V(0.3, 0, -1)) }, { look: 0.6, lean: 0.12 }); return; }
  if (X.cDisc.visible) { const c = X.cDisc.getWorldPosition(V()).add(V(0, 0.01, 0)); const w = techAt(L, (POS.oed + 0.86 + POS.stack) / 2 + 0.05, -0.62); reachW(w, holdBoth(c, 0.06, { curl: 0.6 }), { look: 0.5, lean: 0.12 }); return; }
  poseAtPC(L);
}
