// További gépek és tárgyak: családi ház, billenőplatós teherautó, árokhenger, siló, kis fúrógép, ejtősúly, mélyvibrátor
import * as THREE from 'three';
import { M, box, cyl, cylX, cylZ, rod, setRod } from './parts.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
function shadowAll(g) { g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); return g; }

// repedés-textúra (átlátszó)
export function crackTexture(seed = 3) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 512; const g = c.getContext('2d');
  let s = seed; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  g.strokeStyle = 'rgba(20,14,10,0.95)'; g.lineCap = 'round';
  const branch = (x, y, a, len, w) => { if (len < 8 || w < 0.6) return; g.lineWidth = w; g.beginPath(); g.moveTo(x, y); let cx = x, cy = y; for (let k = 0; k < 6; k++) { cx += Math.cos(a + (r() - 0.5) * 0.8) * len / 6; cy += Math.sin(a + (r() - 0.5) * 0.8) * len / 6; g.lineTo(cx, cy); } g.stroke(); if (r() < 0.6) branch(cx, cy, a + (r() - 0.5) * 1.2, len * 0.6, w * 0.6); branch(cx, cy, a + (r() - 0.5) * 0.5, len * 0.7, w * 0.75); };
  branch(256, 500, -Math.PI / 2 - 0.35, 260, 6);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// egyszerű földszintes ház (x: x0..x1, z: z0..z1), elülső oromfal z1-nél
export function buildHouse(T, { x0 = -6, x1 = 0.2, z0 = -10, z1 = 0, h = 2.9 } = {}) {
  const g = new THREE.Group();
  const wallM = new THREE.MeshStandardMaterial({ map: T.plaster, color: 0xf0e2c4, roughness: 0.92 });
  const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const body = box(w, h, d, wallM, cx, h / 2, cz); g.add(body);
  // nyeregtető (a gerinc z irányú)
  const roofM = new THREE.MeshStandardMaterial({ map: T.roof, roughness: 0.8, color: 0xd07a52 });
  const rh = 2.2, over = 0.45;
  const shape = new THREE.Shape(); shape.moveTo(-w / 2 - over, 0); shape.lineTo(w / 2 + over, 0); shape.lineTo(0, rh); shape.lineTo(-w / 2 - over, 0);
  const roofG = new THREE.ExtrudeGeometry(shape, { depth: d + 2 * over, bevelEnabled: false }); roofG.translate(0, 0, -(d + 2 * over) / 2);
  const roof = new THREE.Mesh(roofG, roofM); roof.position.set(cx, h, cz); g.add(roof);
  // oromfal (háromszög) elöl
  const gable = new THREE.Shape(); gable.moveTo(-w / 2, 0); gable.lineTo(w / 2, 0); gable.lineTo(0, rh * 0.93); gable.lineTo(-w / 2, 0);
  const gm = new THREE.Mesh(new THREE.ShapeGeometry(gable), wallM); gm.position.set(cx, h, z1 + 0.001); g.add(gm);
  // ablakok, ajtó elöl
  const glass = M(0x2b3a48, { roughness: 0.1, metalness: 0.3 }), frame = M(0xffffff);
  for (const wx of [x0 + 1.4, x1 - 1.6]) { g.add(box(1.25, 1.3, 0.06, frame, wx, 1.55, z1 + 0.02, false)); g.add(box(1.1, 1.15, 0.07, glass, wx, 1.55, z1 + 0.03, false)); }
  g.add(box(1.0, 2.1, 0.06, M(0x6b4a2c), cx, 1.05, z1 + 0.02, false));
  // repedések (később láthatóvá válnak)
  const crackMat = new THREE.MeshBasicMaterial({ map: crackTexture(7), transparent: true, opacity: 0, depthWrite: false });
  const c1 = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), crackMat); c1.position.set(x1 - 0.95, 2.05, z1 + 0.035); c1.rotation.z = 0.15; g.add(c1);
  const c2 = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.3), crackMat); c2.position.set(x1 - 2.4, 0.8, z1 + 0.035); c2.rotation.z = -0.3; g.add(c2);
  shadowAll(g);
  [c1, c2].forEach(c => { c.castShadow = false; c.receiveShadow = false; });
  g.userData = { crackMat, body };
  return g;
}

