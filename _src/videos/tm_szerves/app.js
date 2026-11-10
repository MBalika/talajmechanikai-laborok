// Szervesanyag-tartalom – mozsár, 2 mm-es szita, porcelán tégelyek, izzítókemence (550 °C), exszikkátor, fogó, analitikai mérleg
import { THREE, V, BT, M, cyl, bx, MAT, SOILM, screen, clamp, lerp, smooth, seg, drawScale, drawOven, drawPC, reachW, techAt, rest, holdV, poseAtPC, carryPath, gripCylinder, palmOn } from '../tm_lab/room.js';
import { drawNum } from '../tm_lab/konz.js';
import * as TL from './timeline.js';
const { tb } = TL;
export const POS = { mort: -1.6, scl: -0.9, des: -0.3, furn: 0.45 };
export function board(g) { g.fillStyle = '#2b4f9e'; g.font = 'italic 700 46px Arial'; g.fillText('wLOI = (m1 − m2) / (m1 − mc)', 90, 150); g.fillStyle = '#c0281e'; g.font = 'italic 600 40px Arial'; g.fillText('550 °C · ≥ 2 h', 300, 300); g.strokeStyle = '#2b4f9e'; g.lineWidth = 4; g.strokeRect(70, 80, 880, 110); }
function crucible() { const G = new THREE.Group(); const pts = []; for (let i = 0; i <= 10; i++) { const u = i / 10; pts.push(new THREE.Vector2(0.018 + 0.008 * u, 0.03 * u)); }
  const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 32), new THREE.MeshStandardMaterial({ color: 0xf3f1ea, roughness: 0.3, side: THREE.DoubleSide })); m.castShadow = true; G.add(m); G.add(cyl(0.018, 0.018, 0.002, MAT.porc, 0, 0.001, 0, 24));
  const s = cyl(0.021, 0.019, 0.005, new THREE.MeshStandardMaterial({ color: 0x4a3a2c, roughness: 0.95 }), 0, 0.006, 0, 24); G.add(s); G.soil = s; return G; }
