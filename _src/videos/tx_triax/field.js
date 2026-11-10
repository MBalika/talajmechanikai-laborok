// Terepi mintavétel: üreges csőspirál (4¼" HSA) a mintavételi mélységig, a központi dugó már kint; a csövön át
// leengedett vékonyfalú mintavevő csövet (Ø 76 mm, felületi arány ≈ 9 %) a gép hidraulikája ütés és forgatás nélkül,
// egyenletesen nyomja a talajba (EN ISO 22475-1, A kategória; ASTM D1587). A minta a csőben marad.
// A gép, a csőspirál és a munkások a talajfelderítés-sorozat bevált modelljei (kit/tf.js; tf_hsa).
import * as THREE from 'three';
import { clamp, lerp, smooth, seg } from '../../kit/util.js';
import { SU, GU, buildSoil, buildGrains, updateGrains } from '../../kit/soil.js';
import { M, box, cyl, buildWorker, helixRibbon } from '../../kit/parts.js';
import { shadowAll } from '../../kit/models.js';
import { buildDrillTruck2, buildFilledAuger, buildShovel, halfWall } from '../../kit/tf.js';
import { gripCylinder, gripRodFront, POLE, leverGrip } from '../../kit/grip.js';
import * as TL from './timeline.js';
import { tb, DS, SEG } from './timeline.js';

