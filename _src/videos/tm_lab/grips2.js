// Talajmechanikai laborok – pontos kézfogások rögzített kézkerettel (2026-11-11)
// Minden fogás a tárgy helyi rendszerében: csukló (W), ujjirány (F), tenyér-normális (P: a tenyérből a tárgy felé), és az ujjhegyek
// célpontjai (a tárgy felszínén, kissé kívül) – ezekből ujjízület-pózt számolunk (kit/human.js defineFingerPose tips), gyorsítótárazva.
// A kéz méretei (nyugalmi háló alapján): tenyérbőr ~2,8 cm-re a csuklóvonaltól, ujjtövek ~11 cm-re a csuklótól, ujjvastagság ~2,9 cm (kesztyűben).
import * as THREE from 'three';
import { defineFingerPose, poseTipsRest, handRestInfo } from '../../kit/human.js';
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const tv = (a) => (a && a.isVector3) ? a.clone() : V(a[0], a[1], a[2]);
export const PALM = 0.028, FSKIN = 0.008;
// a kéz oldaliránya (a mutatóujj felé): jobb: L = F × P, bal: L = P × F
export const lat = (side, F, P) => side === 'R' ? new THREE.Vector3().crossVectors(F, P).normalize() : new THREE.Vector3().crossVectors(P, F).normalize();
function frame(side, F, P) { P = tv(P).normalize(); F = tv(F); F.addScaledVector(P, -F.dot(P)).normalize(); return { F, P, L: lat(side, F, P) }; }
const toH = (fr, W, p) => { const d = tv(p).sub(W); return [d.dot(fr.F), d.dot(fr.L), d.dot(fr.P)]; };
let SEQ = 0; const CACHE = new Map();
function solvePose(key, spec) { if (CACHE.has(key)) return CACHE.get(key); const nm = 'g' + (SEQ++); defineFingerPose(nm, spec); CACHE.set(key, nm); return nm; }
const kf = (a) => a.map(v => Math.round(v * 1000)).join(',');
// általános: kézkeret + ujjhegy-célok (tárgy-helyi) → spec
export function tipsGrip(side, W, F, P, tips, o = {}) {
  const fr = frame(side, F, P); const Wv = tv(W); const T = {}; for (const c in tips) if (tips[c]) T[c] = toH(fr, Wv, tips[c]);
  const flex = o.flex || {}; const key = side + '|' + Object.keys(T).sort().map(c => c + kf(T[c])).join('|') + '|' + JSON.stringify(flex) + (o.thumb ? JSON.stringify(o.thumb) : '');
  const spec = { tips: T, flex }; if (!T.T && o.thumb) spec.thumb = o.thumb;
  const fingers = solvePose(key, spec);
  const tipsL = {}; for (const c in tips) if (tips[c]) tipsL[c] = tv(tips[c]);
  return { W: Wv, F: fr.F, P: fr.P, fingers, pole: o.pole, side, tips: tipsL, free: o.free || null };
}
// szabad tengely: a kéz a fogás megtartásával e körül elfordulhat (a kar-megoldó választja a természetes csuklóállást)
export const freeAx = (ax, c, a0, a1, minDy) => ({ ax: tv(ax).normalize(), c: tv(c), a0, a1, minDy });
// henger körülfogása: c a tengelyen (a tenyérközép magassága), A tengely (a hüvelyk felé), r sugár, from: a kéz felől a tengely felé (P)
export function wrapGrip(side, c, A, r, from, o = {}) {
  A = tv(A).normalize(); let P = tv(from); P.addScaledVector(A, -P.dot(A)).normalize();
  // jobb kéz: L (mutatóujj felé) = A → F = P × A (jobb: L = F × P ⇒ F = P × L); bal: L = P × F ⇒ F = L × P
  const L = A.clone(); const F = side === 'R' ? new THREE.Vector3().crossVectors(P, L).normalize() : new THREE.Vector3().crossVectors(L, P).normalize();
  const W = tv(c).addScaledVector(P, -(r + PALM + (o.extra ?? 0.002))).addScaledVector(F, -0.065).addScaledVector(L, o.slide ?? 0);
  const key = side + '|wrap|' + Math.round(r * 1000) + '|' + (o.open ?? 0);
  const fingers = solvePose(key, { wrap: r + (o.open ?? 0), thumb: { wrap: r + (o.open ?? 0) } });
  return { W, F, P, fingers, pole: o.pole, side, free: o.free === false ? null : freeAx(A, c, o.fa0 ?? -0.8, o.fa1 ?? 0.8) };
}
// tenyér egy síkon: pt a tenyérközép alatti pont a felszínen, N a felület normálisa (kifelé), F ujjirány
export function flatGrip(side, pt, N, F, o = {}) {
  const P = tv(N).normalize().negate(); const fr = frame(side, F, P); const W = tv(pt).addScaledVector(P, -(PALM + (o.gap ?? 0.003))).addScaledVector(fr.F, -0.065);
  const fingers = solvePose(side + '|flat|' + (o.curl ?? 0), { flex: { I: [-0.04 + (o.curl ?? 0), 0.05, 0.03], M: [-0.03 + (o.curl ?? 0), 0.05, 0.03], R: [-0.02 + (o.curl ?? 0), 0.06, 0.03], P: [0.0 + (o.curl ?? 0), 0.07, 0.04] }, thumb: 'rest' });
  return { W, F: fr.F, P: fr.P, fingers, pole: o.pole, side, free: o.free === false ? null : freeAx(N, pt, o.fa0 ?? -0.6, o.fa1 ?? 0.6) };
}
// csípés: a hüvelyk és a mutatóujj hegye a pt két oldalán (n: a hüvelyk felől a mutatóujj felé), a kéz ujjiránya Fd felé
export function pinchGrip(side, pt, n, Fd, o = {}) {
  const N = tv(n).normalize(); const d = (o.thick ?? 0.003) / 2 + FSKIN * 0.9;
  return twoPoint(side, tv(pt).addScaledVector(N, -d), tv(pt).addScaledVector(N, d), Fd, { pole: o.pole, free: o.free, fa: o.fa, minDy: o.minDy, flex: o.flex || { I: [0.45, 0.55, 0.3], M: [0.75, 0.85, 0.45], R: [0.95, 1.05, 0.55], P: [1.0, 1.1, 0.6] } });
}
// felülről átfogás (gyűrű, szűrőkő, kis tárcsa): a hüvelyk a közeli, a középső ujj a túlsó peremen; c a tárgy tetejének közepe, R sugár, H magasság
export function spanGrip(side, c, R, H, Fd, o = {}) {
  let Fh = tv(Fd); Fh.y = 0; Fh.normalize(); const y = tv(c).y - (o.depth ?? Math.min(H * 0.5, 0.01));
  const sg = side === 'R' ? 1 : -1; const up = V(0, 1, 0);
  const near = tv(c).setY(y).addScaledVector(Fh.clone().negate().applyAxisAngle(up, -0.15 * sg), R + FSKIN), far = tv(c).setY(y).addScaledVector(Fh.clone().applyAxisAngle(up, 0.12 * sg), R + FSKIN);
  const Fdir = Fh.clone().multiplyScalar(0.55).add(V(0, -0.85, 0));
  return twoPoint(side, near, far, Fdir, { to: 'M', pole: o.pole, fa: o.fa ?? 0.35, free: o.free, minDy: o.minDy ?? 0.03, flex: o.flex || { I: [0.55, 0.75, 0.4], M: [0.5, 0.7, 0.4], R: [0.75, 0.95, 0.5], P: [0.85, 1.05, 0.55] } });
}
// mutatóujj egy gombon / felületen (nyomás)
export function pointGrip(side, pt, N, F, o = {}) {
  const Nn = tv(N).normalize(); const tip = tv(pt).addScaledVector(Nn, FSKIN * 0.6); let Fp = tv(F); const P = Nn.clone().negate().multiplyScalar(0.7).add(V(0, -0.3, 0)).normalize(); const fr = frame(side, Fp, P);
  const W = tip.clone().addScaledVector(fr.F, -0.17).addScaledVector(fr.P, -0.035).addScaledVector(fr.L, -0.04);
  return tipsGrip(side, W, fr.F, fr.P, { I: tip }, { flex: { M: [1.1, 1.3, 0.7], R: [1.2, 1.35, 0.7], P: [1.25, 1.35, 0.7] }, thumb: { tgt: [0.095, 0.01, 0.055] }, pole: o.pole, free: o.free === false ? null : freeAx(Nn, tip, -(o.fa ?? 0.7), o.fa ?? 0.7) });
}
// tárcsa/tálca pereme alulról: a tenyér a perem függőleges felületén (N kifelé), az ujjak a tárcsa alá hajlanak
export function trayGrip(side, rim, N, thick, o = {}) {
  const Nn = tv(N).normalize(); const P = Nn.clone().negate(); const up = V(0, 1, 0); const F = up.clone().negate().multiplyScalar(0.25).add(Nn.clone().negate().multiplyScalar(0.0)).add(V(0, 0, 0));
  let Fh = up.clone().cross(Nn).normalize(); if (side === 'L') Fh.negate(); Fh = Fh.multiplyScalar(0.3).add(up.clone().multiplyScalar(-0.95)).normalize();
  const fr = frame(side, Fh, P); const W = tv(rim).addScaledVector(fr.P, -(PALM + 0.004)).addScaledVector(fr.F, -0.06);
  const under = (dx) => tv(rim).addScaledVector(Nn, -0.025).add(V(0, -thick / 2 - FSKIN, 0)).addScaledVector(Fh.clone().setY(0).normalize(), dx);
  return tipsGrip(side, W, fr.F, fr.P, { I: under(0.02), M: under(0.0), R: under(-0.02) }, { flex: { P: [0.9, 1.0, 0.5] }, thumb: { tgt: [0.08, 0.06, 0.03] }, pole: o.pole });
}
// átalakítás: tárgy-helyi spec → világ (M: a tárgy világmátrixa)
export function gripW(g, M) { return { W: g.W.clone().applyMatrix4(M), F: g.F.clone().transformDirection(M), P: g.P.clone().transformDirection(M), fingers: g.fingers, pole: g.pole, free: g.free ? { ax: g.free.ax.clone().transformDirection(M), c: g.free.c.clone().applyMatrix4(M), a0: g.free.a0, a1: g.free.a1, minDy: g.free.minDy } : null }; }

