// Síkalapok állékonysága – közös elemek a sorozathoz (3D modellek + 2D grafikák)
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { clamp, lerp, smooth, easeOut, easeOutBack, seg, win, fmt, mulberry32, up } from './util.js';
import { C, FH, FB, Overlay } from './overlay.js';
import { M } from './parts.js';

// ---------- sorozat ----------
export const ST = ['Elcsúszás', 'Felborulás', 'Felúszás', 'Általános állékonyság', 'Összefoglaló'];
export const ST_KICK = 'Síkalapok állékonysága';
export const ACC = ['#FF8A4C', '#B48CFF', '#3FE0C5', '#F2C14E', '#FF6B9A'];
const hexA = (h, a) => { const n = parseInt(h.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };
export { hexA };
// videónkénti kiemelőszín (a C objektumot az overlay futásidőben olvassa)
export function setAccent(hex) {
  C.accent = hex; C.accent2 = hex;
  // a lépés-chipek „kész” színe a kit-ben fix narancs – itt az aktuális kiemelőszínre cseréljük
  const P = Overlay.prototype;
  if (!P.__stepsPatched) {
    P.steps = function (t, steps, a) {
      if (a <= 0) return;
      const g = this.g; g.save(); g.globalAlpha = a;
      let x = 64; const y = 56, h = 46;
      this.font(24, 800, FH);
      for (const s of steps) {
        const act = t >= s.t0 && t < s.t1, done = t >= s.t1;
        const label = act ? `${s.n}  ${up(s.name)}` : `${s.n}`;
        const w = act ? g.measureText(label).width + 40 : 46;
        const k = act ? easeOutBack(clamp((t - s.t0) / 0.35)) : 1;
        g.fillStyle = act ? C.accent : done ? hexA(C.accent, 0.3) : 'rgba(10,12,14,0.72)';
        this.rr(x, y, w * (act ? 0.6 + 0.4 * k : 1), h, 10); g.fill();
        if (!act) { g.strokeStyle = 'rgba(255,255,255,0.14)'; g.lineWidth = 1.5; this.rr(x, y, w, h, 10); g.stroke(); }
        g.fillStyle = act ? C.ink : done ? C.white : 'rgba(255,255,255,0.6)';
        g.textBaseline = 'middle'; g.textAlign = act ? 'left' : 'center';
        g.globalAlpha = a * (act ? clamp((t - s.t0) / 0.25) : 1);
        g.fillText(done && !act ? '✓' : label, act ? x + 20 : x + w / 2, y + h / 2 + 1);
        g.globalAlpha = a;
        x += (act ? w * (0.6 + 0.4 * k) : w) + 10;
      }
      g.restore();
    };
    P.__stepsPatched = true;
  }
}

// ---------- anyagok ----------
let _concTex = null;
export function concreteTexture() {
  if (_concTex) return _concTex;
  const S = 512, cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d');
  g.fillStyle = '#a9a7a1'; g.fillRect(0, 0, S, S); const r = mulberry32(31);
  for (let i = 0; i < 90; i++) { g.fillStyle = r() < 0.5 ? 'rgba(120,118,112,0.18)' : 'rgba(200,198,190,0.16)'; const rr = 30 + r() * 90; g.beginPath(); g.ellipse(r() * S, r() * S, rr, rr * 0.6, r() * 3, 0, 7); g.fill(); }
  for (let i = 0; i < 9000; i++) { const v = 120 + r() * 110; g.fillStyle = `rgba(${v},${v - 2},${v - 6},0.5)`; g.fillRect(r() * S, r() * S, 1 + r() * 2, 1 + r() * 2); }
  for (let i = 0; i < 260; i++) { g.fillStyle = 'rgba(70,68,64,0.55)'; g.beginPath(); g.arc(r() * S, r() * S, 0.8 + r() * 1.8, 0, 7); g.fill(); } // pórusok
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  _concTex = t; return t;
}
// világkoordinátás betonanyag
export function concreteMaterial(color = 0xffffff, scale = 1.6) {
  const m = new THREE.MeshStandardMaterial({ map: concreteTexture(), color, roughness: 0.88, metalness: 0 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uWS = { value: scale };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP3; varying vec3 vWN3;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvWP3 = (modelMatrix*vec4(transformed,1.0)).xyz; vWN3 = normalize(mat3(modelMatrix)*objectNormal);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP3; varying vec3 vWN3; uniform float uWS;')
      .replace('#include <map_fragment>', `vec3 an3 = abs(vWN3); vec2 wuv3 = an3.y > 0.5 ? vWP3.xz : (an3.z > 0.5 ? vWP3.xy : vWP3.zy);
        vec4 sampledDiffuseColor = texture2D(map, wuv3 / uWS); diffuseColor *= sampledDiffuseColor;`);
  };
  m.customProgramCacheKey = () => 'concStab' + scale;
  return m;
}
// rétegenként tömörített háttöltés textúrája (vízszintes rétegvonalakkal)
let _fillTex = null;
export function fillTexture() {
  if (_fillTex) return _fillTex;
  const S = 512, cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d'); const r = mulberry32(77);
  g.fillStyle = '#a88a5c'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 70; i++) { g.fillStyle = r() < 0.5 ? 'rgba(90,70,44,0.22)' : 'rgba(200,170,120,0.18)'; const rr = 40 + r() * 120; g.beginPath(); g.ellipse(r() * S, r() * S, rr, rr * 0.35, 0, 0, 7); g.fill(); }
  for (let i = 0; i < 7000; i++) { const v = r(); g.fillStyle = v < 0.33 ? 'rgba(120,96,62,0.7)' : v < 0.66 ? 'rgba(196,166,116,0.7)' : 'rgba(150,140,128,0.6)'; const s = 1 + r() * 3.5; g.fillRect(r() * S, r() * S, s, s * (0.6 + r() * 0.5)); }
  for (let k = 0; k < 4; k++) { const y = (k + 0.5) * S / 4; g.fillStyle = 'rgba(70,52,30,0.35)'; g.fillRect(0, y - 2, S, 3); g.fillStyle = 'rgba(230,205,160,0.18)'; g.fillRect(0, y + 1, S, 2); }
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  _fillTex = t; return t;
}
const shadow = (o) => { o.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } }); return o; };
export { shadow };

