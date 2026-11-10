// „Nézd meg élőben is!” – zárójelenet a BME Építőmérnöki Kar YouTube-videójára mutatva
// (a CFA-videó zárásának mintájára: középen a YouTube-indexkép, körülötte 4 polaroid a videó képkockáiból,
//  alul sáv címmel és linkkel, jobbra lent QR-kód). Kattintható link is kerül a lejátszóba.
//
// Használat a videó mappájában:
//   import t from './yt/t.jpg'; import p1 from './yt/p1.jpg'; … import qr from './yt/qr.jpg';
//   import { loadOutro, drawOutro } from '../../kit/x_outro.js';
//   init():   await loadOutro({ thumb: t, qr, photos: [p1, p2, p3, p4] });
//   drawOverlay(O, t): drawOutro(O, t, { t0: tb(60), t1: TOTAL, kicker: 'A RÉSFAL A VALÓSÁGBAN', caps: ['…','…','…','…'],
//        ytTitle: 'Résfalazás', ytSub: 'BME Építőmérnöki Kar · YouTube · Befogott támszerkezetek lejátszási lista',
//        url: 'youtu.be/f_41-sJhGK8', href: 'https://youtu.be/f_41-sJhGK8', next: 'Következik: kút, szekrény, keszon' });
import { FH, FB } from './overlay.js';

