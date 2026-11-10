// Geofizika – műszer-modellek és világkoordinátás 2D rajzolás (hullámfrontok, erővonalak)
import * as THREE from 'three';
import { M, box, cyl, rod, setRod, buildWorker } from './parts.js';
import { shadowAll } from './models.js';
import { clamp, lerp, smooth } from './util.js';
import { C, FH } from './overlay.js';
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---- EMI: kézben tartott rúd adó- és vevőtekerccsel (x tengely mentén) ----
export function buildEMI(span = 2.0) {
  const g = new THREE.Group(); const w = buildWorker({ vest: 0x1f8f8a }); g.add(w);
  const boom = new THREE.Group(); boom.position.set(0, 0.85, 0.42); g.add(boom);
  boom.add(cyl(0.035, 0.035, span, M(0xe9e4d8, { roughness: 0.5 }), 0, 0, 0, 12).rotateZ(Math.PI / 2));
  const tx = cyl(0.09, 0.09, 0.14, M(0xd8561e), -span / 2, 0, 0, 20); tx.rotation.z = Math.PI / 2; boom.add(tx);
  const rx = cyl(0.09, 0.09, 0.14, M(0x2f6fb5), span / 2, 0, 0, 20); rx.rotation.z = Math.PI / 2; boom.add(rx);
  boom.add(box(0.22, 0.14, 0.12, M(0x2b2f36), 0.1, 0.1, 0)); boom.add(box(0.06, 0.32, 0.04, M(0x2b2f36), 0, -0.12, -0.25));
  w.userData.reach = { L: { obj: boom, local: V(0.17, 0.0, 0.0) }, R: { obj: boom, local: V(-0.17, 0.0, 0.0) }, look: 0.25 };
  shadowAll(g); g.userData = { boom, tx, rx, span, worker: w }; return g;
}
// ---- GPR: kocsi antennadobozzal ----
export function buildGPR() {
  const g = new THREE.Group();
  g.add(box(0.7, 0.18, 0.5, M(0xe8731e, { roughness: 0.45 }), 0, 0.14, 0));
  for (const x of [-0.42, 0.42]) for (const z of [-0.3, 0.3]) { const wh = cyl(0.1, 0.1, 0.05, M(0x1b1d20), x, 0.1, z, 16); wh.rotation.x = Math.PI / 2; g.add(wh); }
  const h = rod(V(-0.3, 0.25, 0), V(-1.1, 1.0, 0), 0.02, M(0x2b2f36), 8); g.add(h); g.add(box(0.05, 0.05, 0.5, M(0x2b2f36), -1.1, 1.0, 0));
  const scr = box(0.3, 0.22, 0.04, new THREE.MeshStandardMaterial({ color: 0x0b1a26, emissive: 0x1d6f9a, emissiveIntensity: 0.6 }), -0.85, 0.92, 0); scr.rotation.z = 0.7; g.add(scr);
  shadowAll(g); return g;
}
// ---- ERT: elektródasor kábellel ----
export function buildERT(n = 24, dx = 1.0, x0 = -11.5) {
  const g = new THREE.Group(); const el = [];
  for (let i = 0; i < n; i++) { const e = new THREE.Group(); e.add(cyl(0.012, 0.012, 0.55, M(0xb9c0c6, { metalness: 0.8 }), 0, 0.0, 0, 8)); e.add(box(0.06, 0.05, 0.06, M(0x2b2f36), 0, 0.27, 0)); e.position.set(x0 + i * dx, 0, 0.15); g.add(e); el.push(e); }
  const cab = rod(V(x0, 0.3, 0.15), V(x0 + (n - 1) * dx, 0.3, 0.15), 0.012, M(0xf2b300), 6); g.add(cab);
  const meter = new THREE.Group(); meter.add(box(0.5, 0.3, 0.35, M(0xf2c12e, { roughness: 0.45 }), 0, 0.15, 0)); meter.add(box(0.4, 0.04, 0.3, M(0x2b2f36), 0, 0.31, 0)); meter.position.set(x0 + (n - 1) * dx / 2, 0, 1.2); g.add(meter);
  shadowAll(g); g.userData = { el, cab, meter, x0, dx, n }; return g;
}
// ---- magnetométer: kezelő bottal ----
export function buildMag() {
  const g = new THREE.Group(); const w = buildWorker({ vest: 0xc8452b }); g.add(w);
  const staff = new THREE.Group(); staff.position.set(0.32, 0.9, 0.2); g.add(staff);
  staff.add(cyl(0.015, 0.015, 1.6, M(0xe9e4d8), 0, 0.3, 0, 8)); const sen = cyl(0.045, 0.045, 0.22, M(0xe8731e), 0, 1.15, 0, 16); staff.add(sen); const sen2 = cyl(0.045, 0.045, 0.22, M(0xe8731e), 0, -0.45, 0, 16); staff.add(sen2);
  g.add(box(0.26, 0.16, 0.08, M(0x2b2f36), 0, 1.0, 0.25));
  w.userData.reach = { L: { obj: staff, local: V(0, 0.02, 0) }, R: { obj: g, local: V(-0.06, 0.98, 0.25) }, look: 0.3 };
  shadowAll(g); g.userData = { staff, sen, sen2, worker: w }; return g;
}
// ---- szeizmika: geofonok, kábel, szeizmográf, kalapács + lap ----
export function buildSeis(n = 24, dx = 1.0, x0 = -2) {
  const g = new THREE.Group(); const gp = [];
  for (let i = 0; i < n; i++) { const p = new THREE.Group(); p.add(cyl(0.035, 0.03, 0.06, M(0x2f6fb5), 0, 0.03, 0, 10)); p.add(cyl(0.008, 0.002, 0.1, M(0x9aa3ab, { metalness: 0.7 }), 0, -0.05, 0, 6)); p.position.set(x0 + i * dx, 0, 0.15); g.add(p); gp.push(p); }
  g.add(rod(V(x0, 0.07, 0.2), V(x0 + (n - 1) * dx, 0.07, 0.2), 0.01, M(0xf2b300), 6));
  const seis = new THREE.Group(); seis.add(box(0.45, 0.25, 0.35, M(0x2b2f36), 0, 0.12, 0)); const lap = box(0.4, 0.02, 0.28, M(0x6b7178), 0, 0.27, 0); seis.add(lap);
  const scr = box(0.38, 0.24, 0.02, new THREE.MeshStandardMaterial({ color: 0x0b1a26, emissive: 0x1d6f9a, emissiveIntensity: 0.7 }), 0, 0.4, -0.12); scr.rotation.x = -0.3; seis.add(scr); seis.position.set(x0 - 1.5, 0, 1.4); g.add(seis);
  const plate = box(0.3, 0.03, 0.3, M(0x3b4047, { metalness: 0.5 }), 0, 0.015, 0); g.add(plate);
  const hm = buildWorker({ vest: 0xff7a00 }); g.add(hm);
  const hammer = new THREE.Group(); hammer.add(cyl(0.015, 0.015, 0.9, M(0x8a6a44), 0, 0.45, 0, 8)); hammer.add(box(0.16, 0.08, 0.08, M(0x2b2f36, { metalness: 0.5 }), 0, 0.9, 0)); g.add(hammer);
  hm.userData.reach = { R: { obj: hammer, local: V(0, 0.02, 0) }, L: { obj: hammer, local: V(0, 0.16, 0) }, look: 0.35 };
  shadowAll(g); g.userData = { gp, seis, plate, hm, hammer, x0, dx, n }; return g;
}

