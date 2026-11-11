// Szemeloszlási vizsgálat (EN ISO 17892-4) – eszközök valós méretekkel. Méter, a tárgy helyi rendszerében, az origó a talpán, +z a laboráns felé.
// Szita: Ø 200 mm-es, fél magas (ISO 3310) keret, alul szoknya (a szitasorban az alatta lévőbe ül), a szövet a keret alján; gyűjtőtál, fedő.
// Szitarázó (pl. Retsch AS 200 jellegű): ház kijelzővel, rezgő tányér, két menetes oszlop, leszorító híd két recézett gombbal.
// Mosótálca csappal (nedves szitálás), porcelán tál, mérőtál, szitakefe; hidrometrálás: főzőpohár, diszpergálószer, keverőgép csészével,
// 1000 ml-es ülepítőhenger, hidrométer (0,995–1,030 g/ml), keverőrúd (perforált tárcsa), hőmérő, kontrollhenger, desztillált víz.
import * as THREE from 'three';
import { M, cyl, bx, MAT, SOILM, canvasTex } from './room.js';
import { mats2 } from './oedo2.js';
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const lathe = (pts, mat, seg = 48) => { const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg); const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; return m; };
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const fmtAp = (a) => (a >= 1 ? String(a) : String(a).replace('.', ',')) + ' mm';
let SM = null;
export function smats() { if (SM) return SM; const A = mats2(); SM = {
  frame: new THREE.MeshStandardMaterial({ color: 0xdfe3e6, metalness: 0.45, roughness: 0.32, side: THREE.DoubleSide }),
  brass: new THREE.MeshStandardMaterial({ color: 0xc9a85a, metalness: 0.8, roughness: 0.28, side: THREE.DoubleSide }),
  housing: M(0xe9ebee, { roughness: 0.45 }), panel: M(0x2b3138, { roughness: 0.5 }), plate: M(0x9aa1a8, { metalness: 0.7, roughness: 0.3 }), rubber: A.rubber,
  knob: M(0x1b1d20, { roughness: 0.55 }), green: M(0x2fbf4f, { roughness: 0.4 }), red: M(0xd23a2a, { roughness: 0.45 }), steel: A.steel, alu: A.alu, dark: A.dark,
  porc: new THREE.MeshStandardMaterial({ color: 0xf3f1ea, roughness: 0.3, side: THREE.DoubleSide }), wood: M(0xa0703f, { roughness: 0.6 }), bristle: M(0x6b5a3a, { roughness: 0.9 }),
  glass: new THREE.MeshStandardMaterial({ color: 0xdcecf2, transparent: true, opacity: 0.26, roughness: 0.04, metalness: 0, side: THREE.DoubleSide, depthWrite: false }),
  glassH: new THREE.MeshStandardMaterial({ color: 0xeaf6fa, transparent: true, opacity: 0.5, roughness: 0.04, metalness: 0.05, depthWrite: false }),
  water: new THREE.MeshStandardMaterial({ color: 0x8fb8cc, transparent: true, opacity: 0.32, roughness: 0.04, depthWrite: false }),
  sand: SOILM('sand', 21), dry: SOILM('dry', 9), grey: SOILM('grey', 4), plastic: M(0xf4f4f0, { roughness: 0.5 }), blueCap: M(0x2f6fb5, { roughness: 0.4 }) }; return SM; }

// ---------------- szita, gyűjtőtál, fedő ----------------
export const SV = { R: 0.1, T: 0.0025, H: 0.032, SK: 0.007, MY: 0.0095, P: 0.025 };   // P: a szitasor osztása (H − SK + 0,001 hézag nélkül)
function meshTex(ap) { const S = canvasTex(256, 256); const g = S.g; g.fillStyle = '#6f757b'; g.fillRect(0, 0, 256, 256);
  const n = Math.round(clamp(10 + 46 / Math.sqrt(Math.max(ap, 0.05)), 10, 150)); g.strokeStyle = '#d3d8dc'; g.lineWidth = Math.max(0.8, 256 / n * 0.32);
  for (let i = 0; i <= n; i++) { const p = i * 256 / n; g.beginPath(); g.moveTo(p, 0); g.lineTo(p, 256); g.moveTo(0, p); g.lineTo(256, p); g.stroke(); }
  S.t.wrapS = S.t.wrapT = THREE.RepeatWrapping; S.t.repeat.set(ap < 0.5 ? 3 : 1.5, ap < 0.5 ? 3 : 1.5); return S.t; }
