// Általános vezetőoszlopos alapgép (a Franki-gépből): lánctalpas alapgép, rácsos vezetőoszlop, skip, kötél
import * as THREE from 'three';
import { M, box, cyl, cylX, cylZ, rod, setRod } from './parts.js';
const V = (x, y, z) => new THREE.Vector3(x, y, z);
// ---------- vezetőoszlop (rácsos) ----------
function latticeColumn(H, w, chordMat, braceMat) {
  const g = new THREE.Group();
  const h2 = w / 2;
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) g.add(box(0.11, H, 0.11, chordMat, sx * h2, H / 2, sz * h2));
  const step = 0.9;
  for (let y = 0.4; y < H - 0.4; y += step) {
    for (const [a, b] of [[[-h2, -h2], [h2, -h2]], [[h2, -h2], [h2, h2]], [[h2, h2], [-h2, h2]], [[-h2, h2], [-h2, -h2]]]) {
      g.add(rod(V(a[0], y, a[1]), V(b[0], y + step, b[1]), 0.028, braceMat, 5));
      g.add(rod(V(a[0], y, a[1]), V(b[0], y, b[1]), 0.022, braceMat, 5));
    }
  }
  return g;
}

export function buildLeaderRig(o = {}) {
  const LEADER = { z: o.leaderZ ?? -0.68, w: 0.72, H: o.H ?? 21.5 }; const G = { tubeR: o.tubeR ?? 0.3 };
  const body = M(o.body ?? 0xc8452b, { roughness: 0.55 }), body2 = M(o.body2 ?? 0xd8563a, { roughness: 0.5 });
  const yellow = M(o.leader ?? 0xf2b300, { roughness: 0.45, metalness: 0.15 });
  const dark = M(0x23262b, { roughness: 0.75 }), steel = M(0x9aa3ad, { metalness: 0.6, roughness: 0.35 });
  const glass = M(0x9fd2ff, { roughness: 0.08, metalness: 0.3, transparent: true, opacity: 0.55 });
  const rig = new THREE.Group();
  // --- lánctalpas alapgép (a +z felé néz, a vezetőoszlop elöl) ---
  const base = new THREE.Group(); base.position.set(0, 0, -7.2); rig.add(base);
  for (const sx of [-1, 1]) {
    const x = sx * 1.85;
    base.add(box(0.95, 1.15, 6.4, M(0x1b1d20, { roughness: 0.9 }), x, 0.6, 0));
    base.add(cylX(0.55, 0.98, dark, x, 0.58, 2.95, 20)); base.add(cylX(0.55, 0.98, dark, x, 0.58, -2.95, 20));
    for (let i = -2; i <= 2; i++) base.add(cylX(0.2, 1.0, M(0x3a3f47), x, 0.24, i * 1.15, 12));
    for (let i = -13; i <= 13; i++) base.add(box(1.0, 0.07, 0.15, M(0x2c3035), x, 0.02, i * 0.23));
  }
  base.add(box(2.9, 0.55, 3.2, dark, 0, 1.15, 0));
  const house = new THREE.Group(); house.position.y = 1.45; base.add(house);
  house.add(cyl(1.55, 1.55, 0.3, steel, 0, 0.15, 0, 32));
  house.add(box(3.3, 0.35, 6.2, body, 0, 0.48, -0.6));
  house.add(box(3.1, 1.9, 3.4, body2, 0, 1.6, -1.6));
  house.add(box(3.15, 0.2, 3.45, dark, 0, 2.6, -1.6));
  house.add(box(3.3, 1.6, 1.5, dark, 0, 1.45, -3.9)); // ellensúly
  house.add(box(3.35, 0.25, 1.55, yellow, 0, 2.3, -3.9));
  for (let i = 0; i < 6; i++) house.add(box(0.05, 0.8, 1.5, M(0x15171a), 1.56, 1.6, -2.6 + i * 0.32).rotateY(0));
  // csörlődobok (kos, húzókötelek, segédkötél)
  for (const [x, r] of [[-0.7, 0.42], [0.05, 0.42], [0.8, 0.34]]) { house.add(cylX(r, 0.6, steel, x, 2.95, -0.2, 22)); house.add(cylX(r + 0.08, 0.06, dark, x - 0.3, 2.95, -0.2, 22)); house.add(cylX(r + 0.08, 0.06, dark, x + 0.3, 2.95, -0.2, 22)); }
  house.add(box(2.4, 0.3, 0.9, dark, 0, 2.55, -0.2));
  // fülke
  const cab = new THREE.Group(); cab.position.set(-1.05, 0.65, 1.55); house.add(cab);
  cab.add(box(1.25, 0.45, 1.8, body2, 0, 0.22, 0)); cab.add(box(1.22, 1.55, 1.75, glass, 0, 1.22, 0)); cab.add(box(1.3, 0.14, 1.85, body2, 0, 2.05, 0));
  for (const p of [[-0.6, 1.22, 0.86], [0.6, 1.22, 0.86], [-0.6, 1.22, -0.86], [0.6, 1.22, -0.86]]) cab.add(box(0.07, 1.55, 0.07, dark, ...p));
  cab.add(box(0.05, 0.4, 0.05, M(0xffa000, { emissive: 0xff8800, emissiveIntensity: 1.2 }), 0.3, 2.3, -0.4)); // villogó
  // --- vezetőoszlop ---
  const leader = new THREE.Group(); leader.position.set(0, 0, LEADER.z); rig.add(leader);
  leader.add(latticeColumn(LEADER.H, LEADER.w, yellow, yellow));
  leader.add(box(1.5, 0.35, 1.3, dark, 0, 0.18, -0.15)); // talplemez
  // oszlopfej csigákkal
  const head = new THREE.Group(); head.position.set(0, LEADER.H, 0); leader.add(head);
  head.add(box(1.5, 0.5, 1.6, yellow, 0, 0.25, 0.25));
  head.add(box(1.6, 0.12, 1.7, dark, 0, 0.55, 0.25));
  head.add(cylX(0.36, 0.25, steel, 0, 0.55, -LEADER.z, 24)); // koscsiga a cső tengelye fölött
  head.add(cylX(0.26, 0.18, steel, -0.48, 0.35, -LEADER.z, 20)); head.add(cylX(0.26, 0.18, steel, 0.48, 0.35, -LEADER.z, 20));
  head.add(box(0.4, 0.4, 0.4, yellow, 0.95, 0.6, 0.93)); head.add(cylX(0.22, 0.16, steel, 0.95, 0.75, 0.93, 18));
  // csőmegvezetés a talp közelében (állandó) – nyitott kengyel
  const guide = new THREE.Group(); guide.position.set(0, 0.9, -LEADER.z); leader.add(guide);
  guide.add(new THREE.Mesh(new THREE.TorusGeometry(G.tubeR + 0.07, 0.05, 8, 32, Math.PI * 1.25).rotateX(Math.PI / 2).rotateY(Math.PI * 0.375 + Math.PI), yellow));
  guide.add(box(0.12, 0.12, 0.42, yellow, -0.3, 0, -0.42)); guide.add(box(0.12, 0.12, 0.42, yellow, 0.3, 0, -0.42));
  // merevítő karok és hátsó kitámasztás az alapgéptől
  const legs = new THREE.Group(); rig.add(legs);
  for (const sx of [-1, 1]) {
    legs.add(rod(V(sx * 1.2, 2.2, -5.2), V(sx * 0.32, 2.4, LEADER.z - 0.3), 0.13, body, 10));
    legs.add(rod(V(sx * 1.1, 4.1, -9.3), V(sx * 0.3, 15.5, LEADER.z - 0.3), 0.12, yellow, 10));
    legs.add(rod(V(sx * 1.1, 4.1, -9.3), V(sx * 0.3, 15.5, LEADER.z - 0.3), 0.07, steel, 8).translateX(0));
  }
  legs.add(rod(V(0, 3.0, -5.6), V(0, 6.5, LEADER.z - 0.32), 0.09, steel, 8)); // hidraulikus henger
  // kötelek visszafutása a csörlőkhöz (statikus)
  const ropeM = M(0x1c1d1f, { roughness: 0.6, metalness: 0.3 });
  rig.add(rod(V(0, LEADER.H + 0.55, LEADER.z - 0.35), V(-0.7, 4.4, -7.4), 0.025, ropeM, 5));
  rig.add(rod(V(-0.45, LEADER.H + 0.35, LEADER.z - 0.35), V(0.05, 4.4, -7.4), 0.022, ropeM, 5));
  rig.add(rod(V(0.45, LEADER.H + 0.35, LEADER.z - 0.35), V(0.05, 4.4, -7.4), 0.022, ropeM, 5));
  rig.add(rod(V(0.95, LEADER.H + 0.75, LEADER.z), V(0.8, 4.35, -7.4), 0.02, ropeM, 5));
  rig.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  rig.userData = { base, leader, head, ropeM, LEADER, guide };
  return rig;
}

