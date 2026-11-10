// Talajmechanikai labor: helyiség, labor-asztal, mintakitoló, talajeszterga, mérleg, terhelőkeret triaxiális cellával,
// két nyomás-/térfogatszabályozó, számítógép, laboráns.
// Felépítés (EN ISO 17892-8/-9, ASTM D4767/D7181; gyártói leírások: GDS, ELE, Controls, Humboldt):
// asztali terhelőkeret (motoros alapegység, emelkedő tárcsa, két oszlop, kereszttartó, erőmérő cella), rajta a triaxiális cella:
// talplemez szelepekkel és pórusvíznyomás-mérővel, átlátszó akrilhenger, fedőlap légtelenítő csavarral, három húzórúd,
// perselyben futó terhelőrúd; bent talp, szűrőkő, szűrőpapír, Ø 50 × 100 mm-es minta gumimembránban, O-gyűrűk, felső szűrőkő, fejlemez.
import * as THREE from 'three';
import { clamp, lerp, smooth, ease, seg, mulberry32 } from '../../kit/util.js';
import { M, box, cyl, rod, setRod, buildWorker } from '../../kit/parts.js';
import { gripCylinder, palmOn, POLE } from '../../kit/grip.js';
import * as TL from './timeline.js';
import { tb, BEAT } from './timeline.js';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
import { LX, BT, FRX, FRZ, EXT, LAT, SCL, PC } from './layout.js';
export { LX, BT, FRX, FRZ, EXT, LAT, SCL, PC };
// a cella magasságai a keret alapjához (asztallap) képest
export const CB = 0.194, CY0 = 0.224, PED = 0.03, STN = 0.006, H0 = 0.1, R0 = 0.025, CYH = 0.26;
export const SPB = CY0 + PED + STN + 0.0005;            // a minta alja
export const CAPH = 0.02, PLEN = 0.2, APP = 0.2;        // fejlemez, terhelőrúd hossza, gyors közelítés
export const LCB = SPB + H0 + 0.0006 + STN + CAPH + PLEN + APP;   // az erőmérő cella alja (felfekvéskor a rúd teteje)

function bx(x0, x1, y0, y1, z0, z1, m, parent) { const b = box(x1 - x0, y1 - y0, z1 - z0, m, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); if (parent) parent.add(b); return b; }
function canvasTex(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return { c, g: c.getContext('2d'), t }; }