function tagTex(txt) { const S = canvasTex(256, 64); const g = S.g; g.fillStyle = '#f4f1e6'; g.fillRect(0, 0, 256, 64); g.strokeStyle = '#3a3f45'; g.lineWidth = 4; g.strokeRect(2, 2, 252, 60);
  g.fillStyle = '#1b2026'; g.font = '700 40px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 128, 34); return S.t; }
// halom a szitán / tálban: lapos kúp (m: gramm)
function heap(mat, R) { const m = lathe([[0, 1], [0.35, 0.92], [0.7, 0.55], [1, 0]], mat, 36); m.scale.set(R, 0.001, R); m.visible = false; return m; }
const heapH = (g) => g > 0.05 ? 0.0025 + 0.0105 * Math.pow(g / 90, 0.6) : 0;
export function sieve(ap, o = {}) {
  const S = smats(); const g = new THREE.Group(); const { R, T, H, SK, MY } = SV; const mat = o.brass ? S.brass : S.frame;
  g.add(lathe([[R - 0.003, 0], [R - 0.0008, 0], [R - 0.0008, SK], [R + T, SK], [R + T, H - 0.002], [R + T + 0.0013, H - 0.0005], [R + T, H], [R, H], [R, SK + 0.002], [R - 0.003, SK + 0.002], [R - 0.003, 0]], mat, 64));
  if (ap > 0) { const ms = new THREE.Mesh(new THREE.CircleGeometry(R - 0.0005, 64).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: meshTex(ap), metalness: 0.6, roughness: 0.42, side: THREE.DoubleSide })); ms.position.y = MY; g.add(ms); }
  else g.add(cyl(R, R, 0.002, mat, 0, 0.004, 0, 64));                                          // gyűjtőtál: tömör fenék
  g.soil = heap(ap > 0 && ap < 0.2 ? S.grey : ap >= 2 ? S.dry : S.sand, R * 0.82); g.soil.position.y = ap > 0 ? MY : 0.005; g.add(g.soil);
  g.setSoil = (gr) => { const h = heapH(gr); g.soil.visible = h > 0; g.soil.scale.y = Math.max(0.0005, h); };
  if (o.tag !== false) for (const s of [1, -1]) { const tg = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.0125), new THREE.MeshBasicMaterial({ map: tagTex(ap > 0 ? fmtAp(ap) : 'GYŰJTŐTÁL') })); tg.position.set(0, SK + (H - SK) * 0.52, s * (R + T + 0.0004)); if (s < 0) tg.rotation.y = Math.PI; g.add(tg); }
  g.ap = ap; return g;
}
export function sieveLid() { const S = smats(); const g = new THREE.Group(); const R = SV.R + SV.T + 0.0015;
  g.add(lathe([[R - 0.004, 0], [R - 0.0015, 0], [R - 0.0015, 0.006], [R, 0.006], [R, 0.011], [0, 0.013]], S.frame, 64)); return g; }

