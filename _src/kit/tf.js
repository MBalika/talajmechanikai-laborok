// Talajfelderítés – közös modellek: CPT-teherautó, lánctalpas kisgép, CPT-szondafej, izzás-sprite
import * as THREE from 'three';
import { M, box, cyl, cylX, cylZ, rod, setRod } from './parts.js';
import { shadowAll } from './models.js';
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------- izzó sprite (additív) ----------
let GT = null;
function glowTex() {
  if (GT) return GT; const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); GT = new THREE.CanvasTexture(c); return GT;
}
export function glowSprite(color = 0xffb04a, size = 0.6) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  s.scale.setScalar(size); s.renderOrder = 9; return s;
}

// ---------- CPT szondafej (csúcs lent, y=0; sugár r) ----------
export function buildCone(r = 0.05) {
  const g = new THREE.Group();
  // fémszürke, mérsékelten fényes acél (az erősen tükröző anyag a talaj színét verte vissza – áttetszőnek látszott)
  const steel = M(0xb4bcc4, { metalness: 0.45, roughness: 0.38 }), steel2 = M(0x98a1aa, { metalness: 0.45, roughness: 0.4 }), filt = M(0x6fb7d8, { roughness: 0.8 }), dark = M(0x2a2e33, { metalness: 0.4, roughness: 0.45 });
  const ch = r * 1.732; // 60°-os kúp
  const cone = new THREE.Mesh(new THREE.ConeGeometry(r, ch, 32), steel); cone.rotation.x = Math.PI; cone.position.y = ch / 2; g.add(cone);
  const fil = cyl(r, r, r * 0.35, filt, 0, ch + r * 0.175, 0, 32); g.add(fil);
  const gap1 = cyl(r * 0.97, r * 0.97, r * 0.6, steel2, 0, ch + r * 0.35 + r * 0.3, 0, 32); g.add(gap1);
  const sl0 = ch + r * 0.95, slL = r * 7.5;
  const sleeve = cyl(r, r, slL, steel, 0, sl0 + slL / 2, 0, 32); g.add(sleeve);
  const ring = cyl(r * 0.98, r * 0.98, r * 0.12, dark, 0, sl0 + slL + r * 0.06, 0, 32); g.add(ring);
  const body = cyl(r, r, r * 5, steel2, 0, sl0 + slL + r * 0.12 + r * 2.5, 0, 32); g.add(body);
  shadowAll(g);
  g.userData = { cone, fil, sleeve, body, ch, sl0, slL, top: sl0 + slL + r * 5.12, r };
  return g;
}

// ---------- CPT-teherautó (+x felé néz; a lenyomási pont a lokális (PX,0,0)) ----------
export function buildCPTTruck(o = {}) {
  const g = new THREE.Group();
  const white = M(o.body ?? 0xeef0f2, { roughness: 0.45 }), teal = M(o.stripe ?? 0x1f8f8a, { roughness: 0.5 }), dark = M(0x22252a, { roughness: 0.8 }), steel = M(0x9aa3ad, { metalness: 0.6, roughness: 0.35 });
  const glass = M(0x9fd2ff, { roughness: 0.08, metalness: 0.3, transparent: true, opacity: 0.6 }), yellow = M(0xf2b300, { roughness: 0.45 }), red = M(0xc8452b);
  const PX = -0.9;
  g.add(box(8.8, 0.35, 1.0, dark, 0, 0.95, 0));
  for (const x of [3.3, -1.7, -3.0]) for (const z of [1.02, -1.02]) { g.add(cylZ(0.53, 0.42, dark, x, 0.53, z, 20)); g.add(cylZ(0.25, 0.44, steel, x, 0.53, z, 12)); }
  // fülke
  const cab = new THREE.Group(); g.add(cab);
  cab.add(box(1.7, 1.85, 2.45, white, 3.65, 2.05, 0)); cab.add(box(0.08, 0.9, 2.2, glass, 4.5, 2.45, 0)); cab.add(box(1.0, 0.7, 0.04, glass, 3.75, 2.45, 1.235)); cab.add(box(1.0, 0.7, 0.04, glass, 3.75, 2.45, -1.235));
  cab.add(box(1.72, 0.18, 2.47, teal, 3.65, 1.55, 0)); cab.add(box(0.12, 0.35, 2.3, M(0x15171a), 4.52, 1.25, 0));
  // felépítmény: panelek (az elülső fal +z kivehető a metszethez)
  const BX0 = -4.4, BX1 = 2.7, BL = BX1 - BX0, BY0 = 1.2, BH = 2.9, BW = 2.5, cx = (BX0 + BX1) / 2;
  const body = new THREE.Group(); g.add(body);
  body.add(box(BL, 0.1, BW, M(0x5d646c), cx, BY0, 0));
  const roof = box(BL, 0.1, BW, white, cx, BY0 + BH, 0); body.add(roof);
  const back = box(BL, BH, 0.08, white, cx, BY0 + BH / 2, -BW / 2); body.add(back);
  const front = new THREE.Group(); body.add(front);
  front.add(box(BL, BH, 0.08, white, cx, BY0 + BH / 2, BW / 2)); front.add(box(BL + 0.02, 0.3, 0.1, teal, cx, BY0 + 0.6, BW / 2)); front.add(box(0.9, 1.9, 0.1, M(0xd8dcdf), 0.9, BY0 + 1.0, BW / 2 + 0.01));
  front.add(box(1.2, 0.6, 0.1, glass, -2.6, BY0 + 2.0, BW / 2 + 0.01));
  body.add(box(BL + 0.02, 0.3, 0.1, teal, cx, BY0 + 0.6, -BW / 2));
  body.add(box(0.08, BH, BW, white, BX0, BY0 + BH / 2, 0)); body.add(box(0.08, BH, BW, white, BX1, BY0 + BH / 2, 0));
  // szintező lábak
  const legs = []; for (const x of [-3.9, 2.2]) for (const z of [0.95, -0.95]) { const L = new THREE.Group(); L.position.set(x, 0.95, z); const tube = cyl(0.09, 0.09, 1, yellow, 0, -0.5, 0, 12); const pad = box(0.45, 0.06, 0.45, dark, 0, -1, 0); L.add(tube, pad); g.add(L); legs.push({ L, tube, pad }); }
  // lenyomó-berendezés (belül, PX-nél)
  const push = new THREE.Group(); push.position.set(PX, BY0, 0); g.add(push);
  for (const z of [-0.42, 0.42]) { push.add(cyl(0.09, 0.09, 2.4, M(0x2f6fb5, { metalness: 0.4, roughness: 0.4 }), 0, 1.25, z, 16)); push.add(cyl(0.05, 0.05, 2.4, steel, 0, 1.3, z, 10)); }
  push.add(box(0.35, 0.22, 1.1, M(0x2a2e33), 0, 2.55, 0));
  push.add(box(0.5, 0.12, 1.1, M(0x2a2e33), 0, 0.08, 0));
  const head = new THREE.Group(); push.add(head); head.add(box(0.36, 0.22, 1.0, red, 0, 0, 0)); head.add(cyl(0.08, 0.08, 0.3, steel, 0, 0, 0, 12));
  // rudak a falon (tartó)
  const rack = new THREE.Group(); g.add(rack);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 7; j++) rack.add(cylX(0.026, 1.0, steel, -2.9 + i * 0.0, BY0 + 1.0 + i * 0.07, -1.05 + j * 0.06, 8));
  rack.add(box(1.1, 0.06, 0.6, M(0x5d646c), -2.9, BY0 + 0.95, -0.9));
  // ellensúly
  for (let i = 0; i < 3; i++) g.add(box(0.8, 0.5, 1.6, M(0x3b4047, { metalness: 0.4 }), -3.7, BY0 + 0.3 + i * 0.52, -0.2));
  // kezelőpult + monitor
  const desk = new THREE.Group(); g.add(desk);
  desk.add(box(0.9, 0.08, 0.7, M(0x6b7178), 1.7, BY0 + 0.85, -0.75)); desk.add(box(0.06, 0.8, 0.6, M(0x6b7178), 1.7, BY0 + 0.45, -0.75));
  const scr = box(0.7, 0.45, 0.04, new THREE.MeshStandardMaterial({ color: 0x0b1a26, emissive: 0x1d6f9a, emissiveIntensity: 0.6 }), 1.7, BY0 + 1.2, -0.95); scr.rotation.x = 0.0; desk.add(scr);
  shadowAll(g);
  g.userData = { PX, body, front, roof, legs, push, head, BY0, cab };
  return g;
}
export function setTruckLegs(T, ext) { // ext 0..1: lábak a talajig
  for (const l of T.userData.legs) { const len = 0.25 + ext * 0.7; l.tube.scale.y = len; l.tube.position.y = -len / 2; l.pad.position.y = -len; }
}

// ---------- lánctalpas kisgép (+x előre), árboccal; mast: {h, x} ----------
export function buildCrawler(o = {}) {
  const g = new THREE.Group();
  const col = M(o.color ?? 0xe8a51c, { roughness: 0.5 }), dark = M(0x23262b, { roughness: 0.8 }), steel = M(0x9aa3ad, { metalness: 0.6, roughness: 0.35 });
  const L = o.len ?? 2.8, Wd = o.width ?? 1.6;
  for (const z of [Wd / 2 - 0.2, -Wd / 2 + 0.2]) { g.add(box(L, 0.42, 0.4, dark, 0, 0.21, z)); for (let i = 0; i < 5; i++) g.add(cylZ(0.15, 0.42, steel, -L / 2 + 0.3 + i * (L - 0.6) / 4, 0.21, z, 10)); }
  g.add(box(L * 0.92, 0.35, Wd - 0.3, col, 0, 0.6, 0));
  g.add(box(L * 0.45, 0.7, Wd - 0.4, col, -L * 0.22, 1.12, 0));
  g.add(box(0.5, 0.06, 0.5, dark, -L * 0.22, 1.5, 0));
  const mast = new THREE.Group(); mast.position.set(o.mastX ?? L / 2 - 0.05, 0.4, 0); g.add(mast);
  const H = o.mastH ?? 3.2;
  mast.add(box(0.18, H, 0.42, M(o.mastColor ?? 0x2b2f36, { metalness: 0.3 }), 0, H / 2, 0));
  mast.add(box(0.06, H, 0.06, steel, 0.12, H / 2, 0.16)); mast.add(box(0.06, H, 0.06, steel, 0.12, H / 2, -0.16));
  const carriage = new THREE.Group(); mast.add(carriage); carriage.add(box(0.36, 0.34, 0.5, M(o.headColor ?? 0xc8452b), 0.22, 0, 0));
  shadowAll(g);
  g.userData = { mast, carriage, H };
  return g;
}

