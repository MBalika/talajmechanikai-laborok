// Részletes, tagolt gémes kotró (≈ 8–10 t-s midi), 1 egység = 1 m.
// Saját kinematika: a kanálél helyzetéből (f előre, h magasság) és szögéből (phi) számolja a gém, a szár és a kanál szögét,
// a hidraulikus hengerek a csuklópontok között nyúlnak/rövidülnek, a kanálmozgatás négycsuklós (H-link) mechanizmussal.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { M } from './parts.js';

const D2R = Math.PI / 180;
export const EXC = { L1: 3.0, L2: 1.65, LB: 0.78, P0: [0.85, 1.29], BOOMX: -0.2, TRACK: 2.9, GAUGE: 1.86, TAIL: 1.25 };

// alakzat (u, v) → helyi (z = u, y = v), kihúzás x mentén, középre igazítva
function extYZ(shape, depth, bevel = 0) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 14 });
  g.rotateY(-Math.PI / 2); g.translate(depth / 2, 0, 0); g.computeVertexNormals(); return g;
}
function mesh(geo, mat, cast = true) { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = true; return m; }
function bx(w, h, d, mat, x, y, z) { return mesh(new THREE.BoxGeometry(w, h, d), mat).translateX(x).translateY(y).translateZ(z); }
function cylAlongX(r, len, mat, x, y, z, seg = 20) { const m = mesh(new THREE.CylinderGeometry(r, r, len, seg).rotateZ(Math.PI / 2), mat); m.position.set(x, y, z); return m; }
// lekerekített téglalap (stadion) alakzat
function stadium(len, h, inset = 0) {
  const r = h / 2 - inset, a = len / 2 - h / 2, s = new THREE.Shape();
  s.moveTo(-a, -r); s.lineTo(a, -r); s.absarc(a, 0, r, -Math.PI / 2, Math.PI / 2, false); s.lineTo(-a, r); s.absarc(-a, 0, r, Math.PI / 2, Math.PI * 1.5, false); return s;
}
// hidraulikus henger: festett cső + krómozott dugattyúrúd
function hydraulic(parent, rB, rR, barrelLen, mats) {
  const barrel = mesh(new THREE.CylinderGeometry(rB, rB, 1, 16), mats.barrel), rod = mesh(new THREE.CylinderGeometry(rR, rR, 1, 12), mats.chrome);
  const capA = mesh(new THREE.SphereGeometry(rB * 1.05, 12, 8), mats.barrel), capB = mesh(new THREE.SphereGeometry(rR * 1.6, 10, 6), mats.steel);
  parent.add(barrel, rod, capA, capB);
  const up = new THREE.Vector3(0, 1, 0), d = new THREE.Vector3(), q = new THREE.Quaternion();
  return {
    set(a, b) {
      d.subVectors(b, a); const L = Math.max(0.05, d.length()); d.multiplyScalar(1 / L); q.setFromUnitVectors(up, d);
      const lb = Math.min(barrelLen, L * 0.92), lr = Math.max(0.05, L - lb * 0.55);
      barrel.quaternion.copy(q); barrel.scale.set(1, lb, 1); barrel.position.copy(a).addScaledVector(d, lb / 2);
      rod.quaternion.copy(q); rod.scale.set(1, lr, 1); rod.position.copy(b).addScaledVector(d, -lr / 2);
      capA.position.copy(a); capB.position.copy(b);
    },
  };
}

