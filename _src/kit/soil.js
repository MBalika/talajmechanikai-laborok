// Talajtömb metszettel, rétegtextúrák, talajszemcsék, terep, röntgen-talajoszlop – közös készlet
import * as THREE from 'three';
import { mulberry32, clamp, smooth } from './util.js';

export const SOIL = { W: 30, DZ: 40, BOT: -24 };
export const SU = { // közös talaj-uniformok (a jelenet minden képkockán állítja)
  uHoleR: { value: 0 }, uHoleTop: { value: 0 }, uHoleBot: { value: 0 }, uHoleX: { value: 0 },
  uBulbY: { value: -12 }, uBulbR: { value: 0 }, uBulbSq: { value: 0.82 }, uBulbX: { value: 0 },
  uShTop: { value: -100 }, uShBot: { value: -100 }, uShR: { value: 0.27 }, uShX: { value: 0 },
  uRect: { value: new THREE.Vector4(0, 0, 0, 0) }, // x0, x1, yBot, yTop – téglalap kivágás a metszeten
  uRectB: { value: new THREE.Vector4(0, 0, 0, 0) }, uRectZ: { value: new THREE.Vector2(-20, 0) }, // második kivágás; árok hossza (zMin, aktív)
  uX: { value: 0 }, uFade: { value: 1 }, uGW: { value: -100 }, uTime: { value: 0 }, uDark: { value: 1 },
  uBounds: { value: [-100, -100, -100, -100, -100, -100] },
  uWet: { value: 1 },
  uRectH: { value: 0 }, // 1: a kivágásokon belül a vízszintes réteghatár-lapok is eltűnnek (üreg, nem „szeletelt” talaj)
  uCrater: { value: new THREE.Vector3(0, 0, 0) }, uCrP: { value: 2 },
  uTr: { value: new THREE.Vector4(0, 0, 0, 0) }, uTrZ: { value: 0 }, // egyenes árok: x0, x1, fenék y, zMin; uTrZ = zMax (x1 > x0 esetén aktív)
  uPits: { value: Array.from({ length: 24 }, () => new THREE.Vector4(0, 0, 0, 0)) }, uPitN: { value: 0 }, // további gödrök (csak felülnézet): x, z, szigma, mélység // tölcsér: x, szigma, mélység (gauss-alakú felszíni bemélyedés, metszeten is)
};

