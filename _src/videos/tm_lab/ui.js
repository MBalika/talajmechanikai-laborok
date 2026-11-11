// Talajmechanikai laborok – közös 2D elemek: idő, címkék, fejezet-chip, táblázat, képletkártya, log-tengelyes görbe, óra, szabvány-jelvény, zárókép
import { clamp, lerp, smooth, easeOut, seg, win, fmt, up } from '../../kit/util.js';
import { C, FH, FB } from '../../kit/overlay.js';
import { runCaptions } from '../../kit/hud.js';
import { xyChart, PC } from '../../kit/plots.js';
import { fcard } from '../../kit/x_stab.js';
export { clamp, lerp, smooth, easeOut, seg, win, fmt, up, C, FH, FB, runCaptions, xyChart, PC, fcard };
PC.bg = 'rgba(9,11,14,0.93)';            // a grafikonok mögött ne látsszon át a labor

export function mkTime(BPM, END_BAR) { const BEAT = 60 / BPM, BAR = 4 * BEAT; const tb = (bar, beat = 0) => (bar * 4 + beat) * BEAT; return { BPM, BEAT, BAR, tb, END_BAR, TOTAL: tb(END_BAR) + 2.0 }; }
export const L3 = (O, proj, p, text, a, o) => { if (a <= 0) return; const q = proj(...p); if (q.ok) O.label(q.x, q.y, text, a, o); };
export function chip(O, text, a, color = C.accent, x = 64, y = 54) {
  if (a <= 0) return; const g = O.g; g.save(); g.globalAlpha = a; O.font(28, 800, FH); const w = g.measureText(up(text)).width + 44, h = 50;
  g.fillStyle = color; O.rr(x, y, w, h, 10); g.fill(); g.fillStyle = C.ink; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(up(text), x + 22, y + h / 2 + 1); g.restore();
}
// szabvány-jelvény a jobb felső sarokban
export function badge(O, text, a) { if (a <= 0) return; const g = O.g; g.save(); g.globalAlpha = a * 0.92; O.font(24, 700, FH); const w = g.measureText(text).width + 36;
  g.fillStyle = 'rgba(10,12,14,0.7)'; O.rr(1856 - w, 54, w, 44, 10); g.fill(); g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 1.5; g.stroke(); g.fillStyle = 'rgba(255,255,255,0.85)'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(text, 1856 - w + 18, 77); g.restore(); }
// óra / időkártya (valós idő a gyorsított animáció alatt)
export function clockCard(O, a, k, v, { x = 1406, y = 182, color = C.white } = {}) { if (a <= 0) return; const g = O.g; g.save(); g.globalAlpha = a; g.fillStyle = 'rgba(10,12,14,0.78)'; O.rr(x, y, 450, 64, 12); g.fill();
  O.font(24, 700, FH); g.fillStyle = C.dim; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('⏱  ' + k, x + 22, y + 32); O.font(40, 800, FH); g.fillStyle = color; g.textAlign = 'right'; g.fillText(v, x + 428, y + 34); g.restore(); }
// táblázat: fejléc + sorok, sorok fokozatos megjelenése (n: hány sor látszik, tört is lehet)
export function table(O, x, y, w, head, rows, a, { n = rows.length, title = null, color = C.accent, cols = null, size = 28, rowH = 46, hi = -1 } = {}) {
  if (a <= 0) return 0; const g = O.g; g.save(); g.globalAlpha = a; const nc = head.length, cw = cols || head.map(() => w / nc); const h = (title ? 62 : 18) + rowH * (rows.length + 1) + 16;
  g.fillStyle = 'rgba(10,12,14,0.86)'; O.rr(x, y, w, h, 16); g.fill(); let yy = y + (title ? 50 : 10);
  if (title) { O.font(28, 800, FH); g.fillStyle = color; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillText(up(title), x + 24, y + 42); }
  const cx = (i) => x + 18 + cw.slice(0, i).reduce((s, v) => s + v, 0);
  O.font(size - 4, 700, FH); g.fillStyle = 'rgba(255,255,255,0.6)'; g.textBaseline = 'middle';
  head.forEach((hh, i) => { g.textAlign = i === 0 ? 'left' : 'right'; O.rt(hh, i === 0 ? cx(i) : cx(i + 1) - 24, yy + rowH / 2); });
  g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x + 14, yy + rowH); g.lineTo(x + w - 14, yy + rowH); g.stroke();
  rows.forEach((r, j) => { const k = clamp(n - j); if (k <= 0) return; g.globalAlpha = a * k; const ry = yy + rowH * (j + 1);
    if (j === hi) { g.fillStyle = 'rgba(180,140,255,0.16)'; O.rr(x + 8, ry + 3, w - 16, rowH - 6, 8); g.fill(); }
    r.forEach((v, i) => { O.font(size, i === 0 ? 700 : 600, i === 0 ? FH : FB); g.fillStyle = i === 0 ? C.white : 'rgba(255,255,255,0.92)'; g.textAlign = i === 0 ? 'left' : 'right'; O.rt(String(v), i === 0 ? cx(i) : cx(i + 1) - 24, ry + rowH / 2); }); });
  g.restore(); return h;
}
// képletkártya (indexek: O.rt formátum, pl. 'w_L')
export function formula(O, x, y, lines, a, { title = null, color = C.accent, size = 44, w = null } = {}) {
  if (a <= 0) return; const g = O.g; g.save(); g.globalAlpha = a; O.font(size, 700, FB); const ww = w || Math.max(...lines.map(l => O.rw(l))) + 64; const h = (title ? 58 : 22) + lines.length * size * 1.45 + 18;
  g.fillStyle = 'rgba(10,12,14,0.86)'; O.rr(x, y, ww, h, 16); g.fill(); g.fillStyle = color; O.rr(x, y, 6, h, 3); g.fill();
  if (title) { O.font(26, 800, FH); g.fillStyle = color; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillText(up(title), x + 30, y + 40); }
  O.font(size, 700, FB); g.fillStyle = C.white; g.textAlign = 'left'; g.textBaseline = 'middle';
  lines.forEach((l, i) => O.rt(l, x + 30, y + (title ? 58 : 22) + size * 0.75 + i * size * 1.45)); g.restore();
}
// log-tengelyes x (xs: log10 értékek), feliratok valós értékkel
export const logFmt = (v) => { const r = Math.pow(10, v); return r >= 1 ? String(Math.round(r)) : String(+r.toPrecision(1)).replace('.', ','); };
export function logChart(O, x, y, w, h, a, o, series, marks) { return xyChart(O, x, y, w, h, a, { xfmt: logFmt, ...o }, series, marks); }
// tengelyfeliratok indexes jelöléssel
export function axisLab(O, x, y, w, h, a, xl, yl, { ylBottom = false } = {}) { if (a <= 0) return; const g = O.g; g.save(); g.globalAlpha = a; O.font(20, 700, FH); g.fillStyle = 'rgba(255,255,255,0.85)'; g.textBaseline = 'alphabetic';
  if (xl) { g.textAlign = 'right'; O.rt(xl, x + w - 30, y + h - 14); } if (yl) { g.textAlign = 'left'; O.rt(yl, x + 90, ylBottom ? y + h - 14 : y + 92); } g.restore(); }
