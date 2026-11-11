// Folyási határ – üveglap péppel, spatula, csésze, ejtőkúp, tégely + mérleg, Casagrande-csésze
import { THREE, V, BT, M, cyl, bx, MAT, SOILM, clamp, lerp, smooth, seg, drawScale, drawOven, drawPC, reachW, techAt, rest, holdV, poseAtPC, carryPath, gripCylinder, palmOn } from '../tm_lab/room.js';
import { glassPlate, pasteLump, spatula, tin, cup, fallCone, casagrande, drawNum } from '../tm_lab/konz.js';
import * as TL from './timeline.js';
const { tb, BEAT } = TL;
export const POS = { plate: -1.4, cone: -0.7, scl: 0.2, cas: 0.75 };
export function board(g) { g.strokeStyle = '#2b4f9e'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(80, 440); g.lineTo(960, 440); g.moveTo(80, 440); g.lineTo(80, 60); g.stroke();
  g.strokeStyle = '#c0281e'; g.beginPath(); g.moveTo(140, 400); g.lineTo(900, 110); g.stroke(); g.setLineDash([12, 10]); g.beginPath(); g.moveTo(520, 440); g.lineTo(520, 255); g.lineTo(80, 255); g.stroke(); g.setLineDash([]);
  g.fillStyle = '#2b4f9e'; g.font = 'italic 700 40px Arial'; g.fillText('w %', 20, 60); g.fillText('lg d', 880, 490); g.fillText('20 mm', 470, 490); g.fillStyle = '#c0281e'; g.fillText('wL', 100, 240); }

export function build(L) {
  const G = L.G, X = L.app = {}; L.scl.G.position.x = POS.scl;
  X.plate = glassPlate(G, POS.plate, -1.0); X.lump = pasteLump(X.plate); X.lump.position.set(0, 0.012, 0);
  X.sp = spatula(G); X.sp2 = spatula(G); X.sp2.position.set(POS.plate + 0.12, BT + 0.006, -0.88); X.sp2.rotation.set(0, -1.3, 0);
  X.fill = cup(G); X.fill.position.set(POS.plate - 0.1, BT + 0.006, -0.92);
  X.fc = fallCone(G, POS.cone, -1.12);
  X.tin = tin(G, POS.cone + 0.3, -0.95); X.tins = [tin(G, POS.scl + 0.25, -1.25), tin(G, POS.scl + 0.33, -1.25), tin(G, POS.scl + 0.41, -1.25)];
  X.cas = casagrande(G, POS.cas, -1.05);
  X.grooveTool = bx(-0.003, 0.003, 0, 0.002, -0.05, 0.05, M(0xdfe3e6, { metalness: 0.9, roughness: 0.15 }), G); X.grooveTool.visible = false;
}

