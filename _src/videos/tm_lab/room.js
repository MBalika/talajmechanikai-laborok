// Talajmechanikai laborok – közös labor: helyiség, laborasztal, szárítószekrény, mérleg, számítógép, laboráns,
// kézfogás-segédek. Minden laborvideó ebből épít, a saját készülékét a saját app.js-ében teszi hozzá.
import * as THREE from 'three';
import { clamp, lerp, smooth, seg, mulberry32 } from '../../kit/util.js';
import { M, box, cyl, setRod, buildWorker } from '../../kit/parts.js';
import { gripCylinder, palmOn, POLE } from '../../kit/grip.js';

export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const LX = 300, BT = 0.9;                       // a labor a világ x = 300 környékén; asztallap magassága
export const TZ = -0.55;                                // a laboráns szokásos helye (z) az asztal előtt
export { THREE, M, box, cyl, setRod, gripCylinder, palmOn, POLE, clamp, lerp, smooth, seg, mulberry32 };

export function bx(x0, x1, y0, y1, z0, z1, m, parent) { const b = box(x1 - x0, y1 - y0, z1 - z0, m, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); if (parent) parent.add(b); return b; }
export function canvasTex(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return { c, g: c.getContext('2d'), t }; }
export function screen(parent, w, h, cw, ch, x, y, z, rx = 0) { const S = canvasTex(cw, ch); const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: S.t })); m.position.set(x, y, z); m.rotation.x = rx; parent.add(m); S.mesh = m; return S; }
// agyag / homok / kavics textúra
export function soilTex(kind = 'clay', seed = 11) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 512; const g = c.getContext('2d'); const r = mulberry32(seed);
  const base = { clay: '#5a4e42', wet: '#4a3f35', sand: '#b89a6a', dry: '#8a7a66', grey: '#6d6862', peat: '#3a2c20', ash: '#b9a998' }[kind] || '#5a4e42';
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 9000; i++) { const v = 50 + r() * 80; g.fillStyle = `rgba(${v + 24 | 0},${v + 12 | 0},${v - 4 | 0},${0.18 + r() * 0.35})`; const q = 1 + r() * (kind === 'sand' ? 3 : 2); g.fillRect(r() * 512, r() * 512, q, q); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
export const SOILM = (kind = 'clay', seed) => new THREE.MeshStandardMaterial({ map: soilTex(kind, seed), roughness: 0.92 });
export const MAT = {};
function mats() { if (MAT.st) return MAT; Object.assign(MAT, {
  white: M(0xe9e8e4, { roughness: 0.8 }), lam: M(0xd7d9d6, { roughness: 0.55 }), cab: M(0x8a96a3, { roughness: 0.6 }), st: M(0xc3c8cd, { metalness: 0.8, roughness: 0.22 }),
  dk: M(0x2a2d32, { metalness: 0.4, roughness: 0.5 }), al: M(0x9aa1a8, { metalness: 0.6, roughness: 0.35 }), grey: M(0xd9dcdf, { roughness: 0.55 }), blk: M(0x15171a, { roughness: 0.5 }),
  brass: M(0xb08d3a, { metalness: 0.7, roughness: 0.3 }), blue: M(0x2f6fb5, { roughness: 0.45 }), stone: M(0x8d9096, { roughness: 0.95 }), red: M(0xd23a2a, { roughness: 0.5 }),
  glass: new THREE.MeshStandardMaterial({ color: 0xcfe6f0, transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0.0, side: THREE.DoubleSide, depthWrite: false }),
  water: new THREE.MeshStandardMaterial({ color: 0x5c8fa8, transparent: true, opacity: 0.35, roughness: 0.05, depthWrite: false }),
  porc: M(0xf1efe9, { roughness: 0.35 }), paper: M(0xf2efe6, { roughness: 0.9 }) }); return MAT; }

// ---------------- helyiség ----------------
export function buildRoom(R, { board = null, sink = false } = {}) {
  const A = mats(); const L = { mats: A }; const G = new THREE.Group(); G.position.set(LX, 0, 0); R.scene.add(G); L.G = G;
  const room = [bx(-4.2, 4.2, -0.02, 0, -1.9, 3.5, M(0xa9acaa, { roughness: 0.5 }), G), bx(-4.2, 4.2, 0, 3.2, -1.92, -1.9, M(0xe6e1d6, { roughness: 0.92 }), G),
    bx(-4.22, -4.2, 0, 3.2, -1.9, 3.5, M(0xd9d6cc, { roughness: 0.92 }), G), bx(4.2, 4.22, 0, 3.2, -1.9, 3.5, M(0xd9d6cc, { roughness: 0.92 }), G), bx(-4.2, 4.2, 3.2, 3.22, -1.9, 3.5, M(0xf0efec, { roughness: 0.9 }), G)];
  room.forEach(b => { b.castShadow = false; });
  bx(-4.2, 4.2, 0, 0.12, -1.9, -1.87, M(0x6f767c), G);
  for (const x of [-2.6, 0, 2.6]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.3), new THREE.MeshBasicMaterial({ color: 0xfffbf2 })); p.rotation.x = Math.PI / 2; p.position.set(x, 3.19, -0.6); G.add(p); }
  { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.2), new THREE.MeshBasicMaterial({ color: 0xcfe3f2 })); w.rotation.y = Math.PI / 2; w.position.set(-4.19, 1.75, 0.6); G.add(w); bx(-4.2, -4.17, 1.13, 1.17, -0.2, 1.4, A.grey, G); bx(-4.2, -4.17, 2.33, 2.37, -0.2, 1.4, A.grey, G); }
  // tábla (a videó témájának kézi rajzával)
  { const S = canvasTex(1024, 512); const g = S.g; g.fillStyle = '#f7f7f4'; g.fillRect(0, 0, 1024, 512); if (board) board(g); else { g.strokeStyle = '#2b4f9e'; g.lineWidth = 5; g.beginPath(); g.moveTo(80, 440); g.lineTo(960, 440); g.moveTo(80, 440); g.lineTo(80, 60); g.stroke(); }
    const b = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.75), new THREE.MeshStandardMaterial({ map: S.t, roughness: 0.4 })); b.position.set(1.15, 2.05, -1.885); G.add(b); L.board = S;
    bx(0.38, 1.92, 1.66, 1.68, -1.89, -1.86, M(0x8a9097, { metalness: 0.6 }), G); bx(0.38, 1.92, 2.42, 2.44, -1.89, -1.87, M(0x8a9097, { metalness: 0.6 }), G); }
  // falipolc mintadobozokkal
  { const sh = M(0x6b737b, { metalness: 0.4, roughness: 0.5 }); for (const y of [1.55, 2.0, 2.45]) bx(-3.6, -0.9, y, y + 0.025, -1.9, -1.62, sh, G);
    const r = mulberry32(5); for (const y of [1.575, 2.025]) for (let x = -3.55; x < -1.05; x += 0.17 + r() * 0.08) bx(x, x + 0.14, y, y + 0.14 + r() * 0.06, -1.86, -1.66, M([0xc9a46a, 0x8a9097, 0xd8d4c8, 0x6b8fb5][Math.floor(r() * 4)], { roughness: 0.6 }), G); }
  // laborasztal, alatta szekrények
  bx(-3.8, 3.4, BT - 0.04, BT, -1.55, -0.8, A.lam, G);
  for (let x = -3.75; x < 3.35; x += 0.6) { bx(x, x + 0.58, 0.1, BT - 0.04, -1.5, -0.84, A.cab, G); bx(x + 0.24, x + 0.34, BT - 0.17, BT - 0.155, -0.84, -0.825, A.st, G); }
  bx(-3.8, 3.4, 0, 0.1, -1.5, -0.86, M(0x3a3f45), G);
  if (sink) { // mosogató csappal (nedves szitáláshoz)
    const S = new THREE.Group(); S.position.set(sink.x ?? -3.2, BT, -1.18); G.add(S); L.sink = S; bx(-0.3, 0.3, -0.004, 0.004, -0.26, 0.26, A.st, S);
    bx(-0.26, 0.26, -0.2, -0.004, -0.22, 0.22, M(0x9aa1a8, { metalness: 0.8, roughness: 0.25, side: THREE.BackSide }), S);
    S.add(cyl(0.012, 0.012, 0.32, A.st, 0, 0.16, -0.24, 12)); const sp = cyl(0.01, 0.01, 0.2, A.st, 0, 0.31, -0.15, 12); sp.rotation.x = Math.PI / 2; S.add(sp); S.add(cyl(0.008, 0.012, 0.03, A.st, 0, 0.3, -0.05, 12));
    L.tapY = BT + 0.285; L.tapX = S.position.x; L.tapZ = -1.23;
    L.stream = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 1, 8), new THREE.MeshStandardMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.55, roughness: 0.05 })); G.add(L.stream); L.stream.visible = false; }
  // szárítószekrény (105 °C) nyitható ajtóval
  { const ov = new THREE.Group(); ov.position.set(-3.3, BT, -1.25); G.add(ov); L.oven = ov; const om = M(0xd0d3d6, { metalness: 0.3, roughness: 0.4 }), im = M(0x6a7076, { metalness: 0.6, roughness: 0.4 });
    // üreges szekrény: hát, két oldal, tető, fenék (kívül világos, belül rozsdamentes)
    bx(-0.35, 0.35, 0, 0.06, -0.3, 0.28, om, ov); bx(-0.35, 0.35, 0.56, 0.62, -0.3, 0.28, om, ov); bx(-0.35, -0.3, 0.06, 0.56, -0.3, 0.28, om, ov); bx(0.3, 0.35, 0.06, 0.56, -0.3, 0.28, om, ov); bx(-0.3, 0.3, 0.06, 0.56, -0.3, -0.25, om, ov);
    bx(-0.3, 0.3, 0.06, 0.062, -0.25, 0.28, im, ov); bx(-0.3, -0.298, 0.06, 0.56, -0.25, 0.28, im, ov); bx(0.298, 0.3, 0.06, 0.56, -0.25, 0.28, im, ov); bx(-0.3, 0.3, 0.06, 0.56, -0.25, -0.248, im, ov);
    for (const y of [0.2, 0.36]) bx(-0.29, 0.29, y, y + 0.006, -0.24, 0.26, A.st, ov);
    L.ovenGlow = new THREE.PointLight(0xffb070, 0, 0.8, 2); L.ovenGlow.position.set(0, 0.4, 0); ov.add(L.ovenGlow);
    const door = new THREE.Group(); door.position.set(-0.35, 0, 0.3); ov.add(door); L.ovenDoor = door; bx(0, 0.7, 0.0, 0.62, 0, 0.025, M(0xc6c9cc, { metalness: 0.3, roughness: 0.4 }), door);   // zsanér balra, nyitás: rotation.y < 0
    bx(0.06, 0.52, 0.1, 0.52, 0.025, 0.03, M(0x404850, { metalness: 0.2, roughness: 0.2 }), door); bx(0.6, 0.64, 0.25, 0.4, 0.025, 0.06, A.st, door); L.ovenHandle = V(0.62, 0.325, 0.06);
    L.ovenDisp = screen(ov, 0.1, 0.03, 128, 40, 0.24, 0.585, 0.305); }
  // mérleg (az asztalon, x helyét a videó adja: L.scl.G.position.x)
  { const E = new THREE.Group(); E.position.set(-0.3, BT, -1.05); G.add(E); L.scl = { G: E };
    bx(-0.11, 0.11, 0, 0.06, -0.14, 0.14, M(0xe6e8ea, { roughness: 0.4 }), E); bx(-0.11, 0.11, 0.0, 0.035, 0.14, 0.19, M(0xe6e8ea, { roughness: 0.4 }), E);
    E.add(cyl(0.07, 0.07, 0.006, A.st, 0, 0.066, -0.01, 40)); L.scl.panY = BT + 0.069; L.scl.disp = screen(E, 0.12, 0.03, 256, 64, 0, 0.024, 0.1905, -0.6); }
  // számítógép
  { const g = new THREE.Group(); g.position.set(2.75, BT, -1.15); G.add(g); L.pc = { g };
    bx(-0.08, 0.08, 0, 0.01, -0.07, 0.07, A.dk, g); bx(-0.02, 0.02, 0.01, 0.18, -0.04, 0.0, A.dk, g); bx(-0.3, 0.3, 0.14, 0.5, -0.02, 0.0, M(0x1d2024, { roughness: 0.4 }), g);
    L.pc.scr = screen(g, 0.57, 0.334, 1024, 600, 0, 0.32, 0.0015);
    bx(-0.22, 0.22, 0, 0.018, 0.16, 0.3, M(0x2c3036, { roughness: 0.6 }), g); for (let r = 0; r < 4; r++) for (let c = 0; c < 14; c++) bx(-0.205 + c * 0.03, -0.205 + c * 0.03 + 0.024, 0.018, 0.024, 0.17 + r * 0.032, 0.17 + r * 0.032 + 0.026, M(0x3c4148, { roughness: 0.6 }), g);
    L.pc.mouse = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), M(0x2c3036, { roughness: 0.5 })); L.pc.mouse.scale.set(0.032, 0.018, 0.055); L.pc.mouse.position.set(0.32, 0.0, 0.24); g.add(L.pc.mouse);
    bx(0.26, 0.4, 0, 0.003, 0.15, 0.33, M(0x24272c, { roughness: 0.8 }), g); }
  // fények
  const key = new THREE.DirectionalLight(0xfff2e2, 2.2); key.position.set(1.2, 2.9, 1.6); key.target.position.set(0, 1.0, -1.0); G.add(key, key.target); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -4.5, right: 4.5, top: 3, bottom: -2, near: 0.5, far: 10 }); key.shadow.bias = -0.0003; key.shadow.normalBias = 0.01; L.key = key;
  const fill = new THREE.PointLight(0xd8e6ff, 9, 7, 1.6); fill.position.set(-1.0, 2.2, 1.4); G.add(fill); L.fill = fill;
  L.spot = new THREE.PointLight(0xfff0dc, 1.2, 2.5, 1.8); G.add(L.spot);
  L.tech = buildWorker({ vest: 0xeef0f2, shirt: 0xe3e7ea, pants: 0x2a3142, glove: 0x3d6fd1, boot: 0x2c2622, helmet: false, stripes: false, stance: 0 }); G.add(L.tech);
  return L;
}