// ---------- talaj-textúra (agyag; oldalsó szűrőpapír-csíkokkal vagy anélkül) ----------
function soilTex(drains) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 1024; const g = c.getContext('2d');
  g.fillStyle = '#5a4e42'; g.fillRect(0, 0, 1024, 1024); const r = mulberry32(drains ? 21 : 11);
  for (let i = 0; i < 26000; i++) { const v = 58 + r() * 70; g.fillStyle = `rgba(${v + 24 | 0},${v + 12 | 0},${v - 4 | 0},${0.22 + r() * 0.4})`; const q = 1 + r() * 2.4; g.fillRect(r() * 1024, r() * 1024, q, q); }
  for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(40,32,24,${0.15 + r() * 0.15})`; g.lineWidth = 1 + r() * 2; g.beginPath(); const y = r() * 1024; g.moveTo(0, y); g.bezierCurveTo(300, y + (r() - 0.5) * 60, 700, y + (r() - 0.5) * 60, 1024, y + (r() - 0.5) * 30); g.stroke(); }
  if (drains) { // spirális szűrőpapír-csíkok (kb. 40 %-os lefedés, 35°-os dőlés) – a palást kiterítve (u: kerület, v: magasság)
    g.fillStyle = 'rgba(196,190,174,0.62)'; const n = 8, w = 1024 / n * 0.3;
    for (let k = -2; k < n + 3; k++) { const x0 = k * 1024 / n; g.beginPath(); g.moveTo(x0, 1024); g.lineTo(x0 + w, 1024); g.lineTo(x0 + w + 1024 * 0.75, 0); g.lineTo(x0 + 1024 * 0.75, 0); g.closePath(); g.fill(); }
    g.strokeStyle = 'rgba(150,146,134,0.35)'; g.lineWidth = 2; for (let k = -2; k < n + 3; k++) { const x0 = k * 1024 / n; g.beginPath(); g.moveTo(x0, 1024); g.lineTo(x0 + 1024 * 0.75, 0); g.stroke(); }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
const SOILM = (tex) => new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92, emissive: 0x1f6fd0, emissiveIntensity: 0 });

// ---------- deformálható minta (henger; hordósodás, nyírási sík, konszolidációs zsugorodás) ----------
function buildSpecimen(parent) {
  const sg = new THREE.CylinderGeometry(1, 1, 1, 96, 120, false); sg.rotateY(Math.PI); sg.translate(0, 0.5, 0);   // a textúra varrata hátul
  const base = sg.attributes.position.array.slice();
  const texP = soilTex(false), texD = soilTex(true);
  const mat = SOILM(texP); const soil = new THREE.Mesh(sg, mat); soil.castShadow = true; soil.receiveShadow = true; parent.add(soil);
  const mg = sg.clone(); const memM = new THREE.MeshStandardMaterial({ color: 0x8a6a46, transparent: true, opacity: 0.14, roughness: 0.12, metalness: 0.1, depthWrite: false });
  const mem = new THREE.Mesh(mg, memM); mem.renderOrder = 10; parent.add(mem);
  // a nyírási sík és a palást metszésvonala
  const band = new THREE.Group(); parent.add(band); const bandM = [new THREE.MeshBasicMaterial({ color: 0x120c07, transparent: true, opacity: 0, depthWrite: false }), new THREE.MeshBasicMaterial({ color: 0xd9c4ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })];
  const bandT = []; { const tr = Math.tan(Math.PI / 3); for (const s of [1, -1]) { const pts = []; for (let i = 0; i <= 64; i++) { const a = Math.PI / 2 + s * Math.PI * i / 64; pts.push(V(Math.cos(a), tr * Math.cos(a), Math.sin(a))); }
      const crv = new THREE.CatmullRomCurve3(pts); const c1 = new THREE.Mesh(new THREE.TubeGeometry(crv, 128, 0.06, 6), bandM[0]); c1.renderOrder = 12; const c2 = new THREE.Mesh(new THREE.TubeGeometry(crv, 128, 0.11, 6), bandM[1]); c2.renderOrder = 13; band.add(c1, c2); bandT.push(c1, c2); } }
  const O = { soil, mem, mat, memM, band, bandM, bandT, texP, texD, base, last: '' };
  // p: { y0, H, R, ea (teljes tengelyirányú alakváltozás, arány), ep (a nyírási sík megjelenése), shearOn, ev (térfogat-arány), flash, glow, drains, memb, vis, vconst }
  O.set = (p) => {
    const key = [p.y0, p.H, p.R, p.ea, p.ep, p.ev, p.flash, p.vconst, p.shearOn ? 1 : 0].map(v => (+v || 0).toFixed(5)).join('|');
    mat.map = p.drains ? texD : texP; mat.emissiveIntensity = p.glow || 0; mem.visible = !!p.memb && p.vis !== false; soil.visible = p.vis !== false;
    if (key === O.last) return O.top; O.last = key;
    const ec = (p.ev || 0) / 3, Hc = p.H * (1 - ec), Rc = p.R * (1 - ec), ea = p.ea || 0, ep = p.shearOn ? Math.min(ea, p.ep ?? 1) : ea;
    const hp = Hc * (1 - ep), bul = 1.3 * ep, TH = Math.PI / 3, cT = Math.cos(TH), sT = Math.sin(TH);
    const sl = p.shearOn ? Math.max(0, ea - ep) * Hc / sT : 0, yc = hp / 2, bw = 0.0011;
    const pos = soil.geometry.attributes.position, mp = mem.geometry.attributes.position;
    // keresztmetszet: drénezetlenül állandó térfogat (A = A_0/(1 − ε_a)), drénezetten kisebb tágulás; hordósodás a közepén
    const rA = Rc / Math.sqrt(Math.max(0.5, 1 - ep * (p.vconst ?? 1)));
    const ss = (a, b, x) => { const q = clamp((x - a) / (b - a), 0, 1); return q * q * (3 - 2 * q); };
    for (let i = 0; i < pos.count; i++) { const u = O.base[i * 3 + 1], c = Math.sin(Math.PI * u), rr = rA * (1 + bul * (c * c - 0.5) * 1.2), ax = O.base[i * 3], az = O.base[i * 3 + 2], k = Math.hypot(ax, az) > 0.5 ? 1 : 0;
      let x = ax * rr, y = u * hp; const z = az * rr, sd = (y - yc) * cT - x * sT, wv = sl > 0 ? ss(-bw, bw, sd) : 0; x -= sl * cT * wv; y -= sl * sT * wv;
      pos.setXYZ(i, x, p.y0 + y, z); mp.setXYZ(i, x + ax * 0.0007 * k, p.y0 + y, z + az * 0.0007 * k); }
    pos.needsUpdate = mp.needsUpdate = true; soil.geometry.computeVertexNormals(); mem.geometry.computeVertexNormals();
    const sk = Math.min(1, sl * 400), fl = p.flash || 0; bandM[0].opacity = 0.95 * sk; bandM[1].opacity = 0.55 * fl * sk;
    const rb = rA * (1 + bul * 0.5 * 1.2) + 0.0006; band.scale.set(rb, rb, rb); band.position.set(-sl * cT / 2, p.y0 + yc - sl * sT / 2, 0); band.visible = sl > 0;
    O.top = { y: p.y0 + Hc * (1 - ea), dx: -sl * cT, Hc, Rc, rA, bul };
    return O.top;
  };
  return O;
}

// ---------- folyást mutató cső (mozgó szaggatás) ----------
function flowTube(parent, color) {
  const c = document.createElement('canvas'); c.width = 64; c.height = 8; const g = c.getContext('2d'); g.fillStyle = '#ffffff'; g.fillRect(0, 0, 64, 8); g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(36, 0, 28, 8);
  const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(30, 1);
  const mat = new THREE.MeshStandardMaterial({ color, map: tex, transparent: true, opacity: 0.88, roughness: 0.3, emissive: color, emissiveIntensity: 0, emissiveMap: tex });
  const m = new THREE.Mesh(new THREE.BufferGeometry(), mat); m.castShadow = true; parent.add(m);
  const T = { m, mat, tex, key: '' };
  T.set = (pts, r = 0.0032) => { const key = pts.map(p => p.toArray().map(v => v.toFixed(4)).join(',')).join(';'); if (key === T.key) return; T.key = key;
    m.geometry.dispose(); m.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 64, r, 8); const L = new THREE.CatmullRomCurve3(pts).getLength(); tex.repeat.set(Math.max(4, L / 0.03), 1); };
  T.flow = (t, f) => { tex.offset.x = -t * 1.6 * f; mat.emissiveIntensity = Math.abs(f) > 0.01 ? 0.55 : 0.05; };
  return T;
}

export function buildLab(R) {
  const L = {}; const G = new THREE.Group(); G.position.set(LX, 0, 0); R.scene.add(G); L.G = G; G.visible = false;
  const white = M(0xe9e8e4, { roughness: 0.8 }), lam = M(0xd7d9d6, { roughness: 0.55 }), cab = M(0x8a96a3, { roughness: 0.6 }), st = M(0xc3c8cd, { metalness: 0.8, roughness: 0.22 }),
    dk = M(0x2a2d32, { metalness: 0.4, roughness: 0.5 }), al = M(0x9aa1a8, { metalness: 0.6, roughness: 0.35 }), grey = M(0xd9dcdf, { roughness: 0.55 }), blk = M(0x15171a, { roughness: 0.5 }),
    brass = M(0xb08d3a, { metalness: 0.7, roughness: 0.3 }), blue = M(0x2f6fb5, { roughness: 0.45 }), stone = M(0x8d9096, { roughness: 0.95 });
  L.mats = { st, dk, al };
  // ---- helyiség: padló, falak, mennyezet lámpákkal, polcok
  { const room = [bx(-4.2, 4.2, -0.02, 0, -1.9, 3.5, M(0xa9acaa, { roughness: 0.5, metalness: 0.0 }), G), bx(-4.2, 4.2, 0, 3.2, -1.92, -1.9, M(0xe6e1d6, { roughness: 0.92 }), G),
      bx(-4.22, -4.2, 0, 3.2, -1.9, 3.5, M(0xd9d6cc, { roughness: 0.92 }), G), bx(4.2, 4.22, 0, 3.2, -1.9, 3.5, M(0xd9d6cc, { roughness: 0.92 }), G), bx(-4.2, 4.2, 3.2, 3.22, -1.9, 3.5, M(0xf0efec, { roughness: 0.9 }), G)];
    room.forEach(b => { b.castShadow = false; }); }
  // tábla a hátfalon: kézzel rajzolt Mohr-körök, „τ = c′ + σ′·tg φ′”
  { const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const g = c.getContext('2d'); g.fillStyle = '#f7f7f4'; g.fillRect(0, 0, 1024, 512);
    g.strokeStyle = '#2b4f9e'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(80, 440); g.lineTo(960, 440); g.moveTo(80, 440); g.lineTo(80, 60); g.stroke();
    for (const [cx, r] of [[260, 90], [430, 150], [640, 215]]) { g.beginPath(); g.arc(cx, 440, r, Math.PI, 2 * Math.PI); g.stroke(); }
    g.strokeStyle = '#c0281e'; g.beginPath(); g.moveTo(80, 410); g.lineTo(940, 120); g.stroke();
    g.fillStyle = '#2b4f9e'; g.font = 'italic 700 46px Arial'; g.fillText('τ', 40, 80); g.fillText('σ′', 960, 490); g.fillStyle = '#c0281e'; g.font = 'italic 600 40px Arial'; g.fillText('τ = c′ + σ′ tg φ′', 560, 90);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    const b = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.75), new THREE.MeshStandardMaterial({ map: t, roughness: 0.4 })); b.position.set(1.15, 2.05, -1.885); G.add(b);
    bx(0.38, 1.92, 1.66, 1.68, -1.89, -1.86, M(0x8a9097, { metalness: 0.6 }), G); bx(0.38, 1.92, 2.42, 2.44, -1.89, -1.87, M(0x8a9097, { metalness: 0.6 }), G); }
  bx(-4.2, 4.2, 0, 0.12, -1.9, -1.87, M(0x6f767c), G);                                                    // lábazat
  for (const x of [-2.6, 0, 2.6]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.3), new THREE.MeshBasicMaterial({ color: 0xfffbf2 })); p.rotation.x = Math.PI / 2; p.position.set(x, 3.19, -0.6); G.add(p); }
  // ablak a bal falon (nappali fény)
  { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.2), new THREE.MeshBasicMaterial({ color: 0xcfe3f2 })); w.rotation.y = Math.PI / 2; w.position.set(-4.19, 1.75, 0.6); G.add(w);
    bx(-4.2, -4.17, 1.13, 1.17, -0.2, 1.4, grey, G); bx(-4.2, -4.17, 2.33, 2.37, -0.2, 1.4, grey, G); }
  // falipolc mintadobozokkal, szárítószekrény
  { const sh = M(0x6b737b, { metalness: 0.4, roughness: 0.5 }); for (const y of [1.55, 2.0, 2.45]) bx(-3.6, -0.9, y, y + 0.025, -1.9, -1.62, sh, G);
    const r = mulberry32(5); for (const y of [1.575, 2.025]) for (let x = -3.55; x < -1.05; x += 0.17 + r() * 0.08) bx(x, x + 0.14, y, y + 0.14 + r() * 0.06, -1.86, -1.66, M([0xc9a46a, 0x8a9097, 0xd8d4c8, 0x6b8fb5][Math.floor(r() * 4)], { roughness: 0.6 }), G);
    // mintavevő csövek állványon (a polcon)
    for (let i = 0; i < 6; i++) G.add(cyl(0.038, 0.038, 0.42, M(0xb7bcc1, { metalness: 0.6, roughness: 0.35 }), 0.2 + i * 0.1, 2.025 + 0.21, -1.77, 18));
    bx(0.12, 0.8, 2.0, 2.025, -1.9, -1.62, sh, G);
    const ov = new THREE.Group(); ov.position.set(-3.3, BT, -1.25); G.add(ov); bx(-0.35, 0.35, 0, 0.62, -0.3, 0.3, M(0xd0d3d6, { metalness: 0.3, roughness: 0.4 }), ov);
    bx(-0.27, 0.2, 0.1, 0.52, 0.3, 0.305, M(0x404850, { metalness: 0.2, roughness: 0.2 }), ov); bx(0.24, 0.31, 0.44, 0.5, 0.3, 0.306, M(0x9fe36a), ov); L.oven = ov; }
  // ---- laborasztal (két szakasz), alatta szekrények
  bx(-3.8, 2.75, BT - 0.04, BT, -1.55, -0.8, lam, G);
  for (let x = -3.75; x < 2.7; x += 0.6) { bx(x, x + 0.58, 0.1, BT - 0.04, -1.5, -0.84, cab, G); bx(x + 0.24, x + 0.34, BT - 0.17, BT - 0.155, -0.84, -0.825, st, G); }
  bx(-3.8, 2.75, 0, 0.1, -1.5, -0.86, M(0x3a3f45), G);
  // ======================= 1. mintakitoló (vízszintes, hidraulikus, kézi pumpával) =======================
  { const E = new THREE.Group(); E.position.set(EXT.x, BT, EXT.z); G.add(E); L.ext = { G: E };
    const yc = 0.11; L.ext.yc = yc;
    bx(-0.62, 0.62, 0, 0.03, -0.07, 0.07, M(0x30589a, { metalness: 0.4, roughness: 0.45 }), E);                     // alapkeret
    bx(-0.62, -0.38, 0.03, 0.2, -0.08, 0.08, M(0x30589a, { metalness: 0.4, roughness: 0.45 }), E);                  // munkahenger-tartó
    { const c = cyl(0.055, 0.055, 0.22, M(0xb22b22, { metalness: 0.3, roughness: 0.4 }), -0.5, yc, 0, 28); c.rotation.z = Math.PI / 2; E.add(c); }   // munkahenger
    { const c = cyl(0.03, 0.03, 0.12, M(0x2a2d32, { metalness: 0.5 }), -0.5, yc + 0.1, 0.06, 16); E.add(c); }       // pumpa-test
    L.ext.rod = cyl(0.014, 0.014, 1, st, 0, yc, 0, 14); L.ext.rod.rotation.z = Math.PI / 2; E.add(L.ext.rod);
    L.ext.plunger = cyl(0.0355, 0.0355, 0.02, al, 0, yc, 0, 32); L.ext.plunger.rotation.z = Math.PI / 2; E.add(L.ext.plunger);
    // a mintavevő cső két bölcsőben (zárt bilinccsel)
    for (const x of [-0.3, 0.4]) { bx(x - 0.03, x + 0.03, 0.03, yc - 0.03, -0.05, 0.05, M(0x30589a, { metalness: 0.4, roughness: 0.45 }), E);
      const cl = new THREE.Mesh(new THREE.TorusGeometry(0.041, 0.006, 8, 32), dk); cl.rotation.y = Math.PI / 2; cl.position.set(x, yc, 0); E.add(cl); }
    const tubeM = new THREE.MeshStandardMaterial({ color: 0xb7bcc1, metalness: 0.75, roughness: 0.3, side: THREE.DoubleSide });
    { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.9, 40, 1, true), tubeM); c.rotation.z = Math.PI / 2; c.position.set(0.0, yc, 0); E.add(c); L.ext.tubeX0 = -0.45; L.ext.tubeX1 = 0.45; }
    { const c = new THREE.Mesh(new THREE.RingGeometry(0.0363, 0.038, 40), tubeM); c.rotation.y = Math.PI / 2; c.position.set(0.45, yc, 0); E.add(c); }
    // félcső (bölcső) az asztalon a kitolt mintának
    { const hp = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.8, 32, 1, true, Math.PI / 2, Math.PI), new THREE.MeshStandardMaterial({ color: 0xc9ccce, metalness: 0.5, roughness: 0.35, side: THREE.DoubleSide }));
      hp.rotation.z = Math.PI / 2; hp.position.set(0.88, yc, 0); E.add(hp); for (const x of [0.6, 1.16]) bx(x - 0.03, x + 0.03, 0, yc - 0.04, -0.045, 0.045, M(0x30589a, { metalness: 0.4, roughness: 0.45 }), E); }
    // a minta (agyaghenger)
    L.ext.core = cyl(0.0362, 0.0362, 0.74, SOILM(soilTex(false)), 0, yc, 0, 32); L.ext.core.rotation.z = Math.PI / 2; E.add(L.ext.core);
    // a cső végén műanyag kupak, alatta paraffinréteg (a laborban lekerül)
    { const cp = new THREE.Group(); E.add(cp); L.ext.cap = cp; const c = cyl(0.042, 0.042, 0.03, M(0xd9452f, { roughness: 0.55 }), 0, 0, 0, 32); c.rotation.z = Math.PI / 2; cp.add(c); const w = cyl(0.036, 0.036, 0.012, M(0xe8dca8, { roughness: 0.7 }), -0.018, 0, 0, 32); w.rotation.z = Math.PI / 2; cp.add(w); }
    // pumpakar: csukló a pumpa tetején, a kar a laboráns felé (+z) emelkedik, a végén keresztmarkolat
    // elektrohidraulikus hajtás: tápegység a munkahenger mögött, kézi kezelődoboz (zöld: előre, piros: vissza) az asztal elején
    bx(-0.62, -0.42, 0.0, 0.14, -0.2, -0.08, M(0x30589a, { metalness: 0.4, roughness: 0.45 }), E);
    { const cb = new THREE.Group(); cb.position.set(-0.3, 0, 0.19); cb.rotation.y = 0.25; E.add(cb); L.ext.ctl = cb; bx(-0.06, 0.06, 0, 0.055, -0.04, 0.04, M(0xe6c229, { roughness: 0.5 }), cb);
      cb.add(cyl(0.011, 0.011, 0.008, M(0x2fbf4f, { roughness: 0.4 }), -0.025, 0.059, 0, 16)); cb.add(cyl(0.011, 0.011, 0.008, M(0xd23a2a, { roughness: 0.4 }), 0.025, 0.059, 0, 16)); L.ext.btnY = 0.063; }
    { const pts = [V(-0.36, 0.03, 0.17), V(-0.42, 0.01, 0.1), V(-0.5, 0.005, -0.05), V(-0.5, 0.06, -0.14)]; E.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.003, 6), blk)); }
  }
  // ======================= 2. talajeszterga =======================
  { const E = new THREE.Group(); E.position.set(LAT.x, BT, LAT.z); G.add(E); L.lat = { G: E };
    const fr = M(0x7a8590, { metalness: 0.5, roughness: 0.4 });
    bx(-0.15, 0.15, 0, 0.02, -0.15, 0.15, fr, E);
    bx(-0.15, -0.11, 0.02, 0.33, -0.02, 0.02, fr, E);                                  // oszlop a bal oldalon
    bx(-0.15, 0.0, 0.3, 0.33, -0.02, 0.02, fr, E);                                     // felső kar
    L.lat.turn = new THREE.Group(); L.lat.turn.position.y = 0.02; E.add(L.lat.turn); L.lat.turn.add(cyl(0.055, 0.055, 0.015, al, 0, 0.0075, 0, 40));
    L.lat.spec = cyl(1, 1, 1, SOILM(soilTex(false)), 0, 0, 0, 48); E.add(L.lat.spec);   // a forgó minta (sugár, magasság a renderben)
    L.lat.top = new THREE.Group(); E.add(L.lat.top); L.lat.top.add(cyl(0.05, 0.05, 0.012, al, 0, 0.006, 0, 40)); L.lat.top.add(cyl(0.008, 0.008, 0.2, st, 0, 0.11, 0, 12));
    L.lat.crank = new THREE.Group(); L.lat.top.add(L.lat.crank); L.lat.crank.position.y = 0.2; L.lat.crank.add(box(0.075, 0.012, 0.02, al, 0.035, 0, 0)); L.lat.knob = cyl(0.011, 0.011, 0.055, M(0x16181b, { roughness: 0.7 }), 0.065, 0.03, 0, 14); L.lat.crank.add(L.lat.knob);
    L.lat.spH = 0.12;
    // vezetősín (jobb elöl) és a kés: vékony penge, felül fanyél
    const ga = -Math.PI / 4; L.lat.ga = ga; const gr = 0.025 + 0.014; const gx = Math.cos(ga) * gr, gz = -Math.sin(ga) * gr; L.lat.gx = gx; L.lat.gz = gz;
    L.lat.knife = new THREE.Group(); E.add(L.lat.knife); L.lat.knife.add(box(0.0016, 0.07, 0.03, M(0xdfe3e6, { metalness: 0.9, roughness: 0.15 }), 0, 0.035, 0)); L.lat.knife.add(box(0.004, 0.012, 0.04, M(0xdfe3e6, { metalness: 0.9, roughness: 0.15 }), 0, 0.072, 0.03)); L.lat.knife.add(cyl(0.015, 0.015, 0.1, M(0x8a5a32, { roughness: 0.7 }), 0, 0.12, 0.05, 14));   // a nyél kifelé eltolva
    L.lat.knife.rotation.y = ga + Math.PI / 2;
    // levágott forgácsok a talplemezen
    L.lat.chips = new THREE.Group(); E.add(L.lat.chips); { const r = mulberry32(9); for (let i = 0; i < 40; i++) { const a = r() * Math.PI * 2, d = 0.06 + r() * 0.07; const m = new THREE.Mesh(new THREE.TorusGeometry(0.006 + r() * 0.006, 0.0025, 5, 8, Math.PI * (0.8 + r())), M(0x6c5f50, { roughness: 0.95 })); m.position.set(Math.cos(a) * d, 0.024, Math.sin(a) * d); m.rotation.set(Math.PI / 2 + (r() - 0.5), r() * 6, 0); L.lat.chips.add(m); } }
  }
  // ======================= 3. mérleg, víztartalom-tégelyek =======================
  { const E = new THREE.Group(); E.position.set(SCL.x, BT, SCL.z); G.add(E); L.scl = { G: E };
    bx(-0.11, 0.11, 0, 0.06, -0.14, 0.14, M(0xe6e8ea, { roughness: 0.4 }), E); bx(-0.11, 0.11, 0.0, 0.035, 0.14, 0.19, M(0xe6e8ea, { roughness: 0.4 }), E);
    E.add(cyl(0.07, 0.07, 0.006, st, 0, 0.066, -0.01, 40));
    L.scl.disp = canvasTex(256, 64); { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.03), new THREE.MeshBasicMaterial({ map: L.scl.disp.t })); m.position.set(0, 0.024, 0.1905); m.rotation.x = -0.6; E.add(m); }
    L.scl.spec = cyl(R0, R0, H0, SOILM(soilTex(false)), 0, 0.069 + H0 / 2, -0.01, 40); E.add(L.scl.spec);
    for (let i = 0; i < 3; i++) { const x = 0.2 + i * 0.075; E.add(cyl(0.03, 0.028, 0.022, M(0xc9ced3, { metalness: 0.8, roughness: 0.25 }), x, 0.011, 0.05, 24)); E.add(cyl(0.026, 0.026, 0.004, M(0x6c5f50, { roughness: 0.95 }), x, 0.019, 0.05, 20)); }
  }
  // ======================= 4. terhelőkeret + triaxiális cella =======================
  const TX = new THREE.Group(); TX.position.set(FRX, BT, FRZ); G.add(TX); L.TX = TX; const X = L.tx = {};
  bx(-0.21, 0.21, 0, 0.155, -0.17, 0.17, grey, TX); bx(-0.21, 0.21, 0.155, 0.162, -0.17, 0.17, al, TX);
  { X.panel = canvasTex(128, 48); const pn = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.04), new THREE.MeshBasicMaterial({ map: X.panel.t })); pn.position.set(-0.09, 0.095, 0.1705); TX.add(pn);
    for (let i = 0; i < 4; i++) TX.add(cyl(0.008, 0.008, 0.006, i ? dk : M(0xd23a2a), 0.03 + i * 0.03, 0.095, 0.171, 12).rotateX(Math.PI / 2)); }
  for (const x of [-0.19, 0.19]) { TX.add(cyl(0.016, 0.016, 0.95 - 0.162, st, x, 0.162 + (0.95 - 0.162) / 2, 0, 20)); TX.add(cyl(0.024, 0.024, 0.02, al, x, 0.96, 0, 16)); }
  bx(-0.235, 0.235, LCB + 0.075, LCB + 0.145, -0.045, 0.045, al, TX); for (const x of [-0.19, 0.19]) TX.add(cyl(0.028, 0.028, 0.08, al, x, LCB + 0.11, 0, 20));
  TX.add(cyl(0.032, 0.032, 0.06, M(0x2f343a, { metalness: 0.5, roughness: 0.35 }), 0, LCB + 0.03 + 0.012, 0, 28));    // erőmérő cella
  TX.add(cyl(0.011, 0.011, 0.012, st, 0, LCB + 0.006, 0, 14));
  { const pts = [V(0.032, LCB + 0.05, 0), V(0.12, LCB + 0.05, 0.02), V(0.25, LCB - 0.2, 0.08), V(0.3, 0.2, 0.12), V(0.33, 0.0, 0.16)]; TX.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.0025, 6), M(0x111214))); }
  const PL = new THREE.Group(); TX.add(PL); X.PL = PL;
  // a motoros alapegység emelőorsója a tárcsa alatt (a tárcsa sosem lóg a levegőben)
  X.jack = cyl(0.03, 0.03, 1, st, 0, 0, 0, 24); TX.add(X.jack); X.jackB = cyl(0.045, 0.045, 0.01, al, 0, 0.167, 0, 32); TX.add(X.jackB);
  // tálca a keret mellett: alsó szűrőkő + papír, a minta, felső papír + kő + fejlemez
  { const T = new THREE.Group(); TX.add(T); X.tray = T; T.position.set(0.33, 0, 0.05); bx(-0.09, 0.09, 0, 0.008, -0.07, 0.07, M(0xb9bec4, { metalness: 0.6, roughness: 0.35 }), T);
    for (const [x0, x1, z0, z1] of [[-0.09, 0.09, -0.07, -0.064], [-0.09, 0.09, 0.064, 0.07], [-0.09, -0.084, -0.07, 0.07], [0.084, 0.09, -0.07, 0.07]]) bx(x0, x1, 0.008, 0.016, z0, z1, M(0xb9bec4, { metalness: 0.6, roughness: 0.35 }), T);
    X.cStone = new THREE.Group(); TX.add(X.cStone); X.cStone.add(cyl(R0, R0, STN, stone, 0, STN / 2, 0, 40)); X.cStone.add(cyl(R0, R0, 0.0006, M(0xf2efe6, { roughness: 0.9 }), 0, STN + 0.0003, 0, 40));
    X.cSpec = cyl(R0, R0, H0, SOILM(soilTex(false)), 0, 0, 0, 48); TX.add(X.cSpec);
    X.cTop = new THREE.Group(); TX.add(X.cTop); X.cTop.add(cyl(R0, R0, 0.0006, M(0xf2efe6, { roughness: 0.9 }), 0, 0.0003, 0, 40)); X.cTop.add(cyl(R0, R0, STN, stone, 0, 0.0006 + STN / 2, 0, 40)); X.cTop.add(cyl(R0 + 0.001, R0 + 0.001, CAPH, M(0xd6dde2, { metalness: 0.5, roughness: 0.3 }), 0, 0.0006 + STN + CAPH / 2, 0, 40)); }
  PL.add(cyl(0.02, 0.02, 0.02, st, 0, 0.172, 0, 16)); PL.add(cyl(0.067, 0.067, 0.012, st, 0, 0.188, 0, 40));
  PL.add(cyl(0.1, 0.1, 0.03, al, 0, CB + 0.015, 0, 48));                                                   // talplemez
  // szelepek: 0 cellanyomás (hátul), 1 ellennyomás / felső drén (jobbra), 2 alsó drén (balra); pórusvíznyomás-mérő elöl-balra
  X.valves = []; const VA = [-Math.PI / 2 + 0.35, 0.15, Math.PI - 0.5];
  for (const a of VA) { const g = new THREE.Group(); g.position.set(0.1 * Math.cos(a), CB + 0.015, 0.1 * Math.sin(a)); g.rotation.y = -a; PL.add(g);
    g.add(bx(0, 0.028, -0.009, 0.009, -0.009, 0.009, brass, null)); const h = new THREE.Group(); h.position.set(0.014, 0.012, 0); g.add(h); h.add(cyl(0.004, 0.004, 0.012, st, 0, 0.006, 0, 8)); h.add(box(0.03, 0.005, 0.008, M(0xd23a2a, { roughness: 0.5 }), 0.012, 0.013, 0));
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.003, 12), new THREE.MeshBasicMaterial({ color: 0xff4d3a })); ring.position.set(0.004, 0.0105, 0); g.add(ring); X.valves.push({ g, h, ring }); }
  { const pt = new THREE.Group(); const a = 2.35; pt.position.set(0.1 * Math.cos(a), CB + 0.015, 0.1 * Math.sin(a)); pt.rotation.y = -a; PL.add(pt); pt.add(cyl(0.011, 0.011, 0.05, st, 0.03, 0, 0, 14).rotateZ(Math.PI / 2)); pt.add(cyl(0.004, 0.004, 0.02, blk, 0.06, 0.0, 0, 6).rotateZ(Math.PI / 2)); X.ptr = pt; }
  // talp, alsó szűrőkő, szűrőpapír
  PL.add(cyl(R0, R0 + 0.002, PED, st, 0, CY0 + PED / 2, 0, 40));
  X.stoneB = cyl(R0, R0, STN, stone, 0, CY0 + PED + STN / 2, 0, 40); PL.add(X.stoneB);
  X.paperB = cyl(R0, R0, 0.0006, M(0xf2efe6, { roughness: 0.9 }), 0, CY0 + PED + STN + 0.0003, 0, 40); PL.add(X.paperB);
  X.spec = buildSpecimen(PL);
  // felső rész (a minta tetején): szűrőpapír, szűrőkő, fejlemez a felső drénvezetékkel
  X.top = new THREE.Group(); PL.add(X.top); X.top.add(cyl(R0, R0, 0.0006, M(0xf2efe6, { roughness: 0.9 }), 0, 0.0003, 0, 40)); X.stoneT = cyl(R0, R0, STN, stone, 0, 0.0006 + STN / 2, 0, 40); X.top.add(X.stoneT);
  X.cap = cyl(R0 + 0.001, R0 + 0.001, CAPH, M(0xd6dde2, { metalness: 0.5, roughness: 0.3 }), 0, 0.0006 + STN + CAPH / 2, 0, 40); X.top.add(X.cap);
  X.top.add(cyl(0.0016, 0.0016, 0.012, M(0xd8e2e8, { roughness: 0.3 }), -0.016, 0.0006 + STN + CAPH + 0.004, 0, 6));
  X.drainT = new THREE.Mesh(new THREE.BufferGeometry(), M(0xd8e2e8, { roughness: 0.3 })); PL.add(X.drainT); X.drainKey = '';
  // O-gyűrűk
  const ringM = M(0x101112, { roughness: 0.5 }), mkR = () => { const o = new THREE.Mesh(new THREE.TorusGeometry(R0 + 0.0012, 0.0016, 8, 48).rotateX(Math.PI / 2), ringM); PL.add(o); return o; };
  X.oringB = [mkR(), mkR()]; X.oringT = [mkR(), mkR()];
  X.memB = new THREE.Mesh(new THREE.CylinderGeometry(R0 + 0.0005, R0 + 0.0005, 0.024, 40, 1, true), new THREE.MeshStandardMaterial({ color: 0xb08a5a, transparent: true, opacity: 0.3, roughness: 0.25, depthWrite: false })); PL.add(X.memB);
  X.memT = X.memB.clone(); PL.add(X.memT);
  // az akrilhenger-egység (fedőlap, húzórudak, persely) – a cella elhelyezésekor a laboráns tartja
  const CYL = new THREE.Group(); PL.add(CYL); X.CYL = CYL;
  const acr = new THREE.MeshStandardMaterial({ color: 0xa9bcc6, transparent: true, opacity: 0.09, roughness: 0.18, metalness: 0.0, side: THREE.DoubleSide, depthWrite: false });
  X.walls = []; { const o = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, CYH, 64, 1, true), acr); o.position.y = CY0 + CYH / 2; o.renderOrder = 12; CYL.add(o); const i = new THREE.Mesh(new THREE.CylinderGeometry(0.0655, 0.0655, CYH, 64, 1, true), acr); i.position.y = CY0 + CYH / 2; i.renderOrder = 12; CYL.add(i); X.walls.push(o, i);
    for (const y of [CY0 + 0.004, CY0 + CYH - 0.004]) { const rg = new THREE.Mesh(new THREE.RingGeometry(0.0655, 0.075, 64).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x9fb4c0, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false })); rg.position.y = y; CYL.add(rg); X.walls.push(rg); } }
  const topY = CY0 + CYH; X.topY = topY;
  CYL.add(cyl(0.1, 0.1, 0.025, al, 0, topY + 0.0125, 0, 48)); CYL.add(cyl(0.022, 0.022, 0.028, st, 0, topY + 0.039, 0, 24));
  { const vg = new THREE.Group(); vg.position.set(0.06, topY + 0.025, 0.02); CYL.add(vg); X.vent = vg; vg.add(cyl(0.006, 0.006, 0.012, st, 0, 0.006, 0, 10)); vg.add(cyl(0.009, 0.009, 0.005, M(0xd23a2a, { roughness: 0.5 }), 0, 0.0145, 0, 12));   // légtelenítő csavar (piros gomb)
    X.drip = new THREE.Mesh(new THREE.SphereGeometry(0.0035, 10, 8), new THREE.MeshStandardMaterial({ color: 0x8fd0f0, transparent: true, opacity: 0.8, roughness: 0.05 })); CYL.add(X.drip); }
  for (let k = 0; k < 3; k++) { const a = Math.PI / 6 + k * 2 * Math.PI / 3, x = 0.087 * Math.cos(a), z = 0.087 * Math.sin(a); CYL.add(cyl(0.006, 0.006, CYH + 0.075, st, x, CB + (CYH + 0.075) / 2, z, 12)); CYL.add(cyl(0.012, 0.012, 0.016, M(0x23262b, { roughness: 0.6 }), x, topY + 0.033, z, 10)); }
  X.water = new THREE.Mesh(new THREE.CylinderGeometry(0.0652, 0.0652, 1, 48, 1, false), new THREE.MeshStandardMaterial({ color: 0x3f7896, transparent: true, opacity: 0.12, roughness: 0.05, depthWrite: false })); X.water.renderOrder = 11; PL.add(X.water);
  // terhelőrúd (a fejlemezen áll, a perselyben fut); elmozdulásmérő a rúd konzolján, csúcsa a fedőlapon
  X.ram = cyl(0.0095, 0.0095, 1, st, 0, 0, 0, 16); TX.add(X.ram);
  X.lvdt = new THREE.Group(); TX.add(X.lvdt); bx(0, 0.075, -0.006, 0.006, -0.008, 0.008, al, X.lvdt); X.lvdt.add(cyl(0.009, 0.009, 0.085, dk, 0.07, -0.05, 0, 14)); X.lvTip = cyl(0.0025, 0.0025, 1, st, 0, 0, 0, 8); TX.add(X.lvTip);
  // ---- membránfeszítő (cső, a végein visszahajtott membrán, vákuumcsonk)
  { const S = new THREE.Group(); TX.add(S); X.str = S; const sm = new THREE.MeshStandardMaterial({ color: 0x9aa4ad, metalness: 0.6, roughness: 0.35, side: THREE.DoubleSide });
    S.add(new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.13, 40, 1, true), sm)); S.add(new THREE.Mesh(new THREE.CylinderGeometry(0.0335, 0.0335, 0.13, 40, 1, true), sm));
    for (const y of [-0.065, 0.065]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.0335, 0.0022, 6, 40).rotateX(Math.PI / 2), M(0xb08a5a, { roughness: 0.4 })); r.position.y = y; S.add(r); }
    X.strMem = new THREE.Mesh(new THREE.CylinderGeometry(0.0318, 0.0318, 0.13, 40, 1, true), new THREE.MeshStandardMaterial({ color: 0xb08a5a, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false })); S.add(X.strMem);
    S.add(cyl(0.004, 0.004, 0.03, brass, 0.045, 0, 0, 8).rotateZ(Math.PI / 2));
    X.strRings = []; for (const y of [-0.05, -0.04, 0.04, 0.05]) { const o = new THREE.Mesh(new THREE.TorusGeometry(0.0345, 0.0016, 6, 40).rotateX(Math.PI / 2), ringM); o.position.y = y; S.add(o); X.strRings.push(o); } }
  // ======================= 5. nyomás-/térfogatszabályozók =======================
  const ctl = (x, z, name) => { const g = new THREE.Group(); g.position.set(x, BT, z); G.add(g);
    bx(-0.27, 0.27, 0, 0.13, -0.07, 0.07, grey, g); bx(-0.27, 0.27, 0.13, 0.136, -0.07, 0.07, al, g);
    const sc = canvasTex(256, 112); const m = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.057), new THREE.MeshBasicMaterial({ map: sc.t })); m.position.set(-0.16, 0.075, 0.0705); g.add(m);
    for (let i = 0; i < 3; i++) g.add(cyl(0.007, 0.007, 0.006, dk, -0.05 + i * 0.025, 0.06, 0.0705, 10).rotateX(Math.PI / 2));
    g.add(cyl(0.012, 0.012, 0.03, brass, -0.285, 0.05, 0, 12).rotateZ(Math.PI / 2));
    // átlátszó ablak a dugattyús hengeren (térfogat)
    bx(0.04, 0.24, 0.045, 0.1, 0.069, 0.0705, M(0x9fc6dc, { transparent: true, opacity: 0.5 }), g); const pis = bx(0.04, 0.05, 0.048, 0.097, 0.0706, 0.071, M(0x2a2d32), g);
    return { g, sc, pis, name }; };
  L.ctlC = ctl(1.45, -1.32, 'CELLANYOMÁS'); L.ctlB = ctl(1.45, -1.08, 'ELLENNYOMÁS');
  // adatgyűjtő a keret mögött
  bx(0.95, 1.12, BT, BT + 0.07, -1.45, -1.3, M(0x2a2e33), G);
  // csövek: cellanyomás, ellennyomás (felső drén), alsó drén → pórusvíznyomás-mérő
  X.tubeC = flowTube(G, 0x3d7cc9); X.tubeB = flowTube(G, 0x3d7cc9);
  // ======================= 6. számítógép =======================
  { const g = new THREE.Group(); g.position.set(PC.x, BT, PC.z); G.add(g); L.pc = { g };
    bx(-0.08, 0.08, 0, 0.01, -0.07, 0.07, dk, g); bx(-0.02, 0.02, 0.01, 0.18, -0.04, 0.0, dk, g);
    bx(-0.3, 0.3, 0.14, 0.5, -0.02, 0.0, M(0x1d2024, { roughness: 0.4 }), g);
    L.pc.scr = canvasTex(1024, 600); const m = new THREE.Mesh(new THREE.PlaneGeometry(0.57, 0.334), new THREE.MeshBasicMaterial({ map: L.pc.scr.t })); m.position.set(0, 0.32, 0.0015); g.add(m);
    L.pc.kb = bx(-0.22, 0.22, 0, 0.018, 0.16, 0.3, M(0x2c3036, { roughness: 0.6 }), g); for (let r = 0; r < 4; r++) for (let c = 0; c < 14; c++) bx(-0.205 + c * 0.03, -0.205 + c * 0.03 + 0.024, 0.018, 0.024, 0.17 + r * 0.032, 0.17 + r * 0.032 + 0.026, M(0x3c4148, { roughness: 0.6 }), g);
    L.pc.mouse = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), M(0x2c3036, { roughness: 0.5 })); L.pc.mouse.scale.set(0.032, 0.018, 0.055); L.pc.mouse.position.set(0.32, 0.0, 0.24); g.add(L.pc.mouse);
    bx(0.26, 0.4, 0, 0.003, 0.15, 0.33, M(0x24272c, { roughness: 0.8 }), g); }
  // ---- fények (csak a laborban)
  const key = new THREE.DirectionalLight(0xfff2e2, 0); key.position.set(1.2, 2.9, 1.6); key.target.position.set(0, 1.0, -1.0); G.add(key, key.target); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -4, right: 4, top: 3, bottom: -2, near: 0.5, far: 10 }); key.shadow.bias = -0.0003; key.shadow.normalBias = 0.01; L.key = key;
  const fill = new THREE.PointLight(0xd8e6ff, 0, 7, 1.6); fill.position.set(-1.0, 2.2, 1.4); G.add(fill); L.fill = fill;
  const spot = new THREE.PointLight(0xfff0dc, 0, 2.5, 1.8); spot.position.set(FRX + 0.25, BT + 0.7, FRZ + 0.6); G.add(spot); L.spot = spot;
  // ---- laboráns (laborköpeny-szerű világos ing és mellény csíkok nélkül, sisak nélkül, kék nitrilkesztyű)
  L.tech = buildWorker({ vest: 0xeef0f2, shirt: 0xe3e7ea, pants: 0x2a3142, glove: 0x3d6fd1, boot: 0x2c2622, helmet: false, stripes: false, stance: 0 }); G.add(L.tech);
  L.timeK = 0;
  return L;
}

function reachW(w, pts, extra = {}) { w.updateWorldMatrix(true, false); const r = { ...extra }; for (const k of ['L', 'R']) if (pts[k]) { const p = pts[k]; r[k] = { palm: p.palm, contact: p.contact, axis: p.axis, axisPt: p.axisPt, radius: p.radius, gap: p.gap, ftilt: p.ftilt, local: w.worldToLocal(p.p.clone()), fdir: p.fdir, ldir: p.ldir, curl: p.curl, w: p.w, pole: p.pole ?? POLE[k] }; } w.userData.reach = r; }
const W = (L, x, y, z) => L.G.localToWorld(V(x, y, z));

// ---------- a cella állapota a vizsgálati fázisból ----------
export function cellState(t) {
  const S = TL.test(t);
  // hideg nyitás: a minta törése (látványos nyírási sík)
  if (t < tb(8)) { const e = t < tb(4) ? lerp(3, 13, smooth(seg(t, 0.2, tb(3, 2)))) : 4; return { ...S, ph: 'open', sc: 300, u: 300, ea: e, q: 0, fail: smooth(seg(t, tb(1, 3), tb(2, 1))), vlv: 0, shearMode: 1, drains: 1, sat: 1, cons: 1, ev: 3.1 }; }
  S.shearMode = S.ph === 'CU' ? 1 : 0; S.drains = (S.ph === 'CU' || S.ph === 'CD') ? 1 : 0;
  return S;
}

// ---------- képkockánként ----------
export function updateLab(L, t, shot, R) {
  const on = !!shot.lab; L.G.visible = on; if (!on) return null;
  const X = L.tx, C = cellState(t);
  // vizsgálati állapot → mozgások
  const mounted = t < tb(8) || t >= TL.MOUNT.spec;                           // a cella talpán ül a minta
  const cellDown = t < tb(8) || t >= tb(31, 3); const cK = t < tb(8) ? 1 : TL.cellK(t); const lift = 0.18 * (1 - cK);
  const cellVis = t < tb(8) || t >= tb(30);
  const app = t < tb(8) ? 1 : TL.appK(t);                                      // gyors közelítés: a rúd felfekszik az erőmérőre
  const ea = (C.ea || 0) / 100, ev = (C.ev || 0) / 100;
  const ec = ev / 3, d = ea * H0 * (1 - ec), dc = H0 * ec + STN * 0;          // nyírás + konszolidációs rövidülés
  X.PL.position.y = APP * app + d + dc * app;
  // minta
  const ep = C.ph === 'CU' ? 0.07 : C.ph === 'open' ? 0.06 : 1;              // CU: a nyírási sík 7 %-nál jelenik meg, utána azon csúszik
  const flash = C.shearMode && C.fail > 0 ? Math.exp(-Math.max(0, t - (C.ph === 'open' ? tb(2) : tb(83, 2))) * 2.5) : 0;
  const glow = t >= tb(48) && !shot.cut ? clamp(((C.u || 0) - (C.uB || 0)) / 260, 0, 1) * 0.32 : 0;
  const memb = mounted && (t < tb(8) || t >= tb(25, 3));
  const top = X.spec.set({ y0: SPB, H: H0, R: R0, ea, ep, shearOn: !!C.shearMode, ev, flash, glow, drains: C.drains, memb, vis: mounted, vconst: C.ph === 'CD' ? 0.35 : 1 });
  // a csúcs után a felső tömb elcsúszik: a csúcsig hordósodás, utána a teljes további rövidülés a síkon
  const topOn = t < tb(8) || t >= tb(23, 3); X.top.visible = mounted && topOn; X.top.position.set(top.dx, top.y, 0);
  X.stoneB.visible = X.paperB.visible = t < tb(8) || t >= tb(21);
  const rOn = (k) => t < tb(8) || t >= TL.MOUNT.oring + BEAT * (0.7 + k * 0.75);   // a gyűrűk egyenként gördülnek le a feszítőről
  X.oringB.forEach((o, i) => { o.visible = memb && rOn(i); o.position.y = CY0 + 0.009 + i * 0.011; });
  X.oringT.forEach((o, i) => { o.visible = memb && rOn(2 + i); o.position.set(top.dx, top.y + 0.0006 + STN + 0.006 + i * 0.009, 0); });
  // tálca és a kézben vitt elemek (kőlap, minta, fejrész): felemel – átvisz – leenged
  { const P0 = (x, y, z) => V(x, y, z), path = (a, b, k, hgt) => { const u = smooth(clamp(k / 0.3)), w = smooth(clamp((k - 0.25) / 0.5)), d = smooth(clamp((k - 0.7) / 0.3)); return V(lerp(a.x, b.x, w), a.y + hgt * u - (a.y + hgt - b.y) * d, lerp(a.z, b.z, w)); };
    const tr = X.tray.position, trayOn = t >= tb(8) && t < tb(30); X.tray.visible = trayOn || (t >= tb(8) && t < tb(36));
    const sA = P0(tr.x - 0.05, 0.008, tr.z + 0.03), sB = P0(0, CY0 + PED, 0), sk = TL.stoneK(t);
    X.cStone.visible = t >= tb(8) && t < tb(21); X.cStone.position.copy(path(sA, sB, sk, 0.16));
    const pA = P0(tr.x, 0.008 + H0 / 2, tr.z - 0.03), pB = P0(0, SPB + H0 / 2, 0), pk = TL.specK(t);
    X.cSpec.visible = t >= tb(8) && t < TL.MOUNT.spec; X.cSpec.position.copy(path(pA, pB, pk, 0.15));
    const cA = P0(tr.x + 0.05, 0.008, tr.z + 0.03), cB = P0(0, SPB + H0 + 0.0006 - 0.0006, 0), ck = TL.topK(t);
    X.cTop.visible = t >= tb(8) && t < tb(23, 3); X.cTop.position.copy(path(cA, cB, ck, 0.17)); X.carry = { sk, pk, ck }; }
  X.memB.visible = memb; X.memB.position.y = CY0 + 0.017; X.memT.visible = memb; X.memT.position.set(top.dx, top.y + 0.012, 0);
  // felső drénvezeték: a fejlemeztől a talplemez furatáig (a membrán mellett)
  if (mounted && X.top.visible && (t < tb(8) || TL.drainK(t) > 0.5)) { const p0 = V(top.dx - 0.016, top.y + 0.0006 + STN + CAPH + 0.009, 0), key = p0.y.toFixed(4) + p0.x.toFixed(4);
    if (key !== X.drainKey) { X.drainKey = key; X.drainT.geometry.dispose(); X.drainT.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([p0, p0.clone().add(V(-0.01, 0.012, -0.012)), V(-0.046, top.y - 0.02, -0.03), V(-0.05, CY0 + 0.05, -0.034), V(-0.05, CY0 + 0.002, -0.034)]), 40, 0.0016, 6); }
    X.drainT.visible = true; } else X.drainT.visible = false;
  // akrilhenger + fedőlap (a laboráns tartja, majd leereszti)
  X.CYL.visible = cellVis; X.CYL.position.y = lift; X.walls.forEach(m => { m.visible = !shot.cut; });
  { const vk = t < tb(8) ? 1 : TL.ventK(t), open = t >= tb(32, 3) && vk < 1; X.vent.position.y = X.topY + 0.025 + (open ? 0.004 : 0); X.vent.rotation.y = vk * Math.PI * 3;
    const fk = TL.fillK(t); X.drip.visible = open && fk > 0.97 && t < tb(35, 2); const dp = ((t - tb(34, 3)) / (BEAT * 0.5)) % 1; X.drip.position.set(0.06 + 0.012, X.topY + 0.035 - 0.03 * dp, 0.02); }
  // a tárcsa alatti emelőorsó: az alapegységből a tárcsáig
  X.jack.visible = X.PL.position.y > 0.002; if (X.jack.visible) setRod(X.jack, V(0, 0.16, 0), V(0, 0.165 + X.PL.position.y, 0));
  const wl = t < tb(8) ? 1 : (t >= tb(33) ? TL.fillK(t) : 0); X.water.visible = cellVis && cellDown && wl > 0.01 && !shot.cut; const wh = (CYH - 0.006) * wl; X.water.scale.y = Math.max(0.001, wh); X.water.position.y = CY0 + 0.003 + wh / 2;
  // terhelőrúd: a fejlemezen áll (a perselyben fut); felfekvés után a teteje az erőmérőn
  { const capTopW = X.PL.position.y + top.y + 0.0006 + STN + CAPH, rodBot = mounted && cellVis ? (cellDown ? capTopW : X.PL.position.y + lift + SPB + H0 + 0.0006 + STN + CAPH + 0.005) : null;
    X.ram.visible = rodBot !== null; if (X.ram.visible) { const rt = rodBot + PLEN; setRod(X.ram, V(top.dx * (cellDown ? 1 : 0), rodBot, 0), V(0, Math.min(rt, LCB), 0)); }
    X.lvdt.visible = X.lvTip.visible = X.ram.visible && cellDown; const ly = Math.min(rodBot + PLEN, LCB) - 0.045; X.lvdt.position.set(0, ly, 0); setRod(X.lvTip, V(0.07, X.PL.position.y + X.topY + 0.025, 0), V(0.07, ly - 0.0925, 0)); }
  // szelepek
  const vOpen = [t < tb(8) || t >= tb(33) ? 1 : 0, C.vlv, C.vlv]; X.valves.forEach((v, i) => { const o = i === 0 ? vOpen[0] : (C.ph === 'UU' || C.ph === 'open' ? 0 : vOpen[i]); v.h.rotation.y = o ? 0 : Math.PI / 2; v.ring.material.color.setHex(o ? 0x3ddc84 : 0xff4d3a); v.ring.visible = cellVis && (t < tb(8) || t >= tb(33)); });
  // membránfeszítő: a laboráns két kézzel leereszti a minta fölé, majd a membrán és az O-gyűrűk rákerülnek
  { const k = TL.membK(t), up = TL.strUpK(t), vis = t >= tb(24) && t < tb(28, 1);
    X.str.visible = vis; const yC = SPB + H0 / 2; X.str.position.set(0, X.PL.position.y + lerp(yC + 0.22, yC + 0.005, k) + 0.22 * up, 0); X.strMem.visible = t < tb(25, 3);
    const ro = [0, 1, 2, 3]; X.strRings.forEach((o, i) => { const k2 = [0, 1, 3, 2][i]; o.visible = t < TL.MOUNT.oring + BEAT * (0.7 + k2 * 0.75); }); }
  // csövek és áramlás
  { L.G.updateMatrixWorld(true); const vw = (i, dx = 0.03) => X.valves[i].g.localToWorld(V(dx, 0, 0)).sub(L.G.position);
    const show = cellVis && t >= tb(32, 3); X.tubeC.m.visible = X.tubeB.m.visible = show;
    if (show) { const pc = vw(0), pb = vw(1); const cC = L.ctlC.g.position.clone().add(V(-0.3, 0.05, 0)), cB = L.ctlB.g.position.clone().add(V(-0.3, 0.05, 0));
      X.tubeC.set([pc, pc.clone().add(V(0.0, -0.02, -0.04)), V(pc.x + 0.08, BT + 0.012, pc.z - 0.1), V(cC.x - 0.2, BT + 0.012, cC.z), cC]);
      X.tubeB.set([pb, pb.clone().add(V(0.04, -0.02, 0.0)), V(pb.x + 0.12, BT + 0.012, pb.z + 0.04), V(cB.x - 0.2, BT + 0.012, cB.z), cB]);
      X.tubeC.flow(t, t >= tb(33) && t < tb(35) ? -1 : 0); X.tubeB.flow(t, -(C.flow || 0)); } }
  // kijelzők
  drawCtl(L.ctlC.sc, 'CELLANYOMÁS', 'σ', 'c', C.sc || 0, 'kPa', t);
  drawCtl(L.ctlB.sc, C.ph === 'UU' || C.ph === 'open' ? 'NINCS BEKÖTVE' : 'ELLENNYOMÁS', 'u', 'B', C.ph === 'UU' || C.ph === 'open' ? null : (C.uB || 0), 'kPa', t);
  L.ctlC.pis.position.x = 0.045 + 0.15 * clamp((C.sc || 0) / 600, 0, 1); L.ctlB.pis.position.x = 0.045 + 0.15 * clamp(0.5 + (C.ev || 0) / 12, 0, 1);
  drawPanel(X.panel, C, t);
  // kitoló
  { const k = TL.extrudeK(t), E = L.ext; const px = lerp(-0.425, 0.455, k); E.plunger.position.x = px; setRod(E.rod, V(-0.42, E.yc, 0), V(px - 0.01, E.yc, 0));
    const c0 = lerp(-0.4, 0.5, k); E.core.position.x = c0 + 0.37; E.core.visible = t >= tb(8) && t < tb(13, 3);
    // a kupak: lehúzás (+x), majd az asztalra le
    { const ck = TL.capOffK(t), a = V(0.465, E.yc, 0), b = V(0.6, 0.021, 0.17); E.cap.visible = t < tb(13, 3);
      const u = smooth(clamp(ck / 0.45)), w = smooth(clamp((ck - 0.4) / 0.6)); E.cap.position.set(lerp(a.x + 0.09 * u, b.x, w), lerp(a.y, b.y, w) + 0.04 * Math.sin(Math.PI * w), lerp(a.z, b.z, w)); E.cap.rotation.z = (Math.PI / 2) * w; }
  }
  // eszterga
  { const k = TL.trimK(t), Lt = L.lat, r = lerp(0.0362, R0, k), h = Lt.spH; Lt.spec.visible = t >= tb(13, 3) && t < tb(17, 2); Lt.spec.scale.set(r, h, r); Lt.spec.position.y = 0.035 + h / 2; const a = TL.latheA(t);
    Lt.spec.rotation.y = a; Lt.turn.rotation.y = a; Lt.top.position.y = 0.035 + h; Lt.top.rotation.y = a; Lt.chips.visible = k > 0.05; Lt.chips.scale.setScalar(0.4 + 0.6 * k);
    const ky = TL.knifeY(t); Lt.knife.position.set(Lt.gx, 0.035 + lerp(-0.005, h + 0.03, ky), Lt.gz); }
  // mérleg
  { const m = 382.9; const show = t >= tb(17, 2) && t < tb(20); L.scl.spec.visible = show; drawScale(L.scl.disp, show && t >= tb(17, 3) ? m : 0); }
  // számítógép
  drawPC(L.pc.scr, C, t);
  // fények
  L.key.intensity = 2.2; L.fill.intensity = 9; L.spot.intensity = shot.spot ?? 1.2;
  // laboráns
  techPose(L, t, shot);
  return C;
}

// ---------- laboráns: helyzet és kézfogások állomásonként ----------
function techPose(L, t, shot) {
  const w = L.tech, inW = (b0, b1) => t >= tb(b0) && t < tb(b1); w.visible = shot.tech !== false;
  const at = (x, z, ry = Math.PI) => { w.position.set(x, 0, z); w.rotation.y = ry; w.updateWorldMatrix(true, false); };   // a laboráns a labor-csoport gyermeke: helyi koordináták
  const f = () => V(Math.sin(w.rotation.y), 0, Math.cos(w.rotation.y));
  L.G.updateMatrixWorld(true);
  const X = L.tx; X.PL.updateMatrixWorld(true);
  const TXW = (p) => L.TX.localToWorld(p.clone());                      // keret-helyi → világ
  const rest = (side, p, F = V(0, 0, -1)) => { const g = palmOn(p, V(0, 1, 0), F, side, { curl: 0.3, gap: 0.022 }); g.pole = side === 'L' ? V(0.9, -0.5, -0.3) : V(-0.9, -0.5, -0.3); return g; };
  if (inW(8.25, 10.5)) { // kupak lehúzása: jobb kéz a kupakon, bal tenyér a csövön
    at(EXT.x + 0.3, -0.55); const E = L.ext; E.G.updateMatrixWorld(true); const cw = E.cap.localToWorld(V(0, 0, 0));
    const gR = gripCylinder(cw, V(1, 0, 0), 0.042, V(-0.1, -0.35, -1).normalize(), 'R', { curl: 0.6 }); gR.pole = V(-0.9, -0.5, -0.3);
    const gL = rest('L', E.G.localToWorld(V(0.18, E.yc + 0.038, 0)), V(0.2, 0, -1).normalize());
    reachW(w, { L: gL, R: gR }, { look: 0.45, lean: 0.12 }); return; }
  if (inW(10.5, 13.5)) { // kitoló: a bal kéz mutatóujja a kezelődoboz zöld gombján, a jobb tenyér a csövön nyugszik
    at(EXT.x + 0.02, -0.55); const E = L.ext; E.G.updateMatrixWorld(true); const bp = E.ctl.localToWorld(V(-0.025, E.btnY, 0)), fw = E.ctl.localToWorld(V(0, E.btnY, -1)).sub(E.ctl.localToWorld(V(0, E.btnY, 0))).normalize();
    const gL = palmOn(bp.clone().addScaledVector(fw, -0.04), V(0, 1, 0), fw, 'L', { curl: 0.55, gap: 0.03 }); gL.pole = V(0.9, -0.5, -0.3);
    const gR = palmOn(W(L, EXT.x + 0.14, BT + 0.11 + 0.038, EXT.z), V(0, 1, 0), V(0.15, 0, -1).normalize(), 'R', { curl: 0.85, gap: 0.026 }); gR.pole = V(-0.9, -0.5, -0.3);
    reachW(w, { L: gL, R: gR }, { look: 0.45, lean: 0.1 }); return; }
  if (inW(13.5, 17.5)) { // eszterga: bal kéz a hajtókar gombján, jobb a kés nyelén
    at(LAT.x + 0.02, -0.55); const Lt = L.lat; Lt.G.updateMatrixWorld(true);
    const kc = Lt.knob.getWorldPosition(V()); const gL = gripCylinder(kc, V(0, 1, 0), 0.011, V(0.3, -0.2, -1).normalize(), 'L'); gL.pole = V(0.9, -0.5, -0.2);
    const hc = Lt.knife.localToWorld(V(0, 0.12, 0.05)); const gR = gripCylinder(hc, V(0, 1, 0), 0.015, V(-0.25, 0, -1).normalize(), 'R'); gR.pole = V(-0.9, -0.5, -0.2);
    reachW(w, { L: gL, R: gR }, { look: 0.5, lean: 0.15 }); return; }
  const restL = () => rest('L', TXW(V(-0.12, 0.162, 0.13)), V(0.3, 0, -1).normalize());
  if (inW(20, 21.2) || inW(22.8, 24)) { // kőlap / fejrész: jobb kéz fogja oldalról, bal tenyér a keret alapján
    at(FRX + 0.12, -0.6); const obj = inW(20, 21.2) ? X.cStone : X.cTop, hy = inW(20, 21.2) ? STN / 2 : 0.0006 + STN + CAPH * 0.5, r = inW(20, 21.2) ? R0 : R0 + 0.001;
    const c = TXW(obj.position.clone().add(V(0, hy, 0))); const gR = gripCylinder(c, V(0, 1, 0), r, V(-0.2, -0.3, -1).normalize(), 'R', { curl: 0.7, palmOff: 0.012 }); gR.pole = V(-0.9, -0.5, -0.3);
    reachW(w, { L: restL(), R: gR }, { look: 0.5, lean: 0.14 }); return; }
  if (inW(21.2, 22.8)) { // a minta két kézzel, két oldalról
    at(FRX + 0.15, -0.58); const c = TXW(X.cSpec.position);
    const gL = gripCylinder(c.clone().add(V(-R0, 0, 0)), V(0, 1, 0), 0.006, V(1, 0, 0.1).normalize(), 'L', { curl: 0.5, palmOff: 0.012 }); gL.pole = V(0.9, -0.5, -0.2);
    const gR = gripCylinder(c.clone().add(V(R0, 0, 0)), V(0, 1, 0), 0.006, V(-1, 0, 0.1).normalize(), 'R', { curl: 0.5, palmOff: 0.012 }); gR.pole = V(-0.9, -0.5, -0.2);
    gL.contact = c.clone().add(V(-R0, 0, 0)); gR.contact = c.clone().add(V(R0, 0, 0)); gL.axisPt = c.clone(); gR.axisPt = c.clone(); gL.radius = gR.radius = R0;
    reachW(w, { L: gL, R: gR }, { look: 0.5, lean: 0.14 }); return; }
  if (inW(24, 28.25)) { // membránfeszítő két kézzel, oldalról (leengedés, gyűrűk legördítése, levétel)
    at(FRX, -0.56); const S = X.str; S.updateMatrixWorld(true); const c = S.getWorldPosition(V());
    const gL = palmOn(c.clone().add(V(-0.0335, 0, 0)), V(-1, 0, 0), V(0, 0.15, -1).normalize(), 'L', { curl: 0.45, gap: 0.021 }); gL.pole = V(0.9, -0.5, -0.1);
    const gR = palmOn(c.clone().add(V(0.0335, 0, 0)), V(1, 0, 0), V(0, 0.15, -1).normalize(), 'R', { curl: 0.45, gap: 0.021 }); gR.pole = V(-0.9, -0.5, -0.1);
    reachW(w, { L: gL, R: gR }, { look: 0.55, lean: 0.18 }); return; }
  if (inW(28.25, 30)) { // a felső drén csöve: jobb kéz a fejlemez csonkjánál
    at(FRX + 0.05, -0.58); const tp = X.top.getWorldPosition(V()).add(V(-0.016, 0.0006 + STN + CAPH + 0.012, 0));
    const gR = gripCylinder(tp, V(0, 1, 0), 0.004, V(-0.3, -0.4, -1).normalize(), 'R', { curl: 0.9, palmOff: 0.014 }); gR.pole = V(-0.9, -0.5, -0.3);
    reachW(w, { L: restL(), R: gR }, { look: 0.6, lean: 0.18 }); return; }
  if (inW(30, 31.75)) { // a cella (akrilhenger) két kézzel, oldalról fogva
    at(FRX, -0.56); const CY = X.CYL; CY.updateMatrixWorld(true); const c = CY.localToWorld(V(0, CY0 + 0.15, 0));
    const gL = gripCylinder(c.clone().add(V(-0.075, 0, 0)), V(0, 1, 0), 0.006, V(1, 0, 0.15).normalize(), 'L', { curl: 0.55, palmOff: 0.014 }); gL.pole = V(0.9, -0.5, -0.1);
    const gR = gripCylinder(c.clone().add(V(0.075, 0, 0)), V(0, 1, 0), 0.006, V(-1, 0, 0.15).normalize(), 'R', { curl: 0.55, palmOff: 0.014 }); gR.pole = V(-0.9, -0.5, -0.1);
    gL.contact = c.clone().add(V(-0.075, 0, 0)); gR.contact = c.clone().add(V(0.075, 0, 0)); gL.axisPt = c.clone(); gR.axisPt = c.clone(); gL.radius = gR.radius = 0.075;
    reachW(w, { L: gL, R: gR }, { look: 0.45, lean: 0.12 }); return; }
  if (inW(31.75, 32.9) || inW(35, 36)) { // húzórúd-anya / légtelenítő gomb: jobb kéz, bal tenyér a fedőlapon
    at(FRX + 0.05, -0.57); const CY = X.CYL; CY.updateMatrixWorld(true); const a = Math.PI / 6;
    const p = inW(35, 36) ? X.vent.localToWorld(V(0, 0.0145, 0)) : CY.localToWorld(V(0.087 * Math.cos(a), X.topY + 0.033, 0.087 * Math.sin(a)));
    const gR = gripCylinder(p, V(0, 1, 0), inW(35, 36) ? 0.009 : 0.012, V(-0.2, -0.5, -1).normalize(), 'R', { curl: 0.85, palmOff: 0.012 }); gR.pole = V(-0.9, -0.5, -0.3);
    const gL = rest('L', CY.localToWorld(V(-0.05, X.topY + 0.025, 0.04)), V(0.2, 0, -1).normalize());
    reachW(w, { L: gL, R: gR }, { look: 0.55, lean: 0.14 }); return; }
  // alapállás: a számítógépnél (bal kéz a billentyűzeten, jobb az egéren)
  at(PC.x + 0.05, -0.55); const pc = L.pc.g; pc.updateMatrixWorld(true);
  const kL = palmOn(pc.localToWorld(V(-0.07, 0.03, 0.24)), V(0, 1, 0), V(0.2, 0, -1).normalize(), 'L', { curl: 0.35, gap: 0.03 }); kL.pole = V(0.9, -0.5, -0.3);
  const mR = palmOn(pc.localToWorld(V(0.32, 0.036, 0.255)), V(0, 1, 0), V(0, 0, -1), 'R', { curl: 0.45, gap: 0.014 }); mR.pole = V(-0.9, -0.5, -0.3);
  reachW(w, { L: kL, R: mR }, { look: 0.3, lean: 0.06 });
}

// ---------- vásznas kijelzők ----------
function drawCtl(S, title, sym, sub, v, unit, t) {
  const g = S.g; g.fillStyle = '#0e2418'; g.fillRect(0, 0, 256, 112); g.fillStyle = '#9fe36a'; g.font = '700 22px Arial'; g.textAlign = 'left'; g.fillText(title, 12, 30);
  if (v === null) { g.font = '700 30px Arial'; g.fillText('—', 12, 86); S.t.needsUpdate = true; return; }
  g.font = 'italic 700 40px Arial'; g.fillText(sym, 12, 86); g.font = '700 22px Arial'; g.fillText(sub, 12 + g.measureText(sym).width + 8, 94);
  g.font = '700 46px Arial'; g.textAlign = 'right'; g.fillText(String(Math.round(v)), 200, 88); g.font = '700 20px Arial'; g.fillText(unit, 248, 88); S.t.needsUpdate = true;
}
function drawPanel(S, C, t) { const g = S.g; g.fillStyle = '#0e2418'; g.fillRect(0, 0, 128, 48); g.fillStyle = '#9fe36a'; g.font = '700 22px Arial'; g.textAlign = 'center'; g.fillText((C.ea || 0).toFixed(2) + ' %', 64, 32); S.t.needsUpdate = true; }
function drawScale(S, m) { const g = S.g; g.fillStyle = '#0d1f14'; g.fillRect(0, 0, 256, 64); g.fillStyle = '#9fe36a'; g.font = '700 44px Arial'; g.textAlign = 'right'; g.fillText(m ? m.toFixed(1).replace('.', ',') : '0,0', 200, 50); g.font = '700 26px Arial'; g.fillText('g', 240, 50); S.t.needsUpdate = true; }
let _pcLast = -1;
function drawPC(S, C, t) {
  const fr = Math.floor(t * 8); if (fr === _pcLast) return; _pcLast = fr;
  const g = S.g, W = 1024, H = 600; g.fillStyle = '#10161d'; g.fillRect(0, 0, W, H); g.fillStyle = '#1b2530'; g.fillRect(0, 0, W, 56);
  g.fillStyle = '#d8e2ea'; g.font = '700 30px Arial'; g.textAlign = 'left'; g.fillText('TRIAXIÁLIS VIZSGÁLAT' + (C.ph && C.ph !== 'pre' && C.ph !== 'open' ? '  ·  ' + C.ph : ''), 24, 38);
  // q – ε görbe
  const L = 90, R = 640, T = 100, B = 540; g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 2; g.beginPath(); g.moveTo(L, T); g.lineTo(L, B); g.lineTo(R, B); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.6)'; g.font = '600 22px Arial'; g.fillText('q [kPa]', L - 70, T - 14); g.fillText('ε [%]', R - 50, B + 36);
  const col = C.ph === 'UU' ? '#FF8A4C' : C.ph === 'CU' ? '#3FE0C5' : C.ph === 'CD' ? '#F2C14E' : '#B48CFF';
  const qmax = C.ph === 'CD' ? 400 : C.ph === 'CU' ? 200 : 150; const fq = C.ph === 'UU' ? (e) => TL.qUU(e, TL.UU[1].qf) : C.ph === 'CU' ? (e) => TL.qCU(e, TL.CU[1].qf) : C.ph === 'CD' ? (e) => TL.qCD(e, TL.CD[1].qf) : null;
  if (fq && C.ea > 0) { g.strokeStyle = col; g.lineWidth = 5; g.beginPath(); for (let e = 0; e <= C.ea; e += 0.1) { const x = L + e / 16 * (R - L), y = B - fq(e) / qmax * (B - T); if (e === 0) g.moveTo(x, y); else g.lineTo(x, y); } g.stroke(); }
  // értékek
  const rows = [['σc', (C.sc || 0).toFixed(0) + ' kPa'], ['u', (C.u || 0).toFixed(0) + ' kPa'], ['ε', (C.ea || 0).toFixed(2) + ' %'], ['q', (C.q || 0).toFixed(1) + ' kPa'], ['ΔV', (C.ev || 0).toFixed(2) + ' %']];
  g.font = '700 30px Arial'; rows.forEach(([k, v], i) => { g.fillStyle = 'rgba(255,255,255,0.6)'; g.textAlign = 'left'; g.fillText(k, 690, 140 + i * 82); g.fillStyle = '#ffffff'; g.textAlign = 'right'; g.fillText(v, 1000, 140 + i * 82); });
  S.t.needsUpdate = true;
}
