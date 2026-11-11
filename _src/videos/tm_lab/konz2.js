// Konzisztenciahatárok (EN ISO 17892-12) – 2. változat: valós méretű eszközök a kézfogásokhoz.
// Spatula (penge +x, nyél −x), talajpép, spriccflaska, ejtőkúp-csésze (Ø 55 × 40 mm), digitális ejtőkúp-készülék (80 g, 30°),
// Casagrande-készülék (sárgaréz csésze, bütyök, hajtókar, számláló), barázdahúzó, tégely. Méter, a tárgy helyi rendszerében, origó a talpán.
import * as THREE from 'three';
import { M, cyl, bx, MAT, SOILM, canvasTex } from './room.js';
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const lathe = (pts, mat, seg = 48) => { const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg); const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; return m; };
let K = null;
export function kmats() { if (K) return K; K = {
  steel: M(0xdfe3e6, { metalness: 0.85, roughness: 0.16 }), dark: M(0x24272b, { metalness: 0.35, roughness: 0.5 }), black: M(0x141618, { roughness: 0.55 }),
  frame: M(0x2f6a9a, { roughness: 0.45 }), housing: M(0xe9ebee, { roughness: 0.45 }), red: M(0xd23a2a, { roughness: 0.45 }), grey: M(0x9aa1a8, { metalness: 0.6, roughness: 0.35 }),
  brass: new THREE.MeshStandardMaterial({ color: 0xc9a85a, metalness: 0.75, roughness: 0.3, side: THREE.DoubleSide }), alu: new THREE.MeshStandardMaterial({ color: 0xc9ced3, metalness: 0.7, roughness: 0.28, side: THREE.DoubleSide }),
  rubber: M(0x2a2620, { roughness: 0.7 }), paste: SOILM('wet', 7), paste2: SOILM('wet', 8), wood: M(0x3a2c22, { roughness: 0.6 }),
  ldpe: new THREE.MeshStandardMaterial({ color: 0xeef3f6, transparent: true, opacity: 0.75, roughness: 0.4 }),
  glass: new THREE.MeshStandardMaterial({ color: 0xd6eef2, transparent: true, opacity: 0.5, roughness: 0.05, metalness: 0.1 }) }; return K; }

// spatula: penge (+x irányban, 0,1 m), nyél (−x irányban, 0,11 m); a fogás a nyél közepén (−0,06, 0, 0)
export const SP = { BL: 0.1, BW: 0.022, HL: 0.11, HR: 0.0085, GRIP: -0.062 };
export function spatula2() { const S = kmats(); const g = new THREE.Group();
  const shp = new THREE.Shape(); shp.moveTo(0, -SP.BW / 2 * 0.7); shp.lineTo(SP.BL - 0.012, -SP.BW / 2); shp.quadraticCurveTo(SP.BL, -SP.BW / 2, SP.BL, 0); shp.quadraticCurveTo(SP.BL, SP.BW / 2, SP.BL - 0.012, SP.BW / 2); shp.lineTo(0, SP.BW / 2 * 0.7); shp.closePath();
  const bl = new THREE.Mesh(new THREE.ExtrudeGeometry(shp, { depth: 0.0012, bevelEnabled: false }), S.steel); bl.rotation.x = -Math.PI / 2; bl.position.y = -0.0006; bl.castShadow = true; g.add(bl);
  const h = cyl(SP.HR, SP.HR * 0.9, SP.HL, S.wood, -SP.HL / 2 - 0.004, 0, 0, 14); h.rotation.z = Math.PI / 2; g.add(h); g.add(cyl(0.006, 0.0045, 0.012, S.steel, -0.002, 0, 0, 12).rotateZ(Math.PI / 2));
  g.blob = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), S.paste); g.blob.scale.set(0.014, 0.005, 0.009); g.blob.position.set(SP.BL * 0.7, 0.004, 0); g.blob.visible = false; g.add(g.blob);
  return g; }
// talajpép az üveglapon: lapított ellipszoid, a keveréskor hullámzik
export function pasteLump() { const S = kmats(); const g = new THREE.Group(); g.m = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 18, 0, Math.PI * 2, 0, Math.PI / 2), S.paste); g.m.castShadow = true; g.add(g.m);
  g.set = (k, w = 0, t = 0) => { const rx = 0.055 * k + 0.012, rz = 0.045 * k + 0.01; g.m.scale.set(rx * (1 + 0.06 * w * Math.sin(t * 7)), 0.016 * Math.sqrt(k) + 0.004, rz * (1 + 0.06 * w * Math.cos(t * 6))); g.visible = k > 0.01; }; return g; }
