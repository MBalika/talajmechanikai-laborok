// Triaxiális vizsgálat – 2D grafikák: Mohr-körök, rugós modell (Terzaghi-analógia), pórus-nagyítás, B-mérő,
// a betűk táblázata, „verseny” sávok, eredménykártyák
import { clamp, lerp, smooth, easeOut, easeOutBack, seg, fmt, mulberry32, up } from '../../kit/util.js';
import { C, FH, FB } from '../../kit/overlay.js';
import { PC } from '../../kit/plots.js';
import { COL } from './timeline.js';
const hexA = (h, a) => { const n = parseInt(h.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };
export { hexA };

// ---------- panel ----------
export function panel(O, x, y, w, h, a, title, color = C.accent) {
  if (a <= 0) return; const g = O.g; g.save(); g.globalAlpha = a; g.fillStyle = PC.bg; O.rr(x, y, w, h, 16); g.fill();
  if (title) { O.font(26, 800, FH); g.fillStyle = color; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; O.rt(title.includes('_') ? title : up(title), x + 24, y + 40); }
  g.restore();
}

// ---------- Mohr-diagram (azonos lépték a két tengelyen) ----------
// circles: [{ s3, s1, color, dash, k (0..1 rajzolás), w, fill, label }]; env: { c, phi (fok) | tau, color, k, label }
export function mohr(O, x, y, w, h, a, o, circles = [], envs = []) {
  if (a <= 0) return null; const g = O.g; g.save(); g.globalAlpha = a;
  if (o.bg !== false) { g.fillStyle = PC.bg; O.rr(x, y, w, h, 16); g.fill(); }
  const L = x + 70, R = x + w - 34, T = y + (o.title ? 66 : 30), B = y + h - 56;
  const sc = Math.min((R - L) / (o.smax - (o.smin || 0)), (B - T) / o.tmax);
  const sx = (s) => L + (s - (o.smin || 0)) * sc, sy = (tau) => B - tau * sc;
  if (o.title) { O.font(26, 800, FH); g.fillStyle = o.tc || C.white; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; O.rt(o.title.includes('_') ? o.title : up(o.title), x + 24, y + 42); }
  // rács, tengelyek
  g.strokeStyle = PC.grid; g.lineWidth = 1; O.font(17, 700, FH); g.fillStyle = PC.axis;
  for (let s = 0; s <= o.smax + 1e-6; s += o.sstep) { g.beginPath(); g.moveTo(sx(s), T); g.lineTo(sx(s), B); g.stroke(); g.textAlign = 'center'; g.textBaseline = 'top'; g.fillText(String(s), sx(s), B + 6); }
  for (let tt = 0; tt <= (B - T) / sc + 1e-6; tt += o.sstep) { g.beginPath(); g.moveTo(L, sy(tt)); g.lineTo(R, sy(tt)); g.stroke(); if (tt > 0) { g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillText(String(tt), L - 8, sy(tt)); } }
  g.strokeStyle = PC.axis; g.lineWidth = 1.6; g.beginPath(); g.moveTo(L, T); g.lineTo(L, B); g.lineTo(R, B); g.stroke();
  O.font(20, 700, FH); g.fillStyle = 'rgba(255,255,255,0.85)'; g.textAlign = 'right'; g.textBaseline = 'alphabetic'; O.rt(o.xl || 'σ′ [kPa]', R, B + 46);
  g.textAlign = 'left'; O.rt(o.yl || 'τ [kPa]', L + 8, T + 18);
  g.save(); g.beginPath(); g.rect(L, T - 4, R - L + 4, B - T + 4); g.clip();
  // burkolók
  for (const e of envs) { const k = clamp(e.k ?? 1); if (k <= 0) continue; g.strokeStyle = e.color || C.accent; g.lineWidth = e.w || 4; g.setLineDash(e.dash || []); g.shadowColor = e.color || C.accent; g.shadowBlur = 10;
    const s1 = lerp(0, o.smax, k); g.beginPath();
    if (e.tau !== undefined) { g.moveTo(sx(0), sy(e.tau)); g.lineTo(sx(s1), sy(e.tau)); }
    else { const tg = Math.tan(e.phi * Math.PI / 180); g.moveTo(sx(0), sy(e.c)); g.lineTo(sx(s1), sy(e.c + s1 * tg)); }
    g.stroke(); g.setLineDash([]); g.shadowBlur = 0; }
  // körök
  for (const c of circles) { const k = clamp(c.k ?? 1); if (k <= 0) continue; const cx = (c.s1 + c.s3) / 2, r = (c.s1 - c.s3) / 2;
    g.globalAlpha = a * (c.alpha ?? 1);
    if (c.fill) { g.fillStyle = c.fill; g.beginPath(); g.arc(sx(cx), sy(0), r * sc, Math.PI, Math.PI + Math.PI * k); g.lineTo(sx(cx), sy(0)); g.closePath(); g.fill(); }
    g.strokeStyle = c.color; g.lineWidth = c.w || 3.5; g.setLineDash(c.dash || []); g.beginPath(); g.arc(sx(cx), sy(0), r * sc, Math.PI, Math.PI + Math.PI * k); g.stroke(); g.setLineDash([]);
    if (c.dots) { g.fillStyle = c.color; for (const s of [c.s3, c.s1]) { g.beginPath(); g.arc(sx(s), sy(0), 5, 0, 7); g.fill(); } }
    g.globalAlpha = a; }
  g.restore();
  // feliratok a burkolókon
  for (const e of envs) { if (!e.label || (e.lk ?? 1) <= 0) continue; g.globalAlpha = a * clamp(e.lk ?? 1); const s = e.ls ?? o.smax * 0.62, tau = e.tau !== undefined ? e.tau : e.c + s * Math.tan(e.phi * Math.PI / 180);
    O.font(e.size || 30, 800, FH); g.fillStyle = e.color || C.accent; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; O.rt(e.label, sx(s) + (e.ldx ?? -40), sy(tau) - 16 + (e.ldy ?? 0)); }
  g.globalAlpha = a;
  for (const c of circles) { if (!c.label || (c.lk ?? 1) <= 0) continue; g.globalAlpha = a * clamp(c.lk ?? 1) * (c.alpha ?? 1); const cx = (c.s1 + c.s3) / 2, r = (c.s1 - c.s3) / 2; O.font(c.lsize || 21, 700, FH); g.fillStyle = c.color; g.textAlign = 'center'; g.textBaseline = 'bottom'; O.rt(c.label, sx(cx), sy(r) - 8); }
  g.restore();
  return { sx, sy, sc, L, R, T, B };
}

// ---------- rugós modell (Terzaghi): dugattyú, rugó = szemcseváz, víz = pórusvíz, szelep = drénezés ----------
// st: { load 0..1 (a dugattyúra ható többletteher), valve 0 zárt / 1 nyitott, comp 0..1 (a rugó összenyomódása), u 0..1 (a nyomásmérő), drip 0..1, t }
export function springModel(O, x, y, w, h, a, st, { color = C.accent, title = null, labels = true } = {}) {
  if (a <= 0) return; const g = O.g; g.save(); g.globalAlpha = a;
  g.fillStyle = PC.bg; O.rr(x, y, w, h, 16); g.fill();
  if (title) { O.font(26, 800, FH); g.fillStyle = color; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillText(up(title), x + 24, y + 42); }
  const cx = x + w * 0.33, cw = Math.min(230, w * 0.3), top = y + 120, bot = y + h - 50, ch = bot - top;
  const pist = top + 60 + 60 * (st.comp || 0);                                   // a dugattyú helye
  // víz
  g.fillStyle = 'rgba(92,194,242,' + (0.3 + 0.35 * (st.u || 0)) + ')'; g.fillRect(cx - cw / 2, pist + 14, cw, bot - pist - 14);
  // rugó (cikcakk)
  const n = 7, sy0 = pist + 14, sy1 = bot - 6; g.strokeStyle = '#E8D9B8'; g.lineWidth = 6; g.lineJoin = 'round'; g.beginPath(); g.moveTo(cx, sy0);
  for (let i = 1; i <= n * 2; i++) { const yy = sy0 + (sy1 - sy0) * i / (n * 2 + 1); g.lineTo(cx + (i % 2 ? 1 : -1) * cw * 0.28, yy); } g.lineTo(cx, sy1); g.stroke();
  // henger
  g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 4; g.beginPath(); g.moveTo(cx - cw / 2, top); g.lineTo(cx - cw / 2, bot); g.lineTo(cx + cw / 2, bot); g.lineTo(cx + cw / 2, top); g.stroke();
  // dugattyú + rúd + teher
  g.fillStyle = '#9aa1a8'; g.fillRect(cx - cw / 2 + 4, pist, cw - 8, 14); g.fillRect(cx - 6, pist - 46, 12, 46);
  const ld = st.load || 0; if (ld > 0.01) { O.arrow(cx, pist - 120, cx, pist - 52, ld, C.red, 9, 26); O.font(26, 800, FH); g.fillStyle = C.red; g.textAlign = 'left'; g.textBaseline = 'middle'; O.rt('Δσ', cx + 20, pist - 92); }
  // kifolyócső szeleppel és mérőórával
  const vy = bot - 30, vx = cx + cw / 2; g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 4; g.beginPath(); g.moveTo(vx, vy - 9); g.lineTo(vx + 80, vy - 9); g.moveTo(vx, vy + 9); g.lineTo(vx + 80, vy + 9); g.stroke();
  g.fillStyle = 'rgba(92,194,242,0.6)'; g.fillRect(vx, vy - 7, st.valve ? 80 : 30, 14);
  const vc = st.valve ? C.green : C.red; g.fillStyle = vc; g.beginPath(); g.arc(vx + 40, vy, 15, 0, 7); g.fill(); g.strokeStyle = '#0b0d10'; g.lineWidth = 4; g.beginPath();
  if (st.valve) { g.moveTo(vx + 30, vy); g.lineTo(vx + 50, vy); } else { g.moveTo(vx + 40, vy - 10); g.lineTo(vx + 40, vy + 10); } g.stroke();
  if (st.valve && (st.drip || 0) > 0) { g.fillStyle = 'rgba(92,194,242,0.9)'; for (let k = 0; k < 3; k++) { const ph = ((st.t || 0) * 1.6 + k / 3) % 1; g.beginPath(); g.arc(vx + 88, vy + 6 + ph * 50, 5 * (1 - ph * 0.5), 0, 7); g.fill(); } }
  // mérőóra (u)
  const gx = cx - cw / 2 - 66, gy = vy - 90, gr = 40; g.fillStyle = '#f2f0ea'; g.beginPath(); g.arc(gx, gy, gr, 0, 7); g.fill(); g.strokeStyle = '#333'; g.lineWidth = 2; g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 4; g.beginPath(); g.moveTo(gx + gr, gy + 20); g.lineTo(cx - cw / 2, gy + 20); g.stroke();
  const ang = Math.PI * 0.75 + Math.PI * 1.5 * clamp(st.u || 0); g.strokeStyle = C.red; g.lineWidth = 4; g.beginPath(); g.moveTo(gx, gy); g.lineTo(gx + Math.cos(ang) * gr * 0.8, gy + Math.sin(ang) * gr * 0.8); g.stroke();
  O.font(22, 800, FH); g.fillStyle = C.water; g.textAlign = 'center'; g.textBaseline = 'top'; g.fillText('u', gx, gy + gr + 6);
  if (labels) { // jelmagyarázat jobbra
    const lx = x + w * 0.64, ly = y + 170; O.font(28, 800, FH); g.textAlign = 'left'; g.textBaseline = 'middle';
    const row = (i, c, k, v) => { g.fillStyle = c; g.fillRect(lx, ly + i * 92 - 13, 26, 26); g.fillStyle = C.white; O.rt(k, lx + 40, ly + i * 92 - 2); O.font(24, 600, FB); g.fillStyle = C.dim; O.rt(v, lx + 40, ly + i * 92 + 30); O.font(28, 800, FH); };
    row(0, '#E8D9B8', 'RUGÓ', 'szemcseváz'); row(1, C.water, 'VÍZ', 'pórusvíz'); row(2, vc, 'SZELEP', st.valve ? 'nyitva' : 'zárva'); }
  g.restore();
}

// ---------- pórus-nagyítás: szemcsék, víz, oldódó légbuborékok ----------
const _r = mulberry32(42); const GR = Array.from({ length: 34 }, () => ({ x: _r() * 2 - 1, y: _r() * 2 - 1, r: 0.16 + _r() * 0.12, a: _r() * 6, k: Math.floor(_r() * 3) }));
const BUB = [[0.05, 0.12, 0.13], [-0.45, -0.3, 0.1], [0.5, 0.45, 0.09], [-0.2, 0.62, 0.08], [0.62, -0.38, 0.08]];
export function micro(O, x, y, R, a, st) {
  if (a <= 0) return; const g = O.g; g.save(); g.globalAlpha = a;
  g.beginPath(); g.arc(x, y, R, 0, 7); g.save(); g.clip();
  g.fillStyle = '#1d4f6e'; g.fillRect(x - R, y - R, 2 * R, 2 * R);
  for (const s of GR) { g.fillStyle = ['#8a7560', '#a08a6e', '#76644f'][s.k]; g.beginPath(); for (let i = 0; i < 7; i++) { const an = s.a + i / 7 * Math.PI * 2, rr = s.r * (0.82 + 0.18 * Math.sin(i * 2.3 + s.a)); g.lineTo(x + (s.x + Math.cos(an) * rr) * R * 0.9, y + (s.y + Math.sin(an) * rr) * R * 0.9); } g.closePath(); g.fill(); }
  const k = clamp(st.air ?? 1); for (const [bx, by, br] of BUB) { const rr = br * R * k; if (rr < 1) continue; g.fillStyle = 'rgba(245,250,255,0.92)'; g.beginPath(); g.arc(x + bx * R, y + by * R, rr, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.arc(x + bx * R - rr * 0.3, y + by * R - rr * 0.3, rr * 0.3, 0, 7); g.fill(); }
  g.restore();
  g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 4; g.beginPath(); g.arc(x, y, R, 0, 7); g.stroke();
  if (st.label !== false) { O.font(22, 800, FH); g.textAlign = 'center'; g.textBaseline = 'top'; g.fillStyle = C.white; g.fillText(k > 0.05 ? 'LEVEGŐ' : 'TELÍTETT', x, y + R + 12); }
  g.restore();
}

// ---------- B-mérő ----------
export function bGauge(O, x, y, w, B, a, ok) {
  if (a <= 0) return; const g = O.g; g.save(); g.globalAlpha = a; const h = 150;
  g.fillStyle = PC.bg; O.rr(x, y, w, h, 14); g.fill();
  O.font(30, 800, FH); g.fillStyle = C.white; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; O.rt('B = Δu / Δσ_c', x + 24, y + 44);
  const bx = x + 24, bw = w - 48, by = y + 72, bh = 22; g.fillStyle = 'rgba(255,255,255,0.12)'; O.rr(bx, by, bw, bh, 11); g.fill();
  const u = clamp((B ?? 0)); g.fillStyle = u >= 0.95 ? C.green : C.water; O.rr(bx, by, Math.max(bh, bw * u), bh, 11); g.fill();
  const tx = bx + bw * 0.95; g.strokeStyle = C.white; g.lineWidth = 3; g.beginPath(); g.moveTo(tx, by - 8); g.lineTo(tx, by + bh + 8); g.stroke();
  O.font(20, 700, FH); g.fillStyle = C.dim; g.textAlign = 'center'; g.textBaseline = 'top'; g.fillText('0,95', tx, by + bh + 10);
  if (B !== null && B !== undefined) { O.font(40, 800, FH); g.textAlign = 'right'; g.textBaseline = 'alphabetic'; g.fillStyle = u >= 0.95 ? C.green : C.white; g.fillText(fmt(B, 2) + (u >= 0.95 ? '  ✓' : ''), x + w - 24, y + 46); }
  g.restore();
}

// ---------- a két betű jelentése ----------
export function namesCard(O, x, y, w, a, t, t0, BEAT) {
  if (a <= 0) return; const g = O.g; g.save(); g.globalAlpha = a;
  const rows = [['UU', 'nincs', 'drénezetlen', COL.UU], ['CU', 'van', 'drénezetlen', COL.CU], ['CD', 'van', 'drénezett', COL.CD]];
  const h = 400; g.fillStyle = 'rgba(10,12,14,0.86)'; O.rr(x, y, w, h, 18); g.fill();
  O.font(30, 800, FH); g.fillStyle = C.accent; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillText(up('Mit jelent a két betű?'), x + 30, y + 52);
  const c0 = x + 30, c1 = x + 210, c2 = x + 470, hy = y + 112;
  O.font(24, 700, FH); g.fillStyle = C.dim; g.fillText('1. BETŰ: KONSZOLIDÁCIÓ', c1, hy); g.fillText('2. BETŰ: NYÍRÁS KÖZBEN', c2, hy);
  g.fillStyle = 'rgba(255,255,255,0.15)'; g.fillRect(x + 24, hy + 18, w - 48, 2);
  rows.forEach(([n, k1, k2, col], i) => { const kk = clamp((t - t0 - i * BEAT * 1.6) / 0.35); if (kk <= 0) return; g.globalAlpha = a * smooth(kk); const ry = hy + 82 + i * 82, dx = (1 - easeOut(kk)) * 30;
    g.fillStyle = col; O.rr(c0 + dx, ry - 46, 130, 62, 12); g.fill(); O.font(46, 800, FH); g.fillStyle = C.ink; g.textAlign = 'center'; g.fillText(n, c0 + 65 + dx, ry + 2);
    O.font(36, 700, FH); g.textAlign = 'left'; g.fillStyle = C.white; g.fillText(k1, c1 + dx, ry); g.fillStyle = k2 === 'drénezett' ? C.water : C.white; g.fillText(k2, c2 + dx, ry); });
  g.restore();
}

// ---------- „verseny”: egy próbatest teljes ideje ----------
export function lanes(O, x, y, w, a, t, t0, dur) {
  if (a <= 0) return; const g = O.g; g.save(); g.globalAlpha = a;
  const rows = [['UU', 'kb. fél óra', 0.12, COL.UU], ['CU', '2–3 nap', 0.55, COL.CU], ['CD', '4–7 nap', 1.0, COL.CD]];
  const h = 360; g.fillStyle = 'rgba(10,12,14,0.86)'; O.rr(x, y, w, h, 18); g.fill();
  O.font(30, 800, FH); g.fillStyle = C.accent; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillText(up('Egy próbatest ideje'), x + 30, y + 52);
  const L = x + 150, R = x + w - 40, u = clamp((t - t0) / dur);
  rows.forEach(([n, lab, fin, col], i) => { const ry = y + 120 + i * 82; g.fillStyle = 'rgba(255,255,255,0.1)'; O.rr(L, ry - 8, R - L, 16, 8); g.fill();
    O.font(40, 800, FH); g.fillStyle = col; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(n, x + 34, ry + 2);
    const p = clamp(u / fin), px = L + (R - L) * fin * easeOut(p); g.fillStyle = col; O.rr(L, ry - 8, Math.max(16, px - L), 16, 8); g.fill(); g.beginPath(); g.arc(px, ry, 13, 0, 7); g.fill();
    if (p >= 1) { O.font(26, 700, FB); g.fillStyle = C.white; g.textAlign = fin > 0.6 ? 'right' : 'left'; g.textBaseline = 'bottom'; g.fillText(lab, fin > 0.6 ? px : px + 20, ry - 14); } });
  g.restore();
}

// ---------- fejezet-chip (bal felső sarok) ----------
export function chip(O, text, a, color = C.accent, x = 64, y = 54) {
  if (a <= 0) return; const g = O.g; g.save(); g.globalAlpha = a; O.font(28, 800, FH); const w = g.measureText(up(text)).width + 44, h = 50;
  g.fillStyle = color; O.rr(x, y, w, h, 10); g.fill(); g.fillStyle = C.ink; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(up(text), x + 22, y + h / 2 + 1); g.restore();
}
// ---------- nyomásnyilak a minta körül (2D, a 3D pontokból) ----------
export function pressureArrows(O, proj, c, r, hgt, a, color = C.water, n = 5, len = 70) {
  if (a <= 0) return; const [x, y, z] = c;
  for (let i = 0; i < n; i++) { const yy = y - hgt / 2 + hgt * (i + 0.5) / n;
    for (const s of [-1, 1]) { const p1 = proj(x + s * r, yy, z), p0 = proj(x + s * r * 2.6, yy, z); if (!p1.ok || !p0.ok) continue; const dx = p1.x - p0.x; O.arrow(p1.x - Math.sign(dx) * len, p1.y, p1.x - Math.sign(dx) * 6, p1.y, a, color, 6, 18); } }
  for (const s of [-1, 1]) { const p = proj(x, y + s * (hgt / 2), z); if (!p.ok) continue; O.arrow(p.x, p.y + s * -len - s * 8, p.x, p.y - s * 8, a, color, 6, 18); }
}
