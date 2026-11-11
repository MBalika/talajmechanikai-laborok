// Konzisztenciahatárok közös eszközei: üveglap, spatula, talajpép, tégelyek, ejtőkúp-készülék, Casagrande-csésze
import { THREE, V, BT, M, cyl, bx, MAT, SOILM, screen, setRod } from './room.js';

// üveglap a pépnek (a laborasztalon)
export function glassPlate(G, x, z, w = 0.34, d = 0.3) { const P = new THREE.Group(); P.position.set(x, BT, z); G.add(P);
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.006, d), new THREE.MeshStandardMaterial({ color: 0xd6eef2, transparent: true, opacity: 0.55, roughness: 0.05, metalness: 0.1 })); m.position.y = 0.003; P.add(m);
  P.add(bx(-w / 2, w / 2, 0.0, 0.0012, -d / 2, d / 2, M(0x2c3a40, { roughness: 0.8 }), null)); return P; }
// talajpép-kupac (lapított ellipszoid); k: méret-szorzó
export function pasteLump(parent, mat) { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), mat || SOILM('wet', 7)); m.scale.set(0.07, 0.018, 0.055); m.castShadow = true; parent.add(m); return m; }
// spatula: penge + nyél (a nyél tengelye a csoport +x iránya)
export function spatula(G) { const S = new THREE.Group(); G.add(S); S.add(bx(0, 0.11, -0.0008, 0.0008, -0.012, 0.012, M(0xdfe3e6, { metalness: 0.9, roughness: 0.15 }), null));
  const h = cyl(0.009, 0.009, 0.11, M(0x2a2d32, { roughness: 0.6 }), 0.165, 0, 0, 12); h.rotation.z = Math.PI / 2; S.add(h); S.handle = V(0.165, 0, 0); return S; }
// alumínium tégely (víztartalom); fedél nélkül
export function tin(G, x, z, y = BT) { const T = new THREE.Group(); T.position.set(x, y, z); G.add(T); const m = M(0xc9ced3, { metalness: 0.8, roughness: 0.25 });
  const w = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.028, 0.022, 28, 1, true), new THREE.MeshStandardMaterial({ color: 0xc9ced3, metalness: 0.8, roughness: 0.25, side: THREE.DoubleSide })); w.position.y = 0.011; T.add(w);
  T.add(cyl(0.028, 0.028, 0.002, m, 0, 0.001, 0, 28)); const s = cyl(0.026, 0.026, 0.006, SOILM('wet', 9), 0, 0.006, 0, 24); s.visible = false; T.add(s); T.soil = s; return T; }
// fém csésze (ejtőkúphoz: Ø 55 mm, 40 mm mély) péppel; a kráter egy sötét kúp-lyuk
export function cup(G) { const C = new THREE.Group(); G.add(C); const br = M(0xb79a52, { metalness: 0.8, roughness: 0.3 });
  const w = new THREE.Mesh(new THREE.CylinderGeometry(0.0285, 0.0285, 0.04, 36, 1, true), new THREE.MeshStandardMaterial({ color: 0xb79a52, metalness: 0.8, roughness: 0.3, side: THREE.DoubleSide })); w.position.y = 0.02; C.add(w); C.add(cyl(0.0285, 0.0285, 0.003, br, 0, 0.0015, 0, 36));
  const p = cyl(0.0275, 0.0275, 0.037, SOILM('wet', 7), 0, 0.0015 + 0.0185, 0, 36); C.add(p); C.paste = p;
  const cr = new THREE.Mesh(new THREE.ConeGeometry(0.006, 0.02, 20, 1, true), new THREE.MeshStandardMaterial({ color: 0x2b221a, roughness: 0.9, side: THREE.DoubleSide })); cr.rotation.x = Math.PI; cr.position.y = 0.04 - 0.01 + 0.0004; C.add(cr); C.crater = cr; cr.visible = false; return C; }