export const LAYERS = [
  { key: 'peat', name: 'Termőréteg', top: 0, bottom: 0.6 },
  { key: 'silt', name: 'Homokos iszap', top: 0.6, bottom: 3.0 },
  { key: 'clay', name: 'Agyag', top: 3.0, bottom: 40 },
];
export const GW = -2.0;
const RT = 0.073, RI = 0.054, RF = 0.097, HB = 0.105, PITCH = 0.17, CAP = 0.16;
const TR = 0.038, TRI = 0.0363, TUBE = 0.9, SL = 1.1, SR = 4.6;        // vékonyfalú cső: külső/belső sugár, hossz; mintavevő + fej; rudazat
const CLIP = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0.0); const CLIPM = [];
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const SOILC = { peat: new THREE.Color('#4b3d30'), silt: new THREE.Color('#8f8370'), clay: new THREE.Color('#6f5a4a') };
function soilColorAt(z, out) {
  let k = LAYERS.length - 1; for (let i = 0; i < LAYERS.length; i++) if (z < LAYERS[i].bottom) { k = i; break; }
  out.copy(SOILC[LAYERS[k].key]); const L = LAYERS[k], bw = 0.04;
  if (k > 0 && z - L.top < bw) out.lerp(SOILC[LAYERS[k - 1].key], 0.5 * (1 - (z - L.top) / bw));
  if (k < LAYERS.length - 1 && L.bottom - z < bw) out.lerp(SOILC[LAYERS[k + 1].key], 0.5 * (1 - (L.bottom - z) / bw));
  if (z > -GW) out.multiplyScalar(0.86);
  return out;
}
function cm(color, o = {}) { const m = new THREE.MeshStandardMaterial({ color, metalness: 0.55, roughness: 0.42, side: THREE.DoubleSide, ...o }); CLIPM.push(m); return m; }
function mesh(geo, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; }
function hollowSeg(lead) {
  const g = buildFilledAuger(SEG, RF, RT, PITCH, { flush: true, fillAbs: HB, tip: 'none', joint: false, noCore: true, capIn: RT, s0: lead ? 0.2 : 0.05, s1: SEG - 0.13, th: 0.012 });
  g.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.side = THREE.DoubleSide; CLIPM.push(o.material); } });
  g.userData.fl.material.color.setHex(0x7a6252);
  g.add(mesh(new THREE.CylinderGeometry(RT, RT, SEG, 40, 1, true), cm(0x6e5a4b), 0, SEG / 2));
  g.add(mesh(new THREE.CylinderGeometry(RI, RI, SEG, 40, 1, true), cm(0x3b3532, { metalness: 0.3, roughness: 0.7 }), 0, SEG / 2));
  g.add(mesh(new THREE.CylinderGeometry(RT + 0.007, RT + 0.007, 0.12, 40, 1, true), cm(0x5c4a3f), 0, SEG - 0.06));
  g.add(mesh(new THREE.RingGeometry(RI, RT + 0.007, 40).rotateX(-Math.PI / 2), cm(0x5c4a3f), 0, SEG, 0));
  for (const a of [0, Math.PI]) { const b = mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.018, 6), cm(0xa7aeb5, { metalness: 0.8, roughness: 0.25 })); b.rotation.z = Math.PI / 2; b.position.set(Math.cos(a) * (RT + 0.014), SEG - 0.06, Math.sin(a) * (RT + 0.014)); b.rotation.y = -a; g.add(b); }
  if (lead) { const body = cm(0x47423f, { metalness: 0.6, roughness: 0.38 }), hard = cm(0xc9ced3, { metalness: 0.85, roughness: 0.22 });
    g.add(mesh(new THREE.CylinderGeometry(RT + 0.01, RT + 0.012, 0.2, 40, 1, true), body, 0, 0.1)); g.add(mesh(new THREE.RingGeometry(RI, RT + 0.012, 40).rotateX(Math.PI / 2), body, 0, 0.0, 0));
    g.add(mesh(helixRibbon(RT + 0.01, RF + 0.004, PITCH, 1.0, 0.022, 36), body, 0, 0.03));
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + 0.2, rr = i % 2 ? RT + 0.005 : RF - 0.004; const hold = mesh(new THREE.BoxGeometry(0.026, 0.045, 0.03), body, Math.cos(a) * rr, 0.0, -Math.sin(a) * rr); hold.rotation.y = a; hold.rotation.z = (i % 2 ? 0.25 : -0.35); g.add(hold);
      const tooth = mesh(new THREE.ConeGeometry(0.011, 0.04, 10), hard, Math.cos(a) * (rr + (i % 2 ? -0.004 : 0.006)), -0.035, -Math.sin(a) * (rr + (i % 2 ? -0.004 : 0.006))); tooth.rotation.x = Math.PI; g.add(tooth); } }
  return g;
}
// vékonyfalú mintavevő (metszetben félbevágva): éles, kúposra köszörült vágóél, fej szellőzőszeleppel; origó: a vágóél alja
function buildTube() {
  const g = new THREE.Group(); const mk = (c, o) => new THREE.MeshStandardMaterial({ color: c, side: THREE.DoubleSide, ...o }); const sh = mk(0xd0d5da, { metalness: 0.8, roughness: 0.22 }), sh2 = mk(0x8a9298, { metalness: 0.6, roughness: 0.4 });
  g.add(mesh(new THREE.CylinderGeometry(TR, TR, TUBE - 0.012, 40, 1, true), sh, 0, 0.012 + (TUBE - 0.012) / 2)); g.add(mesh(new THREE.CylinderGeometry(TRI, TRI, TUBE, 40, 1, true), sh2, 0, TUBE / 2));
  g.add(mesh(new THREE.CylinderGeometry(TR, TRI + 0.0003, 0.012, 40, 1, true), sh, 0, 0.006));             // vágóél (kúpos köszörülés)
  g.add(cyl(0.042, TR + 0.001, 0.2, M(0x5a6168, { metalness: 0.6, roughness: 0.35 }), 0, TUBE + 0.1, 0, 28)); g.add(cyl(0.022, 0.022, 0.06, M(0x2f3439), 0, TUBE + 0.23, 0, 6));
  for (const a of [0.6, 2.4, 4.2]) g.add(cyl(0.0035, 0.0035, 0.004, M(0x111214), Math.cos(a) * 0.043, TUBE + 0.06, Math.sin(a) * 0.043, 8).rotateZ(Math.PI / 2));   // szellőzőfuratok
  for (const y of [0.25, 0.55]) g.add(cyl(0.0025, 0.0025, 0.004, M(0x111214), TR, y, 0, 6).rotateZ(Math.PI / 2));      // rögzítőcsavarok
  const core = new THREE.Group(); g.add(core); g.userData.core = core;
  const bands = [[0, 0.32, 0x6f5a4a], [0.32, 0.335, 0x8a7864], [0.335, 1.0, 0x6a5747]];
  for (const [a, b, c] of bands) core.add(cyl(TRI - 0.0004, TRI - 0.0004, b - a, M(c, { roughness: 0.96 }), 0, (a + b) / 2, 0, 24));
  shadowAll(g); return g;
}
// lezárt mintacsövek ládában (paraffin + kupak, címke; állítva)
function buildCrate() {
  const g = new THREE.Group(); const wood = M(0x9a7448, { roughness: 0.85 }), foam = M(0x2a2d32, { roughness: 0.95 });
  g.add(box(0.62, 0.02, 0.32, wood, 0, 0.01, 0)); for (const z of [-0.16, 0.16]) g.add(box(0.62, 0.42, 0.02, wood, 0, 0.21, z)); for (const x of [-0.31, 0.31]) g.add(box(0.02, 0.42, 0.32, wood, x, 0.21, 0));
  g.add(box(0.58, 0.05, 0.28, foam, 0, 0.045, 0)); g.add(box(0.58, 0.04, 0.28, foam, 0, 0.3, 0).translateY(0));
  const tubes = []; const lbl = (txt) => { const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#fbfaf5'; x.fillRect(0, 0, 256, 128); x.fillStyle = '#111'; x.font = '700 34px Arial'; x.fillText(txt[0], 14, 44); x.font = '600 26px Arial'; x.fillText(txt[1], 14, 84); x.fillStyle = '#c0281e'; x.font = '800 24px Arial'; x.fillText('▲ TETEJE', 14, 116); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
  [['F-3 / M1', '3,75–4,55 m'], ['F-3 / M2', '5,25–6,05 m'], ['F-3 / M3', '6,75–7,55 m']].forEach((L, i) => {
    const t = new THREE.Group(); t.position.set(-0.18 + i * 0.18, 0.03, 0); g.add(t);
    t.add(cyl(TR, TR, 0.9, M(0xb7bcc1, { metalness: 0.7, roughness: 0.3 }), 0, 0.45, 0, 32));
    t.add(cyl(TR + 0.004, TR + 0.004, 0.05, M(0xc8281e, { roughness: 0.5 }), 0, 0.905, 0, 32)); t.add(cyl(TR + 0.004, TR + 0.004, 0.012, M(0xa8231a, { roughness: 0.5 }), 0, 0.932, 0, 32));   // kupak
    const lb = new THREE.Mesh(new THREE.CylinderGeometry(TR + 0.0008, TR + 0.0008, 0.08, 32, 1, true, -0.9, 1.8), new THREE.MeshStandardMaterial({ map: lbl(L), roughness: 0.6 })); lb.position.y = 0.72; t.add(lb); tubes.push(t); });
  // a paraffin a cső végén (metszetben látszik a felső végen): vörös viaszréteg a minta fölött
  shadowAll(g); g.userData.tubes = tubes; return g;
}

export function buildField(R) {
  const F = {}; const T = R.T;
  const soil = buildSoil(T, LAYERS); R.scene.add(soil.back, soil.front); F.soil = soil;
  F.grains = buildGrains({ N: 22000, x0: -5, x1: 7, y0: -0.05, y1: -7, layers: LAYERS, seed: 111 }); R.scene.add(F.grains);
  { const a = F.grains.geometry.attributes.size; for (let i = 0; i < a.count; i++) a.array[i] *= 1.5; a.needsUpdate = true; }
  F.truck = buildDrillTruck2({ cab: 0xeeeeea, body: 0x2a5fa8 }); F.truck.position.set(-F.truck.userData.FX, 0, 0); R.scene.add(F.truck);
  for (const l of F.truck.userData.legs) { const len = 1.08; l.tube.scale.y = len; l.tube.position.y = -len / 2; l.pad.position.y = -len + 0.025; }
  F.segs = []; for (let k = 0; k < 3; k++) { const s = hollowSeg(k === 0); R.scene.add(s); F.segs.push(s); }
  { const st = M(0x6f777e, { metalness: 0.6, roughness: 0.38 }); F.cutF = new THREE.Group(); for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(RT - RI, 1).translate(0, 0.5, 0), st); p.position.set(s * (RT + RI) / 2, 0, 0.0005); F.cutF.add(p); } R.scene.add(F.cutF); }
  // a menetek közti talaj a metszeten (álló csőspirál)
  { const HSn = 400, w = HB - RT; const pos = [], col = [], idx = [], c = new THREE.Color();
    for (const sg of [-1, 1]) { const base = pos.length / 3; for (let i = 0; i <= HSn; i++) { const y = -i / 100; for (let j = 0; j <= 3; j++) { const x = sg * (RT + w * j / 3); pos.push(x, y, 0.0008); soilColorAt(-y, c); const f = 0.52 + 0.2 * ((Math.sin(i * 12.9898 + j * 78.233 + sg) * 43758.5453 % 1 + 1) % 1); col.push(c.r * f, c.g * f, c.b * f); } }
      for (let i = 0; i < HSn; i++) for (let j = 0; j < 3; j++) { const a = base + i * 4 + j, b = a + 4; idx.push(a, b, a + 1, a + 1, b, b + 1); } }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    F.band = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.98, side: THREE.DoubleSide })); F.band.receiveShadow = true; R.scene.add(F.band); }
  F.adapt = cyl(0.04, 0.04, 0.12, M(0x3a3f45, { metalness: 0.5, roughness: 0.4 }), 0, 0, 0, 6); R.scene.add(F.adapt);
  F.tube = buildTube(); R.scene.add(F.tube);
  F.sRod = cyl(0.022, 0.022, 1, M(0x8f979e, { metalness: 0.7, roughness: 0.3 }), 0, 0, 0, 12); R.scene.add(F.sRod);
  const wm = () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide });
  { const W = halfWall(HB, 7, 100, 18, soilColorAt); F.wallB = new THREE.Mesh(W.geo, wm()); F.wallB.userData = W; R.scene.add(F.wallB); }
  { const W = halfWall(TR + 0.001, 7, 100, 14, soilColorAt); F.wallX = new THREE.Mesh(W.geo, wm()); F.wallX.userData = W; R.scene.add(F.wallX); }
  { const pts = [[HB, 0], [HB + 0.01, 0.03], [0.24, 0.07], [0.42, 0.04], [0.6, 0]].map(([a, b]) => new THREE.Vector2(a, b)); F.spoil = new THREE.Mesh(new THREE.LatheGeometry(pts, 40), M(0x6a5a4a, { roughness: 0.98 })); F.spoil.receiveShadow = true; F.spoil.scale.set(1, 1.4, 1); R.scene.add(F.spoil); }
  F.crate = buildCrate(); F.crate.position.set(-1.6, 0, 1.9); F.crate.rotation.y = 0.25; R.scene.add(F.crate);
  F.wT = buildWorker({ vest: 0x1f8f8a, stance: 0 }); R.scene.add(F.wT);
  F.wH = buildWorker({ vest: 0xff7a00, helmet: 0xf4f4f0, stance: 0 }); R.scene.add(F.wH);
  F.shovel = buildShovel(); R.scene.add(F.shovel);
  return F;
}
function reachW(w, pts, extra = {}) { w.updateWorldMatrix(true, false); const r = { ...extra }; for (const k of ['L', 'R']) if (pts[k]) { const p = pts[k]; r[k] = { palm: p.palm, contact: p.contact, axis: p.axis, axisPt: p.axisPt, radius: p.radius, gap: p.gap, ftilt: p.ftilt, local: w.worldToLocal(p.p.clone()), fdir: p.fdir, ldir: p.ldir, curl: p.curl, w: p.w, pole: p.pole ?? POLE[k] }; } w.userData.reach = r; }

