// Közvetlen nyíróvizsgálat – eszközök (EN ISO 17892-10): négyzetes nyíródoboz (60 × 60 mm, két keret, elöl fülek a rögzítőcsavaroknak,
// jobb oldalt fülek az emelőcsavaroknak, bal oldalt a felső kereten a terhelőkar füle), vízkád-kocsi síneken, motoros hajtás, vízszintes erőmérő
// állítható karral, függőleges terhelőegység C-keretben (elektromechanikus, a rúd felhúzható), útadók, vezérlő; kiszúró keret toldattal, kitoló,
// talajlap a négyzetes nyommal. Méter, a tárgy helyi rendszerében: a gép origója a doboz közepe az asztal síkjában (y = 0 az asztallap).
import * as THREE from 'three';
import { M, cyl, bx, SOILM, canvasTex, screen } from './room.js';
import { mats2 } from './oedo2.js';
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
// doboz (a helyi y a kád belső fenekétől), próbatest, kád, terhelőegység
export const SB = { A: 0.03, O: 0.045, HL: 0.022, HU: 0.024, FB: 0.006, ST: 0.006, H: 0.02, EARX: 0.032, EARZ: 0.072, LIFTZ: 0.022, LIFTX: 0.0585, LOCKR: 0.006, LIFTR: 0.005, LOCKH: 0.012, LIFTH: 0.01 };
export const RG = { FL: 0.046, BX: 0.13, BZ: 0.09, WT: 0.004, BH: 0.118, RAMUP: 0.39, HOUSE0: 0.40, KNOB: [-0.305, 0.164, 0], ARMRET: -0.03, LVX: -0.1 };
export const CAPU = { BALL: 0.032, BOSSR: 0.012, BOSSH: 0.01, PLT: 0.008 };              // a terhelőfej: szűrőkő 6 mm + lap 8 mm + csap 10 mm + golyó; a golyó teteje a fej aljától
export const CUT = { A: 0.03, O: 0.0318, H: 0.02, CH: 0.015 };                          // kiszúró keret (belül 60 × 60 mm) és toldat
export const PSH = { PA: 0.0294, PT: 0.006, SR: 0.004, K0: 0.055, K1: 0.09, KR: 0.012 };  // kitoló: lap, szár, fa gomb (az origó a lap alja)
let NM = null;
export function nmats() { if (NM) return NM; const A = mats2(); NM = { ...A, white: M(0xe9ebee, { roughness: 0.45 }), box: M(0xd3d8dc, { metalness: 0.8, roughness: 0.24 }),
  inox: new THREE.MeshStandardMaterial({ color: 0xc6ccd1, metalness: 0.75, roughness: 0.28, side: THREE.DoubleSide }), knurl: M(0x6a7076, { metalness: 0.7, roughness: 0.45 }),
  soil: (() => { const m = SOILM('clay', 44); m.color.setScalar(1.35); return m; })(), hole: M(0x2a2119, { roughness: 0.95 }), green: M(0x2fae5a, { roughness: 0.4 }), blue: M(0x2f6fb5, { roughness: 0.4 }),
  cable: M(0x1b1d20, { roughness: 0.6 }), slip: new THREE.MeshBasicMaterial({ color: 0xff7a2a, transparent: true, opacity: 0.0, depthWrite: false, side: THREE.DoubleSide }) }; return NM; }
const shadow = (o) => { o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; };
// négyzetes keret (falak): belső félszélesség a, külső o, y0–y1
function sqRing(a, o, y0, y1, mat, par) { return [bx(-o, o, y0, y1, -o, -a, mat, par), bx(-o, o, y0, y1, a, o, mat, par), bx(-o, -a, y0, y1, -a, a, mat, par), bx(a, o, y0, y1, -a, a, mat, par)]; }
// recézett fej (függőleges tengely): sima henger + vékony recék
function knurled(r, h, mat, km) { const g = new THREE.Group(); g.add(cyl(r, r, h, mat, 0, h / 2, 0, 24)); for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; bx(-0.0006, 0.0006, 0.0008, h - 0.0008, -0.0006, 0.0006, km, g).position.set(Math.cos(a) * r, h / 2, Math.sin(a) * r); } return g; }
// csavar: fej (recézett) + szár lefelé; az origó a fej alja
function screw(r, h, shank) { const S = nmats(); const g = new THREE.Group(); g.add(knurled(r, h, S.steel, S.knurl)); g.add(cyl(r * 0.5, r * 0.5, shank, S.steel, 0, -shank / 2, 0, 12)); return g; }

