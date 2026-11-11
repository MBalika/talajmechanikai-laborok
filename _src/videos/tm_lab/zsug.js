// Zsugorodási határ – eszközök: kiszúró gyűrű (Ø 25 × 25 mm, élezett alsó él) toldattal, kitoló, talajlap (a kiszúrás helyén lyukkal),
// hengeres próbatest (zsugorodik, szárad), üvegtál, digitális tolómérő (0,01 mm) tartóval. Méter, a tárgy helyi rendszerében, az origó a talpán.
import * as THREE from 'three';
import { M, cyl, bx, SOILM, canvasTex } from './room.js';
import { kmats } from './konz2.js';
const lathe = (pts, mat, seg = 48) => { const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg); const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; return m; };
export const ZR = { RI: 0.0125, RO: 0.0137, H: 0.025, CH: 0.012 };
let ZM = null;
export function zmats() { if (ZM) return ZM; const S = kmats(); ZM = { steel: S.steel, dark: S.dark, wood: S.wood, soil: (() => { const m = SOILM('clay', 21); m.color.setScalar(1.55); return m; })(), hole: M(0x2a2119, { roughness: 0.95 }),
  ring: M(0xb9bfc4, { metalness: 0.85, roughness: 0.22 }), collar: M(0x8d949a, { metalness: 0.8, roughness: 0.3 }) }; return ZM; }
// kiszúró gyűrű: vékony fal, alul kifelé élezett; benne a talajmag (setCore: a gyűrű aljától mért y0–y1)
export function cutRing() { const S = zmats(); const g = new THREE.Group();
  g.add(lathe([[ZR.RI, 0], [ZR.RI + 0.0003, 0], [ZR.RO, 0.004], [ZR.RO, ZR.H], [ZR.RI, ZR.H], [ZR.RI, 0]], S.ring, 48));
  g.core = new THREE.Mesh(new THREE.CylinderGeometry(ZR.RI - 0.0002, ZR.RI - 0.0002, 1, 36), S.soil); g.core.castShadow = true; g.add(g.core); g.core.visible = false;
  g.setCore = (y0, y1) => { const h = y1 - y0; g.core.visible = h > 0.0006; g.core.scale.y = Math.max(0.0005, h); g.core.position.y = (y0 + y1) / 2; }; return g; }
// toldat: a gyűrű tetejére ülő, azonos átmérőjű rövid cső (recézett övvel); a kiszúráskor a gyűrű fölötti talaj ide nyomódik
export function collar() { const S = zmats(); const g = new THREE.Group();
  g.add(lathe([[ZR.RI, 0], [ZR.RO, 0], [ZR.RO, ZR.CH], [ZR.RI, ZR.CH], [ZR.RI, 0]], S.collar, 48));
  g.add(lathe([[ZR.RO, 0.004], [ZR.RO + 0.0006, 0.0045], [ZR.RO + 0.0006, 0.0085], [ZR.RO, 0.009]], M(0x5f666c, { metalness: 0.7, roughness: 0.5 }), 48)); return g; }
// kitoló: Ø 24 mm-es tárcsa, rúd, fa fogantyú (az origó a tárcsa alja)
export const PU = { DR: 0.012, DT: 0.006, ROD: 0.0035, HY0: 0.075, HY1: 0.125, HR: 0.011 };
export function pusher() { const S = zmats(); const g = new THREE.Group(); g.add(cyl(PU.DR, PU.DR, PU.DT, S.steel, 0, PU.DT / 2, 0, 32)); g.add(cyl(PU.ROD, PU.ROD, PU.HY0 - PU.DT + 0.004, S.steel, 0, (PU.HY0 + PU.DT) / 2, 0, 14));
  g.add(lathe([[0, PU.HY0], [PU.HR - 0.002, PU.HY0], [PU.HR, PU.HY0 + 0.003], [PU.HR, PU.HY1 - 0.004], [PU.HR - 0.003, PU.HY1], [0, PU.HY1]], S.wood, 24)); return g; }
// talajlap (I_C ≈ 0,7) a kiszúrás nyomával
export function soilSlab(w = 0.09, h = 0.03, d = 0.08) { const S = zmats(); const g = new THREE.Group(); const b = bx(-w / 2, w / 2, 0, h, -d / 2, d / 2, S.soil, g); b.castShadow = true;
  g.hole = cyl(ZR.RO, ZR.RO, 0.0008, S.hole, 0, h + 0.0004, 0, 36); g.add(g.hole); g.hole.visible = false; g.h = h; return g; }
// hengeres próbatest: set(d, h, dry) – dry 0 → 1: a nedves, sötét talaj kivilágosodik
export function specimen() { const g = new THREE.Group(); const mat = SOILM('clay', 21); const m = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 40), mat); m.castShadow = true; m.receiveShadow = true; g.add(m); g.m = m;
  g.set = (d, h, dry = 0) => { m.scale.set(d / 2, h, d / 2); m.position.y = h / 2; const c = 1.45 + 0.75 * dry; mat.color.setRGB(c, c * (0.98 + 0.03 * dry), c * (0.95 + 0.07 * dry)); mat.roughness = 0.85 + 0.12 * dry; };
  g.set(0.025, 0.025); return g; }