// ---------- geometriák ----------
// szögtámfal L-szelvény (x-y síkban), z irányban kihúzva [z0, z1]
// p: { toe, stemT, heel, tB, hS } – a talp bal (hátsó) éle x = 0-nál; a fal a +x irányba támaszt (földoldal: −x)
export function wallProfile(p) {
  const { B, tB, stemX0, stemX1, top } = p; // talp: x 0..B, y 0..tB ; szár: x stemX0..stemX1, y tB..top
  const s = new THREE.Shape();
  s.moveTo(0, 0); s.lineTo(B, 0); s.lineTo(B, tB); s.lineTo(stemX1, tB); s.lineTo(stemX1 - 0.04, top); s.lineTo(stemX0, top); s.lineTo(stemX0, tB); s.lineTo(0, tB); s.closePath();
  return s;
}
export function extrudeZ(shape, z0, z1) { // z0 > z1
  const g = new THREE.ExtrudeGeometry(shape, { depth: z0 - z1, bevelEnabled: false, curveSegments: 6 });
  g.translate(0, 0, z1); return g;
}
// alaptest + pillércsonk: középen x = 0, talp alja y = 0; half = true → csak a z ≤ 0 fél (metszethez)
export function footingGeom({ B = 2.0, L = 2.0, h = 0.6, cw = 0.4, ch = 1.2, half = false, step = null } = {}) {
  const parts = [];
  const zc = half ? -L / 4 : 0, Lz = half ? L / 2 : L;
  parts.push(new THREE.BoxGeometry(B, h, Lz).translate(0, h / 2, zc));
  if (step) parts.push(new THREE.BoxGeometry(step.b, step.h, half ? step.b / 2 : step.b).translate(0, h + step.h / 2, half ? -step.b / 4 : 0));
  const y0 = h + (step ? step.h : 0);
  if (ch > 0) parts.push(new THREE.BoxGeometry(cw, ch, half ? cw / 2 : cw).translate(0, y0 + ch / 2, half ? -cw / 4 : 0));
  return mergeGeometries(parts.map(g => g.toNonIndexed()));
}

