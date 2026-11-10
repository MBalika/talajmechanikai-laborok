// Közös világ: renderer, égbolt, fények, terep, fák, szomszédok, utófeldolgozás, kamera-segédek
import * as THREE from 'three';
import { animateWorkers } from './human.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { clamp, lerp, smooth, ease, seg } from './util.js';
import { noiseTexture, loadImageTexture, SKY, makeSkyDome, makeTreesV2, makeNeighbours, makeHills, plasterTexture, roofTexture } from './v1lib.js';
import { layerTextures, terrainMaterial, GU } from './soil.js';
import grassUrl from './grass.jpg';

export const W = 1920, H = 1080;
export const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

export async function initWorld(canvas, opts = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1); renderer.setSize(W, H, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = opts.exposure ?? 0.95;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.localClippingEnabled = true;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, W / H, 0.05, 6000);
  const T = layerTextures();
  T.grass = loadImageTexture(grassUrl); await T.grass.userData.promise;
  T.noise = noiseTexture(256, 7);
  T.plaster = plasterTexture([226, 210, 172], 11); T.plaster.repeat.set(0.45, 0.45); T.roof = roofTexture(5);
  const sky = makeSkyDome(T.noise); scene.add(sky);
  const P = opts.sky || {};
  const SKYP = { zen: P.zen ?? 0x3a74c2, hor: P.hor ?? 0xf0d0a6, gnd: P.gnd ?? 0x2a2622, sun: P.sunCol ?? 0xffd9a0, cloud: P.cloud ?? 0.32 };
  SKY.uZenith.value.set(SKYP.zen); SKY.uHorizon.value.set(SKYP.hor); SKY.uGround.value.set(SKYP.gnd); SKY.uSunCol.value.set(SKYP.sun); SKY.uCloud.value = SKYP.cloud;
  const sunDir = (opts.sunDir ? V3(...opts.sunDir) : V3(-0.55, 0.42, 0.72)).normalize(); SKY.uSunDir.value.copy(sunDir);
  { const tmp = new THREE.Scene(); tmp.add(makeSkyDome(T.noise)); const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(tmp, 0.03).texture; pm.dispose(); }
  scene.environmentIntensity = 0.45;
  scene.fog = new THREE.Fog(opts.fog ?? 0xe8cfae, 140, 900);
  const sun = new THREE.DirectionalLight(opts.sunLight ?? 0xffe2bd, opts.sunI ?? 3.4); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -22, near: 1, far: 220 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
  sun.position.copy(sunDir).multiplyScalar(90); scene.add(sun, sun.target); sun.target.position.set(0, 0, -4);
  const hemi = new THREE.HemisphereLight(0xbcd6ff, 0x6b5a44, 0.55); scene.add(hemi);
  const under = new THREE.DirectionalLight(0xdfe8ff, 0.0); under.position.set(2, 6, 20); scene.add(under, under.target);
  const hot = new THREE.PointLight(0xff9a3a, 0, 6, 2); scene.add(hot);
  const terrain = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), terrainMaterial(T)); terrain.rotation.x = -Math.PI / 2; terrain.position.y = -0.004; terrain.receiveShadow = true; scene.add(terrain);
  scene.add(makeHills());
  const trees = makeTreesV2(); scene.add(trees.group); trees.poplar.position.set(-21, 0, -24); trees.walnut.position.set(24, 0, -27);
  const neigh = makeNeighbours(T); scene.add(neigh);
  neigh.children.forEach(h => { if (Math.abs(h.position.x) < 25 && h.position.z > -20) h.position.z -= 9; });
  const composer = new EffectComposer(renderer); composer.setPixelRatio(1); composer.setSize(W, H);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.32, 0.5, 0.88); composer.addPass(bloom);
  composer.addPass(new OutputPass());
  { const _r = composer.render.bind(composer); composer.render = (...a) => { window.__cam = camera; animateWorkers(window.__vt ?? 0); if (window.__noRender) return; return _r(...a); }; }
  const R = { renderer, scene, camera, composer, bloom, sky, sun, hemi, under, hot, terrain, trees, neigh, T, SKYP };
  window.R = R;
  return R;
}