function speckle(base, spots, density, size, seed, extra) {
  const S = 1024, cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, S, S);
  const rnd = mulberry32(seed); density *= 4; size *= 2;
  for (let i = 0; i < 120; i++) { g.fillStyle = spots[Math.floor(rnd() * spots.length)] + '33'; const r = 60 + rnd() * 180; g.beginPath(); g.ellipse(rnd() * S, rnd() * S, r, r * (0.4 + rnd() * 0.5), rnd() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < density; i++) {
    const r = size * (0.35 + rnd()); const x = rnd() * S, y = rnd() * S;
    g.fillStyle = spots[Math.floor(rnd() * spots.length)];
    g.beginPath(); g.ellipse(x, y, r, r * (0.55 + rnd() * 0.45), rnd() * 3, 0, 7); g.fill();
    if (size > 4 && rnd() < 0.5) { g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.ellipse(x - r * 0.25, y - r * 0.25, r * 0.4, r * 0.25, 0.6, 0, 7); g.fill(); }
  }
  if (extra) extra(g, rnd, S);
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
const cracks = (col, n) => (g, r, S) => { g.strokeStyle = col; g.lineWidth = 2.4; for (let i = 0; i < n; i++) { g.beginPath(); let x = r() * S, y = r() * S; g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (r() - 0.5) * 60; y += (r() - 0.5) * 60; g.lineTo(x, y); } g.stroke(); } };
const fibres = (g, r, S) => { for (let i = 0; i < 260; i++) { g.strokeStyle = r() < 0.5 ? 'rgba(90,64,34,0.6)' : 'rgba(40,28,18,0.6)'; g.lineWidth = 1 + r() * 2.5; g.beginPath(); const x = r() * S, y = r() * S, a = (r() - 0.5) * 0.8; g.moveTo(x, y); g.quadraticCurveTo(x + 30, y + (r() - 0.5) * 20, x + Math.cos(a) * 90, y + Math.sin(a) * 90); g.stroke(); } };
export function layerTextures() {
  return {
    fill: speckle('#7d7466', ['#6e665a', '#8c8373', '#5f584f', '#9a8f7c', '#a2563c'], 2600, 4.5, 3, (g, r, S) => { for (let i = 0; i < 80; i++) { g.fillStyle = r() < 0.5 ? '#9c4a32' : '#b9b2a4'; g.fillRect(r() * S, r() * S, 12 + r() * 32, 8 + r() * 20); } }),
    clay: speckle('#5e5148', ['#574b42', '#66584e', '#524840', '#6b5d52'], 900, 9, 5, cracks('rgba(30,24,20,0.35)', 70)),
    softclay: speckle('#5f5a52', ['#58534b', '#67615a', '#4f4a44', '#6e675e'], 700, 10, 15, cracks('rgba(25,25,25,0.25)', 30)),
    silt: speckle('#7a7062', ['#71685b', '#83796b', '#6a6255', '#8b8172'], 3000, 2.6, 17),
    peat: speckle('#3b2c20', ['#33261b', '#46352a', '#2a2018', '#52402f'], 800, 7, 19, fibres),
    sand: speckle('#c5a671', ['#b8975f', '#d2b583', '#ad8d58', '#dcc196'], 5200, 2.2, 7),
    loose: speckle('#c9ad7c', ['#bfa070', '#d6bd92', '#b39567', '#e0c9a1', '#a88a5e'], 3600, 2.6, 21),
    grav: speckle('#9a8e7a', ['#80766a', '#b4a892', '#8e8475', '#c2b8a3', '#6f675d', '#a89c86'], 1500, 7.5, 9),
    crushed: speckle('#8f8c86', ['#77746e', '#a6a39c', '#68655f', '#b9b6ae', '#5c5a55'], 2200, 6.5, 23, (g, r, S) => { for (let i = 0; i < 700; i++) { g.fillStyle = r() < 0.5 ? '#5e5b56' : '#b7b3ab'; g.beginPath(); const x = r() * S, y = r() * S, s = 6 + r() * 12; g.moveTo(x, y); g.lineTo(x + s, y + s * 0.3); g.lineTo(x + s * 0.4, y + s); g.fill(); } }),
    ash: speckle('#9b9a8c', ['#8e8d80', '#a8a798', '#85847a', '#b3b2a3'], 4200, 2.0, 25),
    stone: speckle('#8d8a83', ['#6f6c66', '#a9a59c', '#5e5b56', '#bdb8ae', '#7b776f'], 900, 13, 27),
    site: speckle('#8d8577', ['#7b7468', '#a19888', '#6c665c', '#b3aa98'], 4200, 3.2, 13),
  };
}
export const TEX_SCALE = { fill: 2.2, clay: 3.2, softclay: 3.4, silt: 1.8, peat: 2.6, sand: 1.6, loose: 1.7, grav: 2.4, crushed: 1.8, ash: 1.6, stone: 2.6 };