// ---------------- nyíródoboz ----------------
// a doboz origója a kád belső fenekén (az alsó keret talpa alatt), a doboz közepén. upper: a felső keret (y-ban emelhető: rés; x-ben a kocsi ellen mozog)
export function shearBox() {
  const S = nmats(); const g = new THREE.Group();
  const lo = new THREE.Group(); g.add(lo); g.lower = lo; bx(-SB.O, SB.O, 0, SB.FB, -SB.O, SB.O, S.box, lo); g.lowW = sqRing(SB.A, SB.O, SB.FB, SB.HL, S.box, lo); g.frontParts = [];
  for (const x of [-SB.EARX, SB.EARX]) g.frontParts.push(bx(x - 0.008, x + 0.008, 0.012, SB.HL, SB.O, SB.EARZ, S.box, lo));   // elülső fülek (alsó)
  for (const z of [-SB.LIFTZ, SB.LIFTZ]) bx(SB.O, SB.EARZ, 0.012, SB.HL, z - 0.008, z + 0.008, S.box, lo);              // jobb oldali fülek (alsó)
  g.stone = bx(-0.0298, 0.0298, SB.FB, SB.FB + SB.ST, -0.0298, 0.0298, S.stone, lo);
  const up = new THREE.Group(); g.add(up); g.upper = up; g.upW = sqRing(SB.A, SB.O, SB.HL, SB.HL + SB.HU, S.box, up);
  for (const x of [-SB.EARX, SB.EARX]) g.frontParts.push(bx(x - 0.009, x + 0.009, SB.HL, SB.HL + SB.HU, SB.O, SB.EARZ, S.box, up));   // a felső fülek a keret tetejéig érnek
  for (const z of [-SB.LIFTZ, SB.LIFTZ]) bx(SB.O, SB.EARZ, SB.HL, SB.HL + SB.HU, z - 0.009, z + 0.009, S.box, up);
  bx(-0.056, -SB.O, 0.028, 0.042, -0.012, 0.012, S.box, up); up.add(cyl(0.004, 0.004, 0.0008, S.black, -0.0564, 0.035, 0, 12).rotateZ(Math.PI / 2));   // a terhelőkar füle (bal)
  // rögzítőcsavarok (elöl), emelőcsavarok (jobb oldalt): a fej alja a fül tetején
  g.lock = [-SB.EARX, SB.EARX].map(x => { const s = screw(SB.LOCKR, SB.LOCKH, 0.034); s.position.set(x, SB.HL + SB.HU, (SB.O + SB.EARZ) / 2); up.add(s); s.home = s.position.clone(); return s; });
  g.lift = [SB.LIFTZ, -SB.LIFTZ].map(z => { const s = screw(SB.LIFTR, SB.LIFTH, 0.03); s.position.set(SB.LIFTX, SB.HL + SB.HU, z); up.add(s); s.home = s.position.clone(); return s; });
  g.frontParts.push(...g.lock);
  // a nyírási sík kiemelése (a metszetben): vékony, áttetsző narancs lap a két keret határán, az átfedő részen; elöl izzó él
  g.slip = new THREE.Group(); up.add(g.slip); g.slip.pl = bx(-0.5, 0.5, -0.0004, 0.0004, -SB.A + 0.0004, SB.A - 0.0004, S.slip, g.slip); g.slip.edge = bx(-0.5, 0.5, -0.0009, 0.0009, SB.A - 0.0006, SB.A + 0.0006, new THREE.MeshBasicMaterial({ color: 0xff7a2a, transparent: true, opacity: 0, depthWrite: false }), g.slip);
  g.slip.visible = false; g.setSlip = (k, dx) => { g.slip.visible = k > 0.01; const x0 = -SB.A, x1 = SB.A - dx; g.slip.position.set((x0 + x1) / 2, SB.HL, 0); g.slip.pl.scale.x = g.slip.edge.scale.x = x1 - x0; g.slip.pl.material.opacity = 0.42 * k; g.slip.edge.material.opacity = 0.95 * k; };
  shadow(g); g.slip.traverse(m => { m.castShadow = false; m.receiveShadow = false; }); return g;
}
// próbatest: két rész (a nyírási sík alatt és fölött); az origó a talpa; set(h, dx): a magasság és az alsó rész eltolódása
export function shearSpec() { const S = nmats(); const g = new THREE.Group(); const a = SB.A - 0.0002;
  g.lo = new THREE.Mesh(new THREE.BoxGeometry(2 * a, 1, 2 * a), S.soil); g.up = new THREE.Mesh(new THREE.BoxGeometry(2 * a, 1, 2 * a), S.soil); g.add(g.lo, g.up);
  const split = SB.HL - SB.FB - SB.ST;                                                      // a nyírási sík a talptól (10 mm)
  g.set = (h, dx = 0, whole = false) => { if (whole) { g.lo.scale.y = h; g.lo.position.set(0, h / 2, 0); g.up.visible = false; return; } g.up.visible = true;
    g.lo.scale.y = split; g.lo.position.set(dx, split / 2, 0); g.up.scale.y = Math.max(0.001, h - split); g.up.position.set(0, split + (h - split) / 2, 0); };
  g.set(SB.H); return shadow(g); }
