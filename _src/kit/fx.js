// Effektek: lökéshullám-gyűrűk, porfelhő, tömörödési izzás, betonszemcsék.
import * as THREE from 'three';
import { clamp, smooth, easeOut, hash } from './util.js';

function ringMat(color) {
  return new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uC: { value: new THREE.Color(color) }, uA: { value: 0 }, uW: { value: 0.12 } },
    vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 uC; uniform float uA, uW; varying vec2 vU; void main(){ float r = length(vU-0.5)*2.0; float b = smoothstep(1.0, 1.0-uW, r) * smoothstep(1.0-uW*2.6, 1.0-uW, r); gl_FragColor = vec4(uC*b*uA, 1.0); }',
  });
}
// gyűrűk: n darab, ütésenként ciklikusan
export function buildRings(n, color, plane) {
  const g = new THREE.Group(); const list = [];
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), ringMat(color));
    if (plane === 'ground') m.rotation.x = -Math.PI / 2;
    m.renderOrder = 6; m.frustumCulled = false; g.add(m); list.push(m);
  }
  g.userData = { list };
  return g;
}
// blows: az utolsó néhány ütés [{t, s}], center: fn(blow) -> Vector3, maxR
export function updateRings(rings, t, blows, center, maxR, dur = 0.7, gain = 1) {
  const L = rings.userData.list;
  L.forEach(m => m.visible = false);
  let k = 0;
  for (let i = blows.length - 1; i >= 0 && k < L.length; i--) {
    const b = blows[i], dt = t - b.t;
    if (dt < 0 || dt > dur) continue;
    const m = L[k++]; const u = dt / dur;
    const r = 0.35 + maxR * easeOut(u) * (0.7 + 0.3 * b.s);
    m.visible = true; m.position.copy(center(b)); m.scale.set(r, r, r);
    m.material.uniforms.uA.value = gain * b.s * (1 - u) * (1 - u) * 1.6;
    m.material.uniforms.uW.value = 0.05 + 0.1 * (1 - u);
  }
}

// lágy pont-sprite textúra
function softTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); return t;
}
const SOFT = { tex: null };
export function buildDust(n, color, size) {
  if (!SOFT.tex) SOFT.tex = softTex();
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  geo.setAttribute('alpha', new THREE.BufferAttribute(new Float32Array(n), 1));
  geo.setAttribute('sz', new THREE.BufferAttribute(new Float32Array(n), 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uTex: { value: SOFT.tex }, uC: { value: new THREE.Color(color) }, uScale: { value: 900 }, uSize: { value: size } },
    vertexShader: 'attribute float alpha; attribute float sz; varying float vA; uniform float uScale, uSize; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0); gl_Position = projectionMatrix*mv; gl_PointSize = uSize*sz*uScale/max(0.5,-mv.z); vA = alpha; }',
    fragmentShader: 'uniform sampler2D uTex; uniform vec3 uC; varying float vA; void main(){ vec4 t = texture2D(uTex, gl_PointCoord); gl_FragColor = vec4(uC, t.a*vA); }',
  });
  const p = new THREE.Points(geo, mat); p.frustumCulled = false; p.renderOrder = 7; p.userData = { n };
  return p;
}
// porfelhők ütésenként: emitters = [{t, s, x, y, z, spread, up, life, count}]
export function updateDust(pts, t, emitters) {
  const n = pts.userData.n, pos = pts.geometry.attributes.position, al = pts.geometry.attributes.alpha, sz = pts.geometry.attributes.sz;
  let k = 0;
  for (const e of emitters) {
    const dt = t - e.t; if (dt < 0 || dt > e.life) continue;
    for (let j = 0; j < e.count && k < n; j++, k++) {
      const h1 = hash(e.seed + j, 1), h2 = hash(e.seed + j, 2), h3 = hash(e.seed + j, 3), h4 = hash(e.seed + j, 4);
      const life = e.life * (0.55 + 0.45 * h4); const u = dt / life;
      if (u >= 1) { pos.setXYZ(k, 0, -999, 0); al.setX(k, 0); continue; }
      const a = h1 * Math.PI * 2, sp = e.spread * (0.4 + h2) * e.s;
      const ex = easeOut(Math.min(1, u * 1.6));
      const x = e.x + Math.cos(a) * sp * ex, z = e.z + Math.sin(a) * sp * ex * (e.flatZ ?? 1);
      const y = e.y + e.up * (0.3 + h3) * ex * e.s - (e.g || 0) * dt * dt;
      pos.setXYZ(k, x, y, z);
      al.setX(k, (e.alpha ?? 0.55) * (1 - u) * smooth(u * 8));
      sz.setX(k, (0.6 + 0.9 * h3) * (1 + 1.5 * u));
    }
  }
  for (; k < n; k++) { pos.setXYZ(k, 0, -999, 0); al.setX(k, 0); }
  pos.needsUpdate = true; al.needsUpdate = true; sz.needsUpdate = true;
}

// tömörödési izzás a metszeten (radiális, additív)
export function buildGlow() {
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uC: { value: new THREE.Color(0xff9a3a) }, uA: { value: 0 }, uSq: { value: 0.82 }, uIn: { value: 0.4 } },
    vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 uC; uniform float uA, uSq, uIn; varying vec2 vU; void main(){ vec2 d = (vU-0.5)*2.0; d.y /= uSq; float r = length(d); float ring = smoothstep(uIn*0.92, uIn*1.08, r) * exp(-pow(max(r-uIn,0.0)/max(0.12,(1.0-uIn)*0.45), 2.0)); gl_FragColor = vec4(uC*ring*uA, 1.0); }',
  });
  const p = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m); p.renderOrder = 4; p.frustumCulled = false;
  return p;
}
