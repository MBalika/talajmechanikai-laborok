// Közös segédfüggvények (a térfogatváltozó-videó util.js-éből bővítve)
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
export const ease = (t) => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
export const easeOut = (t) => { t = clamp(t); return 1 - Math.pow(1 - t, 3); };
export const easeIn = (t) => { t = clamp(t); return t * t * t; };
export const easeOutBack = (t, s = 1.7) => { t = clamp(t); const u = t - 1; return 1 + (s + 1) * u * u * u + s * u * u; };
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const win = (t, a, b, fi = 0.5, fo = 0.5) => {
  if (t <= a || t >= b) return 0;
  return Math.min(smooth((t - a) / fi), smooth((b - t) / fo));
};
export function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
export const hash = (i, k = 0) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
// magyar számformátum
export const fmt = (v, d = 1) => (Math.round(v * 10 ** d) / 10 ** d).toFixed(d).replace('.', ',').replace('-', '−');

// ---------- alsó indexek: "H_d", "R_{p;d}" jelölés ----------
// rich-szöveg nélküli változat (karakterszámláláshoz)
export const stripRich = (s) => String(s).replace(/_\{([^}]*)\}/g, '$1').replace(/_(.)/g, '$1');
// nagybetűsítés, amely a jelöléseket (index, vessző-jel, görög betű, egybetűs szimbólum, mértékegység) nem bántja
const UNITS = new Set(['m', 'cm', 'mm', 'km', 'kN', 'kPa', 'MPa', 'kNm', 'MN', 'MNm', 'mBf', 'm²', 'm³', 't', 's', 'ha']);
export function up(s) {
  return String(s).split(/(\s+)/).map((w) => {
    if (!w || !w.trim()) return w;
    if (/[_′'Ͱ-Ͽ\/·=]/.test(w)) return w;
    const core = w.replace(/[()\[\],.;:!?„”"«»–—\-+]/g, '');
    if (core.length === 1 && /[a-zà-ž]/.test(core) && core !== 'a') return w;
    if (UNITS.has(core)) return w;
    return w.toUpperCase();
  }).join('');
}
// a 2D kontextus fillText/measureText hívásait index-tudatossá teszi
export function richCtx(ctx) {
  if (ctx.__rich) return ctx; ctx.__rich = true;
  const ofill = ctx.fillText.bind(ctx), ostroke = ctx.strokeText.bind(ctx), omeas = ctx.measureText.bind(ctx);
  const parse = (s) => { const out = []; let i = 0, buf = ''; while (i < s.length) { const ch = s[i]; if (ch === '_' && i + 1 < s.length) { if (buf) { out.push({ t: buf, k: 0 }); buf = ''; } if (s[i + 1] === '{') { const j = s.indexOf('}', i + 2); out.push({ t: s.slice(i + 2, j < 0 ? s.length : j), k: 1 }); i = j < 0 ? s.length : j + 1; } else { out.push({ t: s[i + 1], k: 1 }); i += 2; } continue; } buf += ch; i++; } if (buf) out.push({ t: buf, k: 0 }); return out; };
  const fsize = () => { const m = /(\d+(?:\.\d+)?)px/.exec(ctx.font); return m ? +m[1] : 16; };
  const subFont = (f, sz) => f.replace(/(\d+(?:\.\d+)?)px/, (sz * 0.64).toFixed(2) + 'px');
  const width = (parts, f, sz) => { let w = 0; for (const p of parts) { if (p.k) { ctx.font = subFont(f, sz); w += omeas(p.t).width + 1; ctx.font = f; } else w += omeas(p.t).width; } return w; };
  const draw = (fn, s, x, y) => {
    const parts = parse(s), f = ctx.font, sz = fsize(), W = width(parts, f, sz), al = ctx.textAlign, bl = ctx.textBaseline;
    let cx = al === 'center' ? x - W / 2 : (al === 'right' || al === 'end') ? x - W : x;
    const dy = bl === 'top' || bl === 'hanging' ? sz * 0.5 : bl === 'middle' ? sz * 0.3 : sz * 0.2;
    ctx.textAlign = 'left';
    for (const p of parts) { if (p.k) { ctx.font = subFont(f, sz); fn(p.t, cx + 0.5, y + dy); cx += omeas(p.t).width + 1; ctx.font = f; } else { fn(p.t, cx, y); cx += omeas(p.t).width; } }
    ctx.textAlign = al; return W;
  };
  ctx.fillText = (s, x, y, mw) => { s = String(s); if (s.indexOf('_') < 0) return ofill(s, x, y, mw); draw(ofill, s, x, y); };
  ctx.strokeText = (s, x, y, mw) => { s = String(s); if (s.indexOf('_') < 0) return ostroke(s, x, y, mw); draw(ostroke, s, x, y); };
  ctx.measureText = (s) => { s = String(s); if (s.indexOf('_') < 0) return omeas(s); const m = omeas(stripRich(s)); const w = width(parse(s), ctx.font, fsize()); return { width: w, actualBoundingBoxLeft: m.actualBoundingBoxLeft, actualBoundingBoxRight: w, actualBoundingBoxAscent: m.actualBoundingBoxAscent, actualBoundingBoxDescent: m.actualBoundingBoxDescent, fontBoundingBoxAscent: m.fontBoundingBoxAscent, fontBoundingBoxDescent: m.fontBoundingBoxDescent }; };
  return ctx;
}

// ---- formázás: nem törő szóközök vásznon (ugyanazok a szabályok, mint a weben) ----
const NB_ = "\u00A0";
const TERMS_ = ["kedvező esetleges", "kedvezőtlen esetleges", "esetleges teher", "esetleges felborító", "passzív földellenállás", "aktív földnyomás", "tervezési érték", "tervezési értéke", "karakterisztikus érték", "parciális tényező", "általános állékonyság", "belső mag", "hasznos szélesség", "hasznos alapfelület", "drénezetlen nyírószilárdság", "tervezési talajvízszint", "tervezési módszer"];
export function guardStr(t0) {
  if (!t0 || !/ /.test(t0)) return t0;
  let t = t0;
  t = t.replace(/ ([=≤≥<>≈×±→+−\/]) /g, NB_ + "$1" + NB_).replace(/ ([=≤≥<>≈×±→+−\/]) /g, NB_ + "$1" + NB_);
  t = t.replace(/ · (?![A-Za-zÁÉÍÓÖŐÚÜŰáéíóöőúüű]{3})/g, NB_ + "·" + NB_);
  t = t.replace(/(\d) (kN\/m³|kN\/m²|kN\/m|kNm|kPa|MPa|MNm|MN|mBf|m²|m³|mm|cm|km|kN|m|°|%|db|t)(?![\wáéíóöőúüű])/g, "$1" + NB_ + "$2");
  t = t.replace(/(\d) (\d{3})(?!\d)/g, "$1\u202F$2");
  t = t.replace(/\b(tg|ctg|sin|cos|kb\.|pl\.|ill\.|ún\.|max\.|min\.) /g, "$1" + NB_);
  t = t.replace(/(^|[\s(])(a|az|s|e|egy|és|A|Az|Egy) /g, "$1$2" + NB_);
  t = t.replace(/(^|[\s(])(két|kettő|három|négy|öt|hat|hét|nyolc|kilenc|tíz|húsz|száz|ezer|első|második|harmadik|negyedik|ötödik|mindkét|néhány|Két|Három|Négy|Öt|Hat|Hét|Első|Második|Mindkét) /g, "$1$2" + NB_).replace(/(\d) (?=[a-záéíóöőúüű]{2,})/g, "$1" + NB_);
  t = t.replace(/\([^()]{1,24}\)/g, (m) => m.replace(/ /g, NB_)).replace(/-([a-záéíóöőúüű]{1,5})(?=[\s.,;:!?)]|$)/g, "\u2011$1").replace(/\(([^\s()]{1,12}) /g, "($1" + NB_);
  for (const w of TERMS_) t = t.replace(new RegExp(w.replace(/ /g, "[ \u00A0]"), "gi"), (m) => m.replace(/ /g, NB_));
  const parts = t.split(/( · |; )/);
  if (parts.length > 1) t = parts.map((p, i) => (i % 2 === 0 && p.trim().length <= 38) ? p.replace(/ /g, NB_) : p).join("");
  return t;
}
