// 2D felirat-réteg (a térfogatváltozó-videó overlay.js-e alapján, bővítve)
import { clamp, smooth, easeOut, easeIn, easeOutBack, mulberry32, lerp, up, richCtx, guardStr } from './util.js';
const clamp2 = clamp;
export const C = {
  accent: "#F0A33A",
  accent2: "#E07A2E",
  water: "#5CC2F2",
  red: "#EF5A43",
  green: "#62D394",
  ink: "#0E1114",
  white: "#F7F4EE",
  dim: "rgba(247,244,238,0.72)"
};
export const FH = 'BarlowC, "Barlow Condensed", Arial Narrow, sans-serif';
export const FB = "Inter, Arial, sans-serif";
export class Overlay {
  constructor(canvas2) {
    this.c = canvas2;
    this.g = richCtx(canvas2.getContext("2d"));
    this.W = canvas2.width;
    this.H = canvas2.height;
    const gc = document.createElement("canvas");
    gc.width = gc.height = 256;
    const gg = gc.getContext("2d");
    const id = gg.createImageData(256, 256);
    const r = mulberry32(5);
    for (let i = 0; i < 256 * 256; i++) {
      const v = r() * 255;
      id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = v;
      id.data[i * 4 + 3] = 255;
    }
    gg.putImageData(id, 0, 0);
    this.grain = gc;
  }
  clear() {
    this.g.clearRect(0, 0, this.W, this.H);
  }
  font(size, weight = 600, fam = FB) {
    this.g.font = `${weight} ${size}px ${fam}`;
  }  // alsó/felső index: „q_c”, „N_{20}”, „E_{oed}”, „x^2” – az index a jobb alsó sarokba, 62 %-os méretben kerül
  _rparse(s) { const out = []; let i = 0, buf = ''; s = String(s);
    while (i < s.length) { const ch = s[i]; if ((ch === '_' || ch === '^') && i + 1 < s.length && s[i + 1] !== ' ') { if (buf) { out.push([buf, 0]); buf = ''; } const k = ch === '_' ? -1 : 1;
        if (s[i + 1] === '{') { const j = s.indexOf('}', i + 2); out.push([s.slice(i + 2, j < 0 ? s.length : j), k]); i = (j < 0 ? s.length : j + 1); } else { out.push([s[i + 1], k]); i += 2; } continue; }
      buf += ch; i++; }
    if (buf) out.push([buf, 0]); return out; }
  rw(s) { const g = this.g; if (!/[_^]/.test(s)) return g.measureText(s).width; const f0 = g.font, m = /(\d+(?:\.\d+)?)px/.exec(f0), sz = m ? +m[1] : 30; let w = 0;
    for (const [t, k] of this._rparse(s)) { if (k) g.font = f0.replace(/(\d+(?:\.\d+)?)px/, (sz * 0.62).toFixed(1) + 'px'); w += g.measureText(t).width + (k ? 1 : 0); g.font = f0; } return w; }
  rt(s, x, y) { const g = this.g; if (!/[_^]/.test(s)) { g.fillText(s, x, y); return g.measureText(s).width; }
    const f0 = g.font, al = g.textAlign, bl = g.textBaseline, m = /(\d+(?:\.\d+)?)px/.exec(f0), sz = m ? +m[1] : 30;
    const W = this.rw(s); let cx = al === 'center' ? x - W / 2 : (al === 'right' || al === 'end') ? x - W : x;
    const ya = bl === 'top' || bl === 'hanging' ? y + sz * 0.8 : bl === 'middle' ? y + sz * 0.35 : bl === 'bottom' ? y - sz * 0.2 : y; // alapvonal
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    for (const [t, k] of this._rparse(s)) { if (k) g.font = f0.replace(/(\d+(?:\.\d+)?)px/, (sz * 0.62).toFixed(1) + 'px');
      g.fillText(t, cx, ya + (k < 0 ? sz * 0.2 : k > 0 ? -sz * 0.42 : 0)); cx += g.measureText(t).width + (k ? 1 : 0); g.font = f0; }
    g.textAlign = al; g.textBaseline = bl; return W; }

