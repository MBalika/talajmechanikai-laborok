// Ödométer (EN ISO 17892-5, Kis Talajmechanika 39–40. ábra) – klasszikus emelőkaros keret súlytárcsákkal, rögzített gyűrűs cella,
// valamint a minta bekészítésének eszközei. Méretek méterben, a tárgyak saját (helyi) rendszerében; az origó a tárgy talpán.
// Cella (alulról): cellaalj (víztartó tál két fogantyúval, leeresztőcsappal) → alsó szűrőkő → szűrőpapír → kompressziós gyűrű a mintával
// (Ø 75 × 20 mm) → szűrőpapír → felső szűrőkő → rögzítőgyűrű (merev gyűrű, 3 recézett csavar) → terhelőlap (golyós fészek, mérőóra-talp).
// Keret: alaplap, hátsó oszlop villás csapággyal, emelőkar (terhelési pont 80 mm, akasztó 800 mm → 1:10), ellensúly, karemelő csavaros
// tartó kézikerékkel, akasztó tányérral, mérőóra konzolon (0,01 mm).
import * as THREE from 'three';
import { M, cyl, bx, MAT, SOILM, canvasTex } from './room.js';
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const lathe = (pts, mat, seg = 48) => { const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg); const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; return m; };
export const JK = { x: 0.1, y: 0.065, z: 0.07, r: 0.035, knobX: 0.128 };   // a hajtókar tengelyének helye a karemelőhöz képest; a markolat közepe x-ben
export const DIM = { ringID: 0.075, ringOD: 0.081, ringH: 0.02, stoneR: 0.0372, stoneH: 0.008, paperH: 0.0006, capR: 0.0368, capH: 0.014 };
let MM = null;
export function mats2() { if (MM) return MM; MM = {
  steel: M(0xc9ced3, { metalness: 0.85, roughness: 0.22 }), ring: new THREE.MeshStandardMaterial({ color: 0xd8dde1, metalness: 0.9, roughness: 0.18, side: THREE.DoubleSide }),
  brass: M(0xb89a4c, { metalness: 0.8, roughness: 0.28 }), alu: M(0xb7bcc1, { metalness: 0.65, roughness: 0.32 }), cast: M(0x7d858d, { metalness: 0.35, roughness: 0.55 }),
  frame: M(0x3d6f9e, { metalness: 0.3, roughness: 0.45 }), dark: M(0x24272b, { metalness: 0.4, roughness: 0.45 }), black: M(0x121416, { roughness: 0.5 }),
  stone: M(0xe7e3d9, { roughness: 0.96 }), paper: M(0xf6f3ea, { roughness: 0.92 }), glass: new THREE.MeshStandardMaterial({ color: 0xdfeff4, transparent: true, opacity: 0.35, roughness: 0.05, metalness: 0, side: THREE.DoubleSide, depthWrite: false }),
  wood: M(0x8a5a32, { roughness: 0.7 }), rubber: M(0x1d1f22, { roughness: 0.8 }), red: M(0xc8322a, { roughness: 0.45 }),
  water: new THREE.MeshStandardMaterial({ color: 0x6a9db6, transparent: true, opacity: 0.38, roughness: 0.04, depthWrite: false }),
  clay: SOILM('clay', 61), clay2: SOILM('wet', 33) }; return MM; }

