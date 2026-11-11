// Szervesanyag-tartalom – labor: mozsár + törő, 2 mm-es szita alsó edénnyel, vegyszeres kanál, mérleg (0,001 g), exszikkátor, hűtőlap,
// tégelyfogó a tartóján, izzítókemence (550 °C, felfelé nyíló ajtó). A tégelyt mindig fogóval mozgatja (jobb kéz), a kemence ajtaját és az
// exszikkátor fedelét a bal kéz kezeli. Minden mozdulatot a laboráns keze végez.
import { THREE, V, BT, M, cyl, bx, drawScale } from '../tm_lab/room.js';
import { Choreo, keyed, stdPoses } from '../tm_lab/act.js';
import { diskTop, powerCyl, rimOblique } from '../tm_lab/grips3.js';
import * as SZ from '../tm_lab/szerv.js';
import { CR, TG, FU, DS, MO, SV } from '../tm_lab/szerv.js';
import * as TL from './timeline.js';
import { tb, GRIND, SHAKE, SVOFF, TONG1, TONG2, SPOON, CLOCK1, CLOCK2 } from './timeline.js';
import { clamp, lerp, smooth, seg } from '../../kit/util.js';
const B = (b) => tb(b);
const tv = (a) => (a && a.isVector3) ? a.clone() : V(a[0], a[1], a[2]);
const QI = new THREE.Quaternion();
const sm5 = (x) => { x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10); };
const qE = (x, y, z) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z, 'YXZ'));
// ---- elrendezés (labor-helyi x, z) ----
export const POS = { MORT: [-0.76, -1.0], SIEVE: [-0.52, -1.02], SVOFF: [-0.98, -1.05], SPOON: [-0.6, -0.88], SCL: -0.18, DESIC: [0.14, -0.95], PLATE: [0.44, -1.0], TREST: [-0.02, -1.02], FURN: [0.8, -1.15] };
const FURNP = [POS.FURN[0], BT, POS.FURN[1]];
export const P = { PL: [POS.PLATE[0], BT + 0.018, POS.PLATE[1]], FN: [POS.FURN[0], BT + FU.Y0 + 0.008, POS.FURN[1] + 0.07], DS: [POS.DESIC[0] + 0.01, BT + DS.PL, POS.DESIC[1] + 0.035], SC: [POS.SCL, BT + 0.069, -1.06] };
const FO = [POS.FURN[0], BT + 0.125, -0.9];                              // a kemence ajtónyílása előtt
const up = (p, h) => [p[0], p[1] + h, p[2]];
let C, X = {};
export function board(g) { g.fillStyle = '#2b4f9e'; g.font = 'italic 700 46px Arial'; g.fillText('w', 90, 160); g.font = 'italic 700 28px Arial'; g.fillText('LOI', 122, 172); g.font = 'italic 700 46px Arial'; g.fillText('= (m  − m ) / (m  − m )', 200, 160);
  g.font = 'italic 700 26px Arial'; g.fillText('c', 268, 172); g.fillText('d', 356, 172); g.fillText('c', 488, 172); g.fillText('a', 578, 172);
  g.fillStyle = '#c0281e'; g.font = 'italic 600 40px Arial'; g.fillText('550 °C · ≥ 2 h', 300, 300); g.strokeStyle = '#2b4f9e'; g.lineWidth = 4; g.strokeRect(120, 360, 780, 70); g.fillStyle = '#2b4f9e'; g.font = '600 30px Arial'; g.fillText('2 %   6 %         20 %', 300, 405); }