// ---------- 2D: gazdag szöveg alsó indexszel ----------
// "R_{p;d} = V'_k·tgδ_k / γ_{R;h}" – az _x vagy _{...} alsó index
export function richParse(s) {
  const out = []; let i = 0, buf = '';
  while (i < s.length) {
    const ch = s[i];
    if (ch === '_' || ch === '^') {
      if (buf) { out.push({ t: buf, k: 0 }); buf = ''; }
      const kind = ch === '_' ? -1 : 1;
      if (s[i + 1] === '{') { const j = s.indexOf('}', i + 2); out.push({ t: s.slice(i + 2, j), k: kind }); i = j + 1; }
      else { out.push({ t: s[i + 1], k: kind }); i += 2; }
      continue;
    }
    buf += ch; i++;
  }
  if (buf) out.push({ t: buf, k: 0 });
  return out;
}
export function richWidth(O, s, size, weight = 700, fam = FB) {
  const g = O.g; let w = 0;
  for (const p of richParse(s)) { O.font(p.k ? size * 0.62 : size, weight, fam); w += g.measureText(p.t).width + (p.k ? 1 : 0); }
  return w;
}
export function richText(O, s, x, y, size, color = C.white, { weight = 700, fam = FB, align = 'left', subColor = null } = {}) {
  const g = O.g; g.save(); g.textBaseline = 'alphabetic';
  let cx = x; if (align !== 'left') { const w = richWidth(O, s, size, weight, fam); cx = align === 'center' ? x - w / 2 : x - w; }
  g.textAlign = 'left';
  for (const p of richParse(s)) {
    O.font(p.k ? size * 0.62 : size, weight, fam); g.fillStyle = p.k ? (subColor || color) : color;
    const dy = p.k < 0 ? size * 0.2 : p.k > 0 ? -size * 0.42 : 0;
    g.fillText(p.t, cx, y + dy); cx += g.measureText(p.t).width + (p.k ? 1 : 0);
  }
  g.restore(); return cx;
}

// ---------- 2D: képletkártya ----------
// rows: [{s, size, color, weight, fam, gap}] – s gazdag szöveg; title: felső kicker
export function fcard(O, x, y, w, a, slide, rows, title, { color = null, pad = 30, bg = 'rgba(10,12,14,0.86)' } = {}) {
  if (a <= 0) return 0; const g = O.g; g.save(); g.globalAlpha = a; g.translate(0, (1 - easeOut(clamp(slide))) * 30);
  const col = color || C.accent;
  let h = (title ? 64 : 26) + 18; for (const r of rows) h += (r.gap ?? (r.size || 34) * 1.6);
  g.fillStyle = bg; O.rr(x, y, w, h, 16); g.fill(); g.fillStyle = col; g.fillRect(x, y + 18, 6, h - 36);
  let cy = y + (title ? 44 : 10);
  if (title) { O.font(26, 800, FH); g.fillStyle = col; g.textBaseline = 'alphabetic'; g.textAlign = 'left'; g.fillText(up(title), x + pad, cy); cy += 20; }
  rows.forEach((r, i) => {
    const size = r.size || 34; cy += (r.gap ?? size * 1.6);
    const k = r.t0 !== undefined ? clamp(r.t0) : 1; if (k <= 0) return;
    g.globalAlpha = a * smooth(k);
    richText(O, r.s, x + pad + (r.dx || 0), cy - size * 0.38, size, r.color || C.white, { weight: r.weight || 700, fam: r.fam || FB, subColor: r.sub });
    g.globalAlpha = a;
  });
  g.restore(); return h;
}

