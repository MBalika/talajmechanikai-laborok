// Talajmechanikai laborok – természetes kézfogások (3. változat, 2026-11-11)
// Elv (fogástaxonómia: Feix és mtsai, GRASP, 2016; Cutkosky 1989): a kéz helyzetét a test adja, nem az érintési pontok.
//  – Felülről fogásnál a tenyér lefelé néz (pronált alkar), az ujjak az alkar folytatásában, a test felől a tárgy felé mutatnak (aim);
//    a csukló semleges vagy kissé feszített, a hüvelyk a test közepe felé esik.
//  – A fogástípus határozza meg, hová kerülnek az ujjhegyek: korong/gyűrű felülről (precíziós korongfogás: hüvelyk a közeli, a többi ujj a túlsó peremen),
//    henger markolása (erőfogás: a tenyér a hengeren, az ujjak körbefogják, a hüvelyk a henger mentén vagy körülötte),
//    lemez széle (hüvelyk a lap tetején, az ujjak a paláston), vékony lap csípése (hüvelyk és mutatóujj párnája a lap két oldalán), tenyér egy síkon, mutatóujj gombon.
//  – Az ujjízületeket az ujjhegy-célokból számoljuk (kit/human.js defineFingerPose tips), gyorsítótárazva.
// Minden függvény a tárgy helyi rendszerében dolgozik (vagy a labor rendszerében, ha a fogás nem tárgyhoz kötött).
import * as THREE from 'three';
import { defineFingerPose } from '../../kit/human.js';
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const tv = (a) => (a && a.isVector3) ? a.clone() : V(a[0], a[1], a[2]);
export const PALM = 0.028, FSKIN = 0.008, UP = V(0, 1, 0);
// a kéz oldaliránya (a hüvelyk/mutatóujj felé): jobb: L = F × P, bal: L = P × F
export const lat = (side, F, P) => side === 'R' ? new THREE.Vector3().crossVectors(F, P).normalize() : new THREE.Vector3().crossVectors(P, F).normalize();
export function frame(side, F, P) { P = tv(P).normalize(); F = tv(F); F.addScaledVector(P, -F.dot(P)).normalize(); return { F, P, L: lat(side, F, P) }; }
const toH = (fr, W, p) => { const d = tv(p).sub(W); return [d.dot(fr.F), d.dot(fr.L), d.dot(fr.P)]; };
const q3 = (v) => Math.round(v * 400) / 400;   // 2,5 mm-es rács a gyorsítótárhoz
let SEQ = 0; const CACHE = new Map();
function solve(side, spec) { const key = side + JSON.stringify(spec); if (CACHE.has(key)) return CACHE.get(key); const nm = 'h3_' + (SEQ++); defineFingerPose(nm, spec); CACHE.set(key, nm); return nm; }
// csukló a tenyérközép (bőr) pontjából: a tenyérközép a csuklótól F mentén 6,5 cm-re, P mentén 2,8 cm-re
export const wristFromPalm = (fr, pc) => tv(pc).addScaledVector(fr.F, -0.065).addScaledVector(fr.P, -PALM);
// általános: kézkeret + ujjhegy-célok → fogás (a célok a tárgy/labor rendszerében)
export function tipsGrip(side, W, fr, tips, o = {}) {
  const T = {}; for (const c in tips) if (tips[c]) T[c] = toH(fr, W, tips[c]).map(q3);
  const spec = { tips: T, flex: o.flex || {} }; if (!T.T && o.thumb) spec.thumb = o.thumb;
  const fingers = solve(side, spec); const tl = {}; for (const c in tips) if (tips[c]) tl[c] = tv(tips[c]);
  return { W: tv(W), F: fr.F.clone(), P: fr.P.clone(), fingers, side, tips: tl, pole: o.pole || null };
}
// vízszintes irány (a test felől a tárgy felé), normálva
export const horiz = (v) => { const h = tv(v); h.y = 0; return h.lengthSq() < 1e-8 ? V(0, 0, -1) : h.normalize(); };