// ---------- csavaros lehorgonyzó (spirál a talajban) ----------
export function buildScrewAnchor(L = 1.6) {
  const g = new THREE.Group(); const steel = M(0x8a9097, { metalness: 0.6, roughness: 0.35 });
  g.add(cyl(0.04, 0.04, L, steel, 0, -L / 2, 0, 10));
  for (let i = 0; i < 3; i++) { const h = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.02, 6, 20), steel); h.rotation.x = Math.PI / 2 + 0.25; h.position.y = -L + 0.15 + i * 0.25; g.add(h); }
  shadowAll(g); return g;
}

// ---------- spirálfúró-szakasz (1 m), csúcs lent y=0 ----------
import { helixRibbon } from './parts.js';
export function buildAugerSeg(len = 1.0, rOut = 0.07, rIn = 0.022, pitch = 0.09, opts = {}) {
  const g = new THREE.Group();
  const fm = opts.flightMat || M(0x8d949b, { metalness: 0.6, roughness: 0.35 }), cm = opts.coreMat || M(0x6b737b, { metalness: 0.6, roughness: 0.35 });
  const fl = new THREE.Mesh(helixRibbon(rIn, rOut, pitch, len / pitch * 0.97, opts.th ?? 0.012, 28), fm); fl.position.y = 0.02; fl.castShadow = true; g.add(fl);
  g.add(cyl(rIn, rIn, len, cm, 0, len / 2, 0, 12));
  g.add(cyl(rIn * 1.6, rIn * 1.6, 0.05, M(0x2b2f36, { metalness: 0.5 }), 0, len - 0.025, 0, 6)); // hatszög-kötés
  g.userData = { fl, fm }; return g;
}
export function buildBag(color = 0xf4f4f0) { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10).scale(1, 1.25, 0.8), M(color, { roughness: 0.4, transparent: true, opacity: 0.92 })); b.position.y = 0.13; b.castShadow = true; g.add(b); g.add(box(0.06, 0.04, 0.06, M(0xd8361e), 0, 0.28, 0)); return g; }

// ---------- tehergépkocsira szerelt fúrógép (+x előre; az árboc hátul, a fúrási pont lokális (FX,0,0)) ----------
export function buildDrillTruck(o = {}) {
  const g = new THREE.Group();
  const cabM = M(o.cab ?? 0x2f6fb5, { roughness: 0.45 }), dark = M(0x22252a, { roughness: 0.8 }), steel = M(0x9aa3ad, { metalness: 0.6, roughness: 0.35 }), yel = M(o.mast ?? 0xf2b300, { roughness: 0.45 });
  const glass = M(0x9fd2ff, { roughness: 0.08, metalness: 0.3, transparent: true, opacity: 0.6 });
  g.add(box(6.6, 0.4, 1.0, dark, 1.0, 0.95, 0));
  for (const x of [3.2, -0.6, -1.9]) for (const z of [1.0, -1.0]) { g.add(cylZ(0.52, 0.42, dark, x, 0.52, z, 20)); g.add(cylZ(0.24, 0.44, steel, x, 0.52, z, 12)); }
  g.add(box(1.8, 1.8, 2.4, cabM, 3.6, 2.0, 0)); g.add(box(0.08, 0.9, 2.2, glass, 4.5, 2.4, 0)); g.add(box(0.12, 0.35, 2.3, M(0x15171a), 4.52, 1.25, 0));
  g.add(box(4.2, 0.25, 2.3, M(0x5d646c, { metalness: 0.4 }), 0.6, 1.28, 0)); // plató
  g.add(box(1.6, 1.0, 1.6, cabM, 1.4, 1.9, 0)); // hidraulika-tápegység
  // támasztólábak
  const legs = []; for (const x of [-2.6, 2.4]) for (const z of [1.15, -1.15]) { const L = new THREE.Group(); L.position.set(x, 1.1, z); const tube = cyl(0.1, 0.1, 1, yel, 0, -0.5, 0, 12); const pad = box(0.5, 0.06, 0.5, dark, 0, -1, 0); L.add(tube, pad); g.add(L); legs.push({ L, tube, pad }); }
  // árboc (hátul, x = FX)
  const FX = -2.9, H = o.mastH ?? 7.0;
  const mast = new THREE.Group(); mast.position.set(FX - 0.45, 1.3, 0); g.add(mast);
  mast.add(box(0.36, H, 0.5, yel, 0, H / 2, 0)); mast.add(box(0.08, H, 0.08, steel, 0.24, H / 2, 0.18)); mast.add(box(0.08, H, 0.08, steel, 0.24, H / 2, -0.18));
  mast.add(box(0.6, 0.3, 0.6, M(0x2b2f36), 0.2, H + 0.1, 0));
  const head = new THREE.Group(); mast.add(head); head.add(box(0.7, 0.55, 0.65, M(0xc8452b, { roughness: 0.5 }), 0.42, 0, 0)); head.add(cyl(0.12, 0.12, 0.25, steel, 0.45, -0.38, 0, 14));
  shadowAll(g);
  g.userData = { FX, mast, head, legs, H };
  return g;
}
export function setRigLegs(T, ext) { for (const l of T.userData.legs) { const len = 0.25 + ext * 0.85; l.tube.scale.y = len; l.tube.position.y = -len / 2; l.pad.position.y = -len; } }

