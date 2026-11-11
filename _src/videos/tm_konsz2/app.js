// Konszolidációs vizsgálat – labor: az ödométercella a keretben (elárasztva, kétirányú szűrés), a minta 100 kPa-on konszolidálódott;
// a lépcső: a kar megtámasztása a karemelő hajtókarjával (jobb kéz), a 100 kPa-os tárcsa két kézzel az állványról az akasztóra (guggolva),
// a kar ráengedése és az időmérő egyidejű indítása (bal kéz), leolvasások a mérőórán. A modellek: tm_lab/oedo2.js (a kompressziós videóéval azonos).
import { THREE, V, BT, M, cyl, bx } from '../tm_lab/room.js';
import { Choreo, stdPoses } from '../tm_lab/act.js';
import { powerCyl, rimHold, fingerPress } from '../tm_lab/grips3.js';
import * as O2 from '../tm_lab/oedo2.js';
import * as TL from './timeline.js';
import { tb, JUP, DISC, JDN, TPRESS } from './timeline.js';
import { clamp, smooth, seg } from '../../kit/util.js';
const B = (b) => tb(b);
export const POS = { O: [2.95, -1.02], timer: [3.2, -0.88], stand: [3.94, -1.0] };
export function board(g) { g.strokeStyle = '#2b4f9e'; g.lineWidth = 5; g.beginPath(); g.moveTo(90, 80); g.lineTo(90, 440); g.lineTo(960, 440); g.stroke(); g.fillStyle = '#2b4f9e'; g.font = 'italic 700 40px Arial'; g.fillText('s', 40, 100); g.fillText('log t', 860, 490);
  g.strokeStyle = '#c0281e'; g.beginPath(); g.moveTo(100, 110); g.bezierCurveTo(400, 120, 480, 360, 640, 380); g.lineTo(950, 410); g.stroke(); g.fillStyle = '#c0281e'; g.font = 'italic 600 34px Arial'; g.fillText('t', 440, 300); g.font = 'italic 600 22px Arial'; g.fillText('50', 452, 310); }
let C, X = {};
const FR = O2.FR, PIVY = FR.base + FR.beamY, TIP0 = -0.04, H100 = 0.0193;          // a minta magassága 100 kPa-on (m)
const specTop = (t) => H100 - TL.sAt(t) / 1000;
const BASEY = 0.0206, CELLF = [POS.O[0], BT + 0.034, POS.O[1]];
const ballTopF = (t) => 0.034 + BASEY + specTop(t) + 0.0006 + 0.008 + O2.DIM.capH + 0.0165;
const thetaBall = (t) => Math.asin(clamp((ballTopF(t) - PIVY - TIP0) / 0.08, -0.3, 0.3));
const LOW = PIVY - 0.06, SET = PIVY - 0.014 + 0.46 * 0.06, touch = (t) => PIVY - 0.014 + 0.46 * thetaBall(t) - 0.0005;
function jackUp(t) { if (t < B(JUP[0])) return LOW; if (t < B(JUP[1])) return LOW + (touch(t) - LOW) * smooth(seg(t, B(JUP[0]), B(JUP[1]))); if (t < B(JDN[0])) return touch(t);
  if (t < B(JDN[1])) return touch(t) + (LOW - touch(t)) * smooth(seg(t, B(JDN[0]), B(JDN[1]))); return LOW; }
