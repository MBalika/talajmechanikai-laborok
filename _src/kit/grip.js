// Kézfogások a kit/human.js kéz-IK-jához (userData.reach = { L/R: { local|p, fdir, ldir, curl, w, pole } }).
//
// A kézfej iránya két világvektorból áll:
//   fdir – a csuklótól az ujjtövek felé (a kézközépcsontok iránya)
//   ldir – a kisujjtól a mutatóujj felé (a hüvelykujj oldala)
// Ebből a tenyér normálisa (a tenyérből kifelé, a megfogott tárgy felé):
//   bal kéz:  P = fdir × ldir      jobb kéz: P = ldir × fdir
// Tehát adott tenyérirányhoz (P) és ujjirányhoz (F): bal: ldir = P × F, jobb: ldir = F × P.
// A curl az ujjakat a tenyér felé hajlítja (0: nyitott, ~1,3: ököl).
import * as THREE from 'three';
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const ortho = (a, n) => a.clone().addScaledVector(n, -a.dot(n)).normalize();

/** ldir a kívánt tenyér- (P) és ujjirányból (F); F-et P-re merőlegesre igazítja. */
export function handFrame(side, P, F) {
  const p = P.clone().normalize(), f = ortho(F, p);
  const l = side === 'L' ? new THREE.Vector3().crossVectors(p, f) : new THREE.Vector3().crossVectors(f, p);
  return { fdir: f, ldir: l.normalize() };
}

/**
 * Markolás hengeren (rúd, cső, nyél), hüvelykujj a tengely `A` irányában.
 * c: pont a tengelyen (ahol a tenyér közepe legyen), A: tengely, r: sugár,
 * from: a kéz felől a henger felé mutató irány (pl. a munkás felől a rúd felé; a tengelyre merőlegesítve),
 * side: 'L' | 'R'. A tenyér a hengerre fekszik, az ujjak körbefogják.
 * opts: { curl, w, thumb: +1 (hüvelyk A felé) | −1, palmOff: tenyér–felszín távolság }
 */
export function gripCylinder(c, A, r, from, side, opts = {}) {
  const a = A.clone().normalize().multiplyScalar(opts.thumb ?? 1); const P = ortho(from, a); // a tenyér a henger felé néz
  // ujjak: a tengelyre és a tenyérre merőlegesen – bal kézzel a tengely körül egyik, jobbal a másik irányba
  const F = side === 'L' ? new THREE.Vector3().crossVectors(a, P) : new THREE.Vector3().crossVectors(P, a);
  const fr = handFrame(side, P, F);
  // a csukló: a tenyérközép (≈ 0,06 m-re a csuklótól) a henger felszínén
  const p = c.clone().addScaledVector(P, -(r + (opts.palmOff ?? 0.018))).addScaledVector(fr.fdir, -0.06);
  return { p, fdir: fr.fdir, ldir: fr.ldir, curl: opts.curl ?? Math.min(1.45, 0.75 + 0.03 / Math.max(0.01, r)), w: opts.w ?? 1,
    palm: P.clone(), contact: c.clone().addScaledVector(P, -r), axis: a.clone(), axisPt: c.clone(), radius: r, gap: opts.palmOff ?? 0.018 }; // önbeálló mód (kit/human.js autoHand)
}

/**
 * Tenyér egy felületen (lap, doboz teteje, cső felső/alsó oldala): N a felület normálisa (a felületből kifelé, a kéz felé),
 * F az ujjak iránya a felület síkjában. A tenyér a felülettől `gap` távolságra.
 */
export function palmOn(pt, N, F, side, opts = {}) {
  const P = N.clone().normalize().negate(); const fr = handFrame(side, P, F);
  const p = pt.clone().addScaledVector(N.clone().normalize(), opts.gap ?? 0.022).addScaledVector(fr.fdir, -0.06);
  return { p, fdir: fr.fdir, ldir: fr.ldir, curl: opts.curl ?? 0.06, w: opts.w ?? 1, palm: P.clone(), contact: pt.clone(), gap: opts.gap ?? 0.022, ftilt: opts.ftilt }; // önbeálló mód
}

/** Alulról tartás (tenyér felfelé) – pl. cső, tálca alatt. pt: a tárgy alsó pontja, F: ujjirány (vízszintes). */
export function palmUnder(pt, F, side, opts = {}) { return palmOn(pt, V(0, -1, 0), F, side, { curl: 0.5, ...opts }); }

/** Könyökirány (pólus) a test helyi rendszerében: kifelé (oldalra), kissé le és hátra – az alkar ne menjen át a törzsön. */
export const POLE = { L: V(0.85, -0.45, -0.25), R: V(-0.85, -0.45, -0.25) };

/** Függőleges (vagy ferde) rúd a munkás előtt, hüvelykujj „felfelé” (A irányába): a bal kéz a rúd bal-közeli oldalán, a jobb a jobb-közelin. */
export function gripRodFront(c, A, r, fwd, right, side, opts = {}) {
  const from = side === 'L' ? right.clone().multiplyScalar(0.85).addScaledVector(fwd, 0.5) : right.clone().multiplyScalar(-0.85).addScaledVector(fwd, 0.5);
  return gripCylinder(c, A, r, from.normalize(), side, opts);
}

/** Vezérlőkar markolása a gomb alatt (kit/tf.js: a pult és a lánctalpas gép userData.levers / leverAxis), a munkás felől. */
export function leverGrip(obj, i, side, w, opts = {}) {
  obj.updateWorldMatrix(true, false); const U = obj.userData; const kn = obj.localToWorld(U.levers[i].clone());
  const A = U.leverAxis.clone().transformDirection(obj.matrixWorld); const c = kn.clone().addScaledVector(A, -(opts.below ?? 0.045));
  const wp = w.getWorldPosition(new THREE.Vector3()); const from = c.clone().sub(wp); from.y = 0; from.normalize();
  return gripCylinder(c, A, 0.009, from, side, { curl: 1.4, ...opts });
}