// ---------------- szitarázó ----------------
export const SH = { W: 0.4, D: 0.34, BH: 0.1, PY: 0.112, RX: 0.165, RH: 0.56, KR: 0.017 };
export function shaker() {
  const S = smats(); const g = new THREE.Group(); const { W, D, BH, PY, RX, RH } = SH;
  bx(-W / 2, W / 2, 0.006, BH, -D / 2, D / 2, S.housing, g); bx(-W / 2 + 0.01, W / 2 - 0.01, 0, 0.006, -D / 2 + 0.01, D / 2 - 0.01, S.rubber, g);
  bx(-W / 2 + 0.02, W / 2 - 0.02, 0.018, 0.075, D / 2, D / 2 + 0.004, S.panel, g);                                    // kezelőpanel elöl
  g.disp = (() => { const C = canvasTex(256, 96); const m = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.0375), new THREE.MeshBasicMaterial({ map: C.t })); m.position.set(-0.07, 0.047, D / 2 + 0.0045); g.add(m); return C; })();
  g.btn = cyl(0.011, 0.011, 0.006, S.green, 0.09, 0.047, D / 2 + 0.006, 20); g.btn.rotation.x = Math.PI / 2; g.add(g.btn); g.btnP = V(0.09, 0.047, D / 2 + 0.009);
  const st = cyl(0.011, 0.011, 0.006, S.red, 0.13, 0.047, D / 2 + 0.006, 20); st.rotation.x = Math.PI / 2; g.add(st);
  g.vib = new THREE.Group(); g.add(g.vib);                                                                             // rezgő rész: tányér, oszlopok, híd
  g.vib.add(cyl(0.122, 0.13, PY - BH, S.plate, 0, (BH + PY) / 2, 0, 48)); g.vib.add(cyl(SV.R + 0.004, SV.R + 0.004, 0.003, S.rubber, 0, PY + 0.0015, 0, 48));
  for (const x of [-RX, RX]) { g.vib.add(cyl(0.008, 0.008, RH - PY, S.steel, x, PY + (RH - PY) / 2, 0, 14)); g.vib.add(cyl(0.016, 0.016, 0.012, S.steel, x, PY + 0.006, 0, 18)); }
  g.clamp = new THREE.Group(); g.vib.add(g.clamp);                                                                     // leszorító híd (y: az alsó lapja)
  bx(-RX - 0.024, RX + 0.024, 0.012, 0.03, -0.022, 0.022, S.housing, g.clamp); g.clamp.add(cyl(0.06, 0.06, 0.012, S.housing, 0, 0.006, 0, 40)); g.clamp.add(cyl(0.055, 0.055, 0.002, S.rubber, 0, 0.0, 0, 40));
  g.knobs = [-RX, RX].map(x => { const k = new THREE.Group(); k.position.set(x, 0.03, 0); g.clamp.add(k); const c = cyl(SH.KR, SH.KR, 0.026, S.knob, 0, 0.013, 0, 18); k.add(c);
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; bx(-0.0012, 0.0012, 0.002, 0.024, SH.KR - 0.0005, SH.KR + 0.0012, S.knob, k).rotation.y = a; } k.add(cyl(0.006, 0.006, 0.004, S.steel, 0, 0.028, 0, 12)); return k; });
  g.setClamp = (y) => { g.clamp.position.y = y; };
  return g;
}
export function drawShaker(C, sec, amp = 1.5, run = false) { const g = C.g; g.fillStyle = '#0d1f14'; g.fillRect(0, 0, 256, 96); g.fillStyle = run ? '#9fe36a' : '#7fb85a'; g.font = '700 52px Arial'; g.textAlign = 'left';
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60); g.fillText(String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0'), 14, 62); g.font = '700 26px Arial'; g.textAlign = 'right'; g.fillText(amp.toFixed(1).replace('.', ',') + ' mm', 246, 40); g.fillText(run ? 'RUN' : 'STOP', 246, 78); C.t.needsUpdate = true; }

// ---------------- mosótálca csappal ----------------
export const TR = { W: 0.46, D: 0.42, H: 0.14, RAIL: 0.055, SPY: 0.37, SPZ: -0.03 };
export function trough() {
  const S = smats(); const g = new THREE.Group(); const { W, D, H } = TR, t = 0.008, m = S.steel;
  bx(-W / 2, W / 2, 0, t, -D / 2, D / 2, m, g); bx(-W / 2, -W / 2 + t, 0, H, -D / 2, D / 2, m, g); bx(W / 2 - t, W / 2, 0, H, -D / 2, D / 2, m, g); bx(-W / 2, W / 2, 0, H, -D / 2, -D / 2 + t, m, g); bx(-W / 2, W / 2, 0, H, D / 2 - t, D / 2, m, g);
  for (const z of [-D / 2, D / 2]) bx(-W / 2 - 0.006, W / 2 + 0.006, H - 0.004, H + 0.003, z - 0.006, z + 0.006, m, g);
  for (const x of [-W / 2, W / 2]) bx(x - 0.006, x + 0.006, H - 0.004, H + 0.003, -D / 2 - 0.006, D / 2 + 0.006, m, g);
  g.add(cyl(0.022, 0.022, 0.002, S.dark, 0.15, t + 0.001, 0.12, 20));                                                     // lefolyó
  for (const z of [TR.SPZ - 0.07, TR.SPZ + 0.07]) bx(-0.15, 0.15, t, TR.RAIL, z - 0.008, z + 0.008, m, g);                 // két sín: a szita ezen áll (a kifolyó alatt)
  g.water = cyl(W / 2 - t, W / 2 - t, 1, new THREE.MeshStandardMaterial({ color: 0x8a6a48, transparent: true, opacity: 0.55, roughness: 0.1, depthWrite: false }), 0, 0, 0, 4); g.water.rotation.y = Math.PI / 4; g.water.scale.set(1, 0.012, (D / 2 - t) / (W / 2 - t)); g.water.position.y = t + 0.006; g.add(g.water);
  // csaptelep a hátsó peremen: oszlop, hattyúnyak, egykaros fogantyú
  const tz = -D / 2 - 0.025; g.add(cyl(0.022, 0.026, 0.02, m, 0, H + 0.01, tz, 20)); g.add(cyl(0.014, 0.014, 0.18, m, 0, H + 0.11, tz, 16));
  const crv = new THREE.CatmullRomCurve3([V(0, H + 0.19, tz), V(0, TR.SPY + 0.06, tz + 0.03), V(0, TR.SPY + 0.07, (tz + TR.SPZ) / 2 + 0.02), V(0, TR.SPY + 0.03, TR.SPZ - 0.01), V(0, TR.SPY, TR.SPZ)]);
  const neck = new THREE.Mesh(new THREE.TubeGeometry(crv, 30, 0.009, 12), m); neck.castShadow = true; g.add(neck); g.add(cyl(0.011, 0.011, 0.012, m, 0, TR.SPY + 0.004, TR.SPZ, 14));
  g.lever = new THREE.Group(); g.lever.position.set(0, H + 0.2, tz); g.add(g.lever); g.lever.add(cyl(0.018, 0.018, 0.02, m, 0, 0.01, 0, 16));
  const arm = cyl(0.0055, 0.0055, 0.1, m, 0, 0.022, 0.05, 12); arm.rotation.x = Math.PI / 2 - 0.25; g.lever.add(arm); g.leverTip = V(0, 0.034, 0.098);   // a kar vége (a lever helyi rendszerében)
  g.stream = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.0045, 1, 10), new THREE.MeshStandardMaterial({ color: 0xcfe9f7, transparent: true, opacity: 0.6, roughness: 0.02, depthWrite: false })); g.stream.visible = false; g.add(g.stream);
  g.setStream = (on, yEnd) => { g.stream.visible = on > 0.01; const y0 = TR.SPY - 0.006; const h = Math.max(0.01, y0 - yEnd); g.stream.scale.set(on, h, on); g.stream.position.set(0, y0 - h / 2, TR.SPZ); };
  g.drain = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.005, 1, 8), new THREE.MeshStandardMaterial({ color: 0x8a6a48, transparent: true, opacity: 0.5, roughness: 0.1, depthWrite: false })); g.drain.visible = false; g.add(g.drain);
  return g;
}