const theta = (t) => Math.max(thetaBall(t), Math.asin(clamp((jackUp(t) - PIVY + 0.014) / 0.46, -0.3, 0.3)));
const wheelAng = (t) => (jackUp(t) - LOW) / (SET - LOW) * Math.PI * 4;
// ---------------- tárcsák: az akasztón 25 + 25 + 50 kPa, az állványon (alulról) 400, 200, 100 kPa ----------------
const DISCS = [25, 25, 50, 100, 200, 400], DR = { 25: [0.075, 0.0081], 50: [0.08, 0.0143], 100: [0.085, 0.0253], 200: [0.09, 0.045], 400: [0.095, 0.081] }, KG = { 25: 1.13, 50: 2.25, 100: 4.50, 200: 9.01, 400: 18.02 };
const QD = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0));   // a rés hátrafelé nyílik
function hangPoint(t) { const h = V(FR.hang - FR.piv, -0.012, 0).applyAxisAngle(V(0, 0, 1), theta(t)).add(X.fr.beam.position); return V(POS.O[0] + h.x, BT + h.y - FR.rod, POS.O[1]); }
function discPose(i) { return (t) => {
  const onH = (k) => { const hp = hangPoint(t); let y = hp.y; for (let j = 0; j < k; j++) y += X.discs[j].h; return V(hp.x, y, hp.z); };
  const onS = (k) => { const st = X.stand.position; let y = X.stand.top; for (const j of [5, 4, 3]) { if (j === k) break; y += X.discs[j].h; } return V(st.x, y, st.z); };
  if (i < 3) return { p: onH(i), q: QD.clone() };
  if (i > 3 || t < B(DISC[0])) return { p: onS(i), q: QD.clone() };
  const A = onS(3), Bp = (() => { const hp = hangPoint(B(DISC[1])); let y = hp.y; for (let j = 0; j < 3; j++) y += X.discs[j].h; return V(hp.x, y, hp.z); })();
  if (t >= B(DISC[1])) return { p: onH(3), q: QD.clone() };
  const u = (t - B(DISC[0])) / (B(DISC[1]) - B(DISC[0])); const up = Math.max(A.y, Bp.y) + 0.035, pre = V(Bp.x, up, Bp.z + 0.17);
  const k1 = smooth(clamp(u / 0.18)), k2 = smooth(clamp((u - 0.15) / 0.45)), k3 = smooth(clamp((u - 0.6) / 0.22)), k4 = smooth(clamp((u - 0.82) / 0.18));
  const p = V(A.x, A.y + (up - A.y) * k1, A.z); p.lerp(pre, k2); p.lerp(V(Bp.x, up, Bp.z), k3); p.y += (Bp.y - up) * k4; return { p, q: QD.clone() }; }; }