// ---------- 2D: erőnyíl 3D pontból ----------
// from: [x,y,z] (a nyíl HEGYE, ha tip = true), vec: [dx,dy] méterben (a nyíl iránya és hossza)
export function force(O, proj, at, vec, label, a, { color = C.red, w = 9, head = 26, tip = true, grow = 1, lab = 1, size = 40, ldx = 0, ldy = 0, sub = null } = {}) {
  if (a <= 0) return null;
  const [x, y, z] = at, [dx, dy] = vec;
  const P0 = tip ? proj(x - dx, y - dy, z) : proj(x, y, z), P1 = tip ? proj(x, y, z) : proj(x + dx, y + dy, z);
  if (!P0.ok || !P1.ok) return null;
  const k = easeOut(clamp(grow));
  const ex = lerp(P0.x, P1.x, k), ey = lerp(P0.y, P1.y, k);
  const g = O.g; g.save(); g.globalAlpha = a;
  g.shadowColor = 'rgba(0,0,0,0.55)'; g.shadowBlur = 10;
  O.arrow(P0.x, P0.y, ex, ey, 1, color, w, head);
  g.shadowBlur = 0;
  if (label && lab > 0) {
    g.globalAlpha = a * clamp(lab);
    const mx = (P0.x + ex) / 2, my = (P0.y + ey) / 2;
    const ang = Math.atan2(ey - P0.y, ex - P0.x); const nx = -Math.sin(ang), ny = Math.cos(ang);
    const off = 34; const lx = mx + nx * off * (ny > 0 ? -1 : 1) + ldx, ly = my + ny * off * (ny > 0 ? -1 : 1) + ldy;
    const tw = richWidth(O, label, size, 800, FH);
    g.fillStyle = 'rgba(8,10,12,0.78)'; O.rr(lx - tw / 2 - 12, ly - size * 0.72, tw + 24, size * 1.12, 10); g.fill();
    richText(O, label, lx, ly + size * 0.22, size, color, { weight: 800, fam: FH, align: 'center' });
    if (sub) { O.font(20, 600, FB); g.fillStyle = 'rgba(255,255,255,0.75)'; g.textAlign = 'center'; g.fillText(sub, lx, ly + size * 0.72 + 6); }
  }
  g.restore();
  return { x0: P0.x, y0: P0.y, x1: ex, y1: ey };
}

// ---------- 2D: kihasználtság-mérő (Λ = E_d / R_d) ----------
export function gauge(O, x, y, w, ratio, a, { title = 'Kihasználtság', ed = 'E_d', rd = 'R_d', max = 1.5, showVal = true, small = false } = {}) {
  if (a <= 0) return; const g = O.g; g.save(); g.globalAlpha = a;
  const h = small ? 96 : 128; g.fillStyle = 'rgba(10,12,14,0.84)'; O.rr(x, y, w, h, 14); g.fill();
  O.font(22, 800, FH); g.fillStyle = C.dim; g.textBaseline = 'alphabetic'; g.textAlign = 'left';
  g.fillText(up(title), x + 22, y + 32);
  const bx = x + 22, bw = w - 44, by = y + (small ? 48 : 52), bh = small ? 18 : 22;
  g.fillStyle = 'rgba(255,255,255,0.10)'; O.rr(bx, by, bw, bh, bh / 2); g.fill();
  const r = Math.max(0, ratio), u = clamp(r / max);
  const col = r <= 0.85 ? C.green : r <= 1.0 ? '#F2C14E' : C.red;
  g.fillStyle = col; g.shadowColor = col; g.shadowBlur = 14; O.rr(bx, by, Math.max(bh, bw * u), bh, bh / 2); g.fill(); g.shadowBlur = 0;
  const x1 = bx + bw * (1 / max); g.fillStyle = C.white; g.fillRect(x1 - 1.5, by - 8, 3, bh + 16);
  O.font(18, 700, FH); g.fillStyle = 'rgba(255,255,255,0.7)'; g.textAlign = 'center'; g.fillText('1,0', x1, by + bh + 26);
  if (showVal) {
    O.font(small ? 34 : 44, 800, FH); g.fillStyle = col; g.textAlign = 'right';
    g.fillText((r > 9.99 ? '>9,99' : fmt(r, 2)) + (r <= 1 ? '  ✓' : '  ✗'), x + w - 22, y + 34);
  }
  g.restore();
}