// ---------------- tálak, kefe ----------------
export function dish(r = 0.09, h = 0.05, mat) { const S = smats(); const g = new THREE.Group();
  const pts = []; for (let i = 0; i <= 10; i++) { const u = i / 10; pts.push([r * (0.55 + 0.45 * Math.sin(u * Math.PI / 2)), h * u]); } pts.push([r + 0.003, h + 0.002]); pts.push([r + 0.003, h - 0.003]);
  g.add(lathe(pts, mat || S.porc, 48)); g.add(cyl(r * 0.55, r * 0.55, 0.003, mat || S.porc, 0, 0.0015, 0, 40));
  g.soil = lathe([[0, 1], [0.6, 0.9], [0.85, 0.55], [1, 0]], S.dry, 40); g.soil.position.y = 0.003; g.add(g.soil); g.r = r; g.h = h;
  g.setSoil = (k, mat2) => { g.soil.visible = k > 0.005; const rr = r * (0.58 + 0.38 * clamp(k * 1.1)); g.soil.scale.set(rr, Math.max(0.001, h * 0.7 * k), rr); if (mat2) g.soil.material = mat2; };
  return g; }
export function brush() { const S = smats(); const g = new THREE.Group(); const h = cyl(0.009, 0.0075, 0.13, S.wood, 0, 0, 0, 14); h.rotation.z = Math.PI / 2; h.position.x = -0.065; g.add(h);
  bx(0.0, 0.05, -0.009, 0.009, -0.016, 0.016, S.wood, g); bx(0.003, 0.047, -0.03, -0.009, -0.014, 0.014, S.bristle, g); return g; }   // nyél −x felé, a sörte lefelé