export function glassPlate3(w = 0.34, d = 0.28) { const S = kmats(); const g = new THREE.Group(); const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.006, d), S.glass); m.position.y = 0.003; g.add(m);
  bx(-w / 2, w / 2, 0.0, 0.001, -d / 2, d / 2, M(0x2c3a40, { roughness: 0.8 }), g); return g; }
// spriccflaska (desztillált víz): palack + hajlított cső
export function washBottle() { const S = kmats(); const g = new THREE.Group(); g.add(lathe([[0, 0], [0.034, 0], [0.036, 0.01], [0.036, 0.12], [0.02, 0.15], [0.012, 0.155]], S.ldpe, 32));
  g.add(cyl(0.014, 0.014, 0.018, M(0xd23a2a, { roughness: 0.4 }), 0, 0.162, 0, 18));
  const crv = new THREE.CatmullRomCurve3([V(0, 0.17, 0), V(0, 0.2, 0.002), V(0, 0.215, 0.02), V(0, 0.205, 0.055), V(0, 0.19, 0.075)]); const tb = new THREE.Mesh(new THREE.TubeGeometry(crv, 20, 0.0028, 8), M(0xf2f2ee, { roughness: 0.4 })); g.add(tb);
  g.tip = V(0, 0.19, 0.077); g.h = 0.15; g.r = 0.036; return g; }
// ejtőkúp-csésze Ø 55 × 40 mm (belül), a péppel (fill 0–1), a kúp nyomával
export const CUP = { RI: 0.0275, RO: 0.0315, H: 0.04, B: 0.004 };
export function coneCup() { const S = kmats(); const g = new THREE.Group(); g.add(lathe([[0, 0], [CUP.RO, 0], [CUP.RO, CUP.H + CUP.B], [CUP.RI, CUP.H + CUP.B], [CUP.RI, CUP.B], [0, CUP.B]], S.alu, 44));
  g.paste = cyl(CUP.RI - 0.0003, CUP.RI - 0.0003, 1, S.paste, 0, 0, 0, 40); g.add(g.paste);
  g.mound = lathe([[0, 1], [0.6, 0.8], [1, 0]], S.paste, 36); g.add(g.mound);
  g.crater = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0x2b221a, roughness: 0.9, side: THREE.DoubleSide })); g.crater.rotation.x = Math.PI; g.add(g.crater); g.crater.visible = false;
  g.set = (fill, mound = 0, crater = 0) => { const h = Math.max(0.0005, CUP.H * Math.min(1, fill)); g.paste.visible = fill > 0.01; g.paste.scale.y = h; g.paste.position.y = CUP.B + h / 2;
    g.mound.visible = mound > 0.01; g.mound.scale.set(CUP.RI * 0.95, 0.008 * mound, CUP.RI * 0.95); g.mound.position.y = CUP.B + h;
    g.crater.visible = crater > 0.0005; const cr = crater * Math.tan(15 * Math.PI / 180); g.crater.scale.set(Math.max(0.0005, cr), Math.max(0.0005, crater), Math.max(0.0005, cr)); g.crater.position.y = CUP.B + h - crater / 2 + 0.0003; };
  g.set(0); return g; }
