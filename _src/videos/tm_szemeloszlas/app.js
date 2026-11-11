// Szemeloszlási vizsgálat – készülékek: tál, szárítószekrény, mosogató + 0,063-as szita, szitasor rázógéppel, szitasor-sorok, mérőhenger aerométerrel
import { THREE, V, BT, TZ, M, cyl, bx, MAT, SOILM, screen, setRod, clamp, lerp, smooth, seg, mulberry32, drawScale, drawOven, drawPC, reachW, techAt, rest, holdV, holdBoth, poseAtPC, carryPath, gripCylinder, palmOn } from '../tm_lab/room.js';
import * as TL from './timeline.js';
const { tb, BEAT } = TL;
export const POS = { oven: -3.3, sink: -2.55, shk: -1.6, rows: [-0.9, -0.68, -0.46, -0.24], scl: 0.15, cyl: 1.0, cyl2: 1.18, pc: 2.75 };
const SR = 0.1, SH = 0.05;                                       // szita Ø 200 mm, magasság 50 mm

function meshTex(ap) { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#7d8288'; g.fillRect(0, 0, 256, 256);
  const n = Math.round(clamp(8 + 40 / Math.sqrt(ap), 8, 128)); g.strokeStyle = '#c9ced3'; g.lineWidth = Math.max(1, 256 / n * 0.35);
  for (let i = 0; i <= n; i++) { const p = i * 256 / n; g.beginPath(); g.moveTo(p, 0); g.lineTo(p, 256); g.moveTo(0, p); g.lineTo(256, p); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
function sieve(ap, pan = false) {
  const G = new THREE.Group(); const ring = new THREE.Mesh(new THREE.CylinderGeometry(SR, SR, SH, 48, 1, true), M(0xc9a85a, { metalness: 0.75, roughness: 0.3, side: THREE.DoubleSide })); ring.position.y = SH / 2; G.add(ring);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(SR, 0.004, 6, 48).rotateX(Math.PI / 2), M(0xc9a85a, { metalness: 0.75, roughness: 0.3 })); lip.position.y = SH; G.add(lip);
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(SR - 0.002, 48).rotateX(-Math.PI / 2), pan ? M(0xb9a46a, { metalness: 0.7, roughness: 0.3 }) : new THREE.MeshStandardMaterial({ map: meshTex(ap), metalness: 0.6, roughness: 0.4 })); mesh.position.y = 0.008; G.add(mesh);
  const soil = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 40), SOILM(ap > 1.5 ? 'dry' : ap > 0.2 ? 'sand' : 'grey', 5 + ap * 10)); soil.visible = false; G.add(soil);
  G.userData = { ap, soil }; G.setSoil = (mass, mound = 0) => { const h = mass > 0 ? 0.002 + mass / 90 * 0.012 : 0; soil.visible = h > 0.0005; soil.scale.set(SR * (0.94 - 0.25 * mound), h + mound * 0.02, SR * (0.94 - 0.25 * mound)); soil.position.y = 0.009 + (h + mound * 0.02) / 2; };
  return G;
}
function bowl(r = 0.075, h = 0.05) { const G = new THREE.Group(); const pts = []; for (let i = 0; i <= 12; i++) { const u = i / 12; pts.push(new THREE.Vector2(r * (0.62 + 0.38 * Math.sin(u * Math.PI / 2)), h * u)); }
  const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 40), new THREE.MeshStandardMaterial({ color: 0xf1efe9, roughness: 0.35, side: THREE.DoubleSide })); m.castShadow = true; G.add(m);
  G.add(cyl(r * 0.62, r * 0.62, 0.004, MAT.porc, 0, 0.002, 0, 32)); const s = cyl(r * 0.86, r * 0.6, h * 0.55, SOILM('dry', 3), 0, h * 0.3, 0, 32); G.add(s); G.userData.soil = s; G.r = r; G.h = h; return G; }

export function board(g) { g.strokeStyle = '#2b4f9e'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(80, 440); g.lineTo(960, 440); g.moveTo(80, 440); g.lineTo(80, 60); g.stroke();
  g.strokeStyle = '#c0281e'; g.beginPath(); g.moveTo(120, 420); g.bezierCurveTo(380, 400, 520, 120, 900, 90); g.stroke(); g.fillStyle = '#2b4f9e'; g.font = 'italic 700 40px Arial'; g.fillText('S %', 30, 70); g.fillText('log d', 860, 490);
  g.fillStyle = '#c0281e'; g.font = 'italic 600 36px Arial'; g.fillText('Cu = d60 / d10', 560, 300); }