// ======================= Kézi (hordozható) fúrás – hiteles eszközök (2026-10-21) =======================
const _hs = (a, b) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
// Talajjal kitöltött spirál: alul menetes szakasz (len), a menetek közt talaj. setFill(L, colFn): a csúcstól L hosszon
// kitöltve, colFn(s) -> THREE.Color (s: távolság a csúcstól). A menetek éle kissé kilátszik a talajból.
export function buildFilledAuger(len = 1.0, rOut = 0.04, rIn = 0.016, pitch = 0.065, opts = {}) {
  const g = new THREE.Group();
  const steel = M(opts.flight ?? 0x8d949b, { metalness: 0.65, roughness: 0.32 }), core = M(0x5f666d, { metalness: 0.6, roughness: 0.4 });
  const s0 = opts.s0 ?? (opts.socket ? 0.15 : 0.05), s1 = opts.s1 ?? (len - 0.07), turns = (s1 - s0) / pitch;
  const fl = new THREE.Mesh(helixRibbon(rIn, rOut, pitch, turns, opts.th ?? 0.006, 40), steel); fl.position.y = s0; fl.castShadow = true; g.add(fl);
  if (!opts.noCore) g.add(cyl(rIn, rIn, len - 0.02, core, 0, len / 2 + 0.01, 0, 14));
  const tipK = opts.tip ?? 'small';
  if (tipK === 'small') { // csúcs: két csavart vágópenge + vezetőcsúcs („halfarok”)
    for (const s of [0, 1]) { const b = box(rOut * 1.6, 0.05, 0.007, steel, 0, 0.03, 0); b.rotation.y = s * Math.PI + 0.35; b.rotation.z = s ? -0.18 : 0.18; g.add(b); }
    { const p = new THREE.Mesh(new THREE.ConeGeometry(rIn * 0.9, 0.055, 4), steel); p.rotation.x = Math.PI; p.position.y = -0.012; p.castShadow = true; g.add(p); } }
  else if (tipK === 'fishtail') { const ft = buildFishtail(rOut); ft.position.y = 0.0; g.add(ft); }
  const dk = M(0x3a3f45, { metalness: 0.55, roughness: 0.35 });
  if (opts.hexA) { // hatszög-kötés: felül kiálló hatszög csap keresztfurattal, alul hatszögfészkes hüvely csapszeggel
    const rc = opts.hexA / Math.sqrt(3); const stub = cyl(rc, rc, 0.1, M(0x7e858c, { metalness: 0.7, roughness: 0.3 }), 0, len + 0.04, 0, 6); g.add(stub);
    g.add(cyl(rIn * 1.05, rIn * 1.05, 0.03, dk, 0, len - 0.005, 0, 18));
    if (opts.socket) { const rs = rc * 1.45; g.add(cyl(rs, rs, 0.13, dk, 0, 0.065, 0, 18)); const pin = cyl(0.009, 0.009, rs * 2 + 0.03, M(0xb9bec3, { metalness: 0.8, roughness: 0.25 }), 0, 0.06, 0, 10); pin.rotation.z = Math.PI / 2; g.add(pin);
      const ph = cyl(0.016, 0.016, 0.01, M(0xb9bec3, { metalness: 0.8, roughness: 0.25 }), rs + 0.015, 0.06, 0, 12); ph.rotation.z = Math.PI / 2; g.add(ph);
      const clip = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.0025, 6, 16), M(0xd8c23a, { metalness: 0.6, roughness: 0.35 })); clip.position.set(-rs - 0.012, 0.06, 0); clip.rotation.y = Math.PI / 2; g.add(clip);
      const pinG = new THREE.Group(); g.add(pinG); g.remove(pin); g.remove(ph); pinG.add(pin, ph); g.userData_pin = { pinG, clip, rs }; }
  } else if (opts.joint !== false) g.add(cyl(rIn * 1.4, rIn * 1.4, 0.07, dk, 0, len - 0.035, 0, 6)); // felső hatszög-kötés (kis spirál)
  // talajkitöltés: saját rácsháló, sorok alulról felfelé (drawRange-dzsel vágható)
  const flush = !!opts.flush; // flush: a talaj a furatfalig ér (a kitöltés sugara ≥ fillAbs), alul nincs elvékonyodás
  const sEnd = flush ? len + 0.002 : s1 + 0.02; // flush: a talaj a kötésen át is folytonos
  const NR = 22, ds = 0.006, sA = flush ? -0.002 : 0.008, NS = Math.ceil((sEnd - sA) / ds); const rf = opts.fillAbs ?? rOut * (opts.fillR ?? 0.92);
  const pos = new Float32Array((NS + 1) * (NR + 1) * 3), col = new Float32Array((NS + 1) * (NR + 1) * 3), jit = new Float32Array((NS + 1) * (NR + 1));
  for (let i = 0; i <= NS; i++) { const s = sA + i * ds; for (let j = 0; j <= NR; j++) { const th = (j % NR) / NR * Math.PI * 2; let ph = ((s - s0) - pitch * th / (Math.PI * 2)) / pitch; ph -= Math.floor(ph);
    const n = 0.55 * _hs(i, j % NR) + 0.45 * _hs(Math.floor(i / 3) + 17, Math.floor((j % NR) / 2) + 5) - 0.5;
    const r = flush ? rf * (0.975 + 0.035 * Math.sin(Math.PI * ph) + 0.016 * (n + 0.5)) : rf * (0.955 + 0.06 * Math.sin(Math.PI * ph)) * (1 + 0.07 * n) * (s < 0.045 ? 0.75 + 0.25 * s / 0.045 : 1);
    const k = i * (NR + 1) + j; pos[k * 3] = r * Math.cos(th); pos[k * 3 + 1] = s; pos[k * 3 + 2] = -r * Math.sin(th); jit[k] = 0.86 + 0.28 * _hs(i * 0.37 + 3, j % NR + 0.5) + 0.12 * n; } }
  const idx = []; for (let i = 0; i < NS; i++) for (let j = 0; j < NR; j++) { const a = i * (NR + 1) + j, b = a + NR + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.setIndex(idx); geo.computeVertexNormals();
  const fm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.97, metalness: 0, side: THREE.DoubleSide });
  const fill = new THREE.Mesh(geo, fm); fill.castShadow = true; fill.receiveShadow = true; g.add(fill);
  if (flush) { const bc = new THREE.Mesh(opts.capIn ? new THREE.RingGeometry(opts.capIn, rf * 1.02, NR) : new THREE.CircleGeometry(rf * 1.02, NR), new THREE.MeshStandardMaterial({ color: 0x5a4a3c, roughness: 0.98, side: THREE.DoubleSide })); bc.rotation.x = Math.PI / 2; bc.position.y = 0.001; g.add(bc); g.userData_bc = bc; }
  const cap = new THREE.Mesh(opts.capIn ? new THREE.RingGeometry(opts.capIn, rf * 1.02, NR) : new THREE.CircleGeometry(rf * (flush ? 1.02 : 0.97), NR), new THREE.MeshStandardMaterial({ color: 0x6b5e50, roughness: 0.98, side: THREE.DoubleSide })); cap.rotation.x = -Math.PI / 2; g.add(cap);
  const _c = new THREE.Color();
  g.userData = { fl, fill, cap, len, rOut, rIn, s0, s1, pitch, kind: 'auger', pin: g.userData_pin,
    setFill(L, colFn) {
      const rows = Math.max(0, Math.min(NS, Math.round((Math.min(L, sEnd) - sA) / ds)));
      fill.visible = rows > 0; cap.visible = rows > 0 && L < (flush ? len - 0.01 : s1); geo.setDrawRange(0, rows * NR * 6); if (g.userData_bc) { g.userData_bc.visible = rows > 0; if (rows) { colFn(0, _c); g.userData_bc.material.color.copy(_c).multiplyScalar(0.85); } }
      if (!rows) return;
      for (let i = 0; i <= rows; i++) { const s = sA + i * ds; colFn(s, _c); for (let j = 0; j <= NR; j++) { const k = i * (NR + 1) + j, f = jit[k]; col[k * 3] = _c.r * f; col[k * 3 + 1] = _c.g * f; col[k * 3 + 2] = _c.b * f; } }
      geo.attributes.color.needsUpdate = true; geo.attributes.color.clearUpdateRanges?.();
      cap.position.y = sA + rows * ds; colFn(Math.max(0, L - 0.01), _c); cap.material.color.copy(_c).multiplyScalar(0.9);
    } };
  return g;
}
// Tömör toldórúd (fúrórudazat): len hossz, felül hatszög-kötés, alul menetes csonk
export function buildExtRod(len = 1.0, r = 0.014) {
  const g = new THREE.Group(); const st = M(0x666d74, { metalness: 0.62, roughness: 0.36 }), cp = M(0x3a3f45, { metalness: 0.55, roughness: 0.35 });
  g.add(cyl(r, r, len - 0.06, st, 0, (len - 0.06) / 2 + 0.03, 0, 12)); g.add(cyl(r * 1.55, r * 1.55, 0.07, cp, 0, len - 0.035, 0, 6)); g.add(cyl(r * 0.8, r * 0.8, 0.04, st, 0, 0.02, 0, 10));
  g.userData = { len, kind: 'rod' }; shadowAll(g); return g;
}
// Borro-típusú kisfúrógép: középen öntött hajtóműház átmenő orsóval és felső rúdrögzítővel, egyik oldalán kis
// kétütemű motor (berántó, üzemanyagtartály, kipufogó), két oldalán fogantyúkeret. Origó: az orsó tengelye a ház közepén.
// userData.grips: { L: [V3, V3] (−x oldali keret két fogása), R: [V3, V3] (+x oldali keret) }
export function buildBorroHead(o = {}) {
  const g = new THREE.Group();
  const alu = M(0x8f959b, { metalness: 0.45, roughness: 0.48 }), alu2 = M(0xa7adb3, { metalness: 0.45, roughness: 0.42 }), dk = M(0x2c3036, { metalness: 0.35, roughness: 0.55 });
  const steel = M(0xb9bec3, { metalness: 0.75, roughness: 0.28 }), rub = M(0x17191c, { roughness: 0.85 });
  const eng = M(o.engine ?? 0xe7e4dc, { roughness: 0.5 }), engO = M(o.accent ?? 0xe8661c, { roughness: 0.45 }), tank = M(0xe9e0c4, { roughness: 0.35, transparent: true, opacity: 0.86 });
  // hajtóműház
  g.add(box(0.30, 0.15, 0.22, alu, 0, 0, 0)); g.add(box(0.27, 0.025, 0.19, alu2, 0, 0.087, 0));
  for (const x of [-0.12, 0.12]) for (const z of [-0.085, 0.085]) g.add(cyl(0.009, 0.009, 0.012, steel, x, 0.104, z, 6));
  g.add(cyl(0.055, 0.06, 0.055, alu2, 0, 0.125, 0, 20)); // orsóház
  g.add(cyl(0.034, 0.034, 0.07, dk, 0, 0.185, 0, 6)); // rúdrögzítő (tokmány)
  { const tb_ = box(0.07, 0.016, 0.016, steel, 0.05, 0.19, 0); g.add(tb_); g.add(box(0.016, 0.03, 0.016, rub, 0.087, 0.19, 0)); } // szorítócsavar
  g.add(cyl(0.045, 0.05, 0.045, alu2, 0, -0.097, 0, 20)); // alsó orsóperem
  // köztes áttétel a motor felé
  g.add(box(0.1, 0.12, 0.15, alu, 0.19, 0.0, 0)); { const _m = cyl(0.045, 0.045, 0.04, alu2, 0.245, 0.0, 0, 16); _m.rotation.z = Math.PI / 2; g.add(_m); }
  // kétütemű motor (+x)
  const E = new THREE.Group(); E.position.set(0.37, 0.01, 0); g.add(E);
  E.add(box(0.19, 0.14, 0.15, eng, 0, 0, 0)); // motorház
  E.add(box(0.17, 0.06, 0.155, engO, 0.005, 0.098, 0)); { const _m = cyl(0.077, 0.077, 0.155, engO, 0.005, 0.105, 0, 18, true); _m.rotation.x = Math.PI / 2; E.add(_m); } // felső burkolat (lekerekített)
  E.children[E.children.length - 1].scale.set(1, 1, 0.45);
  for (let k = 0; k < 5; k++) E.add(box(0.004, 0.08, 0.13, dk, -0.06 + k * 0.03, 0.02, 0)); // hűtőbordák rése
  { const _m = cyl(0.062, 0.062, 0.03, eng, 0.0, 0.0, 0.088, 22); _m.rotation.x = Math.PI / 2; E.add(_m); } { const _m = cyl(0.045, 0.045, 0.032, dk, 0.0, 0.0, 0.09, 18); _m.rotation.x = Math.PI / 2; E.add(_m); } // berántó
  E.add(box(0.06, 0.016, 0.02, rub, 0.0, 0.035, 0.112)); // berántó fogantyú
  E.add(box(0.12, 0.075, 0.13, tank, 0.02, -0.105, 0)); E.add(cyl(0.017, 0.017, 0.02, dk, 0.06, -0.06, 0.05, 10)); // tank + tanksapka
  E.add(box(0.07, 0.085, 0.05, dk, 0.03, -0.005, -0.1)); E.add(box(0.075, 0.09, 0.006, steel, 0.03, -0.005, -0.128)); // kipufogó + hővédő
  E.add(box(0.07, 0.05, 0.1, engO, 0.075, 0.06, 0.02)); // légszűrő-fedél
  E.add(cyl(0.008, 0.008, 0.03, dk, -0.03, 0.15, 0.0, 6)); // gyertyapipa
  // fogantyúkeretek
  const tube = (a, b) => { const m = rod(V(a[0], a[1], a[2]), V(b[0], b[1], b[2]), 0.0125, steel, 10); g.add(m); };
  const grips = { L: [], R: [] };
  // −x keret: a hajtóműház oldaláról kifelé, végén z irányú markolat
  { const y = 0.03, xe = -0.6; tube([-0.15, y, 0.085], [xe + 0.03, y, 0.13]); tube([-0.15, y, -0.085], [xe + 0.03, y, -0.13]); tube([xe, y, -0.15], [xe, y, 0.15]);
    for (const z of [-0.105, 0.105]) { const m = cyl(0.017, 0.017, 0.09, rub, xe, y, z, 12); m.rotation.x = Math.PI / 2; g.add(m); grips.L.push(V(xe, y, z)); } }
  // +x keret: a motoron túl, gázkarral
  { const y = 0.04, xe = 0.7; tube([0.25, y, 0.09], [xe - 0.03, y, 0.13]); tube([0.25, y, -0.09], [xe - 0.03, y, -0.13]); tube([xe, y, -0.15], [xe, y, 0.15]);
    tube([0.3, -0.07, 0.09], [0.3, y, 0.09]); tube([0.3, -0.07, -0.09], [0.3, y, -0.09]);
    for (const z of [-0.105, 0.105]) { const m = cyl(0.017, 0.017, 0.09, rub, xe, y, z, 12); m.rotation.x = Math.PI / 2; g.add(m); grips.R.push(V(xe, y, z)); }
    g.add(box(0.022, 0.03, 0.05, M(0xc8281e, { roughness: 0.5 }), xe - 0.01, y - 0.028, 0.1)); }
  shadowAll(g); g.userData = { grips, engine: E }; return g;
}
// Földön álló hidraulikus rúdkiemelő (palackemelő + szorítópofa a tömör rúdon). Origó a talpon; a rúd tengelye x = +RX.
// setRam(e): dugattyú-kinyúlás 0–0,36 m; setLever(a): pumpakar szöge (0–1); setJaw(open 0/1)
export function buildRodJack(o = {}) {
  const g = new THREE.Group(); const RX = 0.2;
  const red = M(o.color ?? 0xc0281e, { roughness: 0.45 }), steel = M(0xb7bcc1, { metalness: 0.8, roughness: 0.22 }), dk = M(0x2c3036, { metalness: 0.45, roughness: 0.5 }), plate = M(0x4a5056, { metalness: 0.5, roughness: 0.55 });
  g.add(box(0.27, 0.022, 0.26, plate, 0.0, 0.011, 0)); g.add(box(0.17, 0.05, 0.17, red, 0, 0.047, 0));
  g.add(cyl(0.058, 0.058, 0.23, red, 0, 0.187, 0, 22)); g.add(cyl(0.064, 0.064, 0.02, red, 0, 0.3, 0, 22));
  g.add(cyl(0.017, 0.017, 0.05, dk, -0.085, 0.1, 0.03, 10)); g.add(cyl(0.012, 0.012, 0.02, steel, 0.07, 0.08, 0.06, 8)); // pumpacsonk, leeresztőcsavar
  const ram = cyl(0.031, 0.031, 1, steel, 0, 0, 0, 18); g.add(ram);
  const Y = new THREE.Group(); g.add(Y); // emelőkar + pofa
  Y.add(box(0.11, 0.035, 0.1, dk, 0, 0.0, 0)); Y.add(box(RX + 0.02, 0.04, 0.06, dk, RX / 2, 0.02, 0));
  const jaw = new THREE.Group(); jaw.position.set(RX, 0.02, 0); Y.add(jaw);
  jaw.add(box(0.03, 0.09, 0.085, red, -0.032, 0, 0)); jaw.add(box(0.03, 0.09, 0.085, red, 0.032, 0, 0)); jaw.add(box(0.095, 0.02, 0.02, dk, 0, 0.03, 0.045)); jaw.add(box(0.095, 0.02, 0.02, dk, 0, -0.03, 0.045));
  const cam = box(0.016, 0.016, 0.12, steel, 0.06, 0.035, 0.03); cam.rotation.y = 0.5; jaw.add(cam);
  const lever = new THREE.Group(); lever.position.set(-0.085, 0.12, 0.03); g.add(lever);
  { const L = 0.62; const m = cyl(0.012, 0.012, L, steel, 0, L / 2, 0, 10); lever.add(m); lever.add(cyl(0.018, 0.018, 0.12, M(0x17191c, { roughness: 0.85 }), 0, L - 0.06, 0, 10)); }
  shadowAll(g);
  const api = { RX, ram, Y, jaw, lever,
    setRam(e) { const h = 0.05 + e; ram.scale.y = h; ram.position.y = 0.31 + h / 2; Y.position.y = 0.31 + h + 0.017; },
    jawY(e) { return 0.31 + 0.05 + e + 0.017 + 0.02; },
    setLever(a) { lever.rotation.set(0, 0, 0); lever.rotateY(o.leverYaw ?? 2.3); lever.rotateZ(0.5 + 0.55 * a); },
    leverTip() { lever.updateWorldMatrix(true, false); return lever.localToWorld(new THREE.Vector3(0, 0.56, 0)); } };
  api.setRam(0); api.setLever(0); g.userData = api; return g;
}
// Egyszemélyes benzinmotoros talajfúró (felül motor, alatta hajtómű, széles fogantyú). Origó: a hajtómű alsó csonkja (a fúrószár teteje).
// userData.grips: [V3 bal (+x), V3 jobb (−x)] – a −z oldalon álló kezelőnek
export function buildEarthAuger(o = {}) {
  const g = new THREE.Group();
  const eng = M(0xe9e7e1, { roughness: 0.5 }), engO = M(o.accent ?? 0xef6a1c, { roughness: 0.45 }), dk = M(0x2c3036, { metalness: 0.35, roughness: 0.5 }), steel = M(0xb9bec3, { metalness: 0.75, roughness: 0.28 }), rub = M(0x17191c, { roughness: 0.85 }), tank = M(0xe9e0c4, { roughness: 0.35, transparent: true, opacity: 0.86 });
  g.add(cyl(0.03, 0.03, 0.06, dk, 0, 0.03, 0, 6)); g.add(cyl(0.06, 0.07, 0.14, M(0x7c838a, { metalness: 0.45, roughness: 0.45 }), 0, 0.13, 0, 20)); // hajtómű
  const E = new THREE.Group(); E.position.set(0, 0.3, 0.02); g.add(E);
  E.add(box(0.2, 0.15, 0.18, eng, 0, 0, 0)); E.add(box(0.2, 0.06, 0.19, engO, 0, 0.1, 0)); E.add(box(0.12, 0.07, 0.12, tank, 0.0, -0.1, 0.05));
  { const _m = cyl(0.06, 0.06, 0.03, eng, 0.115, 0.0, 0.0, 20); _m.rotation.z = Math.PI / 2; E.add(_m); } E.add(box(0.016, 0.02, 0.06, rub, 0.135, 0.03, 0));
  E.add(box(0.05, 0.08, 0.07, dk, -0.12, 0.0, 0.03)); E.add(box(0.006, 0.09, 0.08, steel, -0.148, 0.0, 0.03));
  for (let k = 0; k < 4; k++) E.add(box(0.004, 0.07, 0.16, dk, -0.06 + k * 0.04, 0.02, 0));
  const tube = (a, b) => g.add(rod(V(...a), V(...b), 0.0125, steel, 10));
  const y = 0.2, z = -0.17, xe = 0.33;
  tube([-xe, y, z], [xe, y, z]); tube([0.05, 0.12, -0.05], [0.16, y, z]); tube([-0.05, 0.12, -0.05], [-0.16, y, z]); tube([-xe, y, z], [-xe, y, 0.04]); tube([xe, y, z], [xe, y, 0.04]);
  const grips = [];
  for (const x of [0.27, -0.27]) { const m = cyl(0.017, 0.017, 0.1, rub, x, y, z, 12); m.rotation.z = Math.PI / 2; g.add(m); grips.push(V(x, y, z)); }
  g.add(box(0.03, 0.022, 0.04, M(0xc8281e), -0.25, y - 0.025, z)); shadowAll(g);
  g.userData = { grips, engine: E }; return g;
}
// Kézi hidraulikus bontókalapács (a magcső verőfejére). Origó a szerszám csúcsa; markolat a T-fogantyún (z irányú).
export function buildBreaker() {
  const g = new THREE.Group(); const dk = M(0x2c3036, { metalness: 0.4, roughness: 0.5 }), yel = M(0xe8a31b, { roughness: 0.45 }), steel = M(0xb9bec3, { metalness: 0.75, roughness: 0.28 }), rub = M(0x17191c, { roughness: 0.85 });
  g.add(cyl(0.02, 0.02, 0.1, steel, 0, 0.05, 0, 8)); g.add(cyl(0.05, 0.05, 0.05, dk, 0, 0.125, 0, 16)); g.add(cyl(0.065, 0.07, 0.34, yel, 0, 0.32, 0, 20)); g.add(cyl(0.05, 0.05, 0.05, dk, 0, 0.515, 0, 16));
  g.add(box(0.05, 0.05, 0.42, dk, 0, 0.56, 0)); const grips = [];
  for (const z of [-0.17, 0.17]) { const m = cyl(0.02, 0.02, 0.1, rub, 0, 0.56, z, 12); m.rotation.x = Math.PI / 2; g.add(m); grips.push(V(0, 0.56, z)); }
  for (const s of [-1, 1]) { const hs = rod(V(0.06, 0.43, s * 0.03), V(0.32, 0.12, s * 0.06), 0.012, rub, 8); g.add(hs); }
  shadowAll(g); g.userData = { grips }; return g;
}

