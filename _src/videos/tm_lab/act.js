// Talajmechanikai laborok – laboráns-koreográfia (2026-11-11)
// - Tárgyak (props): időfüggő helyzet kulcskockákból (sima átmenet, emelés–átvitel–letétel ív), a labor helyi rendszerében.
// - Kézfogások időszakokra (hold): a fogás a tárgy helyi rendszerében adott, így együtt mozog a tárggyal.
// - Átmenetek: elengedés → kéz hátra/fel → odanyúlás a tenyér normálisa mentén → megfogás; közben az ujjak kinyílnak, majd zárnak.
//   Rövid szünetnél a kéz közvetlenül megy át a következő fogásra (íven), hosszabbnál lazán leengedi.
// - Test: állomások közti járás (érkezési idő szerint), automatikus előrehajlás, hogy a kar ne nyúljon túl, nézés a dolgozó kézre.
// Minden függvény az időnek tiszta függvénye (bármely időpont önállóan kiszámítható – a renderelés ugrálhat).
import * as THREE from 'three';
import { defineFingerPose } from '../../kit/human.js';
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const sm = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const sm5 = (x) => { x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10); };
const lerp = (a, b, k) => a + (b - a) * k;
const toV = (a) => (a && a.isVector3) ? a.clone() : V(a[0], a[1], a[2]);
const qE = (r) => new THREE.Quaternion().setFromEuler(new THREE.Euler(r[0] || 0, r[1] || 0, r[2] || 0, 'YXZ'));

// ---------------- ujjpózok ----------------
const POSES = new Set();
export function pose(name, spec) { if (!POSES.has(name)) { defineFingerPose(name, spec); POSES.add(name); } return name; }
export function stdPoses() {
  pose('relax', { flex: { I: [0.25, 0.3, 0.15], M: [0.3, 0.35, 0.18], R: [0.35, 0.38, 0.2], P: [0.4, 0.4, 0.2] }, thumb: 'rest' });
  pose('open', { flex: { I: [0.05, 0.08, 0.04], M: [0.06, 0.08, 0.04], R: [0.08, 0.1, 0.05], P: [0.1, 0.12, 0.06] }, thumb: 'rest' });
  pose('flat', { flex: { I: [-0.05, 0.03, 0.02], M: [-0.04, 0.03, 0.02], R: [-0.02, 0.04, 0.02], P: [0.0, 0.05, 0.03] }, thumb: 'rest' });
  pose('pinch', { flex: { I: [0.55, 0.55, 0.3], M: [0.75, 0.8, 0.45], R: [0.95, 1.0, 0.55], P: [1.05, 1.05, 0.6] }, thumb: { pinch: 0.016, to: 'I' } });
  pose('pinch2', { flex: { I: [0.45, 0.5, 0.28], M: [0.5, 0.55, 0.3], R: [0.9, 1.0, 0.55], P: [1.0, 1.05, 0.6] }, thumb: { pinch: 0.03, to: 'I' } });
  pose('point', { flex: { I: [0.05, 0.08, 0.05], M: [1.2, 1.3, 0.7], R: [1.25, 1.35, 0.7], P: [1.3, 1.35, 0.7] }, thumb: { tgt: [0.09, 0.0, 0.05] } });
  return POSES; }
// henger körülfogása r sugárral (5 mm-es lépcsőkben gyorsítótárazva)
export function wrapPose(r) { const k = Math.max(4, Math.round(r * 200)) / 200; const nm = 'w' + Math.round(k * 1000); return pose(nm, { wrap: k, thumb: { wrap: k } }); }