// terhelőfej: szűrőkő + alumínium lap + csap golyós fészekkel + golyó; az origó a szűrőkő alja
export function capUnit() { const S = nmats(); const g = new THREE.Group(); bx(-0.0296, 0.0296, 0, 0.006, -0.0296, 0.0296, S.stone, g); bx(-0.0292, 0.0292, 0.006, 0.006 + CAPU.PLT, -0.0292, 0.0292, S.alu, g);
  const y = 0.006 + CAPU.PLT; g.add(cyl(CAPU.BOSSR, CAPU.BOSSR, CAPU.BOSSH, S.alu, 0, y + CAPU.BOSSH / 2, 0, 28)); g.add(cyl(0.005, 0.004, 0.0006, S.black, 0, y + CAPU.BOSSH + 0.0003, 0, 16));
  const b = new THREE.Mesh(new THREE.SphereGeometry(0.006, 20, 14), S.steel); b.position.y = CAPU.BALL - 0.006; g.add(b); return shadow(g); }

// ---------------- a gép ----------------
export function shearRig() {
  const S = nmats(); const g = new THREE.Group();
  bx(-0.36, 0.31, 0, 0.03, -0.17, 0.13, S.cast, g);                                           // alaplap
  for (const z of [-0.05, 0.05]) { g.add(cyl(0.004, 0.004, 0.34, S.steel, 0, 0.034, z, 12).rotateZ(Math.PI / 2)); for (const x of [-0.16, 0.16]) bx(x - 0.006, x + 0.006, 0.03, 0.036, z - 0.006, z + 0.006, S.dark, g); }
  // kád-kocsi (x-ben mozog): fenék, falak, csapágybakok, a motor ütközője (jobb), az útadó füle (elöl)
  const car = new THREE.Group(); g.add(car); g.car = car;
  for (const x of [-0.09, 0.09]) for (const z of [-0.05, 0.05]) bx(x - 0.012, x + 0.012, 0.036, 0.042, z - 0.008, z + 0.008, S.dark, car);
  bx(-RG.BX, RG.BX, 0.042, RG.FL, -RG.BZ, RG.BZ, S.inox, car);
  g.walls = [bx(-RG.BX, RG.BX, RG.FL, RG.BH, RG.BZ - RG.WT, RG.BZ, S.inox, car), bx(-RG.BX, RG.BX, RG.FL, RG.BH, -RG.BZ, -RG.BZ + RG.WT, S.inox, car),
    bx(-RG.BX, -RG.BX + RG.WT, RG.FL, RG.BH, -RG.BZ, RG.BZ, S.inox, car), bx(RG.BX - RG.WT, RG.BX, RG.FL, RG.BH, -RG.BZ, RG.BZ, S.inox, car)];
  bx(RG.BX, RG.BX + 0.012, 0.062, 0.088, -0.014, 0.014, S.dark, car); bx(0.1, 0.112, 0.07, 0.084, RG.BZ, RG.BZ + 0.022, S.dark, car);
  g.water = bx(-RG.BX + RG.WT + 0.0005, RG.BX - RG.WT - 0.0005, 0, 1, -RG.BZ + RG.WT + 0.0005, RG.BZ - RG.WT - 0.0005, S.water, car); g.water.renderOrder = 8;
  g.setWater = (y) => { g.water.visible = y > RG.FL + 0.0015; g.water.scale.y = Math.max(0.001, y - RG.FL); g.water.position.y = (RG.FL + y) / 2; };
  g.setWater(0);
  g.box = shearBox(); g.box.position.set(0, RG.FL, 0); car.add(g.box);
  // motoros hajtás (jobb): hajtómű-ház, motor, tolócsavar a kocsi ütközőjéig
  bx(0.16, 0.30, 0.03, 0.125, -0.06, 0.06, S.white, g); g.add(cyl(0.032, 0.032, 0.09, S.dark, 0.245, 0.157, -0.02, 24).rotateZ(Math.PI / 2)); bx(0.2, 0.29, 0.125, 0.128, -0.055, 0.015, S.dark, g);
  g.push = cyl(0.007, 0.007, 1, S.steel, 0, 0.075, 0, 14); g.push.rotation.z = Math.PI / 2; g.add(g.push); bx(0.155, 0.16, 0.06, 0.09, -0.02, 0.02, S.dark, g);
  g.setPush = (xc) => { const x0 = RG.BX + 0.012 + xc, x1 = 0.155; g.push.scale.y = Math.max(0.001, x1 - x0); g.push.position.x = (x0 + x1) / 2; };
  // vízszintes útadó (elöl, jobb): ház a tartón, a csúcs a kocsi fülén
  bx(0.17, 0.19, 0.03, 0.077, 0.09, 0.11, S.dark, g); g.add(cyl(0.008, 0.008, 0.07, S.steel, 0.2, 0.077, 0.1, 16).rotateZ(Math.PI / 2));
  g.hLv = cyl(0.0022, 0.0022, 1, S.steel, 0, 0.077, 0.1, 8); g.hLv.rotation.z = Math.PI / 2; g.add(g.hLv);
  g.setHLv = (xc) => { const x0 = 0.112 + xc, x1 = 0.165; g.hLv.scale.y = Math.max(0.001, x1 - x0); g.hLv.position.x = (x0 + x1) / 2; };
  // vízszintes erőmérő (bal): oszlop, erőmérő cella, állítható kar (rúd + láb + orr) a felső keret füléhez, állítógomb az oszlop tetején
  bx(-0.33, -0.28, 0.03, 0.15, -0.04, 0.04, S.frame, g); g.add(cyl(0.022, 0.022, 0.04, S.dark, -0.26, 0.13, 0, 24).rotateZ(Math.PI / 2)); g.add(cyl(0.023, 0.023, 0.004, S.steel, -0.24, 0.13, 0, 24).rotateZ(Math.PI / 2));
  const arm = new THREE.Group(); g.add(arm); g.arm = arm; arm.add(cyl(0.006, 0.006, 0.16, S.steel, -0.16, 0.13, 0, 12).rotateZ(Math.PI / 2));
  bx(-0.088, -0.072, 0.074, 0.138, -0.008, 0.008, S.steel, arm); bx(-0.072, -0.056, 0.076, 0.086, -0.006, 0.006, S.steel, arm);
  g.knob = knurled(0.013, 0.014, S.black, S.knurl); g.knob.position.set(RG.KNOB[0], 0.15, RG.KNOB[2]); g.add(g.knob);
  // függőleges terhelőegység: C-keret (oszlop hátul, kar előre), hajtás-ház, felhúzható terhelőrúd erőmérővel és gömbsüveggel; útadó a rúdon
  bx(-0.04, 0.04, 0.03, 0.57, -0.17, -0.11, S.frame, g); bx(-0.05, 0.05, 0.52, 0.57, -0.17, 0.04, S.frame, g);
  g.add(cyl(0.034, 0.034, 0.26, S.white, 0, RG.HOUSE0 + 0.13, 0, 32)); bx(-0.045, 0.045, RG.HOUSE0 + 0.26, RG.HOUSE0 + 0.32, -0.05, 0.05, S.dark, g);
  const ram = new THREE.Group(); g.add(ram); g.ram = ram; ram.rod = cyl(0.008, 0.008, 1, S.steel, 0, 0, 0, 16); ram.add(ram.rod);
  ram.lc = cyl(0.018, 0.018, 0.014, S.dark, 0, 0, 0, 24); ram.add(ram.lc); ram.tip = cyl(0.01, 0.006, 0.01, S.steel, 0, 0, 0, 18); ram.add(ram.tip);
  // függőleges útadó: a rúdra fogott konzolon, a csúcsa a kád elülső falának tetején (a kocsi csak x-ben mozog)
  const LZ = RG.BZ - RG.WT / 2; ram.br = new THREE.Group(); ram.add(ram.br); bx(RG.LVX, 0.0, -0.003, 0.003, -0.006, 0.006, S.dark, ram.br); bx(RG.LVX - 0.004, RG.LVX + 0.004, -0.003, 0.003, 0.0, LZ + 0.004, S.dark, ram.br);
  ram.lv = cyl(0.007, 0.007, 0.06, S.steel, RG.LVX, -0.03, LZ, 16); ram.br.add(ram.lv); ram.pl = cyl(0.002, 0.002, 1, S.steel, RG.LVX, 0, LZ, 8); ram.br.add(ram.pl);
  g.setRam = (tipY) => { const top = RG.HOUSE0; ram.rod.scale.y = Math.max(0.001, top - (tipY + 0.024)); ram.rod.position.y = (top + tipY + 0.024) / 2; ram.lc.position.y = tipY + 0.017; ram.tip.position.y = tipY + 0.005;
    const by = tipY + 0.075; ram.br.position.y = by; const len = Math.max(0.002, Math.min(0.02, (by - 0.06) - (RG.BH + 0.0003))); ram.pl.scale.y = len; ram.pl.position.y = -0.06 - len / 2; };
  g.setRam(RG.RAMUP);
  shadow(g); g.water.castShadow = false; return g;
}
// vezérlő: ferde előlap kijelzővel és három gombbal (▼ terhelés, ▶ nyírás, ■ állj); a gombok helye (helyi) BTN-ben
export const CTL = { W: 0.11, D: 0.08, H: 0.1, TILT: 0.55 };
export function controlUnit() {
  const S = nmats(); const g = new THREE.Group(); const D = CTL.D, W = CTL.W, y0 = 0.05, y1 = 0.11, zb = -D + 0.04;
  // oldalprofil (z, y) kihúzva x mentén: elöl alacsony, a ferde lap hátrafelé emelkedik
  const sh = new THREE.Shape(); [[D, 0], [D, y0], [zb, y1], [-D, y1], [-D, 0]].forEach(([z, y], i) => i ? sh.lineTo(-z, y) : sh.moveTo(-z, y)); sh.closePath();
  const geo = new THREE.ExtrudeGeometry(sh, { depth: 2 * W, bevelEnabled: false }); geo.rotateY(Math.PI / 2); geo.translate(-W, 0, 0); g.add(new THREE.Mesh(geo, S.white));
  const th = Math.atan2(y1 - y0, D - zb); const pan = new THREE.Group(); pan.position.set(0, y0, D); pan.rotation.x = th; g.add(pan); g.pan = pan;   // a ferde lap: helyi xz síkja, normálisa +y
  g.scr = screen(pan, 0.12, 0.06, 384, 192, -0.035, 0.0008, -0.075, -Math.PI / 2);
  g.btn = {}; const cols = { load: S.blue, start: S.green, stop: S.red }; [['load', 0.058, -0.075], ['start', 0.058, -0.045], ['stop', 0.088, -0.06]].forEach(([k, x, z]) => { const b = cyl(0.008, 0.008, 0.005, cols[k], x, 0.0025, z, 18); pan.add(b); g.btn[k] = b; });
  g.btnPt = (k) => { pan.updateMatrix(); g.updateMatrix(); return g.btn[k].position.clone().add(V(0, 0.005, 0)).applyMatrix4(pan.matrix); };    // a gomb teteje a vezérlő helyi rendszerében
  g.panN = V(0, 1, 0).applyAxisAngle(V(1, 0, 0), th);
  return shadow(g);
}
export function drawCtl(S, o) { const g = S.g; g.fillStyle = '#0e1a22'; g.fillRect(0, 0, 384, 192); g.font = '700 26px Arial'; g.textAlign = 'left';
  const row = (y, k, v, u, col = '#9fe36a') => { g.fillStyle = '#7fb3c9'; g.fillText(k, 14, y); g.fillStyle = col; g.textAlign = 'right'; g.fillText(v, 300, y); g.font = '700 20px Arial'; g.fillText(u, 372, y); g.font = '700 26px Arial'; g.textAlign = 'left'; };
  row(36, 'σ', o.sig, 'kPa'); row(76, 'F', o.F, 'N'); row(116, 'δh', o.dh, 'mm'); row(156, 'δv', o.dv, 'mm');
  if (o.state) { g.fillStyle = o.state === 'NYÍRÁS' ? '#3FE0C5' : '#F2C14E'; g.font = '700 18px Arial'; g.textAlign = 'right'; g.fillText(o.state, 372, 184); }
  S.t.needsUpdate = true; }

