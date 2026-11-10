// Mérési diagramok a 2D rétegre: mélységprofil-panelek, xy-görbék, hőtérképek, színskála
import { clamp, smooth, easeOut, lerp, hash, fmt, up } from './util.js';
import { C, FH, FB } from './overlay.js';
export const PC = { qc: '#F0A33A', fs: '#62D394', u: '#5CC2F2', rf: '#E58BF0', grid: 'rgba(255,255,255,0.10)', axis: 'rgba(255,255,255,0.55)', bg: 'rgba(9,11,14,0.84)' };

// mélység szerint mintavett adat: arr[i] = érték i*step mélységben
export function sampleProfile(fn, dmax, step = 0.02, seed = 1, noise = 0) {
  const n = Math.ceil(dmax / step) + 1, a = new Float32Array(n);
  for (let i = 0; i < n; i++) { const d = i * step; const nz = noise ? (hash(i, seed) - 0.5) * 2 * noise + (hash(Math.floor(i / 4), seed + 9) - 0.5) * noise : 0; a[i] = fn(d) * (1 + nz); }
  return { a, step, dmax, at: (d) => { const i = clamp(d / step, 0, n - 1); const i0 = Math.floor(i), i1 = Math.min(n - 1, i0 + 1); return lerp(a[i0], a[i1], i - i0); } };
}