export function buildExcavator2({ color = 0xf2b300 } = {}) {
  const mats = {
    paint: M(color, { roughness: 0.42, metalness: 0.12 }), paint2: M(0xd99a00, { roughness: 0.5, metalness: 0.1 }),
    dark: M(0x2a2d32, { roughness: 0.65, metalness: 0.25 }), rubber: M(0x17181b, { roughness: 0.95 }),
    steel: M(0x8d949b, { roughness: 0.38, metalness: 0.75 }), chrome: M(0xe2e7ec, { roughness: 0.16, metalness: 0.95 }),
    barrel: M(color, { roughness: 0.38, metalness: 0.2 }), glass: M(0x1d2b38, { roughness: 0.05, metalness: 0.6, transparent: true, opacity: 0.62 }),
    black: M(0x0e0f11, { roughness: 0.6 }), light: M(0xfff6d8, { emissive: 0xfff2c0, emissiveIntensity: 0.6 }), soil: M(0x9b7d55, { roughness: 1 }),
  };
  const g = new THREE.Group();
  // ---------------- alváz ----------------
  const lower = new THREE.Group(); g.add(lower);
  const TL = EXC.TRACK, TH = 0.7, TW = 0.46;
  for (const sx of [-1, 1]) {
    const x = sx * EXC.GAUGE / 2;
    // lánctalp-heveder (gyűrű) + talpbordák
    const ring = stadium(TL, TH); ring.holes.push(stadium(TL - 0.12, TH, 0.06));
    lower.add(mesh(extYZ(ring, TW), mats.rubber).translateX(x).translateY(TH / 2));
    const gs = []; const n = 34; const A = TL / 2 - TH / 2, Rr = TH / 2, per = 4 * A + 2 * Math.PI * Rr;
    for (let i = 0; i < n; i++) {
      let s0 = (i / n) * per, pz, py, nz, ny;
      if (s0 < 2 * A) { pz = -A + s0; py = -Rr; nz = 0; ny = -1; }
      else if ((s0 -= 2 * A) < Math.PI * Rr) { const t = -Math.PI / 2 + s0 / Rr; pz = A + Rr * Math.cos(t); py = Rr * Math.sin(t); nz = Math.cos(t); ny = Math.sin(t); }
      else if ((s0 -= Math.PI * Rr) < 2 * A) { pz = A - s0; py = Rr; nz = 0; ny = 1; }
      else { s0 -= 2 * A; const t = Math.PI / 2 + s0 / Rr; pz = -A + Rr * Math.cos(t); py = Rr * Math.sin(t); nz = Math.cos(t); ny = Math.sin(t); }
      const gb = new THREE.BoxGeometry(TW + 0.02, 0.05, 0.075); gb.rotateX(Math.atan2(nz, ny)); gb.translate(0, py + ny * 0.012, pz + nz * 0.012); gs.push(gb);
    }
    const gm = mesh(mergeGeometries(gs), mats.dark); gm.position.set(x, TH / 2, 0); lower.add(gm);
    // keret, lánckerék, feszítőkerék, görgők
    lower.add(bx(0.3, 0.3, TL - 0.75, mats.paint2, x, TH / 2, 0));
    const spr = cylAlongX(0.3, 0.34, mats.dark, x, TH / 2, -TL / 2 + TH / 2, 18); lower.add(spr);
    for (let k = 0; k < 9; k++) { const t = k / 9 * Math.PI * 2; lower.add(bx(0.36, 0.07, 0.07, mats.steel, x, TH / 2 + Math.sin(t) * 0.3, -TL / 2 + TH / 2 + Math.cos(t) * 0.3).rotateX(t)); }
    lower.add(cylAlongX(0.12, 0.38, mats.steel, x, TH / 2, -TL / 2 + TH / 2, 12));
    lower.add(cylAlongX(0.29, 0.32, mats.dark, x, TH / 2, TL / 2 - TH / 2, 18), cylAlongX(0.1, 0.36, mats.steel, x, TH / 2, TL / 2 - TH / 2, 12));
    for (let k = 0; k < 4; k++) lower.add(cylAlongX(0.085, 0.3, mats.steel, x, 0.13, -0.8 + k * 0.53, 12));
    lower.add(cylAlongX(0.06, 0.2, mats.steel, x, TH - 0.08, -0.35, 10), cylAlongX(0.06, 0.2, mats.steel, x, TH - 0.08, 0.45, 10));
  }
  lower.add(bx(EXC.GAUGE - TW, 0.32, 1.25, mats.paint2, 0, 0.55, 0));
  lower.add(mesh(new THREE.CylinderGeometry(0.62, 0.66, 0.14, 32), mats.dark).translateY(0.78));
  // tolólap (dózerlap) elöl
  { const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(0.06, 0); sh.quadraticCurveTo(-0.12, 0.22, 0.0, 0.46); sh.lineTo(-0.06, 0.46); sh.quadraticCurveTo(-0.2, 0.22, 0, 0);
    const blade = mesh(extYZ(sh, 2.25), mats.paint); blade.position.set(0, 0.04, TL / 2 + 0.38); lower.add(blade);
    for (const sx of [-0.55, 0.55]) lower.add(bx(0.14, 0.12, 0.6, mats.paint2, sx, 0.3, TL / 2 + 0.05).rotateX(0.22));
    lower.add(bx(2.25, 0.035, 0.05, mats.steel, 0, 0.05, TL / 2 + 0.41)); }

  // ---------------- forgó felsővázszerkezet ----------------
  const upper = new THREE.Group(); upper.position.y = 0.86; g.add(upper);
  { // alaplemez: elöl egyenes, hátul a farokív (R = TAIL)
    const R = EXC.TAIL, w = 1.12, z0 = -Math.sqrt(R * R - w * w); const p = [[-w, 1.05], [w, 1.05], [w, z0]];
    const a0 = Math.atan2(z0, w), a1 = Math.atan2(z0, -w) - 2 * Math.PI; for (let i = 1; i < 28; i++) { const t = a0 + (a1 - a0) * (i / 28); p.push([R * Math.cos(t), R * Math.sin(t)]); }
    p.push([-w, z0]);
    const s2 = new THREE.Shape(p.map(([x, z]) => new THREE.Vector2(x, -z)));
    const deck = new THREE.ExtrudeGeometry(s2, { depth: 0.3, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2 });
    deck.rotateX(-Math.PI / 2); upper.add(mesh(deck, mats.paint));
    // ellensúly (a farokív mentén, magasabb)
    const cw = []; for (let i = 0; i <= 24; i++) { const t = Math.PI * (1.08 + 0.84 * i / 24); cw.push([Math.cos(t) * 1.13, Math.sin(t) * R * 0.98]); }
    for (let i = 24; i >= 0; i--) { const t = Math.PI * (1.08 + 0.84 * i / 24); cw.push([Math.cos(t) * 0.8, Math.sin(t) * R * 0.66]); }
    const cs = new THREE.Shape(cw.map(([x, z]) => new THREE.Vector2(x, -z)));
    const cg = new THREE.ExtrudeGeometry(cs, { depth: 0.62, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 3 }); cg.rotateX(-Math.PI / 2); cg.translate(0, 0.3, 0);
    upper.add(mesh(cg, mats.paint));
    upper.add(bx(1.95, 0.05, 0.08, mats.black, 0, 0.65, -1.18)); // fekete csík az ellensúlyon
  }
  // motorház
  upper.add(bx(1.9, 0.55, 0.95, mats.paint, -0.05, 0.6, -0.55));
  upper.add(bx(1.0, 0.04, 0.5, mats.black, 0.3, 0.885, -0.6)); // szellőzőrács
  for (let k = 0; k < 6; k++) upper.add(bx(0.95, 0.012, 0.03, mats.dark, 0.3, 0.9, -0.8 + k * 0.08));
  upper.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 10), mats.black).translateX(-0.6).translateY(1.12).translateZ(-0.35)); // kipufogó
  upper.add(bx(0.7, 0.45, 0.75, mats.paint, -0.72, 0.55, 0.62)); // hidraulikatartály, szerszámláda
  upper.add(bx(0.02, 0.3, 0.5, mats.dark, -1.08, 0.55, 0.62));
  // kezelőfülke (bal oldalon: +x)
  const cab = new THREE.Group(); cab.position.set(0.55, 0.3, 0.3); upper.add(cab);
  const CW = 0.95, CH = 1.5, CL = 1.45;
  cab.add(bx(CW, 0.12, CL, mats.paint, 0, CH + 0.06, 0)); // tető
  for (const [px, pz] of [[-CW / 2 + 0.04, CL / 2 - 0.04], [CW / 2 - 0.04, CL / 2 - 0.04], [-CW / 2 + 0.04, -CL / 2 + 0.04], [CW / 2 - 0.04, -CL / 2 + 0.04], [CW / 2 - 0.04, 0.05]]) cab.add(bx(0.07, CH, 0.07, mats.dark, px, CH / 2, pz));
  cab.add(bx(CW - 0.08, CH - 0.15, 0.02, mats.glass, 0, CH / 2 + 0.05, CL / 2 - 0.04)); // szélvédő
  cab.add(bx(0.02, CH - 0.2, CL - 0.12, mats.glass, CW / 2 - 0.04, CH / 2 + 0.04, 0)); // bal oldali üveg (ajtó)
  cab.add(bx(0.02, CH - 0.5, CL - 0.12, mats.glass, -CW / 2 + 0.04, CH / 2 + 0.24, 0));
  cab.add(bx(CW - 0.1, 0.4, 0.04, mats.dark, 0, 0.2, CL / 2 - 0.04));
  cab.add(bx(CW - 0.08, CH, 0.05, mats.dark, 0, CH / 2, -CL / 2 + 0.03)); // hátfal
  cab.add(bx(0.03, 0.03, 0.22, mats.black, CW / 2 + 0.01, 0.9, 0.1)); // kilincs
  { const seat = new THREE.Group(); seat.add(bx(0.45, 0.12, 0.45, mats.black, 0, 0.45, -0.15), bx(0.45, 0.6, 0.1, mats.black, 0, 0.75, -0.38)); cab.add(seat);
    const op = new THREE.Group(); op.add(bx(0.36, 0.5, 0.25, M(0xff7a00), 0, 0.82, -0.2), mesh(new THREE.SphereGeometry(0.11, 12, 10), M(0xc99a7a)).translateY(1.18).translateZ(-0.18), mesh(new THREE.SphereGeometry(0.125, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), M(0xf2f2f2)).translateY(1.21).translateZ(-0.18)); cab.add(op); }
  // kapaszkodó, tükör, munkalámpa
  upper.add(bx(0.03, 0.03, 0.9, mats.dark, -1.05, 0.95, -0.4)); upper.add(bx(0.03, 0.15, 0.03, mats.dark, -1.05, 0.88, -0.05), bx(0.03, 0.15, 0.03, mats.dark, -1.05, 0.88, -0.8));
  cab.add(bx(0.02, 0.18, 0.12, mats.black, CW / 2 + 0.2, 1.25, CL / 2 - 0.05)); cab.add(bx(0.2, 0.02, 0.02, mats.dark, CW / 2 + 0.1, 1.2, CL / 2 - 0.05));
  cab.add(bx(0.12, 0.08, 0.06, mats.light, 0, CH + 0.16, CL / 2 - 0.08));
  // gémláb (konzol)
  upper.add(bx(0.18, 0.55, 0.5, mats.paint2, EXC.BOOMX - 0.2, 0.25 + 0.2, 0.82), bx(0.18, 0.55, 0.5, mats.paint2, EXC.BOOMX + 0.2, 0.25 + 0.2, 0.82));
  upper.add(cylAlongX(0.07, 0.6, mats.steel, EXC.BOOMX, EXC.P0[1] - 0.86, EXC.P0[0], 12));

  // ---------------- gém ----------------
  const boomPivot = new THREE.Group(); boomPivot.position.set(EXC.BOOMX, EXC.P0[1] - 0.86, EXC.P0[0]); upper.add(boomPivot);
  { const s = new THREE.Shape(); const L = EXC.L1;
    s.moveTo(-0.18, -0.16); s.quadraticCurveTo(0.7, -0.1, 1.45, 0.34); s.quadraticCurveTo(2.2, 0.05, L + 0.14, -0.16);
    s.quadraticCurveTo(L + 0.24, 0.0, L + 0.14, 0.16); s.quadraticCurveTo(2.25, 0.42, 1.5, 0.74); s.quadraticCurveTo(0.6, 0.38, -0.18, 0.18);
    s.quadraticCurveTo(-0.3, 0.0, -0.18, -0.16);
    boomPivot.add(mesh(extYZ(s, 0.34, 0.02), mats.paint));
    boomPivot.add(cylAlongX(0.075, 0.44, mats.steel, 0, 0, L, 12));
    boomPivot.add(bx(0.38, 0.12, 0.2, mats.paint2, 0, 0.12, 1.25)); // henger-fül alul
    boomPivot.add(bx(0.38, 0.12, 0.25, mats.paint2, 0, 0.72, 1.35)); // henger-fül felül
    boomPivot.add(bx(0.12, 0.08, 0.1, mats.light, 0.2, 0.62, 1.1)); }
  // ---------------- szár ----------------
  const stickPivot = new THREE.Group(); stickPivot.position.set(0, 0, EXC.L1); boomPivot.add(stickPivot);
  { const s = new THREE.Shape(); const L = EXC.L2;
    s.moveTo(-0.5, 0.18); s.quadraticCurveTo(-0.45, 0.42, -0.25, 0.36); s.lineTo(L + 0.06, 0.1); s.quadraticCurveTo(L + 0.16, 0, L + 0.06, -0.1); s.lineTo(0.05, -0.17); s.quadraticCurveTo(-0.3, -0.12, -0.5, 0.18);
    stickPivot.add(mesh(extYZ(s, 0.27, 0.015), mats.paint));
    stickPivot.add(cylAlongX(0.06, 0.36, mats.steel, 0, 0, L, 12));
    stickPivot.add(bx(0.31, 0.1, 0.18, mats.paint2, 0, 0.3, 0.05)); }
  // ---------------- kanál ----------------
  const bucketPivot = new THREE.Group(); bucketPivot.position.set(0, 0, EXC.L2); stickPivot.add(bucketPivot);
  const bucket = new THREE.Group(); bucketPivot.add(bucket);
  { const LB = EXC.LB, W = 0.8;
    // oldallemezek
    const side = new THREE.Shape(); side.moveTo(-0.08, -0.06); side.lineTo(LB, 0.0); side.quadraticCurveTo(LB + 0.03, 0.42, 0.46, 0.55); side.quadraticCurveTo(0.06, 0.64, -0.12, 0.26); side.lineTo(-0.08, -0.06);
    for (const sx of [-1, 1]) bucket.add(mesh(extYZ(side, 0.025), mats.paint).translateX(sx * (W / 2 - 0.0125)));
    // hátlemez (héj) a domború oldalon
    const pts = []; const c1 = new THREE.QuadraticBezierCurve(new THREE.Vector2(LB, 0), new THREE.Vector2(LB + 0.03, 0.42), new THREE.Vector2(0.46, 0.55)); const c2 = new THREE.QuadraticBezierCurve(new THREE.Vector2(0.46, 0.55), new THREE.Vector2(0.06, 0.64), new THREE.Vector2(-0.12, 0.26));
    for (let i = 0; i <= 12; i++) pts.push(c1.getPoint(i / 12)); for (let i = 1; i <= 12; i++) pts.push(c2.getPoint(i / 12));
    const inner = pts.map((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)]; const tx = b.x - a.x, ty = b.y - a.y, l = Math.hypot(tx, ty) || 1; return new THREE.Vector2(p.x + ty / l * 0.035, p.y - tx / l * 0.035); });
    const shell = new THREE.Shape([...pts, ...inner.reverse()]);
    bucket.add(mesh(extYZ(shell, W - 0.03), mats.paint));
    // vágóél + fogak
    bucket.add(bx(W, 0.035, 0.12, mats.steel, 0, 0.0, LB - 0.03));
    for (let k = 0; k < 5; k++) { const t = mesh(new THREE.ConeGeometry(0.035, 0.16, 4).rotateX(Math.PI / 2).rotateZ(Math.PI / 4), mats.steel); t.scale.set(1.3, 0.55, 1); t.position.set(-0.32 + k * 0.16, 0.01, LB + 0.08); bucket.add(t); }
    // fülek és csapok
    for (const sx of [-0.13, 0.13]) bucket.add(bx(0.04, 0.4, 0.3, mats.paint2, sx, 0.13, -0.02));
    bucket.add(cylAlongX(0.05, 0.34, mats.steel, 0, 0, 0, 10), cylAlongX(0.045, 0.34, mats.steel, 0, 0.26, -0.05, 10));
    // föld a kanálban
    const load = mesh(new THREE.SphereGeometry(0.34, 14, 10), mats.soil); load.scale.set(1.05, 0.62, 0.95); load.position.set(0, 0.24, 0.36); bucket.add(load);
    bucket.userData.load = load; }
  // négycsuklós kanálmechanizmus: összekötő (a szártól) + billenőkar (a kanáltól)
  const link1 = mesh(new THREE.BoxGeometry(0.05, 1, 0.08), mats.paint2), link2a = mesh(new THREE.BoxGeometry(0.05, 1, 0.09), mats.paint2), link2b = link2a.clone();
  g.add(link1, link2a, link2b);
  const hy = { boom: hydraulic(g, 0.085, 0.05, 1.25, mats), arm: hydraulic(g, 0.075, 0.045, 1.05, mats), bkt: hydraulic(g, 0.065, 0.04, 0.85, mats) };
  g.userData = { lower, upper, boomPivot, stickPivot, bucketPivot, bucket, hy, link1, link2a, link2b, mats, last: null };
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