// ---------------- hidrometrálás ----------------
export const CY = { RI: 0.031, RO: 0.0335, H: 0.45, BASE: 0.013, ML: 0.3312 };   // ML: 1000 ml szintje a belső fenék fölött (π·0,031²·h = 1 l)
const cylTex = () => { const S = canvasTex(64, 1024); const g = S.g; g.clearRect(0, 0, 64, 1024); g.fillStyle = 'rgba(30,40,60,0.9)'; for (let k = 0; k <= 10; k++) { const y = 1024 - (k * 100 / 1000) * (CY.ML / CY.H) * 1024 - (CY.BASE / CY.H) * 1024; g.fillRect(0, y - 2, k % 5 === 0 ? 40 : 26, 4); }
  g.font = '700 20px Arial'; g.fillText('1000', 2, 1024 - (CY.ML + CY.BASE) / CY.H * 1024 - 8); S.t.needsUpdate = true; return S.t; };
export function sedCyl(o = {}) {
  const S = smats(); const g = new THREE.Group(); const { RI, RO, H, BASE } = CY;
  const base = cyl(0.062, 0.062, 0.012, M(0xe8eef0, { transparent: true, opacity: 0.75, roughness: 0.15 }), 0, 0.006, 0, 6); g.add(base);
  g.add(lathe([[RI, BASE], [RO, BASE], [RO, H - 0.004], [RO + 0.004, H], [RI, H]], S.glass, 48));
  const sc = new THREE.Mesh(new THREE.CylinderGeometry(RO + 0.0004, RO + 0.0004, H, 32, 1, true, -0.35, 0.7), new THREE.MeshBasicMaterial({ map: cylTex(), transparent: true, depthWrite: false })); sc.position.y = H / 2; g.add(sc);
  g.liq = cyl(RI - 0.0004, RI - 0.0004, 1, new THREE.MeshStandardMaterial({ color: o.clear ? 0xa9cddd : 0x6a5038, transparent: true, opacity: o.clear ? 0.35 : 0.9, roughness: 0.2, depthWrite: false }), 0, 0, 0, 40); g.add(g.liq); g.liq.renderOrder = 3;
  g.sed = cyl(RI - 0.0006, RI - 0.0006, 1, SOILM('grey', 4), 0, 0, 0, 40); g.add(g.sed);
  g.setLiq = (vol, col, op = 0.9) => { const h = Math.max(0.0005, vol / 1000 * CY.ML); g.liq.visible = vol > 0.5; g.liq.scale.y = h; g.liq.position.y = BASE + h / 2; if (col !== undefined) g.liq.material.color.setHex(col); g.liq.material.opacity = op; return BASE + h; };
  g.setSed = (h) => { g.sed.visible = h > 0.0003; g.sed.scale.y = Math.max(0.0003, h); g.sed.position.y = BASE + h / 2; };
  g.setLiq(o.clear ? 1000 : 0, undefined, o.clear ? 0.35 : 0.9); g.setSed(0);
  return g;
}
// hidrométer: a lap „Y = 0” a hidrométer alja; a skála a száron (alul 1,030, felül 0,995)
export const HY = { BR: 0.0135, BL: 0.14, SR: 0.0034, SL: 0.27, S0: 0.022, SS: 0.12 };   // S0: a skála alja a szár aljától, SS: a skála hossza
const stemTex = () => { const S = canvasTex(64, 1024); const g = S.g; g.fillStyle = '#f6f3e6'; g.fillRect(0, 0, 64, 1024); g.fillStyle = '#1d2228';
  for (let k = 0; k <= 70; k++) { const y = 1024 - k / 70 * 1024; const w = k % 10 === 0 ? 40 : k % 2 === 0 ? 26 : 16; g.fillRect(0, y - 1.5, w, 3); } S.t.needsUpdate = true; return S.t; };
