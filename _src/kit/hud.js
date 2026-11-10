// Közös 2D elemek: mélységi vonalzó, rétegnevek, sorozat-chipek, feliratlista-futtató
import { win, clamp } from './util.js';
import { C } from './overlay.js';
export const SERIES_MA = ['CFA', 'Csavart cölöpök', 'Franki', 'Fúrt cölöpök', 'Előregyártott', 'Mikrocölöp', 'Jet grouting', 'Mélykeverés', 'Résfal', 'Kútalapozás'];
export const SERIES_TJ = ['Talajcsere', 'Mélytömörítés', 'Dinamikus tömörítés', 'Kavicscölöp', 'Injektálás', 'Tömegstabilizáció', 'Előterhelés'];
export function ruler(O, proj, { x = -1.7, from = 0, to = 14, step = 2, a = 1 } = {}) {
  if (a <= 0) return; const g = O.g; g.save(); g.globalAlpha = a; O.font(20, 700, 'BarlowC, Arial Narrow, sans-serif'); g.textAlign = 'right'; g.textBaseline = 'middle';
  for (let d = from; d <= to + 1e-6; d += step) { const p = proj(x, -d, 0.02); if (!p.ok || p.y < 40 || p.y > 1040) continue; g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(p.x - 64, p.y - 12, 60, 24); g.fillStyle = '#f5f2ea'; const s = (d ? '−' + String(+d.toFixed(1)).replace('.', ',') : '±0'); g.fillText(s + ' m', p.x - 8, p.y + 1); g.fillRect(p.x - 2, p.y - 1, 14, 2); }
  g.restore();
}
export function layerNames(O, proj, layers, { x = 2.4, maxDepth = 14, a = 1, hi = null } = {}) {
  if (a <= 0) return; const g = O.g; g.save(); g.globalAlpha = a; g.textAlign = 'left'; g.textBaseline = 'middle';
  for (const L of layers) { const y = -(L.top + Math.min(L.bottom, maxDepth)) / 2; const p = proj(x, y, 0.02); if (!p.ok || p.y < 60 || p.y > 1000) continue; O.font(22, 700, 'BarlowC, Arial Narrow, sans-serif'); g.fillStyle = hi && hi === L.key ? C.accent : 'rgba(255,255,255,0.8)'; g.shadowColor = 'rgba(0,0,0,0.7)'; g.shadowBlur = 6; g.fillText(L.name.toUpperCase(), p.x, p.y); }
  g.restore();
}
// captions: [[t0, t1, kicker, lines, opts]]
export function runCaptions(O, t, CAPS) { for (const [a0, a1, kick, lines, opts] of CAPS) { const a = win(t, a0, a1, 0.3, 0.35); if (a > 0) O.caption(lines, t - a0, a, { kicker: kick, ...(opts || {}) }); } }
// teherterjedés-trapéz (alaptest alatt) – 3D pontokból
export function spreadWedge(O, proj, { x0, x1, y0, y1, ang = Math.PI / 6, a = 1, label1, label2 }) {
  if (a <= 0) return; const g = O.g; const dx = (y0 - y1) * Math.tan(ang);
  const P = [proj(x0, y0, 0.08), proj(x1, y0, 0.08), proj(x1 + dx, y1, 0.08), proj(x0 - dx, y1, 0.08)]; if (!P.every(p => p.ok)) return;
  g.save(); g.globalAlpha = a; g.fillStyle = 'rgba(240,163,58,0.22)'; g.strokeStyle = C.accent; g.lineWidth = 3; g.setLineDash([10, 7]);
  g.beginPath(); g.moveTo(P[0].x, P[0].y); for (const p of P.slice(1)) g.lineTo(p.x, p.y); g.closePath(); g.fill(); g.stroke(); g.setLineDash([]);
  // nyilak (feszültség)
  const arrows = (pA, pB, n, len) => { for (let i = 0; i <= n; i++) { const u = i / n; const x = pA.x + (pB.x - pA.x) * u, y = pA.y + (pB.y - pA.y) * u; O.arrow(x, y - len, x, y - 4, a, C.accent, 4, 12); } };
  arrows(P[0], P[1], 3, 46); arrows(P[3], P[2], 6, 24);
  O.font(30, 800, 'BarlowC, Arial Narrow, sans-serif'); g.fillStyle = C.white; g.textBaseline = 'middle';
  if (label1) g.fillText(label1, P[1].x + 18, P[1].y - 20); if (label2) g.fillText(label2, P[2].x + 18, P[2].y - 10);
  g.restore();
}
export const SERIES_MT = ['Munkaárok', 'Szádfal', 'Berlini dúcolat', 'Cölöpfal', 'Talajszegezés', 'Talajhorgony', 'Megtámasztás'];
export const SERIES_FU = ['Hordozható', 'Gépi spirál', 'Csőspirál', 'Geobor S'];
export const SERIES_SZ = ['CPTu', 'DP', 'SPT', 'Szárnyas', 'Presszióméter', 'DMT'];
export const SERIES_GF = ['EMI', 'GPR', 'ERT', 'Mágneses', 'Refrakció', 'Reflexió', 'MASW'];
// Munkatér-határolás v2 sorozat (19 videó) – blokkonkénti chipek
export const MT2 = {
  ducolas: ['Munkaárok', 'Táblás dúcolat', 'Széles gödör'],
  falak: ['Berlini dúcolat', 'Jet-grouting fal', 'Zagyfal', 'Mélykevert fal', 'Acél szádfal', 'Szádfal-anyagok', 'Cölöpfal'],
  megtamasztas: ['Talajszegezés', 'Talajhorgony', 'Csőtámasz', 'Top-down', 'Passzív horgony'],
  kulonleges: ['Fagyasztott fal', 'Gát élővízben', 'Víz alatti lemez', 'Mélygarázs'],
};
