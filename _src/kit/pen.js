// Toll a kézben (írás): a toll a hüvelykujj és a mutatóujj hegye közti csíptetőpontból a hüvelyk–mutató közti hajlat felé
// fekszik a kézen, a hegye a papír síkjáig ér. A munkás testhelyzete után kell meghívni (userData.post).
import * as THREE from 'three';
import { handPoints, PEN_GRIP } from './human.js';
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export function placePen(pen, w, sd, planePt, planeN, o = {}) {
  // dinamikus háromujjas fogás: a csíptetőpont a hüvelyk- és a mutatóujj hegye között, a toll a hüvelyk–mutató közti hajlatban nyugszik
  const hp = handPoints(w, sd); const pinch = hp.thumb.clone().lerp(hp.index, o.mix ?? 0.5);
  const web = hp.web.clone();
  const a = pinch.clone().sub(web).normalize(); // a toll iránya a hegy felé
  const den = a.dot(planeN); let d = o.dmax ?? 0.05;
  if (den < -0.08) d = clamp(planePt.clone().sub(pinch).dot(planeN) / den, o.dmin ?? 0.006, o.dmax ?? 0.05);
  const tip = pinch.clone().addScaledVector(a, d);
  pen.position.copy(tip); pen.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), a.clone().negate()); pen.updateMatrixWorld(true);
  return { tip, pinch, d, den, h: pinch.clone().sub(planePt).dot(planeN), web, thumb: hp.thumb, index: hp.index, ring: hp.ring, pinky: hp.pinky };
}

// Író kéz (jobb vagy bal): a kéz saját rendszerében (F: kézközép, L: hüvelyk oldal, P: tenyér) mért pontok (curl 1,15):
// PIN – a hüvelyk–mutató hegye közti csíptetőpont, WEB – a hüvelyk–mutató hajlata. A kezet úgy fordítjuk, hogy a WEB→PIN irány a kívánt
// tolliránnyal essen egybe (a toll vége a váll felé dől, ~50°-ban a laphoz), a tenyér befelé-lefelé néz; a csíptetőpont 2,5 cm-rel a hegy fölött.
// tipW: a tollhegy a papíron; med: a lap síkjában a test közepe felé (jobb kéznél balra); up: a lap síkjában „előre”; zc: a lap normálisa; shoulder: a váll.
export const WRITE = { curl: 1.15, PIN: [0.109, 0.078, 0.067], WEB: [0.086, 0.028, -0.012], elev: 0.87, pin: 0.025 };
export function writeHand(tipW, med, up, zc, shoulder, side = 'R', dbg = null, elbow = null) {
  const Fw = up.clone().multiplyScalar(0.55).addScaledVector(zc, -0.62).addScaledVector(med, 0.3).normalize();
  const Pw = med.clone().multiplyScalar(0.85).addScaledVector(zc, -0.35); Pw.addScaledVector(Fw, -Pw.dot(Fw)).normalize();
  const Lw = side === 'L' ? new THREE.Vector3().crossVectors(Pw, Fw).normalize() : new THREE.Vector3().crossVectors(Fw, Pw).normalize(); // jobb: l = f × p, bal: l = p × f
  const ah = WRITE.PIN.map((v, k) => v - WRITE.WEB[k]); const a1 = Fw.clone().multiplyScalar(ah[0]).addScaledVector(Lw, ah[1]).addScaledVector(Pw, ah[2]).normalize();
  const sv = shoulder.clone().sub(tipW); sv.addScaledVector(zc, -sv.dot(zc)).normalize();
  const back = sv.multiplyScalar(Math.cos(WRITE.elev)).addScaledVector(zc, Math.sin(WRITE.elev)).normalize();
  const Ad = back.clone().negate(); const q = new THREE.Quaternion().setFromUnitVectors(a1, Ad);
  Fw.applyQuaternion(q); Lw.applyQuaternion(q); Pw.applyQuaternion(q);
  const pinchT = tipW.clone().addScaledVector(back, WRITE.pin);
  if (elbow) return writeHandForearm(tipW, zc, shoulder, side, dbg, elbow);
  const W = pinchT.clone().addScaledVector(Fw, -WRITE.PIN[0]).addScaledVector(Lw, -WRITE.PIN[1]).addScaledVector(Pw, -WRITE.PIN[2]);
  if (dbg) Object.assign(dbg, { F: Fw, L: Lw, P: Pw, W, pinchT });
  return { p: W, fdir: Fw, ldir: Lw, curl: WRITE.curl };
}

