// Szervesanyag-tartalom (izzítási veszteség, EN 17685-1) – eszközök: porcelán tégely, tégelyfogó, izzítókemence (felfelé nyíló ajtóval),
// exszikkátor (tolható fedővel, szilikagéllel), hűtőlap, mozsár + törő, 2 mm-es szita alsó edénnyel, vegyszeres kanál.
// Méter, a tárgy helyi rendszerében, az origó a talpán (a fogónál a pofák közepén).
import * as THREE from 'three';
import { M, cyl, bx, SOILM, canvasTex, screen } from './room.js';
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const lathe = (pts, mat, seg = 48) => { const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg); const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; return m; };
const rod = (a, b, r, mat, par) => { const d = b.clone().sub(a), L = d.length(); const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, 10), mat); m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); m.castShadow = true; par.add(m); return m; };
let SM = null;
export function smats() { if (SM) return SM; SM = { porc: M(0xf3f1ea, { roughness: 0.3 }), steel: M(0xd2d6da, { metalness: 0.85, roughness: 0.22 }), dark: M(0x2c3036, { metalness: 0.3, roughness: 0.55 }),
  body: M(0x3e444b, { metalness: 0.25, roughness: 0.5 }), cream: M(0xe6e2d8, { roughness: 0.6 }), brass: M(0xc9a85a, { metalness: 0.75, roughness: 0.3 }),
  glass: new THREE.MeshStandardMaterial({ color: 0xd3e8f0, transparent: true, opacity: 0.28, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false }),
  gel: M(0x2f6fd0, { roughness: 0.8 }), mesh: M(0x8a7a52, { metalness: 0.6, roughness: 0.5 }) }; return SM; }
// ---------------- porcelán tégely (felül Ø 54, alul Ø 36, 36 mm magas) ----------------
export const CR = { R0: 0.018, R1: 0.027, H: 0.036, W: 0.0022, GH: 0.022 };
export const crR = (y) => CR.R0 + (CR.R1 - CR.R0) * y / CR.H;            // külső sugár a magasság szerint
export function crucible() { const S = smats(); const g = new THREE.Group(); const pm = S.porc.clone(); pm.emissive = new THREE.Color(0xff5a1a); pm.emissiveIntensity = 0;
  g.add(lathe([[0, 0], [CR.R0, 0], [CR.R1, CR.H], [CR.R1 + 0.0012, CR.H + 0.0008], [CR.R1 - CR.W, CR.H + 0.0008], [CR.R0 - CR.W, CR.W], [0, CR.W]], pm, 40)); g.pm = pm;
  const sm = new THREE.MeshStandardMaterial({ map: SOILM('dry', 43).map, roughness: 0.95, emissive: new THREE.Color(0xff4a10), emissiveIntensity: 0 }); g.sm = sm;
  g.soil = new THREE.Mesh(new THREE.CylinderGeometry(CR.R0 - CR.W + 0.0012, CR.R0 - CR.W, 1, 32), sm); g.soil.castShadow = true; g.add(g.soil); g.soil.visible = false;
  const C0 = new THREE.Color(0x5a4636), C1 = new THREE.Color(0xa86848);
  g.set = (level, burn = 0, hot = 0) => { g.soil.visible = level > 0.0003; g.soil.scale.y = Math.max(0.0003, level); g.soil.position.y = CR.W + level / 2; sm.color.copy(C0).lerp(C1, burn).multiplyScalar(1.5); sm.emissiveIntensity = 0.9 * hot; pm.emissiveIntensity = 0.55 * hot; };
  g.set(0); return g; }