// IK: a kanálél (f, h) a gép talpsíkjától mérve, phi a kanál húrjának szöge (fok, +: felfelé); slew fokban (+: a gép bal oldala felé, +x)
export function poseExcavator2(ex, { f, h, phi, slew = 0, load = 0 }) {
  const u = ex.userData, L1 = EXC.L1, L2 = EXC.L2, LB = EXC.LB, [pf, ph] = EXC.P0;
  const p = phi * D2R; const wf = f - LB * Math.cos(p), wh = h - LB * Math.sin(p);
  let dx = wf - pf, dy = wh - ph, D = Math.hypot(dx, dy); D = Math.min(L1 + L2 - 1e-3, Math.max(Math.abs(L1 - L2) + 1e-3, D));
  const al = Math.atan2(dy, dx), be = Math.acos((L1 * L1 + D * D - L2 * L2) / (2 * L1 * D));
  const t1 = al + be, ef = pf + L1 * Math.cos(t1), eh = ph + L1 * Math.sin(t1), t2 = Math.atan2(wh - eh, wf - ef);
  u.upper.rotation.y = slew * D2R;
  u.boomPivot.rotation.x = -t1; u.stickPivot.rotation.x = -(t2 - t1); u.bucketPivot.rotation.x = -(p - t2);
  u.bucket.userData.load.visible = load > 0.02; u.bucket.userData.load.scale.set(1.05 * (0.4 + 0.6 * load), 0.62 * Math.max(0.05, load), 0.95 * (0.4 + 0.6 * load));
  ex.updateMatrixWorld(true);
  const W = (obj, x, y, z) => ex.worldToLocal(obj.localToWorld(new THREE.Vector3(x, y, z)));
  // gémhenger: a felsővázról a gém aljára; szárhenger: a gém tetejéről a szár hátsó karjára
  u.hy.boom.set(W(u.upper, EXC.BOOMX, 0.12, 1.2), W(u.boomPivot, 0, 0.12, 1.25));
  u.hy.arm.set(W(u.boomPivot, 0, 0.78, 1.38), W(u.stickPivot, 0, 0.36, -0.42));
  // kanálhenger + H-link: S a száron, P a kanálon, J a csukló (két kör metszéspontja)
  const S = W(u.stickPivot, 0, 0.1, EXC.L2 - 0.28), P = W(u.bucket, 0, 0.26, -0.05), a = 0.34, b = 0.3;
  const dd = S.distanceTo(P); let J;
  if (dd < a + b && dd > Math.abs(a - b)) { const x = (a * a - b * b + dd * dd) / (2 * dd), y = Math.sqrt(Math.max(0, a * a - x * x)); const e = new THREE.Vector3().subVectors(P, S).normalize();
    const n = new THREE.Vector3().subVectors(W(u.stickPivot, 0, 1, EXC.L2 - 0.3), S).projectOnPlane(e).normalize(); J = S.clone().addScaledVector(e, x).addScaledVector(n, y); }
  else J = S.clone().lerp(P, 0.5).add(new THREE.Vector3().subVectors(W(u.stickPivot, 0, 1, 0), W(u.stickPivot, 0, 0, 0)).multiplyScalar(0.12));
  const place = (m, A, B, off) => { const d = new THREE.Vector3().subVectors(B, A); const L = d.length(); m.scale.set(1, L, 1); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); m.position.copy(A).lerp(B, 0.5); if (off) m.position.add(off); };
  const side = new THREE.Vector3().subVectors(W(u.upper, 1, 0, 0), W(u.upper, 0, 0, 0)).normalize();
  place(u.link1, S, J, null); place(u.link2a, J, P, side.clone().multiplyScalar(0.12)); place(u.link2b, J, P, side.clone().multiplyScalar(-0.12));
  u.hy.bkt.set(W(u.stickPivot, 0, 0.34, 0.08), J);
  return { wrist: [wf, wh], elbow: [ef, eh] };
}

// a kanál pontjának világkoordinátája (pl. a föld kiürítési helye)
export function bucketWorld(ex, x = 0, y = 0.25, z = 0.38) { ex.updateMatrixWorld(true); return ex.userData.bucket.localToWorld(new THREE.Vector3(x, y, z)); }