// ---------------- tégely és fogó: a tégely útját kulcsokkal adjuk meg ([ütem, hely, a fogó dőlése]); fogás közben a fogó a tégelyhez igazodik ----------------
// egy szakasz: a fogó a tégelyt [g0, g1] között fogja; előtte nyitva közelít (pre), utána kinyit és hátrahúzódik
const EP = [];
function ep(g0, g1, keys, o = {}) { EP.push({ g0, g1, keys, pre: o.pre ?? 0.3, post: o.post ?? 0.4, back: o.back ?? 0.07, bpre: o.bpre ?? 0.07 }); }
function episode(d) {   // egy teljes kör a kemencéből a mérlegig (előizzítás után és izzítás után ugyanaz)
  ep(34.3 + d, 35.6 + d, [[34.3 + d, P.FN, 0.15], [34.75 + d, FO, 0.2], [35.3 + d, up(P.PL, 0.06), 0.42], [35.6 + d, P.PL, 0.45]], { bpre: 0.3 });
  ep(38.2 + d, 39.6 + d, [[38.2 + d, P.PL, 0.45], [38.5 + d, up(P.PL, 0.06), 0.45], [39.1 + d, up(P.DS, 0.09), 0.45], [39.6 + d, P.DS, 0.45]]);
  ep(42.7 + d, 43.4 + d, [[42.7 + d, P.DS, 0.45], [43.4 + d, up(P.DS, 0.09), 0.45]], { post: 0 });
  ep(43.4 + d, 44.6 + d, [[43.4 + d, up(P.DS, 0.09), 0.45], [43.9 + d, up(P.DS, 0.09), 0.45], [44.3 + d, up(P.SC, 0.05), 0.45], [44.6 + d, P.SC, 0.45]], { pre: 0 });
}
ep(29.9, 31.2, [[29.9, P.PL, 0.45], [30.2, up(P.PL, 0.05), 0.35], [30.8, FO, 0.2], [31.2, P.FN, 0.15]], { back: 0.3 });
episode(0);
ep(56.8, 59.2, [[56.8, P.SC, 0.45], [57.1, up(P.SC, 0.06), 0.4], [57.6, [0.1, BT + 0.2, -0.98], 0.35], [58.2, [0.62, BT + 0.16, -0.95], 0.3], [58.8, FO, 0.2], [59.2, P.FN, 0.15]], { back: 0.3 });
episode(30);
const pathAt = (keys, t) => { if (t <= B(keys[0][0])) return { p: tv(keys[0][1]), pitch: keys[0][2] }; for (let i = 1; i < keys.length; i++) if (t < B(keys[i][0])) { const k = sm5(seg(t, B(keys[i - 1][0]), B(keys[i][0])));
  return { p: tv(keys[i - 1][1]).lerp(tv(keys[i][1]), k), pitch: lerp(keys[i - 1][2], keys[i][2], k) }; } const L = keys[keys.length - 1]; return { p: tv(L[1]), pitch: L[2] }; };
function cruPose(t) {
  if (t < B(4)) return { p: tv(P.FN), q: QI.clone() };
  let p = tv(P.PL); for (const e of EP) { if (t < B(e.g0)) break; p = pathAt(e.keys, Math.min(t, B(e.g1))).p; } return { p, q: QI.clone() }; }
// a fogó helyzete a tégely körül: a nyél a jobb váll felé mutat, „pitch” dőléssel
const shoulderR = (t) => C.shoulderAt('R', t);
function tongAround(pc, pitch, t, back = 0, open = 0) { const s = shoulderR(t); const dx = s.x - pc.x, dz = s.z - pc.z; const yaw = Math.atan2(dx, dz); const q = qE(-pitch, yaw, 0);
  const p = pc.clone().add(V(0, CR.GH, 0)).add(V(0, 0, back).applyQuaternion(q)).add(V(0, back * 0.25, 0)); return { p, q, open }; }