// ---------- halfarkú vezetőcsúcs (két csavart, hegyes keményfém lebeny + középső vezetőhegy) – a spirál alján ----------
export function buildFishtail(r = 0.09) {
  const g = new THREE.Group(); const hard = M(0x7d848a, { metalness: 0.6, roughness: 0.5 }), dk = M(0x3a3f45, { metalness: 0.55, roughness: 0.35 });
  const sh = new THREE.Shape(); sh.moveTo(0, 0.03); sh.lineTo(r * 0.96, 0.03); sh.quadraticCurveTo(r * 0.95, -0.05, r * 0.25, -0.13 * r / 0.09); sh.lineTo(0, -0.07 * r / 0.09); sh.lineTo(0, 0.03);
  const geo = new THREE.ExtrudeGeometry(sh, { depth: Math.max(0.006, r * 0.11), bevelEnabled: true, bevelSize: 0.002, bevelThickness: 0.002, bevelSegments: 1 }); geo.translate(0, 0, -r * 0.055);
  for (const k of [0, 1]) { const m = new THREE.Mesh(geo, hard); m.rotation.y = k * Math.PI; const p = new THREE.Group(); p.add(m); p.rotation.y = 0.5; m.rotation.x = (k ? -1 : 1) * 0.28; m.castShadow = true; g.add(p); }
  { const p = new THREE.Mesh(new THREE.ConeGeometry(r * 0.2, 0.09 * r / 0.09, 6), hard); p.rotation.x = Math.PI; p.position.y = -0.11 * r / 0.09; p.castShadow = true; g.add(p); }
  g.add(cyl(r * 0.42, r * 0.36, 0.05, dk, 0, 0.045, 0, 16));
  for (const k of [0, 1]) { const t = box(r * 0.35, 0.03, 0.02, hard, 0, -0.005, 0); t.position.set(Math.cos(k * Math.PI + 0.5) * r * 0.78, -0.01, -Math.sin(k * Math.PI + 0.5) * r * 0.78); t.rotation.y = k * Math.PI + 0.5; t.rotation.z = 0.5; g.add(t); }
  return g;
}
// ---------- vágóél-típusok a bemutatóhoz (fekvő helyzetben, tengely +x felé, hátul hatszög csap) ----------
export function buildCutHead(kind, r = 0.09) {
  const g = new THREE.Group(); const hard = M(0xc9ced3, { metalness: 0.85, roughness: 0.22 }), body = M(0x40464d, { metalness: 0.55, roughness: 0.38 }), steel = M(0x8d949b, { metalness: 0.65, roughness: 0.32 });
  const ax = new THREE.Group(); ax.rotation.z = -Math.PI / 2; g.add(ax); // ax: helyi +y = a csúcs iránya (+x a világban)
  const rc = 0.055 / Math.sqrt(3); { const st = cyl(rc, rc, 0.1, M(0x7e858c, { metalness: 0.7, roughness: 0.3 }), 0, -0.1, 0, 6); ax.add(st); ax.add(cyl(rc * 1.45, rc * 1.45, 0.12, body, 0, -0.0, 0, 18)); }
  if (kind === 'claw') { // karmos: rövid spirálmenet, rajta két karom-fog, elöl halfarkú csúcs
    const f = new THREE.Mesh(helixRibbon(0.035, r, 0.16, 1.1, 0.012, 40), steel); f.rotation.x = Math.PI; f.position.y = 0.24; ax.add(f); ax.add(cyl(0.035, 0.035, 0.24, body, 0, 0.12, 0, 16));
    for (const k of [0, 1]) { const t = box(0.03, 0.06, 0.035, hard, Math.cos(k * Math.PI) * r * 0.82, 0.25, Math.sin(k * Math.PI) * r * 0.82); t.rotation.y = k * Math.PI; t.rotation.z = (k ? 1 : -1) * 0.45; ax.add(t); }
    const ft = buildFishtail(r); ft.rotation.x = Math.PI; ft.position.y = 0.28; ax.add(ft);
  } else if (kind === 'crown') { // fogas korona: rövid cső peremén csapos (kúpos keményfém) fogak, középen vezetőhegy
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.2, 28, 1, true), new THREE.MeshStandardMaterial({ color: 0x40464d, metalness: 0.55, roughness: 0.38, side: THREE.DoubleSide })); tube.position.y = 0.14; ax.add(tube);
    ax.add(cyl(r, r, 0.02, body, 0, 0.05, 0, 28));
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const hold = box(0.035, 0.05, 0.03, body, Math.cos(a) * r, 0.25, Math.sin(a) * r); hold.rotation.y = -a; ax.add(hold);
      const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.045, 10), hard); tooth.position.set(Math.cos(a) * r, 0.295, Math.sin(a) * r); tooth.rotation.z = (i % 2 ? 0.25 : -0.25); ax.add(tooth); }
    const pil = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.12, 8), hard); pil.position.y = 0.3; ax.add(pil); ax.add(cyl(0.03, 0.03, 0.2, body, 0, 0.15, 0, 12));
  } else { // kúpos, betétes: kúpos fej, felületén keményfém gombok, spirális sorokban
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.02, r, 0.26, 28), body); cone.position.y = 0.15; ax.add(cone);
    for (let i = 0; i < 26; i++) { const u = i / 26, a = u * Math.PI * 2 * 2.6, h = 0.03 + u * 0.24, rr = r + (0.02 - r) * (h - 0.02) / 0.26;
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.0085, 8, 6), hard); b.position.set(Math.cos(a) * rr, h, Math.sin(a) * rr); ax.add(b); }
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), hard); tip.position.y = 0.285; ax.add(tip);
  }
  shadowAll(g); return g;
}
// ---------- lapát ----------
export function buildShovel() {
  const g = new THREE.Group(); const wood = M(0x9a7550, { roughness: 0.7 }), steel = M(0x5e6670, { metalness: 0.6, roughness: 0.4 });
  g.add(cyl(0.017, 0.017, 1.0, wood, 0, 0.62, 0, 10)); g.add(box(0.13, 0.02, 0.025, M(0x17191c), 0, 1.13, 0));
  const bl = box(0.23, 0.29, 0.012, steel, 0, 0.14, 0); bl.rotation.x = -0.12; g.add(bl); g.add(cyl(0.024, 0.02, 0.09, steel, 0, 0.32, -0.01, 10));
  shadowAll(g); g.userData = { grips: [V(0, 1.1, 0), V(0, 0.62, 0)] }; return g;
}