// ---------------- minta-előkészítés ----------------
// kompressziós gyűrű vágóéllel (alul, kívül 30°-os él), a mintával (spec: henger, magassága állítható)
export function ringWithSpecimen() {
  const A = mats2(); const g = new THREE.Group(); const r0 = DIM.ringID / 2, r1 = DIM.ringOD / 2, h = DIM.ringH;
  g.add(lathe([[r0, 0.0], [r0 + 0.0008, 0.0], [r1, 0.004], [r1, h], [r0, h], [r0, 0.0]], A.ring, 64));
  const spec = new THREE.Mesh(new THREE.CylinderGeometry(r0 - 0.0002, r0 - 0.0002, 1, 48), A.clay); spec.castShadow = true; spec.receiveShadow = true; g.add(spec); g.spec = spec;
  g.setSpec = (y0, y1) => { spec.visible = y1 > y0 + 1e-4; spec.scale.y = Math.max(1e-4, y1 - y0); spec.position.y = (y0 + y1) / 2; };
  g.setSpec(0, h); return g;
}
// zavartalan talajhenger az üveglapon (Ø 100 × 60 mm), a gyűrű előtt körbefaragva: alsó rész Ø 100, fölötte Ø 76
export function soilBlock() {
  const A = mats2(); const g = new THREE.Group(); const lo = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.051, 1, 48), A.clay); const hi = new THREE.Mesh(new THREE.CylinderGeometry(0.0381, 0.0381, 1, 48), A.clay);
  [lo, hi].forEach(m => { m.castShadow = true; m.receiveShadow = true; g.add(m); }); g.lo = lo; g.hi = hi;
  g.setTrim = (yCut, yTop, yBottom = 0) => { lo.visible = yCut > yBottom + 1e-4; lo.scale.y = Math.max(1e-4, yCut - yBottom); lo.position.y = (yBottom + yCut) / 2; hi.visible = yTop > yCut + 1e-4; hi.scale.y = Math.max(1e-4, yTop - yCut); hi.position.y = (yCut + yTop) / 2; };
  g.setTrim(0.06, 0.06); return g;
}
// lefaragott morzsák az üveglapon (n darab látszik)
export function crumbs(n = 26, seed = 7) { const A = mats2(); const g = new THREE.Group(); let s = seed; const r = () => (s = (s * 9301 + 49297) % 233280) / 233280; g.items = [];
  for (let i = 0; i < n; i++) { const a = r() * Math.PI * 2, d = 0.056 + r() * 0.03; const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.004 + r() * 0.005, 0), A.clay); m.position.set(Math.cos(a) * d, 0.003, Math.sin(a) * d); m.rotation.set(r() * 3, r() * 3, r() * 3); m.scale.y = 0.6; m.castShadow = true; g.add(m); g.items.push(m); }
  g.show = (k) => g.items.forEach((m, i) => m.visible = i < k * n); return g; }
export function glassPlate2(w = 0.26, d = 0.2) { const A = mats2(); const g = new THREE.Group(); bx(-w / 2, w / 2, 0, 0.006, -d / 2, d / 2, A.glass, g); bx(-w / 2, w / 2, -0.0005, 0.0004, -d / 2, d / 2, M(0xd8e6ea, { roughness: 0.2, transparent: true, opacity: 0.5 }), g); return g; }
// nyomósapka: a gyűrű tetejére illő tárcsa gombbal (a kiszúráskor a tenyér ezt nyomja)
export function pressCap() { const A = mats2(); const g = new THREE.Group(); g.add(cyl(0.0435, 0.0435, 0.012, A.alu, 0, 0.006, 0, 48)); g.add(cyl(0.012, 0.014, 0.022, A.dark, 0, 0.023, 0, 24)); return g; }
// faragókés: nyél (x mentén, -0,1…0) + penge (0…0,12); origó a nyél és a penge találkozásánál
export function knife() { const A = mats2(); const g = new THREE.Group(); const h = cyl(0.0105, 0.0095, 0.1, A.black, -0.05, 0, 0, 16); h.rotation.z = Math.PI / 2; g.add(h);
  const shape = new THREE.Shape(); shape.moveTo(0, -0.011); shape.lineTo(0.11, -0.004); shape.lineTo(0.125, 0.0); shape.lineTo(0.11, 0.011); shape.lineTo(0, 0.011); shape.lineTo(0, -0.011);
  const bl = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.0014, bevelEnabled: false }), A.steel); bl.position.z = -0.0007; bl.castShadow = true; g.add(bl); return g; }
// huzalfűrész: két fanyél (függőleges tengellyel), köztük acélhuzal; a huzal hossza állítható
export function wireSaw() { const A = mats2(); const g = new THREE.Group(); g.hL = cyl(0.011, 0.011, 0.075, A.wood, 0, 0, 0, 16); g.hR = cyl(0.011, 0.011, 0.075, A.wood, 0, 0, 0, 16); g.add(g.hL, g.hR);
  g.wire = cyl(0.0006, 0.0006, 1, A.steel, 0, 0, 0, 6); g.wire.rotation.z = Math.PI / 2; g.add(g.wire);
  g.set = (span) => { g.hL.position.set(-span / 2, 0, 0); g.hR.position.set(span / 2, 0, 0); g.wire.scale.y = span; }; g.set(0.28); return g; }