// ---------- kamera ----------
export function shotAt(SHOTS, t) { return SHOTS.find(s => t >= s.t0 && t < s.t1) || SHOTS[SHOTS.length - 1]; }
function cr(p0, p1, p2, p3, u) { const u2 = u * u, u3 = u2 * u; return 0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 + (-p0 + 3 * p1 - 3 * p2 + p3) * u3); }
const ev3 = (v, S) => typeof v === 'function' ? v(S) : (v.length === 1 && typeof v[0] === 'function' ? v[0](S) : v.map(c => typeof c === 'function' ? c(S) : c));
export function cameraAt(SHOTS, t, S, tb) {
  const s = shotAt(SHOTS, t);
  if (s.orbit) {
    const o = s.orbit, u = ease(seg(t, s.t0, s.t1)) * 0.6 + seg(t, s.t0, s.t1) * 0.4;
    const a = lerp(o.a0, o.a1, u);
    const k = o.r1 !== undefined ? ease(seg(t, s.t0 + (s.t1 - s.t0) * 0.45, s.t1)) : 0;
    const r = lerp(o.r, o.r1 ?? o.r, k), y = lerp(o.y, o.y1 ?? o.y, k);
    const c = o.c1 ? o.c.map((v, i) => lerp(v, o.c1[i], k)) : o.c;
    return { pos: V3(c[0] + Math.sin(a) * r, y, c[2] + Math.cos(a) * r), tgt: V3(...c), fov: o.fov || 40, s };
  }
  const k = s.keys.map(kk => [tb(kk[0]), ev3(kk[1], S), ev3(kk[2], S), kk[3]]);
  let i = 0; while (i < k.length - 2 && t > k[i + 1][0]) i++;
  const a = k[Math.max(0, i - 1)], b = k[i], c = k[Math.min(k.length - 1, i + 1)], d = k[Math.min(k.length - 1, i + 2)];
  const uu = (ease(seg(t, b[0], c[0])) + seg(t, b[0], c[0])) * 0.5;
  const P = [0, 1, 2].map(j => cr(a[1][j], b[1][j], c[1][j], d[1][j], uu));
  const Tg = [0, 1, 2].map(j => cr(a[2][j], b[2][j], c[2][j], d[2][j], uu));
  return { pos: V3(...P), tgt: V3(...Tg), fov: lerp(b[3], c[3], uu), s };
}
// kamera elhelyezése rázkódással + finom lebegéssel
export function placeCamera(R, cam, t, shake = 0) {
  const n1 = Math.sin(t * 97.3) + Math.sin(t * 61.7) * 0.6, n2 = Math.cos(t * 83.1) + Math.sin(t * 47.9) * 0.5;
  const dist = cam.pos.distanceTo(cam.tgt);
  const amp = shake * 0.012 * dist;
  const hx = Math.sin(t * 0.9) * 0.004 * dist, hy = Math.sin(t * 1.3 + 1) * 0.003 * dist;
  R.camera.position.copy(cam.pos).add(V3(n1 * amp + hx, n2 * amp + hy, 0));
  R.camera.lookAt(cam.tgt.clone().add(V3(n2 * amp * 0.5, n1 * amp * 0.5, 0)));
  R.camera.fov = cam.fov - Math.min(1, shake) * 1.0; R.camera.updateProjectionMatrix();
  return H / (2 * Math.tan(THREE.MathUtils.degToRad(R.camera.fov) / 2)); // pixel / (m @ 1 m)
}
// hős-mód (föld alatti körbejárás): sötét háttér, köd ki
export function heroMode(R, on) {
  R.scene.fog.near = on ? 1e5 : 140; R.scene.fog.far = on ? 2e5 : 900;
  if (on) { SKY.uHorizon.value.set(0x15120f); SKY.uGround.value.set(0x0c0a08); } else { SKY.uHorizon.value.set(R.SKYP.hor); SKY.uGround.value.set(R.SKYP.gnd); }
  GU.uHero.value = on ? 1 : 0;
}
export { SKY };