// ejtőkúp-készülék: talp, oszlop, kar, kúp a szárral, kioldógomb, digitális kijelző; a csésze a talpon
export function fallCone(G, x, z) { const F = new THREE.Group(); F.position.set(x, BT, z); G.add(F); const fr = M(0x2f6a9a, { roughness: 0.45 }), st = MAT.st;
  bx(-0.12, 0.12, 0, 0.03, -0.12, 0.12, fr, F); F.add(cyl(0.012, 0.012, 0.5, st, -0.08, 0.28, -0.06, 14));
  const arm = new THREE.Group(); F.add(arm); F.arm = arm; arm.position.y = 0.3; bx(-0.1, 0.03, -0.025, 0.025, -0.08, -0.03, fr, arm); bx(-0.03, 0.04, -0.035, 0.035, -0.045, 0.025, M(0x2a2d32, { metalness: 0.3 }), arm);
  arm.add(cyl(0.012, 0.012, 0.012, MAT.red, 0.042, 0.02, 0.0, 14).rotateZ(Math.PI / 2)); F.btn = V(0.05, 0.32, 0.0);
  F.disp = screen(arm, 0.06, 0.022, 160, 56, 0.004, 0.0, 0.0255); arm.add(cyl(0.009, 0.009, 0.04, M(0x15171a), -0.06, 0.045, -0.055, 12));   // állítócsavar
  // a kúp: 30°-os csúcsszög, 35 mm hosszú; szár + súly (80 g)
  const cone = new THREE.Group(); F.add(cone); F.cone = cone; const cm = M(0xdfe3e6, { metalness: 0.9, roughness: 0.12 });
  const c = new THREE.Mesh(new THREE.ConeGeometry(0.0094, 0.035, 32), cm); c.rotation.x = Math.PI; c.position.y = 0.0175; cone.add(c); cone.add(cyl(0.0094, 0.0094, 0.008, cm, 0, 0.039, 0, 24)); cone.add(cyl(0.0035, 0.0035, 0.16, cm, 0, 0.12, 0, 12));
  F.cup = cup(F); F.cup.position.set(0, 0.03, 0); F.tipRest = 0.03 + 0.04;    // a pép felszíne (a talp helyi y)
  return F; }
// Casagrande-készülék: kemény alaplap, csuklós sárgaréz csésze, bütyök, hajtókar, számláló
export function casagrande(G, x, z) { const K = new THREE.Group(); K.position.set(x, BT, z); G.add(K);
  bx(-0.075, 0.075, 0, 0.05, -0.0625, 0.0625, M(0x2a2620, { roughness: 0.6 }), K); bx(0.075, 0.13, 0, 0.09, -0.04, 0.04, M(0x9aa1a8, { metalness: 0.6, roughness: 0.35 }), K);
  const cupG = new THREE.Group(); cupG.position.set(0.085, 0.07, 0); K.add(cupG); K.cupG = cupG;   // csukló a csésze hátsó peremén
  const pts = []; for (let i = 0; i <= 14; i++) { const u = i / 14, a = u * Math.PI / 2; pts.push(new THREE.Vector2(0.054 * Math.sin(a), 0.027 * (1 - Math.cos(a)))); }
  const bowl = new THREE.Mesh(new THREE.LatheGeometry(pts, 40), new THREE.MeshStandardMaterial({ color: 0xc9a85a, metalness: 0.75, roughness: 0.3, side: THREE.DoubleSide })); bowl.position.set(-0.06, -0.018, 0); cupG.add(bowl);
  const pst = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.02, 0.015, 36), SOILM('wet', 8)); pst.position.set(-0.06, -0.005, 0); cupG.add(pst); K.paste = pst;
  const gr = bx(-0.0015, 0.0015, 0, 0.0005, -0.04, 0.04, M(0x2b221a), null); gr.position.set(-0.06, 0.003, 0); cupG.add(gr); K.groove = gr; gr.visible = false;
  const crank = new THREE.Group(); crank.position.set(0.13, 0.05, 0); K.add(crank); K.crank = crank; bx(0, 0.008, -0.004, 0.004, -0.045, 0.004, M(0x9aa1a8, { metalness: 0.6 }), crank);
  K.knob = cyl(0.009, 0.009, 0.035, M(0x15171a), 0.022, 0, -0.04, 12); K.knob.rotation.z = Math.PI / 2; crank.add(K.knob);
  K.disp = screen(K, 0.05, 0.02, 128, 50, 0.1, 0.06, 0.0405); return K; }
export function drawNum(S, txt, col = '#9fe36a') { const g = S.g; g.fillStyle = '#0e2418'; g.fillRect(0, 0, S.c.width, S.c.height); g.fillStyle = col; g.font = `700 ${Math.round(S.c.height * 0.62)}px Arial`; g.textAlign = 'center'; g.fillText(txt, S.c.width / 2, S.c.height * 0.74); S.t.needsUpdate = true; }