// ---------------- tégelyfogó: a pofák közepe az origó, a nyél +z felé; set(nyitás, rad) ----------------
export const TG = { PIV: 0.085, HL: 0.26, JR: crR(CR.GH) + 0.0028, GRIP: 0.085 + 0.17 };
export function tongs() { const S = smats(); const g = new THREE.Group(); g.arms = [];
  for (const s of [-1, 1]) { const piv = new THREE.Group(); piv.position.set(0, 0, TG.PIV); g.add(piv); const a = new THREE.Group(); a.position.set(0, 0, -TG.PIV); piv.add(a);
    const pts = []; for (let i = 0; i <= 12; i++) { const an = -1.25 + 2.5 * i / 12; pts.push(V(s * TG.JR * Math.cos(an), 0, TG.JR * Math.sin(an))); }
    const crv = new THREE.CatmullRomCurve3(pts); const jw = new THREE.Mesh(new THREE.TubeGeometry(crv, 24, 0.0022, 8), S.steel); jw.castShadow = true; a.add(jw);
    const e = pts[12], p1 = V(s * 0.004, 0.0015 * s, TG.PIV - 0.012), p2 = V(-s * 0.003, 0.0015 * s, TG.PIV + 0.012), p3 = V(-s * 0.011, 0.0015 * s, TG.PIV + 0.05), p4 = V(-s * 0.013, 0.0015 * s, TG.PIV + TG.HL);
    rod(e, p1, 0.0028, S.steel, a); rod(p1, p2, 0.0032, S.steel, a); rod(p2, p3, 0.0032, S.steel, a); rod(p3, p4, 0.0034, S.steel, a);
    g.arms.push({ s, piv }); }
  g.add(cyl(0.004, 0.004, 0.008, S.dark, 0, 0, TG.PIV, 12));
  g.set = (open) => { for (const A of g.arms) A.piv.rotation.y = -A.s * open; }; g.set(0); return g; }
// ---------------- izzítókemence: kerámia munkatér, felfelé nyíló ajtó, kezelőpanel ----------------
export const FU = { W: 0.46, D: 0.44, H: 0.52, CW: 0.28, CH: 0.26, CD: 0.3, Y0: 0.1, DOORUP: 0.29 };
export function furnace() { const S = smats(); const g = new THREE.Group(); const hw = FU.W / 2, hd = FU.D / 2, cw = FU.CW / 2, y1 = FU.Y0 + FU.CH;
  bx(-hw, hw, 0, FU.Y0, -hd, hd, S.body, g); bx(-hw, hw, y1, FU.H, -hd, hd, S.body, g); bx(-hw, -cw, FU.Y0, y1, -hd, hd, S.body, g); bx(cw, hw, FU.Y0, y1, -hd, hd, S.body, g); bx(-cw, cw, FU.Y0, y1, -hd, hd - FU.CD, S.body, g);
  g.cer = new THREE.MeshStandardMaterial({ color: 0xd9c8ae, roughness: 0.92, emissive: new THREE.Color(0xff5a14), emissiveIntensity: 0 });
  const z0 = hd - FU.CD; bx(-cw, cw, FU.Y0, FU.Y0 + 0.008, z0, hd, g.cer, g); bx(-cw, cw, y1 - 0.008, y1, z0, hd, g.cer, g); bx(-cw, -cw + 0.008, FU.Y0, y1, z0, hd, g.cer, g); bx(cw - 0.008, cw, FU.Y0, y1, z0, hd, g.cer, g); bx(-cw, cw, FU.Y0, y1, z0, z0 + 0.008, g.cer, g);
  for (const x of [-0.07, 0.0, 0.07]) bx(x - 0.002, x + 0.002, y1 - 0.012, y1 - 0.008, z0 + 0.02, hd - 0.02, M(0x9a8f80, { roughness: 0.7 }), g);   // fűtőszálak a mennyezetben
  // vezetősínek és felfelé nyíló ajtó (fogantyú alul elöl)
  for (const x of [-cw - 0.06, cw + 0.06]) bx(x - 0.008, x + 0.008, 0.08, FU.H + 0.25, hd, hd + 0.012, S.dark, g);
  g.door = new THREE.Group(); g.add(g.door); const dm = M(0x4a5058, { metalness: 0.3, roughness: 0.45 }); bx(-cw - 0.035, cw + 0.035, FU.Y0 - 0.015, y1 + 0.02, hd + 0.012, hd + 0.05, dm, g.door);
  bx(-cw + 0.01, cw - 0.01, FU.Y0 + 0.005, y1 - 0.005, hd + 0.006, hd + 0.012, g.cer, g.door);
  g.door.add(cyl(0.008, 0.008, 0.14, S.steel, -cw + 0.05, FU.Y0 + 0.11, hd + 0.095, 14));                                                      // függőleges fogantyú az ajtó bal részén
  for (const y of [FU.Y0 + 0.05, FU.Y0 + 0.17]) bx(-cw + 0.044, -cw + 0.056, y - 0.006, y + 0.006, hd + 0.05, hd + 0.095, S.steel, g.door);
  g.handle = V(-cw + 0.05, FU.Y0 + 0.11, hd + 0.095);
  // kezelőpanel a jobb oldalon
  bx(hw - 0.001, hw + 0.002, 0.33, 0.45, -0.12, 0.12, S.dark, g); g.disp = screen(g, 0.1, 0.035, 192, 64, 0, FU.H - 0.03, hd + 0.0015);
  g.light = new THREE.PointLight(0xff7a2a, 0, 1.2, 2); g.light.position.set(0, FU.Y0 + 0.15, hd - 0.1); g.add(g.light);
  g.setDoor = (k) => { g.door.position.y = FU.DOORUP * k; }; return g; }