export function update(L, t, shot) {
  const X = L.app, inW = (a, b) => t >= tb(a) && t < tb(b);
  drawOven(L.ovenDisp, 105);
  // keverés az üveglapon (8–12, 28–30): a spatula a pépen ide-oda
  const mixing = inW(8, 12) || inW(28, 30);
  { const u = t * 4.2; const base = X.plate.position; if (mixing) { X.sp.visible = true; X.sp.position.set(base.x + Math.sin(u) * 0.05, BT + 0.02 + 0.006, base.z + Math.cos(u * 0.5) * 0.02); X.sp.rotation.set(0, -Math.PI / 2 + Math.sin(u) * 0.3, 0.38); }
    else if (inW(12, 15)) { const c = X.fill.position; X.sp.visible = true; const k = TL.fillK(t); X.sp.position.set(c.x + Math.sin(t * 5) * 0.012, BT + 0.006 + 0.045 + 0.01 * Math.sin(t * 7), c.z + 0.005); X.sp.rotation.set(0, -Math.PI / 2, 0.42); }
    else X.sp.visible = false;
    X.lump.scale.set(0.07 + 0.01 * Math.sin(t * 2.1), mixing ? 0.016 + 0.004 * Math.abs(Math.sin(t * 4.2)) : 0.018, 0.055 - 0.006 * Math.sin(t * 2.1)); X.lump.visible = t < tb(15) || inW(28, 30); }
  // kitöltött csésze (12–15)
  { X.fill.visible = t >= tb(8) && t < tb(15); const k = TL.fillK(t); X.fill.paste.scale.y = Math.max(0.05, t < tb(12) ? 0.05 : k); X.fill.paste.position.y = 0.0015 + 0.0185 * Math.max(0.05, t < tb(12) ? 0.05 : k); }
  // ejtőkúp: a kúp csúcsa a felszínen (lowerK), elengedés (dropK) – behatolás; ismétlések (22–25), további víztartalmak (30–32)
  { const F = X.fc; const surf = F.tipRest; let tip = surf + 0.06, depth = 0, crater = false, disp = '0,00';
    if (t < tb(8)) { const k = smooth(seg(t, tb(1.5), tb(1.75))); tip = surf - 0.0156 * k; depth = 15.6 * k; crater = false; disp = (15.6 * k).toFixed(2).replace('.', ','); }
    else if (t < tb(15)) { tip = surf + 0.06; }
    else if (t < tb(19)) { tip = surf + 0.06 * (1 - TL.lowerK(t)); disp = '0,00'; }
    else if (t < tb(22)) { const k = TL.dropK(t); tip = surf - 0.0156 * k; disp = (15.6 * k).toFixed(2).replace('.', ','); }
    else if (t < tb(25)) { const i = TL.repI(t), fr = (seg(t, tb(22), tb(25)) * 3) % 1, v = TL.REP[i]; const k = smooth(clamp((fr - 0.35) / 0.08)); tip = surf + (fr < 0.35 ? 0.03 * (1 - smooth(fr / 0.3)) : -v / 1000 * k); disp = (fr < 0.35 ? 0 : v * k).toFixed(2).replace('.', ','); crater = fr > 0.36; }
    else if (inW(30, 32)) { const i = clamp(Math.floor(seg(t, tb(30), tb(32)) * 3), 0, 2), fr = (seg(t, tb(30), tb(32)) * 3) % 1, v = TL.CONE[i + 1][0]; const k = smooth(clamp((fr - 0.3) / 0.08)); tip = surf + (fr < 0.3 ? 0.03 * (1 - smooth(fr / 0.25)) : -v / 1000 * k); disp = (fr < 0.3 ? 0 : v * k).toFixed(2).replace('.', ','); }
    else { tip = surf - 0.0156; disp = '15,60'; }
    F.cone.position.y = tip; F.arm.position.y = 0.3 + (tip - surf) * 0.0; drawNum(F.disp, disp + ' mm'); F.cup.crater.visible = crater && !(tip < surf - 0.001); F.cup.visible = t < tb(8) || t >= tb(15); }
  // víztartalom: tégely a kráterből a mérlegre (25–28)
  { const a = V(POS.cone + 0.3, BT, -0.95), b = V(POS.scl, L.scl.panY, -1.06); const k = smooth(seg(t, tb(26), tb(27))); X.tin.position.copy(t < tb(26) ? a : carryPath(a, b, k, 0.08)); X.tin.soil.visible = t >= tb(25, 2);
    X.tin.visible = t >= tb(8) && t < tb(28); drawScale(L.scl.disp, inW(27, 28) ? 24.83 : 0, 2); X.tins.forEach((tt, i) => { tt.soil.visible = true; }); }
  // Casagrande (37–45): barázda, hajtókar, emelés–ejtés, számláló
  { const K = X.cas; const a = TL.crankA(t); K.crank.rotation.x = a; const fr = (a / (Math.PI * 2)) % 1; const lift = t >= tb(39) && t < tb(43) ? (fr < 0.85 ? fr / 0.85 : 0) : 0; K.cupG.rotation.z = -0.17 * lift;
    K.groove.visible = t >= tb(37, 3) || t < tb(4); const gl = smooth(seg(t, tb(37, 2), tb(38, 2))); K.groove.scale.set(1 - 0.85 * smooth(seg(t, tb(42), tb(43))), 1, t < tb(4) ? 1 : Math.max(0.01, gl));
    drawNum(K.disp, String(t >= tb(39) ? TL.blows(t) : 0)); X.grooveTool.visible = inW(37, 38.75);
    if (X.grooveTool.visible) { K.cupG.updateMatrixWorld(true); const p = K.cupG.localToWorld(V(-0.06, 0.006, -0.04 + 0.08 * gl)); X.grooveTool.position.copy(L.G.worldToLocal(p)); } }
  drawPC(L.pc.scr, t, 'FOLYÁSI HATÁR · EN ISO 17892-12', null);
  techPose(L, t, shot);
  return {};
}