const TREST = { p: V(POS.TREST[0], BT + 0.06 + 0.0035, POS.TREST[1]), q: QI.clone(), open: 0.02 };
const holdP = (t) => { const b = C.bodyAt(t); const p = V(b.x + 0.1, BT + 0.17, -1.0); return { p, q: qE(-0.35, 0.2, 0), open: 0.05 }; };
const mixT = (A, Bq, k) => ({ p: A.p.clone().lerp(Bq.p, k), q: A.q.clone().slerp(Bq.q, k), open: lerp(A.open, Bq.open, k) });
function tongPose(t) {
  const inT = (W) => t >= B(W[0]) && t < B(W[1]);
  if (!inT(TONG1) && !inT(TONG2)) return TREST;
  const W = inT(TONG1) ? TONG1 : TONG2; const eps = EP.filter(e => e.g0 >= W[0] && e.g1 <= W[1]);
  for (const e of eps) if (t >= B(e.g0) && t < B(e.g1)) { const s = pathAt(e.keys, t); return tongAround(s.p, s.pitch, t, 0, 0.0); }
  // fogáson kívül: elengedés (kinyit, hátrahúz) → tartás → odanyúlás (nyitva) → fogás
  let prev = null, next = null; for (const e of eps) { if (B(e.g1) <= t) prev = e; if (B(e.g0) > t && !next) next = e; }
  const endPose = (e) => { const s = pathAt(e.keys, B(e.g1)); return { s, g: tongAround(s.p, s.pitch, B(e.g1)) }; };
  const startPose = (e) => { const s = pathAt(e.keys, B(e.g0)); return { s, g: tongAround(s.p, s.pitch, B(e.g0)) }; };
  const pickA = B(W[0]), pickB = B(W[0] + 0.5), putA = B(W[1] - 0.55), putB = B(W[1]);
  if (t < pickB) return mixT(TREST, holdP(pickB), sm5(seg(t, pickA, pickB)));
  if (t >= putA && !next) return mixT(holdP(putA), TREST, sm5(seg(t, putA, putB)));
  let from, to, ta, tbb;
  if (prev && B(prev.g1) + B(prev.post) - B(0) > t && prev.post > 0) { const E = endPose(prev); const o = mixT(E.g, { ...E.g, open: 0.14 }, smooth(seg(t, B(prev.g1), B(prev.g1 + 0.15))));
    const r = tongAround(E.s.p, E.s.pitch, B(prev.g1), prev.back, 0.14); r.p.y += 0.02; return mixT(o, r, smooth(seg(t, B(prev.g1 + 0.15), B(prev.g1 + prev.post)))); }
  if (next && B(next.g0) - t < B(next.pre) - B(0) && next.pre > 0) { const S = startPose(next); const r = tongAround(S.s.p, S.s.pitch, B(next.g0 - next.pre), next.bpre, 0.14); r.p.y += 0.02;
    const ap = mixT(r, { ...S.g, open: 0.14 }, smooth(seg(t, B(next.g0 - next.pre), B(next.g0 - 0.12)))); return mixT(ap, S.g, smooth(seg(t, B(next.g0 - 0.12), B(next.g0)))); }
  // szabad tartás a két művelet között
  from = prev ? (() => { const E = endPose(prev); const r = tongAround(E.s.p, E.s.pitch, B(prev.g1 + prev.post), prev.back, 0.14); r.p.y += 0.02; return r; })() : holdP(pickB); ta = prev ? B(prev.g1 + prev.post) : pickB;
  to = next ? (() => { const S = startPose(next); const r = tongAround(S.s.p, S.s.pitch, B(next.g0 - next.pre), next.bpre, 0.14); r.p.y += 0.02; return r; })() : holdP(putA); tbb = next ? B(next.g0 - next.pre) : putA;
  const k = sm5(seg(t, ta, tbb)); const mid = holdP(t); const a = mixT(from, mid, smooth(clamp(k * 2.2))); return mixT(a, to, smooth(clamp((k - 0.55) / 0.45))); }
// ---------------- kemence ajtaja, exszikkátor fedele (kulcsok: [ütem, érték]) ----------------
const ramp = (K) => (t) => { if (t <= B(K[0][0])) return K[0][1]; for (let i = 1; i < K.length; i++) if (t < B(K[i][0])) return lerp(K[i - 1][1], K[i][1], smooth(seg(t, B(K[i - 1][0]), B(K[i][0])))); return K[K.length - 1][1]; };
const DOORK = [[0, 1], [3.9, 1], [4, 0], [29.4, 0], [29.9, 1], [31.7, 1], [32.2, 0], [33.8, 0], [34.3, 1], [35.9, 1], [36.4, 0], [58.2, 0], [58.7, 1], [59.7, 1], [60.2, 0], [63.8, 0], [64.3, 1], [65.9, 1], [66.4, 0]];
const doorK = ramp(DOORK);
const LIDK = [[0, 0], [37.6, 0], [38.1, -0.13], [40.0, -0.13], [40.5, 0], [42.0, 0], [42.5, -0.13], [43.3, -0.13], [43.8, 0], [67.6, 0], [68.1, -0.13], [70.0, -0.13], [70.5, 0], [72.0, 0], [72.5, -0.13], [73.3, -0.13], [73.8, 0]];
const lidX = ramp(LIDK);
// ---------------- mozsártörő, szita, kanál ----------------
const MORTP = V(POS.MORT[0], BT, POS.MORT[1]);
function pestPose(t) { const restTop = MORTP.clone().add(V(0.045, 0.125, 0.035)), restHead = MORTP.clone().add(V(-0.008, 0.013, -0.006));
  let head = restHead, top = restTop;
  if (t >= B(GRIND[0] + 0.3) && t < B(GRIND[1] - 0.3)) { const e = smooth(seg(t, B(GRIND[0] + 0.3), B(GRIND[0] + 0.7))) * (1 - smooth(seg(t, B(GRIND[1] - 0.7), B(GRIND[1] - 0.3)))); const w = (t - B(GRIND[0])) * 5.0;
    head = MORTP.clone().add(V(0.022 * Math.cos(w) * e - 0.008 * (1 - e), 0.013, 0.022 * Math.sin(w) * e - 0.006 * (1 - e))); top = MORTP.clone().add(V(0.02 + 0.025 * (1 - e) + 0.008 * Math.cos(w) * e, 0.13, 0.025 + 0.01 * (1 - e) + 0.008 * Math.sin(w) * e)); }
  const d = top.clone().sub(head).normalize(); return { p: head, q: new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d) }; }