let TEXTOP = null;
export function layerMaterial(tex, scale, tint = 0xffffff) {
  const m = new THREE.MeshStandardMaterial({ color: tint, roughness: 0.96, metalness: 0 });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, SU, { uTex: { value: tex }, uTop: { value: TEXTOP }, uScale: { value: scale } });
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec3 vWN;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvWP = (modelMatrix*vec4(transformed,1.0)).xyz; vWN = normalize(mat3(modelMatrix)*objectNormal);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vWP; varying vec3 vWN; uniform float uRectH; uniform sampler2D uTex, uTop; uniform float uScale, uHoleR, uHoleTop, uHoleBot, uHoleX, uX, uFade, uGW, uBulbY, uBulbR, uBulbSq, uBulbX, uShTop, uShBot, uShR, uShX, uDark, uWet; uniform vec4 uRect, uRectB; uniform vec2 uRectZ; uniform float uBounds[6]; uniform vec3 uCrater; uniform float uCrP, uPitN; uniform vec4 uPits[24]; uniform vec4 uTr; uniform float uTrZ;`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
      if (uCrater.z > 0.005) { // gauss-tölcsér: x, szigma, mélység
        float crr = length(vWP.xz - vec2(uCrater.x, 0.0));
        if (vWP.y > -0.03 && vWN.y > 0.5 && crr < 3.0 * uCrater.y) discard;
        if (abs(vWP.z) < 0.03) { float crx = vWP.x - uCrater.x; if (abs(crx) < 3.0 * uCrater.y && vWP.y > -uCrater.z * exp(-pow(abs(crx) / uCrater.y, uCrP))) discard; }
      }
      if (uTr.y > uTr.x && vWP.x > uTr.x && vWP.x < uTr.y) { // egyenes árok (felszín, metszet, belső rétéghatárok)
        bool inZ = vWP.z > uTr.w && vWP.z < uTrZ;
        if (inZ && vWP.y > -0.03 && vWN.y > 0.5) discard;
        if (abs(vWP.z) < 0.03 && uTr.w < 0.0 && uTrZ > 0.0 && vWP.y > uTr.z) discard;
        if (inZ && vWP.y < -0.03 && abs(vWN.y) > 0.5 && vWP.y > uTr.z + 0.01) discard;
      }
      if (uPitN > 0.5) { for (int i = 0; i < 24; i++) { if (float(i) >= uPitN) break; vec4 P = uPits[i]; if (P.w < 0.005) continue;
        if (vWP.y > -0.03 && vWN.y > 0.5 && length(vWP.xz - P.xy) < P.z * 1.7) discard;
        if (abs(vWP.z) < 0.03 && abs(P.y) < 0.05) { float px = vWP.x - P.x; if (abs(px) < 1.75 * P.z && vWP.y > -P.w * exp(-pow(abs(px) / P.z, uCrP))) discard; } } }
      if (uHoleR > 0.0) {
        if (abs(vWP.z) < 0.03 && abs(vWP.x - uHoleX) < uHoleR && vWP.y > uHoleBot && vWP.y < uHoleTop) discard;
        if (vWP.y > -0.03 && length(vWP.xz - vec2(uHoleX, 0.0)) < uHoleR && uHoleTop > -0.01) discard;
      }
      if (abs(vWP.z) < 0.03) {
        if (uBulbR > 0.01) { vec2 q = vec2(vWP.x - uBulbX, (vWP.y - uBulbY) / uBulbSq); if (length(q) < uBulbR * 0.97) discard; }
        if (abs(vWP.x - uShX) < uShR && vWP.y < uShTop && vWP.y > uShBot) discard;
        if (uRect.y > uRect.x && vWP.x > uRect.x && vWP.x < uRect.y && vWP.y > uRect.z && vWP.y < uRect.w) discard;
        if (uRectB.y > uRectB.x && vWP.x > uRectB.x && vWP.x < uRectB.y && vWP.y > uRectB.z && vWP.y < uRectB.w) discard;
      }
      if (uRectZ.y > 0.5 && vWP.y < -0.05 && abs(vWN.y) > 0.5 && vWP.z > uRectZ.x && vWP.z < 0.05 && uRect.y > uRect.x && vWP.x > uRect.x && vWP.x < uRect.y) discard; // belső rétéghatár-lapok a gödörben
      if (uRectH > 0.5 && vWP.y < -0.05 && abs(vWN.y) > 0.5 && vWP.z > -20.0 && vWP.z < 0.05) { // kivágott üregben nincs réteghatár-lap
        if (uRect.y > uRect.x && vWP.x > uRect.x && vWP.x < uRect.y && vWP.y > uRect.z - 0.01 && vWP.y < uRect.w + 0.01) discard;
        if (uRectB.y > uRectB.x && vWP.x > uRectB.x && vWP.x < uRectB.y && vWP.y > uRectB.z - 0.01 && vWP.y < uRectB.w + 0.01) discard;
      }
      if (uRectZ.y > 0.5 && vWP.y > -0.03 && vWP.z > uRectZ.x && vWP.z < 0.05) {
        if (uRect.y > uRect.x && vWP.x > uRect.x && vWP.x < uRect.y) discard;
        if (uRectB.y > uRectB.x && vWP.x > uRectB.x && vWP.x < uRectB.y) discard;
      }`)
      .replace('#include <map_fragment>', `#include <map_fragment>
      {
        vec3 an = abs(vWN);
        vec3 c;
        if (an.y > 0.5 && vWN.y > 0.0) c = texture2D(uTop, vWP.xz / 3.0).rgb;
        else if (an.z > 0.5) c = texture2D(uTex, vWP.xy / uScale).rgb;
        else c = texture2D(uTex, vWP.zy / uScale).rgb;
        float front = step(0.5, an.z);
        float wet = smoothstep(uGW + 0.15, uGW - 0.25, vWP.y) * (1.0 - step(0.5, vWN.y)) * uWet;
        c *= mix(1.0, 0.8, wet);
        c *= mix(1.0, 0.72, smoothstep(0.0, -20.0, vWP.y));
        float l = dot(c, vec3(0.3,0.59,0.11));
        c = mix(c, vec3(l) * vec3(0.66, 0.68, 0.74), uX * 0.35);
        c *= mix(1.0, 0.84, uX) * uDark;
        float bl = 0.0;
        for (int i = 0; i < 6; i++) bl = max(bl, 1.0 - smoothstep(0.0, 0.05, abs(vWP.y - uBounds[i])));
        c *= 1.0 - 0.4 * bl * front;
        diffuseColor.rgb = c;
        diffuseColor.a *= uFade;
      }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      { float an = abs(vWN.z); float gw = (1.0 - smoothstep(0.0, 0.035, abs(vWP.y - uGW))) * step(0.5, an);
        totalEmissiveRadiance += vec3(0.25, 0.65, 1.0) * gw * 1.6; }`);
  };
  m.customProgramCacheKey = () => 'soilLayerK';
  return m;
}