export function hydrometer() { const S = smats(); const g = new THREE.Group(); const { BR, BL, SR, SL, S0, SS } = HY;
  g.add(lathe([[0, 0], [0.006, 0.004], [BR * 0.9, 0.02], [BR, 0.04], [BR, BL - 0.03], [BR * 0.6, BL - 0.008], [SR, BL]], S.glassH, 32));
  g.add(cyl(0.007, 0.0085, 0.022, M(0x3a3a34, { metalness: 0.5, roughness: 0.4 }), 0, 0.013, 0, 16));                 // ólomsörét a fenékben
  g.add(cyl(SR, SR, SL, S.glassH, 0, BL + SL / 2, 0, 12));
  const sc = new THREE.Mesh(new THREE.CylinderGeometry(SR * 0.85, SR * 0.85, SS, 12, 1, true), new THREE.MeshBasicMaterial({ map: stemTex() })); sc.position.y = BL + S0 + SS / 2; g.add(sc);
  g.L = BL + SL; return g; }
export const hydStemY = (rho) => HY.BL + HY.S0 + (1.030 - rho) / 0.035 * HY.SS;    // a skála pontja (hidrométer-helyi y) egy sűrűséghez
export function plunger() { const S = smats(); const g = new THREE.Group(); g.add(cyl(0.0028, 0.0028, 0.47, S.steel, 0, 0.235, 0, 10));
  const d = cyl(0.027, 0.027, 0.003, S.steel, 0, 0.004, 0, 32); g.add(d); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; g.add(cyl(0.004, 0.004, 0.0035, S.dark, Math.cos(a) * 0.017, 0.004, Math.sin(a) * 0.017, 10)); }
  g.add(cyl(0.011, 0.011, 0.045, S.knob, 0, 0.47 + 0.0225, 0, 16)); g.top = 0.47 + 0.045; g.knobY = 0.47 + 0.0225; return g; }
export function thermometer() { const S = smats(); const g = new THREE.Group(); g.add(cyl(0.0032, 0.0032, 0.3, S.glassH, 0, 0.15, 0, 10)); g.add(cyl(0.0022, 0.0022, 0.012, S.red, 0, 0.008, 0, 10));
  g.add(cyl(0.0008, 0.0008, 0.15, S.red, 0, 0.09, 0, 6)); g.add(cyl(0.004, 0.004, 0.012, S.knob, 0, 0.3, 0, 10)); return g; }
export function beaker(r = 0.044, h = 0.125) { const S = smats(); const g = new THREE.Group(); g.add(lathe([[0, 0.001], [r - 0.002, 0.001], [r, 0.004], [r, h - 0.002], [r + 0.003, h]], S.glass, 40));
  g.liq = cyl(r - 0.002, r - 0.002, 1, new THREE.MeshStandardMaterial({ color: 0x6a5038, transparent: true, opacity: 0.85, roughness: 0.2, depthWrite: false }), 0, 0, 0, 32); g.add(g.liq);
  g.setLiq = (k, col) => { const hh = Math.max(0.001, (h - 0.02) * k); g.liq.visible = k > 0.01; g.liq.scale.y = hh; g.liq.position.y = 0.003 + hh / 2; if (col !== undefined) g.liq.material.color.setHex(col); };
  g.r = r; g.h = h; return g; }
export function bottle(label, r = 0.034, h = 0.16, cap = 0x2f6fb5, body = 0xf4f4f0) { const S = smats(); const g = new THREE.Group();
  g.add(lathe([[0, 0], [r, 0], [r, h * 0.78], [r * 0.45, h * 0.92], [r * 0.4, h]], M(body, { roughness: 0.45 }), 32)); g.cap = cyl(r * 0.45, r * 0.45, 0.022, M(cap, { roughness: 0.4 }), 0, h + 0.011, 0, 18); g.add(g.cap);
  const C = canvasTex(256, 128); const gg = C.g; gg.fillStyle = '#ffffff'; gg.fillRect(0, 0, 256, 128); gg.fillStyle = '#1b2026'; gg.font = '700 34px Arial'; gg.textAlign = 'center'; const L = label.split('\n'); L.forEach((s, i) => gg.fillText(s, 128, 50 + i * 40));
  const lb = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.0005, r + 0.0005, h * 0.36, 24, 1, true, -0.9, 1.8), new THREE.MeshBasicMaterial({ map: C.t })); lb.position.y = h * 0.42; g.add(lb); g.h = h; g.r = r; return g; }
