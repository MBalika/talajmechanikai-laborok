// Élethű munkás-figura: MakeHuman (CC0) alaptestből készült, csontvázzal mozgatott (skinned) háló.
// Ruházat árnyalóban: munkaing, láthatósági mellény fényvisszaverő csíkokkal, nadrág térdvédővel, bakancs, kesztyű;
// arc (szem, szemöldök, rövid haj, borosta), sisak. Mozgás: légzés, testsúlyáthelyezés, körülnézés, gesztusok,
// járás (ha a figurát mozgatják), és kéz-IK a szerszámokhoz/műszerekhez (userData.reach). Videóidőhöz kötött: animateWorkers(t).
import * as THREE from 'three';
import { HUMAN } from './humanmesh.js';

const WORKERS = []; if (typeof window !== 'undefined') window.__workers = WORKERS;
let SEQ = 0;
const dec = (b64, T) => { const s = atob(b64); const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return new T(u.buffer); };
let GEO = null;
function geometry() {
  if (GEO) return GEO;
  const H = HUMAN, n = H.n; const p16 = dec(H.pos, Int16Array); const pos = new Float32Array(n * 3); for (let i = 0; i < n * 3; i++) pos[i] = p16[i] / H.sc;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(new THREE.BufferAttribute(dec(H.idx, Uint16Array), 1));
  const si = dec(H.si, Uint8Array), sw = dec(H.sw, Uint8Array), reg = dec(H.reg, Uint8Array);
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(Uint16Array.from(si), 4));
  const w = new Float32Array(n * 4); for (let i = 0; i < n * 4; i++) w[i] = sw[i] / 255; g.setAttribute('skinWeight', new THREE.BufferAttribute(w, 4));
  g.setAttribute('aReg', new THREE.BufferAttribute(Float32Array.from(reg), 1));
  const aw = dec(H.aw, Uint8Array); g.setAttribute('aW', new THREE.BufferAttribute(Float32Array.from(aw, v => v / 255), 4));
  g.computeVertexNormals(); g.computeBoundingSphere(); g.boundingSphere.radius += 0.6;
  GEO = g; return g;
}
const I = HUMAN.info; const V3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);

// ---------- ruházat-árnyaló ----------
function makeMaterial(c) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, metalness: 0, side: THREE.DoubleSide }); // kétoldalas: a bakancs sarkán nyitott/fordított lapok se látsszanak lyuknak
  const U = {
    uSkin: { value: new THREE.Color(c.skin) }, uHair: { value: new THREE.Color(c.hair) }, uShirt: { value: new THREE.Color(c.shirt) },
    uPants: { value: new THREE.Color(c.pants) }, uVest: { value: new THREE.Color(c.vest) }, uGlove: { value: new THREE.Color(c.glove) },
    uBoot: { value: new THREE.Color(c.boot) }, uBeard: { value: c.beard }, uIris: { value: new THREE.Color(c.iris) }, uStripe: { value: c.stripe ?? 1.0 },
    uEyeL: { value: V3(I['eye.L']) }, uEyeR: { value: V3(I['eye.R']) }, uKneeL: { value: V3(I['knee.L']) }, uKneeR: { value: V3(I['knee.R']) },
    uHeadTop: { value: I.headMax[1] }, uNeck: { value: V3(I.neck) }, uBrow: { value: I.brow }, uNoseZ: { value: I.noseZ },
  };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aReg; attribute vec4 aW; flat varying float vReg; varying vec3 vRest; varying vec4 vW;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRest = position; vReg = aReg; vW = aW;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
flat varying float vReg; varying vec3 vRest; varying vec4 vW; uniform vec3 uNeck;
uniform vec3 uSkin, uHair, uShirt, uPants, uVest, uGlove, uBoot, uIris; uniform float uBeard, uStripe; uniform vec3 uEyeL, uEyeR, uKneeL, uKneeR; uniform float uHeadTop, uBrow, uNoseZ;
float h3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vn(vec3 x){ vec3 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f);
  return mix(mix(mix(h3(i), h3(i+vec3(1,0,0)), f.x), mix(h3(i+vec3(0,1,0)), h3(i+vec3(1,1,0)), f.x), f.y), mix(mix(h3(i+vec3(0,0,1)), h3(i+vec3(1,0,1)), f.x), mix(h3(i+vec3(0,1,1)), h3(i+vec3(1,1,1)), f.x), f.y), f.z); }