// ======================= Valósághű fúrógépek (2026-10-21) =======================
function wheel(r = 0.48, w = 0.26, rimC = 0xd9dcdf) {
  const g = new THREE.Group(); const rub = M(0x1a1c1f, { roughness: 0.92 }), rim = M(rimC, { metalness: 0.45, roughness: 0.35 }), hub = M(0x55595e, { metalness: 0.6, roughness: 0.35 });
  const tor = new THREE.Mesh(new THREE.TorusGeometry(r - w * 0.32, w * 0.32, 12, 40), rub); g.add(tor);
  const tr = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w * 0.72, 40, 1), rub); tr.rotation.x = Math.PI / 2; g.add(tr);
  for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; const l = box(0.045, 0.03, w * 0.7, M(0x141618, { roughness: 0.95 }), Math.cos(a) * (r + 0.004), Math.sin(a) * (r + 0.004), 0); l.rotation.z = a; g.add(l); }
  for (const s of [-1, 1]) { const d = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.56, r * 0.56, 0.02, 30), rim); d.rotation.x = Math.PI / 2; d.position.z = s * w * 0.3; g.add(d);
    const h = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.2, r * 0.2, 0.05, 16), hub); h.rotation.x = Math.PI / 2; h.position.z = s * w * 0.33; g.add(h);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; const n = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.03, 6), hub); n.rotation.x = Math.PI / 2; n.position.set(Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.3, s * w * 0.35); g.add(n); } }
  shadowAll(g); return g;
}
// Tehergépkocsira szerelt fúrógép: fülkés (cab-over) alváz, platón tápegység, tartályok, spirál-tároló; hátul árboc forgatófejjel,
// talpbilinccsel, alvázhoz rögzített hidraulikus támasztólábakkal. +x előre; a fúrás tengelye lokális (FX, 0, 0).
// userData: { FX, mast, head, legs, H, panel } – a head az árboc helyi y mentén mozog; a forgatófej orsójának alja head.y − 0,5.
export function buildDrillTruck2(o = {}) {
  const g = new THREE.Group();
  const cabC = o.cab ?? 0xeeeeea, bodyC = o.body ?? 0x2f8a5e;
  const cabM = M(cabC, { roughness: 0.35, metalness: 0.15 }), dark = M(0x23262b, { roughness: 0.7 }), frame = M(0x2a2d32, { metalness: 0.4, roughness: 0.55 }), steel = M(0x9aa3ad, { metalness: 0.6, roughness: 0.35 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x1c2833, metalness: 0.6, roughness: 0.08 }), bodyM = M(bodyC, { roughness: 0.5 }), red = M(0xc8281e, { roughness: 0.45 }), mastM = M(o.mast ?? 0x8f969d, { metalness: 0.45, roughness: 0.45 });
  const FX = -3.45, H = o.mastH ?? 7.0;
  // alváz
  for (const z of [-0.43, 0.43]) g.add(box(6.3, 0.2, 0.08, frame, 0.1, 0.78, z));
  for (const x of [-2.9, -1.6, -0.3, 1.0, 2.3]) g.add(box(0.08, 0.14, 0.86, frame, x, 0.8, 0));
  // kerekek: első szimpla, hátsó iker
  const FA = 2.55, RA = -0.75;
  for (const z of [-1.0, 1.0]) { const w = wheel(0.48, 0.28); w.position.set(FA, 0.48, z); g.add(w); }
  for (const z of [-1.0, -0.72, 0.72, 1.0]) { const w = wheel(0.48, 0.26); w.position.set(RA, 0.48, z); g.add(w); }
  g.add(cylZ(0.07, 2.0, frame, FA, 0.48, 0, 12)); g.add(cylZ(0.09, 1.7, frame, RA, 0.48, 0, 14)); g.add(box(0.3, 0.28, 0.32, frame, RA, 0.48, 0));
  for (const z of [-1, 1]) { g.add(box(0.72, 0.05, 0.62, dark, RA, 1.02, z * 0.86)); g.add(box(0.02, 0.34, 0.5, M(0x111214, { roughness: 0.9 }), RA - 0.4, 0.62, z * 0.86)); }
  // üzemanyagtartály, akkumulátor, légtartály
  g.add(cylX(0.22, 0.75, M(0x9aa1a8, { metalness: 0.6, roughness: 0.3 }), 0.9, 0.62, -0.72, 18)); g.add(box(0.5, 0.3, 0.3, dark, 0.95, 0.6, 0.72)); g.add(cylX(0.11, 0.6, frame, 0.25, 0.6, 0.62, 12));
  // fülke (oldalnézeti profil extrudálva)
  { const sh = new THREE.Shape(); sh.moveTo(1.72, 0.98); sh.lineTo(3.32, 0.98); sh.lineTo(3.34, 1.6); sh.lineTo(3.18, 2.62); sh.quadraticCurveTo(3.12, 2.84, 2.9, 2.86); sh.lineTo(1.78, 2.86); sh.quadraticCurveTo(1.72, 2.86, 1.72, 2.78); sh.lineTo(1.72, 0.98);
    const geo = new THREE.ExtrudeGeometry(sh, { depth: 2.24, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 3 }); geo.translate(0, 0, -1.12); const cab = new THREE.Mesh(geo, cabM); cab.castShadow = true; g.add(cab); }
  { const ws = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.98), glass); ws.position.set(3.27, 2.12, 0); ws.rotation.y = Math.PI / 2; ws.rotateX(-0.155); g.add(ws); }
  for (const s of [-1, 1]) { const ws = new THREE.Shape(); ws.moveTo(2.12, 1.76); ws.lineTo(3.12, 1.76); ws.lineTo(2.99, 2.56); ws.lineTo(2.12, 2.56); ws.lineTo(2.12, 1.76);
    const m = new THREE.Mesh(new THREE.ShapeGeometry(ws), glass); m.position.z = s * 1.165; if (s < 0) m.rotation.y = Math.PI, m.position.x = 0, m.scale.x = -1; g.add(m);
    g.add(box(0.012, 1.55, 0.01, dark, 2.06, 1.82, s * 1.166)); g.add(box(0.012, 1.55, 0.01, dark, 3.18, 1.82, s * 1.166)); g.add(box(0.06, 0.02, 0.012, dark, 2.95, 1.55, s * 1.17));
    g.add(rod(V(3.2, 2.45, s * 1.12), V(3.32, 2.45, s * 1.32), 0.012, dark, 6)); g.add(box(0.06, 0.32, 0.16, dark, 3.32, 2.3, s * 1.36));
    g.add(box(0.5, 0.04, 0.22, dark, 2.85, 0.62, s * 1.08)); g.add(box(0.5, 0.04, 0.22, dark, 2.85, 0.88, s * 1.08));
    const fd = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.34, 24, 1, true, -Math.PI / 2, Math.PI), M(0x1d1f22, { roughness: 0.85, side: THREE.DoubleSide })); fd.rotation.x = Math.PI / 2; fd.position.set(FA, 0.5, s * 1.0); g.add(fd); }
  g.add(box(0.2, 0.3, 2.36, M(0x3b3f45, { roughness: 0.6 }), 3.38, 0.82, 0)); // lökhárító
  g.add(box(0.03, 0.34, 1.3, M(0x2a2d32, { roughness: 0.6 }), 3.35, 1.3, 0)); for (let i = 0; i < 5; i++) g.add(box(0.035, 0.025, 1.24, M(0x8c9196, { metalness: 0.5 }), 3.36, 1.17 + i * 0.065, 0));
  for (const s of [-1, 1]) { g.add(box(0.03, 0.14, 0.34, M(0xf4f2e6, { emissive: 0xfff4d0, emissiveIntensity: 0.4 }), 3.47, 0.9, s * 0.86)); g.add(box(0.03, 0.08, 0.1, M(0xff9a1f, { emissive: 0xff8a00, emissiveIntensity: 0.3 }), 3.47, 0.9, s * 1.1)); }
  g.add(box(0.12, 0.05, 0.9, M(0xff9a1f, { emissive: 0xff8a00, emissiveIntensity: 0.25 }), 2.6, 2.92, 0)); // tetőlámpák
  // plató lehajtható oldalfalakkal
  const B0 = -2.72, B1 = 1.62;
  g.add(box(B1 - B0, 0.12, 2.3, frame, (B0 + B1) / 2, 1.04, 0));
  for (const s of [-1, 1]) g.add(box(B1 - B0, 0.38, 0.05, bodyM, (B0 + B1) / 2, 1.29, s * 1.13)); g.add(box(0.05, 0.38, 2.3, bodyM, B1, 1.29, 0));
  for (const s of [-1, 1]) for (let i = 1; i < 5; i++) g.add(box(0.03, 0.38, 0.06, M(0x24704b), B0 + i * (B1 - B0) / 5, 1.29, s * 1.15));
  // tápegység (motor + hűtő), vörös tartályok, olajtartály
  g.add(box(0.9, 0.72, 0.85, M(0x4d535a, { metalness: 0.3, roughness: 0.5 }), 0.95, 1.46, -0.55)); g.add(box(0.05, 0.6, 0.7, M(0x16181b), 1.42, 1.46, -0.55)); g.add(cyl(0.05, 0.05, 0.75, steel, 0.6, 2.1, -0.85, 10)); g.add(cyl(0.065, 0.065, 0.06, dark, 0.6, 2.48, -0.85, 10));
  { const tk = cylZ(0.34, 1.05, red, 0.05, 1.5, 0.5, 26); g.add(tk); g.add(box(0.12, 0.2, 1.0, frame, -0.2, 1.2, 0.5)); g.add(box(0.12, 0.2, 1.0, frame, 0.3, 1.2, 0.5)); g.add(cyl(0.06, 0.06, 0.05, dark, 0.05, 1.86, 0.5, 12)); }
  g.add(box(0.6, 0.55, 0.55, red, -0.55, 1.38, -0.62)); g.add(cyl(0.05, 0.05, 0.05, dark, -0.55, 1.68, -0.62, 10));
  // spirál-tároló állvány a platón (fekvő spirálok)
  { const rk = new THREE.Group(); rk.position.set(-1.75, 1.1, 0.25); g.add(rk);
    for (const x of [-0.6, 0.6]) { rk.add(box(0.06, 0.62, 0.06, frame, x, 0.31, -0.42)); rk.add(box(0.06, 0.62, 0.06, frame, x, 0.31, 0.42)); rk.add(box(0.06, 0.06, 0.9, frame, x, 0.04, 0)); rk.add(box(0.06, 0.06, 0.9, frame, x, 0.3, 0)); }
    for (let i = 0; i < 6; i++) { const a = buildAugerSeg(1.5, 0.09, 0.038, 0.16, { th: 0.012 }); a.rotation.z = Math.PI / 2; a.position.set(0.75, 0.13 + Math.floor(i / 3) * 0.2, -0.28 + (i % 3) * 0.19); rk.add(a); } }
  // hátsó fúróplatform
  g.add(box(0.46, 0.14, 2.3, frame, -2.97, 0.95, 0)); g.add(box(0.46, 0.04, 2.3, M(0x5b6168, { metalness: 0.4 }), -2.97, 1.04, 0));
  for (const z of [-0.7, 0.7]) { g.add(box(0.05, 0.12, 0.5, M(0xff9a1f), -3.21, 0.9, z)); g.add(box(0.03, 0.1, 0.24, M(0xc8281e, { emissive: 0x801010, emissiveIntensity: 0.3 }), -3.22, 0.9, z + (z > 0 ? 0.35 : -0.35))); }
  { const plate = box(0.02, 0.11, 0.52, M(0xf4f4f0), -3.22, 0.72, 0); g.add(plate); g.add(box(0.021, 0.11, 0.05, M(0x2a50a8), -3.225, 0.72, -0.235)); }
  // támasztólábak (alvázhoz csavarozott házak + kifutó dugattyú + talp; alátét-palló)
  const legs = []; for (const x of [FX + 0.62, 1.5]) for (const z of [1.27, -1.27]) {
    g.add(box(0.15, 0.55, 0.15, M(0xe0a419, { roughness: 0.45 }), x, 1.38, z)); g.add(box(0.18, 0.1, 0.4, frame, x, 1.0, z * 0.88)); g.add(box(0.1, 0.42, 0.1, frame, x, 1.24, z * 0.92));
    const L = new THREE.Group(); L.position.set(x, 1.1, z); const tube = cyl(0.05, 0.05, 1, steel, 0, -0.5, 0, 14); const pad = box(0.32, 0.05, 0.32, dark, 0, -1, 0); L.add(tube, pad); g.add(L); legs.push({ L, tube, pad });
    const plank = box(0.7, 0.05, 0.3, M(0x8a6a45, { roughness: 0.9 }), x, 0.025, z); g.add(plank); }
  // árboc (a jármű felőli oldalon), forgatófej, talpbilincs
  const MX = FX + 0.42; const mast = new THREE.Group(); mast.position.set(MX, 1.3, 0); g.add(mast);
  { const y0 = -0.85, y1 = H; const hh = y1 - y0;
    for (const z of [-0.17, 0.17]) mast.add(box(0.12, hh, 0.1, mastM, 0, y0 + hh / 2, z));
    mast.add(box(0.05, hh, 0.44, M(0x6f767c, { metalness: 0.4 }), 0.08, y0 + hh / 2, 0));
    for (let y = y0 + 0.4; y < y1 - 0.2; y += 0.7) { mast.add(box(0.06, 0.05, 0.44, mastM, -0.02, y, 0)); }
    mast.add(box(0.36, 0.22, 0.5, mastM, -0.12, y1 + 0.08, 0)); { const sv = cylZ(0.12, 0.08, steel, -0.25, y1 + 0.2, 0, 18); mast.add(sv); }
    mast.add(box(0.4, 0.2, 0.6, frame, 0.0, y0 - 0.02, 0)); // árbocláb
    mast.add(rod(V(0.02, y0 + 0.3, 0.0), V(0.02, y1 - 0.3, 0.0), 0.022, M(0x2c3036, { metalness: 0.5 }), 8)); // előtoló henger/lánc
    // talpbilincs a fúrás tengelyében (két pofa, hidraulikus hengerekkel)
    const cl = new THREE.Group(); cl.position.set(-0.42, y0 + 0.2, 0); mast.add(cl);
    for (const s of [-1, 1]) { cl.add(box(0.3, 0.16, 0.12, M(0x8a4a2a, { roughness: 0.5 }), 0, 0, s * 0.18)); cl.add(cyl(0.035, 0.035, 0.2, steel, 0.0, 0, s * 0.33, 10).rotateX(Math.PI / 2)); }
    cl.add(box(0.12, 0.16, 0.5, M(0x8a4a2a), 0.2, 0, 0));
    // árbocállító henger a platóról
    g.add(rod(V(MX + 1.1, 1.12, -0.32), V(MX + 0.06, 3.2, -0.32), 0.045, steel, 10)); g.add(rod(V(MX + 1.1, 1.12, -0.32), V(MX + 0.6, 2.12, -0.32), 0.06, M(0xe0a419), 10)); }
  // forgatófej (top drive) a kocsin
  const head = new THREE.Group(); mast.add(head);
  { head.add(box(0.14, 0.62, 0.5, M(0x2c3036, { metalness: 0.4 }), -0.1, -0.1, 0)); // kocsi a síneken
    head.add(box(0.36, 0.34, 0.42, M(o.headColor ?? 0x3a3f45, { metalness: 0.35, roughness: 0.45 }), -0.42, -0.2, 0)); head.add(box(0.38, 0.05, 0.44, M(0xc8281e), -0.42, -0.02, 0));
    head.add(cyl(0.09, 0.09, 0.26, M(0x16181b, { metalness: 0.3 }), -0.42, 0.13, 0, 18)); head.add(cyl(0.1, 0.1, 0.03, steel, -0.42, 0.27, 0, 18));
    head.add(cyl(0.065, 0.075, 0.13, M(0x4d535a, { metalness: 0.5 }), -0.42, -0.43, 0, 6)); head.add(cyl(0.05, 0.05, 0.03, steel, -0.42, -0.49, 0, 6));
    // hidraulika-tömlők: a motor tetejéről ívben a kocsi tetején ülő elosztóblokkba (mindkét végük csatlakozik, nem lógnak a levegőben)
    head.add(box(0.12, 0.08, 0.32, M(0x3a3f45, { metalness: 0.5, roughness: 0.4 }), -0.1, 0.25, 0));
    for (const s of [-1, 1]) { const c = new THREE.CatmullRomCurve3([V(-0.42 + s * 0.05, 0.27, 0.05 * s), V(-0.41, 0.46, 0.1 * s), V(-0.3, 0.6, 0.13 * s), V(-0.16, 0.52, 0.12 * s), V(-0.1, 0.4, 0.11 * s), V(-0.1, 0.3, 0.11 * s)]); const hm = new THREE.Mesh(new THREE.TubeGeometry(c, 30, 0.018, 6, false), M(0x111214, { roughness: 0.6 })); hm.castShadow = true; head.add(hm);
      head.add(cyl(0.024, 0.024, 0.03, M(0x8a9097, { metalness: 0.7 }), -0.1, 0.3, 0.11 * s, 8)); } }
  // kezelőpult a jobb (+z) oldalon, az árboc mellett
  const panel = new THREE.Group(); panel.position.set(FX + 1.05, 0, 1.3); g.add(panel);
  { panel.add(box(0.08, 1.1, 0.08, frame, 0, 0.55, -0.1)); panel.add(box(0.6, 0.42, 0.14, M(0xe0a419, { roughness: 0.45 }), 0, 1.25, 0)); const levers = [];
    for (let i = 0; i < 5; i++) { const x = -0.22 + i * 0.11; panel.add(rod(V(x, 1.18, 0.07), V(x, 1.34, 0.16 + (i % 2) * 0.02), 0.009, steel, 6)); const kn = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), M(i === 2 ? 0x2a6fd8 : 0xc8281e)); kn.position.set(x, 1.35, 0.17 + (i % 2) * 0.02); panel.add(kn); levers.push(V(x, 1.35, 0.17)); }
    for (const x of [-0.18, 0.18]) { const gd = cylZ(0.05, 0.02, M(0xf4f4f0), x, 1.42, 0.075, 18); panel.add(gd); }
    panel.userData = { levers, leverAxis: V(0, 0.16, 0.1).normalize() }; }
  shadowAll(g); g.userData = { FX, mast, head, legs, H, panel };
  return g;
}
// Kis lánctalpas fúrógép: gumilánctalp, keret, hátul benzinmotor védőkerettel, oldalt hidraulika-tartály és vezérlőkarok,
// elöl árboc forgatófejjel és talpbilinccsel, első támasztóláb-pár. +x előre; fúrási tengely lokális (AX, 0, 0).
// userData: { mast, carriage, H, AX, levers } – a carriage az árboc helyi y mentén mozog, orsójának alja carriage.y − 0,2.
export function buildCrawler2(o = {}) {
  const g = new THREE.Group();
  const col = M(o.color ?? 0xe8661c, { roughness: 0.45 }), rub = M(0x17191c, { roughness: 0.9 }), dark = M(0x2a2d32, { metalness: 0.35, roughness: 0.55 }), steel = M(0x9aa3ad, { metalness: 0.6, roughness: 0.35 }), mastM = M(o.mastColor ?? 0x3d4248, { metalness: 0.4, roughness: 0.45 });
  const L = 1.55, AX = 0.98, H = o.mastH ?? 3.3;
  // lánctalpak
  for (const z of [-0.43, 0.43]) {
    const sh = new THREE.Shape(); const r = 0.15, x0 = -L / 2 + r, x1 = L / 2 - r; sh.moveTo(x0, 0); sh.lineTo(x1, 0); sh.absarc(x1, r, r, -Math.PI / 2, Math.PI / 2, false); sh.lineTo(x0, 2 * r); sh.absarc(x0, r, r, Math.PI / 2, Math.PI * 1.5, false);
    const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.22, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 1 }); geo.translate(0, 0, -0.11); const tr = new THREE.Mesh(geo, rub); tr.position.set(0, 0.0, z); tr.castShadow = true; g.add(tr);
    for (let i = 0; i < 14; i++) { const x = x0 + i * (x1 - x0) / 13; g.add(box(0.04, 0.025, 0.23, M(0x111214), x, 0.3 + 0.012, z)); g.add(box(0.04, 0.025, 0.23, M(0x111214), x, -0.004, z)); }
    for (const x of [x0, x1]) { g.add(cylZ(0.12, 0.24, steel, x, r, z, 18)); g.add(cylZ(0.05, 0.25, dark, x, r, z, 10)); }
    for (let i = 1; i < 4; i++) g.add(cylZ(0.06, 0.24, dark, x0 + i * (x1 - x0) / 4, 0.08, z, 12));
    g.add(box(L - 0.3, 0.1, 0.06, col, 0, r, z * 0.72)); }
  // keret és burkolat
  g.add(box(L + 0.1, 0.1, 0.72, col, 0.02, 0.36, 0)); g.add(box(L - 0.2, 0.03, 0.66, M(0x4a5056, { metalness: 0.4 }), -0.05, 0.42, 0));
  // benzinmotor hátul + védőkeret
  { const E = new THREE.Group(); E.position.set(-0.5, 0.43, -0.05); g.add(E);
    E.add(box(0.38, 0.3, 0.38, M(0x50565c, { metalness: 0.3 }), 0, 0.15, 0)); E.add(box(0.3, 0.12, 0.26, M(0xc8281e), 0, 0.37, 0.02)); E.add(cyl(0.025, 0.025, 0.03, dark, 0.08, 0.445, 0.05, 10));
    E.add(cyl(0.075, 0.075, 0.12, M(0x16181b), -0.05, 0.3, -0.16, 16)); E.add(box(0.12, 0.12, 0.08, steel, 0.16, 0.18, -0.22)); E.add(cylZ(0.07, 0.03, M(0xe9e7e1), 0.0, 0.16, 0.205, 18)); E.add(box(0.05, 0.016, 0.02, rub, 0.0, 0.2, 0.225));
    const fr = (a, b) => E.add(rod(V(...a), V(...b), 0.016, col, 8));
    for (const x of [-0.22, 0.22]) { fr([x, 0, 0.26], [x, 0.56, 0.26]); fr([x, 0, -0.26], [x, 0.56, -0.26]); fr([x, 0.56, -0.26], [x, 0.56, 0.26]); } fr([-0.22, 0.56, 0.26], [0.22, 0.56, 0.26]); fr([-0.22, 0.56, -0.26], [0.22, 0.56, -0.26]); }
  // hidraulikatartály, vezérlőblokk karokkal (+z oldal: a kezelő itt áll)
  g.add(box(0.34, 0.32, 0.3, col, 0.12, 0.6, -0.18)); g.add(cyl(0.035, 0.035, 0.04, dark, 0.12, 0.78, -0.18, 10));
  const levers = []; { const vb = new THREE.Group(); vb.position.set(0.28, 0.78, 0.33); g.add(vb); vb.add(box(0.34, 0.12, 0.1, M(0x2a2d32, { metalness: 0.4 }), 0, 0, 0)); vb.add(box(0.06, 0.4, 0.06, dark, 0, -0.2, -0.04));
    for (let i = 0; i < 4; i++) { const x = -0.12 + i * 0.08; vb.add(rod(V(x, 0.05, 0.02), V(x, 0.28, 0.08), 0.008, steel, 6)); const kn = new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 8), M(0x111214)); kn.position.set(x, 0.29, 0.085); vb.add(kn); levers.push(V(0.28 + x, 0.78 + 0.29, 0.33 + 0.085)); } }
  // árboc elöl
  const MX = AX - 0.26; const mast = new THREE.Group(); mast.position.set(MX, 0.4, 0); g.add(mast);
  { const y0 = -0.24, hh = H - y0;
    for (const z of [-0.12, 0.12]) mast.add(box(0.07, hh, 0.07, mastM, 0, y0 + hh / 2, z)); mast.add(box(0.03, hh, 0.3, M(0x2c3036, { metalness: 0.4 }), -0.05, y0 + hh / 2, 0));
    for (let y = y0 + 0.3; y < H - 0.1; y += 0.5) mast.add(box(0.05, 0.035, 0.3, mastM, 0.0, y, 0));
    mast.add(box(0.22, 0.12, 0.34, mastM, 0.04, H + 0.05, 0)); mast.add(box(0.32, 0.1, 0.42, col, 0.08, y0 + 0.05, 0)); mast.add(rod(V(0.0, y0 + 0.2, 0), V(0.0, H - 0.1, 0), 0.016, M(0x16181b), 8));
    const cl = new THREE.Group(); cl.position.set(0.26, y0 + 0.05, 0); mast.add(cl); for (const s of [-1, 1]) cl.add(box(0.14, 0.09, 0.06, M(0x8a4a2a, { roughness: 0.5 }), 0, 0, s * 0.075)); }
  g.add(rod(V(-0.1, 0.42, 0.22), V(MX - 0.04, 1.6, 0.18), 0.03, steel, 10)); g.add(rod(V(-0.1, 0.42, 0.22), V(MX - 0.35, 1.05, 0.21), 0.042, col, 10)); // árbocállító henger
  // első támasztólábak
  for (const z of [-0.4, 0.4]) { g.add(box(0.09, 0.32, 0.09, col, 0.82, 0.48, z)); g.add(cyl(0.032, 0.032, 0.38, steel, 0.82, 0.19, z, 12)); g.add(box(0.18, 0.03, 0.18, dark, 0.82, 0.015, z)); }
  // forgatófej a kocsin (orsó a fúrási tengelyben)
  const carriage = new THREE.Group(); mast.add(carriage);
  { carriage.add(box(0.08, 0.36, 0.32, M(0x2c3036, { metalness: 0.4 }), 0.06, 0, 0)); carriage.add(box(0.24, 0.22, 0.24, col, 0.26, -0.02, 0)); carriage.add(cyl(0.06, 0.06, 0.18, M(0x16181b), 0.26, 0.17, 0, 16));
    carriage.add(cyl(0.035, 0.04, 0.08, M(0x4d535a, { metalness: 0.5 }), 0.26, -0.16, 0, 6));
    // hidraulika-tömlők: a motor tetejéről ívben a kocsilap elosztóblokkjába (mindkét végük csatlakozik, nem lógnak a levegőben)
    carriage.add(box(0.07, 0.07, 0.2, M(0x3a3f45, { metalness: 0.5, roughness: 0.4 }), 0.075, 0.215, 0));
    for (const s of [-1, 1]) { const c = new THREE.CatmullRomCurve3([V(0.26 + s * 0.025, 0.255, 0.03 * s), V(0.25, 0.36, 0.06 * s), V(0.16, 0.42, 0.09 * s), V(0.085, 0.33, 0.07 * s), V(0.075, 0.25, 0.07 * s)]); carriage.add(new THREE.Mesh(new THREE.TubeGeometry(c, 24, 0.011, 6, false), M(0x111214, { roughness: 0.6 })));
      carriage.add(cyl(0.016, 0.016, 0.025, M(0x8a9097, { metalness: 0.7 }), 0.075, 0.255, 0.07 * s, 8)); } }
  shadowAll(g); g.userData = { mast, carriage, H, AX, levers, leverAxis: V(0, 0.23, 0.06).normalize() };
  return g;
}