export function build(L) {
  const G = L.G, A = L.mats, X = L.app = {};
  L.scl.G.position.x = POS.scl;
  // tál a szárítószekrényben
  X.bowl = bowl(); G.add(X.bowl);
  // 0,063-as szita a mosáshoz (a mosogatónál)
  X.wash = sieve(0.063); G.add(X.wash);
  // rázógép + szitasor
  { const S = new THREE.Group(); S.position.set(POS.shk, BT, -1.12); G.add(S); X.shk = S; bx(-0.2, 0.2, 0, 0.12, -0.18, 0.18, M(0x2f6a9a, { roughness: 0.45 }), S); bx(-0.14, 0.14, 0.12, 0.135, -0.14, 0.14, A.al, S);
    X.shkPanel = screen(S, 0.1, 0.035, 128, 44, -0.08, 0.075, 0.181); S.add(cyl(0.012, 0.012, 0.008, M(0x2fbf4f), 0.06, 0.075, 0.182, 14).rotateX(Math.PI / 2)); X.btn = V(0.06, 0.075, 0.186);
    for (const x of [-0.135, 0.135]) S.add(cyl(0.008, 0.008, 0.62, A.st, x, 0.135 + 0.31, 0, 12));
    X.clamp = new THREE.Group(); S.add(X.clamp); bx(-0.16, 0.16, -0.012, 0.012, -0.02, 0.02, A.al, X.clamp); for (const x of [-0.135, 0.135]) X.clamp.add(cyl(0.02, 0.02, 0.03, M(0x15171a), x, 0.02, 0, 14));
    X.stack = new THREE.Group(); S.add(X.stack); X.stack.position.y = 0.135; X.pan = sieve(0, true); X.stack.add(X.pan); X.pan.position.y = 0;
    X.sv = []; [...TL.SIEVES].reverse().forEach((ap, i) => { const s = sieve(ap); s.position.y = 0.04 + i * SH; X.stack.add(s); X.sv.unshift(s); });
    X.lid = cyl(SR + 0.004, SR + 0.004, 0.02, M(0xc9a85a, { metalness: 0.75, roughness: 0.3 }), 0, 0.04 + 8 * SH + 0.01, 0, 48); X.stack.add(X.lid); X.lidY = 0.04 + 8 * SH + 0.01; }
  // a kirakott szitasor (mérés): 2 × 4
  X.row = TL.SIEVES.map((ap, i) => { const s = sieve(ap); s.position.set(POS.rows[i % 4], BT, i < 4 ? -1.33 : -1.06); G.add(s); s.setSoil(TL.RET[i]); return s; });
  X.held = sieve(0.5); G.add(X.held); X.sclBowl = bowl(0.07, 0.045); G.add(X.sclBowl);
  // hidrometrálás: mérőhenger (1000 cm³), szuszpenzió, dugó, aerométer; mellette vizes henger hőmérővel, diszpergálószer
  { const C = new THREE.Group(); C.position.set(POS.cyl, BT, -1.1); G.add(C); X.cylG = C; X.cyl = new THREE.Group(); C.add(X.cyl); X.cyl.position.y = 0.23;
    const k = X.cyl; const gl = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.44, 40, 1, true), MAT.glass); gl.position.y = -0.23 + 0.235; gl.renderOrder = 12; k.add(gl);
    k.add(cyl(0.055, 0.055, 0.012, M(0xdfe7ea, { transparent: true, opacity: 0.6, roughness: 0.1 }), 0, -0.23 + 0.006, 0, 6));
    X.turb = cyl(0.032, 0.032, 1, new THREE.MeshStandardMaterial({ color: 0x5e4630, transparent: true, opacity: 0.93, roughness: 0.4 }), 0, 0, 0, 32); k.add(X.turb);
    X.clear = cyl(0.032, 0.032, 1, new THREE.MeshStandardMaterial({ color: 0xc9b08a, transparent: true, opacity: 0.35, roughness: 0.1, depthWrite: false }), 0, 0, 0, 32); k.add(X.clear);
    X.sed = cyl(0.032, 0.032, 0.01, SOILM('grey', 4), 0, -0.23 + 0.017, 0, 32); k.add(X.sed);
    for (let i = 0; i < 10; i++) { const m = bx(-0.006, 0.006, -0.0006, 0.0006, -0.0001, 0.0001, M(0x334455), null); m.position.set(0, -0.23 + 0.05 + i * 0.035, 0.0342); k.add(m); }
    X.stop = cyl(0.03, 0.026, 0.03, M(0x2a2d32, { roughness: 0.8 }), 0, 0.235 - 0.23 + 0.0, 0, 20); X.stop.position.y = 0.44 - 0.23 + 0.005; k.add(X.stop);
    X.hyd = new THREE.Group(); C.add(X.hyd); { const glh = new THREE.MeshStandardMaterial({ color: 0xe8f4f8, transparent: true, opacity: 0.55, roughness: 0.05, metalness: 0.1 });
      const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.1, 8, 20), glh); b.position.y = 0.064; X.hyd.add(b); X.hyd.add(cyl(0.0035, 0.0035, 0.17, glh, 0, 0.2, 0, 10)); X.hyd.add(cyl(0.008, 0.008, 0.012, M(0x30302a, { metalness: 0.4 }), 0, 0.016, 0, 12));
      for (let i = 0; i < 14; i++) X.hyd.add(bx(-0.0036, 0.0036, -0.0004, 0.0004, -0.0001, 0.0001, M(0xb02a22), null).translateY(0.13 + i * 0.008).translateZ(0.0036)); }
    const C2 = new THREE.Group(); C2.position.set(POS.cyl2, BT, -1.12); G.add(C2); const g2 = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.44, 40, 1, true), MAT.glass); g2.position.y = 0.235; C2.add(g2); C2.add(cyl(0.055, 0.055, 0.012, M(0xdfe7ea, { transparent: true, opacity: 0.6 }), 0, 0.006, 0, 6)); C2.add(cyl(0.032, 0.032, 0.39, MAT.water, 0, 0.012 + 0.195, 0, 24)); C2.add(cyl(0.003, 0.003, 0.4, M(0xeeeeee, { transparent: true, opacity: 0.7 }), 0.015, 0.3, 0, 8));
    G.add(cyl(0.03, 0.03, 0.12, M(0x2f6fb5, { roughness: 0.4 }), POS.cyl2 + 0.17, BT + 0.06, -1.1, 20)); G.add(cyl(0.012, 0.012, 0.03, M(0xeeeeee), POS.cyl2 + 0.17, BT + 0.135, -1.1, 12)); }
  // por / homok áramlás öntéskor
  X.grains = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0035, 6, 4), M(0xa78c62, { roughness: 0.9 }), 60); G.add(X.grains); X.grains.visible = false;
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(1, 1, 1);
export function update(L, t, shot) {
  const X = L.app, G = L.G, inW = (a, b) => t >= tb(a) && t < tb(b);
  // szárítószekrény ajtó, kijelző
  L.ovenDoor.rotation.y = -1.9 * TL.ovenK(t); drawOven(L.ovenDisp, 105);
  // tál: szekrény → mérleg → (később a szitasor fölé) – a soil a tálban
  { const pOven = V(POS.oven, BT + 0.206, -1.04), pOut = V(POS.oven, BT + 0.004, -0.88), pNear = V(POS.scl + 0.3, BT + 0.004, -0.95), pScl = V(POS.scl, L.scl.panY + 0.004 - BT + BT, -1.06);
    let p; if (t < tb(8, 3)) p = pOven; else if (t < tb(11)) p = carryPath(pOven, pOut, TL.bowlOutK(t), 0.05); else if (t < tb(13)) p = carryPath(pNear, pScl, TL.bowlScaleK(t), 0.08); else p = null;
    X.bowl.rotation.set(0, 0, 0); X.bowl.userData.soil.visible = true;
    if (inW(19, 22)) { // öntés a szitasor tetejére: a tál a felső szita fölött, megdöntve
      const top = V(POS.shk, BT + 0.135 + 0.04 + 8 * SH, -1.12); const k = TL.pourK(t); p = carryPath(V(POS.shk + 0.35, BT + 0.06, -0.9), top.clone().add(V(0.09, 0.07, 0.02)), clamp(k * 1.4), 0.1); X.bowl.rotation.z = 1.9 * TL.tiltK(t); X.bowl.userData.soil.visible = TL.tiltK(t) < 0.75 || t < tb(20, 2); }
    X.bowl.visible = !!p && t >= tb(8); if (p) X.bowl.position.copy(p); }
  drawScale(L.scl.disp, inW(11, 13) && TL.bowlScaleK(t) > 0.98 ? TL.M0 : inW(27, 33) ? TL.RET[Math.min(7, Math.floor(TL.weighI(t)))] : 0);
  // mosás a 0,063-as szitán (13–17)
  { const on = inW(13, 17.5); X.wash.visible = on; L.stream.visible = on && t >= tb(13, 2) && t < tb(16, 3);
    if (on) { const k = TL.washK(t), sw = Math.sin(t * 6) * 0.012 * (k > 0 && k < 1 ? 1 : 0); X.wash.position.set(POS.sink + sw, BT + 0.11, -1.04 + Math.cos(t * 6) * 0.01 * (k > 0 && k < 1 ? 1 : 0)); X.wash.rotation.set(0.06 * Math.sin(t * 6), 0, 0.06 * Math.cos(t * 6)); X.wash.setSoil(lerp(230, 90, smooth(k)));
      if (L.stream.visible) setRod(L.stream, V(L.tapX, L.tapY, L.tapZ + 0.18), V(L.tapX, BT + 0.125, L.tapZ + 0.18)); } }
  // szitasor: öntés után a felső szitán kupac; rázás; fedél + szorító
  { const k = TL.pourK(t); X.sv.forEach((s, i) => s.setSoil(t >= tb(26, 3) ? TL.RET[i] : (i === 0 && t >= tb(20, 2) ? 360 * smooth(seg(t, tb(20, 2), tb(21, 2))) / 4 : 0), i === 0 && t < tb(26, 3) ? 1 : 0));
    const lk = TL.lidK(t); X.lid.visible = t < tb(19) || t >= tb(22); X.lid.position.y = X.lidY + (1 - lk) * 0.12 * (t < tb(23) && t >= tb(22) ? 1 : 0);
    X.clamp.position.y = 0.135 + X.lidY + 0.035 + (t < tb(22, 2) ? 0.08 : 0.08 * (1 - lk));
    const on = TL.shakeOn(t); X.stack.position.x = on ? Math.sin(t * 70) * 0.0025 : 0; X.stack.position.z = on ? Math.cos(t * 55) * 0.002 : 0; X.stack.position.y = 0.135 + (on ? Math.abs(Math.sin(t * 40)) * 0.002 : 0);
    const g = X.shkPanel.g; g.fillStyle = '#0e2418'; g.fillRect(0, 0, 128, 44); g.fillStyle = '#9fe36a'; g.font = '700 26px Arial'; g.textAlign = 'center'; g.fillText(on ? Math.max(0, Math.ceil(10 * (1 - seg(t, tb(23, 2), tb(26, 3))))) + ':00' : '10:00', 64, 32); X.shkPanel.t.needsUpdate = true;
    X.shk.visible = true; X.stack.visible = t < tb(27) || t >= tb(37); }
  // szemcsék öntéskor
  { const on = inW(20, 21.75) && TL.tiltK(t) > 0.6; X.grains.visible = on; if (on) { const b = X.bowl.position, lip = V(b.x - 0.07, b.y + 0.03, b.z), dst = V(POS.shk, BT + 0.135 + 0.04 + 8 * SH + 0.005, -1.12);
      for (let i = 0; i < 60; i++) { const u = ((t * 2.2 + i / 60) % 1); const p = V(lerp(lip.x, dst.x + (i % 7 - 3) * 0.008, u), lerp(lip.y, dst.y, u * u), lerp(lip.z, dst.z, u) + ((i % 5) - 2) * 0.004); _m.compose(p.sub(G.position), _q, _s); X.grains.setMatrixAt(i, _m); } X.grains.instanceMatrix.needsUpdate = true; } }
  // kirakott szitasor és a kézben tartott szita a mérleg fölött
  { const vis = inW(27, 37); const wi = TL.weighI(t), cur = Math.min(7, Math.floor(wi));
    X.row.forEach((s, i) => { s.visible = vis && !(inW(27, 33) && i === cur); s.setSoil(inW(27, 33) && i < cur ? 0 : TL.RET[i]); });
    X.held.visible = inW(27, 33); X.sclBowl.visible = inW(27, 33);
    if (X.held.visible) { const fr = wi - cur, tilt = smooth(clamp((fr - 0.25) / 0.35)) * (1 - smooth(clamp((fr - 0.8) / 0.2))); X.held.position.set(POS.scl + 0.09, L.scl.panY + 0.12, -0.98); X.held.rotation.set(0, 0, 0.55 * tilt); X.held.setSoil(TL.RET[cur] * (1 - smooth(clamp((fr - 0.3) / 0.45)))); X.held.userData.ap = TL.SIEVES[cur];
      X.sclBowl.position.set(POS.scl, L.scl.panY, -1.06); X.sclBowl.userData.soil.scale.y = 0.3 + 0.7 * smooth(clamp((fr - 0.3) / 0.45)); } }
  // hidrometrálás
  { const C = X.cylG, k = X.cyl; const rz = t >= tb(38, 2) && t < tb(40, 2) ? Math.sin(TL.cylShakeK(t) * Math.PI * 6) * 1.1 : 0; k.rotation.set(rz, 0, 0); k.position.y = 0.23 + (rz !== 0 ? 0.06 : 0);
    X.stop.visible = t < tb(40, 3); const u = t < tb(42) ? (t < tb(4) ? 0.35 : 0) : clamp(seg(t, tb(42), tb(47)) * 1.0); const clr = t < tb(8) ? 0.28 : t >= tb(42) ? 0.03 + 0.3 * Math.pow(u, 0.8) : 0.0;
    const top = 0.398, bot = 0.02; const hClr = (top - bot) * clr; X.clear.scale.y = Math.max(0.001, hClr); X.clear.position.y = -0.23 + top - hClr / 2; X.clear.visible = hClr > 0.002;
    X.turb.scale.y = Math.max(0.001, top - bot - hClr); X.turb.position.y = -0.23 + bot + (top - bot - hClr) / 2; X.turb.material.opacity = 0.93 - 0.18 * (t >= tb(42) ? u : t < tb(8) ? 0.4 : 0);
    X.sed.scale.y = 0.4 + 1.6 * (t >= tb(42) ? u : t < tb(8) ? 0.5 : 0);
    const hin = t < tb(8) ? 1 : TL.hydInK(t); X.hyd.visible = t < tb(8) || t >= tb(41); const yF = 0.155 - 0.025 * (t >= tb(42) ? u : 0.3); X.hyd.position.set(0, lerp(0.48, yF, hin), 0); }
  // PC
  drawPC(L.pc.scr, t, 'SZEMELOSZLÁS · EN ISO 17892-4', (g) => { g.strokeStyle = 'rgba(255,255,255,0.3)'; g.lineWidth = 2; g.strokeRect(80, 90, 860, 460); g.strokeStyle = '#F2C14E'; g.lineWidth = 5; g.beginPath(); TL.SIEVES.forEach((d, i) => { const x = 80 + (Math.log10(d) + 3) / 4 * 860, y = 550 - TL.PASS[i] / 100 * 460; if (i) g.lineTo(x, y); else g.moveTo(x, y); }); g.stroke(); });
  techPose(L, t, shot);
  return {};
}