// ---- világkoordinátás vonalrajz a 2D rétegen ----
export function wpath(O, proj, pts, { color = C.accent, width = 3, alpha = 1, glow = 10, dash = null, close = false, off = 0 } = {}) {
  if (alpha <= 0 || pts.length < 2) return; const g = O.g; g.save(); g.globalAlpha = alpha; g.strokeStyle = color; g.lineWidth = width; g.lineJoin = 'round'; g.lineCap = 'round';
  if (glow) { g.shadowColor = color; g.shadowBlur = glow; } if (dash) { g.setLineDash(dash); g.lineDashOffset = off; }
  g.beginPath(); let started = false;
  for (const [x, y, z] of pts) { const p = proj(x, y, z ?? 0.05); if (!p.ok) { started = false; continue; } if (!started) { g.moveTo(p.x, p.y); started = true; } else g.lineTo(p.x, p.y); }
  if (close) g.closePath(); g.stroke(); g.restore();
}
// körív a metszetben (a0..a1 radiánban, 0 = +x, π/2 = +y)
export function warc(cx, cy, r, a0, a1, n = 48, z = 0.05) { const pts = []; for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n); pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, z]); } return pts; }
// pont (kör) a metszetben
export function wdot(O, proj, x, y, r, color, alpha = 1, z = 0.05) { if (alpha <= 0) return; const p = proj(x, y, z); if (!p.ok) return; const g = O.g; g.save(); g.globalAlpha = alpha; g.fillStyle = color; g.shadowColor = color; g.shadowBlur = 12; g.beginPath(); g.arc(p.x, p.y, r, 0, 7); g.fill(); g.restore(); }