// ---------------- tárgyak ----------------
// keys: [{ t, p:[x,y,z], r:[rx,ry,rz], lift?: m (emelés–átvitel–letétel), from?: indulás ideje }]
export function keyed(keys) {
  const K = keys.map(k => ({ ...k, P: toV(k.p), Q: qE(k.r || [0, 0, 0]) })).sort((a, b) => a.t - b.t);
  return (t) => {
    if (t <= K[0].t) return { p: K[0].P.clone(), q: K[0].Q.clone() };
    const n = K.length; if (t >= K[n - 1].t) return { p: K[n - 1].P.clone(), q: K[n - 1].Q.clone() };
    let i = 0; while (i < n - 2 && K[i + 1].t <= t) i++; const A = K[i], B = K[i + 1]; const t0 = B.from !== undefined ? Math.max(A.t, B.from) : A.t;
    if (t <= t0) return { p: A.P.clone(), q: A.Q.clone() };
    const s = clamp((t - t0) / (B.t - t0));
    if (B.lift) { const u = sm(s / 0.3), w = sm((s - 0.22) / 0.56), d = sm((s - 0.7) / 0.3); const top = Math.max(A.P.y, B.P.y) + B.lift;
      const p = V(lerp(A.P.x, B.P.x, w), A.P.y + (top - A.P.y) * u - (top - B.P.y) * d, lerp(A.P.z, B.P.z, w)); return { p, q: A.Q.clone().slerp(B.Q, w) }; }
    const k = sm5(s); return { p: A.P.clone().lerp(B.P, k), q: A.Q.clone().slerp(B.Q, k) };
  };
}
export const still = (p, r = [0, 0, 0]) => { const P = toV(p), Q = qE(r); return () => ({ p: P.clone(), q: Q.clone() }); };