// digitális ejtőkúp-készülék: talp, hátsó oszlop, mozgatható fej (finomállító gomb felül balra, kioldógomb jobbra, nullázó, kijelző elöl),
// kúp (30°, 35 mm) a 80 g-os szárral. A fej y-ja: set(headY); a kúp a fejhez képest lóg (lockDrop: a leesés mm-ben).
export const FC = { BASE: 0.04, CZ: 0.035, HEAD_H: 0.09, TIP: 0.062, COL_Z: -0.075, KNOB: [-0.03, 0.098, 0.0], BTN: [0.034, 0.08, 0.048], ZERO: [0.024, 0.04, 0.071] };
export function penetrometer() { const S = kmats(); const g = new THREE.Group(); bx(-0.11, 0.11, 0, FC.BASE, -0.11, 0.1, S.frame, g); g.add(cyl(0.032, 0.032, 0.004, S.dark, 0, FC.BASE + 0.002, FC.CZ, 28));
  g.add(cyl(0.014, 0.014, 0.46, S.steel, 0, FC.BASE + 0.23, FC.COL_Z, 16)); g.add(cyl(0.018, 0.018, 0.012, S.dark, 0, FC.BASE + 0.46, FC.COL_Z, 16));
  g.head = new THREE.Group(); g.add(g.head);
  bx(-0.022, 0.022, 0.0, FC.HEAD_H, FC.COL_Z - 0.022, FC.COL_Z + 0.022, S.housing, g.head);                         // csúszka az oszlopon
  bx(-0.045, 0.045, 0.012, FC.HEAD_H, FC.COL_Z + 0.02, FC.CZ + 0.035, S.housing, g.head);                           // a fej doboza
  bx(-0.04, 0.04, 0.03, 0.07, FC.CZ + 0.035, FC.CZ + 0.037, S.dark, g.head);
  g.disp = (() => { const C = canvasTex(256, 96); const m = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.0225), new THREE.MeshBasicMaterial({ map: C.t })); m.position.set(-0.008, 0.052, FC.CZ + 0.0375); g.head.add(m); return C; })();
  g.head.add(cyl(0.006, 0.006, 0.006, S.grey, FC.ZERO[0], FC.ZERO[1], FC.CZ + 0.038, 14).rotateX(Math.PI / 2));
  g.btn = cyl(0.009, 0.009, 0.012, S.red, FC.BTN[0], FC.HEAD_H + 0.006, FC.BTN[2] - 0.02, 16); g.head.add(g.btn);   // kioldógomb a fej tetején
  g.knob = new THREE.Group(); g.knob.position.set(FC.KNOB[0], FC.HEAD_H, FC.KNOB[2] - 0.02); g.head.add(g.knob); g.knob.add(cyl(0.016, 0.016, 0.018, S.black, 0, 0.009, 0, 20));
  for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; const r = bx(-0.0012, 0.0012, 0.001, 0.017, 0.0155, 0.0172, S.black, g.knob); r.rotation.y = a; }
  g.head.add(cyl(0.0065, 0.0065, FC.HEAD_H + 0.01, S.steel, 0, FC.HEAD_H / 2, FC.CZ, 14));                              // vezetőcső
  g.cone = new THREE.Group(); g.add(g.cone); const c = new THREE.Mesh(new THREE.ConeGeometry(0.0094, 0.035, 36), S.steel); c.rotation.x = Math.PI; c.position.y = 0.0175; g.cone.add(c);
  g.cone.add(cyl(0.0094, 0.0094, 0.006, S.steel, 0, 0.038, 0, 24)); g.cone.add(cyl(0.004, 0.004, 0.15, S.steel, 0, 0.11, 0, 12)); g.cone.add(cyl(0.011, 0.011, 0.012, S.steel, 0, 0.19, 0, 20));
  g.set = (headY, drop = 0) => { g.head.position.y = headY; g.cone.position.set(0, headY - FC.TIP - drop, FC.CZ); };
  return g; }