const SIEVEP = V(POS.SIEVE[0], BT, POS.SIEVE[1]);
const shakeOff = (t) => { const e = smooth(seg(t, B(SHAKE[0] + 0.2), B(SHAKE[0] + 0.5))) * (1 - smooth(seg(t, B(SHAKE[1] - 0.5), B(SHAKE[1] - 0.2)))); const w = (t - B(SHAKE[0])) * 15; return V(0.011 * Math.sin(w) * e, 0, 0.004 * Math.sin(w * 0.5) * e); };
const svTopPose = (t) => { if (t < B(SVOFF[0] + 0.2)) return { p: SIEVEP.clone().add(shakeOff(t)).add(V(0, SV.PH - 0.004, 0)), q: QI.clone() };
  return keyed([{ t: B(SVOFF[0] + 0.2), p: [SIEVEP.x, BT + SV.PH - 0.004, SIEVEP.z] }, { t: B(SVOFF[1] - 0.1), p: [POS.SVOFF[0], BT, POS.SVOFF[1]], lift: 0.05 }])(t); };
const SPA = 0.2, SYAW = 0.0, qS = (roll, pitch) => new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), SYAW).multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), pitch)).multiply(new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), roll));
const SPOON0 = { p: V(POS.SPOON[0], BT, POS.SPOON[1]), q: qS(0, SPA) };
const PAN = V(POS.SIEVE[0] - 0.012, BT + 0.009, POS.SIEVE[1]), CRU_IN = (h) => V(P.SC[0], P.SC[1] + CR.W + 0.004 + h, P.SC[2]);
function spoonPose(t) {
  const a = SPOON[0]; if (t < B(a) || t >= B(SPOON[1])) return { p: SPOON0.p.clone(), q: SPOON0.q.clone() };
  const dip = { p: PAN.clone(), q: qS(0, 0.12) }, dipUp = { p: PAN.clone().add(V(0.01, 0.05, 0)), q: qS(0, 0.05) }, over = { p: CRU_IN(0.03), q: qS(0, 0.05) }, pour = { p: CRU_IN(0.024), q: qS(-1.0, 0.05) };
  const btw = (A, Bq, a1, b1, arc = 0) => { const k = sm5(seg(t, B(a1), B(b1))); return { p: A.p.clone().lerp(Bq.p, k).add(V(0, arc * Math.sin(Math.PI * k), 0)), q: A.q.clone().slerp(Bq.q, k) }; };
  const S = [[a, SPOON0], [a + 0.8, dipUp], [a + 1.2, dip], [a + 1.5, dipUp], [a + 2.1, over], [a + 2.4, pour], [a + 2.8, over], [a + 3.4, dipUp], [a + 3.8, dip], [a + 4.1, dipUp], [a + 4.7, over], [a + 5.0, pour], [a + 5.4, over], [SPOON[1] - 0.05, SPOON0]];
  for (let i = 1; i < S.length; i++) if (t < B(S[i][0])) return btw(S[i - 1][1], S[i][1], S[i - 1][0], S[i][0], (i === 1 || i === S.length - 1) ? 0.04 : 0);
  return { p: SPOON0.p.clone(), q: SPOON0.q.clone() }; }
const spoonLoad = (t) => { const a = SPOON[0]; for (const [d0, p0] of [[a + 1.2, a + 2.4], [a + 3.8, a + 5.0]]) if (t > B(d0) && t < B(p0 + 0.2)) return 1 - smooth(seg(t, B(p0), B(p0 + 0.2))); return 0; };
const soilLevel = (t) => { if (t < B(4)) return 0.005; if (t < B(SPOON[0])) return 0; const a = SPOON[0]; return 0.0025 * smooth(seg(t, B(a + 2.4), B(a + 2.8))) + 0.0025 * smooth(seg(t, B(a + 5.0), B(a + 5.4))); };