// 1) KORONG / GYŰRŰ FELÜLRŐL (precíziós korongfogás). c: a tárgy tetejének közepe, R: külső sugár, H: magasság, aim: vízszintes irány a test felől.
//    A tenyér vízszintesen a tárgy fölött; a hüvelyk a közeli peremen (kissé a hüvelyk oldala felé), a mutató-, középső és gyűrűsujj a túlsó peremen.
export function diskTop(side, c, R, H, aim, o = {}) {
  const fr = frame(side, horiz(aim), V(0, -1, 0)); const C = tv(c); const ym = -(o.depth ?? Math.min(H * 0.5, 0.009)); const rr = R + FSKIN * 0.9;
  const at = (deg) => { const a = deg * Math.PI / 180; return C.clone().addScaledVector(fr.F, Math.cos(a) * rr).addScaledVector(fr.L, Math.sin(a) * rr).add(V(0, ym, 0)); };
  const sp = o.spread ?? Math.min(38, 1.15 * 180 / Math.PI * 0.024 / rr);           // az ujjak közti szög a peremen (~2,4 cm-es ujjtávolság)
  // a tenyér a tárgy fölött: a középső ujj hegye a túlsó peremen, a tenyérközép ehhez igazodik (a hosszabb ujjak miatt kissé a középpont elé)
  const pc = C.clone().addScaledVector(fr.F, o.fwd ?? Math.max(-0.01, rr - 0.075)).add(V(0, o.palmH ?? 0.045, 0));
  const W = wristFromPalm(fr, pc);
  const tips = { T: at(180 - (o.thumbA ?? 32)), I: at(sp), M: at(0), R: at(-sp) };
  if (o.pinky) tips.P = at(-2 * sp);
  return tipsGrip(side, W, fr, tips, { flex: { P: o.pinkyFlex || [0.9, 1.0, 0.55] }, pole: o.pole });
}
// 2) HENGER MARKOLÁSA (erőfogás). c: a tengely pontja a tenyérközép magasságában, A: tengelyirány a hüvelyk felé, r: sugár,
//    P: a tenyér normálisa (a kéz felől a tengely felé). Az ujjak F = (P × A) irányban körbefogják a hengert.
export function powerCyl(side, c, A, r, P, o = {}) {
  A = tv(A).normalize(); let Pn = tv(P); Pn.addScaledVector(A, -Pn.dot(A)).normalize();
  const F = side === 'R' ? new THREE.Vector3().crossVectors(Pn, A).normalize() : new THREE.Vector3().crossVectors(A, Pn).normalize();
  const fr = { F, P: Pn, L: A.clone() };
  const W = tv(c).addScaledVector(Pn, -(r + PALM + 0.002)).addScaledVector(F, -0.065).addScaledVector(A, o.slide ?? 0);
  const fingers = solve(side, { wrap: Math.round((r + (o.open ?? 0)) * 1000) / 1000, thumb: o.thumb || { wrap: Math.round((r + (o.open ?? 0)) * 1000) / 1000 } });
  return { W, F, P: Pn, fingers, side, pole: o.pole || null };
}
// 3) LEMEZ SZÉLE KÉT OLDALRÓL (súlytárcsa): a kéz a perem mellett kívül, a tenyér befelé-lefelé néz, az ujjak lefelé-előre;
//    a hüvelyk hegye a lap tetején (kb. 2 cm-re a peremtől), a mutató- és középső ujj hegye a paláston (fél magasságban), a gyűrűs- és kisujj lazán hajlik.
//    p: a perem pontja a lap tetejének magasságában, N: kifelé mutató vízszintes normális, h: vastagság, fwd: előre (a test felől elfelé) mutató vízszintes irány
export function rimSide(side, p, N, h, fwd, o = {}) {
  const Nn = horiz(N); const P = Nn.clone().multiplyScalar(-0.82).add(V(0, -0.57, 0)).normalize();
  const Fw = horiz(fwd); const Fd = Fw.clone().multiplyScalar(0.55).add(V(0, -0.83, 0)); const fr = frame(side, Fd, P);
  const top = tv(p); const tan = Fw.clone().addScaledVector(Nn, -Fw.dot(Nn)).normalize();
  const tips = { T: top.clone().addScaledVector(Nn, -(o.inset ?? 0.022)).add(V(0, FSKIN * 0.9, 0)).addScaledVector(tan, -0.012),
    I: top.clone().addScaledVector(Nn, FSKIN * 0.9).add(V(0, -h * 0.45, 0)).addScaledVector(tan, 0.012), M: top.clone().addScaledVector(Nn, FSKIN * 0.9).add(V(0, -h * 0.5, 0)).addScaledVector(tan, -0.012) };
  const pc = top.clone().addScaledVector(Nn, PALM + 0.035).add(V(0, 0.035, 0));
  const W = wristFromPalm(fr, pc);
  return tipsGrip(side, W, fr, tips, { flex: { R: [0.75, 0.8, 0.45], P: [0.8, 0.85, 0.5] }, pole: o.pole });
}
// 3b) TÁRCSA KÉT OLDALRÓL, „kézfogás” helyzetben (súlytárcsa emelése, vitele): a tenyér függőleges és befelé néz, az ujjak előre mutatnak
//     és a palást ívét követve kissé behajlanak, a hüvelyk a lap tetején; az alkar így vízszintes közeli, a könyök lent, a test mellett.
//     p: a perem pontja (a tárcsa oldalán, a lap tetejének magasságában), N: kifelé mutató vízszintes normális, h: vastagság, R: sugár, fwd: előre (a testtől el)
export function rimHold(side, p, N, h, R, fwd, o = {}) {
  const Nn = horiz(N), Fw = horiz(fwd); const P = Nn.clone().negate(); const fr = frame(side, Fw.clone().add(V(0, -0.22, 0)), P);
  const top = tv(p); const C = top.clone().addScaledVector(Nn, -R); const ym = -Math.min(h * 0.55, 0.012);
  const onRim = (deg, dy) => { const a = deg * Math.PI / 180; const d = Nn.clone().multiplyScalar(Math.cos(a)).addScaledVector(Fw, Math.sin(a)); return C.clone().addScaledVector(d, R + FSKIN * 0.9).add(V(0, dy, 0)); };
  const tips = { T: top.clone().addScaledVector(Nn, -(o.inset ?? 0.018)).addScaledVector(Fw, 0.035).add(V(0, FSKIN * 0.9, 0)),
    I: onRim(42, ym * 0.6), M: onRim(34, ym), R: onRim(25, ym * 1.2) };
  const pc = C.clone().addScaledVector(Nn, R + PALM + 0.004).addScaledVector(Fw, -0.005).add(V(0, ym - 0.004, 0));
  const W = wristFromPalm(fr, pc);
  return tipsGrip(side, W, fr, tips, { flex: { P: [0.55, 0.65, 0.4] }, pole: o.pole });
}
// 3c) TÁRCSA / SZITA / TÁL OLDALRÓL, FERDÉN (a kézfogás-helyzet és a felülről fogás között): a tenyér befelé és lefelé néz (alpha, rad),
//     az ujjak előre a palást ívén, a hüvelyk a peremen. Alacsony tárgynál a kisujj oldala nem ér le az asztalig, és oldalra billentéskor
//     (a z tengely körül) az alkar forog (pronáció/szupináció), a csukló semleges marad.
export function rimOblique(side, p, N, h, R, fwd, o = {}) {
  const al = o.alpha ?? 0.75, Nn = horiz(N), Fw = horiz(fwd); const P = Nn.clone().multiplyScalar(-Math.cos(al)).add(V(0, -Math.sin(al), 0)).normalize();
  const fr = frame(side, Fw.clone().add(V(0, -0.18, 0)), P); const top = tv(p); const C = top.clone().addScaledVector(Nn, -R); const ym = -Math.min(h * 0.55, 0.012);
  const onRim = (deg, dy) => { const a = deg * Math.PI / 180; const d = Nn.clone().multiplyScalar(Math.cos(a)).addScaledVector(Fw, Math.sin(a)); return C.clone().addScaledVector(d, R + FSKIN * 0.9).add(V(0, dy, 0)); };
  const tips = { T: top.clone().addScaledVector(Nn, -(o.inset ?? 0.012)).addScaledVector(Fw, 0.03).add(V(0, FSKIN * 0.9, 0)), I: onRim(40, ym * 0.6), M: onRim(31, ym), R: onRim(22, ym * 1.2) };
  const off = PALM + 0.006; const pc = C.clone().addScaledVector(Nn, R + off * Math.cos(al)).addScaledVector(Fw, -0.005).add(V(0, ym - 0.004 + off * Math.sin(al), 0));
  const W = wristFromPalm(fr, pc);
  return tipsGrip(side, W, fr, tips, { flex: { P: [0.6, 0.7, 0.42] }, pole: o.pole });
}
// 3d) KIS GYŰRŰ CSÍPÉSE OLDALT-FELÜLRŐL (precíziós csípés): a tenyér a tárgy mellett, fölötte, lefelé és kissé a tárgy felé néz, az ujjak a tárgy felé
//     mutatnak; a hüvelyk a közeli (a test felőli), a mutató- és a középső ujj a túlsó oldalon fogja a palástot a perem alatt; a tengely fölötti tér szabad
//     marad (pl. a kitolónak). c: a tengely pontja a perem magasságában, R: külső sugár, out: vízszintes irány a tengelytől a kéz felé, near: a test felé
export function pinchSide(side, c, R, out, near, o = {}) {
  const On = horiz(out), Nr = horiz(near); const C = tv(c); const dx = o.dx ?? 0.55 * R, dy = -(o.depth ?? 0.005);
  const zz = Math.sqrt(Math.max(1e-8, R * R - dx * dx)) + FSKIN * 0.9;
  const at = (s, ex = 0, ey = 0) => C.clone().addScaledVector(On, dx + ex).addScaledVector(Nr, s * zz).add(V(0, dy + ey, 0));
  const fy = o.fy ?? 0.5; const F = On.clone().multiplyScalar(-Math.sqrt(1 - fy * fy)).add(V(0, -fy, 0)); const fr = frame(side, F, On.clone().multiplyScalar(-0.25).add(V(0, -0.97, 0)));
  const tips = { T: at(1), I: at(-1), M: at(-0.8, 0.008, -0.003) };
  const pc = C.clone().addScaledVector(On, o.palmOut ?? 0.07).add(V(0, o.palmH ?? 0.04, 0));
  return tipsGrip(side, wristFromPalm(fr, pc), fr, tips, { flex: { R: [1.0, 1.1, 0.6], P: [1.05, 1.15, 0.6] }, pole: o.pole });
}
// 4) VÉKONY ÁLLÓ LAP FELÜLRŐL (acélvonalzó, lemez éle): a tenyér a lap felső éle fölött lefelé néz, a hüvelyk párnája a közeli,
//    a mutató- és középső ujj párnája a túlsó oldalon. p: a lap felső élének pontja, n: a lap normálisa a közeli oldaltól a túlsó felé, t: vastagság
export function bladeTop(side, p, n, t, o = {}) {
  const nn = horiz(n); const fr = frame(side, nn, V(0, -1, 0)); const P0 = tv(p); const d = o.down ?? 0.012;
  const tips = { T: P0.clone().addScaledVector(nn, -(t / 2 + FSKIN * 0.9)).add(V(0, -d, 0)).addScaledVector(fr.L, 0.004),
    I: P0.clone().addScaledVector(nn, t / 2 + FSKIN * 0.9).add(V(0, -d, 0)).addScaledVector(fr.L, 0.008), M: P0.clone().addScaledVector(nn, t / 2 + FSKIN * 0.9).add(V(0, -d - 0.004, 0)).addScaledVector(fr.L, -0.013) };
  const pc = P0.clone().add(V(0, o.palmH ?? 0.04, 0)).addScaledVector(nn, -0.035);
  const W = wristFromPalm(fr, pc);
  return tipsGrip(side, W, fr, tips, { flex: { R: [0.85, 0.95, 0.5], P: [0.9, 1.0, 0.55] }, pole: o.pole });
}
// 5) VÉKONY FEKVŐ LAP SZÉLE (szűrőpapír): hüvelyk a lap tetején, a mutatóujj párnája alatta – a kéz felülről, tenyér lefelé, az ujjak a test felől előre
export function sheetEdge(side, p, aim, t, o = {}) {
  const fr = frame(side, horiz(aim), V(0, -1, 0)); const P0 = tv(p);
  const tips = { T: P0.clone().add(V(0, t / 2 + FSKIN * 0.85, 0)).addScaledVector(fr.F, -0.004), I: P0.clone().add(V(0, -t / 2 - FSKIN * 0.85, 0)).addScaledVector(fr.F, 0.004) };
  const pc = P0.clone().add(V(0, 0.05, 0)).addScaledVector(fr.F, -0.06).addScaledVector(fr.L, -0.01);
  const W = wristFromPalm(fr, pc);
  return tipsGrip(side, W, fr, tips, { flex: { M: [0.75, 0.85, 0.45], R: [0.95, 1.05, 0.55], P: [1.0, 1.1, 0.6] }, pole: o.pole });
}
// 6) TENYÉR EGY SÍKON (nyomás): pt a tenyérközép alatti pont a felszínen, N a felület normálisa, aim az ujjak iránya (a síkba vetítve)
export function flatPalm(side, pt, N, aim, o = {}) {
  const Nn = tv(N).normalize(); const fr = frame(side, aim, Nn.clone().negate()); const W = wristFromPalm(fr, tv(pt).addScaledVector(Nn, o.gap ?? 0.003));
  const fingers = solve(side, { flex: { I: [-0.04, 0.05, 0.03], M: [-0.03, 0.05, 0.03], R: [-0.02, 0.06, 0.03], P: [0.0, 0.07, 0.04] }, thumb: 'rest' });
  return { W, F: fr.F, P: fr.P, fingers, side, pole: o.pole || null };
}
// 7) MUTATÓUJJ EGY GOMBON: a kéz tenyérrel lefelé, kissé ferdén; a mutatóujj nyújtva, hegye a gombon, a többi behajlítva
export function fingerPress(side, pt, aim, o = {}) {
  const n = o.n ? tv(o.n).normalize() : V(0, 1, 0); const vert = Math.abs(n.y) > 0.7;   // vízszintes felület: felülről nyom; függőleges (pl. számlap): elölről érinti
  const fr = o.F ? frame(side, tv(o.F), o.P ? tv(o.P) : V(0, -1, 0)) : vert ? frame(side, horiz(aim).add(V(0, -0.45, 0)), V(0, -1, 0)) : frame(side, n.clone().negate().add(V(0, -0.25, 0)), V(0, -1, 0)); const tip = tv(pt).addScaledVector(n, FSKIN * 0.6);
  const W = tip.clone().addScaledVector(fr.F, -0.165).addScaledVector(fr.P, -0.02).addScaledVector(fr.L, -0.022);
  return tipsGrip(side, W, fr, { I: tip }, { flex: { M: [1.15, 1.3, 0.7], R: [1.2, 1.35, 0.7], P: [1.25, 1.35, 0.7] }, thumb: { tgt: [0.085, 0.03, 0.05] }, pole: o.pole });
}