// kétpontos fogás: a hüvelyk hegye pT-n, a mutató- (vagy középső) ujj hegye pI-n; a kéz ujjiránya a lehető legjobban Fd felé.
// A kéz forgatását a póz tényleges ujjhegyeiből számoljuk, így a két ujjhegy pontosan a célba kerül (csípés, kártya, gyűrű pereme).
const HR = {};
function rest(sd) { if (!HR[sd]) HR[sd] = handRestInfo(sd); return HR[sd]; }
function fq(x, y) { const X = x.clone().normalize(); const Y = y.clone().addScaledVector(X, -y.dot(X)).normalize(); const Z = new THREE.Vector3().crossVectors(X, Y); return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z)); }
export function twoPoint(side, pT, pI, Fd, o = {}) {
  pT = tv(pT); pI = tv(pI); const D = pT.distanceTo(pI); const to = o.to || 'I';
  const flex = o.flex || { I: [0.35, 0.45, 0.25], M: [0.45, 0.55, 0.3], R: [0.8, 0.95, 0.5], P: [0.9, 1.05, 0.55] };
  const nm = solvePose(side + '|2p|' + to + '|' + Math.round(D * 1000) + '|' + JSON.stringify(flex), { flex, thumb: { pinch: D, to } });
  const tp = poseTipsRest(nm, side), hr = rest(side); const aM = tp[to].clone().sub(tp.T), mid = tp[to].clone().add(tp.T).multiplyScalar(0.5);
  const n = pI.clone().sub(pT); let Fw = tv(Fd); const bM = hr.F0.clone().addScaledVector(aM.clone().normalize(), -hr.F0.dot(aM.clone().normalize()));
  const bW = Fw.clone().addScaledVector(n.clone().normalize(), -Fw.dot(n.clone().normalize()));
  const Q = fq(n, bW).multiply(fq(aM, bM).invert());
  const F = hr.F0.clone().applyQuaternion(Q), P = hr.P0.clone().applyQuaternion(Q);
  const W = pT.clone().add(pI).multiplyScalar(0.5).sub(mid.clone().applyQuaternion(Q));
  const fa = o.fa ?? 0.8; return { W, F, P, fingers: nm, pole: o.pole, side, tips: { T: pT, [to]: pI }, free: o.free === false ? null : freeAx(n, pT.clone().add(pI).multiplyScalar(0.5), -fa, fa, o.minDy) };
}