// levágott korong (a gyűrű fölötti 5 mm)
export function slice() { const S = zmats(); const g = new THREE.Group(); const m = cyl(ZR.RI - 0.0002, ZR.RI - 0.0002, 0.005, S.soil, 0, 0.0025, 0, 32); m.castShadow = true; g.add(m); return g; }
// üvegtál (Ø 92 × 15 mm)
export const DISH = { R: 0.046, H: 0.015, F: 0.002 };
export function glassDish() { const g = new THREE.Group(); const gl = new THREE.MeshStandardMaterial({ color: 0xdfeff4, transparent: true, opacity: 0.42, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false });
  g.add(lathe([[0, 0], [DISH.R - 0.002, 0], [DISH.R, 0.002], [DISH.R, DISH.H], [DISH.R - 0.002, DISH.H], [DISH.R - 0.002, DISH.F], [0, DISH.F]], gl, 48)); return g; }
// digitális tolómérő: a rúd az x tengely mentén, a mérőcsőrök a −x végen lefelé (−y), a kijelző elöl (+z); set(nyílás) – a két csőr belső lapja közti távolság
export const CAL = { L: 0.2, W: 0.016, T: 0.003, JAW: 0.04, J0: 0.004, HX: 0.045 };
export function caliper() { const g = new THREE.Group(); const st = M(0xd8dcdf, { metalness: 0.85, roughness: 0.2 }), dk = M(0x2a2d32, { roughness: 0.5 });
  bx(-0.002, CAL.L, -CAL.W / 2, CAL.W / 2, -CAL.T / 2, CAL.T / 2, st, g);                                                   // rúd
  const jaw = (par, x0, x1) => { bx(x0, x1, -CAL.W / 2 - CAL.JAW + 0.006, CAL.W / 2, -CAL.T / 2, CAL.T / 2, st, par);              // mérőcsőr (lefelé, a vége elvékonyodik)
    bx(x0 + (x0 < 0.003 ? 0.002 : 0), x1 - (x0 < 0.003 ? 0 : 0.002), -CAL.W / 2 - CAL.JAW, -CAL.W / 2 - CAL.JAW + 0.006, -CAL.T / 2, CAL.T / 2, st, par);
    bx(x0 + (x0 < 0.003 ? 0.002 : 0), x1 - (x0 < 0.003 ? 0 : 0.002), CAL.W / 2, CAL.W / 2 + 0.014, -CAL.T / 2 * 0.6, CAL.T / 2 * 0.6, st, par); };   // belső mérőcsőr (felfelé)
  jaw(g, -0.004, CAL.J0);
  { const C = canvasTex(512, 48); const c = C.g; c.fillStyle = '#d8dcdf'; c.fillRect(0, 0, 512, 48); c.strokeStyle = '#30353a'; c.lineWidth = 2; for (let i = 0; i <= 150; i++) { const x = 6 + i * 3.3; c.beginPath(); c.moveTo(x, 0); c.lineTo(x, i % 10 === 0 ? 26 : i % 5 === 0 ? 18 : 11); c.stroke(); }
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.0075), new THREE.MeshStandardMaterial({ map: C.t, metalness: 0.5, roughness: 0.3 })); m.position.set(0.105, 0.003, CAL.T / 2 + 0.0003); g.add(m); }
  g.slide = new THREE.Group(); g.add(g.slide); jaw(g.slide, 0, 0.006);
  bx(0.006, 0.072, -CAL.W / 2 - 0.004, CAL.W / 2 + 0.003, -CAL.T / 2 - 0.004, CAL.T / 2 + 0.005, dk, g.slide);              // kijelzős ház
  g.disp = (() => { const C = canvasTex(192, 64); const m = new THREE.Mesh(new THREE.PlaneGeometry(0.034, 0.011), new THREE.MeshBasicMaterial({ map: C.t })); m.position.set(0.036, 0.0, CAL.T / 2 + 0.0052); g.slide.add(m); return C; })();
  for (const x of [0.06, 0.066]) bx(x - 0.002, x + 0.002, -0.006, -0.002, CAL.T / 2 + 0.005, CAL.T / 2 + 0.006, M(0xe0e0e0, { roughness: 0.4 }), g.slide);   // gombok
  { const w = cyl(0.0045, 0.0045, 0.004, dk, 0.012, -CAL.W / 2 - 0.006, 0, 16); w.rotation.x = Math.PI / 2; g.slide.add(w); }                              // hüvelykkerék
  g.open = 0; g.set = (open) => { g.open = open; g.slide.position.x = CAL.J0 + open; }; g.set(0.004); return g; }
export function drawCal(C, v) { const g = C.g; g.fillStyle = '#c3cfbb'; g.fillRect(0, 0, 192, 64); g.fillStyle = '#1b2026'; g.font = '700 46px Arial'; g.textAlign = 'right'; g.fillText(v, 182, 50); g.font = '700 16px Arial'; g.textAlign = 'left'; g.fillText('mm', 6, 18); C.t.needsUpdate = true; }
// tolómérő-tartó: fa talp, a bal végén rés a mérőcsőröknek (a tolómérő a csőreivel lefelé áll benne)
export const CH = { H: 0.042 };
export function calHolder() { const S = zmats(); const g = new THREE.Group(); bx(-0.016, 0.024, 0, CH.H, -0.016, 0.016, S.wood, g); bx(0.024, 0.19, 0, CH.H - 0.004, -0.012, 0.012, S.wood, g);
  bx(-0.0065, 0.0175, CH.H - 0.0005, CH.H + 0.0002, -0.003, 0.003, M(0x1a1410), g); return g; }