export function build(L) {
  const G = L.G, X = L.app = {}; L.scl.G.position.x = POS.scl;
  // mozsár + törő, 2 mm-es szita
  { const pts = []; for (let i = 0; i <= 10; i++) { const u = i / 10; pts.push(new THREE.Vector2(0.03 + 0.04 * Math.sin(u * Math.PI / 2), 0.06 * u)); }
    X.mort = new THREE.Mesh(new THREE.LatheGeometry(pts, 32), new THREE.MeshStandardMaterial({ color: 0xf1efe9, roughness: 0.4, side: THREE.DoubleSide })); X.mort.position.set(POS.mort, BT, -1.0); X.mort.castShadow = true; G.add(X.mort);
    G.add(cyl(0.055, 0.04, 0.012, SOILM('dry', 41), POS.mort, BT + 0.02, -1.0, 24)); X.pest = cyl(0.012, 0.016, 0.13, MAT.porc, 0, 0, 0, 16); G.add(X.pest);
    const sv = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 40, 1, true), M(0xc9a85a, { metalness: 0.75, roughness: 0.3, side: THREE.DoubleSide })); sv.position.set(POS.mort + 0.28, BT + 0.025, -1.1); G.add(sv); }
  // kemence: kerámia belső tér, lefelé nyíló ajtó, kijelző
  { const F = new THREE.Group(); F.position.set(POS.furn, BT, -1.15); G.add(F); X.furn = F; const om = M(0x3b4148, { metalness: 0.3, roughness: 0.5 });
    bx(-0.24, 0.24, 0, 0.08, -0.22, 0.22, om, F); bx(-0.24, 0.24, 0.42, 0.5, -0.22, 0.22, om, F); bx(-0.24, -0.16, 0.08, 0.42, -0.22, 0.22, om, F); bx(0.16, 0.24, 0.08, 0.42, -0.22, 0.22, om, F); bx(-0.16, 0.16, 0.08, 0.42, -0.22, -0.14, om, F);
    X.cer = new THREE.MeshStandardMaterial({ color: 0xd8c8b0, roughness: 0.9, emissive: 0xff5a1a, emissiveIntensity: 0 }); bx(-0.16, 0.16, 0.08, 0.09, -0.14, 0.18, X.cer, F); bx(-0.16, 0.16, 0.41, 0.42, -0.14, 0.18, X.cer, F); bx(-0.16, -0.15, 0.09, 0.41, -0.14, 0.18, X.cer, F); bx(0.15, 0.16, 0.09, 0.41, -0.14, 0.18, X.cer, F); bx(-0.15, 0.15, 0.09, 0.41, -0.14, -0.13, X.cer, F);
    bx(-0.24, 0.24, -0.1, 0.0, -0.22, 0.22, om, F).position.y = 0.04; X.door = new THREE.Group(); X.door.position.set(0, 0.08, 0.22); F.add(X.door); bx(-0.17, 0.17, 0, 0.34, 0, 0.04, om, X.door); bx(-0.05, 0.05, 0.28, 0.3, 0.04, 0.07, MAT.st, X.door);
    X.fdisp = screen(F, 0.12, 0.035, 192, 56, 0.17, 0.46, 0.221); X.glow = new THREE.PointLight(0xff7a2a, 0, 1.2, 2); X.glow.position.set(0, 0.25, 0.1); F.add(X.glow); }
  // exszikkátor: üveg, szilikagél, perforált lap, fedő gombbal
  { const D = new THREE.Group(); D.position.set(POS.des, BT, -1.1); G.add(D); X.des = D; const gl = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.1, 0.16, 40, 1, true), MAT.glass); gl.position.y = 0.08; gl.renderOrder = 12; D.add(gl);
    D.add(cyl(0.1, 0.1, 0.004, M(0xdfe7ea, { transparent: true, opacity: 0.5 }), 0, 0.002, 0, 40)); D.add(cyl(0.095, 0.095, 0.035, M(0x3a7bd5, { roughness: 0.8 }), 0, 0.02, 0, 32)); D.add(cyl(0.1, 0.1, 0.004, MAT.porc, 0, 0.06, 0, 40));
    X.lid = new THREE.Group(); D.add(X.lid); const ld = new THREE.Mesh(new THREE.SphereGeometry(0.115, 32, 12, 0, Math.PI * 2, 0, 0.55), MAT.glass); ld.position.y = 0.16 - 0.115 * Math.cos(0.55) + 0.0; X.lid.add(ld); X.lid.add(cyl(0.012, 0.012, 0.02, M(0xdfe7ea, { transparent: true, opacity: 0.6 }), 0, 0.17, 0, 16)); }
  X.cr = [crucible(), crucible()]; X.cr.forEach(c => G.add(c));
  // fogó: két szár (a kéztől a tégelyig)
  X.tong = new THREE.Group(); G.add(X.tong); for (const s of [-1, 1]) { const r = cyl(0.003, 0.003, 0.28, MAT.st, 0, 0.14, s * 0.006, 8); X.tong.add(r); }
  X.spoon = cyl(0.004, 0.004, 0.16, MAT.st, 0, 0, 0, 8); G.add(X.spoon);
}
export function update(L, t, shot) {
  const X = L.app, inW = (a, b) => t >= tb(a) && t < tb(b); drawOven(L.ovenDisp, 110);
  // törés a mozsárban
  { const k = TL.grindK(t), on = inW(8, 11); X.pest.visible = t >= tb(8) && t < tb(11); const a = t * 6; X.pest.position.set(POS.mort + Math.cos(a) * 0.02 * (on ? 1 : 0), BT + 0.075, -1.0 + Math.sin(a) * 0.02 * (on ? 1 : 0)); X.pest.rotation.set(Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25); }
  // tégelyek útja: kemence (előizzítás) → exszikkátor → mérleg (töltés) → kemence → exszikkátor → mérleg
  const fIn = (i) => V(POS.furn - 0.05 + i * 0.1, BT + 0.09, -1.12), dIn = (i) => V(POS.des - 0.04 + i * 0.08, BT + 0.062, -1.1), sIn = V(POS.scl, L.scl.panY, -1.06), sBy = (i) => V(POS.scl + 0.16 + i * 0.07, BT, -1.0);
  X.cr.forEach((c, i) => { let p;
    if (t < tb(4)) p = fIn(i); else if (t < tb(11, 2)) p = fIn(i); else if (t < tb(13)) p = carryPath(fIn(i), dIn(i), TL.tongK1(t), 0.12); else if (t < tb(14)) p = dIn(i);
    else if (t < tb(17)) p = i === 0 ? (t < tb(14, 1) ? carryPath(dIn(0), sIn, smooth(seg(t, tb(14), tb(14, 1))), 0.1) : sIn) : sBy(1);
    else if (t < tb(18, 2)) p = carryPath(i === 0 ? sIn : sBy(1), fIn(i), TL.tongK2(t), 0.14); else if (t < tb(23)) p = fIn(i); else if (t < tb(24, 2)) p = carryPath(fIn(i), dIn(i), TL.tongK3(t), 0.12); else if (t < tb(25)) p = dIn(i); else p = i === 0 ? sIn : dIn(1);
    c.position.copy(p); const filled = t < tb(4) || t >= tb(14, 2) && (i === 0 ? true : t >= tb(16, 2)) ; c.soil.visible = filled; c.soil.scale.y = i === 0 && inW(14, 17) ? Math.max(0.1, TL.fillK(t)) : 1;
    const b = TL.burnK(t); c.soil.material.color.setRGB(lerp(0.29, 0.62, b), lerp(0.23, 0.42, b), lerp(0.17, 0.3, b)); });
  // ajtók, izzás, kijelzők
  X.door.rotation.x = TL.doorK(t) ? 1.45 : 0; X.door.visible = !shot.cut; const hot = t < tb(4) ? 1 : clamp(seg(t, tb(19), tb(20))) * (t < tb(23, 2) ? 1 : 1 - seg(t, tb(23, 2), tb(26))); X.cer.emissiveIntensity = (t >= tb(11) && t < tb(14) ? 0.8 : 0) + hot * 1.4; X.glow.intensity = hot * 2.5 + (t >= tb(11) && t < tb(14) ? 1.2 : 0);
  drawNum(X.fdisp, TL.furnT(t) + ' °C', '#ff8a4a'); X.lid.position.set(inW(12, 14) || inW(24, 25) ? 0.16 : 0, 0, 0);
  drawScale(L.scl.disp, inW(14, 14.5) ? TL.MC : inW(14.5, 17) ? lerp(TL.MC, TL.M1, TL.fillK(t)) : inW(25, 26) || t >= tb(25) && t < tb(26) ? TL.M2 : 0, 3);
  // fogó és kanál
  { const tongOn = inW(11.5, 13) || inW(17, 18.5) || inW(23, 24.5); X.tong.visible = tongOn; X.spoon.visible = inW(14.5, 16.5);
    if (tongOn) { const c = X.cr[0].position.clone().add(V(0, 0.03, 0)), h = c.clone().add(V(0.12, 0.2, 0.16)); X.tong.position.copy(c); X.tong.lookAt(L.G.localToWorld(h.clone())); X.tong.rotateX(Math.PI / 2); X.tongH = h; }
    if (X.spoon.visible) { const c = X.cr[0].position.clone().add(V(0.0, 0.05, 0.0)); X.spoon.position.copy(c.clone().add(V(0.05, 0.04, 0.05))); X.spoon.rotation.set(0.7, 0, -0.7); } }
  drawPC(L.pc.scr, t, 'IZZÍTÁSI VESZTESÉG · EN 17685-1', null);
  techPose(L, t, shot); return {};
}
function techPose(L, t, shot) {
  const X = L.app, inW = (a, b) => t >= tb(a) && t < tb(b), Lw = (x, y, z) => L.G.localToWorld(V(x, y, z));
  if (inW(8, 11)) { const w = techAt(L, POS.mort + 0.1, -0.55); const top = X.pest.localToWorld(V(0, 0.05, 0)), ax = X.pest.localToWorld(V(0, 1, 0)).sub(X.pest.localToWorld(V(0, 0, 0))).normalize();
    const gR = gripCylinder(top, ax, 0.013, V(-0.3, -0.3, -1).normalize(), 'R', { curl: 0.9, palmOff: 0.012 }); gR.pole = V(-0.9, -0.5, -0.2); reachW(w, { R: gR, L: holdV('L', Lw(POS.mort, BT + 0.035, -1.0), 0.055, { curl: 0.6 }) }, { look: 0.55, lean: 0.14 }); return; }
  if (inW(11.5, 13) || inW(17, 18.5) || inW(23, 24.5)) { const x = X.cr[0].position.x; const w = techAt(L, x + 0.22, -0.55); const h = Lw(X.tongH.x, X.tongH.y, X.tongH.z); const ax = L.G.localToWorld(X.tongH.clone()).sub(L.G.localToWorld(X.cr[0].position.clone().add(V(0, 0.03, 0)))).normalize();
    const gR = gripCylinder(h, ax, 0.008, V(-0.2, -1, -0.2).normalize(), 'R', { curl: 1.0, palmOff: 0.012 }); gR.pole = V(-0.9, -0.5, -0.2); reachW(w, { R: gR, L: rest('L', Lw(x + 0.02, BT + 0.004, -0.85), V(0.3, 0, -1)) }, { look: 0.55, lean: 0.14 }); return; }
  if (inW(14.5, 16.5)) { const w = techAt(L, POS.scl + 0.15, -0.55); const s = X.spoon.localToWorld(V(0, 0.07, 0)); const ax = X.spoon.localToWorld(V(0, 1, 0)).sub(X.spoon.localToWorld(V(0, 0, 0))).normalize();
    const gR = gripCylinder(s, ax, 0.004, V(-0.3, -1, -0.2).normalize(), 'R', { curl: 1.2, palmOff: 0.012 }); gR.pole = V(-0.9, -0.5, -0.2); reachW(w, { R: gR, L: rest('L', Lw(POS.scl - 0.15, BT + 0.004, -0.9), V(0.3, 0, -1)) }, { look: 0.55, lean: 0.12 }); return; }
  poseAtPC(L);
}
