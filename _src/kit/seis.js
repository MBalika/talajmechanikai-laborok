// Szeizmikus segédek: hullámfrontok a metszetben, szeizmogram-panel
import { clamp, lerp, hash } from './util.js';
import { C, FH, FB } from './overlay.js';
import { PC, box2 } from './plots.js';
import { wpath } from './geo.js';
export const ricker = (t, f = 0.32) => { const a = Math.PI * f * t; return (1 - 2 * a * a) * Math.exp(-a * a); };
// pontok szakaszokra bontása feltétel szerint
function segs(pts, ok) { const out = []; let cur = []; for (const p of pts) { if (ok(p)) cur.push(p); else { if (cur.length > 1) out.push(cur); cur = []; } } if (cur.length > 1) out.push(cur); return out; }
// kétréteges modell hullámfrontjai τ (ms) időpontban; xs forrás, H rétegvastagság
export function waveFronts(O, proj, tau, xs, H, V1, V2, a, { direct = true, refl = true, trans = true, head = true, lw = 4, cDir = '#ffe066', cRef = '#e58bf0', cHead = C.accent, cTr = '#7fd0ff', xmin = -40, xmax = 40 } = {}) {
  if (a <= 0 || tau <= 0) return; const z = 0.08; const r1 = V1 * tau; const SC = Math.asin(V1 / V2);
  if (direct) { const pts = []; for (let i = 0; i <= 120; i++) { const an = Math.PI + i / 120 * Math.PI; pts.push([xs + Math.cos(an) * r1, Math.sin(an) * r1, z]); }
    segs(pts, p => p[1] >= -H && p[0] > xmin && p[0] < xmax).forEach(s => wpath(O, proj, s, { color: cDir, width: lw, alpha: a, glow: 14 })); }
  if (refl && r1 > H) { const pts = []; for (let i = 0; i <= 120; i++) { const an = i / 120 * Math.PI; pts.push([xs + Math.cos(an) * r1, -2 * H + Math.sin(an) * r1, z]); }
    segs(pts, p => p[1] > -H && p[1] <= 0 && p[0] > xmin && p[0] < xmax).forEach(s => wpath(O, proj, s, { color: cRef, width: lw * 0.7, alpha: a * 0.8, glow: 10 })); }
  if (trans && r1 > H) { for (const sg of [-1, 1]) { const pts = []; for (let i = 0; i <= 60; i++) { const th1 = i / 60 * SC * 0.999; const tq = H / (V1 * Math.cos(th1)); if (tau < tq) continue; const th2 = Math.asin(Math.min(1, Math.sin(th1) * V2 / V1)); const d = V2 * (tau - tq); pts.push([xs + sg * (H * Math.tan(th1) + d * Math.sin(th2)), -H - d * Math.cos(th2), z]); }
      segs(pts, p => p[0] > xmin && p[0] < xmax).forEach(s => wpath(O, proj, s, { color: cTr, width: lw * 0.8, alpha: a * 0.9, glow: 10 })); } }
  if (head) { const tc = H / (V1 * Math.cos(SC)); if (tau > tc) for (const sg of [-1, 1]) { const xc0 = H * Math.tan(SC), xh = xc0 + V2 * (tau - tc); const pts = [];
      for (let i = 0; i <= 50; i++) { const xq = lerp(xc0, xh, i / 50); const tq = tc + (xq - xc0) / V2; const d = V1 * (tau - tq); const py = -H + d * Math.cos(SC); if (py > 0) continue; pts.push([xs + sg * (xq + d * Math.sin(SC)), py, z]); }
      segs(pts, p => p[0] > xmin && p[0] < xmax).forEach(s => wpath(O, proj, s, { color: cHead, width: lw, alpha: a, glow: 14 })); } }
}
// szeizmogram (lövéskép): n csatorna, tr(i, t) amplitúdó; tmax ms; upto ms (rajzolás eddig)
export function gather(O, x, y, w, h, a, { n, tr, tmax = 50, upto = 1e9, title = 'Szeizmogram', picks = null, pickA = 0, pickN = 1e9, gain = 12, xlab = 'geofonok', tstep = 10 } = {}) {
  if (a <= 0) return; const g = O.g; box2(O, x, y, w, h, a, title); g.save(); g.globalAlpha = a;
  const L = x + 64, R = x + w - 24, T = y + 56, B = y + h - 40; const dx = (R - L) / (n - 1);
  g.strokeStyle = PC.grid; g.lineWidth = 1; O.font(15, 700, FH); g.fillStyle = PC.axis; g.textAlign = 'right'; g.textBaseline = 'middle';
  for (let tt = 0; tt <= tmax; tt += tstep) { const yy = T + tt / tmax * (B - T); g.beginPath(); g.moveTo(L - 4, yy); g.lineTo(R, yy); g.stroke(); g.fillText(tt + ' ms', L - 8, yy); }
  g.textAlign = 'center'; g.textBaseline = 'top'; g.fillText(xlab, (L + R) / 2, B + 10);
  const um = Math.min(upto, tmax); const N = 160;
  for (let i = 0; i < n; i++) { const cx = L + i * dx; g.beginPath(); let first = true; const fillPts = [];
    for (let k = 0; k <= N; k++) { const tt = k / N * tmax; if (tt > um) break; const v = clamp(tr(i, tt) * gain, -dx * 1.4, dx * 1.4); const yy = T + tt / tmax * (B - T); if (first) { g.moveTo(cx + v, yy); first = false; } else g.lineTo(cx + v, yy); fillPts.push([cx + Math.max(0, v), yy]); }
    g.strokeStyle = 'rgba(230,236,240,0.85)'; g.lineWidth = 1.3; g.stroke();
    if (fillPts.length > 1) { g.beginPath(); g.moveTo(cx, fillPts[0][1]); fillPts.forEach(p => g.lineTo(p[0], p[1])); g.lineTo(cx, fillPts[fillPts.length - 1][1]); g.closePath(); g.fillStyle = 'rgba(240,163,58,0.75)'; g.fill(); } }
  if (picks && pickA > 0) { g.globalAlpha = a * pickA; for (let i = 0; i < Math.min(n, pickN); i++) { const tt = picks(i); if (tt > um) continue; const yy = T + tt / tmax * (B - T); g.fillStyle = C.red; g.shadowColor = C.red; g.shadowBlur = 8; g.beginPath(); g.arc(L + i * dx, yy, 5, 0, 7); g.fill(); } g.shadowBlur = 0; }
  g.restore(); return { L, R, T, B, dx };
}