  wrap(text, maxW) {
    const words = guardStr(text).split(" ");
    const lines = [];
    let cur = "";
    for (const w of words) {
      const t = cur ? cur + " " + w : w;
      if (this.g.measureText(t).width > maxW && cur) {
        lines.push(cur);
        cur = w;
      } else cur = t;
    }
    if (cur) lines.push(cur);
    return lines;
  }
  // full-frame fade (color, alpha)
  fade(a, color = "#000") {
    if (a <= 0) return;
    const g = this.g;
    g.save();
    g.globalAlpha = clamp2(a);
    g.fillStyle = color;
    g.fillRect(0, 0, this.W, this.H);
    g.restore();
  }
  vignette(strength = 0.55) {
    const g = this.g;
    const grd = g.createRadialGradient(this.W / 2, this.H / 2, this.H * 0.35, this.W / 2, this.H / 2, this.H * 0.95);
    grd.addColorStop(0, "rgba(0,0,0,0)");
    grd.addColorStop(1, `rgba(0,0,0,${strength})`);
    g.fillStyle = grd;
    g.fillRect(0, 0, this.W, this.H);
  }
  grainPass(t, a = 0.05) {
    const g = this.g;
    g.save();
    g.globalAlpha = a;
    g.globalCompositeOperation = "overlay";
    const ox = Math.floor(t * 977 % 256), oy = Math.floor(t * 613 % 256);
    for (let y = -oy; y < this.H; y += 256) for (let x = -ox; x < this.W; x += 256) g.drawImage(this.grain, x, y);
    g.restore();
  }
  bottomShade(a = 1) {
    const g = this.g;
    const grd = g.createLinearGradient(0, this.H * 0.62, 0, this.H);
    grd.addColorStop(0, "rgba(0,0,0,0)");
    grd.addColorStop(1, `rgba(0,0,0,${0.62 * a})`);
    g.fillStyle = grd;
    g.fillRect(0, this.H * 0.62, this.W, this.H * 0.38);
  }
  // lower-third caption. p = local progress seconds since start, a = envelope alpha
  caption(lines, p, a, opts = {}) {
    if (a <= 0) return;
    const g = this.g;
    const x = opts.x ?? 120;
    let y = opts.y ?? 880;
    const size = opts.size ?? 44;
    g.save();
    g.globalAlpha = a;
    this.bottomShade(1);
    if (opts.kicker) {
      this.font(26, 700, FH);
      g.fillStyle = opts.kc || C.accent;
      g.textBaseline = "alphabetic";
      g.fillText(up(opts.kicker), x, y - lines.length * (size * 1.22) - 6);
    }
    g.fillStyle = opts.kc || C.accent;
    const barH = lines.length * size * 1.22 + 6;
    g.fillRect(x - 28, y - barH + 2, 7, barH);
    this.font(size, 600, FB);
    g.textBaseline = "alphabetic";
    let wi = 0;
    const startY = y - (lines.length - 1) * size * 1.22;
    lines.forEach((ln, li) => {
      const toks = [];
      let rest = ln;
      const re = /\*([^*]+)\*/;
      while (rest.length) {
        const mm = rest.match(re);
        if (!mm) {
          rest.split(" ").forEach((w, k, arr) => {
            if (w) toks.push({ w, hl: false, sp: k < arr.length - 1 || rest.endsWith(" ") });
          });
          break;
        }
        const pre = rest.slice(0, mm.index);
        pre.split(" ").forEach((w, k, arr) => {
          if (w) toks.push({ w, hl: false, sp: k < arr.length - 1 });
        });
        const words = mm[1].split(" ");
        words.forEach((w, k) => toks.push({ w, hl: true, sp: k < words.length - 1, last: k === words.length - 1 }));
        rest = rest.slice(mm.index + mm[0].length);
        if (rest.startsWith(" ")) {
          toks[toks.length - 1].sp = true;
          rest = rest.slice(1);
        }
      }
      let cx = x;
      const by = startY + li * size * 1.22;
      const spW = g.measureText(" ").width;
      toks.forEach((tk) => {
        const tw = clamp2((p - wi * 0.07) / 0.35);
        wi++;
        g.globalAlpha = a * smooth(tw);
        const dy = (1 - easeOut(tw)) * 14;
        const m = this.rw(tk.w);
        if (tk.hl) {
          g.fillStyle = opts.hc || C.accent;
          g.fillRect(cx - 6, by - size * 0.86 + dy, m + 12 + (tk.sp && !tk.last ? spW : 0), size * 1.08);
          g.fillStyle = C.ink;
        } else g.fillStyle = C.white;
        this.rt(tk.w, cx, by + dy);
        cx += m + (tk.sp ? spW : 0) + (tk.hl && tk.last ? 8 : 0);
      });
    });
    g.restore();
  }
  // big centered kinetic line
  bigLine(text, p, a, y = 540, size = 92, color = C.white, opts = {}) {
    if (a <= 0) return;
    const g = this.g;
    g.save();
    this.font(size, 800, FH);
    g.textAlign = opts.align || "center";
    g.textBaseline = "middle";
    const s = 1 + (1 - easeOut(clamp2(p / 0.6))) * 0.08;
    g.translate(opts.x ?? this.W / 2, y);
    g.scale(s, s);
    g.globalAlpha = a;
    g.shadowColor = "rgba(0,0,0,0.6)";
    g.shadowBlur = 24;
    g.fillStyle = color;
    g.fillText(text, 0, 0);
    if (opts.under) {
      const m = g.measureText(text).width;
      g.shadowBlur = 0;
      g.fillStyle = opts.under;
      g.fillRect(-m / 2 * easeOut(clamp2(p / 0.8)), size * 0.55, m * easeOut(clamp2(p / 0.8)), 8);
    }
    g.restore();
  }
  title(p, a, ep, title, sub, series) {
    if (a <= 0) return;
    const g = this.g;
    g.save();
    g.globalAlpha = a;
    const grd = g.createLinearGradient(0, 0, this.W * 0.75, 0);
    grd.addColorStop(0, "rgba(8,8,8,0.82)");
    grd.addColorStop(1, "rgba(8,8,8,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, this.W, this.H);
    const x = 140;
    const k = (d) => easeOut(clamp2((p - d) / 0.7));
    this.font(30, 700, FH);
    g.fillStyle = C.accent;
    g.globalAlpha = a * k(0);
    g.fillText("ALAPOZ\xC1S KEDVEZ\u0150TLEN ALTALAJON", x, 330 + (1 - k(0)) * 20);
    g.fillStyle = "rgba(255,255,255,0.55)";
    g.fillText(`\xB7  ${ep}. R\xC9SZ / 4`, x + g.measureText("ALAPOZ\xC1S KEDVEZ\u0150TLEN ALTALAJON").width + 18, 330 + (1 - k(0)) * 20);
    this.font(150, 800, FH);
    g.fillStyle = C.white;
    g.globalAlpha = a * k(0.2);
    const tl = title.split("\n");
    tl.forEach((l, i) => g.fillText(l, x - 6, 480 + i * 140 + (1 - k(0.2 + i * 0.1)) * 30));
    const yy = 480 + tl.length * 140 - 40;
    g.globalAlpha = a * k(0.6);
    g.fillStyle = C.accent;
    g.fillRect(x, yy, 520 * k(0.6), 8);
    this.font(44, 500, FB);
    g.fillStyle = C.dim;
    g.fillText(sub, x, yy + 70);
    const sx = x, sy = this.H - 150;
    series.forEach((s, i) => {
      const kk = k(0.9 + i * 0.12);
      g.globalAlpha = a * kk * (i === ep - 1 ? 1 : 0.55);
      const bx = sx + i * 330;
      g.fillStyle = i === ep - 1 ? C.accent : "rgba(255,255,255,0.18)";
      g.fillRect(bx, sy, 300, 6);
      this.font(28, 700, FH);
      g.fillStyle = i === ep - 1 ? C.white : "rgba(255,255,255,0.8)";
      g.fillText(`${i + 1}  ${up(s)}`, bx, sy + 44);
    });
    g.restore();
  }
  // stat card
  cardHeight(w, { kicker, value, text, src }) {
    let h = 52;
    if (kicker) h += 14;
    if (value) h += 96;
    if (text) {
      this.font(28, 500, FB);
      h += this.wrap(text, w - 66).length * 36 + 14;
    }
    if (src) h += 30;
    return h + 16;
  }
  card(x, y, w, h, a, slide, { kicker, value, unit, text, color = C.accent, src }) {
    if (a <= 0) return;
    if (!h) h = this.cardHeight(w, { kicker, value, text, src });
    const g = this.g;
    g.save();
    g.globalAlpha = a;
    g.translate(0, (1 - easeOut(slide)) * 40);
    g.fillStyle = "rgba(12,14,16,0.78)";
    this.rr(x, y, w, h, 14);
    g.fill();
    g.strokeStyle = "rgba(255,255,255,0.10)";
    g.lineWidth = 1.5;
    this.rr(x, y, w, h, 14);
    g.stroke();
    g.fillStyle = color;
    g.fillRect(x, y + 18, 6, h - 36);
    let cy = y + 52;
    if (kicker) {
      this.font(24, 700, FH);
      g.fillStyle = color;
      g.fillText(up(kicker), x + 34, cy);
      cy += 14;
    }
    if (value) {
      this.font(86, 800, FH);
      g.fillStyle = C.white;
      g.fillText(value, x + 32, cy + 72);
      const vw = g.measureText(value).width;
      if (unit) {
        this.font(36, 700, FH);
        g.fillStyle = color;
        g.fillText(unit, x + 40 + vw, cy + 72);
      }
      cy += 96;
    }
    if (text) {
      this.font(28, 500, FB);
      g.fillStyle = C.dim;
      const ls = this.wrap(text, w - 66);
      ls.forEach((l, i) => this.justify(l, x + 34, cy + 22 + i * 36, w - 66, i === ls.length - 1));
      cy += ls.length * 36;
    }
    if (src) {
      this.font(18, 500, FB);
      g.fillStyle = "rgba(255,255,255,0.4)";
      g.fillText(src, x + 34, y + h - 22);
    }
    g.restore();
  }
  // sorkizárt sor: a sima szóközök egyenletes elosztásával (az utolsó sor balra zárt)
  justify(line, x, y, maxW, last) {
    const g = this.g, ws = line.split(" ");
    if (last || ws.length < 2) { g.fillText(line, x, y); return; }
    const wd = ws.map((w) => g.measureText(w).width), tot = wd.reduce((a, b) => a + b, 0), gap = (maxW - tot) / (ws.length - 1), sp = g.measureText(" ").width;
    if (gap > sp * 3.2 || gap < 0) { g.fillText(line, x, y); return; }
    let cx = x; ws.forEach((w, i) => { g.fillText(w, cx, y); cx += wd[i] + gap; });
  }
  rr(x, y, w, h, r) {
    const g = this.g;
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
  // label anchored to a screen point with a leader line
  label(sx, sy, text, a, { dx = 120, dy = -80, color = C.accent, size = 32, sub = null, align = null } = {}) {
    if (a <= 0 || !isFinite(sx)) return;
    const g = this.g;
    g.save();
    g.globalAlpha = a;
    const ex = sx + dx, ey = sy + dy;
    g.strokeStyle = color;
    g.lineWidth = 2.5;
    g.beginPath();
    g.moveTo(sx, sy);
    g.lineTo(ex, ey);
    g.stroke();
    g.fillStyle = color;
    g.beginPath();
    g.arc(sx, sy, 7, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "rgba(255,255,255,0.8)";
    g.lineWidth = 2;
    g.beginPath();
    g.arc(sx, sy, 12 + 3 * Math.sin(a * 3), 0, Math.PI * 2);
    g.stroke();
    this.font(size, 700, FH);
    const lines = text.split("\n");
    const subl = sub ? sub.split("\n") : [];
    let wmax = Math.max(...lines.map((l) => this.rw(l)));
    this.font(size * 0.68, 500, FB);
    if (subl.length) wmax = Math.max(wmax, ...subl.map((l) => this.rw(l)));
    const right = align ? align === "right" : dx >= 0;
    const bw = wmax + 36, bh = lines.length * size * 1.05 + subl.length * size * 0.82 + 22;
    const bx = right ? ex : ex - bw, by = ey - bh / 2;
    g.fillStyle = "rgba(10,12,14,0.82)";
    this.rr(bx, by, bw, bh, 10);
    g.fill();
    g.fillStyle = color;
    g.fillRect(right ? bx : bx + bw - 5, by, 5, bh);
    this.font(size, 700, FH);
    g.fillStyle = C.white;
    g.textBaseline = "top";
    lines.forEach((l, i) => this.rt(l, bx + 18, by + 12 + i * size * 1.05));
    this.font(size * 0.68, 500, FB);
    g.fillStyle = C.dim;
    subl.forEach((l, i) => this.rt(l, bx + 18, by + 14 + lines.length * size * 1.05 + i * size * 0.82));
    g.restore();
  }
  // simple text tag without leader
  tag(x, y, text, a, color = C.accent, size = 30, align = "left") {
    if (a <= 0) return;
    const g = this.g;
    g.save();
    g.globalAlpha = a;
    this.font(size, 700, FH);
    const w = this.rw(text) + 30, h = size + 18;
    const bx = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
    g.fillStyle = "rgba(10,12,14,0.8)";
    this.rr(bx, y, w, h, 8);
    g.fill();
    g.fillStyle = color;
    g.fillRect(bx, y, 5, h);
    g.fillStyle = C.white;
    g.textBaseline = "middle";
    this.rt(text, bx + 16, y + h / 2 + 1);
    g.restore();
  }
  arrow(x0, y0, x1, y1, a, color = C.water, w = 8, head = 22) {
    if (a <= 0) return;
    const g = this.g;
    g.save();
    g.globalAlpha = a;
    g.strokeStyle = color;
    g.fillStyle = color;
    g.lineWidth = w;
    g.lineCap = "round";
    const ang = Math.atan2(y1 - y0, x1 - x0);
    g.beginPath();
    g.moveTo(x0, y0);
    g.lineTo(x1 - Math.cos(ang) * head * 0.8, y1 - Math.sin(ang) * head * 0.8);
    g.stroke();
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x1 - Math.cos(ang - 0.45) * head, y1 - Math.sin(ang - 0.45) * head);
    g.lineTo(x1 - Math.cos(ang + 0.45) * head, y1 - Math.sin(ang + 0.45) * head);
    g.closePath();
    g.fill();
    g.restore();
  }
  progress(t, total, chapters, a = 1) {
    const g = this.g;
    g.save();
    g.globalAlpha = a;
    const y = this.H - 14, x0 = 0, w = this.W;
    g.fillStyle = "rgba(255,255,255,0.12)";
    g.fillRect(x0, y, w, 4);
    g.fillStyle = C.accent;
    g.fillRect(x0, y, w * clamp2(t / total), 4);
    this.font(17, 700, FH);
    g.textBaseline = "bottom";
    chapters.forEach(([t0, name]) => {
      const cx = x0 + w * t0 / total;
      g.fillStyle = "rgba(0,0,0,0.6)";
      g.fillRect(cx - 1, y - 6, 3, 10);
      g.fillStyle = t >= t0 ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.35)";
      g.fillText(up(name), cx + 8, y - 4);
    });
    g.restore();
  }
  // ===== Mélyalapozás-sorozat kiegészítései =====
  // nagy, ütemre becsapódó szó (méretezés + kromatikus szétcsúszás + rázkódás)
  slam(text, p, a, { x = this.W / 2, y = 540, size = 170, color = C.white, box = null, rot = -0.02, sub = null, subColor = C.accent, align = 'center' } = {}) {
    if (a <= 0 || p < 0) return;
    const g = this.g;
    const k = clamp(p / 0.22);
    const s = 1 + (1 - easeOut(k)) * 0.55;
    const ca = (1 - easeOut(clamp(p / 0.35))) * 18;
    const jit = (1 - k) * 10;
    g.save();
    g.translate(x + Math.sin(p * 90) * jit, y + Math.cos(p * 70) * jit * 0.6);
    g.rotate(rot * (1 - easeOut(clamp(p / 0.5))) * 3 + rot);
    g.scale(s, s);
    this.font(size, 800, FH);
    g.textAlign = align; g.textBaseline = 'middle';
    const w = g.measureText(text).width;
    if (box) {
      const pad = size * 0.16, bx = align === 'center' ? -w / 2 - pad : align === 'right' ? -w - pad : -pad;
      g.globalAlpha = a * clamp(p / 0.08);
      g.fillStyle = box;
      g.fillRect(bx, -size * 0.58, w + 2 * pad, size * 1.08);
    }
    if (ca > 0.4 && !box) {
      g.globalCompositeOperation = 'lighter';
      g.globalAlpha = a * 0.7;
      g.fillStyle = '#ff2a3a'; g.fillText(text, -ca, 0);
      g.fillStyle = '#20e0ff'; g.fillText(text, ca, 0);
      g.globalCompositeOperation = 'source-over';
    }
    g.globalAlpha = a;
    g.shadowColor = 'rgba(0,0,0,0.55)'; g.shadowBlur = box ? 0 : 30;
    g.fillStyle = box ? C.ink : color;
    g.fillText(text, 0, 0);
    if (sub) {
      g.shadowBlur = 12;
      this.font(size * 0.26, 700, FH);
      g.fillStyle = subColor;
      g.globalAlpha = a * clamp((p - 0.15) / 0.3);
      const sy = size * 0.72;
      g.fillText(up(sub), align === 'center' ? 0 : 0, sy);
    }
    g.restore();
  }
  letterbox(a, h = 120) {
    if (a <= 0) return;
    const g = this.g; g.save(); g.fillStyle = '#000';
    g.fillRect(0, 0, this.W, h * a); g.fillRect(0, this.H - h * a, this.W, h * a); g.restore();
  }
  flash(a, color = '#fff') { if (a <= 0) return; const g = this.g; g.save(); g.globalAlpha = clamp(a); g.globalCompositeOperation = 'lighter'; g.fillStyle = color; g.fillRect(0, 0, this.W, this.H); g.restore(); }
  // lépés-chipek (bal felső sarok)
  steps(t, steps, a) {
    if (a <= 0) return;
    const g = this.g; g.save(); g.globalAlpha = a;
    let x = 64; const y = 56, h = 46;
    this.font(24, 800, FH);
    for (const s of steps) {
      const act = t >= s.t0 && t < s.t1, done = t >= s.t1;
      const label = act ? `${s.n}  ${up(s.name)}` : `${s.n}`;
      const w = act ? g.measureText(label).width + 40 : 46;
      const k = act ? easeOutBack(clamp((t - s.t0) / 0.35)) : 1;
      g.fillStyle = act ? C.accent : done ? 'rgba(240,163,58,0.28)' : 'rgba(10,12,14,0.72)';
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
  }
  // számlálók (jobb felső sarok): [{k:'MÉLYSÉG', v:'−8,4', u:'m', hi:true}]
  hud(items, a, pulse = 0, { x = this.W - 64, y = 56 } = {}) {
    if (a <= 0) return;
    const g = this.g; g.save(); g.globalAlpha = a;
    const colW = 230, h = 112, n = items.length, W = colW * n + 16 * (n - 1);
    let bx = x - W;
    for (let i = 0; i < n; i++) {
      const it = items[i];
      const pz = it.pulse ? pulse : 0;
      g.save();
      g.translate(bx + colW / 2, y + h / 2); g.scale(1 + pz * 0.08, 1 + pz * 0.08); g.translate(-(bx + colW / 2), -(y + h / 2));
      g.fillStyle = 'rgba(10,12,14,0.78)'; this.rr(bx, y, colW, h, 14); g.fill();
      g.fillStyle = it.color || (it.hi ? C.accent : 'rgba(255,255,255,0.25)'); g.fillRect(bx, y + 16, 5, h - 32);
      this.font(22, 700, FH); g.fillStyle = it.color || C.accent; g.textBaseline = 'alphabetic'; g.textAlign = 'left';
      this.rt(it.k.includes('_') ? it.k : up(it.k), bx + 24, y + 34);
      this.font(60, 800, FH); g.fillStyle = C.white;
      const vw = g.measureText(it.v).width; g.fillText(it.v, bx + 22, y + 94);
      if (it.u) { this.font(28, 700, FH); g.fillStyle = 'rgba(255,255,255,0.7)'; this.rt(it.u, bx + 30 + vw, y + 94); }
      g.restore();
      bx += colW + 16;
    }
    g.restore();
  }
  // címkártya – mélyalapozási sorozat
  titleCard(p, a, { kicker, title, sub, chips = [], activeChip = -1 }) {
    if (a <= 0) return;
    const g = this.g; g.save(); g.globalAlpha = a;
    const grd = g.createLinearGradient(0, 0, this.W * 0.8, 0);
    grd.addColorStop(0, 'rgba(6,7,9,0.86)'); grd.addColorStop(0.7, 'rgba(6,7,9,0.25)'); grd.addColorStop(1, 'rgba(6,7,9,0)');
    g.fillStyle = grd; g.fillRect(0, 0, this.W, this.H);
    const x = 140, k = (d, dur = 0.5) => easeOut(clamp((p - d) / dur));
    this.font(30, 700, FH); g.fillStyle = C.accent; g.globalAlpha = a * k(0.05);
    g.fillText(up(kicker), x, 256 + (1 - k(0.05)) * 20); // az ékezetes nagybetű (Ü, Ő, É) feletti hely szabad marad
    // főcím: becsapódás
    const tl = title.split('\n');
    tl.forEach((l, i) => {
      const kk = clamp((p - i * 0.12) / 0.2), s = 1 + (1 - easeOut(kk)) * 0.4;
      g.save(); g.globalAlpha = a * clamp(kk * 3);
      g.translate(x - 6, 450 + i * 150); g.scale(s, s);
      this.font(176, 800, FH);
      const ca = (1 - easeOut(clamp((p - i * 0.12) / 0.4))) * 16;
      if (ca > 0.5) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = a * 0.6; g.fillStyle = '#ff2a3a'; g.fillText(l, -ca, 0); g.fillStyle = '#20e0ff'; g.fillText(l, ca, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = a * clamp(kk * 3); }
      g.fillStyle = C.white; g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 30; g.fillText(l, 0, 0);
      g.restore();
    });
    const yy = 450 + (tl.length - 1) * 150 + 50;
    g.globalAlpha = a * k(0.45); g.fillStyle = C.accent; g.fillRect(x, yy, 560 * k(0.45, 0.7), 9);
    this.font(44, 500, FB); g.fillStyle = C.dim; g.globalAlpha = a * k(0.65);
    g.fillText(sub, x, yy + 74);
    // technológia-chipek
    let cx = x; const cy = this.H - 160;
    chips.forEach((c, i) => {
      const kk = k(1.0 + i * 0.1); g.globalAlpha = a * kk * (i === activeChip ? 1 : 0.6);
      this.font(28, 700, FH);
      const w = g.measureText(up(c)).width + 36;
      g.fillStyle = i === activeChip ? C.accent : 'rgba(255,255,255,0.14)';
      this.rr(cx, cy + (1 - kk) * 20, w, 50, 10); g.fill();
      g.fillStyle = i === activeChip ? C.ink : 'rgba(255,255,255,0.85)'; g.textBaseline = 'middle';
      g.fillText(up(c), cx + 18, cy + 26 + (1 - kk) * 20); g.textBaseline = 'alphabetic';
      cx += w + 14;
    });
    g.restore();
  }
  // felsorolás (összefoglaló / előny-hátrány), elemenként ütemre
  list(x, y, w, items, t0s, t, a, { title = null, color = C.accent, size = 34, mark = '•' } = {}) {
    if (a <= 0) return;
    const g = this.g; g.save(); g.globalAlpha = a;
    let h = 40 + items.length * (size * 1.5) + (title ? 56 : 0);
    g.fillStyle = 'rgba(10,12,14,0.80)'; this.rr(x, y, w, h, 16); g.fill();
    g.fillStyle = color; g.fillRect(x, y + 18, 6, h - 36);
    let cy = y + 30;
    if (title) { this.font(30, 800, FH); g.fillStyle = color; g.textBaseline = 'top'; g.fillText(up(title), x + 34, cy); cy += 56; }
    items.forEach((it, i) => {
      const k = clamp((t - t0s[i]) / 0.3);
      if (k <= 0) { cy += size * 1.5; return; }
      g.globalAlpha = a * smooth(k);
      const dx = (1 - easeOut(k)) * 40;
      this.font(size, 800, FH); g.fillStyle = color; g.textBaseline = 'top';
      g.fillText(mark, x + 34 + dx, cy);
      this.font(size * 0.86, 600, FB); g.fillStyle = C.white;
      this.rt(it, x + 34 + size * 1.0 + dx, cy + size * 0.08);
      cy += size * 1.5;
    });
    g.restore();
    return h;
  }
}