const IM = {};
function img(src) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }); }
export async function loadOutro({ thumb, qr, photos }) {
  IM.thumb = await img(thumb);
  IM.qr = qr ? await img(qr) : null;
  IM.photos = await Promise.all(photos.map(img));
}
const cl = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const eo = (x) => 1 - Math.pow(1 - cl(x), 3);
const ebk = (x) => { x = cl(x); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function cover(g, im, x, y, w, h) { const s = Math.max(w / im.width, h / im.height); const sw = w / s, sh = h / s; g.drawImage(im, (im.width - sw) / 2, (im.height - sh) / 2, sw, sh, x, y, w, h); }
// aláhúzásjelet tartalmazó szöveg (pl. youtu.be/f_41-sJhGK8) – a kit fillText-je az _x-et alsó indexnek venné
function ptext(g, s, x, y) {
  if (s.indexOf('_') < 0) { g.fillText(s, x, y); return; }
  const parts = s.split('_'); const ws = parts.map(p => g.measureText(p).width), wu = g.measureText('_').width;
  const W = ws.reduce((a, b) => a + b, 0) + wu * (parts.length - 1), al = g.textAlign;
  let cx = al === 'center' ? x - W / 2 : (al === 'right' || al === 'end') ? x - W : x;
  g.textAlign = 'left';
  parts.forEach((p, i) => { if (p) g.fillText(p, cx, y); cx += ws[i]; if (i < parts.length - 1) { g.fillText('_', cx, y); cx += wu; } });
  g.textAlign = al;
}
function ytBtn(g, cx, cy, w) { const h = w * 0.7; g.save(); g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = 18; g.fillStyle = '#ff0000'; rr(g, cx - w / 2, cy - h / 2, w, h, h * 0.3); g.fill(); g.shadowBlur = 0; g.fillStyle = '#fff'; g.beginPath(); g.moveTo(cx - w * 0.14, cy - h * 0.26); g.lineTo(cx + w * 0.22, cy); g.lineTo(cx - w * 0.14, cy + h * 0.26); g.closePath(); g.fill(); g.restore(); }

let linkEl = null;
function link(href, on, rect) {
  if (typeof document === 'undefined') return;
  if (!linkEl) {
    const wrap = document.getElementById('wrap'); if (!wrap) return;
    linkEl = document.createElement('a'); linkEl.target = '_blank'; linkEl.rel = 'noopener'; linkEl.setAttribute('aria-label', 'A videó megnyitása a YouTube-on');
    Object.assign(linkEl.style, { position: 'absolute', zIndex: 4, display: 'none', cursor: 'pointer' });
    wrap.appendChild(linkEl);
  }
  linkEl.href = href;
  Object.assign(linkEl.style, { left: rect[0] + 'px', top: rect[1] + 'px', width: rect[2] + 'px', height: rect[3] + 'px', display: on ? 'block' : 'none' });
}

/** A zárójelenet kirajzolása; a t0 előtt nem rajzol semmit. */
export function drawOutro(O, t, c) {
  const g = O.g, W = 1920, H = 1080;
  const u = t - c.t0;
  if (u < 0 || !IM.thumb) { if (linkEl) link(c.href, false, [0, 0, 0, 0]); return; }
  // a zárókép a videó végén is látszik marad (álló végkép); kifakítás csak kérésre (fadeOut: true)
  const fade = c.fadeOut && c.t1 ? cl((c.t1 - t) / 0.6) : 1;
  g.save();
  g.globalAlpha = cl(u / 0.45) * 0.9 * fade;
  g.fillStyle = '#0b0d10'; g.fillRect(0, 0, W, H);
  // halvány rács
  g.globalAlpha = 0.05 * cl(u / 0.45) * fade; g.strokeStyle = '#fff'; g.lineWidth = 1;
  for (let x = 0; x < W; x += 48) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
  for (let y = 0; y < H; y += 48) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  g.globalAlpha = fade;
  // fejléc
  const a1 = eo((u - 0.15) / 0.45);
  g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.globalAlpha = a1 * fade; g.fillStyle = '#F0A33A'; g.font = `800 34px ${FH}`;
  if ('letterSpacing' in g) g.letterSpacing = '6px';
  g.fillText((c.kicker || '').toUpperCase(), W / 2, 72 - (1 - a1) * 20);
  if ('letterSpacing' in g) g.letterSpacing = '0px';
  g.fillStyle = '#fff'; g.font = `800 104px ${FH}`;
  g.fillText('Nézd meg élőben is!', W / 2, 176 - (1 - a1) * 30);
  if (c.next) { g.globalAlpha = a1 * 0.8 * fade; g.textAlign = 'right'; g.font = `700 26px ${FH}`; g.fillStyle = '#d9d4c8'; if ('letterSpacing' in g) g.letterSpacing = '2px'; g.fillText(c.next.toUpperCase(), W - 60, 50); if ('letterSpacing' in g) g.letterSpacing = '0px'; }
  // polaroidok
  const P = [[300, 372, -5], [1620, 366, 4], [318, 706, 3], [1602, 712, -4]];
  const pw = 440, ph = 248, pad = 13, capH = 58;
  P.forEach(([cx, cy, rot], i) => {
    const k = ebk((u - 0.45 - i * 0.14) / 0.55); if (k <= 0) return;
    const im = IM.photos[i]; if (!im) return;
    g.save(); g.globalAlpha = cl(k) * fade;
    const dx = (cx < W / 2 ? -1 : 1) * (1 - k) * 260;
    g.translate(cx + dx, cy + (1 - k) * 60); g.rotate((rot + (1 - k) * (cx < W / 2 ? -12 : 12)) * Math.PI / 180);
    g.shadowColor = 'rgba(0,0,0,0.55)'; g.shadowBlur = 30; g.shadowOffsetY = 12;
    g.fillStyle = '#f4f1ea'; g.fillRect(-pw / 2 - pad, -ph / 2 - pad, pw + 2 * pad, ph + pad + capH);
    g.shadowColor = 'transparent';
    cover(g, im, -pw / 2, -ph / 2, pw, ph);
    g.fillStyle = '#1c1c1c'; g.font = `800 30px ${FH}`; g.textAlign = cx < W / 2 ? 'left' : 'right';
    if ('letterSpacing' in g) g.letterSpacing = '2px';
    g.fillText((c.caps?.[i] || '').toUpperCase(), cx < W / 2 ? -pw / 2 + 6 : pw / 2 - 6, ph / 2 + 41);
    if ('letterSpacing' in g) g.letterSpacing = '0px';
    g.restore();
  });
  // középső indexkép
  const k0 = ebk((u - 0.3) / 0.6);
  if (k0 > 0) {
    const tw = 690, th = 388, tpad = 16, cx = W / 2, cy = 520;
    g.save(); g.globalAlpha = cl(k0) * fade; g.translate(cx, cy); g.rotate(-0.6 * Math.PI / 180); g.scale(0.6 + 0.4 * k0, 0.6 + 0.4 * k0);
    g.shadowColor = 'rgba(0,0,0,0.6)'; g.shadowBlur = 40; g.shadowOffsetY = 16;
    g.fillStyle = '#fff'; g.fillRect(-tw / 2 - tpad, -th / 2 - tpad, tw + 2 * tpad, th + 2 * tpad);
    g.shadowColor = 'transparent';
    cover(g, IM.thumb, -tw / 2, -th / 2, tw, th);
    const pulse = 1 + 0.05 * Math.sin(u * 5);
    ytBtn(g, 0, 0, 150 * pulse);
    g.restore();
  }
  // alsó sáv
  const k1 = eo((u - 1.05) / 0.5);
  if (k1 > 0) {
    const bx = 260, by = 912 + (1 - k1) * 60, bw = 1300, bh = 128;
    g.save(); g.globalAlpha = k1 * fade;
    g.fillStyle = 'rgba(255,255,255,0.06)'; rr(g, bx, by, bw, bh, 22); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.16)'; g.lineWidth = 2; g.stroke();
    ytBtn(g, bx + 72, by + bh / 2, 92);
    g.textAlign = 'left'; g.fillStyle = '#fff'; g.font = `700 36px ${FB}`;
    g.fillText(c.ytTitle || '', bx + 140, by + 56);
    g.textAlign = 'right'; g.fillStyle = '#F0A33A'; g.font = `800 50px ${FH}`;
    ptext(g, c.url || '', bx + bw - 26, by + 80);
    const uw = g.measureText(c.url || '').width;
    g.textAlign = 'left'; g.fillStyle = '#a5abb2';
    let fs = 23; g.font = `500 ${fs}px ${FB}`;
    while (fs > 16 && g.measureText(c.ytSub || '').width > bw - 140 - uw - 70) { fs -= 1; g.font = `500 ${fs}px ${FB}`; }
    g.fillText(c.ytSub || '', bx + 140, by + 94);
    g.restore();
    // tipp a középső kép alatt
    g.save(); g.globalAlpha = k1 * 0.85 * fade; g.textAlign = 'center'; g.fillStyle = '#c9cdd2'; g.font = `500 26px ${FB}`;
    g.fillText('▶ kattints a képre, vagy olvasd be a QR-kódot', W / 2, 800);
    g.restore();
  }
  const k2 = eo((u - 1.3) / 0.5);
  if (k2 > 0 && IM.qr) { g.save(); g.globalAlpha = k2 * fade; g.fillStyle = '#fff'; rr(g, 1612, 880, 196, 196, 12); g.fill(); g.imageSmoothingEnabled = false; g.drawImage(IM.qr, 1624, 892, 172, 172); g.restore(); }
  g.restore();
  link(c.href, u > 0.6 && fade > 0.2, [W / 2 - 380, 300, 760, 440]);
}