// ---------------- kijelzők ----------------
export function drawScale(S, m, dec = 1) { const g = S.g; g.fillStyle = '#0d1f14'; g.fillRect(0, 0, 256, 64); g.fillStyle = '#9fe36a'; g.font = '700 44px Arial'; g.textAlign = 'right'; g.fillText(m ? m.toFixed(dec).replace('.', ',') : (0).toFixed(dec).replace('.', ','), 200, 50); g.font = '700 26px Arial'; g.fillText('g', 240, 50); S.t.needsUpdate = true; }
export function drawOven(S, T) { const g = S.g; g.fillStyle = '#1a0d0d'; g.fillRect(0, 0, 128, 40); g.fillStyle = '#ff6a4a'; g.font = '700 28px Arial'; g.textAlign = 'center'; g.fillText(T + ' °C', 64, 30); S.t.needsUpdate = true; }
// számítógép-képernyő: cím + rajzoló függvény (frissítés 8/s)
export function drawPC(S, t, title, draw) { const fr = Math.floor(t * 8); if (S._fr === fr) return; S._fr = fr;
  const g = S.g; g.fillStyle = '#10161d'; g.fillRect(0, 0, 1024, 600); g.fillStyle = '#1b2530'; g.fillRect(0, 0, 1024, 56); g.fillStyle = '#d8e2ea'; g.font = '700 30px Arial'; g.textAlign = 'left'; g.fillText(title, 24, 38);
  if (draw) draw(g); S.t.needsUpdate = true; }