// layers: [{key, name, top, bottom}] (top/bottom pozitív mélység)
export function buildSoil(T, layers) {
  TEXTOP = T.site;
  const back = new THREE.Group(), front = new THREE.Group();
  const mats = [];
  for (const L of layers) {
    const bot = Math.min(L.bottom, -SOIL.BOT), h = bot - L.top;
    const mat = layerMaterial(T[L.tex || L.key], L.scale || TEX_SCALE[L.tex || L.key] || 2); mats.push(mat);
    const bm = new THREE.Mesh(new THREE.BoxGeometry(SOIL.W * 2, h, SOIL.DZ, 1, 1, 1), mat);
    bm.position.set(0, -L.top - h / 2, -SOIL.DZ / 2); bm.receiveShadow = true; back.add(bm);
    const fm = new THREE.Mesh(new THREE.BoxGeometry(SOIL.W * 2, h, SOIL.DZ, 1, 1, 1), mat);
    fm.position.set(0, -L.top - h / 2, SOIL.DZ / 2); fm.receiveShadow = true; front.add(fm);
  }
  const b = layers.slice(0, -1).map(L => -L.bottom); while (b.length < 6) b.push(-100);
  SU.uBounds.value = b.slice(0, 6);
  return { back, front, mats };
}

// ---------- terep (fű + munkaterület) ----------
export const GU = { uCut: { value: 0 }, uHero: { value: 0 }, uHeroR: { value: 4.2 } };
export function terrainMaterial(T) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.97, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, GU, { uGrass: { value: T.grass }, uNoise: { value: T.noise }, uSite: { value: T.site } });
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP;').replace('#include <project_vertex>', '#include <project_vertex>\nvWP = (modelMatrix*vec4(transformed,1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vWP; uniform sampler2D uGrass, uNoise, uSite; uniform float uCut, uHero, uHeroR;`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
      if (uHero > 0.5) { if (length(vWP.xz) < uHeroR) discard; }
      else {
        if (!gl_FrontFacing) discard;
        if (abs(vWP.x) < ${SOIL.W.toFixed(1)} && vWP.z < 0.0 && vWP.z > -${SOIL.DZ.toFixed(1)}) discard;
        if (abs(vWP.x) < ${SOIL.W.toFixed(1)} && vWP.z >= 0.0 && vWP.z < ${SOIL.DZ.toFixed(1)}) discard;
        if (uCut > 0.5 && vWP.z > 0.0 && abs(vWP.x) < 400.0) discard;
      }`)
      .replace('#include <map_fragment>', `#include <map_fragment>
      {
        vec2 xz = vWP.xz;
        vec3 g1 = texture2D(uGrass, xz / 3.2).rgb, g2 = texture2D(uGrass, xz / 11.0 + 0.37).rgb;
        vec3 c = mix(g1, g2, 0.35);
        vec4 n = texture2D(uNoise, xz / 37.0), n2 = texture2D(uNoise, xz / 9.0);
        c *= 0.78 + 0.4 * n.r;
        float l = dot(c, vec3(0.3,0.59,0.11));
        c = mix(c, vec3(l) * vec3(1.55, 1.38, 0.78), 0.45 + 0.25 * n.b);
        float d = length(max(abs(xz - vec2(0.0, -6.0)) - vec2(${(SOIL.W - 2).toFixed(1)}, 30.0), 0.0));
        float site = 1.0 - smoothstep(0.0, 6.0 + 4.0 * n2.g, d);
        vec3 s = texture2D(uSite, xz / 3.0).rgb * 0.9;
        c = mix(c, s, site * 0.85);
        if (!gl_FrontFacing) c = vec3(0.10, 0.085, 0.07);
        diffuseColor.rgb = c;
      }`);
  };
  m.customProgramCacheKey = () => 'terrainK';
  return m;
}

// ---------- talajszemcsék a metszeten ----------
const PAL = {
  fill: [[0.36, 0.33, 0.29], [0.48, 0.44, 0.38], [0.5, 0.26, 0.18]],
  clay: [[0.27, 0.23, 0.2], [0.33, 0.29, 0.25]],
  softclay: [[0.28, 0.27, 0.25], [0.34, 0.32, 0.29]],
  silt: [[0.42, 0.38, 0.33], [0.5, 0.45, 0.39]],
  peat: [[0.2, 0.15, 0.1], [0.27, 0.2, 0.13]],
  sand: [[0.66, 0.54, 0.35], [0.74, 0.62, 0.42], [0.58, 0.47, 0.3]],
  loose: [[0.7, 0.58, 0.4], [0.78, 0.66, 0.47], [0.6, 0.49, 0.33]],
  grav: [[0.46, 0.43, 0.39], [0.6, 0.56, 0.5], [0.38, 0.35, 0.32], [0.68, 0.64, 0.57]],
  crushed: [[0.5, 0.49, 0.47], [0.63, 0.62, 0.59], [0.4, 0.39, 0.37]],
  ash: [[0.56, 0.56, 0.5], [0.64, 0.63, 0.57]],
  stone: [[0.5, 0.48, 0.45], [0.66, 0.63, 0.58], [0.4, 0.38, 0.36]],
};
const SIZE = { fill: 0.028, clay: 0.016, softclay: 0.016, silt: 0.016, peat: 0.022, sand: 0.018, loose: 0.02, grav: 0.04, crushed: 0.04, ash: 0.014, stone: 0.07 };
const KEEP = { fill: 0.7, clay: 0.55, softclay: 0.5, silt: 0.7, peat: 0.6, sand: 1.0, loose: 1.0, grav: 0.85, crushed: 0.9, ash: 0.8, stone: 0.6 };
// opts: {N, x0, x1, y0 (felső), y1 (alsó), z, layers, seed}
export function buildGrains(opts) {
  const { N = 12000, x0 = -3.6, x1 = 3.6, y0 = -0.05, y1 = -15.6, z = 0.012, layers, seed = 42 } = opts;
  const rnd = mulberry32(seed);
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), size = new Float32Array(N), rest = new Float32Array(N * 2), comp = new Float32Array(N), lay = new Uint8Array(N);
  let i = 0, guard = 0;
  while (i < N && guard++ < N * 20) {
    const x = x0 + rnd() * (x1 - x0), y = y0 + rnd() * (y1 - y0);
    const li = Math.max(0, layers.findIndex(l => -y >= l.top && -y < l.bottom));
    const L = layers[li]; const key = L.tex || L.key;
    if (rnd() > (KEEP[key] ?? 0.8)) continue;
    rest[i * 2] = x; rest[i * 2 + 1] = y; lay[i] = li;
    const pal = PAL[key] || PAL.sand; const p = pal[Math.floor(rnd() * pal.length)];
    const v = 0.85 + rnd() * 0.3;
    col[i * 3] = p[0] * v; col[i * 3 + 1] = p[1] * v; col[i * 3 + 2] = p[2] * v;
    size[i] = (SIZE[key] ?? 0.02) * (0.6 + rnd() * 0.9);
    pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
    i++;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('size', new THREE.BufferAttribute(size, 1));
  geo.setAttribute('comp', new THREE.BufferAttribute(comp, 1));
  geo.setDrawRange(0, i);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uScale: { value: 1483 }, uA: { value: 1 }, uX: SU.uX, uHot: { value: new THREE.Color(0xffb04a) } },
    vertexShader: `attribute float size; attribute float comp; attribute vec3 color; varying vec3 vC; varying float vK;
      uniform float uScale; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0); gl_Position = projectionMatrix*mv;
      gl_PointSize = max(1.2, size * uScale / -mv.z); vC = color; vK = comp; }`,
    fragmentShader: `varying vec3 vC; varying float vK; uniform float uA, uX; uniform vec3 uHot;
      void main(){ vec2 d = gl_PointCoord - 0.5; float r = length(d); if (r > 0.5) discard;
      float sh = 0.8 + 0.35 * (0.5 - (d.x + d.y) * 0.7);
      vec3 c = vC * sh; c = mix(c, c * vec3(0.8,0.85,0.95), uX * 0.4);
      vec3 hot = vK >= 0.0 ? uHot : vec3(0.35, 0.75, 1.0);
      c = mix(c, hot * (0.9 + 0.4 * sh), clamp(abs(vK), 0.0, 1.0) * 0.85);
      gl_FragColor = vec4(c, uA * smoothstep(0.5, 0.38, r)); }`,
  });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = 2;
  pts.userData = { N: i, rest, pos, comp, geo, col, lay, colBase: col.slice() };
  return pts;
}
// fn(x, y, li, out) -> out = [x, y, k]  (k: >0 narancs = tömörödés, <0 kék = víz/injektált)
export function updateGrains(pts, fn) {
  const u = pts.userData, N = u.N, rest = u.rest, pos = u.pos, comp = u.comp; const out = [0, 0, 0];
  for (let i = 0; i < N; i++) {
    out[0] = rest[i * 2]; out[1] = rest[i * 2 + 1]; out[2] = 0;
    fn(out[0], out[1], u.lay[i], out, i);
    pos[i * 3] = out[0]; pos[i * 3 + 1] = Math.min(out[1], -0.02); comp[i] = clamp(out[2], -1, 1);
  }
  u.geo.attributes.position.needsUpdate = true; u.geo.attributes.comp.needsUpdate = true;
}
// szemcsék átszínezése (pl. injektált/kevert zóna): fn(x, y, li) -> [r,g,b, mix] vagy null
export function tintGrains(pts, fn) {
  const u = pts.userData, col = u.geo.attributes.color.array, base = u.colBase;
  for (let i = 0; i < u.N; i++) {
    const r = fn(u.pos[i * 3], u.pos[i * 3 + 1], u.lay[i], i);
    if (r) { const k = r[3]; col[i * 3] = base[i * 3] * (1 - k) + r[0] * k; col[i * 3 + 1] = base[i * 3 + 1] * (1 - k) + r[1] * k; col[i * 3 + 2] = base[i * 3 + 2] * (1 - k) + r[2] * k; }
    else { col[i * 3] = base[i * 3]; col[i * 3 + 1] = base[i * 3 + 1]; col[i * 3 + 2] = base[i * 3 + 2]; }
  }
  u.geo.attributes.color.needsUpdate = true;
}

// ---------- röntgen talajoszlop (körbejárható) ----------
export function buildColumn(T, layers, Rc = 4.2, depth = 14.5, holeR = 0.3) {
  const g = new THREE.Group();
  const keys = layers.map(L => L.tex || L.key);
  const uni = { uA: { value: 0.0 } }; keys.forEach((k, i) => uni['uT' + i] = { value: T[k] });
  while (keys.length < 5) keys.push(keys[keys.length - 1]);
  const bnd = layers.map(L => L.bottom.toFixed(2));
  const pick = keys.slice(0, 5).map((k, i) => i < layers.length - 1 ? `if (y < ${bnd[i]}) c = texture2D(uT${i}, uv).rgb; else ` : '').join('') + `c = texture2D(uT${layers.length - 1}, uv).rgb;`;
  const lines = layers.slice(0, -1).map(L => `bl = max(bl, 1.0 - smoothstep(0.0, 0.06, abs(y - ${L.bottom.toFixed(2)})));`).join(' ');
  const side = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: uni,
    vertexShader: 'varying vec3 vP; varying vec3 vN; varying vec3 vV; void main(){ vP = position; vec4 mv = modelViewMatrix*vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
    fragmentShader: `${layers.map((L, i) => `uniform sampler2D uT${i};`).join(' ')} uniform float uA; varying vec3 vP; varying vec3 vN; varying vec3 vV;
      void main(){ float a = atan(vP.z, vP.x) * 4.2; vec2 uv = vec2(a, vP.y) / 2.4; float y = -vP.y; vec3 c;
        ${pick}
        float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 1.5);
        float bl = 0.0; ${lines}
        vec3 col = c * (0.9 + 0.5 * f) + bl * vec3(1.0, 0.75, 0.4) * 0.8;
        gl_FragColor = vec4(col, uA * (0.07 + 0.42 * f) + bl * uA * 0.6); }`,
  });
  const cylG = new THREE.CylinderGeometry(Rc, Rc, depth, 72, 1, true).translate(0, -depth / 2, 0);
  const m = new THREE.Mesh(cylG, side); m.renderOrder = 8; g.add(m);
  const topM = new THREE.MeshStandardMaterial({ map: T.site, roughness: 0.95, transparent: true, opacity: 0.9 });
  const top = new THREE.Mesh(holeR > 0 ? new THREE.RingGeometry(holeR, Rc, 72, 1) : new THREE.CircleGeometry(Rc, 72), topM); top.rotation.x = -Math.PI / 2; top.receiveShadow = true; g.add(top);
  const bot = new THREE.Mesh(new THREE.CircleGeometry(Rc, 72), new THREE.MeshBasicMaterial({ color: 0x3a3128, transparent: true, opacity: 0.5, depthWrite: false })); bot.rotation.x = -Math.PI / 2; bot.position.y = -depth; g.add(bot);
  g.userData = { side, topM, top };
  return g;
}

// világkoordinátás textúrázású anyag (dobozokhoz: elöl xy, felül xz, oldalt zy) – színezhető
export function worldMaterial(tex, scale = 2, color = 0xffffff, opts = {}) {
  const m = new THREE.MeshStandardMaterial({ map: tex, color, roughness: 0.95, ...opts });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uWS = { value: scale };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP2; varying vec3 vWN2;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvWP2 = (modelMatrix*vec4(transformed,1.0)).xyz; vWN2 = normalize(mat3(modelMatrix)*objectNormal);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP2; varying vec3 vWN2; uniform float uWS;')
      .replace('#include <map_fragment>', `vec3 an2 = abs(vWN2); vec2 wuv = an2.y > 0.5 ? vWP2.xz : (an2.z > 0.5 ? vWP2.xy : vWP2.zy);
        vec4 sampledDiffuseColor = texture2D(map, wuv / uWS); diffuseColor *= sampledDiffuseColor;`);
  };
  m.customProgramCacheKey = () => 'worldMat';
  return m;
}