// Író kéz – dinamikus háromujjas fogás (szakirodalom: a toll a hüvelyk- és a mutatóujj párnája közt, a középső ujj oldalán, kb. 2 cm-re
// a hegytől, a hüvelyk–mutató hajlatában nyugszik, kb. 45°-ban a papírhoz, a vége a váll felé; a csukló kissé hátrahajlik; a gyűrűs- és a kisujj
// behajlítva a papíron támaszkodik). A kézfej az alkar irányából indul, a laphoz simul; a kéz a saját tengelye körül úgy fordul, hogy a toll
// 45°-ban álljon, a vége a váll felé dőljön, és a kéz félig borul (a hüvelyk oldala fent, a kisujj oldala a papír felé, ~60°-os pronáció).
const WR = { elev: 0.79, tilt: 0.3, maxBend: 0.6, lup: 0.5, rest: 0.011, pinMin: 0.016, pinMax: 0.034 };
function writeHandForearm(tipW, zc, shoulder, side, dbg, elbow) {
  const G = PEN_GRIP[side], v3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);
  const ah = v3(G.pin).sub(v3(G.web)), rp = G.low.map(x => v3(x).sub(v3(G.pin)));
  const sv = shoulder.clone().sub(tipW); sv.addScaledVector(zc, -sv.dot(zc)).normalize();
  let W = tipW.clone().addScaledVector(zc, 0.06).addScaledVector(sv, 0.08), best = null;
  const toW = (F, L, P, x) => F.clone().multiplyScalar(x.x).addScaledVector(L, x.y).addScaledVector(P, x.z);
  for (let it = 0; it < 4; it++) {
    const d = W.clone().sub(elbow).normalize(); const dp = d.clone().addScaledVector(zc, -d.dot(zc)).normalize();
    const F0 = dp.multiplyScalar(Math.cos(WR.tilt)).addScaledVector(zc, -Math.sin(WR.tilt)).normalize(); const ang = Math.acos(clamp(d.dot(F0), -1, 1));
    const F = ang > WR.maxBend ? d.clone().lerp(F0, WR.maxBend / ang).normalize() : F0;
    const u = zc.clone().addScaledVector(F, -zc.dot(F)).normalize(), v = new THREE.Vector3().crossVectors(F, u);
    best = null;
    for (let i = 0; i < 144; i++) {
      const th = i / 144 * Math.PI * 2; const P = u.clone().multiplyScalar(-Math.cos(th)).addScaledVector(v, Math.sin(th));
      const L = side === 'L' ? new THREE.Vector3().crossVectors(P, F) : new THREE.Vector3().crossVectors(F, P);
      const a = toW(F, L, P, ah).normalize(); // a toll iránya a hegy felé
      const se = -a.dot(zc); const e = Math.asin(clamp(se, -1, 1)); const top = a.clone().negate(); top.addScaledVector(zc, -top.dot(zc)); const tl = top.length();
      const az = tl > 1e-4 ? 1 - top.dot(sv) / tl : 1;
      // a gyűrűs- és a kisujj a papíron támaszkodjon: ehhez a csíptetőpont ilyen messze legyen a hegytől a toll mentén
      const mrp = Math.min(...rp.map(x => toW(F, L, P, x).dot(zc))); const pinD = se > 0.2 ? (WR.rest - mrp) / se : 1;
      const pinC = clamp(pinD, WR.pinMin, WR.pinMax);
      const cost = ((e - WR.elev) / 0.2) ** 2 + az * 1.5 + ((L.dot(zc) - WR.lup) / 0.35) ** 2 + ((pinD - pinC) / 0.004) ** 2;
      if (!best || cost < best.cost) best = { cost, F, L, P, a, pinD: pinC, e, lz: L.dot(zc) };
    }
    const pinchT = tipW.clone().addScaledVector(best.a, -best.pinD);
    W = pinchT.clone().sub(toW(best.F, best.L, best.P, v3(G.pin)));
    best.pinchT = pinchT;
  }
  if (dbg) Object.assign(dbg, { F: best.F, L: best.L, P: best.P, W, pinchT: best.pinchT, e: best.e, lz: best.lz, pinD: best.pinD, cost: best.cost });
  return { p: W, fdir: best.F, ldir: best.L, curl: 0, fingers: 'pen' };
}