// hideg nyitás, címkártya, zárókép
export function openTitle(O, t, B, TOTAL, { q1, q2, title, sub }) {
  O.letterbox(t < B(4) ? 1 - smooth(seg(t, B(3.75), B(4))) : 0, 110); const g = O.g;
  if (t < B(4.1)) { const ga = win(t, B(0.3), B(3.95), 0.3, 0.25); if (ga > 0) { g.save(); g.globalAlpha = ga; const grd = g.createLinearGradient(0, 0, 1300, 0); grd.addColorStop(0, 'rgba(6,7,9,0.8)'); grd.addColorStop(0.75, 'rgba(6,7,9,0.25)'); grd.addColorStop(1, 'rgba(6,7,9,0)'); g.fillStyle = grd; g.fillRect(0, 0, 1920, 1080); g.restore(); }
    O.bigLine(q1, t - B(0.5), win(t, B(0.5), B(3.9), 0.35, 0.3), 450, 100, C.white, { x: 130, align: 'left' });
    if (q2) O.bigLine(q2, t - B(2.2), win(t, B(2.2), B(3.95), 0.3, 0.25), 570, 62, C.accent, { x: 130, align: 'left' }); }
  O.titleCard(t - B(4), win(t, B(4), B(8), 0.05, 0.5), { kicker: 'Talajmechanikai laborok', title, sub });
  if (Math.abs(t - B(4)) < 0.2 && t >= B(4)) O.flash((1 - (t - B(4)) / 0.2) * 0.7);
}
export function endCard(O, t, B, TOTAL, endBar, word, sub, next) { if (t <= B(endBar)) return; const a = win(t, B(endBar), TOTAL + 1, 0.05, 0.1);
  O.fade(0.45 * a, '#000'); O.slam(word, t - B(endBar), a, { y: 450, size: word.length > 11 ? 130 : 160, sub });
  if (next) O.bigLine(next, t - B(endBar + 1), win(t, B(endBar + 1), TOTAL + 1, 0.4, 0.1), 700, 44, C.dim);
  O.fade(smooth(seg(t, TOTAL - 1.2, TOTAL)), '#000'); }
export function finish(O, t, TOTAL, CHAPTERS) { O.vignette(0.38); O.progress(t, TOTAL, CHAPTERS, 0.85); O.grainPass(t, 0.035); }
// kis „ülepedés/szemcse” buborék-ábra helye: kör alakú inset
export function inset(O, x, y, R, a, draw, { title = null, color = C.accent } = {}) { if (a <= 0) return; const g = O.g; g.save(); g.globalAlpha = a;
  g.fillStyle = 'rgba(10,12,14,0.86)'; O.rr(x - R - 16, y - R - (title ? 56 : 16), 2 * R + 32, 2 * R + (title ? 72 : 32), 18); g.fill();
  if (title) { O.font(26, 800, FH); g.fillStyle = color; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillText(up(title), x - R, y - R - 18); }
  g.save(); g.beginPath(); g.rect(x - R, y - R, 2 * R, 2 * R); g.clip(); draw(g, x - R, y - R, 2 * R); g.restore(); g.restore(); }