function techPose(L, t, shot) {
  const X = L.app, inW = (a, b) => t >= tb(a) && t < tb(b);
  if (inW(8, 11)) { // szárítószekrény (nyitva): a tál két kézzel ki a polcról, le az asztalra
    const w = techAt(L, POS.oven, -0.42); const c = X.bowl.getWorldPosition(V()).add(V(0, 0.03, 0)); reachW(w, holdBothR(c, 0.078), { look: 0.5, lean: 0.2 }); return; }
  if (inW(11, 13)) { const w = techAt(L, X.bowl.position.x + 0.02, -0.62); const c = X.bowl.getWorldPosition(V()).add(V(0, 0.03, 0)); reachW(w, holdBothR(c, 0.078), { look: 0.5, lean: 0.12 }); return; }
  if (inW(13, 17.5)) { const w = techAt(L, POS.sink, -0.52); const c = X.wash.getWorldPosition(V()).add(V(0, 0.03, 0)); reachW(w, holdBothR(c, SR), { look: 0.55, lean: 0.2 }); return; }
  if (inW(19, 22)) { const w = techAt(L, POS.shk + 0.25, -0.62); const c = X.bowl.getWorldPosition(V()).add(V(0, 0.025, 0)); const ax = V(0, 1, 0).applyEuler(X.bowl.rotation);
    const gR = gripCylinder(c, ax, 0.075, V(-0.6, -0.3, -0.75).normalize(), 'R', { curl: 0.6, palmOff: 0.014 }); gR.pole = V(-0.9, -0.5, -0.2);
    reachW(w, { R: gR, L: rest('L', L.G.localToWorld(V(POS.shk - 0.12, BT + 0.135, -0.98))) }, { look: 0.5, lean: 0.14 }); return; }
  if (inW(22, 23.5)) { const w = techAt(L, POS.shk + 0.05, -0.62); X.shk.updateMatrixWorld(true); const knob = X.clamp.localToWorld(V(0.135, 0.02, 0)), knobL = X.clamp.localToWorld(V(-0.135, 0.02, 0));
    const gR = gripCylinder(knob, V(0, 1, 0), 0.02, V(-0.3, -0.5, -1).normalize(), 'R', { curl: 0.85 }), gL = gripCylinder(knobL, V(0, 1, 0), 0.02, V(0.3, -0.5, -1).normalize(), 'L', { curl: 0.85 }); gR.pole = V(-0.9, -0.5, -0.2); gL.pole = V(0.9, -0.5, -0.2);
    if (t >= tb(23)) { const b = X.shk.localToWorld(X.btn.clone()); const gp = palmOn(b.clone().add(V(0, -0.01, 0.03)), V(0, 0, 1), V(0, 0.2, -1).normalize(), 'R', { curl: 0.5, gap: 0.03 }); gp.pole = V(-0.9, -0.5, -0.2); reachW(w, { R: gp, L: rest('L', L.G.localToWorld(V(POS.shk - 0.12, BT + 0.135, -0.98))) }, { look: 0.4, lean: 0.1 }); return; }
    reachW(w, { L: gL, R: gR }, { look: 0.5, lean: 0.12 }); return; }
  if (inW(27, 33)) { const w = techAt(L, POS.scl + 0.12, -0.52); const c = X.held.getWorldPosition(V()).add(V(0, 0.025, 0)); const ax = V(0, 1, 0).applyEuler(X.held.rotation);
    const gL = gripCylinder(c.clone().add(V(-SR, 0, 0).applyEuler(X.held.rotation)), ax, 0.006, V(1, 0, 0.12).normalize(), 'L', { curl: 0.55, palmOff: 0.012 }), gR = gripCylinder(c.clone().add(V(SR, 0, 0).applyEuler(X.held.rotation)), ax, 0.006, V(-1, 0, 0.12).normalize(), 'R', { curl: 0.55, palmOff: 0.012 });
    gL.contact = c.clone().add(V(-SR, 0, 0).applyEuler(X.held.rotation)); gR.contact = c.clone().add(V(SR, 0, 0).applyEuler(X.held.rotation)); gL.axisPt = gR.axisPt = c.clone(); gL.radius = gR.radius = SR; gL.pole = V(0.9, -0.5, -0.15); gR.pole = V(-0.9, -0.5, -0.15);
    reachW(w, { L: gL, R: gR }, { look: 0.5, lean: 0.14 }); return; }
  if (inW(38, 40.75)) { const w = techAt(L, POS.cyl, -0.62); const k = X.cyl; k.updateMatrixWorld(true); const ax = V(0, 1, 0).applyQuaternion(k.getWorldQuaternion(new THREE.Quaternion()));
    const top = k.localToWorld(V(0, 0.44 - 0.23 + 0.02, 0)); const gR = palmOn(top, ax, V(0, 0, -1).applyQuaternion(k.getWorldQuaternion(new THREE.Quaternion())), 'R', { curl: 0.6, gap: 0.02 }); gR.pole = V(-0.9, -0.5, -0.2);
    const lo = k.localToWorld(V(0, -0.1, 0)); const gL = gripCylinder(lo, ax, 0.034, V(0.3, 0, -1).normalize(), 'L', { curl: 0.7, palmOff: 0.012 }); gL.pole = V(0.9, -0.5, -0.2);
    reachW(w, { L: gL, R: gR }, { look: 0.5, lean: 0.12 }); return; }
  if (inW(40.75, 42)) { const w = techAt(L, POS.cyl + 0.05, -0.62); const st = X.hyd.localToWorld(V(0, 0.27, 0)); const gR = holdV('R', st, 0.004, { curl: 1.2 });
    reachW(w, { R: gR, L: rest('L', L.G.localToWorld(V(POS.cyl - 0.16, BT + 0.004, -0.95))) }, { look: 0.6, lean: 0.12 }); return; }
  poseAtPC(L);
}
function holdBothR(c, r) { const h = holdBoth(c, r); return h; }
