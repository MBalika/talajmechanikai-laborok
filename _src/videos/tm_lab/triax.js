// Triaxiális vizsgálat (EN ISO 17892-8, -9) – készülék és eszközök, a laboráns kezéhez méretezve.
// Méretek méterben; minden tárgy a saját helyi rendszerében, az origó a talpán (ha másképp nincs írva).
// Felépítés: padlón álló függőleges hidraulikus mintakinyomó (a minta a behatolás irányában, felfelé hagyja el a csövet),
// talajeszterga (forgó alsó tányér, lehúzható felső tányér hajtókarral, vezetősín a késnek), asztali terhelőkeret
// (motoros alapegység emelkedő tárcsával, két oszlop, kereszttartó erőmérővel), triaxiális cella (talplemez szelepekkel,
// talp, akrilhenger fedőlappal, három húzórúd anyával, perselyben futó terhelőrúd, légtelenítő), membránfeszítő O-gyűrűkkel,
// két nyomás-/térfogatszabályozó, pórusvíznyomás-mérő.
import * as THREE from 'three';
import { M, cyl, bx, MAT, SOILM, canvasTex, screen, setRod, mulberry32, clamp } from './room.js';
import { mats2 } from './oedo2.js';
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const lathe = (pts, mat, seg = 48) => { const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg); const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; return m; };

// ---------------- méretek (a terhelőkeret helyi rendszerében, y az asztallaptól; a tárcsa-csoport (PL) ezekhez képest emelkedik) ----------------
export const TD = {
  BTOP: 0.12,                 // az alapegység teteje
  CB: 0.144,                  // a tárcsa (platen) teteje = a talplemez alja
  CY0: 0.174,                 // a talplemez teteje = a henger alja = a talp alja
  PED: 0.03, R0: 0.025, STN: 0.006, PAP: 0.0006, H0: 0.1, CAPH: 0.02,
  CYH: 0.26, CYR: 0.075, CYRI: 0.0655, TPH: 0.025, TPR: 0.1, ROD: 0.087,
  PLEN: 0.2,                  // terhelőrúd
  RAMHANG: 0.14,              // a felemelt cellában a rúd alja ennyivel a henger alja fölött lóg (a perselyben megakad)
  LCB: 0.74,                  // az erőmérő alja (a tárcsa alsó helyzetében)
  COL: 0.19,
};
TD.SPB = TD.CY0 + TD.PED + TD.STN + TD.PAP;               // a minta alja (0,2106)
TD.CAPB = TD.SPB + TD.H0 + TD.PAP + TD.STN;               // a fejlemez alja (0,3172)
TD.CAPTOP = TD.CAPB + TD.CAPH;                            // a fejlemez teteje (0,3372)
TD.APP = TD.LCB - (TD.CAPTOP + TD.PLEN);                  // gyors közelítés: ennyit emelkedik a tárcsa, amíg a rúd felfekszik (≈ 0,203)
TD.TOPY = TD.CYH;                                         // a fedőlap alja a henger-egység rendszerében
TD.RODA = [Math.PI / 6, 5 * Math.PI / 6, 3 * Math.PI / 2];   // a húzórudak szöge (két elöl, egy hátul): x = r·cos a, z = r·sin a (+z: a laboráns felé)
export const rodXZ = (k) => [TD.ROD * Math.cos(TD.RODA[k]), TD.ROD * Math.sin(TD.RODA[k])];
// szelepek a talplemez peremén (a tárcsa-csoport rendszerében): 0 cellanyomás (elöl-balra), 1 ellennyomás / felső drén (jobbra hátul), 2 alsó drén (balra hátul)
export const VALVE_A = [2.25, -0.35, -2.55], PPT_A = 0.95;