export function build(L, R) {
  stdPoses(); const G = L.G; C = new Choreo(L); X.C = C; L.pc.g.visible = false; L.scl.G.position.set(1.9, BT, -1.05);
  const part = (o, y) => { o.position.set(CELLF[0], CELLF[1] + y, CELLF[2]); G.add(o); return o; };
  X.base = part(O2.cellBase(), 0); X.base.setWater(1); X.stone1 = part(O2.stone(), 0.012); X.paper1 = part(O2.paper(), 0.02);
  X.ring = part(O2.ringWithSpecimen(), BASEY); X.paper2 = O2.paper(); G.add(X.paper2); X.stone2 = O2.stone(); G.add(X.stone2); X.clamp = part(O2.clampRing(), 0.024); X.lcap = O2.loadCap(); G.add(X.lcap);
  X.fr = O2.oedFrame(); X.fr.position.set(POS.O[0], BT, POS.O[1]); G.add(X.fr);
  X.stand = O2.weightStand(); X.stand.position.set(POS.stand[0], 0, POS.stand[1]); G.add(X.stand);
  X.discs = DISCS.map((k, i) => { const d = O2.slotDisc(k, KG[k], DR[k][0], DR[k][1]); G.add(d); C.prop('disc' + i, d, discPose(i)); return d; });
  X.timer = O2.timer(); X.timer.position.set(POS.timer[0], BT, POS.timer[1]); X.timer.rotation.y = -0.3; G.add(X.timer);
  // ---------------- a laboráns ----------------
  const z = -0.6, xs = 3.84, xh = 3.69, zd = -0.66, o = { squat: 0.12 }, d = DISC[1] - DISC[0];
  C.at(0, 3.28, z).at(B(24.2), 3.28, z).at(B(DISC[0] - 0.03), xs, zd, o).at(B(DISC[0] + 0.14 * d), xs, zd, o).at(B(DISC[0] + 0.62 * d), xh, zd, o).at(B(DISC[1] + 0.03), xh, zd, o).at(B(27.15), 3.28, z).at(B(92), 3.28, z);
  // karemelő hajtókarja: a markolat x mentén, elölről, tenyérrel lefelé, hüvelyk a kar felé
  const crankG = (t) => { const a = wheelAng(t); const J = O2.JK; const c = V(POS.O[0] + 0.38 + J.knobX, BT + J.y - J.r * Math.sin(a), POS.O[1] + J.z + J.r * Math.cos(a)); return powerCyl('R', c, V(-1, 0, 0), 0.009, V(0, -1, 0)); };
  C.holdF('R', B(JUP[0] - 0.05), B(JUP[1] + 0.05), null, crankG); C.holdF('R', B(JDN[0] - 0.05), B(JDN[1] + 0.02), null, crankG);
  // tárcsa: két kézzel a két oldalon – hüvelyk a lap tetején, mutató- és középső ujj a paláston
  { const dk = X.discs[3], r = dk.r, h = dk.h - 0.0024; C.hold('L', B(DISC[0] + 0.02), B(DISC[1] - 0.02), 'disc3', rimHold('L', V(0, h, -r), V(0, 0, -1), h, r, V(1, 0, 0)));
    C.hold('R', B(DISC[0] + 0.02), B(DISC[1] - 0.02), 'disc3', rimHold('R', V(0, h, r), V(0, 0, 1), h, r, V(1, 0, 0))); }
  // időmérő gombja (bal kéz), a kar ráengedésével egyszerre
  { const pt = V(POS.timer[0] + 0.028 * Math.cos(0.3), BT + 0.028, POS.timer[1] + 0.028 * Math.sin(0.3)); C.hold('L', B(TPRESS[0]), B(TPRESS[1]), null, fingerPress('L', pt, C.aimLab('L', B(TPRESS[0]), pt))); }
  if (typeof window !== 'undefined') window.__X = X;
}

export function update(L, t, shot) {
  C.update(t);
  const st = specTop(t); X.ring.setSpec(0, st);
  X.paper2.position.set(CELLF[0], CELLF[1] + BASEY + st, CELLF[2]); X.stone2.position.set(CELLF[0], CELLF[1] + BASEY + st + 0.0006, CELLF[2]); X.lcap.position.set(CELLF[0], CELLF[1] + BASEY + st + 0.0086, CELLF[2]);
  const th = theta(t); X.fr.beam.rotation.z = th; const jk = X.fr.jack; const jy = jackUp(t); jk.pad.position.y = jy - 0.003; jk.screw.position.y = jy - 0.066; jk.wheel.rotation.x = wheelAng(t);
  X.fr.updateMatrixWorld(true); X.fr.hanger.position.copy(V(FR.hang - FR.piv, -0.012, 0).applyAxisAngle(V(0, 0, 1), th).add(X.fr.beam.position));
  X.fr.gaugeTipY(0.034 + BASEY + st + 0.0006 + 0.008 + O2.DIM.capH + 0.001);
  const raw = TL.R0 + TL.sAt(t); const k = raw.toFixed(4); if (X._d !== k) { O2.drawDial(X.fr.dial, raw, 0); X._d = k; }
  const m = TL.clockMin(t); let txt = '00:00:00'; if (t < B(4) || t > B(TPRESS[1] - 0.05)) { const s = Math.min(86400, Math.floor(m * 60)); txt = String(Math.floor(s / 3600)).padStart(2, '0') + ':' + String(Math.floor(s / 60) % 60).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }
  if (X._tt !== txt) { O2.drawTimer(X.timer.scr, txt); X._tt = txt; }
  C.apply(t, L.tech, shot && shot.look !== undefined ? { look: shot.look } : {});
  return { X, C, m };
}
export const __X = X;