// ---------- skip (betonadagoló puttony) a vezetőoszlop jobb oldalán ----------
export function buildSkip(LEADER = { z: -0.68 }) {
  const g = new THREE.Group();
  const yel = M(0xf2b300), dark = M(0x2b2e33), steel = M(0x9aa3ad, { metalness: 0.5 });
  const carriage = new THREE.Group(); g.add(carriage);
  carriage.add(box(0.2, 1.1, 0.5, dark, 0.48, 0.2, LEADER.z));
  const pivot = new THREE.Group(); pivot.position.set(0.32, 0.55, -0.12); carriage.add(pivot);
  const bucket = new THREE.Group(); pivot.add(bucket);
  // puttony: nyitott doboz (a pivot a belső felső élén)
  const bw = 0.75, bh = 0.6, bd = 0.7, th = 0.04;
  bucket.add(box(bw, th, bd, yel, bw / 2, -bh, 0));
  bucket.add(box(th, bh, bd, yel, 0.0, -bh / 2, 0)); bucket.add(box(th, bh, bd, yel, bw, -bh / 2, 0));
  bucket.add(box(bw, bh, th, yel, bw / 2, -bh / 2, bd / 2)); bucket.add(box(bw, bh, th, yel, bw / 2, -bh / 2, -bd / 2));
  // kiöntőcsőr a cső felé (-x)
  bucket.add(box(0.36, th, 0.42, steel, -0.16, -0.02, 0).rotateZ(-0.25));
  const fill = box(bw - 0.08, bh * 0.75, bd - 0.08, M(0x8a8478, { roughness: 1 }), bw / 2, -bh * 0.6, 0, false); bucket.add(fill);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; } });
  g.userData = { carriage, pivot, bucket, fill };
  return g;
}

// kötél (egyszerű henger két pont között)
export function makeRope(r = 0.022) { const m = rod(V(0, 0, 0), V(0, 1, 0), r, M(0x1c1d1f, { roughness: 0.6, metalness: 0.3 }), 6); m.castShadow = true; return m; }