float band(float x, float a, float b, float w){ return smoothstep(a - w, a + w, x) * (1.0 - smoothstep(b - w, b + w, x)); }
`).replace('#include <color_fragment>', `#include <color_fragment>
  vec3 P = vRest; float R = floor(vReg + 0.5); vec3 col = uSkin; float rgh = 0.6; float emi = 0.0;
  float fab = 0.93 + 0.07 * vn(P * 420.0) + 0.05 * (vn(P * 38.0) - 0.5);
  if (R < 0.5) { // bőr: arc, haj, szemöldök, borosta, ajak
    col = uSkin * (0.94 + 0.08 * vn(P * 160.0)); rgh = 0.55;
    float ey = uEyeL.y; float front = smoothstep(uNoseZ - 0.075, uNoseZ - 0.05, P.z);
    float top = smoothstep(uBrow + 0.03, uBrow + 0.05, P.y);
    float side = (1.0 - front) * smoothstep(ey - 0.005, ey + 0.02, P.y);
    float hairZone = clamp(max(top, side), 0.0, 1.0);
    col = mix(col, uHair * (0.75 + 0.45 * vn(P * 900.0)), hairZone * 0.92);
    float brow = band(P.y, uBrow - 0.004, uBrow + 0.005, 0.002) * band(abs(P.x), 0.016, 0.05, 0.004) * front;
    col = mix(col, uHair * 0.7, brow * 0.85);
    float jaw = (1.0 - smoothstep(ey - 0.06, ey - 0.045, P.y)) * smoothstep(ey - 0.125, ey - 0.105, P.y) * smoothstep(uNoseZ - 0.11, uNoseZ - 0.075, P.z);
    col = mix(col, mix(uSkin, uHair, 0.6) * (0.85 + 0.3 * vn(P * 1400.0)), jaw * uBeard);
    float lip = band(P.y, ey - 0.083, ey - 0.07, 0.003) * band(abs(P.x), -0.1, 0.024, 0.005) * smoothstep(uNoseZ - 0.03, uNoseZ - 0.018, P.z);
    col = mix(col, uSkin * vec3(0.82, 0.6, 0.56), lip * (1.0 - uBeard * 0.6));
  } else if (R < 3.5 || (R > 4.5 && R < 5.5)) { // ruházat: ing / mellény / öv / nadrág / kesztyű / nyak – súly- és pozícióalapú, sima határok
    float y = P.y, ax = abs(P.x), fz = smoothstep(0.0, 0.05, P.z - uNeck.z + 0.02);
    float armW = vW.x, handW = vW.y, headW = vW.z, legW = vW.w;
    float rN = length(P.xz - uNeck.xz);
    float collarY = uNeck.y + 0.008 - 0.028 * fz;
    float neckSkin = smoothstep(collarY - 0.002, collarY + 0.002, y) * (1.0 - smoothstep(0.075, 0.085, rN)) * (1.0 - armW);
    float vTop = mix(1.475, min(1.475, 1.385 + 1.5 * max(0.0, ax - 0.035)), fz);
    float vest = (1.0 - smoothstep(vTop - 0.002, vTop + 0.002, y)) * smoothstep(0.973, 0.977, y);
    float arm = 0.172 + 0.08 * (1.0 - smoothstep(1.24, 1.38, y));
    vest *= (1.0 - smoothstep(arm - 0.003, arm + 0.003, ax)) * (1.0 - smoothstep(0.25, 0.45, armW));
    float belt = band(y, 0.932, 0.972, 0.002) * (1.0 - armW);
    float pants = 1.0 - smoothstep(0.93, 0.934, y);
    col = uShirt * fab; rgh = 0.92;
    float cb = band(y, collarY - 0.022, collarY, 0.002) * (1.0 - smoothstep(0.085, 0.1, rN)); col *= 1.0 - 0.18 * cb;
    float edge = smoothstep(vTop + 0.012, vTop, y) * smoothstep(0.96, 0.975, y) * (1.0 - smoothstep(arm + 0.012, arm, ax)) * (1.0 - armW);
    col *= 1.0 - 0.25 * max(0.0, edge - vest);
    col = mix(col, vec3(0.13, 0.1, 0.08) * (0.9 + 0.2 * vn(P * 600.0)), belt); rgh = mix(rgh, 0.45, belt);
    col = mix(col, vec3(0.62, 0.6, 0.55), belt * band(P.x, -0.022, 0.022, 0.002) * step(0.0, P.z));
    float kp = max(1.0 - smoothstep(0.045, 0.06, length((P - uKneeL) * vec3(1.0, 0.75, 1.0))), 1.0 - smoothstep(0.045, 0.06, length((P - uKneeR) * vec3(1.0, 0.75, 1.0))));
    kp *= smoothstep(-0.01, 0.02, P.z - uKneeL.z + 0.02);
    vec3 pc = mix(uPants * fab, vec3(0.09, 0.09, 0.1), kp);
    col = mix(col, pc, pants); rgh = mix(rgh, mix(0.94, 0.6, kp), pants);
    if (vest > 0.001) {
      vec3 vc = uVest * fab;
      float hs = band(y, 1.0, 1.045, 0.002) + band(y, 1.085, 1.13, 0.002);
      float vs = band(ax, 0.075, 0.122, 0.002) * step(1.13, y);
      float st = clamp(hs + vs, 0.0, 1.0) * uStripe;
      vc = mix(vc, vec3(0.8, 0.82, 0.84) * (0.9 + 0.1 * vn(P * 900.0)), st);
      float zip = band(P.x, -0.003, 0.003, 0.001) * fz; vc *= 1.0 - 0.4 * zip;
      float hem = 1.0 - smoothstep(0.0, 0.008, min(min(y - 0.975, vTop - y), arm - ax)); vc *= 1.0 - 0.18 * hem;
      col = mix(col, vc, vest); rgh = mix(rgh, mix(0.78, 0.3, st), vest); emi = vest * st * 0.12;
    }
    float glove = smoothstep(0.42, 0.58, handW);
    col = mix(col, uGlove * (0.9 + 0.12 * vn(P * 500.0)), glove); rgh = mix(rgh, 0.75, glove);
    col *= 1.0 - 0.3 * band(handW, 0.38, 0.44, 0.02);
    col = mix(col, uSkin * (0.94 + 0.08 * vn(P * 160.0)), neckSkin); rgh = mix(rgh, 0.55, neckSkin);
  } else if (R < 4.5) { // bakancs
    col = uBoot * (0.9 + 0.12 * vn(P * 300.0)); rgh = 0.5;
    float sole = 1.0 - smoothstep(0.022, 0.03, P.y); col = mix(col, vec3(0.07, 0.065, 0.06), sole); rgh = mix(rgh, 0.9, sole);
  } else if (R < 5.5) { col = uGlove * (0.9 + 0.12 * vn(P * 500.0)); rgh = 0.75; }
  else { // szem
    vec3 c = P.x > 0.0 ? uEyeL : uEyeR; vec3 d = normalize(P - c); float f = d.z;
    col = vec3(0.92, 0.9, 0.86); float ir = smoothstep(0.86, 0.9, f); col = mix(col, uIris, ir); col = mix(col, vec3(0.03), smoothstep(0.955, 0.965, f)); rgh = 0.15;
  }
  diffuseColor.rgb = col;`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n  roughnessFactor = rgh;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n  totalEmissiveRadiance += diffuseColor.rgb * emi;');
  };
  m.customProgramCacheKey = () => 'worker-v4';
  return m;
}

// ---------- színvariációk ----------
function rng(seed) { let s = (seed * 9301 + 49297) % 233280; return () => (s = (s * 9301 + 49297) % 233280) / 233280; }
const SKIN = [0xd9a684, 0xcf9a77, 0xb98060, 0xe2b393, 0xa66e4e, 0xc89070];
const HAIR = [0x2a2018, 0x3e2c1e, 0x5a4330, 0x1b1816, 0x6e6458, 0x3a2a20];
const SHIRT = [0x2f3d55, 0x3d4a3a, 0x4a4f58, 0x52392c, 0x2e4256, 0x5c5f63];
const PANTS = [0x2a3142, 0x353739, 0x3e3a30, 0x262d3b, 0x41454a];
const GLOVE = [0x3a3f45, 0xb88a52, 0x58616b, 0x9a7a4c];
const BOOT = [0x4a3424, 0x3b2a1e, 0x2c2622, 0x5a4028];
const IRIS = [0x4a3424, 0x3a5a70, 0x5a5030, 0x2a2018];
const HELMET = [0xf4f4f0, 0xf2c12e, 0xf4f4f0, 0xf4f4f0, 0x2f6fb5, 0xf4f4f0];

// ---------- felépítés ----------
const HB = {}; HUMAN.bones.forEach(b => HB[b.n] = b);
export function buildWorker(colors = {}) {
  const id = SEQ++; const R = rng(id * 7 + 3); const pick = (a) => a[Math.floor(R() * a.length) % a.length];
  const vest = colors.vest ?? 0xff7a00;
  const C = { skin: pick(SKIN), hair: pick(HAIR), shirt: pick(SHIRT), pants: pick(PANTS), vest, glove: pick(GLOVE), boot: pick(BOOT), iris: pick(IRIS), beard: R() < 0.45 ? 0.35 + R() * 0.5 : 0.0 };
  // laborruha (2026-11-10): ing/nadrág/kesztyű/cipő felülírható, a mellény csíkjai kikapcsolhatók – a véletlen sorrend nem változik
  for (const k of ['shirt', 'pants', 'glove', 'boot', 'skin', 'hair']) if (colors[k] !== undefined) C[k] = colors[k]; if (colors.stripes === false) C.stripe = 0.0; if (colors.beard !== undefined) C.beard = colors.beard;
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body); const sc = 0.98 + R() * 0.05; body.scale.setScalar(sc);
  const mesh = new THREE.SkinnedMesh(geometry(), makeMaterial(C)); mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false; body.add(mesh);
  const bones = HUMAN.bones.map(b => { const o = new THREE.Bone(); o.name = b.n; return o; });
  HUMAN.bones.forEach((b, i) => { const o = bones[i]; if (b.p < 0) { o.position.set(b.x[0], b.x[1], b.x[2]); mesh.add(o); } else { const pp = HUMAN.bones[b.p].x; o.position.set(b.x[0] - pp[0], b.x[1] - pp[1], b.x[2] - pp[2]); bones[b.p].add(o); } });
  mesh.updateMatrixWorld(true); mesh.bind(new THREE.Skeleton(bones));
  const B = {}; bones.forEach(b => B[b.name] = b);
  // sisak a fej csontján
  const hc = colors.helmet ?? pick(HELMET); const hm = new THREE.MeshStandardMaterial({ color: hc, roughness: 0.3, metalness: 0 });
  const hmin = I.headMin, hmax = I.headMax; const hw = (hmax[0] - hmin[0]) / 2, hd = (hmax[2] - hmin[2]) / 2, hz = (hmin[2] + hmax[2]) / 2 - 0.006;
  const hb = HB.head.x; const helm = new THREE.Group(); helm.position.set(0, hmax[1] - 0.075 - hb[1], hz - hb[2]);
  const shell = new THREE.Mesh(new THREE.SphereGeometry(1, 30, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), hm); shell.scale.set(hw * 1.22, 0.12, hd * 1.14); shell.castShadow = true; helm.add(shell);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.012, 32), hm); brim.scale.set(hw * 1.32, 1, hd * 1.34); brim.position.set(0, 0.004, 0.02); brim.rotation.x = -0.06; brim.castShadow = true; helm.add(brim);
  const ridge = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), hm); ridge.scale.set(0.022, 0.128, hd * 1.02); ridge.castShadow = true; helm.add(ridge);
  if (colors.helmet !== false) B.head.add(helm);
  const stance = colors.stance ?? Math.floor(R() * 4);
  let tablet = null; if (stance === 2) { tablet = new THREE.Group(); const a = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.18, 0.014), new THREE.MeshStandardMaterial({ color: 0x23272c, roughness: 0.5 })); a.castShadow = true; tablet.add(a); const s = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.15, 0.004), new THREE.MeshStandardMaterial({ color: 0x0c1c28, emissive: 0x2a7fb0, emissiveIntensity: 0.55 })); s.position.z = 0.009; tablet.add(s); body.add(tablet); tablet.visible = false; }
  root.userData = { isWorker: true, seed: id * 1.731 + 0.37, stance, spd: 0, ph: 0, B, body, mesh, tablet, reach: null };
  WORKERS.push(root);
  return root;
}

// ---------- póz-segédek (modelltér = a test-csoport koordinátái) ----------
const RB = {}; HUMAN.bones.forEach(b => RB[b.n] = new THREE.Vector3(b.x[0], b.x[1], b.x[2]));
const restDir = (a, b) => new THREE.Vector3().subVectors(RB[b], RB[a]).normalize();
const restLen = (a, b) => RB[b].distanceTo(RB[a]);
const ARM = {}, LEG = {};
for (const s of ['L', 'R']) {
  const sh = RB['uarm.' + s], el = RB['farm.' + s], wr = RB['hand.' + s];
  const line = new THREE.Vector3().subVectors(wr, sh).normalize(); const pe = new THREE.Vector3().subVectors(el, sh); const pole = pe.sub(line.clone().multiplyScalar(pe.dot(line))).normalize();
  ARM[s] = { la: restLen('uarm.' + s, 'farm.' + s), lb: restLen('farm.' + s, 'hand.' + s), dA: restDir('uarm.' + s, 'farm.' + s), dB: restDir('farm.' + s, 'hand.' + s), pole };
  LEG[s] = { la: restLen('thigh.' + s, 'shin.' + s), lb: restLen('shin.' + s, 'foot.' + s), dA: restDir('thigh.' + s, 'shin.' + s), dB: restDir('shin.' + s, 'foot.' + s), pole: new THREE.Vector3(0, 0, 1) };
  ARM[s].lat = V3(I['index.' + s]).sub(V3(I['pinky.' + s])).normalize();
}
const _m = new THREE.Matrix4(), _q2 = new THREE.Quaternion(), _v = new THREE.Vector3(), _s = new THREE.Vector3(), _qb = new THREE.Quaternion();
const HAND = {}; for (const s of ['L', 'R']) HAND[s] = { f0: restDir('hand.' + s, 'fing.' + s), l0: ARM[s].lat };
function modelQuat(bone, body, out) { _m.copy(body.matrixWorld).invert().multiply(bone.matrixWorld); _m.decompose(_v, out, _s); return out; }
function modelPos(bone, body, out) { _m.copy(body.matrixWorld).invert().multiply(bone.matrixWorld); return out.setFromMatrixPosition(_m); }
function setModelQuat(bone, body, qModel) { modelQuat(bone.parent, body, _q2); bone.quaternion.copy(_q2.invert().multiply(qModel)); bone.updateMatrixWorld(true); }
function frameQuat(u, p) { const x = u.clone().normalize(); const y = p.clone().sub(x.clone().multiplyScalar(p.dot(x))).normalize(); const z = new THREE.Vector3().crossVectors(x, y); return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z)); }
function ik2(body, A, Bn, L, target, pole, w = 1) { // target, pole: modelltérben
  if (w <= 0) return;
  const a = modelPos(A, body, new THREE.Vector3()); const t = target.clone().sub(a); let d = t.length(); const n = t.clone().normalize();
  d = THREE.MathUtils.clamp(d, Math.abs(L.la - L.lb) + 0.01, L.la + L.lb - 0.003);
  const ca = (L.la * L.la + d * d - L.lb * L.lb) / (2 * L.la * d), sa = Math.sqrt(Math.max(0, 1 - ca * ca));
  const pw = pole.clone().sub(n.clone().multiplyScalar(pole.dot(n))); if (pw.lengthSq() < 1e-8) pw.set(0, 0, 1); pw.normalize();
  const e = n.clone().multiplyScalar(L.la * ca).add(pw.clone().multiplyScalar(L.la * sa));
  const dirA = e.clone().normalize(); const dirB = n.clone().multiplyScalar(d).sub(e).normalize();
  const qA = frameQuat(dirA, pw).multiply(frameQuat(L.dA, L.pole).invert());
  const qAcur = modelQuat(A, body, new THREE.Quaternion()); qAcur.slerp(qA, w); setModelQuat(A, body, qAcur);
  const bRest = L.dB.clone().applyQuaternion(qAcur); const qB = new THREE.Quaternion().setFromUnitVectors(bRest, dirB).multiply(qAcur);
  const qBcur = modelQuat(Bn, body, new THREE.Quaternion()); qBcur.slerp(qB, w); setModelQuat(Bn, body, qBcur);
}
const sm = (a, b, x) => { const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const E = new THREE.Euler(), Q = new THREE.Quaternion();
const rot = (bone, x, y, z) => { bone.quaternion.setFromEuler(E.set(x, y, z, 'YXZ')); };

// alkar-csavarás (pronáció/szupináció): a kézfej csavarodásának nagy részét az alkar veszi át, így a csukló nem „fordul ki”
function twistForearm(body, B, sd, q, wt) {
  const fa = B['farm.' + sd], qF = modelQuat(fa, body, new THREE.Quaternion()); const d = modelPos(B['hand.' + sd], body, new THREE.Vector3()).sub(modelPos(fa, body, new THREE.Vector3())).normalize();
  const a = ARM[sd].lat.clone().applyQuaternion(qF), b = ARM[sd].lat.clone().applyQuaternion(q); a.addScaledVector(d, -a.dot(d)); b.addScaledVector(d, -b.dot(d));
  if (a.lengthSq() > 1e-6 && b.lengthSq() > 1e-6) { a.normalize(); b.normalize(); const ang = Math.atan2(new THREE.Vector3().crossVectors(a, b).dot(d), a.dot(b));
    setModelQuat(fa, body, new THREE.Quaternion().setFromAxisAngle(d, ang * (HUMAN_CFG.twist ?? 0.85) * wt).multiply(qF)); }
}
// Önbeálló kéz: rc.palm (a tenyér normálisa a tárgy felé, világ), rc.contact (a tenyérközép érintési pontja, világ), rc.axis (hengernél a tengely),
// rc.gap (tenyér–felszín távolság). Az ujjak iránya az alkarból adódik (henger: a tengelyre merőleges két irány közül az alkarhoz közelebbi,
// sík: az alkar vetülete a síkra), így a csukló természetesen áll; a hüvelykujj iránya a kéz oldalából következik.
// ---- kar-megoldó rögzített kézkerethez (2026-11-11): a könyök helyét (a váll–csukló tengely körüli elforgatást) és – ha a fogás engedi –
// a kéz elfordulását egy szabad tengely körül (rc.free: henger tengelye, két ujjhegy egyenese, felület normálisa) úgy választjuk,
// hogy a csukló a természetes tartományban maradjon: hajlítás/feszítés, sugár-/singcsonti közelítés, alkar-csavarás (pronáció/szupináció),
// és a könyök ne menjen a törzsbe, ne emelkedjen a váll fölé. Így a kéz nem „fordul ki”, a csukló nem törik meg.
const DEG = 180 / Math.PI;
const _pen = (x, lo, hi) => x < lo ? (lo - x) * (lo - x) : x > hi ? (x - hi) * (x - hi) : 0;
function segDist3(p, a, b) { const ab = b.clone().sub(a); const k = THREE.MathUtils.clamp(p.clone().sub(a).dot(ab) / ab.lengthSq(), 0, 1); return p.distanceTo(a.clone().addScaledVector(ab, k)); }
let _tNow = 0; const _ARM_MEM = new WeakMap();
export function armCostParts(sd, S, E, W, F, P, Lh) {
  const d = W.clone().sub(E).normalize();
  const flex = Math.atan2(-d.dot(P), d.dot(F)) * DEG, dev = Math.atan2(-d.dot(Lh), d.dot(F)) * DEG;
  const ua = E.clone().sub(S); const h = ua.clone().cross(d); let pr = 0; const hl = h.length();
  if (hl > 0.08 * ua.length()) { h.divideScalar(hl); const Ln = h.clone().cross(d); const Lp = Lh.clone().addScaledVector(d, -Lh.dot(d)); if (Lp.lengthSq() > 1e-4) { Lp.normalize(); pr = Math.atan2(Ln.clone().cross(Lp).dot(d), Ln.dot(Lp)) * DEG * (sd === 'R' ? -1 : 1); } }
  return { flex, dev, pr };
}
function solveArmFrame(sd, body, B, W0, F0, P0, free, poleHint, memo) {
  const S = modelPos(B['uarm.' + sd], body, new THREE.Vector3()), hips = modelPos(B.hips, body, new THREE.Vector3()), neck = modelPos(B.neck, body, new THREE.Vector3());
  const L = ARM[sd], sg = sd === 'L' ? 1 : -1;
  const frameAt = (a) => { if (!free || Math.abs(a) < 1e-9) return { W: W0, F: F0, P: P0 }; const q = new THREE.Quaternion().setFromAxisAngle(free.ax, a); return { W: W0.clone().sub(free.c).applyQuaternion(q).add(free.c), F: F0.clone().applyQuaternion(q), P: P0.clone().applyQuaternion(q) }; };
  const near = memo && Math.abs(memo.t - _tNow) < 0.25;
  const cost = (fr, a, phi, out) => {
    const t = fr.W.clone().sub(S); const dist = t.length(); const n = t.divideScalar(dist); const dd = THREE.MathUtils.clamp(dist, Math.abs(L.la - L.lb) + 0.01, L.la + L.lb - 0.003);
    const ca = (L.la * L.la + dd * dd - L.lb * L.lb) / (2 * L.la * dd), sa = Math.sqrt(Math.max(0, 1 - ca * ca));
    let u1 = poleHint.clone().addScaledVector(n, -poleHint.dot(n)); if (u1.lengthSq() < 1e-6) u1.set(0, -1, 0).addScaledVector(n, n.y); u1.normalize(); const u2 = n.clone().cross(u1);
    const pw = u1.clone().multiplyScalar(Math.cos(phi)).addScaledVector(u2, Math.sin(phi)); const E = S.clone().addScaledVector(n, L.la * ca).addScaledVector(pw, L.la * sa);
    const Wr = S.clone().addScaledVector(n, dd);
    const Lh = (sd === 'L' ? new THREE.Vector3().crossVectors(fr.P, fr.F) : new THREE.Vector3().crossVectors(fr.F, fr.P)).normalize();
    const { flex, dev, pr } = armCostParts(sd, S, E, Wr, fr.F, fr.P, Lh);
    let c = 1.0 * _pen(flex, -40, 45) + 2.2 * _pen(dev, -24, 14) + 0.8 * _pen(pr, -45, 95) + 0.03 * flex * flex + 0.07 * dev * dev + 0.0025 * (pr - 25) * (pr - 25);   // pronáció 0…90° természetes (tenyér lefelé fogáskor)
    const lat = sg * (E.x - S.x);                                       // a könyök oldalra (+) vagy befelé (−) a vállhoz képest
    const dT = segDist3(E, hips, neck), dM = segDist3(E.clone().add(Wr).multiplyScalar(0.5), hips, neck);
    c += 4e4 * Math.max(0, 0.215 - dT) ** 2 + 3e4 * Math.max(0, 0.17 - dM) ** 2 + 1.2e4 * Math.max(0, E.y - S.y + 0.06) ** 2 + 2e4 * Math.max(0, -0.03 - lat) ** 2 + 3e3 * Math.max(0, S.z - 0.22 - E.z) ** 2;
    c += 40 * (1 - Math.cos(phi)) + 45 * a * a; if (free && free.minDy !== undefined) c += 3e4 * Math.max(0, free.c.y + free.minDy - fr.W.y) ** 2;   // a kéz a fogáspont fölött maradjon (pl. lapos tárgy felvétele az asztalról)
    if (near) { const dp = Math.atan2(Math.sin(phi - memo.phi), Math.cos(phi - memo.phi)); c += 30 * dp * dp + 30 * (a - memo.a) ** 2; }
    if (out) Object.assign(out, { flex, dev, pr, E, pw, c });
    return c; };
  const A0 = free ? free.a0 : 0, A1 = free ? free.a1 : 0, NA = free ? 13 : 1, NP = 36;
  let best = { c: Infinity, a: 0, phi: 0 };
  for (let i = 0; i < NA; i++) { const a = NA === 1 ? 0 : A0 + (A1 - A0) * i / (NA - 1); const fr = frameAt(a);
    for (let j = 0; j < NP; j++) { const phi = -Math.PI + 2 * Math.PI * j / NP; const c = cost(fr, a, phi); if (c < best.c) best = { c, a, phi }; } }
  if (near) { const fr = frameAt(memo.a); const c = cost(fr, memo.a, memo.phi); if (c < best.c) best = { c, a: memo.a, phi: memo.phi }; }
  let sa = NA === 1 ? 0 : (A1 - A0) / (NA - 1) / 2, sp = Math.PI / NP;
  for (let it = 0; it < 3; it++) { const b0 = { ...best };
    for (let i = -2; i <= 2; i++) { const a = NA === 1 ? 0 : THREE.MathUtils.clamp(b0.a + sa * i / 2, Math.min(A0, A1), Math.max(A0, A1)); const fr = frameAt(a);
      for (let j = -2; j <= 2; j++) { const phi = b0.phi + sp * j / 2; const c = cost(fr, a, phi); if (c < best.c) best = { c, a, phi }; } }
    sa /= 2; sp /= 2; }
  const fr = frameAt(best.a); const info = {}; cost(fr, best.a, best.phi, info);
  return { W: fr.W, F: fr.F, P: fr.P, pole: info.pw, a: best.a, phi: best.phi, info };
}
function autoHand(body, B, sd, rc, pole) {
  body.getWorldQuaternion(_qb); const qi = _qb.clone().invert();
  if (rc.W && rc.F) { // rögzített kézkeret (2026-11-11): a csukló helye (W) és az ujjak (F) / tenyér (palm) iránya adott – pontos ujjhegy-célokhoz
    const wt = rc.w ?? 1, ua = B['uarm.' + sd], fa = B['farm.' + sd], ha = B['hand.' + sd];
    let P = rc.palm.clone().applyQuaternion(qi).normalize(); let F = rc.F.clone().applyQuaternion(qi); F.addScaledVector(P, -F.dot(P)).normalize(); let Wl = body.worldToLocal(rc.W.clone());
    const free = rc.free ? { ax: rc.free.ax.clone().applyQuaternion(qi).normalize(), c: body.worldToLocal(rc.free.c.clone()), a0: rc.free.a0, a1: rc.free.a1, minDy: rc.free.minDy } : null;
    let mem = _ARM_MEM.get(B); if (!mem) { mem = {}; _ARM_MEM.set(B, mem); } const sol = solveArmFrame(sd, body, B, Wl, F, P, free, pole, mem[sd]); mem[sd] = { t: _tNow, a: sol.a, phi: sol.phi };
    Wl = sol.W; F = sol.F; P = sol.P; pole = sol.pole; rc._arm = { ...sol.info, a: sol.a, phi: sol.phi }; rc._W = body.localToWorld(Wl.clone());
    const q0a = ua.quaternion.clone(), q0b = fa.quaternion.clone(); ik2(body, ua, fa, ARM[sd], Wl, pole, 1);
    if (wt < 1) { ua.quaternion.copy(q0a); ua.updateMatrixWorld(true); fa.quaternion.copy(q0b); fa.updateMatrixWorld(true); ik2(body, ua, fa, ARM[sd], Wl, pole, wt); }
    const Lx = sd === 'L' ? new THREE.Vector3().crossVectors(P, F) : new THREE.Vector3().crossVectors(F, P); Lx.normalize();
    const q = frameQuat(F, Lx).multiply(frameQuat(HAND[sd].f0, HAND[sd].l0).invert()); if (wt < 1) q.copy(modelQuat(ha, body, new THREE.Quaternion()).slerp(q, wt));
    twistForearm(body, B, sd, q, wt); setModelQuat(ha, body, q); rc._wrist = rc._W.clone(); return; }
  const Ph = rc.palm.clone().applyQuaternion(qi).normalize(), A = rc.axis ? rc.axis.clone().applyQuaternion(qi).normalize() : null;
  const Cax = rc.axisPt ? body.worldToLocal(rc.axisPt.clone()) : null, rad = rc.radius ?? 0, C0 = body.worldToLocal(rc.contact.clone());
  const Fhint = rc.fdir ? rc.fdir.clone().applyQuaternion(qi).normalize() : null;
  const gap = rc.gap ?? 0.02, PL = 0.065, wt = rc.w ?? 1, ua = B['uarm.' + sd], fa = B['farm.' + sd], ha = B['hand.' + sd];
  // egy lépés: az alkar irányából (d) a tenyér (P), az ujjak (F) és a tenyérközép (C)
  const frame = (d, prevF) => { let P = Ph.clone(), F, C = C0.clone();
    if (A) { // henger: a kézközépcsontok az alkar folytatásában, az ujjak a hengert körbefogják; a tenyér a henger felé, a megadott oldalon
      if (Cax) { const n = new THREE.Vector3().crossVectors(A, d); if (n.lengthSq() > 0.04) { n.normalize(); if (n.dot(Ph) < 0) n.negate(); P = n; } else { P = Ph.clone().addScaledVector(A, -Ph.dot(A)).normalize(); } C = Cax.clone().addScaledVector(P, -rad); }
      F = d.clone().addScaledVector(A, -d.dot(A)).addScaledVector(P, 0); F.addScaledVector(P, -F.dot(P)); if (F.lengthSq() < 1e-6) F = new THREE.Vector3().crossVectors(A, P); F.normalize(); }
    else { F = d.clone().addScaledVector(P, -d.dot(P)); if (F.lengthSq() < 0.03 && (Fhint || prevF)) { const h = Fhint || prevF; F = h.clone().addScaledVector(P, -h.dot(P)); } F.normalize(); }
    if (rc.ftilt) F.addScaledVector(P, rc.ftilt).normalize();
    return { P, F, W: C.clone().addScaledVector(P, -gap).addScaledVector(F, -PL) }; };
  const q0a = ua.quaternion.clone(), q0b = fa.quaternion.clone();
  let fr = frame(C0.clone().sub(modelPos(ua, body, new THREE.Vector3())).normalize(), null);
  for (let it = 0; it < 4; it++) { ik2(body, ua, fa, ARM[sd], fr.W, pole, 1); fr = frame(modelPos(ha, body, new THREE.Vector3()).sub(modelPos(fa, body, new THREE.Vector3())).normalize(), fr.F); }
  if (wt < 1) { ua.quaternion.copy(q0a); ua.updateMatrixWorld(true); fa.quaternion.copy(q0b); fa.updateMatrixWorld(true); }
  ik2(body, ua, fa, ARM[sd], fr.W, pole, wt);
  const { P, F } = fr; const Lx = sd === 'L' ? new THREE.Vector3().crossVectors(P, F) : new THREE.Vector3().crossVectors(F, P); Lx.normalize();
  const q = frameQuat(F, Lx).multiply(frameQuat(HAND[sd].f0, HAND[sd].l0).invert());
  if (wt < 1) q.copy(modelQuat(ha, body, new THREE.Quaternion()).slerp(q, wt));
  twistForearm(body, B, sd, q, wt); setModelQuat(ha, body, q);
  rc._wrist = body.localToWorld(fr.W.clone()); // ellenőrzéshez (tools/handcheck.py)
}
export function animateWorkers(t) {
  _tNow = t;
  for (const w of WORKERS) {
    const u = w.userData, B = u.B, body = u.body, s = u.seed; const p = w.position;
    if (u.lastT !== undefined) { const dt = t - u.lastT; if (dt > 0 && dt < 0.25) { const dx = p.x - u.lx, dz = p.z - u.lz, d = Math.hypot(dx, dz); u.spd = THREE.MathUtils.lerp(u.spd, d / dt, 0.35); u.ph += d / 0.66 * Math.PI;
        if (d > 1e-5) { const ry = w.rotation.y; const lx = dx * Math.cos(ry) - dz * Math.sin(ry), lz = dx * Math.sin(ry) + dz * Math.cos(ry); const L = Math.hypot(lx, lz); u.dx = THREE.MathUtils.lerp(u.dx ?? 0, lx / L, 0.4); u.dz = THREE.MathUtils.lerp(u.dz ?? 1, lz / L, 0.4); } } else if (dt !== 0) u.spd = 0; }
    u.lastT = t; u.lx = p.x; u.lz = p.z;
    if (!w.visible) continue;
    w.updateWorldMatrix(true, false);
    const wa = sm(0.12, 0.45, u.spd), ia = 1 - wa; const ph = u.ph;
    const br = Math.sin(t * 1.7 + s * 3), wt = Math.sin(t * 0.23 + s * 2), sw = Math.sin(t * 0.45 + s);
    for (const k in B) B[k].quaternion.identity();
    // csípő, gerinc
    const hipShift = 0.02 * wt * ia; const bob = -0.012 - 0.03 * wa * Math.pow(Math.abs(Math.sin(ph)), 1.5);
    // guggolás / előrehajlás (userData.reach.squat [m], .lean [rad]) – a talp a helyén marad, a térd hajlik
    const sq = (u.reach && u.reach.squat) || 0, ln = (u.reach && u.reach.lean) || 0;
    B.hips.position.set(RB.hips.x + hipShift, RB.hips.y + bob - sq, RB.hips.z - 0.42 * sq);
    rot(B.hips, 0.02 * wa + 0.35 * ln, 0.08 * Math.sin(ph) * wa, -0.04 * wt * ia + 0.03 * Math.cos(ph) * wa);
    rot(B.spineLo, 0.02 + 0.03 * wa + 0.008 * br + 0.4 * ln, -0.06 * Math.sin(ph) * wa, 0.03 * wt * ia);
    rot(B.spineHi, 0.015 * br + 0.25 * ln, -0.06 * Math.sin(ph) * wa, 0.02 * sw * ia);
    body.updateMatrixWorld(true);
    // lábak (IK)
    for (const sd of ['L', 'R']) {
      const sg = sd === 'L' ? 1 : -1; const lp = sd === 'L' ? ph : ph + Math.PI;
      const ank = RB['foot.' + sd];
      const stand = new THREE.Vector3(sg * 0.12, ank.y, ank.z + (sd === 'L' ? 0.04 : -0.02));
      const lift = Math.pow(Math.max(0, Math.cos(lp)), 1.5) * 0.09;
      const mdx = u.dx ?? 0, mdz = u.dz ?? 1, mn = Math.hypot(mdx, mdz) || 1; const st = 0.25 * Math.sin(lp);
      const walk = new THREE.Vector3(sg * 0.1 + st * mdx / mn * 0.7, ank.y + lift, ank.z + st * mdz / mn);
      const tgt = stand.multiplyScalar(ia).add(walk.multiplyScalar(wa));
      const unload = ia * Math.max(0, sg * -wt) * 0.035; tgt.y += unload * 0.4; tgt.z += unload * 0.3;
      ik2(body, B['thigh.' + sd], B['shin.' + sd], LEG[sd], tgt, new THREE.Vector3(sg * 0.1, 0, 1));
      const pitch = wa * (0.35 * Math.max(0, -Math.sin(lp)) * Math.max(0, Math.cos(lp)) - 0.25 * Math.max(0, Math.sin(lp)) * Math.max(0, Math.cos(lp)));
      setModelQuat(B['foot.' + sd], body, Q.setFromEuler(E.set(pitch, 0, 0)));
    }
    let pitch = 0.04 * Math.sin(t * 0.31 + s) - 0.02;
    const look = 0.5 * Math.sin(t * 0.21 + s * 5) * Math.sin(t * 0.13 + s) + 0.12 * Math.sin(t * 0.7 + s);
    rot(B['clav.L'], 0, 0, 0.012 * br); rot(B['clav.R'], 0, 0, -0.012 * br); body.updateMatrixWorld(true);
    // karok
    const shL = modelPos(B['uarm.L'], body, new THREE.Vector3()), shR = modelPos(B['uarm.R'], body, new THREE.Vector3());
    const swA = 0.24 * Math.sin(ph) * wa;
    const handL = shL.clone().add(new THREE.Vector3(0.06 + 0.008 * br, -0.56 + 0.03 * wa, 0.03 - swA)), handR = shR.clone().add(new THREE.Vector3(-0.06 - 0.008 * br, -0.56 + 0.03 * wa, 0.03 + swA));
    let curlL = 0.5, curlR = 0.5;
    ik2(body, B['uarm.L'], B['farm.L'], ARM.L, handL, new THREE.Vector3(0.3, 0, -1)); ik2(body, B['uarm.R'], B['farm.R'], ARM.R, handR, new THREE.Vector3(-0.3, 0, -1));
    if (u.reach) {
      for (const sd of ['L', 'R']) { const rc = u.reach[sd]; if (!rc) continue;
        const pole = rc.pole || (sd === 'L' ? new THREE.Vector3(0.6, -0.4, -0.6) : new THREE.Vector3(-0.6, -0.4, -0.6));
        if (rc.obj && rc.oLocal) { // önbeálló kéz egy mozgó (pl. a testre szerelt) tárgyon: a fogás a tárgy helyi rendszerében adott, itt számoljuk világba
          rc.obj.updateWorldMatrix(true, false); const m = rc.obj.matrixWorld, o = rc.oLocal;
          rc.contact = o.contact.clone().applyMatrix4(m); rc.palm = o.palm.clone().transformDirection(m);
          if (o.axis) { rc.axis = o.axis.clone().transformDirection(m); rc.axisPt = o.axisPt.clone().applyMatrix4(m); } }
        if (rc.palm && rc.contact) { autoHand(body, B, sd, rc, pole); const cv = rc.curl ?? 1.1; if (sd === 'L') curlL = cv; else curlR = cv; continue; }
        let tg; if (rc.obj) { rc.obj.updateWorldMatrix(true, false); tg = rc.obj.localToWorld(rc.local.clone()); } else tg = w.localToWorld(rc.local.clone()); body.worldToLocal(tg);
        ik2(body, B['uarm.' + sd], B['farm.' + sd], ARM[sd], tg, pole, rc.w ?? 1);
        if (rc.fdir && rc.ldir) { // kézfej-irány: ujjak (fdir) és mutatóujj→kisujj tengely (ldir) világkoordinátában – markolás rúdon
          body.getWorldQuaternion(_qb); _qb.invert(); const F = rc.fdir.clone().applyQuaternion(_qb).normalize(), Lx = rc.ldir.clone().applyQuaternion(_qb).normalize();
          const q = frameQuat(F, Lx).multiply(frameQuat(HAND[sd].f0, HAND[sd].l0).invert());
          twistForearm(body, B, sd, q, rc.w ?? 1); setModelQuat(B['hand.' + sd], body, q); }
        const cv = rc.curl ?? 1.1; if (sd === 'L') curlL = cv; else curlR = cv; }
      if (u.reach.look !== undefined) pitch = u.reach.look;
    } else if (u.stance === 1) { // kéz a csípőn
      const hp = modelPos(B.hips, body, new THREE.Vector3()); ik2(body, B['uarm.R'], B['farm.R'], ARM.R, hp.clone().add(new THREE.Vector3(-0.2, 0.1, 0.0)), new THREE.Vector3(-1, 0, -0.5), ia); curlR = 0.9;
    } else if (u.stance === 2) { // tablet
      const tl = u.tablet; const ch = modelPos(B.spineHi, body, new THREE.Vector3()); tl.visible = ia > 0.5; tl.position.copy(ch).add(new THREE.Vector3(0, -0.1, 0.34)); tl.rotation.set(-0.95, 0, 0);
      ik2(body, B['uarm.L'], B['farm.L'], ARM.L, tl.position.clone().add(new THREE.Vector3(0.13, -0.02, -0.03)), new THREE.Vector3(0.8, -0.6, -0.3), ia);
      ik2(body, B['uarm.R'], B['farm.R'], ARM.R, tl.position.clone().add(new THREE.Vector3(-0.13, -0.02, -0.03)), new THREE.Vector3(-0.8, -0.6, -0.3), ia); curlL = curlR = 1.0;
      pitch = 0.4 + 0.05 * Math.sin(t * 0.5 + s);
    } else if (u.stance === 3) { // időnként előre mutat
      const c = ((t + s * 4) % 12) / 12; const g = sm(0.05, 0.12, c) * (1 - sm(0.3, 0.38, c)) * ia;
      if (g > 0) { ik2(body, B['uarm.R'], B['farm.R'], ARM.R, shR.clone().add(new THREE.Vector3(-0.12, 0.1, 0.6)), new THREE.Vector3(-0.6, -1, 0), g); curlR = 0.5 + 0.4 * g; pitch -= 0.06 * g; }
    }
    for (const sd of ['L', 'R']) { const lat = ARM[sd].lat; const c = sd === 'L' ? curlL : curlR; B['fing.' + sd].quaternion.setFromAxisAngle(lat, (sd === 'L' ? -1 : 1) * c * HUMAN_CFG.curlSign); }
    for (const sd of ['L', 'R']) { const fp = u.reach && u.reach[sd] && u.reach[sd].fingers; setFingerPose(B, sd, fp ? resolvePose(fp, sd) : null); u['fp' + sd] = fp ? (typeof fp === 'string' ? fp : (fp.to || fp.a || 'mix')) : null; }
    rot(B.neck, pitch * 0.4, look * 0.35 * ia, 0); rot(B.head, pitch * 0.6, look * 0.6 * ia, 0.02 * sw);
    if (u.post) { body.updateMatrixWorld(true); u.post(w); } // a kézben tartott tárgyak (pl. toll) a kész testhelyzethez igazodnak
  }
}
// A kéz jellegzetes pontjai világkoordinátában az ujjcsontokból: thumb – a hüvelykujj hegye, index – a mutatóujj hegye,
// web – a hüvelyk és a mutatóujj közti hajlat (a két alapízület között, kissé a kézhát felé), ring/pinky – a gyűrűs- és a kisujj hegye.
export function handPoints(w, sd) {
  const B = w.userData.B, tipW = (c) => { const b = B['fing' + c + '3.' + sd]; b.updateWorldMatrix(true, false); return b.localToWorld(V3(I['tip' + c + '.' + sd]).sub(RB['fing' + c + '3.' + sd])); };
  const h = B['hand.' + sd]; h.updateWorldMatrix(true, false); const P0 = sd === 'L' ? new THREE.Vector3().crossVectors(HAND[sd].f0, ARM[sd].lat) : new THREE.Vector3().crossVectors(ARM[sd].lat, HAND[sd].f0);
  const Pw = P0.normalize().transformDirection(h.matrixWorld); // (a dorzális eltolás iránya; kis eltérés a merőlegestől nem számít)
  const web = B['fingT2.' + sd].getWorldPosition(new THREE.Vector3()).lerp(B['fingI1.' + sd].getWorldPosition(new THREE.Vector3()), 0.5).addScaledVector(Pw, -PEN_WEB_DORSAL);
  return { thumb: tipW('T'), index: tipW('I'), web, ring: tipW('R'), pinky: tipW('P'), palm: Pw };
}
export const HUMAN_CFG = { curlSign: 1, twist: 0.85 };

// ---------- ujjízületek: fogásminták ----------
// A négy ujj ízületei a kéz oldaltengelye (lat) körül hajlanak a tenyér felé; a hüvelykujj alapízülete szembefordul (oppozíció).
// Tollfogás (dinamikus háromujjas fogás): a toll a hüvelyk- és a mutatóujj párnája közt, a középső ujj oldalán fekszik, a hüvelyk–mutató közti
// hajlatban nyugszik; a gyűrűs- és a kisujj behajlítva a papíron támaszkodik; a hüvelyk–mutató köze kerek, nyitott.
const PEN_WEB_DORSAL = 0.008;
const qAx = (ax, a) => new THREE.Quaternion().setFromAxisAngle(ax, a);
const flexQ = (sd, a) => qAx(ARM[sd].lat, (sd === 'L' ? -1 : 1) * a * HUMAN_CFG.curlSign);
function chainFK(sd, c, qs) { // nyugalmi modelltérben: az ízületek és az ujjhegy a lánc forgatásaival
  const J = [1, 2, 3].map(j => RB['fing' + c + j + '.' + sd]), tip = V3(I['tip' + c + '.' + sd]); const out = [J[0].clone()]; let R = new THREE.Quaternion(), p = J[0].clone();
  for (let j = 0; j < 3; j++) { R = R.clone().multiply(qs[j]); const nxt = j < 2 ? J[j + 1] : tip; p = p.clone().add(nxt.clone().sub(J[j]).applyQuaternion(R)); out.push(p); }
  return out; }
const FINGER_PEN = { I: [0.45, 0.7, 0.3], M: [0.6, 0.95, 0.5], R: [0.95, 1.35, 0.8], P: [1.05, 1.4, 0.8] };
const FPOSE = { pen: {} }; export const PEN_GRIP = {};
for (const sd of ['L', 'R']) {
  const pose = {}; for (const c of 'IMRP') pose[c] = FINGER_PEN[c].map(a => flexQ(sd, a));
  const F0 = HAND[sd].f0.clone(), L0 = ARM[sd].lat.clone().addScaledVector(HAND[sd].f0, -ARM[sd].lat.dot(HAND[sd].f0)).normalize(), P0 = (sd === 'L' ? new THREE.Vector3().crossVectors(F0, L0) : new THREE.Vector3().crossVectors(L0, F0)).normalize();
  const idx = chainFK(sd, 'I', pose.I), iTip = idx[3];
  // hüvelykujj: az alapízület három tengely körüli forgatása + két kis hajlítás, hogy a hegye ~1 cm-re legyen a mutatóujj hegyétől (közte a toll)
  const T1 = RB['fingT1.' + sd], T2 = RB['fingT2.' + sd]; const tdir = T2.clone().sub(T1).normalize(); let tax = new THREE.Vector3().crossVectors(tdir, P0).normalize();
  { const t0 = chainFK(sd, 'T', [new THREE.Quaternion(), new THREE.Quaternion(), new THREE.Quaternion()])[3], t1 = chainFK(sd, 'T', [new THREE.Quaternion(), qAx(tax, 0.4), qAx(tax, 0.4)])[3]; if (t1.clone().sub(t0).dot(P0) < 0) tax.negate(); }
  let best = null;
  for (let a = -1.4; a <= 1.401; a += 0.1) for (let b = -1.4; b <= 1.401; b += 0.1) for (let g = -1.4; g <= 1.401; g += 0.1) {
    const q1 = qAx(F0, a).multiply(qAx(P0, b)).multiply(qAx(L0, g)); const qs = [q1, qAx(tax, 0.3), qAx(tax, 0.35)]; const tp = chainFK(sd, 'T', qs);
    const d = tp[3].distanceTo(iTip); const side = tp[3].clone().sub(iTip).dot(P0); // a hüvelyk a toll túloldalán (a tenyér felől) legyen
    const cost = (d - 0.011) ** 2 * 1e4 + (side < 0 ? 0 : side * 40) + 0.02 * (a * a + b * b + g * g);
    if (!best || cost < best.cost) best = { cost, qs, tp }; }
  pose.T = best.qs; FPOSE.pen[sd] = pose;
  const wr = RB['hand.' + sd], rel = (p) => { const d = p.clone().sub(wr); return [d.dot(F0), d.dot(L0), d.dot(P0)]; };
  const tTip = best.tp[3], pin = tTip.clone().add(iTip).multiplyScalar(0.5);
  const web = best.tp[1].clone().lerp(idx[0], 0.5).addScaledVector(P0, -PEN_WEB_DORSAL);
  const rk = chainFK(sd, 'R', pose.R), pk = chainFK(sd, 'P', pose.P), mk = chainFK(sd, 'M', pose.M);
  PEN_GRIP[sd] = { pin: rel(pin), web: rel(web), ring: rel(rk[3]), pinky: rel(pk[3]), low: [rk[1], rk[2], rk[3], pk[1], pk[2], pk[3], mk[2], mk[3]].map(rel), thumbGap: +best.tp[3].distanceTo(iTip).toFixed(4) }; // low: a papír felé eső ujjpontok (ízületek, hegyek)
}
function setFingerPose(B, sd, pose) {
  if (pose) B['fing.' + sd].quaternion.identity();
  for (const c of 'TIMRP') for (let j = 1; j <= 3; j++) { const b = B['fing' + c + j + '.' + sd]; if (pose && pose[c]) b.quaternion.copy(pose[c][j - 1]); else b.quaternion.identity(); }
}

// ---------- ujjpózok ízületenként (2026-11-11) ----------
// defineFingerPose(név, spec): a négy ujj és a hüvelykujj ízületi szögei. spec.wrap = r: henger körülfogása (a tengely a tenyér
// keresztirányában, a tenyérközéptől gap + r távolságra – ugyanaz a geometria, mint a kit/grip.js gripCylinder + autoHand esetén);
// spec.flex = { I:[a,b,c], M, R, P } kézzel; spec.thumb: 'rest' | { wrap: r } | { pinch: d, to: 'I' } | { tgt: [F, L, P] } (csuklóhoz képest, kéz-keretben).
// A reach.fingers lehet név, vagy { a: név, b: név, k: 0…1 } – két póz átmenete (nyitás/zárás).
const FING_SKIN = 0.02, PALM_SKIN = 0.028;
function handFrame0(sd) { const F0 = HAND[sd].f0.clone(), L0 = ARM[sd].lat.clone().addScaledVector(HAND[sd].f0, -ARM[sd].lat.dot(HAND[sd].f0)).normalize(); const P0 = (sd === 'L' ? new THREE.Vector3().crossVectors(F0, L0) : new THREE.Vector3().crossVectors(L0, F0)).normalize(); return { W: RB['hand.' + sd].clone(), F0, L0, P0 }; }
function solveWrap(sd, c, fr, r, gap) { // a 2., 3. ízület és az ujjhegy a henger felszínén (r + bőr)
  const Cc = fr.W.clone().addScaledVector(fr.F0, 0.065).addScaledVector(fr.P0, gap + r), ax = fr.L0; const want = r + FING_SKIN; let best = null;
  const dax = (p) => { const d = p.clone().sub(Cc); d.addScaledVector(ax, -d.dot(ax)); return d.length(); };
  for (let a = 0; a <= 1.75; a += 0.05) for (let b = 0; b <= 1.9; b += 0.05) { const g = Math.min(1.2, 0.7 * b + 0.05); const pts = chainFK(sd, c, [flexQ(sd, a), flexQ(sd, b), flexQ(sd, g)]);
    let cost = 0; for (let j = 1; j <= 3; j++) { const e = dax(pts[j]) - want; cost += (e < 0 ? 6 * e * e : e * e) * (j === 3 ? 0.6 : 1); }
    cost += 0.0004 * (a * a + b * b); if (!best || cost < best.cost) best = { cost, q: [flexQ(sd, a), flexQ(sd, b), flexQ(sd, g)], ang: [a, b, g] }; }
  return best; }
function solveThumb(sd, fr, costFn) { const T1 = RB['fingT1.' + sd], T2 = RB['fingT2.' + sd]; const tdir = T2.clone().sub(T1).normalize(); let tax = new THREE.Vector3().crossVectors(tdir, fr.P0).normalize();
  { const t0 = chainFK(sd, 'T', [new THREE.Quaternion(), new THREE.Quaternion(), new THREE.Quaternion()])[3], t1 = chainFK(sd, 'T', [new THREE.Quaternion(), qAx(tax, 0.4), qAx(tax, 0.4)])[3]; if (t1.clone().sub(t0).dot(fr.P0) < 0) tax.negate(); }
  let best = null; const ev = (a, b, g, fl) => { const q1 = qAx(fr.F0, a).multiply(qAx(fr.P0, b)).multiply(qAx(fr.L0, g)); const qs = [q1, qAx(tax, fl), qAx(tax, fl * 0.9)]; const tp = chainFK(sd, 'T', qs);
    const cost = costFn(tp) + 0.004 * (a * a + b * b + g * g) + 0.002 * fl; if (!best || cost < best.cost) best = { cost, qs, tp, x: [a, b, g, fl] }; };
  for (let a = -1.4; a <= 1.401; a += 0.2) for (let b = -1.4; b <= 1.401; b += 0.2) for (let g = -1.4; g <= 1.401; g += 0.2) for (const fl of [0.1, 0.35, 0.6, 0.85]) ev(a, b, g, fl);
  const x0 = best.x.slice(); for (let a = -0.2; a <= 0.201; a += 0.05) for (let b = -0.2; b <= 0.201; b += 0.05) for (let g = -0.2; g <= 0.201; g += 0.05) for (const df of [-0.1, 0, 0.1]) ev(x0[0] + a, x0[1] + b, x0[2] + g, Math.max(0, x0[3] + df));
  return best; }
function solveTip(sd, c, T) { let best = null; // az ujjhegy a célpontba (a 3. ízület a 2. 70 %-a)
  for (let a = -0.35; a <= 1.75; a += 0.025) for (let b = 0; b <= 1.9; b += 0.025) { const g = Math.min(1.25, 0.7 * b); const q = [flexQ(sd, a), flexQ(sd, b), flexQ(sd, g)]; const tp = chainFK(sd, c, q)[3];
    const cost = tp.distanceTo(T) ** 2 + 2e-6 * (a * a + b * b); if (!best || cost < best.cost) best = { cost, q }; }
  return best.q; }
const toW = (fr, v) => fr.W.clone().addScaledVector(fr.F0, v[0]).addScaledVector(fr.L0, v[1]).addScaledVector(fr.P0, v[2]);
export function defineFingerPose(name, spec) {
  const out = {};
  for (const sd of ['L', 'R']) {
    const fr = handFrame0(sd), pose = {}; const gap = spec.gap ?? PALM_SKIN;
    for (const c of 'IMRP') { if (spec.tips && spec.tips[c]) pose[c] = solveTip(sd, c, toW(fr, spec.tips[c])); else if (spec.wrap !== undefined) pose[c] = solveWrap(sd, c, fr, spec.wrap + (c === 'P' ? 0.004 : 0), gap).q; else { const f = (spec.flex && spec.flex[c]) || [0.15, 0.2, 0.1]; pose[c] = f.map(a => flexQ(sd, a)); } }
    const th = spec.tips && spec.tips.T ? { tgt: spec.tips.T } : (spec.thumb ?? 'rest');
    if (th === 'rest') pose.T = [new THREE.Quaternion(), new THREE.Quaternion(), new THREE.Quaternion()];
    else { let costFn;
      if (th.wrap !== undefined) { const r = th.wrap, Cc = fr.W.clone().addScaledVector(fr.F0, 0.065).addScaledVector(fr.P0, gap + r); const ix = chainFK(sd, 'I', pose.I);
        const tgt = ix[2].clone().addScaledVector(fr.L0, 0.022); // a hüvelyk hegye a mutatóujj középső perce mellett, a henger túloldalán
        costFn = (tp) => { const dax = (p) => { const d = p.clone().sub(Cc); d.addScaledVector(fr.L0, -d.dot(fr.L0)); return d.length(); }; let c = 0; for (const j of [2, 3]) { const e = dax(tp[j]) - (r + FING_SKIN * 0.85); c += (e < 0 ? 8 : 1) * e * e * 1e3; } return c + tp[3].distanceTo(tgt) ** 2 * 300; }; }
      else if (th.pinch !== undefined) { const ft = chainFK(sd, th.to || 'I', pose[th.to || 'I'])[3]; costFn = (tp) => (tp[3].distanceTo(ft) - th.pinch) ** 2 * 1e4 + Math.max(0, tp[3].clone().sub(ft).dot(fr.P0)) * 30; }
      else if (th.tgt) { const T = toW(fr, th.tgt); costFn = (tp) => tp[3].distanceTo(T) ** 2 * 1e4; }
      pose.T = solveThumb(sd, fr, costFn).qs; }
    out[sd] = pose; }
  FPOSE[name] = out; return out;
}
function resolvePose(fp, sd) {
  if (typeof fp === 'string') return FPOSE[fp] && FPOSE[fp][sd];
  const A = FPOSE[fp.a] && FPOSE[fp.a][sd], Bp = FPOSE[fp.b] && FPOSE[fp.b][sd]; if (!A) return Bp; if (!Bp) return A; const k = Math.max(0, Math.min(1, fp.k ?? 0));
  const o = {}; for (const c of 'TIMRP') o[c] = [0, 1, 2].map(j => A[c][j].clone().slerp(Bp[c][j], k)); return o;
}
export function fingerPoseNames() { return Object.keys(FPOSE); }

// a kéz nyugalmi kerete (csukló, ujjirány, oldalirány a mutatóujj felé, tenyér-normális) – a tips-célok ebben értendők
export function handRestInfo(sd) { const fr = handFrame0(sd); const tips = {}; for (const c of 'TIMRP') tips[c] = V3(I['tip' + c + '.' + sd]).sub(fr.W); return { W: fr.W.clone(), F0: fr.F0.clone(), L0: fr.L0.clone(), P0: fr.P0.clone(), knuckles: 'IMRP'.split('').map(c => RB['fing' + c + '1.' + sd].clone().sub(fr.W)), thumbBase: RB['fingT1.' + sd].clone().sub(fr.W) }; }
// ellenőrzéshez: az öt ujjhegy világkoordinátában (tools/gripdbg.py)
export function fingerTips(w, sd) { const B = w.userData.B; const o = {}; for (const c of 'TIMRP') { const b = B['fing' + c + '3.' + sd]; b.updateWorldMatrix(true, false); o[c] = b.localToWorld(V3(I['tip' + c + '.' + sd]).sub(RB['fing' + c + '3.' + sd])); } return o; }
if (typeof window !== 'undefined') window.__fingerTips = fingerTips;
// egy definiált póz ujjhegyei a nyugalmi modelltérben, a csuklóhoz képest (a grips2.js kétpontos fogásaihoz)
export function poseTipsRest(name, sd) { const p = FPOSE[name] && FPOSE[name][sd]; if (!p) return null; const W = RB['hand.' + sd]; const o = {}; for (const c of 'TIMRP') o[c] = chainFK(sd, c, p[c])[3].clone().sub(W); return o; }