// ---------------- minta-előkészítés ----------------
// kiszúró keret (négyzetes, vékony falú, alul élezett); az origó a talpa
const CUTM = () => M(0xc4cacf, { metalness: 0.75, roughness: 0.38 });
export function cutter() { const g = new THREE.Group(); const m = CUTM(); sqRing(CUT.A, CUT.O, 0.002, CUT.H, m, g); sqRing(CUT.A, CUT.A + 0.0008, 0, 0.002, m, g); return shadow(g); }
// toldat: a keret tetejére ülő azonos szelvényű rövid keret (recézett sávval)
export function cutCollar() { const S = nmats(); const g = new THREE.Group(); sqRing(CUT.A, CUT.O, 0, CUT.CH, S.knurl, g); sqRing(CUT.O, CUT.O + 0.0006, 0.005, 0.01, S.dark, g); return shadow(g); }
// kitoló: négyzetes lap, szár, fa gomb
export function pusherSq() { const S = nmats(); const g = new THREE.Group(); bx(-PSH.PA, PSH.PA, 0, PSH.PT, -PSH.PA, PSH.PA, S.steel, g); g.add(cyl(PSH.SR, PSH.SR, PSH.K0 - PSH.PT + 0.004, S.steel, 0, (PSH.K0 + PSH.PT) / 2, 0, 12));
  g.add(cyl(PSH.KR, PSH.KR * 0.92, PSH.K1 - PSH.K0, S.wood, 0, (PSH.K0 + PSH.K1) / 2, 0, 20)); return shadow(g); }
// talajlap (zavartalan minta szelete) a kiszúrás nyomával (négyzetes lyuk teteje)
export function soilSlabSq(w, h, d) { const S = nmats(); const g = new THREE.Group(); const b = bx(-w / 2, w / 2, 0, h, -d / 2, d / 2, S.soil, g); b.castShadow = true; b.receiveShadow = true;
  g.hole = bx(-CUT.O, CUT.O, h, h + 0.0008, -CUT.O, CUT.O, S.hole, g); g.hole.visible = false; g.h = h; return g; }
// lehúzott talaj (morzsák) a keret előtt
export function strikeCrumbs(n = 18, seed = 5) { const S = nmats(); const g = new THREE.Group(); let s = seed; const r = () => (s = (s * 9301 + 49297) % 233280) / 233280; g.items = [];
  for (let i = 0; i < n; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), S.soil); const k = 0.003 + 0.004 * r(); m.scale.set(k * 1.3, k * 0.7, k); m.position.set((r() - 0.5) * 0.07, k * 0.5, r() * 0.02); m.castShadow = true; g.add(m); g.items.push(m); }
  g.show = (k) => g.items.forEach((m, i) => { m.visible = i < Math.round(k * g.items.length); }); g.show(0); return g; }