export function drawFurn(S, T, on) { const g = S.g; g.fillStyle = '#120808'; g.fillRect(0, 0, 192, 64); g.fillStyle = on ? '#ff6a3a' : '#7a3a2a'; g.font = '700 40px Arial'; g.textAlign = 'center'; g.fillText(T + ' °C', 96, 46); S.t.needsUpdate = true; }
// ---------------- exszikkátor: üveg alj, szilikagél, perforált porcelán lap, csúsztatható fedő gombbal ----------------
export const DS = { R: 0.1, H: 0.1, PL: 0.045, FL: 0.118 };
export function desiccator() { const S = smats(); const g = new THREE.Group();
  const base = lathe([[0, 0], [0.085, 0], [0.095, 0.01], [DS.R, 0.04], [DS.R + 0.004, DS.H - 0.01], [DS.FL, DS.H - 0.004], [DS.FL, DS.H], [DS.R + 0.002, DS.H], [DS.R - 0.002, DS.H - 0.012], [DS.R - 0.004, 0.04], [0.09, 0.013], [0, 0.004]], S.glass, 48); base.renderOrder = 10; base.castShadow = false; g.add(base);
  g.add(cyl(0.088, 0.088, 0.026, S.gel, 0, 0.017, 0, 32));
  { const C = canvasTex(256, 256); const c = C.g; c.fillStyle = '#f1efe9'; c.fillRect(0, 0, 256, 256); c.fillStyle = '#b9b4a8'; for (let x = 16; x < 256; x += 26) for (let y = 16; y < 256; y += 26) { if ((x - 128) ** 2 + (y - 128) ** 2 < 110 ** 2) { c.beginPath(); c.arc(x, y, 5, 0, 7); c.fill(); } }
    const pl = new THREE.Mesh(new THREE.CylinderGeometry(DS.R - 0.003, DS.R - 0.003, 0.004, 40), [M(0xf1efe9, { roughness: 0.4 }), new THREE.MeshStandardMaterial({ map: C.t, roughness: 0.4 }), M(0xf1efe9)]); pl.position.y = DS.PL - 0.002; g.add(pl); }
  g.lid = new THREE.Group(); g.lid.position.y = DS.H; g.add(g.lid); const dome = new THREE.Mesh(new THREE.SphereGeometry(0.16, 40, 12, 0, Math.PI * 2, 0, 0.83), S.glass); dome.position.y = -0.16 * Math.cos(0.83) + 0.004; dome.renderOrder = 11; g.lid.add(dome);
  g.lid.add(lathe([[DS.FL, 0], [DS.FL, 0.005], [0.1, 0.006], [0.1, 0]], S.glass, 48)); g.knobY = 0.16 - 0.16 * Math.cos(0.83) + 0.004;
  g.lid.add(cyl(0.011, 0.013, 0.024, M(0xdfe9ee, { transparent: true, opacity: 0.75, roughness: 0.1 }), 0, g.knobY + 0.012, 0, 20));
  g.setLid = (dz) => { g.lid.position.z = dz; }; return g; }
// ---------------- hűtőlap, mozsár, törő, szita, kanál, fogótartó ----------------
export function coolPlate(w = 0.2, d = 0.14) { const S = smats(); const g = new THREE.Group(); bx(-w / 2, w / 2, 0.012, 0.018, -d / 2, d / 2, M(0x8a9097, { metalness: 0.7, roughness: 0.45 }), g);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(cyl(0.006, 0.006, 0.012, S.dark, sx * (w / 2 - 0.015), 0.006, sz * (d / 2 - 0.015), 10)); g.top = 0.018; return g; }
export const MO = { R: 0.07, H: 0.06 };
export function mortar() { const S = smats(); const g = new THREE.Group(); g.add(lathe([[0, 0], [0.04, 0], [0.058, 0.012], [MO.R, 0.04], [MO.R, MO.H], [MO.R - 0.006, MO.H], [MO.R - 0.008, 0.042], [0.045, 0.016], [0, 0.012]], S.porc, 40));
  g.soil = new THREE.Group(); g.add(g.soil); const sm = SOILM('dry', 41); sm.color.setScalar(1.3); g.lumps = [];
  for (let i = 0; i < 9; i++) { const a = i * 2.4, r = 0.012 + 0.018 * ((i * 37) % 10) / 10; const m = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), sm); m.position.set(Math.cos(a) * r, 0.02, Math.sin(a) * r); m.scale.setScalar(0.009 + 0.004 * (i % 3)); m.rotation.set(i, i * 2, 0); g.soil.add(m); g.lumps.push(m); }
  g.fine = cyl(0.045, 0.03, 0.01, sm, 0, 0.017, 0, 32); g.add(g.fine);
  g.set = (k) => { g.lumps.forEach((m, i) => { const s = (0.009 + 0.004 * (i % 3)) * (1 - 0.8 * k); m.scale.setScalar(s); m.visible = k < 0.97; }); g.fine.scale.set(1, 0.3 + 1.2 * k, 1); g.fine.position.y = 0.0135 + 0.006 * k; }; g.set(0); return g; }
