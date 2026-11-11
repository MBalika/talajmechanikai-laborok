// Konszolidációs vizsgálat – az ödométer egy lépcsője: tárcsa fel, időmérés, mérőóra
import { THREE, V, BT, clamp, smooth, seg, drawOven, drawPC, reachW, techAt, holdBoth, poseAtPC, carryPath } from '../tm_lab/room.js';
import { oedometer, setOedo } from '../tm_lab/oedo.js';
import * as TL from './timeline.js';
const { tb } = TL;
export const POS = { oed: -1.0, stack: 0.22 };
export function board(g) { g.strokeStyle = '#2b4f9e'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(80, 60); g.lineTo(80, 440); g.lineTo(960, 440); g.stroke();
  g.strokeStyle = '#c0281e'; g.beginPath(); g.moveTo(80, 80); g.bezierCurveTo(300, 100, 380, 380, 900, 410); g.stroke(); g.fillStyle = '#2b4f9e'; g.font = 'italic 700 40px Arial'; g.fillText('s', 30, 80); g.fillText('log t', 840, 490); g.fillStyle = '#c0281e'; g.fillText('cv = T·H² / t', 520, 200); }
const OZ = -1.12;
export function build(L) { const G = L.G, X = L.app = {}; X.O = oedometer(G, POS.oed, OZ); X.cDisc = X.O.discs[3].clone(); G.add(X.cDisc); X.stack = [0, 1, 2].map(i => { const c = X.O.discs[4 + i].clone(); G.add(c); c.position.set(POS.stack, BT + i * 0.022, -1.05); return c; }); }
export function update(L, t, shot) {
  const X = L.app, O = X.O, inW = (a, b) => t >= tb(a) && t < tb(b); drawOven(L.ovenDisp, 105);
  const s0 = 0.70 / 1000; const m = t < tb(4) ? 30 * smooth(seg(t, 0.2, tb(3.8))) : TL.clockMin(t); const s = s0 + (t < tb(10) && t >= tb(4) ? 0 : TL.sOf(Math.max(0.0001, m)) / 1000);
  const carry = inW(8, 10); setOedo(O, { s, nDisc: t >= tb(10) || t < tb(4) ? 4 : 3, water: 1 });
  X.cDisc.visible = carry; if (carry) { O.updateMatrixWorld(true); const hang = L.G.worldToLocal(O.localToWorld(O.hangTop.clone())); X.cDisc.position.copy(carryPath(V(POS.stack, BT + 3 * 0.022, -1.05), hang, smooth(seg(t, tb(8, 1), tb(9, 3))), 0.08)); }
  drawPC(L.pc.scr, t, 'KONSZOLIDÁCIÓ · 100 → 200 kPa', (g) => { g.strokeStyle = '#3FE0C5'; g.lineWidth = 5; g.beginPath(); for (let i = 0; i <= 60; i++) { const tm = 0.1 * Math.pow(14400, i / 60); if (tm > m) break; const x = 80 + i / 60 * 860, y = 110 + TL.sOf(tm) / 0.55 * 420; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); });
  if (carry) { const c = X.cDisc.getWorldPosition(V()).add(V(0, 0.01, 0)); const w = techAt(L, (POS.oed + 0.86 + POS.stack) / 2 + 0.05, -0.62); reachW(w, holdBoth(c, 0.06, { curl: 0.6 }), { look: 0.5, lean: 0.12 }); } else poseAtPC(L);
  return { m };
}