// ---------- Plóderer-féle mélységi dugattyús mintavevő (metszetben: az elülső fél kivágva) ----------
// Origó: a magcső alsó éle (vágósaru) a tengelyen. setState({ up: dugattyú-emelés 0–0,5 m, core: magminta hossza, lock: 0/1, spin })
export function buildPloderer(o = {}) {
  const g = new THREE.Group(); const L = o.len ?? 0.95, R0 = 0.066, R1 = 0.058;
  const steel = new THREE.MeshStandardMaterial({ color: 0xa9b1b8, metalness: 0.55, roughness: 0.38, side: THREE.DoubleSide }), rust = M(0x8a5a3a, { metalness: 0.4, roughness: 0.6 }), dk = M(0x2c3036, { metalness: 0.45, roughness: 0.45 }), hard = M(0xc9ced3, { metalness: 0.85, roughness: 0.22 });
  const cut = Math.PI; // a hátsó fél marad: theta ∈ [0, π] (z ≤ 0)
  const shell = (r, h, y, mat) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 36, 1, true, Math.PI / 2, cut), mat); m.position.y = y; m.castShadow = true; return m; };
  const ring = (r0, r1, y, mat) => { const m = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 36, 1, 0, Math.PI), mat); m.rotation.x = -Math.PI / 2; m.position.y = y; return m; };
  const barrel = new THREE.Group(); g.add(barrel);
  barrel.add(shell(R0, L, L / 2, steel)); barrel.add(shell(R1, L, L / 2, new THREE.MeshStandardMaterial({ color: 0x8d969e, metalness: 0.35, roughness: 0.5, side: THREE.DoubleSide, emissive: 0x1a1d20 })));
  barrel.add(ring(R1, R0, 0.0, hard)); barrel.add(ring(R1, R0, L, steel));
  { const cutF = new THREE.Mesh(new THREE.PlaneGeometry(R0 - R1, L), M(0x6f777e, { metalness: 0.6, roughness: 0.4, side: THREE.DoubleSide })); for (const s of [-1, 1]) { const f = cutF.clone(); f.position.set(s * (R0 + R1) / 2, L / 2, 0); barrel.add(f); } }
  // vágósaru (kúpos, fogakkal)
  { const sh = new THREE.Mesh(new THREE.CylinderGeometry(R0 + 0.004, R0 - 0.006, 0.07, 36, 1, true, Math.PI / 2, cut), new THREE.MeshStandardMaterial({ color: 0xb7bdc3, metalness: 0.8, roughness: 0.25, side: THREE.DoubleSide })); sh.position.y = 0.035; barrel.add(sh);
    for (let i = 0; i <= 5; i++) { const a = Math.PI / 2 + i / 5 * Math.PI; const t = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.03, 6), hard); t.position.set(Math.sin(a) * (R0 - 0.004), -0.01, Math.cos(a) * (R0 - 0.004)); t.rotation.x = Math.PI; barrel.add(t); } }
  // külső spirállevél (csak a hátsó félen): félfordulatonként
  { const pitch = 0.17, rIn = R0, rOut = R0 + 0.02; for (let k = 0; k < 5; k++) { const h = new THREE.Mesh(helixRibbon(rIn, rOut, pitch, 0.5, 0.008, 24), rust); h.position.y = 0.1 + k * pitch; h.castShadow = true; barrel.add(h); } }
  // fej: menetes csatlakozó + bajonett-ház + rögzítőretesz
  const head = new THREE.Group(); head.position.y = L; barrel.add(head);
  head.add(shell(R0 * 0.75, 0.12, 0.06, steel)); head.add(ring(0.012, R0 * 0.75, 0.12, steel));
  const latch = box(0.035, 0.03, 0.02, M(0xe8b21c, { roughness: 0.4 }), -R0 * 0.75 + 0.006, 0.07, -0.02); head.add(latch);
  // dugattyú + rúd (a fúrórudazathoz kötve)
  const pis = new THREE.Group(); g.add(pis);
  pis.add(cyl(R1 - 0.002, R1 - 0.002, 0.05, M(0x3b4046, { metalness: 0.5 }), 0, 0.035, 0, 28)); pis.add(cyl(R1 - 0.001, R1 - 0.001, 0.008, M(0xb3261e), 0, 0.02, 0, 28)); pis.add(cyl(R1 - 0.001, R1 - 0.001, 0.008, M(0xb3261e), 0, 0.05, 0, 28));
  { const c = new THREE.Mesh(new THREE.ConeGeometry(R1 - 0.002, 0.1, 28), hard); c.rotation.x = Math.PI; c.position.y = -0.04; pis.add(c); }
  const prod = cyl(0.013, 0.013, 1, M(0x9aa3ad, { metalness: 0.7, roughness: 0.3 }), 0, 0, 0, 12); pis.add(prod);
  // magminta (zavartalan, rétegzett)
  const core = new THREE.Group(); g.add(core);
  const cm = (c) => M(c, { roughness: 0.95 });
  const coreBands = [[0, 0.18, 0xc7a66d], [0.18, 0.2, 0x9c8a6c], [0.2, 0.36, 0xcfb07a], [0.36, 0.38, 0x8d7b60], [0.38, 0.5, 0xc2a067]];
  for (const [a, b, c] of coreBands) { const m = cyl(R1 - 0.003, R1 - 0.003, b - a, cm(c), 0, (a + b) / 2, 0, 24); core.add(m); }
  shadowAll(g);
  const api = { L, barrel, pis, core, latch, R0,
    setState(st) {
      const up = st.up ?? 0, cl = clampV(st.core ?? 0, 0, 0.5);
      pis.position.y = up; prod.scale.y = 0.6 + (L - 0.05 - up < 0 ? 0 : 0); prod.position.y = 0.06 + 0.3; prod.scale.y = Math.max(0.05, L + 0.25 - 0.06 - up + up); prod.position.y = 0.06 + prod.scale.y / 2;
      core.visible = cl > 0.005; core.scale.y = Math.max(0.01, cl / 0.5); core.position.y = 0;
      latch.position.x = -R0 * 0.75 + 0.006 + (st.lock ? 0.022 : 0); latch.material.emissive?.setHex(st.lock ? 0x6a4a00 : 0x000000);
      g.rotation.y = st.spin ?? 0;
    } };
  g.userData = api; api.setState({});
  return g;
}
const clampV = (x, a, b) => Math.max(a, Math.min(b, x));