// ---------------- laboráns ----------------
export function reachW(w, pts, extra = {}) { w.updateWorldMatrix(true, false); const r = { ...extra }; for (const k of ['L', 'R']) if (pts[k]) { const p = pts[k]; r[k] = { palm: p.palm, contact: p.contact, axis: p.axis, axisPt: p.axisPt, radius: p.radius, gap: p.gap, ftilt: p.ftilt, local: w.worldToLocal(p.p.clone()), fdir: p.fdir, ldir: p.ldir, curl: p.curl, w: p.w, pole: p.pole ?? POLE[k] }; } w.userData.reach = r; }
export const Wp = (L, x, y, z) => L.G.localToWorld(V(x, y, z));     // labor-helyi → világ
export function techAt(L, x, z = TZ, ry = Math.PI) { const w = L.tech; w.position.set(x, 0, z); w.rotation.y = ry; w.updateWorldMatrix(true, false); L.G.updateMatrixWorld(true); return w; }
// tenyér egy vízszintes felületen (pl. asztal, készülék teteje); F az ujjak iránya
export function rest(side, p, F = V(0, 0, -1), o = {}) { const g = palmOn(p, V(0, 1, 0), F.clone().normalize(), side, { curl: o.curl ?? 0.3, gap: o.gap ?? 0.022 }); g.pole = side === 'L' ? V(0.9, -0.5, -0.3) : V(-0.9, -0.5, -0.3); return g; }
// függőleges hengeres tárgy (pohár, tégely, kúp-nyél) oldalról fogva
export function holdV(side, c, r, o = {}) { const from = o.from ?? (side === 'L' ? V(0.35, -0.25, -1) : V(-0.35, -0.25, -1)); const g = gripCylinder(c, V(0, 1, 0), r, from.normalize(), side, { curl: o.curl, palmOff: o.palmOff ?? 0.012 }); g.pole = side === 'L' ? V(0.9, -0.5, -0.25) : V(-0.9, -0.5, -0.25); return g; }
// két kézzel két oldalról (nagy henger / doboz)
export function holdBoth(c, r, o = {}) { const gL = gripCylinder(c.clone().add(V(-r, 0, 0)), V(0, 1, 0), 0.006, V(1, 0, 0.12).normalize(), 'L', { curl: o.curl ?? 0.55, palmOff: 0.012 }); gL.pole = V(0.9, -0.5, -0.15);
  const gR = gripCylinder(c.clone().add(V(r, 0, 0)), V(0, 1, 0), 0.006, V(-1, 0, 0.12).normalize(), 'R', { curl: o.curl ?? 0.55, palmOff: 0.012 }); gR.pole = V(-0.9, -0.5, -0.15);
  gL.contact = c.clone().add(V(-r, 0, 0)); gR.contact = c.clone().add(V(r, 0, 0)); gL.axisPt = c.clone(); gR.axisPt = c.clone(); gL.radius = gR.radius = r; return { L: gL, R: gR }; }
// alapállás a számítógépnél
export function poseAtPC(L) { const w = techAt(L, 2.8); const pc = L.pc.g; pc.updateMatrixWorld(true);
  const kL = palmOn(pc.localToWorld(V(-0.07, 0.03, 0.24)), V(0, 1, 0), V(0.2, 0, -1).normalize(), 'L', { curl: 0.35, gap: 0.03 }); kL.pole = V(0.9, -0.5, -0.3);
  const mR = palmOn(pc.localToWorld(V(0.32, 0.036, 0.255)), V(0, 1, 0), V(0, 0, -1), 'R', { curl: 0.45, gap: 0.014 }); mR.pole = V(-0.9, -0.5, -0.3);
  reachW(w, { L: kL, R: mR }, { look: 0.3, lean: 0.06 }); }
// lerakás-pálya: felemel – átvisz – leenged (k: 0…1)
export function carryPath(a, b, k, hgt = 0.12) { const u = smooth(clamp(k / 0.3)), w = smooth(clamp((k - 0.25) / 0.5)), d = smooth(clamp((k - 0.7) / 0.3)); return V(lerp(a.x, b.x, w), a.y + hgt * u - (a.y + hgt - b.y) * d, lerp(a.z, b.z, w)); }