// keverőgép (laboratóriumi felső keverő állványon): talp, hátsó oszlop, a motorfej az oszlopon csúszik (felemelhető), tengely lapáttal; a csésze a talpon áll
export const MX = { CUP_R: 0.045, CUP_H: 0.17, HEADY: 0.36, CUPZ: 0.03, BASE: 0.025, MR: 0.034, LIFT: 0.17 };
export function mixer() { const S = smats(); const g = new THREE.Group(); bx(-0.09, 0.09, 0, MX.BASE, -0.13, 0.09, S.housing, g); g.add(cyl(0.011, 0.011, 0.62, S.steel, 0, MX.BASE + 0.31, -0.1, 16));
  g.add(cyl(0.05, 0.05, 0.004, S.dark, 0, MX.BASE + 0.002, MX.CUPZ, 32));
  g.head = new THREE.Group(); g.add(g.head); const H0 = MX.HEADY;
  g.head.add(cyl(0.02, 0.02, 0.045, S.dark, 0, H0 + 0.07, -0.1, 18)); bx(-0.012, 0.012, H0 + 0.058, H0 + 0.082, -0.1, MX.CUPZ - 0.02, S.dark, g.head);
  g.head.add(cyl(MX.MR, MX.MR, 0.13, S.housing, 0, H0 + 0.065, MX.CUPZ, 28)); g.head.add(cyl(MX.MR + 0.001, MX.MR + 0.001, 0.012, S.dark, 0, H0 + 0.006, MX.CUPZ, 28));
  g.shaft = new THREE.Group(); g.shaft.position.set(0, H0, MX.CUPZ); g.head.add(g.shaft); g.shaft.add(cyl(0.003, 0.003, 0.27, S.steel, 0, -0.135, 0, 8));
  for (const a of [0, Math.PI / 2]) { const b = bx(-0.014, 0.014, -0.272, -0.266, -0.002, 0.002, S.steel, g.shaft); b.rotation.y = a; }
  g.setHead = (dy) => { g.head.position.y = dy; };
  g.btn = cyl(0.008, 0.008, 0.006, S.green, 0.055, 0.014, 0.093, 16); g.btn.rotation.x = Math.PI / 2; g.add(g.btn); g.btnP = V(0.055, 0.014, 0.096); return g; }
export function mixCup() { const S = smats(); const g = new THREE.Group(); g.add(lathe([[0, 0], [MX.CUP_R - 0.006, 0], [MX.CUP_R - 0.004, 0.004], [MX.CUP_R, MX.CUP_H], [MX.CUP_R + 0.002, MX.CUP_H]], S.steel, 40));
  for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2; const b = bx(-0.0015, 0.0015, 0.02, MX.CUP_H - 0.02, -0.005, 0.005, S.steel, g); b.position.set(Math.cos(a) * (MX.CUP_R - 0.006), 0, Math.sin(a) * (MX.CUP_R - 0.006)); b.rotation.y = -a; }
  g.liq = cyl(MX.CUP_R - 0.004, MX.CUP_R - 0.004, 1, new THREE.MeshStandardMaterial({ color: 0x6a5038, roughness: 0.25 }), 0, 0, 0, 32); g.add(g.liq);
  g.setLiq = (k) => { const hh = Math.max(0.001, 0.09 * k); g.liq.visible = k > 0.01; g.liq.scale.y = hh; g.liq.position.y = 0.003 + hh / 2; }; g.setLiq(0); return g; }
// ömlő anyag (szemcsék vagy folyadék): rövid sugár két pont között
export function pourStream(col = 0x8a6a48, op = 0.8) { const m = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 10, 1, true), new THREE.MeshStandardMaterial({ color: col, transparent: true, opacity: op, roughness: 0.6, depthWrite: false, side: THREE.DoubleSide })); m.visible = false;
  m.set = (a, b, r) => { if (!a || !b || r <= 0) { m.visible = false; return; } m.visible = true; const d = b.clone().sub(a); const L = d.length(); m.position.copy(a).addScaledVector(d, 0.5); m.scale.set(r, L, r); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); }; return m; }