export function build(L, R) {
  stdPoses(); const G = L.G; C = new Choreo(L, { hang: true }); X.C = C; L.pc.g.visible = false;
  L.scl.G.position.set(POS.SCL, BT, -1.05);
  X.mort = SZ.mortar(); X.mort.position.copy(MORTP); G.add(X.mort);
  X.pest = SZ.pestle(); G.add(X.pest); C.prop('pest', X.pest, pestPose);
  X.sv = SZ.sieve(); X.sv.position.copy(SIEVEP); G.add(X.sv); X.svTop = X.sv.top; X.sv.remove(X.svTop); G.add(X.svTop); C.prop('svTop', X.svTop, svTopPose);
  X.spoon = SZ.spoon(); G.add(X.spoon); C.prop('spoon', X.spoon, spoonPose);
  { const d = V(Math.cos(SYAW), 0, -Math.sin(SYAW)); const c = V(POS.SPOON[0], BT, POS.SPOON[1]).addScaledVector(d, 0.12 * Math.cos(SPA)); const b = cyl(0.008, 0.008, 0.031, M(0x3a2c22, { roughness: 0.6 }), c.x, BT + 0.0155, c.z, 12); G.add(b); }   // kanáltámasz
  X.des = SZ.desiccator(); X.des.position.set(POS.DESIC[0], BT, POS.DESIC[1]); G.add(X.des);
  X.plate = SZ.coolPlate(); X.plate.position.set(POS.PLATE[0], BT, POS.PLATE[1]); G.add(X.plate);
  X.rest = SZ.tongRest(); X.rest.position.set(POS.TREST[0], BT, POS.TREST[1] + 0.1); G.add(X.rest);
  X.furn = SZ.furnace(); X.furn.position.set(...FURNP); G.add(X.furn);
  X.cru = SZ.crucible(); G.add(X.cru); C.prop('cru', X.cru, cruPose);
  X.tong = SZ.tongs(); G.add(X.tong); C.prop('tong', X.tong, (t) => { const s = tongPose(t); return { p: s.p, q: s.q }; });
  // ---------------- a laboráns ----------------
  const Z = -0.6, BX = (b, x, o) => C.at(B(b), x, Z, o);
  const BZ = (b, x, z, o) => C.at(B(b), x, z, o);
  BX(0, -0.68); BX(16.4, -0.68); BX(22.2, -0.5, { spd: 0.5 }); BX(27.0, -0.5); BZ(27.8, 0.1, -0.5); BZ(28.6, 0.1, -0.5); BZ(29.3, 0.66, -0.5, { spd: 0.6 }); BZ(36.6, 0.66, -0.5); BZ(37.3, 0.24, -0.5);
  BZ(43.9, 0.24, -0.5); BZ(44.4, 0.06, -0.5, { spd: 0.45 }); BZ(45.8, 0.06, -0.5); BX(46.3, -0.3); BX(55.2, -0.3); BZ(55.8, 0.08, -0.5); BZ(57.6, 0.08, -0.5); BZ(58.2, 0.66, -0.5, { spd: 0.9 });
  BZ(66.6, 0.66, -0.5); BZ(67.3, 0.24, -0.5); BZ(73.9, 0.24, -0.5); BZ(74.4, 0.06, -0.5, { spd: 0.45 }); BZ(104, 0.06, -0.5);
  const aimL = (sd, pr, b, pl) => C.aimLocal(sd, pr, B(b), pl);
  // mozsártörő (jobb: erőfogás a nyélen, hüvelyk felül), a mozsár pereme (bal, oldalról)
  C.hold('R', B(GRIND[0]), B(GRIND[1]), 'pest', diskTop('R', V(0, 0.136, 0), 0.011, 0.03, C.aimLocal('R', 'pest', B(GRIND[0] + 0.5), [0, 0.136, 0]), { depth: 0.016, palmH: 0.035 }));
  C.hold('L', B(GRIND[0]), B(GRIND[1]), null, rimOblique('L', V(MORTP.x - MO.R, BT + MO.H, MORTP.z), V(-1, 0, 0), MO.H, MO.R, V(0, 0, -1), { inset: 0.004 }));
  // szita két kézzel (rázás), majd a felső rész le (bal kéz)
  const svG = (sd) => rimOblique(sd, V((sd === 'L' ? -1 : 1) * (SV.R + 0.002), SV.H, 0), V(sd === 'L' ? -1 : 1, 0, 0), SV.H, SV.R + 0.002, V(0, 0, -1), { inset: 0.003 });
  C.hold('L', B(SHAKE[0]), B(SVOFF[1]), 'svTop', svG('L')); C.hold('R', B(SHAKE[0]), B(SHAKE[1]), 'svTop', svG('R'));
  // kanál: a nyél a markban, tenyér lefelé, hüvelyk a kanálfej felé
  C.hold('R', B(SPOON[0]), B(SPOON[1]), 'spoon', powerCyl('R', V(0.12, 0.0105, 0), V(-1, 0, 0), 0.004, V(0, -1, 0)));
  // tégelyfogó: „kézfogás” helyzet, a tenyér a jobb szár felől, az ujjak alul átfogják a két szárat, a hüvelyk felül a pofák felé
  const tongG = powerCyl('R', V(0, 0, TG.GRIP), V(0, Math.sin(0.7), -Math.cos(0.7)), 0.012, V(-1, 0, 0));   // a szárak átlósan a markban (fogóként): a fogó a hüvelyk és a mutatóujj közt lép ki
  C.hold('R', B(TONG1[0]), B(TONG1[1]), 'tong', tongG).hold('R', B(TONG2[0]), B(TONG2[1]), 'tong', tongG);
  // kemence ajtaja (bal kéz a fogantyún, alulról-elölről akasztva emeli), exszikkátor fedele (bal kéz a gombon, oldalra tolja)
  const doorG = (t) => { const h = X.furn.handle; const c = V(FURNP[0] + h.x, BT + h.y + FU.DOORUP * doorK(t), FURNP[2] + h.z); return powerCyl('L', c, V(0, 1, 0), 0.008, V(1, 0, -0.15)); };
  const lidG = (t) => diskTop('L', V(POS.DESIC[0], BT + DS.H + X.des.knobY + 0.024, POS.DESIC[1] + lidX(t)), 0.013, 0.024, V(0.2, 0, -1), { depth: 0.008 });
  for (const [a, b] of [[29.3, 30.0], [31.6, 32.3], [33.7, 34.4], [35.8, 36.5], [58.1, 58.8], [59.6, 60.3], [63.7, 64.4], [65.8, 66.5]]) C.holdF('L', B(a), B(b), null, doorG);
  for (const [a, b] of [[37.5, 38.2], [39.9, 40.6], [41.9, 42.6], [43.2, 43.9], [67.5, 68.2], [69.9, 70.6], [71.9, 72.6], [73.2, 73.9]]) C.holdF('L', B(a), B(b), null, lidG);
  if (typeof window !== 'undefined') window.__X = X;
}