function techPose(L, t, shot) {
  const X = L.app, inW = (a, b) => t >= tb(a) && t < tb(b), Lw = (x, y, z) => L.G.localToWorld(V(x, y, z));
  const spGrip = (side = 'R') => { X.sp.updateMatrixWorld(true); const c = X.sp.localToWorld(X.sp.handle.clone()), ax = X.sp.localToWorld(V(1, 0, 0)).sub(X.sp.localToWorld(V(0, 0, 0))).normalize();
    const g = palmOn(c.clone().add(V(0, 0.009, 0)), V(0, 1, 0), ax.clone().negate().setY(0).normalize(), side, { curl: 0.7, gap: 0.012 }); g.pole = side === 'R' ? V(-0.9, -0.5, -0.2) : V(0.9, -0.5, -0.2); return g; };
  if (inW(8, 12) || inW(28, 30)) { const w = techAt(L, POS.plate - 0.06, -0.62); reachW(w, { R: spGrip(), L: rest('L', Lw(POS.plate - 0.2, BT + 0.007, -0.93), V(0.3, 0, -1)) }, { look: 0.55, lean: 0.15 }); return; }
  if (inW(12, 15)) { const w = techAt(L, POS.plate - 0.14, -0.62); const c = X.fill.getWorldPosition(V()).add(V(0, 0.02, 0)); reachW(w, { R: spGrip(), L: holdV('L', c.clone().add(V(0, 0.026, 0)), 0.031, { curl: 0.45 }) }, { look: 0.55, lean: 0.15 }); return; }
  if (inW(15, 22)) { const w = techAt(L, POS.cone - 0.06, -0.62); const F = X.fc; F.updateMatrixWorld(true);
    let gR; if (t < tb(18, 3)) { const k = F.arm.localToWorld(V(-0.06, 0.052, -0.055)); gR = gripCylinder(k, V(0, 1, 0), 0.008, V(-0.2, -0.4, -1).normalize(), 'R', { curl: 0.6, palmOff: 0.014 }); }
    else { const b = F.localToWorld(F.btn.clone()); gR = palmOn(b.clone().add(V(0.012, 0, 0.0)), V(1, 0, 0), V(0, 0.15, -1).normalize(), 'R', { curl: 0.55, gap: 0.03 }); }
    gR.pole = V(-0.9, -0.5, -0.2); reachW(w, { R: gR, L: rest('L', Lw(POS.cone - 0.2, BT + 0.004, -0.92), V(0.3, 0, -1)) }, { look: 0.5, lean: 0.1 }); return; }
  if (inW(25.5, 28)) { const w = techAt(L, Math.min(X.tin.position.x, POS.scl - 0.1) - 0.14, -0.62); if (t >= tb(27)) { reachW(w, {}, { look: 0.45, lean: 0.06 }); return; } const c = X.tin.getWorldPosition(V()).add(V(0, 0.022, 0)); const gR = palmOn(c, V(0, 1, 0), V(-0.1, 0, -1).normalize(), 'R', { curl: 0.4, gap: 0.014 }); gR.pole = V(-0.9, -0.5, -0.3); reachW(w, { R: gR }, { look: 0.5, lean: 0.12 }); return; }
  if (inW(37, 43)) { const w = techAt(L, POS.cas + 0.12, -0.62); const K = X.cas; K.updateMatrixWorld(true);
    if (t < tb(38, 3)) { const c = X.grooveTool.getWorldPosition(V()).add(V(0, 0.02, 0)); const gR = gripCylinder(c, V(0, 1, 0), 0.004, V(-0.2, -0.4, -1).normalize(), 'R', { curl: 1.2, palmOff: 0.012 }); gR.pole = V(-0.9, -0.5, -0.2);
      reachW(w, { R: gR, L: rest('L', K.localToWorld(V(-0.05, 0.05, 0.04)), V(0.2, 0, -1)) }, { look: 0.6, lean: 0.14 }); return; }
    const kn = K.knob.getWorldPosition(V()); const gR = gripCylinder(kn, V(1, 0, 0), 0.009, V(0, -0.4, -1).normalize(), 'R', { curl: 1.0, palmOff: 0.012 }); gR.pole = V(-0.9, -0.5, -0.2);
    reachW(w, { R: gR, L: rest('L', K.localToWorld(V(-0.05, 0.05, 0.045)), V(0.2, 0, -1)) }, { look: 0.55, lean: 0.12 }); return; }
  poseAtPC(L);
}