export function drawMM(C, v, label = 'mm') { const g = C.g; g.fillStyle = '#0d1f14'; g.fillRect(0, 0, 256, 96); g.fillStyle = '#9fe36a'; g.font = '700 60px Arial'; g.textAlign = 'right'; g.fillText(v, 196, 70); g.font = '700 26px Arial'; g.fillText(label, 246, 70); C.t.needsUpdate = true; }
// Casagrande-készülék: kemény gumi alaplap, keret, csuklós sárgaréz csésze (a csukló hátul), bütyök, hajtókar a jobb oldalon, számláló
export const CS = { CUPX: -0.015, HINGE: [0.0, 0.072, -0.07], CR: 0.054, CRANK: [0.11, 0.06, 0.0], CRR: 0.045 };
export function casagrande2() { const S = kmats(); const g = new THREE.Group(); bx(-0.075, 0.075, 0, 0.05, -0.0625, 0.0625, S.rubber, g);
  bx(0.07, 0.1, 0.0, 0.09, -0.07, 0.04, S.grey, g); bx(-0.02, 0.1, 0.06, 0.07, -0.085, -0.06, S.grey, g);                                  // keret, csuklótartó
  g.cupG = new THREE.Group(); g.cupG.position.set(...CS.HINGE); g.add(g.cupG);
  const pts = []; for (let i = 0; i <= 14; i++) { const a = i / 14 * Math.PI / 2; pts.push([CS.CR * Math.sin(a), 0.027 * (1 - Math.cos(a))]); }
  const cup = lathe(pts, S.brass, 44); cup.position.set(CS.CUPX - CS.HINGE[0], -0.0215, -CS.HINGE[2]); g.cupG.add(cup); g.cupG.add(bx(-0.008, 0.008, -0.004, 0.004, -0.004, 0.014, S.brass, null));
  g.paste = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.024, 0.011, 40), S.paste2); g.paste.position.set(CS.CUPX - CS.HINGE[0], -0.0215 + 0.0145, -CS.HINGE[2]); g.cupG.add(g.paste); g.paste.visible = false;
  g.groove = new THREE.Group(); g.groove.position.copy(g.paste.position).add(V(0, 0.0056, 0)); g.cupG.add(g.groove); const gm = M(0x1e1812, { roughness: 0.95 });
  g.grooveL = new THREE.Group(); g.groove.add(g.grooveL); g.grooveL.visible = false; g.gA = bx(-0.001, 0.001, -0.0005, 0.0003, -0.5, 0.5, gm, g.grooveL); g.gB = bx(-0.001, 0.001, -0.0005, 0.0003, -0.5, 0.5, gm, g.grooveL);
  g.setGroove = (len, gap) => { const h = (len - gap) / 2; for (const [m, s] of [[g.gA, -1], [g.gB, 1]]) { m.scale.z = Math.max(0.0005, h); m.position.z = s * (gap / 2 + h / 2) + (len < 0.0699 ? -(0.07 - len) / 2 : 0); } };
  g.add(cyl(0.012, 0.012, 0.03, S.dark, 0.085, 0.055, -0.02, 18).rotateZ(Math.PI / 2));                                                  // bütyöktengely
  g.crank = new THREE.Group(); g.crank.position.set(...CS.CRANK); g.add(g.crank); bx(0, 0.006, -0.005, 0.005, -0.005, CS.CRR, S.grey, g.crank);
  g.crank.add(cyl(0.008, 0.008, 0.032, S.black, 0.022, 0, CS.CRR, 14).rotateZ(Math.PI / 2)); g.knobLocal = V(0.024, 0, CS.CRR);                // a fogantyú a hajtókar végén (x irányban)
  g.disp = (() => { const C = canvasTex(160, 64); const m = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.016), new THREE.MeshBasicMaterial({ map: C.t })); m.position.set(0.085, 0.07, 0.0405); g.add(m); return C; })();
  return g; }
// barázdahúzó (ISO): lapos acél, a végén a V-alakú él; a fogás a nyelén (x irányban), az él lefelé
export function groover() { const S = kmats(); const g = new THREE.Group(); bx(-0.075, 0.0, -0.006, 0.006, -0.0012, 0.0012, S.steel, g);
  const sh = new THREE.Shape(); sh.moveTo(0, -0.008); sh.lineTo(0.012, -0.008); sh.lineTo(0.014, -0.004); sh.lineTo(0.02, -0.003); sh.lineTo(0.02, 0.006); sh.lineTo(0, 0.006); sh.closePath();
  const tip = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.0024, bevelEnabled: false }), S.steel); tip.position.z = -0.0012; g.add(tip); g.add(cyl(0.0075, 0.0075, 0.05, S.wood, -0.06, 0, 0, 14).rotateZ(Math.PI / 2)); return g; }
// alumínium tégely fedél nélkül (Ø 60 × 24 mm), a mintával
export function tin3() { const S = kmats(); const g = new THREE.Group(); g.add(lathe([[0, 0], [0.029, 0], [0.03, 0.002], [0.03, 0.024], [0.028, 0.024], [0.028, 0.002], [0, 0.002]], S.alu, 36));
  g.soil = lathe([[0, 1], [0.7, 0.75], [1, 0]], kmats().paste, 28); g.soil.position.y = 0.002; g.soil.scale.set(0.022, 0.01, 0.022); g.soil.visible = false; g.add(g.soil); return g; }