// panels: [{title, unit, max, ticks, color, prof, ref:(d)=>v, w, fmtv}]
export function depthPanels(O, x, y, h, panels, dmax, dNow, a, { dstep = 2, gap = 14, showVals = true, mark = null, title = null } = {}) {
  if (a <= 0) return; const g = O.g; g.save(); g.globalAlpha = a;
  const W = panels.reduce((s, p) => s + (p.w || 200), 0) + gap * (panels.length - 1) + 64;
  g.fillStyle = PC.bg; O.rr(x, y, W, h, 16); g.fill();
  const top = y + (title ? 108 : 80), bot = y + h - (showVals ? 86 : 44), H = bot - top;
  if (title) { O.font(26, 800, FH); g.fillStyle = C.white; g.textAlign = 'left'; g.fillText(title, x + 22, y + 36); }
  const dy = (d) => top + (d / dmax) * H;
  // mélység-tengely
  O.font(18, 700, FH); g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillStyle = PC.axis;
  for (let d = 0; d <= dmax + 1e-6; d += dstep) g.fillText((d ? '−' : '') + String(d).replace('.', ','), x + 50, dy(d));
  g.save(); g.translate(x + 16, top + H / 2); g.rotate(-Math.PI / 2); g.textAlign = 'center'; g.fillText('MÉLYSÉG [m]', 0, 0); g.restore();
  let px = x + 60;
  for (const p of panels) {
    const w = p.w || 200, sx = (v) => px + clamp(v / p.max, 0, 1.04) * w;
    // fejléc
    g.textBaseline = 'alphabetic'; g.textAlign = 'left';
    O.font(22, 800, FH); g.fillStyle = p.color; g.fillText(up(p.title), px, top - 34 + (title ? 0 : 0));
    O.font(17, 600, FB); g.fillStyle = PC.axis; g.fillText(p.unit, px, top - 12);
    // rács
    g.strokeStyle = PC.grid; g.lineWidth = 1;
    for (let d = 0; d <= dmax + 1e-6; d += dstep) { g.beginPath(); g.moveTo(px, dy(d)); g.lineTo(px + w, dy(d)); g.stroke(); }
    for (const tv of p.ticks) { g.beginPath(); g.moveTo(sx(tv), top); g.lineTo(sx(tv), bot); g.stroke(); }
    g.strokeStyle = PC.axis; g.beginPath(); g.moveTo(px, top); g.lineTo(px, bot); g.lineTo(px + w, bot); g.stroke();
    O.font(16, 700, FH); g.fillStyle = PC.axis; g.textAlign = 'center'; g.textBaseline = 'top';
    for (const tv of p.ticks) g.fillText(String(tv).replace('.', ','), sx(tv), bot + 6);
    // referencia (pl. hidrosztatikus)
    if (p.ref) { g.strokeStyle = 'rgba(255,255,255,0.45)'; g.setLineDash([6, 6]); g.lineWidth = 1.5; g.beginPath(); let first = true; for (let d = 0; d <= dmax; d += 0.1) { const v = p.ref(d); if (v === null) { first = true; continue; } const X = sx(v), Y = dy(d); if (first) { g.moveTo(X, Y); first = false; } else g.lineTo(X, Y); } g.stroke(); g.setLineDash([]); }
    // görbe
    const dn = clamp(dNow, 0, dmax);
    if (dn > 0.01) {
      g.save(); g.beginPath(); g.rect(px - 2, top - 2, w + 14, H + 4); g.clip();
      g.strokeStyle = p.color; g.lineWidth = 3; g.lineJoin = 'round'; g.shadowColor = p.color; g.shadowBlur = 8;
      g.beginPath(); const st = p.prof.step;
      for (let d = 0; d <= dn; d += st) { const X = sx(p.prof.at(d)), Y = dy(d); if (d === 0) g.moveTo(X, Y); else g.lineTo(X, Y); }
      g.lineTo(sx(p.prof.at(dn)), dy(dn)); g.stroke(); g.restore();
      // fej
      const hx = sx(p.prof.at(dn)), hy = dy(dn);
      g.fillStyle = p.color; g.beginPath(); g.arc(hx, hy, 7, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(hx, hy, 3, 0, 7); g.fill();
    }
    if (showVals) {
      const v = dn > 0.01 ? p.prof.at(dn) : 0; O.font(38, 800, FH); g.fillStyle = C.white; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      const s = (p.fmtv ? p.fmtv(v) : fmt(v, 1)); g.fillText(s, px, y + h - 30); const sw = g.measureText(s).width;
      O.font(20, 700, FH); g.fillStyle = p.color; g.fillText(p.vu || '', px + sw + 6, y + h - 30);
    }
    p._x = px; p._w = w; px += w + gap;
  }
  // kiemelt mélység (pl. vékony puha réteg)
  if (mark && mark.a > 0) {
    g.globalAlpha = a * mark.a; g.fillStyle = 'rgba(239,90,67,0.18)'; const y0 = dy(mark.d0), y1 = dy(mark.d1);
    g.fillRect(x + 56, y0, W - 70, y1 - y0); g.strokeStyle = C.red; g.lineWidth = 2; g.setLineDash([8, 6]); g.strokeRect(x + 56, y0, W - 70, y1 - y0); g.setLineDash([]);
    if (mark.text) { O.font(22, 800, FH); g.fillStyle = C.red; g.textAlign = 'right'; g.textBaseline = 'bottom'; g.fillText(up(mark.text), x + W - 18, y0 - 4); }
  }
  g.restore();
  return { W, top, bot, dy };
}

// xy-diagram: series [{pts:[[x,y]], upto:0..1, color, width, dash, fill}], marks [{x,y,text,color}]
export function xyChart(O, x, y, w, h, a, { xmax, ymax, xmin = 0, ymin = 0, xticks = [], yticks = [], xlabel = '', ylabel = '', title = null, flipY = false, bg = true, xfmt = null, yfmt = null } = {}, series = [], marks = []) {
  if (a <= 0) return; const g = O.g; g.save(); g.globalAlpha = a;
  if (bg) { g.fillStyle = PC.bg; O.rr(x, y, w, h, 16); g.fill(); }
  const L = x + 78, R = x + w - 30, T = y + (title ? 70 : 34), B = y + h - 62;
  const sx = (v) => L + (v - xmin) / (xmax - xmin) * (R - L), sy = (v) => flipY ? T + (v - ymin) / (ymax - ymin) * (B - T) : B - (v - ymin) / (ymax - ymin) * (B - T);
  if (title) { O.font(26, 800, FH); g.fillStyle = C.white; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillText(up(title), x + 22, y + 40); }
  g.strokeStyle = PC.grid; g.lineWidth = 1;
  for (const tv of xticks) { g.beginPath(); g.moveTo(sx(tv), T); g.lineTo(sx(tv), B); g.stroke(); }
  for (const tv of yticks) { g.beginPath(); g.moveTo(L, sy(tv)); g.lineTo(R, sy(tv)); g.stroke(); }
  g.strokeStyle = PC.axis; g.lineWidth = 1.5; g.beginPath(); g.moveTo(L, flipY ? B : T); g.lineTo(L, flipY ? T : B); g.moveTo(L, flipY ? T : B); g.lineTo(R, flipY ? T : B); g.stroke();
  O.font(17, 700, FH); g.fillStyle = PC.axis; g.textAlign = 'center'; g.textBaseline = 'top';
  for (const tv of xticks) g.fillText(xfmt ? xfmt(tv) : String(tv).replace('.', ','), sx(tv), (flipY ? T - 24 : B + 6));
  g.textAlign = 'right'; g.textBaseline = 'middle';
  for (const tv of yticks) g.fillText(yfmt ? yfmt(tv) : String(tv).replace('.', ','), L - 8, sy(tv));
  O.font(19, 700, FH); g.fillStyle = 'rgba(255,255,255,0.8)'; g.textAlign = 'right'; g.textBaseline = 'alphabetic'; g.fillText(xlabel, R, flipY ? T - 30 : B + 46);
  g.save(); g.translate(x + 22, (T + B) / 2); g.rotate(-Math.PI / 2); g.textAlign = 'center'; g.fillText(ylabel, 0, 0); g.restore();
  g.save(); g.beginPath(); g.rect(L - 4, T - 10, R - L + 14, B - T + 20); g.clip();
  for (const s of series) {
    const n = s.pts.length; const upto = s.upto ?? 1; const m = upto * (n - 1); if (m <= 0) continue;
    g.strokeStyle = s.color; g.lineWidth = s.width || 3; g.lineJoin = 'round'; g.setLineDash(s.dash || []);
    if (s.glow !== false) { g.shadowColor = s.color; g.shadowBlur = 8; }
    g.beginPath();
    for (let i = 0; i <= Math.floor(m); i++) { const X = sx(s.pts[i][0]), Y = sy(s.pts[i][1]); if (i === 0) g.moveTo(X, Y); else g.lineTo(X, Y); }
    const i0 = Math.floor(m), fr = m - i0; let hx = sx(s.pts[i0][0]), hy = sy(s.pts[i0][1]);
    if (i0 < n - 1 && fr > 0) { hx = sx(lerp(s.pts[i0][0], s.pts[i0 + 1][0], fr)); hy = sy(lerp(s.pts[i0][1], s.pts[i0 + 1][1], fr)); g.lineTo(hx, hy); }
    g.stroke(); g.setLineDash([]); g.shadowBlur = 0;
    if (s.dots) for (let i = 0; i <= Math.floor(m); i++) { g.fillStyle = s.color; g.beginPath(); g.arc(sx(s.pts[i][0]), sy(s.pts[i][1]), s.dots, 0, 7); g.fill(); }
    if (s.head !== false && upto < 1) { g.fillStyle = s.color; g.beginPath(); g.arc(hx, hy, 7, 0, 7); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(hx, hy, 3, 0, 7); g.fill(); }
  }
  g.restore();
  for (const mk of marks) {
    if ((mk.a ?? 1) <= 0) continue; g.globalAlpha = a * (mk.a ?? 1);
    const X = sx(mk.x), Y = sy(mk.y); g.fillStyle = mk.color || C.accent; g.beginPath(); g.arc(X, Y, 8, 0, 7); g.fill();
    if (mk.hline) { g.strokeStyle = mk.color || C.accent; g.setLineDash([6, 6]); g.lineWidth = 2; g.beginPath(); g.moveTo(L, Y); g.lineTo(X, Y); g.stroke(); g.setLineDash([]); }
    if (mk.vline) { g.strokeStyle = mk.color || C.accent; g.setLineDash([6, 6]); g.lineWidth = 2; g.beginPath(); g.moveTo(X, flipY ? T : B); g.lineTo(X, Y); g.stroke(); g.setLineDash([]); }
    if (mk.text) { O.font(mk.size || 24, 800, FH); g.fillStyle = mk.color || C.accent; g.textAlign = mk.align || 'left'; g.textBaseline = 'middle'; g.fillText(mk.text, X + (mk.dx ?? 14), Y + (mk.dy ?? -18)); }
  }
  g.restore();
  return { sx, sy, L, R, T, B };
}

// színskálák
export const CMAP = {
  jet: [[0, [30, 60, 200]], [0.25, [40, 170, 230]], [0.45, [80, 210, 120]], [0.65, [240, 220, 60]], [0.82, [245, 140, 40]], [1, [210, 40, 30]]],
  heat: [[0, [20, 20, 40]], [0.35, [120, 30, 90]], [0.65, [230, 90, 40]], [1, [255, 230, 120]]],
  div: [[0, [40, 90, 210]], [0.5, [240, 240, 240]], [1, [210, 50, 40]]],
  vel: [[0, [110, 60, 140]], [0.3, [60, 110, 200]], [0.55, [60, 190, 170]], [0.8, [230, 210, 70]], [1, [240, 120, 40]]],
};
export function cmap(name, u) {
  const s = CMAP[name]; u = clamp(u, 0, 1);
  for (let i = 0; i < s.length - 1; i++) if (u <= s[i + 1][0]) { const k = (u - s[i][0]) / (s[i + 1][0] - s[i][0]); return s[i][1].map((c, j) => Math.round(lerp(c, s[i + 1][1][j], k))); }
  return s[s.length - 1][1];
}
// rácsadatból kép (offscreen canvas), fn(u,v)→0..1
export function heatCanvas(nx, ny, fn, map = 'jet') {
  const cv = document.createElement('canvas'); cv.width = nx; cv.height = ny; const g = cv.getContext('2d'); const id = g.createImageData(nx, ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const c = cmap(map, fn(i / (nx - 1), j / (ny - 1))); const k = (j * nx + i) * 4; id.data[k] = c[0]; id.data[k + 1] = c[1]; id.data[k + 2] = c[2]; id.data[k + 3] = 255; }
  g.putImageData(id, 0, 0); return cv;
}
export function colorbar(O, x, y, w, h, map, labels, a, title) {
  if (a <= 0) return; const g = O.g; g.save(); g.globalAlpha = a;
  const grd = g.createLinearGradient(x, 0, x + w, 0); for (let i = 0; i <= 10; i++) { const c = cmap(map, i / 10); grd.addColorStop(i / 10, `rgb(${c[0]},${c[1]},${c[2]})`); }
  g.fillStyle = grd; O.rr(x, y, w, h, h / 2); g.fill();
  O.font(16, 700, FH); g.fillStyle = PC.axis; g.textAlign = 'center'; g.textBaseline = 'top';
  labels.forEach((l, i) => g.fillText(l, x + w * i / (labels.length - 1), y + h + 6));
  if (title) { g.textAlign = 'left'; g.textBaseline = 'bottom'; O.font(18, 700, FH); g.fillStyle = 'rgba(255,255,255,0.8)'; g.fillText(title, x, y - 6); }
  g.restore();
}
// panel-keret (sötét doboz) címmel
export function box2(O, x, y, w, h, a, title, color = C.accent) {
  if (a <= 0) return; const g = O.g; g.save(); g.globalAlpha = a; g.fillStyle = PC.bg; O.rr(x, y, w, h, 16); g.fill();
  if (title) { O.font(24, 800, FH); g.fillStyle = color; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillText(up(title), x + 22, y + 38); }
  g.restore();
}