// acélvonalzó (lehúzó): 300 × 30 × 2 mm, origó a közepén, hossza x mentén, éle lefelé
export function straightEdge() { const A = mats2(); const g = new THREE.Group(); bx(-0.15, 0.15, 0, 0.03, -0.001, 0.001, A.steel, g); return g; }
// víztartalom-tégely (fedő nélkül)
export function tin2() { const A = mats2(); const g = new THREE.Group(); g.add(lathe([[0, 0], [0.034, 0], [0.035, 0.002], [0.035, 0.024], [0.033, 0.024], [0.033, 0.002], [0, 0.002]], A.alu, 40)); const s = cyl(0.032, 0.032, 0.008, A.clay, 0, 0.006, 0, 32); s.visible = false; g.add(s); g.soil = s; return g; }
export function stone() { const A = mats2(); const g = new THREE.Group(); g.add(cyl(DIM.stoneR, DIM.stoneR, DIM.stoneH, A.stone, 0, DIM.stoneH / 2, 0, 48)); return g; }
export function paper() { const A = mats2(); const g = new THREE.Group(); g.add(cyl(0.0375, 0.0375, DIM.paperH, A.paper, 0, DIM.paperH / 2, 0, 48)); return g; }
// víztál a szűrőkövekkel (a kövek külön tárgyak), szűrőpapír-tartó doboz
export function waterBowl() { const A = mats2(); const g = new THREE.Group(); g.add(lathe([[0, 0], [0.085, 0], [0.09, 0.004], [0.095, 0.04], [0.092, 0.04], [0.087, 0.006], [0, 0.006]], M(0xf2f2f0, { roughness: 0.3 }), 48));
  const w = cyl(0.088, 0.088, 0.024, A.water, 0, 0.018, 0, 40); w.renderOrder = 5; g.add(w); return g; }
export function paperBox() { const A = mats2(); const g = new THREE.Group(); bx(-0.05, 0.05, 0, 0.012, -0.05, 0.05, M(0x3b6ea8, { roughness: 0.6 }), g); g.add(cyl(0.0375, 0.0375, 0.006, A.paper, 0.006, 0.015, 0, 40)); return g; }
// főzőpohár vízzel (600 ml), a víz szintje állítható (0…1)
export function beaker() { const A = mats2(); const g = new THREE.Group(); const gl = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.04, 0.12, 40, 1, true), A.glass); gl.position.y = 0.06; g.add(gl); g.add(cyl(0.04, 0.04, 0.003, A.glass, 0, 0.0015, 0, 40));
  const w = cyl(0.039, 0.038, 1, A.water, 0, 0, 0, 32); w.renderOrder = 6; g.add(w); g.water = w; g.setLevel = (k) => { w.visible = k > 0.01; w.scale.y = Math.max(0.001, 0.1 * k); w.position.y = 0.003 + 0.05 * k; }; g.setLevel(0.8);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.0015, 6, 40), A.glass); lip.rotation.x = Math.PI / 2; lip.position.y = 0.12; g.add(lip); return g; }