// ---------------- talaj-textúra (oldalsó szűrőpapír-csíkokkal vagy anélkül) ----------------
function soilTex(drains) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 1024; const g = c.getContext('2d');
  g.fillStyle = '#5a4e42'; g.fillRect(0, 0, 1024, 1024); const r = mulberry32(drains ? 21 : 11);
  for (let i = 0; i < 26000; i++) { const v = 58 + r() * 70; g.fillStyle = `rgba(${v + 24 | 0},${v + 12 | 0},${v - 4 | 0},${0.22 + r() * 0.4})`; const q = 1 + r() * 2.4; g.fillRect(r() * 1024, r() * 1024, q, q); }
  for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(40,32,24,${0.15 + r() * 0.15})`; g.lineWidth = 1 + r() * 2; g.beginPath(); const y = r() * 1024; g.moveTo(0, y); g.bezierCurveTo(300, y + (r() - 0.5) * 60, 700, y + (r() - 0.5) * 60, 1024, y + (r() - 0.5) * 30); g.stroke(); }
  if (drains) { g.fillStyle = 'rgba(214,208,192,0.72)'; const n = 8, w = 1024 / n * 0.3;
    for (let k = -2; k < n + 3; k++) { const x0 = k * 1024 / n; g.beginPath(); g.moveTo(x0, 1024); g.lineTo(x0 + w, 1024); g.lineTo(x0 + w + 1024 * 0.75, 0); g.lineTo(x0 + 1024 * 0.75, 0); g.closePath(); g.fill(); } }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
const SOILT = (tex) => new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92, emissive: 0x1f6fd0, emissiveIntensity: 0 });
let _texP = null, _texD = null; const texP = () => _texP || (_texP = soilTex(false)), texD = () => _texD || (_texD = soilTex(true));

// ---------------- deformálható próbatest a cellában (hordósodás, nyírási sík, konszolidációs zsugorodás) ----------------
export function buildSpecimen(parent) {
  const sg = new THREE.CylinderGeometry(1, 1, 1, 96, 120, false); sg.rotateY(Math.PI); sg.translate(0, 0.5, 0);
  const base = sg.attributes.position.array.slice();
  const mat = SOILT(texP()); const soil = new THREE.Mesh(sg, mat); soil.castShadow = true; soil.receiveShadow = true; parent.add(soil);
  const memM = new THREE.MeshStandardMaterial({ color: 0x8a6a46, transparent: true, opacity: 0.16, roughness: 0.12, metalness: 0.1, depthWrite: false });
  const mem = new THREE.Mesh(sg.clone(), memM); mem.renderOrder = 10; parent.add(mem);
  const band = new THREE.Group(); parent.add(band); const bandM = [new THREE.MeshBasicMaterial({ color: 0x120c07, transparent: true, opacity: 0, depthWrite: false }), new THREE.MeshBasicMaterial({ color: 0xd9c4ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })];
  { const tr = Math.tan(Math.PI / 3); for (const s of [1, -1]) { const pts = []; for (let i = 0; i <= 64; i++) { const a = Math.PI / 2 + s * Math.PI * i / 64; pts.push(V(Math.cos(a), tr * Math.cos(a), Math.sin(a))); }
      const crv = new THREE.CatmullRomCurve3(pts); const c1 = new THREE.Mesh(new THREE.TubeGeometry(crv, 128, 0.06, 6), bandM[0]); c1.renderOrder = 12; const c2 = new THREE.Mesh(new THREE.TubeGeometry(crv, 128, 0.11, 6), bandM[1]); c2.renderOrder = 13; band.add(c1, c2); } }
  const O = { soil, mem, mat, memM, band, bandM, base, last: '' };
  // p: { y0, H, R, ea (arány), ep (a nyírási sík megjelenése), shearOn, ev (arány), flash, glow, drains, memb, vis, vconst }
  O.set = (p) => {
    const key = [p.y0, p.H, p.R, p.ea, p.ep, p.ev, p.flash, p.vconst, p.shearOn ? 1 : 0].map(v => (+v || 0).toFixed(5)).join('|');
    mat.map = p.drains ? texD() : texP(); mat.emissiveIntensity = p.glow || 0; mem.visible = !!p.memb && p.vis !== false; soil.visible = p.vis !== false;
    if (key === O.last) return O.top; O.last = key;
    const ec = (p.ev || 0) / 3, Hc = p.H * (1 - ec), Rc = p.R * (1 - ec), ea = p.ea || 0, ep = p.shearOn ? Math.min(ea, p.ep ?? 1) : ea;
    const hp = Hc * (1 - ep), bul = 1.3 * ep, TH = Math.PI / 3, cT = Math.cos(TH), sT = Math.sin(TH);
    const sl = p.shearOn ? Math.max(0, ea - ep) * Hc / sT : 0, yc = hp / 2, bw = 0.0011;
    const pos = soil.geometry.attributes.position, mp = mem.geometry.attributes.position;
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
// egyszerű talajhenger (kézben vitt darab): origó az alján; set(r, h) a méret
export function soilCyl(drains = false) { const g = new THREE.Group(); const m = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 64, 1), SOILT(drains ? texD() : texP())); m.castShadow = true; m.receiveShadow = true; g.add(m); g.m = m;
  g.set = (r, h) => { m.scale.set(r, h, r); m.position.y = h / 2; g.r = r; g.h = h; }; g.set(TD.R0, TD.H0); return g; }

// ---------------- folyást mutató cső (mozgó szaggatás) ----------------
export function flowTube(parent, color) {
  const c = document.createElement('canvas'); c.width = 64; c.height = 8; const g = c.getContext('2d'); g.fillStyle = '#ffffff'; g.fillRect(0, 0, 64, 8); g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(36, 0, 28, 8);
  const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(30, 1);
  const mat = new THREE.MeshStandardMaterial({ color, map: tex, transparent: true, opacity: 0.88, roughness: 0.3, emissive: color, emissiveIntensity: 0, emissiveMap: tex });
  const m = new THREE.Mesh(new THREE.BufferGeometry(), mat); m.castShadow = true; parent.add(m);
  const T = { m, mat, tex, key: '' };
  T.set = (pts, r = 0.0032) => { const key = pts.map(p => p.toArray().map(v => v.toFixed(4)).join(',')).join(';'); if (key === T.key) return; T.key = key;
    m.geometry.dispose(); const crv = new THREE.CatmullRomCurve3(pts); m.geometry = new THREE.TubeGeometry(crv, 64, r, 8); tex.repeat.set(Math.max(4, crv.getLength() / 0.03), 1); };
  T.flow = (t, f) => { tex.offset.x = -t * 1.6 * f; mat.emissiveIntensity = Math.abs(f) > 0.01 ? 0.55 : 0.05; };
  return T;
}

// ---------------- 1. függőleges mintakinyomó (a padlón) ----------------
// a mintavevő cső (Ø 76 mm, 0,5 m) vágóéllel lefelé áll; a hidraulikus munkahenger alulról tolja a mintát, az a cső tetején lép ki.
// Oldalt polc (huzalfűrész, a levett kupak), bal oldalon kezelődoboz (zöld: fel, piros: vissza).
export const VE = { TB: 0.6, TT: 1.1, TR: 0.038, CR: 0.0362, SHX: [0.2, 0.56], SHY: 1.0, SHZ: [-0.12, 0.08], PEND: [-0.2, 0.98, -0.06], CZ: -0.12, CX: 0.11 };
export function vExtruder() {
  const A = mats2(); const g = new THREE.Group(); const blue = M(0x30589a, { metalness: 0.4, roughness: 0.45 }), red = M(0xb22b22, { metalness: 0.3, roughness: 0.4 });
  bx(-0.24, 0.24, 0, 0.04, -0.24, 0.2, blue, g);                                                        // talplemez
  for (const x of [-VE.CX, VE.CX]) { g.add(cyl(0.02, 0.02, 1.0, A.steel, x, 0.04 + 0.5, VE.CZ, 20)); g.add(cyl(0.026, 0.026, 0.012, A.dark, x, 1.046, VE.CZ, 16)); }    // két oszlop hátul, zárósapkával
  g.add(cyl(0.065, 0.065, 0.42, red, 0, 0.04 + 0.21, 0, 32));                                           // munkahenger
  // csőtartók: gyűrű a cső körül, karral hátra az oszlopokhoz (elöl és fölötte szabad)
  for (const y of [VE.TB - 0.03, VE.TT - 0.075]) { const r = new THREE.Mesh(new THREE.TorusGeometry(VE.TR + 0.006, 0.007, 8, 32).rotateX(Math.PI / 2), blue); r.position.y = y; g.add(r);
    bx(-0.025, 0.025, y - 0.01, y + 0.01, VE.CZ, -VE.TR - 0.008, blue, g); bx(-VE.CX, VE.CX, y - 0.01, y + 0.01, VE.CZ - 0.015, VE.CZ + 0.015, blue, g); }
  const tubeM = new THREE.MeshStandardMaterial({ color: 0xb7bcc1, metalness: 0.75, roughness: 0.3, side: THREE.DoubleSide });
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(VE.TR, VE.TR, VE.TT - VE.TB, 40, 1, true), tubeM); tube.position.y = (VE.TB + VE.TT) / 2; g.add(tube);
  { const r = new THREE.Mesh(new THREE.RingGeometry(VE.CR, VE.TR, 40).rotateX(-Math.PI / 2), tubeM); r.position.y = VE.TT; g.add(r); }
  g.rod = cyl(0.016, 0.016, 1, A.steel, 0, 0, 0, 14); g.add(g.rod);                                       // a munkahenger rúdja
  g.plunger = cyl(0.0355, 0.0355, 0.02, A.alu, 0, 0, 0, 32); g.add(g.plunger);
  g.core = cyl(1, 1, 1, SOILT(texP()), 0, 0, 0, 40); g.add(g.core);                                       // a csőben lévő minta (alja a dugattyún)
  g.setCore = (yb, yt) => { g.core.scale.set(VE.CR, Math.max(0.001, yt - yb), VE.CR); g.core.position.y = (yb + yt) / 2; g.plunger.position.y = yb - 0.01; setRod(g.rod, V(0, 0.46, 0), V(0, yb - 0.02, 0)); };
  // polc a jobb oszlopon (huzalfűrész, a levett kupak)
  bx(VE.SHX[0], VE.SHX[1], VE.SHY - 0.018, VE.SHY, VE.SHZ[0], VE.SHZ[1], M(0x8a96a3, { roughness: 0.5 }), g); bx(VE.CX, VE.SHX[0], VE.SHY - 0.03, VE.SHY - 0.012, VE.CZ - 0.015, VE.CZ + 0.015, blue, g);
  // kezelődoboz a bal oszlopon (gombok elöl, +z)
  { const cb = new THREE.Group(); cb.position.set(...VE.PEND); g.add(cb); g.pend = cb; bx(-0.045, 0.045, -0.06, 0.06, -0.03, 0.03, M(0xe6c229, { roughness: 0.5 }), cb);
    cb.add(cyl(0.012, 0.012, 0.01, M(0x2fbf4f, { roughness: 0.4 }), 0, 0.025, 0.03, 16).rotateX(Math.PI / 2)); cb.add(cyl(0.012, 0.012, 0.01, M(0xd23a2a, { roughness: 0.4 }), 0, -0.02, 0.03, 16).rotateX(Math.PI / 2));
    g.btnUp = V(VE.PEND[0], VE.PEND[1] + 0.025, VE.PEND[2] + 0.035); bx(0.045, 0.075, -0.015, 0.015, -0.07, 0.0, blue, cb);
    const cab = [V(VE.PEND[0], 0.92, VE.PEND[2]), V(VE.PEND[0] - 0.01, 0.6, VE.PEND[2] - 0.02), V(-0.16, 0.25, -0.1), V(-0.09, 0.2, -0.12)]; g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cab), 30, 0.004, 6), A.black)); }
  // hidraulikus tápegység a talplemez mögött
  bx(-0.22, -0.05, 0.04, 0.26, -0.23, -0.15, M(0x2b2f35, { roughness: 0.5 }), g);
  return g;
}
// kupak a cső tetején (paraffinréteggel): origó az alján
export function tubeCap() { const g = new THREE.Group(); g.add(cyl(0.042, 0.042, 0.03, M(0xd9452f, { roughness: 0.55 }), 0, 0.015, 0, 32)); g.add(cyl(0.0358, 0.0358, 0.012, M(0xe8dca8, { roughness: 0.7 }), 0, -0.006, 0, 32)); return g; }

// ---------------- 2. talajeszterga (az asztalon) ----------------
// alaplap, forgó tányér recézett peremmel és hat csappal (a bal kéz ezeknél fogva fordítja), rajta Ø 50 mm-es alsó sablonkorong;
// a kés pengéje az alsó és a felső (laza) sablonkorong peremén fut le, így a próbatest pontosan Ø 50 mm lesz. LT.TT: a forgó tányér teteje.
export const LT = { TT: 0.035, PEGR: 0.075, PEG0: 135 };
export function soilLathe() {
  const A = mats2(); const g = new THREE.Group(); const fr = M(0x7a8590, { metalness: 0.5, roughness: 0.4 });
  bx(-0.15, 0.15, 0, 0.02, -0.15, 0.15, fr, g); g.add(cyl(0.02, 0.024, 0.006, A.dark, 0, 0.017, 0, 20));
  g.turn = new THREE.Group(); g.turn.position.y = 0.02; g.add(g.turn); g.turn.add(cyl(0.055, 0.055, 0.015, A.alu, 0, 0.0075, 0, 48));
  for (let k = 0; k < 24; k++) { const a = k * Math.PI / 12; g.turn.add(bx(0.0545 * Math.cos(a) - 0.0015, 0.0545 * Math.cos(a) + 0.0015, 0.002, 0.013, 0.0545 * Math.sin(a) - 0.0015, 0.0545 * Math.sin(a) + 0.0015, A.dark, null)); }
  g.turn.add(cyl(0.025, 0.025, 0.01, M(0xaab0b6, { metalness: 0.35, roughness: 0.55 }), 0, 0.02, 0, 40));      // alsó sablonkorong (Ø 50 mm)
  for (let j = 0; j < 6; j++) { const a = (LT.PEG0 + j * 60) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
    const arm = bx(0.05, LT.PEGR, 0.004, 0.011, -0.005, 0.005, A.alu, null); const ag = new THREE.Group(); ag.rotation.y = -a; ag.add(arm); g.turn.add(ag);
    g.turn.add(cyl(0.009, 0.009, 0.07, A.black, LT.PEGR * c, 0.015 + 0.035, LT.PEGR * s, 14)); }
  g.chips = new THREE.Group(); g.add(g.chips); { const r = mulberry32(9); for (let i = 0; i < 46; i++) { const a = r() * Math.PI * 2, d = 0.085 + r() * 0.055; const m = new THREE.Mesh(new THREE.TorusGeometry(0.006 + r() * 0.006, 0.0025, 5, 8, Math.PI * (0.8 + r())), M(0x6c5f50, { roughness: 0.95 })); m.position.set(Math.cos(a) * d, 0.024, Math.sin(a) * d); m.rotation.set(Math.PI / 2 + (r() - 0.5), r() * 6, 0); m.userData.th = r(); g.chips.add(m); } }
  g.setChips = (k) => g.chips.children.forEach(m => { m.visible = m.userData.th < k; });
  return g;
}

// ---------------- 3. terhelőkeret + triaxiális cella ----------------
// A keret (helyi rendszer: y az asztallaptól) álló része; a tárcsa-csoport (PL) és a cella mozgó részei külön tárgyak (props).
export function loadFrame() {
  const A = mats2(); const g = new THREE.Group(); const grey = M(0xd9dcdf, { roughness: 0.55 }), al = MAT.al || M(0x9aa1a8, { metalness: 0.6, roughness: 0.35 }), st = A.steel, dk = A.dark;
  bx(-0.21, 0.21, 0, TD.BTOP - 0.005, -0.17, 0.17, grey, g); bx(-0.21, 0.21, TD.BTOP - 0.005, TD.BTOP, -0.17, 0.17, al, g);
  for (const x of [-TD.COL, TD.COL]) { g.add(cyl(0.016, 0.016, 0.9 - TD.BTOP, st, x, TD.BTOP + (0.9 - TD.BTOP) / 2, 0, 20)); g.add(cyl(0.024, 0.024, 0.02, al, x, 0.91, 0, 16)); }
  bx(-0.235, 0.235, TD.LCB + 0.075, TD.LCB + 0.145, -0.045, 0.045, al, g); for (const x of [-TD.COL, TD.COL]) g.add(cyl(0.028, 0.028, 0.08, al, x, TD.LCB + 0.11, 0, 20));
  g.add(cyl(0.032, 0.032, 0.06, M(0x2f343a, { metalness: 0.5, roughness: 0.35 }), 0, TD.LCB + 0.012 + 0.03, 0, 28)); g.add(cyl(0.011, 0.011, 0.012, st, 0, TD.LCB + 0.006, 0, 14));   // erőmérő
  { const pts = [V(0.032, TD.LCB + 0.05, 0), V(0.12, TD.LCB + 0.06, -0.03), V(0.24, TD.LCB - 0.15, -0.09), V(0.27, 0.25, -0.13), V(0.3, 0.0, -0.17)]; g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.0025, 6), M(0x111214))); }
  // kezelőpanel elöl: kijelző, három gomb (▲ zöld, ■ piros, ▼ szürke)
  g.panel = screen(g, 0.11, 0.04, 128, 48, -0.1, 0.07, 0.1705);
  g.btn = []; [[0x2fbf4f, 0.02], [0xd23a2a, 0.06], [0x5a6068, 0.1]].forEach(([c, x]) => { const b = cyl(0.009, 0.009, 0.008, M(c, { roughness: 0.4 }), x, 0.07, 0.174, 14); b.rotation.x = Math.PI / 2; g.add(b); g.btn.push(V(x, 0.07, 0.178)); });
  // emelőorsó (a tárcsa alatt)
  g.jack = cyl(0.03, 0.03, 1, st, 0, 0, 0, 24); g.add(g.jack);
  g.setJack = (pl) => { g.jack.visible = pl > 0.002; if (g.jack.visible) setRod(g.jack, V(0, TD.BTOP - 0.004, 0), V(0, TD.BTOP + pl + 0.001, 0)); };
  return g;
}
// a tárcsa-csoport (PL): tárcsa, talplemez szelepekkel és pórusvíznyomás-mérővel, talp. Origó: a keret helyi origója (a tárcsa emelkedése: position.y)
export function platenGroup() {
  const A = mats2(); const g = new THREE.Group(); const al = M(0x9aa1a8, { metalness: 0.6, roughness: 0.35 }), st = A.steel, brass = A.brass;
  g.add(cyl(0.02, 0.02, 0.012, st, 0, TD.BTOP + 0.006, 0, 16)); g.add(cyl(0.067, 0.067, 0.012, st, 0, TD.CB - 0.006, 0, 40));
  g.add(cyl(TD.TPR, TD.TPR, TD.CY0 - TD.CB, al, 0, (TD.CB + TD.CY0) / 2, 0, 48));                                  // talplemez
  for (let k = 0; k < 3; k++) { const [x, z] = rodXZ(k); g.add(cyl(0.008, 0.008, 0.002, A.dark, x, TD.CY0 + 0.001, z, 12)); }   // a húzórudak menetes furatai
  g.add(cyl(TD.R0, TD.R0 + 0.002, TD.PED, st, 0, TD.CY0 + TD.PED / 2, 0, 40));                                     // talp
  g.valves = []; for (const a of VALVE_A) { const v = new THREE.Group(); v.position.set(TD.TPR * Math.cos(a), (TD.CB + TD.CY0) / 2, TD.TPR * Math.sin(a)); v.rotation.y = -a; g.add(v);
    bx(0, 0.028, -0.009, 0.009, -0.009, 0.009, brass, v); const h = new THREE.Group(); h.position.set(0.016, 0.009, 0); v.add(h); h.add(cyl(0.003, 0.003, 0.008, st, 0, 0.004, 0, 8)); bx(-0.004, 0.026, 0.006, 0.011, -0.0035, 0.0035, M(0xd23a2a, { roughness: 0.5 }), h);
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.003, 12), new THREE.MeshBasicMaterial({ color: 0xff4d3a })); ring.position.set(0.006, 0.0105, 0.0); v.add(ring); g.valves.push({ g: v, h, ring, a }); }
  { const pt = new THREE.Group(); pt.position.set(TD.TPR * Math.cos(PPT_A), (TD.CB + TD.CY0) / 2, TD.TPR * Math.sin(PPT_A)); pt.rotation.y = -PPT_A; g.add(pt); pt.add(cyl(0.011, 0.011, 0.05, st, 0.03, 0, 0, 14).rotateZ(Math.PI / 2)); pt.add(cyl(0.004, 0.004, 0.02, A.black, 0.065, 0, 0, 6).rotateZ(Math.PI / 2)); g.ppt = pt; }
  // a pórusvíznyomás-mérő kábele
  { const p0 = V((TD.TPR + 0.075) * Math.cos(PPT_A), (TD.CB + TD.CY0) / 2, (TD.TPR + 0.075) * Math.sin(PPT_A)); g.pptCable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([p0, p0.clone().add(V(0.05, -0.01, 0.03)), V(0.3, 0.01, 0.16), V(0.5, 0.003, 0.12)]), 30, 0.0022, 6), A.black); g.add(g.pptCable); }
  return g;
}
// a szelep karjának markolata (a tárcsa-csoport rendszerében): elfordítás 0 → nyitva (a kar a cső irányában), π/2 → zárva
export function valveLever(PL, i) { const v = PL.valves[i]; v.g.updateMatrix(); return { c: V(0.027, 0.0085, 0).applyMatrix4(v.g.matrix), dir: V(1, 0, 0).applyAxisAngle(V(0, 1, 0), -v.a) }; }

// akrilhenger-egység (henger, fedőlap, persely, húzórudak anyákkal, légtelenítő). Origó: a henger alja (ülő helyzetben = CY0)
export function cellUnit() {
  const A = mats2(); const g = new THREE.Group(); const al = M(0x9aa1a8, { metalness: 0.6, roughness: 0.35 }), st = A.steel;
  const acr = new THREE.MeshStandardMaterial({ color: 0xa9bcc6, transparent: true, opacity: 0.1, roughness: 0.18, metalness: 0.0, side: THREE.DoubleSide, depthWrite: false });
  g.walls = []; { const o = new THREE.Mesh(new THREE.CylinderGeometry(TD.CYR, TD.CYR, TD.CYH, 64, 1, true), acr); o.position.y = TD.CYH / 2; o.renderOrder = 12; g.add(o); const i = new THREE.Mesh(new THREE.CylinderGeometry(TD.CYRI, TD.CYRI, TD.CYH, 64, 1, true), acr); i.position.y = TD.CYH / 2; i.renderOrder = 12; g.add(i); g.walls.push(o, i);
    for (const y of [0.004, TD.CYH - 0.004]) { const rg = new THREE.Mesh(new THREE.RingGeometry(TD.CYRI, TD.CYR, 64).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x9fb4c0, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false })); rg.position.y = y; g.add(rg); g.walls.push(rg); } }
  g.add(cyl(TD.TPR, TD.TPR, TD.TPH, al, 0, TD.TOPY + TD.TPH / 2, 0, 48)); g.add(cyl(0.022, 0.022, 0.028, st, 0, TD.TOPY + TD.TPH + 0.014, 0, 24));
  // légtelenítő csavar (piros gomb) a fedőlapon, jobbra elöl
  g.vent = new THREE.Group(); g.vent.position.set(0.058, TD.TOPY + TD.TPH, 0.03); g.add(g.vent); g.vent.add(cyl(0.004, 0.004, 0.012, st, 0, 0.006, 0, 10)); g.vent.add(cyl(0.009, 0.009, 0.007, M(0xd23a2a, { roughness: 0.5 }), 0, 0.0125, 0, 14));
  g.drip = new THREE.Mesh(new THREE.SphereGeometry(0.0035, 10, 8), new THREE.MeshStandardMaterial({ color: 0x8fd0f0, transparent: true, opacity: 0.8, roughness: 0.05 })); g.add(g.drip); g.drip.visible = false;
  // húzórudak (a fedőlapból a talplemez furataiba) és anyák (forgathatók)
  g.nuts = []; for (let k = 0; k < 3; k++) { const [x, z] = rodXZ(k); g.add(cyl(0.006, 0.006, TD.TOPY + TD.TPH + 0.05, st, x, (TD.TOPY + TD.TPH + 0.05) / 2 - 0.0, z, 12));
    const n = new THREE.Group(); n.position.set(x, TD.TOPY + TD.TPH, z); g.add(n); n.add(cyl(0.012, 0.012, 0.016, M(0x23262b, { roughness: 0.6 }), 0, 0.008, 0, 6)); n.add(cyl(0.0125, 0.0125, 0.002, A.steel, 0, 0.001, 0, 6)); g.nuts.push(n); }
  return g;
}
// terhelőrúd és elmozdulásmérő (a keret rendszerében; frissítéskor állítva)
export function ramParts(F) { const A = mats2(); const o = {}; o.ram = cyl(0.0095, 0.0095, 1, A.steel, 0, 0, 0, 16); F.add(o.ram);
  o.lvdt = new THREE.Group(); F.add(o.lvdt); bx(0, 0.075, -0.006, 0.006, -0.008, 0.008, M(0x9aa1a8, { metalness: 0.6, roughness: 0.35 }), o.lvdt); o.lvdt.add(cyl(0.009, 0.009, 0.085, A.dark, 0.07, -0.05, 0, 14));
  o.tip = cyl(0.0025, 0.0025, 1, A.steel, 0, 0, 0, 8); F.add(o.tip); return o; }

// szűrőkő, szűrőpapír, fejlemez (Ø 50 mm): origó az alján
export function stone50() { const A = mats2(); const g = new THREE.Group(); g.add(cyl(TD.R0, TD.R0, TD.STN, A.stone, 0, TD.STN / 2, 0, 40)); return g; }
export function paper50() { const A = mats2(); const g = new THREE.Group(); g.add(cyl(TD.R0, TD.R0, TD.PAP, A.paper, 0, TD.PAP / 2, 0, 40)); return g; }
export function topCap() { const g = new THREE.Group(); g.add(cyl(TD.R0 + 0.001, TD.R0 + 0.001, TD.CAPH, M(0xd6dde2, { metalness: 0.5, roughness: 0.3 }), 0, TD.CAPH / 2, 0, 40));
  g.add(cyl(0.0016, 0.0016, 0.012, M(0xd8e2e8, { roughness: 0.3 }), -0.016, TD.CAPH + 0.006, 0, 8)); g.add(cyl(0.006, 0.006, 0.004, M(0xb0b6bb, { metalness: 0.6 }), 0, TD.CAPH + 0.002, 0, 16)); return g; }
// membránfeszítő: cső, a végein visszahajtott membrán, vákuumcsonk, rajta 2 + 2 O-gyűrű. Origó: a cső közepe
export function stretcher() {
  const A = mats2(); const g = new THREE.Group(); const sm = new THREE.MeshStandardMaterial({ color: 0x9aa4ad, metalness: 0.6, roughness: 0.35, side: THREE.DoubleSide });
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.13, 40, 1, true), sm)); g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.0335, 0.0335, 0.13, 40, 1, true), sm));
  for (const y of [-0.065, 0.065]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.0335, 0.0022, 6, 40).rotateX(Math.PI / 2), M(0xb08a5a, { roughness: 0.4 })); r.position.y = y; g.add(r); }
  g.mem = new THREE.Mesh(new THREE.CylinderGeometry(0.0318, 0.0318, 0.13, 40, 1, true), new THREE.MeshStandardMaterial({ color: 0xb08a5a, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false })); g.add(g.mem);
  g.add(cyl(0.004, 0.004, 0.03, A.brass, 0.045, 0.03, -0.01, 8).rotateZ(Math.PI / 2));
  g.rings = []; for (const y of [-0.052, -0.044, 0.044, 0.052]) { const o = new THREE.Mesh(new THREE.TorusGeometry(0.0345, 0.0017, 6, 40).rotateX(Math.PI / 2), M(0x101112, { roughness: 0.5 })); o.position.y = y; g.add(o); g.rings.push(o); }
  return g;
}
export function oRing() { return new THREE.Mesh(new THREE.TorusGeometry(TD.R0 + 0.0012, 0.0016, 8, 48).rotateX(Math.PI / 2), M(0x101112, { roughness: 0.5 })); }
// huzalfűrész-tartó: talpléc két hüvelyrel, a fűrész fogantyúi függőlegesen állnak benne (így ugyanúgy fogjuk meg, ahogy használjuk). Origó: a talpléc alja
export function sawRack() { const A = mats2(); const g = new THREE.Group(); bx(-0.17, 0.17, 0, 0.015, -0.02, 0.02, A.dark, g); for (const x of [-0.14, 0.14]) g.add(cyl(0.015, 0.015, 0.025, A.dark, x, 0.0275, 0, 16)); return g; }
export const SAW_UP = 0.0625;                                                   // a huzal magassága a tartó talpa fölött
// tartóállvány a membránfeszítőnek (az asztalon): talp és függőleges rúd, a feszítő a rúdra akasztva áll
export function stretcherStand() { const A = mats2(); const g = new THREE.Group(); g.add(cyl(0.045, 0.045, 0.008, A.dark, 0, 0.004, 0, 24)); g.add(cyl(0.006, 0.006, 0.07, A.steel, 0, 0.043, 0, 10)); return g; }
// hasítósablon helyett: alátét-tányér (a kész próbatestnek a mérleghez) – nem kell; tálca a késnek és a fűrésznek (oedo2.toolTray)

// ---------------- 4. nyomás-/térfogatszabályozó ----------------
export function controller() {
  const A = mats2(); const g = new THREE.Group(); const grey = M(0xd9dcdf, { roughness: 0.55 }), al = M(0x9aa1a8, { metalness: 0.6, roughness: 0.35 });
  bx(-0.27, 0.27, 0, 0.13, -0.07, 0.07, grey, g); bx(-0.27, 0.27, 0.13, 0.136, -0.07, 0.07, al, g);
  g.sc = screen(g, 0.13, 0.057, 256, 112, -0.16, 0.075, 0.0705);
  for (let i = 0; i < 3; i++) { const b = cyl(0.007, 0.007, 0.006, A.dark, -0.05 + i * 0.025, 0.06, 0.0705, 10); b.rotation.x = Math.PI / 2; g.add(b); }
  g.add(cyl(0.012, 0.012, 0.03, A.brass, -0.285, 0.05, 0, 12).rotateZ(Math.PI / 2));
  bx(0.04, 0.24, 0.045, 0.1, 0.069, 0.0705, M(0x9fc6dc, { transparent: true, opacity: 0.5 }), g); g.pis = bx(0.04, 0.05, 0.048, 0.097, 0.0706, 0.071, A.dark, g);
  return g;
}
export function drawCtl(S, title, sym, sub, v, unit) {
  const g = S.g; g.fillStyle = '#0e2418'; g.fillRect(0, 0, 256, 112); g.fillStyle = '#9fe36a'; g.font = '700 22px Arial'; g.textAlign = 'left'; g.fillText(title, 12, 30);
  if (v === null) { g.font = '700 30px Arial'; g.fillText('—', 12, 86); S.t.needsUpdate = true; return; }
  g.font = 'italic 700 40px Arial'; g.fillText(sym, 12, 86); g.font = '700 22px Arial'; g.fillText(sub, 12 + g.measureText(sym).width + 8, 94);
  g.font = '700 46px Arial'; g.textAlign = 'right'; g.fillText(String(Math.round(v)), 200, 88); g.font = '700 20px Arial'; g.fillText(unit, 248, 88); S.t.needsUpdate = true;
}
export function drawPanel(S, txt) { if (S._t === txt) return; S._t = txt; const g = S.g; g.fillStyle = '#0e2418'; g.fillRect(0, 0, 128, 48); g.fillStyle = '#9fe36a'; g.font = '700 22px Arial'; g.textAlign = 'center'; g.fillText(txt, 64, 32); S.t.needsUpdate = true; }