// ---------------- koreográfia ----------------
export class Choreo {
  constructor(L) { this.L = L; this.props = {}; this.segs = { L: [], R: [] }; this.body = []; this.vis = {}; }
  // tárgy: obj (a labor csoportjában), pose(t) → { p, q } labor-helyi
  prop(name, obj, poseFn, vis) { this.props[name] = { obj, pose: poseFn }; if (vis) this.vis[name] = vis; return obj; }
  propPose(name, t) { return this.props[name].pose(t); }
  update(t) { for (const k in this.props) { const P = this.props[k]; const s = P.pose(t); P.obj.position.copy(s.p); P.obj.quaternion.copy(s.q); if (this.vis[k]) P.obj.visible = this.vis[k](t); } }
  // labor-helyi → világ mátrix egy tárgyra
  M(name, t) { const s = this.propPose(name, t); const m = new THREE.Matrix4().compose(s.p, s.q, V(1, 1, 1)); this.L.G.updateMatrixWorld(true); return this.L.G.matrixWorld.clone().multiply(m); }
  // fogás: g a tárgy helyi rendszerében (grips2.js: { W, F, P, fingers, pole }); prop: a tárgy neve (null: labor-helyi, rögzített)
  hold(side, a, b, prop, g) { this.segs[side].push({ a, b, prop, g }); this.segs[side].sort((x, y) => x.a - y.a); return this; }
  // időfüggő fogás: fn(t) → g (labor-helyi vagy prop-helyi), pl. forgatott tekerőgomb
  holdF(side, a, b, prop, fn) { this.segs[side].push({ a, b, prop, fn }); this.segs[side].sort((x, y) => x.a - y.a); return this; }
  // test: érkezési kulcsok { t, x, z, ry?, lean? } (labor-helyi); lean: null → automatikus
  at(t, x, z = -0.6, o = {}) { this.body.push({ t, x, z, ry: o.ry ?? Math.PI, lean: o.lean ?? null, spd: o.spd ?? 0.75, squat: o.squat ?? 0 }); this.body.sort((a, b) => a.t - b.t); return this; }
  bodyAt(t) { const K = this.body; if (!K.length) return { x: 0, z: -0.6, ry: Math.PI, lean: null, auto: true };
    if (t <= K[0].t) return { ...K[0], auto: K[0].lean === null }; let i = 0; while (i < K.length - 1 && K[i + 1].t <= t) i++; if (i >= K.length - 1) { const k = K[K.length - 1]; return { ...k, auto: k.lean === null }; }
    const A = K[i], B = K[i + 1]; const d = Math.hypot(B.x - A.x, B.z - A.z); const dur = Math.max(0.6, d / B.spd + 0.3); const t0 = Math.max(A.t, B.t - dur); const s = sm((t - t0) / (B.t - t0));
    return { x: lerp(A.x, B.x, s), z: lerp(A.z, B.z, s), ry: lerp(A.ry, B.ry, s), lean: lerp(A.lean ?? 0, B.lean ?? 0, s), squat: lerp(A.squat || 0, B.squat || 0, s), auto: A.lean === null || B.lean === null }; }
  specW(seg, t) { const g = seg.fn ? seg.fn(t) : seg.g; let M; if (seg.prop) M = this.M(seg.prop, t); else { this.L.G.updateMatrixWorld(true); M = this.L.G.matrixWorld; }
    const o = { W: g.W.clone().applyMatrix4(M), F: g.F.clone().transformDirection(M).normalize(), P: g.P.clone().transformDirection(M).normalize(), fingers: g.fingers, pole: g.pole ? g.pole.clone() : null };
    if (g.tips) { o.tips = {}; for (const c in g.tips) o.tips[c] = g.tips[c].clone().applyMatrix4(M); }
    if (g.free) o.free = { ax: g.free.ax.clone().transformDirection(M).normalize(), c: g.free.c.clone().applyMatrix4(M), a0: g.free.a0, a1: g.free.a1, minDy: g.free.minDy }; return o; }
  // a váll helye (labor-helyi) egy időpontban a test kulcsai szerint; a fogások „célzása” ebből: a kéz a váll felől a tárgy felé mutat
  shoulderAt(side, t) { const b = this.bodyAt(t); const sq = b.squat || 0; const l = V(side === 'L' ? 0.19 : -0.19, 1.36 - sq, 0.02 - 0.42 * sq).applyAxisAngle(V(0, 1, 0), b.ry); return l.add(V(b.x, 0, b.z)); }
  aimLab(side, t, p) { const d = toV(p).sub(this.shoulderAt(side, t)); d.y = 0; return d.lengthSq() < 1e-8 ? V(0, 0, -1) : d.normalize(); }
  // ugyanez egy tárgy helyi rendszerében (pLocal: a fogáspont a tárgyon)
  aimLocal(side, prop, t, pLocal) { const s = this.propPose(prop, t); const pL = toV(pLocal).applyQuaternion(s.q).add(s.p); return this.aimLab(side, t, pL).applyQuaternion(s.q.clone().invert()); }
  // készenléti pont: a has előtt, az asztallap fölött (a laboráns helyi rendszerében) – innen nyúl a tárgyért, ide húzza vissza a kezét
  ready(side, wk, t) { if (!wk) return null; const sq = this.bodyAt(t).squat || 0; return wk.localToWorld(V(side === 'L' ? 0.16 : -0.16, 1.02 - 0.5 * sq, 0.26 - 0.2 * sq)); }
  hand(side, t, wk) {
    // guggolásban a szabad kéz nem lóg le (a tárcsák, az állvány közé): a térde fölött, a teste előtt tartja
    const sqNow = wk ? (this.bodyAt(t).squat || 0) : 0, idleW = clamp((sqNow - 0.15) / 0.1);
    const idle = () => { if (idleW <= 0) return null; const m = wk.matrixWorld; return { W: this.ready(side, wk, t), F: V(0, -0.55, 0.85).transformDirection(m), P: V(side === 'L' ? -0.8 : 0.8, -0.6, 0).transformDirection(m), w: idleW, fingers: 'relax', pole: null }; };
    const Ls = this.segs[side]; if (!Ls.length) return idle();
    const cur = Ls.find(s => t >= s.a && t <= s.b); if (cur) { const o = this.specW(cur, t); o.w = 1; return o; }
    let prev = null, next = null; for (const s of Ls) { if (s.b < t) prev = s; if (s.a > t && !next) next = s; }
    const APP = 0.9, RET = 0.7, DIRECT = 1.0;
    const mixFree = (a, b, u) => { if (!a && !b) return null; const n = { ax: V(), c: V(), a0: 0, a1: 0 }; const fa = a || { ax: b.ax, c: b.c, a0: 0, a1: 0 }, fb = b || { ax: a.ax, c: a.c, a0: 0, a1: 0 };
      const bx = fb.ax.dot(fa.ax) < 0 ? fb.ax.clone().negate() : fb.ax; const s = fb.ax.dot(fa.ax) < 0 ? -1 : 1;
      n.ax.copy(fa.ax).lerp(bx, u).normalize(); n.c.copy(fa.c).lerp(fb.c, u); n.a0 = lerp(fa.a0, s > 0 ? fb.a0 : -fb.a1, u); n.a1 = lerp(fa.a1, s > 0 ? fb.a1 : -fb.a0, u); if (fa.minDy !== undefined || fb.minDy !== undefined) n.minDy = lerp(fa.minDy ?? 0, fb.minDy ?? 0, u); return n; };
    const mix = (A, B, u) => ({ W: A.W.clone().lerp(B.W, u), F: A.F.clone().lerp(B.F, u).normalize(), P: A.P.clone().lerp(B.P, u).normalize(), pole: A.pole && B.pole ? A.pole.clone().lerp(B.pole, u) : (A.pole || B.pole), free: mixFree(A.free, B.free, u) });
    if (prev && next && next.a - prev.b <= DIRECT) { // közvetlen átmenet: hátra a tenyér mentén, íven át, előre a következő fogásra
      const A = this.specW(prev, prev.b), B = this.specW(next, next.a); const s = (t - prev.b) / (next.a - prev.b), u = sm5(s);
      const o = mix(A, B, u); const back = 0.05 * Math.sin(Math.PI * clamp(s)); o.W.addScaledVector(A.P.clone().lerp(B.P, u).normalize(), -back).add(V(0, 0.045 * Math.sin(Math.PI * s), 0)); o.w = 1;
      o.fingers = s < 0.5 ? { a: A.fingers || 'relax', b: 'open', k: sm(s / 0.35) } : { a: 'open', b: B.fingers || 'relax', k: sm((s - 0.65) / 0.35) }; return o; }
    if (next && next.a - t < APP) { // odanyúlás: a készenléti pontból (az asztal fölött) a tárgy fölé, majd rá (főleg felülről); az ujjak az utolsó szakaszban zárnak
      const B = this.specW(next, next.a); const u = 1 - (next.a - t) / APP; const o = { ...B, W: B.W.clone() };
      const ph = B.P.clone().setY(0); const pre = B.W.clone().addScaledVector(ph, -0.09).add(V(0, 0.11 - 0.03 * ph.length(), 0)); const rdy = this.ready(side, wk, t);
      if (rdy && u < 0.6) o.W.copy(rdy).lerp(pre, sm5(u / 0.6)); else o.W.copy(pre).lerp(B.W, sm5(rdy ? (u - 0.6) / 0.4 : u));
      o.w = Math.max(idleW, rdy ? sm(u / 0.3) : sm(u / 0.7)); o.fingers = u < 0.55 ? 'relax' : { a: 'relax', b: B.fingers || 'relax', k: sm((u - 0.55) / 0.45) }; return o; }
    if (prev && t - prev.b < RET) { // elengedés: kinyit, hátra-fel a tenyér mentén, majd vissza a készenléti pontba és leengedi
      const A = this.specW(prev, prev.b); const u = (t - prev.b) / RET; const o = { ...A, W: A.W.clone() };
      const back = A.W.clone().addScaledVector(A.P.clone().setY(0), -0.035).add(V(0, 0.075, 0)); const rdy = this.ready(side, wk, t);
      if (u < 0.4 || !rdy) o.W.lerp(back, sm(u / 0.4)); else o.W.copy(back).lerp(rdy, sm((u - 0.4) / 0.35));
      o.w = Math.max(idleW, rdy ? 1 - sm((u - 0.72) / 0.28) : 1 - sm((u - 0.35) / 0.65)); o.fingers = { a: A.fingers || 'relax', b: 'open', k: sm(u / 0.35) }; return o; }
    return idle();
  }
  // a laboráns beállítása: test, kezek, előrehajlás, nézés
  apply(t, w, extra = {}) {
    const L = this.L, b = this.bodyAt(t); w.position.set(b.x, 0, b.z); w.rotation.y = b.ry; w.updateWorldMatrix(true, false); L.G.updateMatrixWorld(true);
    const r = { look: 0.25, squat: b.squat || 0 }; const hs = {}; for (const sd of ['L', 'R']) { const h = this.hand(sd, t, w); if (h && h.w > 0.001) hs[sd] = h; }
    let lean = b.lean ?? 0;
    if (b.auto !== false) { // automatikus előrehajlás: a csukló legfeljebb ~0,47 m-re a vállától
      // a törzs dőlése (kit/human.js): csípő 0,35 + alsó gerinc 0,4 + felső gerinc 0,25 → a váll előremozdulása ≈ egy 0,12 m-rel a csípő fölötti forgáspont körüli elfordulás
      // cél: a csukló ~0,44 m-re a vállától, hogy a könyöknek maradjon mozgástere (a kar-megoldó így természetes csuklóállást talál)
      const sq = b.squat || 0; const sh = { L: V(0.19, 1.39 - sq, 0.02 - 0.42 * sq), R: V(-0.19, 1.39 - sq, 0.02 - 0.42 * sq) }, hip = V(0, 1.07 - sq, -0.42 * sq); let need = 0.02;
      for (const sd in hs) { const wr = w.worldToLocal(hs[sd].W.clone()); const wk = Math.min(1, hs[sd].w * 1.6); for (let k = 0; k <= 32; k++) { const ln = k * 0.02; const s2 = sh[sd].clone().sub(hip).applyAxisAngle(V(1, 0, 0), ln).add(hip); if (s2.distanceTo(wr) <= 0.44 || k === 32) { need = Math.max(need, ln * wk); break; } } }
      lean = Math.max(lean, need); }
    r.lean = Math.min(0.62, lean + (extra.lean ?? 0));    // (a reach.lean: kit/human.js, a törzs teljes dőlése ~1 rad/egység)
    for (const sd in hs) { const h = hs[sd]; r[sd] = { W: h.W, F: h.F, palm: h.P, contact: h.W.clone().addScaledVector(h.F, 0.065).addScaledVector(h.P, 0.028), w: h.w, fingers: h.fingers, curl: 0.8, free: h.free || null,
      pole: h.pole || (sd === 'L' ? V(0.9, -0.42, -0.1) : V(-0.9, -0.42, -0.1)), _tips: h.tips }; r[sd].local = w.worldToLocal(r[sd].contact.clone()); }
    const act = hs.R || hs.L; if (act) { const head = w.localToWorld(V(0, 1.62, 0.05)); const c = act.W.clone().addScaledVector(act.F, 0.1); const d = c.sub(head); const hz = Math.hypot(d.x, d.z); r.look = clamp(Math.atan2(-d.y, Math.max(0.15, hz)) - r.lean * 0.9, -0.2, 0.9); }
    if (extra.look !== undefined) r.look = extra.look;
    if (typeof window !== 'undefined' && window.__dbgTips) { if (!this._mk) { this._mk = []; for (let i = 0; i < 10; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.004, 10, 8), new THREE.MeshBasicMaterial({ color: i < 5 ? 0xff2020 : 0x20ff40, depthTest: false })); m.renderOrder = 99; this.L.G.parent.add(m); this._mk.push(m); } }
      this._mk.forEach(m => m.visible = false); let i = 0; for (const sd of ['L', 'R']) { const h = hs[sd]; if (!h || !h.tips) { i += 5; continue; } for (const c of 'TIMRP') { const m = this._mk[i++]; if (h.tips[c]) { m.position.copy(h.tips[c]); m.visible = true; } } } }
    w.userData.reach = r; return r;
  }
}