// ---------- 2D: talpfeszültség-ábra (alaptest alatt) ----------
// x0..x1 a talp élei (világ x), y a talp síkja, z, sig(u) 0..1 a talp mentén → feszültség (relatív, 0..1), scale: m / egység
export function pressure2D(O, proj, x0, x1, y, z, sig, a, { scale = 0.8, n = 14, color = C.accent, fill = true, arrows = true } = {}) {
  if (a <= 0) return; const g = O.g; g.save(); g.globalAlpha = a;
  const top = [], bot = [];
  for (let i = 0; i <= n; i++) { const u = i / n, X = lerp(x0, x1, u), s = Math.max(0, sig(u)); const p = proj(X, y, z), q = proj(X, y - s * scale, z); if (!p.ok || !q.ok) { g.restore(); return; } top.push(p); bot.push(q); }
  if (fill) { g.fillStyle = hexA(color, 0.28); g.beginPath(); g.moveTo(top[0].x, top[0].y); bot.forEach(p => g.lineTo(p.x, p.y)); g.lineTo(top[n].x, top[n].y); g.closePath(); g.fill(); }
  g.strokeStyle = color; g.lineWidth = 3; g.beginPath(); bot.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)); g.stroke();
  if (arrows) for (let i = 0; i <= n; i += 2) { const L = Math.hypot(bot[i].x - top[i].x, bot[i].y - top[i].y); if (L > 14) O.arrow(bot[i].x, bot[i].y, top[i].x, top[i].y + 3, 1, color, 3, 11); }
  g.restore();
}

// ---------- 2D: vonal 3D pontok között (szaggatott is) ----------
export function line3(O, proj, pts, { color = C.accent, width = 3, a = 1, dash = null, glow = 8, close = false, fillC = null } = {}) {
  if (a <= 0) return; const P = pts.map(p => proj(p[0], p[1], p[2] ?? 0.05)); if (!P.every(p => p.ok)) return;
  const g = O.g; g.save(); g.globalAlpha = a; g.strokeStyle = color; g.lineWidth = width; g.lineJoin = 'round'; g.lineCap = 'round';
  if (dash) g.setLineDash(dash); if (glow) { g.shadowColor = color; g.shadowBlur = glow; }
  g.beginPath(); P.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)); if (close) g.closePath();
  if (fillC) { g.fillStyle = fillC; g.fill(); }
  g.stroke(); g.restore();
}

// ---------- 2D: méretvonal ----------
export function dim3(O, proj, p0, p1, text, a, { color = C.white, off = [0, 0], size = 26 } = {}) {
  if (a <= 0) return; const A = proj(p0[0] + off[0], p0[1] + off[1], p0[2] ?? 0.05), B = proj(p1[0] + off[0], p1[1] + off[1], p1[2] ?? 0.05); if (!A.ok || !B.ok) return;
  const g = O.g; g.save(); g.globalAlpha = a; g.strokeStyle = color; g.fillStyle = color; g.lineWidth = 2;
  g.beginPath(); g.moveTo(A.x, A.y); g.lineTo(B.x, B.y); g.stroke();
  const ang = Math.atan2(B.y - A.y, B.x - A.x);
  for (const [P, s] of [[A, 1], [B, -1]]) { g.save(); g.translate(P.x, P.y); g.rotate(ang); g.beginPath(); g.moveTo(0, 0); g.lineTo(s * 14, -6); g.lineTo(s * 14, 6); g.closePath(); g.fill(); g.fillRect(-1, -12, 2, 24); g.restore(); }
  const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2; const tw = richWidth(O, text, size, 800, FH);
  g.fillStyle = 'rgba(8,10,12,0.8)'; O.rr(mx - tw / 2 - 10, my - size * 0.7, tw + 20, size * 1.15, 8); g.fill();
  richText(O, text, mx, my + size * 0.25, size, color, { weight: 800, fam: FH, align: 'center' });
  g.restore();
}