export function update(L, t, shot) {
  C.update(t);
  X.mort.set(smooth(seg(t, B(GRIND[0] + 0.4), B(GRIND[1] - 0.4))) * (t >= B(4) ? 1 : 0));
  X.mort.fine.visible = t < B(22); X.mort.soil.visible = t < B(22);
  { const k = smooth(seg(t, B(SHAKE[0] + 0.3), B(SHAKE[1] - 0.3))); X.sv.set(t < B(22) ? 0 : k); X.sv.coarse.visible = t >= B(22); X.sv.finePan.visible = t >= B(22.4); X.sv.position.copy(SIEVEP).add(shakeOff(t)); }
  X.spoon.load.visible = spoonLoad(t) > 0.02;
  X.cru.set(soilLevel(t) * (1 - 0.08 * TL.burnK(t)), TL.burnK(t), TL.hotK(t));
  X.tong.set(tongPose(t).open);
  X.furn.setDoor(doorK(t)); X.furn.cer.emissiveIntensity = 0.14; X.furn.light.intensity = 0.1 + 0.25 * doorK(t);
  if (X._ft !== TL.furnT(t)) { SZ.drawFurn(X.furn.disp, TL.furnT(t), true); X._ft = TL.furnT(t); }
  X.des.setLid(lidX(t));
  { const m = TL.scaleM(t); const k = m.toFixed(3); if (X._m !== k) { drawScale(L.scl.disp, m, 3); X._m = k; } }
  L.ovenDoor.rotation.y = 0; if (!X._ov) { const g = L.ovenDisp.g; g.fillStyle = '#1a0d0d'; g.fillRect(0, 0, 128, 40); g.fillStyle = '#ff6a4a'; g.font = '700 28px Arial'; g.textAlign = 'center'; g.fillText('110 °C', 64, 30); L.ovenDisp.t.needsUpdate = true; X._ov = 1; }
  C.apply(t, L.tech, shot && shot.look !== undefined ? { look: shot.look } : {});
  return { X, C };
}
export const __X = X;