export function updateField(F, t, shot, R) {
  const on = shot.mode === 'section' || shot.mode === 'surface';
  const vis = (o, v) => { if (o) o.visible = v; };
  [F.soil.back, F.soil.front, F.truck, F.cutF, F.band, F.adapt, F.tube, F.sRod, F.wallB, F.wallX, F.spoil, F.crate, F.wT, F.wH, F.shovel, ...F.segs].forEach(o => vis(o, on));
  F.grains.visible = false; if (!on) return null;
  const section = shot.mode === 'section';
  F.soil.front.visible = !section; F.soil.back.visible = true;
  GU.uCut.value = section ? 1 : 0; SU.uX.value = section ? (shot.sx ?? 0.25) : 0; SU.uGW.value = GW;
  const clip = section ? [CLIP] : []; if (F.lastClip !== section) { for (const m of CLIPM) { m.clippingPlanes = clip; m.needsUpdate = true; } F.lastClip = section; }
  const holeD = DS + 0.075; SU.uHoleR.value = HB; SU.uHoleTop.value = 0; SU.uHoleBot.value = -holeD; SU.uHoleX.value = 0;
  F.wallB.userData.setRows(F.wallB, 0, section ? holeD : 0);
  const sp = TL.sampler(t), ext = clamp(-DS - sp.y, 0, 0.8);
  if (ext > 0.003) { SU.uRect.value.set(-TR - 0.001, TR + 0.001, -DS - ext, -DS - 0.07); F.wallX.visible = true; F.wallX.userData.setRows(F.wallX, DS + 0.07, section ? DS + ext : 0); }
  else if (sp.core > 0.01 && t > tb(15)) { SU.uRect.value.set(-TR - 0.001, TR + 0.001, -DS - 0.8, -DS - 0.07); F.wallX.visible = true; F.wallX.userData.setRows(F.wallX, DS + 0.07, section ? DS + 0.8 : 0); }
  else { SU.uRect.value.set(0, 0, 0, 0); F.wallX.visible = false; }
  SU.uRectZ.value.set(-20, 0);
  const tipY = -DS, n = 3; F.segs.forEach((sg, k) => { sg.position.set(0, tipY + k * SEG, 0); sg.rotation.y = 0; const D0 = DS - k * SEG; const L = clamp(D0, 0, SEG); if (L > 0.005) sg.userData.setFill(L, (s, out) => soilColorAt(D0 - s, out)); else sg.userData.setFill(0, null); });
  F.cutF.visible = section; F.cutF.position.y = tipY; F.cutF.scale.y = n * SEG;
  F.band.visible = section; F.band.geometry.setDrawRange(0, Math.min(400, Math.round(DS * 100)) * 36);
  F.spoil.visible = !section || R.camera.position.y > 0.3;
  // forgatófej → rudazat → mintavevő
  const headY = sp.y + SL + SR; const mu = F.truck.userData; mu.head.position.y = headY - 1.3 + 0.49;
  F.adapt.position.set(0, headY - 0.06, 0);
  F.tube.visible = F.sRod.visible = true; F.tube.position.set(0, sp.y, 0); const cr = F.tube.userData.core; cr.visible = sp.core > 0.01 && (!section || shot.cutTube); cr.scale.y = Math.max(0.01, sp.core);
  { const y0 = sp.y + SL + 0.06, y1 = headY - 0.12; F.sRod.position.set(0, (y0 + y1) / 2, 0); F.sRod.scale.y = Math.max(0.01, y1 - y0); }
  F.crate.visible = !!shot.crate;
  { const cut = !!shot.cutTube; if (F.lastCut !== cut) { F.tube.traverse(o => { if (o.isMesh && o.material && o !== F.tube) { o.material.clippingPlanes = cut ? [CLIP] : []; o.material.needsUpdate = true; } }); F.tube.userData.core.traverse(o => { if (o.isMesh) { o.material.clippingPlanes = []; } }); F.lastCut = cut; } }
  // munkások: kezelő a vezérlőkaroknál; segítő a cső vezetésénél, majd lapáttal pihen
  const showW = !shot.noW;
  { const w = F.wT; w.visible = showW; w.position.set(1.05, 0, 1.86); w.rotation.y = Math.PI; F.truck.updateWorldMatrix(true, true);
    const pn = mu.panel; const busy = t >= tb(10, 2) && t < tb(16, 2);
    if (busy) reachW(w, { L: leverGrip(pn, 3, 'L', w), R: leverGrip(pn, 1, 'R', w) }, { look: 0.15 }); else w.userData.reach = { look: 0.2 }; }
  { const w = F.wH; w.visible = showW; const yTop = -DS + n * SEG;
    const guide = t >= tb(10, 2) && t < tb(12, 1) && sp.y > yTop - 0.35;
    if (guide) { w.position.set(-0.3, 0, 0.25); w.rotation.y = Math.atan2(0.3, -0.25); F.shovel.visible = true; F.shovel.position.set(-0.75, -0.1, 0.95); F.shovel.rotation.set(0, 0.4, 0.06);
      const ry = w.rotation.y, f = V(Math.sin(ry), 0, Math.cos(ry)), rt = V(-f.z, 0, f.x), A = V(0, 1, 0); const sb = sp.y;
      const rAt = (y) => { const u = y - sb; return u < TUBE - 0.01 ? TR : u < TUBE + 0.2 ? lerp(0.042, 0.022, smooth((u - TUBE) / 0.2)) : 0.022; };
      const g = (y, sd) => { const k = smooth(clamp((y - 0.04 - sb) / 0.08, 0, 1)) * (1 - smooth(seg(sb, yTop + 0.05, yTop - 0.3))); const r = rAt(y); return gripRodFront(V(0, y, 0), A, r, f, rt, sd, { curl: r > 0.03 ? 1.05 : 1.25, w: k }); };
      reachW(w, { L: g(yTop + 0.42, 'L'), R: g(yTop + 0.2, 'R') }, { look: 0.4, lean: 0.06 }); }
    else { w.position.set(-0.78, 0, 0.62); w.rotation.y = Math.atan2(0.78, -0.62); const ry = w.rotation.y; const f = V(Math.sin(ry), 0, Math.cos(ry)), s = V(Math.cos(ry), 0, -Math.sin(ry));
      const spp = w.position.clone().addScaledVector(f, 0.2).addScaledVector(s, -0.3); F.shovel.visible = true; F.shovel.position.set(spp.x, -0.1, spp.z); F.shovel.rotation.set(0, ry + Math.PI / 2, 0);
      w.userData.reach = { look: 0.3 }; } }   // a segítő pihen; a lapát a földbe szúrva áll mellette
  F.grains.visible = section && !!shot.grains;
  if (F.grains.visible) updateGrains(F.grains, (x, y, li, out) => {
    if (Math.abs(x) < HB + 0.004 && y > -holeD) { out[1] = -999; return; }
    const e2 = Math.max(ext, t > tb(15) ? 0.8 : 0); if (e2 > 0.005 && Math.abs(x) < TR + 0.006 && y > -DS - e2 - 0.01) { out[1] = -999; return; }
  });
  R.under.intensity = section ? 1.3 : 0;
  return { sp, headY };
}