// ---------------- ödométercella ----------------
export function cellBase() {
  const A = mats2(); const g = new THREE.Group();
  g.add(lathe([[0, 0], [0.074, 0], [0.075, 0.002], [0.075, 0.05], [0.07, 0.05], [0.07, 0.012], [0.042, 0.012], [0.042, 0.016], [0, 0.016]], A.alu, 64));   // tál, középen a szűrőkő fészke (Ø 84, 4 mm mély)
  for (const s of [-1, 1]) { const hd = cyl(0.007, 0.007, 0.095, A.steel, s * 0.1215, 0.03, 0, 12); hd.rotation.z = Math.PI / 2; g.add(hd); g.add(cyl(0.009, 0.009, 0.004, A.steel, s * 0.169, 0.03, 0, 12).rotateZ(Math.PI / 2)); }   // fogantyúk (x mentén, 9 cm: egy egész kéz elfér rajtuk)
  for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3 + Math.PI / 2; g.add(cyl(0.006, 0.006, 0.012, A.alu, Math.cos(a) * 0.049, 0.018, Math.sin(a) * 0.049, 16)); }   // csavarperselyek a rögzítőgyűrűhöz
  const vb = cyl(0.006, 0.006, 0.03, A.brass, 0, 0.012, 0.088, 12); vb.rotation.x = Math.PI / 2; g.add(vb); g.valve = new THREE.Group(); g.valve.position.set(0, 0.022, 0.1); g.add(g.valve); g.valve.add(cyl(0.0028, 0.0028, 0.008, A.brass, 0, -0.001, 0, 10)); bx(-0.004, 0.032, 0.001, 0.005, -0.0035, 0.0035, A.red, g.valve);   // golyóscsap: függőleges szár, vízszintes kar (x mentén: zárva; a csőhöz párhuzamosan, +z: nyitva)
  const w = cyl(0.069, 0.069, 1, A.water, 0, 0, 0, 48); w.renderOrder = 9; g.add(w); g.water = w; g.setWater = (k) => { w.visible = k > 0.005; w.scale.y = Math.max(0.001, 0.036 * k); w.position.y = 0.012 + 0.018 * k; }; g.setWater(0);
  return g;
}
// rögzítőgyűrű (merev gyűrű): rátolva a kompressziós gyűrűre, 3 recézett csavarral a cellaaljhoz
export function clampRing() {
  const A = mats2(); const g = new THREE.Group(); g.add(lathe([[0.0412, 0], [0.058, 0], [0.058, 0.01], [0.0412, 0.01], [0.0412, 0]], A.brass, 64));
  g.screws = []; for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3 + Math.PI / 2; const s = new THREE.Group(); s.position.set(Math.cos(a) * 0.049, 0.01, Math.sin(a) * 0.049); g.add(s);
    const head = cyl(0.0075, 0.0075, 0.01, A.dark, 0, 0.005, 0, 16); s.add(head); for (let k = 0; k < 8; k++) { const b = k / 8 * Math.PI * 2; bx(-0.0008, 0.0008, 0.0005, 0.0095, -0.0003, 0.0003, A.steel, s).position.set(Math.cos(b) * 0.0076, 0.005, Math.sin(b) * 0.0076); }
    s.add(cyl(0.003, 0.003, 0.012, A.steel, 0, -0.006, 0, 8)); g.screws.push(s); }
  return g;
}
// terhelőlap: lyukacsos alumíniumtárcsa, golyós fészek középen, oldalt a mérőóra talpa (z+ irányú kar)
export function loadCap() {
  const A = mats2(); const g = new THREE.Group(); g.add(cyl(DIM.capR, DIM.capR, DIM.capH, A.alu, 0, DIM.capH / 2, 0, 48));
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; g.add(cyl(0.0028, 0.0028, 0.0004, A.black, Math.cos(a) * 0.022, DIM.capH + 0.0002, Math.sin(a) * 0.022, 10)); }
  g.add(cyl(0.009, 0.012, 0.008, A.steel, 0, DIM.capH + 0.004, 0, 24)); const ball = new THREE.Mesh(new THREE.SphereGeometry(0.0055, 16, 12), A.steel); ball.position.y = DIM.capH + 0.011; g.add(ball);
  bx(0.006, 0.018, DIM.capH - 0.004, DIM.capH, 0.03, 0.068, A.alu, g); bx(0.003, 0.021, DIM.capH - 0.002, DIM.capH + 0.001, 0.055, 0.073, A.steel, g);   // mérőóra-talp (z+), pontosan a mérőcsúcs alatt (x = 12 mm)
  g.anvil = V(0.012, DIM.capH + 0.001, 0.064); g.ballTop = DIM.capH + 0.0165; return g;
}
// ---------------- terhelőkeret ----------------
// helyi origó: a cella közepe a keret alaplapjának tetején; a kar a cella fölött x mentén, csukló x = -0,08-nál (az oszlop mögötte),
// akasztó x = +0,72-nél (1:10). A beam csoport forog a csukló körül (rotation.z).
export const FR = { base: 0.03, piv: -0.08, hang: 0.72, beamY: 0.124, rod: 0.3 };   // az akasztó tányérja ~0,74 m-en: kényelmes munkamagasság
export function oedFrame() {
  const A = mats2(); const g = new THREE.Group(); const yb = FR.base;
  bx(-0.2, 0.13, 0, yb, -0.16, 0.12, A.cast, g); bx(-0.035, 0.035, yb, yb + 0.004, -0.035, 0.035, A.steel, g);   // alaplap, központosító
  g.add(cyl(0.022, 0.022, FR.beamY + 0.05, A.steel, FR.piv, yb + (FR.beamY + 0.05) / 2, -0.11, 24));          // oszlop (hátul)
  bx(FR.piv - 0.03, FR.piv + 0.03, yb + FR.beamY - 0.03, yb + FR.beamY + 0.035, -0.135, -0.085, A.frame, g);      // csapágybak
  for (const s of [-1, 1]) bx(FR.piv - 0.022, FR.piv + 0.022, yb + FR.beamY - 0.025, yb + FR.beamY + 0.03, s > 0 ? 0.016 : -0.09, s > 0 ? 0.022 : -0.016, A.frame, g);   // villa két lapja
  bx(FR.piv - 0.022, FR.piv + 0.022, yb + FR.beamY + 0.024, yb + FR.beamY + 0.03, -0.09, 0.022, A.frame, g);
  const pin = cyl(0.006, 0.006, 0.13, A.steel, FR.piv, yb + FR.beamY, -0.04, 12); pin.rotation.x = Math.PI / 2; g.add(pin);
  // emelőkar (forgó csoport a csuklóban)
  const beam = new THREE.Group(); beam.position.set(FR.piv, yb + FR.beamY, 0); g.add(beam); g.beam = beam;
  bx(-0.16, FR.hang - FR.piv + 0.04, -0.014, 0.014, -0.011, 0.011, A.frame, beam);
  const cw = cyl(0.032, 0.032, 0.05, A.dark, -0.13, 0, 0, 24); cw.rotation.z = Math.PI / 2; beam.add(cw);           // ellensúly
  beam.add(cyl(0.008, 0.008, 0.04, A.steel, -FR.piv, -0.02, 0, 12)); beam.add(cyl(0.012, 0.012, 0.008, A.dark, -FR.piv, -0.0065, 0, 16));   // terhelőcsavar (x = 0) recézett anyával
  const kn = cyl(0.004, 0.004, 0.03, A.steel, FR.hang - FR.piv, -0.012, 0, 8); kn.rotation.x = Math.PI / 2; beam.add(kn);   // akasztó-csap
  // akasztó (függőleges marad): rúd + tányér
  const hg = new THREE.Group(); g.add(hg); g.hanger = hg; hg.add(cyl(0.006, 0.006, FR.rod, A.steel, 0, -FR.rod / 2, 0, 12)); hg.add(cyl(0.012, 0.012, 0.03, A.steel, 0, -0.012, 0, 12));
  hg.add(cyl(0.07, 0.07, 0.01, A.dark, 0, -FR.rod - 0.005, 0, 40)); hg.plateTop = -FR.rod;
  // karemelő (tartócsavar kézikerékkel) a kar alatt, x = 0,38
  const jk = new THREE.Group(); jk.position.set(0.38, 0, 0); g.add(jk); g.jack = jk; bx(-0.03, 0.03, 0, 0.02, -0.03, 0.03, A.cast, jk); jk.add(cyl(0.012, 0.012, 0.06, A.cast, 0, 0.05, 0, 16));
  jk.screw = cyl(0.007, 0.007, 0.12, A.steel, 0, 0, 0, 12); jk.add(jk.screw); jk.pad = cyl(0.016, 0.016, 0.006, A.rubber, 0, 0, 0, 16); jk.add(jk.pad);
  // hajtókar: kúpkerekes hajtómű a csavaron, vízszintes tengely jobbra (+x), a kar a tengely végén, a markolat a tengellyel párhuzamos –
  // a kéz elölről, tenyérrel lefelé fogja (a kar alatt bőven van hely, a kéz nem ér a karhoz)
  bx(-0.022, 0.03, 0.04, 0.09, -0.022, 0.09, A.cast, jk); const sh = cyl(0.005, 0.005, 0.07, A.steel, 0.065, JK.y, JK.z, 12); sh.rotation.z = Math.PI / 2; jk.add(sh);
  jk.wheel = new THREE.Group(); jk.wheel.position.set(JK.x, JK.y, JK.z); jk.add(jk.wheel); bx(-0.003, 0.003, -0.004, 0.004, -0.004, JK.r + 0.004, A.dark, jk.wheel);
  jk.knob = cyl(0.009, 0.009, 0.05, A.black, 0.028, 0, JK.r, 16); jk.knob.rotation.z = Math.PI / 2; jk.wheel.add(jk.knob);
  // mérőóra: konzol az oszlopról, az óra a terhelőlap talpa fölött (z = 0,064), számlap előre (z+)
  const gb = new THREE.Group(); g.add(gb); g.gauge = gb; g.add(bx(FR.piv - 0.015, 0.02, yb + 0.1, yb + 0.112, -0.118, -0.102, A.steel));
  bx(0.005, 0.02, yb + 0.1, yb + 0.112, -0.11, 0.064, A.steel, g);
  const body = new THREE.Group(); body.position.set(0.012, yb + 0.14, 0.064); gb.add(body); g.gBody = body;
  const cs = cyl(0.03, 0.03, 0.016, A.steel, 0, 0, 0, 40); cs.rotation.x = Math.PI / 2; body.add(cs); const bez = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.0025, 8, 40), A.steel); bez.position.z = 0.008; body.add(bez); body.bezel = bez;
  body.add(cyl(0.004, 0.004, 0.018, A.steel, 0, -0.038, 0, 10)); g.stem = cyl(0.0018, 0.0018, 1, A.steel, 0, 0, 0, 8); gb.add(g.stem);
  const D = canvasTex(256, 256); const face = new THREE.Mesh(new THREE.CircleGeometry(0.0275, 48), new THREE.MeshBasicMaterial({ map: D.t })); face.position.z = 0.0085; body.add(face); g.dial = D; g.dialFace = face;
  g.gaugeTipY = (anvilY) => { const top = yb + 0.14 - 0.047; g.stem.scale.y = Math.max(0.002, top - anvilY); g.stem.position.set(0.012, (top + anvilY) / 2, 0.064); };
  return g;
}
// mérőóra rajzolása: nagy mutató 1 mm/fordulat (0,01 mm osztás), kis számláló mm-ben, nullázott szögben elforgatott skála
export function drawDial(D, mm, zeroRot = 0, hi = false) {
  const g = D.g, c = 128; g.fillStyle = '#f6f4ec'; g.fillRect(0, 0, 256, 256); g.save(); g.translate(c, c); g.rotate(zeroRot);
  g.strokeStyle = '#1a1a1a'; for (let i = 0; i < 100; i++) { const a = i / 100 * Math.PI * 2; const r0 = i % 10 ? (i % 5 ? 112 : 104) : 96; g.lineWidth = i % 10 ? 1.6 : 3; g.beginPath(); g.moveTo(Math.sin(a) * r0, -Math.cos(a) * r0); g.lineTo(Math.sin(a) * 121, -Math.cos(a) * 121); g.stroke(); }
  g.fillStyle = '#1a1a1a'; g.font = '700 20px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; g.fillText(String(i * 10), Math.sin(a) * 80, -Math.cos(a) * 80); }
  g.restore(); g.font = '600 13px Arial'; g.fillStyle = '#444'; g.textAlign = 'center'; g.fillText('0,01 mm', c, c + 46);
  // kis számláló (mm)
  g.strokeStyle = '#333'; g.lineWidth = 1.5; g.beginPath(); g.arc(c, c - 42, 18, 0, Math.PI * 2); g.stroke(); const am = (mm / 10) * Math.PI * 2; g.strokeStyle = '#c0281e'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(c, c - 42); g.lineTo(c + Math.sin(am) * 15, c - 42 - Math.cos(am) * 15); g.stroke();
  const a = (mm % 1) * Math.PI * 2; g.strokeStyle = hi ? '#e0281e' : '#c0281e'; g.lineWidth = 5; g.beginPath(); g.moveTo(c - Math.sin(a) * 18, c + Math.cos(a) * 18); g.lineTo(c + Math.sin(a) * 108, c - Math.cos(a) * 108); g.stroke();
  g.fillStyle = '#222'; g.beginPath(); g.arc(c, c, 7, 0, Math.PI * 2); g.fill(); D.t.needsUpdate = true;
}
// réselt súlytárcsa: a ráírt feszültség (kPa) a Ø 75 mm-es gyűrűre és az 1:10-es karra; tömeg a felirat alatt
export function slotDisc(kPa, kg, r, h) {
  const A = mats2(); const g = new THREE.Group(); const sh = new THREE.Shape(); sh.absarc(0, 0, r, 0.09, Math.PI * 2 - 0.09, false); sh.lineTo(0.009 * Math.cos(-0.09) + 0.0, -0.009); sh.absarc(0, 0, 0.009, -Math.PI / 2, -Math.PI * 1.5, true); sh.lineTo(r * Math.cos(0.09), r * Math.sin(0.09));
  const geo = new THREE.ExtrudeGeometry(sh, { depth: h, bevelEnabled: true, bevelThickness: 0.0012, bevelSize: 0.0012, bevelSegments: 2, curveSegments: 40 }); geo.rotateX(-Math.PI / 2); geo.translate(0, 0, 0);
  const m = new THREE.Mesh(geo, M(0x5f666e, { metalness: 0.75, roughness: 0.35 })); m.castShadow = true; m.receiveShadow = true; g.add(m);
  const T = canvasTex(256, 128); const c = T.g; c.fillStyle = 'rgba(0,0,0,0)'; c.clearRect(0, 0, 256, 128); c.fillStyle = '#f2f2ee'; c.font = '800 54px Arial'; c.textAlign = 'center'; c.fillText(kPa + ' kPa', 128, 58); c.font = '600 34px Arial'; c.fillText(String(kg).replace('.', ',') + ' kg', 128, 104); T.t.needsUpdate = true;
  const lab = new THREE.Mesh(new THREE.PlaneGeometry(r * 1.05, r * 0.52), new THREE.MeshBasicMaterial({ map: T.t, transparent: true })); lab.rotation.x = -Math.PI / 2; lab.position.set(-r * 0.42, h + 0.0014, 0); lab.rotation.z = Math.PI / 2; g.add(lab);
  g.h = h + 0.0024; g.r = r; return g;   // a rés +x felé nyílik
}
export function toolTray() { const A = mats2(); const g = new THREE.Group(); bx(-0.1, 0.1, 0, 0.02, -0.1, 0.1, A.wood, g); bx(-0.098, 0.098, 0.0195, 0.0202, -0.0035, -0.0005, M(0x2a2118), g); return g; }   // fatálca, rajta horony az álló acélvonalzónak
export function weightStand() { const A = mats2(); const g = new THREE.Group(); bx(-0.13, 0.13, 0, 0.02, -0.13, 0.13, A.cast, g); for (const [x, z] of [[-0.11, -0.11], [0.11, -0.11], [-0.11, 0.11], [0.11, 0.11]]) bx(x - 0.012, x + 0.012, 0.02, 0.62, z - 0.012, z + 0.012, A.cast, g); bx(-0.13, 0.13, 0.6, 0.62, -0.13, 0.13, A.cast, g); g.add(cyl(0.05, 0.05, 0.04, A.dark, 0, 0.64, 0, 32)); g.top = 0.66; return g; }   // kis talp: a tárcsák pereme túlnyúlik rajta, alá lehet nyúlni
// stopper (digitális óra) a keret mellett
export function timer() { const A = mats2(); const g = new THREE.Group(); bx(-0.045, 0.045, 0, 0.022, -0.03, 0.03, A.dark, g); g.btn = cyl(0.007, 0.007, 0.006, A.red, 0.028, 0.025, 0.0, 16); g.add(g.btn);
  const T = canvasTex(256, 96); const s = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.0225), new THREE.MeshBasicMaterial({ map: T.t })); s.rotation.x = -Math.PI / 2 + 0.35; s.position.set(-0.012, 0.0235, 0.004); g.add(s); g.scr = T; return g; }
export function drawTimer(T, txt) { const g = T.g; g.fillStyle = '#0f1a12'; g.fillRect(0, 0, 256, 96); g.fillStyle = '#9fe36a'; g.font = '700 58px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 128, 52); T.t.needsUpdate = true; }