// ---------- fél henger (θ ∈ [π/2, 3π/2], a metszetsík mögött), soronként indexelve: setRows(a, b) a [a, b] mélységsávot rajzolja ----------
export function halfWall(r, H = 7, perM = 100, RS = 16, colFn = null) {
  const HS = Math.round(H * perM), pos = [], col = [], idx = [], c = new THREE.Color();
  for (let i = 0; i <= HS; i++) { const y = -i / perM; for (let j = 0; j <= RS; j++) { const th = Math.PI / 2 + j / RS * Math.PI; const x = r * Math.sin(th), z = r * Math.cos(th); pos.push(x, y, z);
    if (colFn) { colFn(-y, c); const f = 0.42 + 0.16 * Math.abs(x) / r + 0.06 * Math.sin((i * 31 + j) * 12.9898); col.push(c.r * f, c.g * f, c.b * f); } } }
  for (let i = 0; i < HS; i++) for (let j = 0; j < RS; j++) { const a = i * (RS + 1) + j, b = a + RS + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); if (colFn) geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.setIndex(idx); geo.computeVertexNormals();
  return { geo, HS, RS, perM, setRows(m, a, b) { const i0 = Math.max(0, Math.min(HS, Math.floor(a * perM))), i1 = Math.max(i0, Math.min(HS, Math.ceil(b * perM))); m.visible = i1 > i0; geo.setDrawRange(i0 * RS * 6, (i1 - i0) * RS * 6); } };
}
