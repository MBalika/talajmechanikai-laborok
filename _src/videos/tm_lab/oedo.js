// Ödométer (EN ISO 17892-5): emelőkaros terhelőkeret (1:10), cella (tál) szűrőkövekkel, kompressziós gyűrű (Ø 75 × 20 mm),
// vezetőgyűrű, terhelőlap, terhelőkengyel, mérőóra; súlytárcsák az akasztón
import { THREE, V, BT, M, cyl, bx, MAT, SOILM, canvasTex, setRod } from './room.js';

export function oedometer(G, x, z) {
  const O = new THREE.Group(); O.position.set(x, BT, z); G.add(O); const fr = M(0x2f6a9a, { roughness: 0.45 }), st = MAT.st, al = MAT.al;
  bx(-0.16, 0.5, 0, 0.04, -0.13, 0.13, fr, O); bx(-0.16, -0.1, 0.04, 0.78, -0.05, 0.05, fr, O);           // talp, oszlop (hátul-balra)
  O.add(cyl(0.012, 0.012, 0.012, st, -0.13, 0.775, 0.0, 12).rotateX(Math.PI / 2));                        // csukló
  // emelőkar: a csuklótól jobbra; a kengyel 0,1 m-re, az akasztó 1,0 m-re (1:10)
  const arm = new THREE.Group(); arm.position.set(-0.13, 0.775, 0); O.add(arm); O.arm = arm; bx(0, 1.0, -0.012, 0.012, -0.015, 0.015, M(0x9aa1a8, { metalness: 0.6, roughness: 0.35 }), arm);
  arm.add(cyl(0.008, 0.008, 0.04, st, 0.13, 0, 0, 10).rotateX(Math.PI / 2)); arm.add(cyl(0.006, 0.006, 0.03, st, 0.99, 0, 0, 10).rotateX(Math.PI / 2));
  // terhelőkengyel: a kartól lefelé a terhelőlapig (két rúd + keresztfej)
  O.yoke = new THREE.Group(); O.add(O.yoke); O.yRods = [cyl(0.005, 0.005, 1, st, 0, 0, 0, 8), cyl(0.005, 0.005, 1, st, 0, 0, 0, 8)]; O.yRods.forEach(r => O.add(r));
  O.yHead = bx(-0.06, 0.06, -0.008, 0.008, -0.012, 0.012, al, O); O.yBall = cyl(0.008, 0.008, 0.02, st, 0, 0, 0, 12); O.add(O.yBall);
  // akasztó a kar végén, tárcsák
  O.hRod = cyl(0.006, 0.006, 1, st, 0, 0, 0, 8); O.add(O.hRod); O.hPlate = cyl(0.05, 0.05, 0.008, M(0x2a2d32), 0, 0, 0, 24); O.add(O.hPlate);
  O.discs = []; for (let i = 0; i < 7; i++) { const d = new THREE.Group(); const m = cyl(0.06, 0.06, 0.016 + i * 0.002, M(0x5d646c, { metalness: 0.7, roughness: 0.35 }), 0, (0.016 + i * 0.002) / 2, 0, 32); d.add(m); d.add(bx(-0.003, 0.003, 0, 0.0161 + i * 0.002, 0, 0.065, M(0x1d2024), null)); d.h = 0.016 + i * 0.002; O.add(d); O.discs.push(d); }
  // cella (tál) a talpon, belül: szűrőkő, gyűrű a mintával, vezetőgyűrű, felső kő, terhelőlap; víz
  const C = new THREE.Group(); C.position.set(0, 0.04, 0); O.add(C); O.cell = C; const cm = new THREE.MeshStandardMaterial({ color: 0xb9bec4, metalness: 0.7, roughness: 0.3, side: THREE.DoubleSide });
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.06, 48, 1, true), cm); bowl.position.y = 0.03; C.add(bowl); C.add(cyl(0.07, 0.07, 0.006, MAT.st, 0, 0.003, 0, 48));
  O.stoneB = cyl(0.0375, 0.0375, 0.008, MAT.stone, 0, 0.006 + 0.004, 0, 40); C.add(O.stoneB);
  O.ring = new THREE.Group(); C.add(O.ring); O.ring.position.y = 0.014; const rm = new THREE.MeshStandardMaterial({ color: 0xd6dde2, metalness: 0.85, roughness: 0.2, side: THREE.DoubleSide });
  { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.0395, 0.0395, 0.02, 48, 1, true), rm); r.position.y = 0.01; O.ring.add(r); const ri = new THREE.Mesh(new THREE.CylinderGeometry(0.0375, 0.0375, 0.02, 48, 1, true), rm); ri.position.y = 0.01; O.ring.add(ri);
    O.ring.add(new THREE.Mesh(new THREE.RingGeometry(0.0375, 0.0395, 48).rotateX(-Math.PI / 2), rm).translateY(0.02)); }
  O.spec = cyl(0.0375, 0.0375, 1, SOILM('clay', 61), 0, 0, 0, 40); C.add(O.spec);
  O.guide = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.046, 0.018, 48, 1, true), cm); C.add(O.guide);
  O.top = new THREE.Group(); C.add(O.top); O.top.add(cyl(0.0372, 0.0372, 0.008, MAT.stone, 0, 0.004, 0, 40)); O.top.add(cyl(0.037, 0.037, 0.012, M(0xd6dde2, { metalness: 0.5, roughness: 0.3 }), 0, 0.014, 0, 40)); O.top.add(cyl(0.006, 0.006, 0.006, st, 0, 0.023, 0, 12));
  O.water = cyl(0.068, 0.068, 1, MAT.water, 0, 0, 0, 40); C.add(O.water); O.water.renderOrder = 11;
  // mérőóra a konzolon, a tapintó a kengyel keresztfején
  O.dialG = new THREE.Group(); O.add(O.dialG); bx(-0.1, 0.0, -0.006, 0.006, -0.01, 0.01, al, O.dialG); O.dialG.add(cyl(0.032, 0.032, 0.018, M(0xd6dde2, { metalness: 0.6, roughness: 0.3 }), 0.02, 0.0, 0.02, 32).rotateX(Math.PI / 2));
  O.dial = canvasTex(256, 256); const df = new THREE.Mesh(new THREE.CircleGeometry(0.029, 40), new THREE.MeshBasicMaterial({ map: O.dial.t })); df.position.set(0.02, 0.0, 0.0295); O.dialG.add(df); O.dialTip = cyl(0.002, 0.002, 1, st, 0, 0, 0, 6); O.add(O.dialTip);
  return O;
}
// állapot: s – összenyomódás (m), nDisc – tárcsák száma, water – víz (0…1), mount – beépítettség (0: üres cella, 1: kész)
export function setOedo(O, { s = 0, nDisc = 0, water = 1, specVis = true, ringVis = true, topVis = true, yokeOn = true, H = 0.02 } = {}) {
  const C = O.cell, specTop = 0.014 + H - s; O.spec.visible = specVis; O.spec.scale.y = H - s; O.spec.position.y = 0.014 + (H - s) / 2; O.ring.visible = ringVis; O.guide.visible = ringVis; O.guide.position.y = 0.014 + 0.02 + 0.009;
  O.top.visible = topVis; O.top.position.y = specTop; const capTop = 0.04 + specTop + 0.026;          // a terhelőlap teteje (O helyi y)
  O.water.visible = water > 0.01; O.water.scale.y = Math.max(0.001, 0.05 * water); O.water.position.y = 0.006 + 0.025 * water;
  // kar: a kengyel a terhelőlapon; a kar szöge ebből (kengyel-pont: 0,1 m-re a csuklótól)
  const yk = yokeOn ? capTop + 0.11 : 0.04 + 0.014 + 0.02 + 0.026 + 0.11 + 0.01; const ang = Math.asin(Math.max(-0.2, Math.min(0.2, (yk - 0.775) / 0.1))) * 0.999; O.arm.rotation.z = ang;
  const kp = V(-0.13 + 0.13 * Math.cos(ang), 0.775 + 0.13 * Math.sin(ang), 0), ep = V(-0.13 + 0.99 * Math.cos(ang), 0.775 + 0.99 * Math.sin(ang), 0);
  setRod(O.yRods[0], V(-0.05, capTop + 0.012, 0), V(-0.05, kp.y, 0).setX(kp.x - 0.05)); setRod(O.yRods[1], V(0.05, capTop + 0.012, 0), V(kp.x + 0.05, kp.y, 0)); O.yHead.position.set(0, capTop + 0.012, 0); O.yBall.position.set(0, capTop + 0.004, 0);
  O.yRods.forEach(r => r.visible = yokeOn); O.yHead.visible = O.yBall.visible = yokeOn;
  const hy = ep.y - 0.38; setRod(O.hRod, ep, V(ep.x, hy, 0)); O.hPlate.position.set(ep.x, hy, 0); let yy = hy + 0.004; O.discs.forEach((d, i) => { d.visible = i < nDisc; if (d.visible) { d.position.set(ep.x, yy, 0); yy += d.h; } });
  O.hangTop = V(ep.x, yy, 0);     // a következő tárcsa helye (O helyi)
  O.dialG.position.set(0.1, capTop + 0.012 + 0.07, 0.0); setRod(O.dialTip, V(0.12, capTop + 0.012 + 0.07 - 0.03, 0.02), V(0.12, capTop + 0.012, 0.02));
  const g = O.dial.g; g.fillStyle = '#f4f2ea'; g.fillRect(0, 0, 256, 256); g.strokeStyle = '#222'; g.lineWidth = 3; for (let i = 0; i < 50; i++) { const a = i / 50 * Math.PI * 2; const r0 = i % 5 ? 108 : 96; g.beginPath(); g.moveTo(128 + Math.sin(a) * r0, 128 - Math.cos(a) * r0); g.lineTo(128 + Math.sin(a) * 120, 128 - Math.cos(a) * 120); g.stroke(); }
  const a = (s * 1000 % 1) * Math.PI * 2; g.strokeStyle = '#c0281e'; g.lineWidth = 5; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.sin(a) * 100, 128 - Math.cos(a) * 100); g.stroke(); g.fillStyle = '#222'; g.font = '700 30px Arial'; g.textAlign = 'center'; g.fillText((s * 1000).toFixed(2).replace('.', ',') + ' mm', 128, 190); O.dial.t.needsUpdate = true;
}