// billenőplatós teherautó (+x irányba néz)
export function buildDumpTruck() {
  const g = new THREE.Group();
  const cabM = M(0xe8a51c, { roughness: 0.5 }), dark = M(0x23262b), steel = M(0x8d949b, { metalness: 0.5, roughness: 0.4 }), glass = M(0x9fd2ff, { roughness: 0.1, transparent: true, opacity: 0.6 });
  g.add(box(7.6, 0.45, 1.9, dark, 0, 0.95, 0));
  for (const x of [2.7, -1.4, -2.7]) for (const z of [1.0, -1.0]) { g.add(cylZ(0.55, 0.42, dark, x, 0.55, z, 18)); g.add(cylZ(0.25, 0.44, steel, x, 0.55, z, 12)); }
  g.add(box(1.9, 1.5, 2.3, cabM, 3.0, 1.95, 0)); g.add(box(1.0, 0.9, 2.2, glass, 3.45, 2.3, 0)); g.add(box(0.15, 0.4, 2.3, M(0x111111), 3.98, 1.35, 0));
  const pivot = new THREE.Group(); pivot.position.set(-3.6, 1.25, 0); g.add(pivot);
  const bed = new THREE.Group(); pivot.add(bed);
  const bm = M(0xc9481f, { roughness: 0.55 });
  bed.add(box(5.4, 0.12, 2.3, bm, 2.7, 0.06, 0)); bed.add(box(5.4, 1.1, 0.1, bm, 2.7, 0.6, 1.1)); bed.add(box(5.4, 1.1, 0.1, bm, 2.7, 0.6, -1.1)); bed.add(box(0.12, 1.3, 2.3, bm, 5.35, 0.7, 0));
  const tail = new THREE.Group(); tail.position.set(0.02, 1.1, 0); bed.add(tail); tail.add(box(0.1, 1.1, 2.25, bm, 0, -0.55, 0));
  const load = new THREE.Mesh(new THREE.ConeGeometry(1.4, 0.9, 6, 1).scale(1.8, 1, 0.75), M(0x8e8a82, { roughness: 1 })); load.position.set(2.7, 0.55, 0); bed.add(load);
  shadowAll(g);
  g.userData = { pivot, bed, tail, load, loadMat: load.material };
  return g;
}

// árokhenger (tandem vibrohenger, 0,8 m széles) – +z irányba halad
export function buildRoller() {
  const g = new THREE.Group();
  const y = M(0xf2b300, { roughness: 0.45 }), dark = M(0x2b2e33), steel = M(0x9aa3ad, { metalness: 0.6, roughness: 0.3 });
  for (const z of [-0.7, 0.7]) { g.add(cylX(0.36, 0.8, steel, 0, 0.36, z, 28)); g.add(box(0.95, 0.5, 0.5, y, 0, 0.72, z)); }
  g.add(box(0.85, 0.5, 1.2, y, 0, 0.95, 0)); g.add(box(0.7, 0.35, 0.5, dark, 0, 1.38, -0.15));
  g.add(cyl(0.03, 0.03, 0.9, dark, -0.3, 1.6, 0.25, 6)); g.add(cyl(0.03, 0.03, 0.9, dark, 0.3, 1.6, 0.25, 6)); g.add(box(0.7, 0.05, 0.05, dark, 0, 2.05, 0.25));
  g.add(box(0.12, 0.12, 0.12, M(0xff8a00, { emissive: 0xff6a00, emissiveIntensity: 1.4 }), 0, 2.12, 0.25));
  shadowAll(g); return g;
}

// mobil siló (kötőanyag)
export function buildSilo(color = 0xdfe3e6) {
  const g = new THREE.Group(); const m = M(color, { roughness: 0.5, metalness: 0.2 }), dark = M(0x2b2e33);
  g.add(cyl(1.3, 1.3, 6.5, m, 0, 5.2, 0, 28)); g.add(cyl(0.25, 1.3, 1.6, m, 0, 1.15, 0, 28)); g.add(cyl(1.32, 1.32, 0.15, M(0xc8452b), 0, 7.0, 0, 28));
  for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) g.add(rod(V(x * 1.0, 0, z * 1.0), V(x * 0.9, 2.2, z * 0.9), 0.07, dark));
  g.add(box(0.5, 0.4, 0.5, dark, 0, 0.3, 0)); g.add(rod(V(0.6, 8.4, 0), V(0.6, 0.4, 0.8), 0.04, dark));
  return shadowAll(g);
}

// ejtősúly (dinamikus tömörítés, 15–40 t) – lapos acéltömb
export function buildPounder(r = 1.1, h = 1.2) {
  const g = new THREE.Group(); const m = M(0x4b4f55, { metalness: 0.6, roughness: 0.45 });
  g.add(cyl(r, r, h, m, 0, h / 2, 0, 8)); g.add(cyl(r * 1.01, r * 1.01, 0.12, M(0xf2b300), 0, h * 0.85, 0, 8));
  g.add(cyl(0.18, 0.25, 0.4, M(0x2b2e33), 0, h + 0.2, 0, 12));
  return shadowAll(g);
}

// mélyvibrátor (függő cső, 25–40 cm), hossza L, a csúcs y=0
export function buildVibroprobe(L = 14, r = 0.17) {
  const g = new THREE.Group(); const m = M(0x5b6068, { metalness: 0.6, roughness: 0.38 }), y = M(0xf2b300);
  g.add(cyl(r, r, L, m, 0, L / 2, 0, 24)); g.add(cyl(r * 0.9, r * 0.5, 0.5, m, 0, -0.2, 0, 24));
  for (let k = 1; k < L; k += 3) g.add(cyl(r * 1.04, r * 1.04, 0.12, y, 0, k, 0, 24));
  // fúvókák a csúcson
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; g.add(cyl(0.03, 0.03, 0.08, M(0x111111), Math.cos(a) * r, 0.25, Math.sin(a) * r, 6)); }
  return shadowAll(g);
}
export { shadowAll };