// ---------- 2D: ítélet-bélyegző (MEGFELEL / NEM FELEL MEG) ----------
export function verdict(O, x, y, ok, p, a, { text = null, size = 64 } = {}) {
  if (a <= 0) return; const g = O.g; const k = easeOutBack(clamp(p / 0.35), 2.2); g.save(); g.globalAlpha = a * clamp(p / 0.15);
  g.translate(x, y); g.rotate(-0.06); g.scale(1.6 - 0.6 * k, 1.6 - 0.6 * k);
  const col = ok ? C.green : C.red; const s = text || (ok ? 'MEGFELEL' : 'NEM FELEL MEG');
  O.font(size, 800, FH); const tw = g.measureText(s).width;
  g.strokeStyle = col; g.lineWidth = 6; O.rr(-tw / 2 - 26, -size * 0.78, tw + 52, size * 1.18, 12); g.stroke();
  g.fillStyle = hexA(col, 0.16); g.fill();
  g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillText(s, 0, size * 0.22);
  g.restore();
}

// ---------- 2D: mikroszkóp-betét (érdesség: monolit / előregyártott) ----------
// kind: 'rough' | 'smooth'; shear: elmozdulás px-ben
export function interfaceInset(O, x, y, w, h, a, kind, shear, t, { title = '', accent = null } = {}) {
  if (a <= 0) return; const g = O.g; g.save(); g.globalAlpha = a;
  g.fillStyle = 'rgba(10,12,14,0.9)'; O.rr(x, y, w, h, 18); g.fill();
  g.save(); O.rr(x + 6, y + 6, w - 12, h - 12, 14); g.clip(); g.fillStyle = '#4a3a28'; g.fillRect(x, y + h * 0.4, w, h);
  const mid = y + h * 0.46; const r = mulberry32(kind === 'rough' ? 9 : 4);
  // talajszemcsék (alul)
  for (let i = 0; i < 70; i++) { const gx = x + r() * w, gr = 9 + r() * 15, gy = mid + gr * 0.7 + r() * (h * 0.5); const v = 150 + r() * 60; g.fillStyle = `rgb(${v},${v * 0.82 | 0},${v * 0.55 | 0})`; g.beginPath(); g.ellipse(gx, gy, gr, gr * 0.82, r() * 3, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,0.15)'; g.beginPath(); g.ellipse(gx - gr * 0.3, gy - gr * 0.3, gr * 0.35, gr * 0.22, 0.5, 0, 7); g.fill(); }
  // felső szemcsesor a határfelületen
  const r2 = mulberry32(kind === 'rough' ? 19 : 14);
  for (let i = 0; i < 16; i++) { const gr = 12 + r2() * 8, gx = x + 20 + i * (w - 40) / 15, gy = mid + gr * (kind === 'rough' ? 0.2 : 0.95); const v = 165 + r2() * 50; g.fillStyle = `rgb(${v},${v * 0.82 | 0},${v * 0.55 | 0})`; g.beginPath(); g.ellipse(gx, gy, gr, gr * 0.85, r2() * 3, 0, 7); g.fill(); }
  // beton (felül), elmozdulással
  g.save(); g.translate(shear, 0);
  g.fillStyle = '#9d9b95'; g.beginPath(); g.moveTo(x - 60, y - 10); g.lineTo(x + w + 60, y - 10);
  const n = 40; for (let i = n; i >= 0; i--) { const px = x - 60 + (w + 120) * i / n; const amp = kind === 'rough' ? 12 * Math.sin(i * 1.7) * Math.sin(i * 0.53 + 1) + 8 : 0; g.lineTo(px, mid + amp + (kind === 'rough' ? 4 : -4)); }
  g.closePath(); g.fill();
  for (let i = 0; i < 140; i++) { const v = 120 + r() * 100; g.fillStyle = `rgba(${v},${v},${v - 6},0.6)`; g.fillRect(x - 40 + r() * (w + 80), y + r() * (h * 0.4), 2 + r() * 3, 2 + r() * 3); }
  g.restore();
  g.restore();
  O.font(24, 800, FH); const tw = g.measureText(up(title)).width; g.fillStyle = 'rgba(8,10,12,0.85)'; O.rr(x + 14, y + 14, tw + 28, 38, 9); g.fill();
  g.fillStyle = accent || C.accent; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillText(up(title), x + 28, y + 41);
  g.restore();
}