export function pestle() { const S = smats(); const g = new THREE.Group(); g.add(lathe([[0, 0], [0.014, 0.004], [0.017, 0.016], [0.012, 0.03], [0.009, 0.05], [0.0085, 0.11], [0.011, 0.125], [0.009, 0.135], [0, 0.136]], S.porc, 24)); g.grip = 0.1; return g; }
export const SV = { R: 0.05, H: 0.035, PH: 0.03 };
export function sieve() { const S = smats(); const g = new THREE.Group();
  g.add(lathe([[0, 0], [SV.R, 0], [SV.R, SV.PH], [SV.R - 0.002, SV.PH], [SV.R - 0.002, 0.003], [0, 0.003]], S.brass, 40));                                      // alsó edény
  g.top = new THREE.Group(); g.top.position.y = SV.PH - 0.004; g.add(g.top);
  g.top.add(lathe([[SV.R + 0.001, 0], [SV.R + 0.002, SV.H], [SV.R - 0.001, SV.H], [SV.R - 0.001, 0.003], [SV.R - 0.0015, 0]], S.brass, 40));
  { const C = canvasTex(128, 128); const c = C.g; c.fillStyle = 'rgba(0,0,0,0)'; c.clearRect(0, 0, 128, 128); c.strokeStyle = '#6b5a36'; c.lineWidth = 1.2; for (let i = 0; i < 128; i += 6) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, 128); c.moveTo(0, i); c.lineTo(128, i); c.stroke(); }
    const m = new THREE.Mesh(new THREE.CircleGeometry(SV.R - 0.001, 40), new THREE.MeshStandardMaterial({ map: C.t, transparent: true, metalness: 0.5, roughness: 0.5, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; m.position.y = 0.006; g.top.add(m); }
  const sm = SOILM('dry', 44); sm.color.setScalar(1.3); g.coarse = cyl(0.03, 0.036, 0.006, sm, 0, 0.009, 0, 24); g.top.add(g.coarse); g.finePan = cyl(SV.R - 0.004, SV.R - 0.004, 0.006, sm, 0, 0.006, 0, 32); g.add(g.finePan);
  g.set = (k) => { g.coarse.scale.set(1 - 0.55 * k, 1 - 0.5 * k, 1 - 0.55 * k); g.finePan.scale.y = Math.max(0.05, k); g.finePan.position.y = 0.003 + 0.003 * k; }; g.set(0); return g; }
// vegyszeres kanál: a nyél az x tengely mentén (+x felé), a kanál a −x végen (az origó a kanálfej közepe)
export function spoon() { const S = smats(); const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xd2d6da, metalness: 0.85, roughness: 0.22, side: THREE.DoubleSide }));
  b.scale.set(0.014, 0.006, 0.01); b.position.y = 0.006; g.add(b); rod(V(0.012, 0.006, 0), V(0.17, 0.012, 0), 0.0028, S.steel, g);
  g.load = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), SOILM('dry', 45)); g.load.material.color.setScalar(1.3); g.load.scale.set(0.011, 0.004, 0.008); g.load.position.y = 0.004; g.add(g.load); g.grip = 0.12; return g; }
// fogótartó: két kis bak, a fogó vízszintesen fekszik rajta (a nyél az asztal szélén túlnyúlik)
export function tongRest() { const S = smats(); const g = new THREE.Group(); for (const z of [-0.035, 0.035]) bx(-0.025, 0.025, 0, 0.06, z - 0.006, z + 0.006, S.dark, g); bx(-0.03, 0.03, 0, 0.004, -0.045, 0.045, S.dark, g); return g; }
