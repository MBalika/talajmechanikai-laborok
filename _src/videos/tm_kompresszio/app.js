// Kompressziós vizsgálat – labor: minta-előkészítés (kiszúrás, levágás, lehúzás, mérés), cella beépítése, emelőkaros keret,
// előterhelés, nullázás, elárasztás, terhelési lépcsők súlytárcsákkal, leolvasás, tehermentesítés, kiszerelés.
// Minden mozdulatot a laboráns keze végez (tm_lab/act.js koreográfia, tm_lab/grips2.js pontos fogások).
import { THREE, V, BT, M, cyl, bx, drawScale, drawPC } from '../tm_lab/room.js';
import { Choreo, keyed, still, stdPoses } from '../tm_lab/act.js';
import { spanGrip, wrapGrip, flatGrip, pinchGrip, pointGrip, twoPoint } from '../tm_lab/grips2.js';
import * as O2 from '../tm_lab/oedo2.js';
import { tb, eAt, sAt, discsOn, DISCS, STEP_T, SEQ, minAt, M_RING, M_SOIL, M_DRY } from './timeline.js';
import { clamp, smooth, seg } from '../../kit/util.js';
export const POS = { plate: [1.4, -1.0], scale: 2.1, bowl: [2.68, -1.12], pbox: [2.27, -1.27], base0: [2.45, -1.0], O: [2.95, -1.02], beaker: [2.74, -1.28], timer: [3.2, -0.88], stand: [3.98, -1.0] };
export function board(g) { g.strokeStyle = '#2b4f9e'; g.lineWidth = 5; g.fillStyle = '#2b4f9e'; g.font = '700 34px Arial'; g.fillText('Ödométer · 1:10', 70, 70);
  g.beginPath(); g.moveTo(100, 420); g.lineTo(940, 420); g.moveTo(100, 420); g.lineTo(100, 110); g.stroke(); g.font = '600 26px Arial'; g.fillText('log σ′', 860, 470); g.fillText('e', 60, 130);
  g.strokeStyle = '#c0392b'; g.beginPath(); g.moveTo(130, 150); g.bezierCurveTo(420, 175, 520, 230, 900, 400); g.stroke(); }
const B = (b) => tb(b);
const tv = (a) => V(a[0], a[1], a[2]);
const PANY = 0.069;                                   // a mérleg tányérjának teteje (BT fölött)
let C, X = {};
const PL = () => POS.plate;
// ---- a gyűrű mintával: helyzet az időben ----
const RING_TOP0 = 0.066;                              // a talajhenger teteje (üveglap 6 mm + 60 mm)
const ringPush = (t) => { let d = 0; for (let k = 0; k < 4; k++) d += 0.00625 * smooth(seg(t, B(27.5 + 2 * k), B(28 + 2 * k))); return d; };   // 4 × 6,25 mm
export function build(L, R) {
  stdPoses(); const G = L.G; const A = O2.mats2(); C = new Choreo(L); X.C = C;
  L.scl.G.position.set(POS.scale, BT, -1.05); L.pc.g.position.x = 0.6;
  // --- eszközök a minta-előkészítéshez ---
  X.plate = O2.glassPlate2(); X.plate.position.set(PL()[0] + 0.03, BT, PL()[1] + 0.02); G.add(X.plate);
  X.block = O2.soilBlock(); G.add(X.block); C.prop('block', X.block, still([PL()[0], BT + 0.006, PL()[1]]));
  X.crumbs = O2.crumbs(30); X.crumbs.position.set(PL()[0], BT + 0.006, PL()[1]); G.add(X.crumbs);
  X.ring = O2.ringWithSpecimen(); G.add(X.ring);
  const R0 = [1.9, BT, -0.9], RS = [POS.scale, BT + PANY, -1.06], RT = [PL()[0], BT + RING_TOP0, PL()[1]], RP = [PL()[0] + 0.1, BT + 0.006, PL()[1] + 0.06];
  const BASEY = 0.0206;                               // a gyűrű alja a cellaaljban (kő + papír fölött)
  X.ringKeys = keyed([{ t: 0, p: R0 }, { t: B(21.4), p: RS, lift: 0.08, from: B(20.6) }, { t: B(24.2), p: RT, lift: 0.07, from: B(22.8) },
    { t: B(39.4), p: RP, lift: 0.05, from: B(38.4) }, { t: B(44.4), p: RS, lift: 0.08, from: B(43.4) }]);
  const ringPose = (t) => { if (t < B(26)) return X.ringKeys(t); if (t < B(38.4)) { const p = tv(RT); p.y -= ringPush(t); return { p, q: new THREE.Quaternion() }; } if (t < B(53.8)) return X.ringKeys(t);
    if (t < B(55.6)) return keyed([{ t: B(53.8), p: RS }, { t: B(55.6), p: [POS.base0[0], BT + BASEY, POS.base0[1]], lift: 0.07 }])(t);
    if (t > B(110.9)) return still(RS)(t); return cellPart(t, [0, BASEY, 0]); };
  C.prop('ring', X.ring, ringPose);
  X.cap1 = O2.pressCap(); G.add(X.cap1); const CP0 = [PL()[0] - 0.15, BT, PL()[1] - 0.15];
  C.prop('pcap', X.cap1, (t) => { if (t < B(24.8)) return still(CP0)(t); if (t < B(25.7)) return keyed([{ t: B(24.8), p: CP0 }, { t: B(25.7), p: [RT[0], RT[1] + 0.02, RT[2]], lift: 0.06 }])(t);
    if (t < B(34.1)) { const p = tv(RT); p.y += 0.02 - ringPush(t); return { p, q: new THREE.Quaternion() }; } const p1 = tv(RT); p1.y += 0.02 - ringPush(t); return keyed([{ t: B(34.1), p: [p1.x, p1.y, p1.z] }, { t: B(34.9), p: CP0, lift: 0.05 }])(t); });
  X.knife = O2.knife(); G.add(X.knife); const KN0 = { p: [PL()[0] + 0.2, BT + 0.011, -0.86], r: [0, 0.5, 0] };
  C.prop('knife', X.knife, knifePose(KN0, RT));
  X.saw = O2.wireSaw(); G.add(X.saw); const SW0 = [PL()[0] - 0.02, BT + 0.011, -0.865];
  X.sawPose = keyed([{ t: B(35.0), p: SW0, r: [Math.PI / 2, 0, 0] }, { t: B(35.9), p: [PL()[0], BT + 0.041 + 0.03, PL()[1] - 0.075], r: [0, 0, 0], lift: 0.09 },
    { t: B(37.0), p: [PL()[0], BT + 0.041 + 0.03, PL()[1] + 0.075], r: [0, 0, 0] }, { t: B(37.7), p: SW0, r: [Math.PI / 2, 0, 0], lift: 0.03 }]);
  C.prop('saw', X.saw, X.sawPose);
  sawK = (t) => { const e = new THREE.Euler().setFromQuaternion(X.sawPose(t).q, 'YXZ'); return clamp(1 - Math.abs(e.x) / (Math.PI / 2)); };
  X.toolBlock = bx(-0.07, 0.07, 0, 0.02, -0.03, 0.03, A.wood, G); X.toolBlock.position.set(PL()[0] + 0.24, BT, PL()[1] - 0.08);
  X.ruler = O2.straightEdge(); G.add(X.ruler); const RU0 = { p: [PL()[0] + 0.24 + 0.04, BT + 0.021, PL()[1] - 0.08 + 0.015], r: [-Math.PI / 2, 0, 0] };
  X.rulerPose = keyed([{ t: B(39.8), ...RU0 }, { t: B(40.5), p: [RP[0], RP[1] + 0.0255, RP[2] - 0.06], r: [0, 0, 0], lift: 0.06 }, { t: B(41.5), p: [RP[0], RP[1] + 0.02, RP[2] + 0.06], r: [0, 0, 0] }, { t: B(42.2), ...RU0, lift: 0.05 }]);
  C.prop('ruler', X.ruler, X.rulerPose);
  X.tin = O2.tin2(); G.add(X.tin); C.prop('tin', X.tin, still([PL()[0] + 0.18, BT, PL()[1] + 0.07]));
  // --- cella-részek ---
  X.base = O2.cellBase(); G.add(X.base);
  const CELLF = [POS.O[0], BT + 0.034, POS.O[1]];
  X.basePose = keyed([{ t: 0, p: [POS.base0[0], BT, POS.base0[1]] }, { t: B(66.4), p: CELLF, lift: 0.07, from: B(64.6) }]);
  C.prop('base', X.base, X.basePose);
  const cellPart = (t, off) => { const b = X.basePose(t); const p = b.p.clone().add(tv(off).applyQuaternion(b.q)); return { p, q: b.q.clone() }; };
  X.cellPart = cellPart;
  X.bowl = O2.waterBowl(); X.bowl.position.set(POS.bowl[0], BT, POS.bowl[1]); G.add(X.bowl);
  X.stone1 = O2.stone(); X.stone2 = O2.stone(); G.add(X.stone1, X.stone2);
  const SB1 = [POS.bowl[0] - 0.035, BT + 0.006, POS.bowl[1]], SB2 = [POS.bowl[0] + 0.035, BT + 0.006, POS.bowl[1]];
  C.prop('stone1', X.stone1, (t) => t < B(51.2) ? keyed([{ t: B(50.4), p: SB1 }, { t: B(51.2), p: [POS.base0[0], BT + 0.012, POS.base0[1]], lift: 0.07 }])(t) : cellPart(t, [0, 0.012, 0]));
  X.box = O2.paperBox(); X.box.position.set(POS.pbox[0], BT, POS.pbox[1]); G.add(X.box);
  X.paper1 = O2.paper(); X.paper2 = O2.paper(); G.add(X.paper1, X.paper2); const PB = [POS.pbox[0] + 0.006, BT + 0.018, POS.pbox[1]];
  C.prop('paper1', X.paper1, (t) => t < B(53.0) ? keyed([{ t: B(52.2), p: PB }, { t: B(52.8), p: [POS.base0[0], BT + 0.062, POS.base0[1]], lift: 0.05 }, { t: B(53.0), p: [POS.base0[0], BT + 0.02, POS.base0[1]] }])(t) : cellPart(t, [0, 0.02, 0]));   // a fal fölött elengedi, a papír a kőre hull
  X.specTop = (t) => 0.02 - sAt(t) / 1000;                                   // a minta teteje a gyűrű aljától
  C.prop('paper2', X.paper2, (t) => t < B(56.8) ? keyed([{ t: B(56.0), p: PB }, { t: B(56.6), p: [POS.base0[0], BT + Math.max(0.062, BASEY + 0.045), POS.base0[1]], lift: 0.05 }, { t: B(56.8), p: [POS.base0[0], BT + BASEY + 0.02, POS.base0[1]] }])(t) : cellPart(t, [0, BASEY + X.specTop(t), 0]), (t) => t > B(55.9));
  C.prop('stone2', X.stone2, (t) => t < B(58.2) ? keyed([{ t: B(57.4), p: SB2 }, { t: B(58.2), p: [POS.base0[0], BT + BASEY + 0.0206, POS.base0[1]], lift: 0.07 }])(t) : cellPart(t, [0, BASEY + X.specTop(t) + 0.0006, 0]));
  X.clamp = O2.clampRing(); G.add(X.clamp); const CL0 = [POS.base0[0] - 0.16, BT, -0.88];
  C.prop('clamp', X.clamp, (t) => t < B(59.6) ? keyed([{ t: B(58.8), p: CL0 }, { t: B(59.6), p: [POS.base0[0], BT + 0.024, POS.base0[1]], lift: 0.08 }])(t) : cellPart(t, [0, 0.024, 0]));
  X.lcap = O2.loadCap(); G.add(X.lcap); const LC0 = [POS.base0[0] + 0.16, BT, -0.88];
  C.prop('lcap', X.lcap, (t) => t < B(62.6) ? keyed([{ t: B(61.8), p: LC0 }, { t: B(62.6), p: [POS.base0[0], BT + BASEY + 0.0292, POS.base0[1]], lift: 0.07 }])(t) : cellPart(t, [0, BASEY + X.specTop(t) + 0.0086, 0]));
  // --- keret ---
  X.fr = O2.oedFrame(); X.fr.position.set(POS.O[0], BT, POS.O[1]); G.add(X.fr);
  X.hangPoint = (tt) => { const th2 = theta(tt); const h2 = V(FR.hang - FR.piv, -0.012, 0).applyAxisAngle(V(0, 0, 1), th2).add(X.fr.beam.position); return V(POS.O[0] + h2.x, BT + h2.y - FR.rod, POS.O[1]); };
  X.stand = O2.weightStand(); X.stand.position.set(POS.stand[0], 0, POS.stand[1]); G.add(X.stand);
  X.discs = []; const DR = { 25: [0.075, 0.0081], 50: [0.075, 0.0162], 100: [0.08, 0.0285], 200: [0.09, 0.045], 400: [0.1, 0.073] };
  const KG = { 25: 1.13, 50: 2.25, 100: 4.50, 200: 9.01, 400: 18.02 };
  DISCS.forEach((k, i) => { const d = O2.slotDisc(k, KG[k], DR[k][0], DR[k][1]); G.add(d); X.discs.push(d); });
  X.beaker = O2.beaker(); G.add(X.beaker);
  const BKP = [POS.O[0] - 0.05, BT + 0.115, POS.O[1] + 0.135];
  X.beakerPose = keyed([{ t: B(73.2), p: [POS.beaker[0], BT, POS.beaker[1]] }, { t: B(74.4), p: BKP, lift: 0.06 }, { t: B(75.0), p: BKP, r: [-1.15, 0, 0] }, { t: B(75.9), p: BKP, r: [-1.15, 0, 0] },
    { t: B(76.4), p: BKP, r: [0, 0, 0] }, { t: B(77.4), p: [POS.beaker[0], BT, POS.beaker[1]], lift: 0.05 }]);
  C.prop('beaker', X.beaker, X.beakerPose);
  X.timer = O2.timer(); X.timer.position.set(POS.timer[0], BT, POS.timer[1]); X.timer.rotation.y = -0.3; G.add(X.timer);
  // --- tárcsák helye ---
  setupDiscs();
  // --- laboráns ---
  choreo(L); if (typeof window !== 'undefined') window.__X = X;
}
// kés: kiszúráskor függőleges penge (élével lefelé), a talajhenger palástján érintőlegesen, 3 húzás lépcsőnként
function knifePose(K0, RT) {   // húzások a henger jobb oldalán (+x), a kéz felől
  const strokes = []; for (let k = 0; k < 4; k++) for (let j = 0; j < 3; j++) { const a = 0.95 + 0.42 * j; const t0 = B(26.15 + 2 * k + j * 0.45); strokes.push({ t0, t1: t0 + B(0.4), a, k }); }
  return (t) => {
    if (t < B(26.0) || t > B(33.9)) { if (t >= B(33.9)) { const pk = posAt(B(33.85)); return keyed([{ t: B(33.9), p: pk.p, r: pk.r }, { t: B(34.6), p: K0.p, r: K0.r, lift: 0.04 }])(t); } return { p: tv(K0.p), q: new THREE.Quaternion().setFromEuler(new THREE.Euler(...K0.r, 'YXZ')) }; }
    const pk = posAt(t); return { p: pk.p, q: new THREE.Quaternion().setFromEuler(new THREE.Euler(pk.r[0], pk.r[1], pk.r[2], 'YXZ')) };
  };
  function posAt(t) {
    const ringBot = RT[1] - ringPush(t); const top = (a, y) => [RT[0] + Math.sin(a) * 0.044, y, RT[2] + Math.cos(a) * 0.044];
    let cur = null, prev = null; for (const s of strokes) { if (t >= s.t0 && t <= s.t1) cur = s; if (s.t1 < t) prev = s; }
    const yA = (s) => ringBot + 0.125 + 0.006, yB = (s) => ringBot + 0.125 - 0.014;
    if (cur) { const u = smooth((t - cur.t0) / (cur.t1 - cur.t0)); const p = top(cur.a, yA(cur) + (yB(cur) - yA(cur)) * u); return { p: tv(p), r: [0, cur.a, -Math.PI / 2] }; }
    const nxt = strokes.find(s => s.t0 > t); const a0 = prev ? prev.a : 0, a1 = nxt ? nxt.a : a0; const t0 = prev ? prev.t1 : B(26.0), t1 = nxt ? nxt.t0 : t0 + 1; const u = smooth(clamp((t - t0) / (t1 - t0)));
    const a = a0 + (a1 - a0) * u; const p = top(a, yA() + 0.012 * Math.sin(Math.PI * u) - 0.014 * (1 - u) * (prev ? 1 : 0)); return { p: tv(p), r: [0, a, -Math.PI / 2] };
  }
}
// tárcsák: állvány (verem) ↔ akasztó, az ütemezés (STEP_T, SEQ) szerint
function setupDiscs() {
  const st = X.stand.position; const H = X.discs.map(d => d.h);
  const standY = (i, standSet) => { let y = X.stand.top; const order = [...standSet].sort((a, b) => b - a); for (const j of order) { if (j === i) break; y += H[j]; } return y; };
  // események sorrendben: [ütem-tól, ütem-ig, tárcsa, 'on'|'off']
  const ev = []; SEQ.forEach((q, i) => { const S = STEP_T[i]; if (q.add !== undefined) ev.push({ a: S.disc[0], b: S.disc[1], i: q.add, on: true }); if (q.rem !== undefined) ev.push({ a: S.disc[0], b: S.disc[1], i: q.rem, on: false }); });
  X.discEv = ev;
  const hangPos = (t, i) => { const hp = X.hangPoint(t); let y = hp.y; for (let j = 0; j < i; j++) y += H[j]; return V(hp.x, y, hp.z); };
  const standPos = (t, i) => { // a verem a pillanatnyi állvány-tartalomhoz igazodik
    const onStand = new Set([0, 1, 2, 3, 4, 5]); let returned = []; for (const e of ev) { if (tb(e.b) > t) break; if (e.on) onStand.delete(e.i); else { onStand.add(e.i); returned.push(e.i); } }
    // visszarakott tárcsák a verem tetejére kerülnek, a sorrendjük szerint
    let y = X.stand.top; const base = [...onStand].filter(j => !returned.includes(j)).sort((a, b) => b - a); for (const j of base) { if (j === i) return V(st.x, y, st.z); y += H[j]; }
    for (const j of returned) { if (j === i) return V(st.x, y, st.z); if (onStand.has(j)) y += H[j]; } return V(st.x, y, st.z); };
  X.discs.forEach((d, i) => { C.prop('disc' + i, d, (t) => {
    let state = { where: 'stand' }; for (const e of ev) { if (e.i !== i) continue; if (t < tb(e.a)) break; if (t <= tb(e.b)) { state = { where: 'move', e }; break; } state = { where: e.on ? 'hang' : 'stand' }; }
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0));   // a rés hátrafelé (-z) nyílik
    if (state.where === 'hang') return { p: hangPos(t, i), q };
    if (state.where === 'stand') return { p: standPos(t, i), q };
    const e = state.e; const A = e.on ? standPos(tb(e.a) - 0.01, i) : hangPos(tb(e.a), i), Bp = e.on ? hangPos(tb(e.b), i) : standPos(tb(e.b) + 0.01, i);
    let u = (t - tb(e.a)) / (tb(e.b) - tb(e.a)); // felrakás: emel → az akasztó elé → hátra a rúdra (a rés előre megy) → leenged; levétel: fordítva
    const H0 = e.on ? A : Bp, H1 = e.on ? Bp : A; if (!e.on) u = 1 - u; const up = Math.max(H0.y, H1.y) + 0.035; const pre = V(H1.x, up, H1.z + 0.17);
    const k1 = smooth(clamp(u / 0.18)), k2 = smooth(clamp((u - 0.15) / 0.45)), k3 = smooth(clamp((u - 0.6) / 0.22)), k4 = smooth(clamp((u - 0.82) / 0.18));
    let p = V(H0.x, H0.y + (up - H0.y) * k1, H0.z); p.lerp(pre, k2); p.lerp(V(H1.x, up, H1.z), k3); p.y += (H1.y - up) * k4; return { p, q }; }); });
}
// ---- keret: kar szöge, karemelő, akasztó ----
let sawK = () => 0;
const DISC_A = Math.PI / 2, DISC_FLEX = { I: [0.35, 0.45, 0.25], M: [0.8, 0.95, 0.5], R: [0.9, 1.0, 0.55], P: [1.0, 1.05, 0.6] };   // tárcsafogás: a perem oldalain (a laboráns felől 77°-ra), hüvelyk a tetején, mutatóujj a paláston
const FR = O2.FR, PIVY = FR.base + FR.beamY, TIP0 = -0.04;           // a terhelőcsavar hegye a kar tengelye alatt
function ballTopF(t) { return 0.034 + 0.0206 + X.specTop(t) + 0.0006 + 0.008 + O2.DIM.capH + 0.0165; }   // keret-helyi y
function jackUp(t) { // a karemelő párnájának teteje (keret-helyi y); 0: lent
  const touch = (tt) => PIVY - 0.014 + 0.46 * thetaBall(tt) - 0.0005; const low = PIVY - 0.06, set = PIVY - 0.014 + 0.46 * 0.06;
  if (t < B(67.0)) return set; if (t < B(69.4)) return set + (low - set) * smooth(seg(t, B(67.0), B(69.4)));
  for (const S of STEP_T) { if (S.up === undefined || t < B(S.up)) continue; if (t < B(S.up + 0.28)) return low + (touch(t) - low) * smooth(seg(t, B(S.up), B(S.up + 0.28))); if (t < B(S.down[0])) return touch(t); if (t < B(S.down[1])) return touch(t) + (low - touch(t)) * smooth(seg(t, B(S.down[0]), B(S.down[1]))); }
  return low; }
function thetaBall(t) { return Math.asin(clamp((ballTopF(t) - PIVY - TIP0) / 0.08, -0.3, 0.3)); }
function theta(t) { const tj = Math.asin(clamp((jackUp(t) - PIVY + 0.014) / 0.46, -0.3, 0.3)); return t < B(66.4) ? tj : Math.max(thetaBall(t), tj); }
function wheelAng(t) { const low = PIVY - 0.06, set = PIVY - 0.014 + 0.46 * 0.06; return (jackUp(t) - low) / (set - low) * Math.PI * 4; }
// ---- koreográfia ----
function choreo(L) {
  const z = -0.6;
  // állomások (érkezési idők)
  C.at(0, 1.78, z).at(B(20), 1.86, z).at(B(21.3), 2.02, z).at(B(22.6), 2.0, z).at(B(24.0), 1.4, z).at(B(42.4), 1.42, z).at(B(43.6), 1.98, z)
   .at(B(50.0), 2.47, z).at(B(51.5), 2.47, z).at(B(51.95), 2.25, z).at(B(53.2), 2.25, z).at(B(53.6), 2.15, z).at(B(55.0), 2.27, z).at(B(55.75), 2.25, z).at(B(57.0), 2.25, z).at(B(57.25), 2.45, z).at(B(64.4), 2.45, z).at(B(66.2), 2.93, z)
   .at(B(66.9), 3.2, z).at(B(70.6), 3.04, z).at(B(73.0), 2.8, z).at(B(77.5), 2.92, z).at(B(82.8), 3.24, z).at(B(83.3), 3.24, z).at(B(86.12), 3.24, z).at(B(88.0), 3.24, z);
  // tárcsák: guggolva, oldallépéssel az állvány (xs) és az akasztó (xh) elé – a kezek mindig a teste előtt dolgoznak
  { const xs = 3.9, xh = 3.71, zd = -0.74, o = { squat: 0.3 }; for (const e of X.discEv) { const d = e.b - e.a;
      if (e.on) C.at(B(e.a - 0.03), xs, zd, o).at(B(e.a + 0.14 * d), xs, zd, o).at(B(e.a + 0.62 * d), xh, zd, o).at(B(e.b + 0.03), xh, zd, o);
      else C.at(B(e.a - 0.03), xh, zd, o).at(B(e.a + 0.4 * d), xh, zd, o).at(B(e.a + 0.86 * d), xs, zd, o).at(B(e.b + 0.03), xs, zd, o); } }
  C.at(B(109.35), 3.0, z).at(B(114), 3.0, z);
  const F = V(0, 0, -1);
  // gyűrű: mérlegre, a mintára, vissza a lapra, mérlegre, a cellába
  const ringSpan = spanGrip('R', V(0, 0.02, 0), 0.0405, 0.02, F);
  C.hold('R', B(20.5), B(21.5), 'ring', ringSpan).hold('R', B(22.7), B(24.3), 'ring', ringSpan).hold('R', B(38.3), B(39.5), 'ring', ringSpan).hold('R', B(43.3), B(44.5), 'ring', ringSpan).hold('R', B(53.7), B(55.7), 'ring', ringSpan);
  // nyomósapka: rá a gyűrűre (bal kéz), majd tenyér a gombján a kiszúrás alatt, végül le
  const capSpan = spanGrip('L', V(0, 0.012, 0), 0.0435, 0.012, V(0.15, 0, -1));
  C.hold('L', B(24.7), B(25.8), 'pcap', capSpan);
  C.hold('L', B(26.1), B(33.95), 'pcap', flatGrip('L', V(0, 0.034, 0), V(0, 1, 0), V(0.25, 0, -1)));
  C.hold('L', B(34.0), B(35.0), 'pcap', capSpan);
  // kés: a nyél markolva (a nyél a kés helyi x-tengelyén, -0,05-nél)
  C.hold('R', B(25.9), B(34.7), 'knife', wrapGrip('R', V(-0.055, 0, 0), V(-1, 0, 0), 0.0102, V(0, 0, -1), { pole: V(-0.9, -0.3, -0.4) }));
  // huzalfűrész: két kéz a nyeleken (a nyél tengelye a fűrész helyi y-ja, hüvelyk felfelé)
  // (a fogantyúk használat közben a felső végükkel ~29°-ot dőlnek el a laboránstól: így az alkar folytatásában vannak; a kéz kívülről fogja, a huzal az ujjai közt fut)
  const sawGrip = (sd, x) => (t) => { const k = sawK(t); const A = V(0, Math.cos(0.5 * k), -Math.sin(0.5 * k)); return wrapGrip(sd, V(x, 0, 0).addScaledVector(A, 0.012), A, 0.011, V(-Math.sign(x) * k, 0, 1 - k)); };   // fekve: felülről (helyi +z = lefelé), használatban: kívülről
  C.holdF('L', B(35.0), B(37.7), 'saw', sawGrip('L', -0.14)); C.holdF('R', B(35.0), B(37.7), 'saw', sawGrip('R', 0.14));
  // acélvonalzó: a végénél csípve (hüvelyk a helyi +z oldalon)
  C.hold('R', B(39.7), B(42.3), 'ruler', pinchGrip('R', V(0.136, 0.022, 0), V(0, 0, -1), V(-0.8, -0.6, 0), { thick: 0.002, fa: 0.6, minDy: 0.0 }));
  // cella beépítése
  const stoneSpan = spanGrip('R', V(0, 0.008, 0), O2.DIM.stoneR, 0.008, F, { depth: 0.0015 });
  C.hold('R', B(50.3), B(51.3), 'stone1', stoneSpan).hold('R', B(57.3), B(58.3), 'stone2', stoneSpan);
  const paperPick = twoPoint('R', V(0.006, 0.0012, 0.033), V(0.025, 0.0012, 0.026), V(0.3, -0.6, -1), { minDy: 0.045 });
  C.hold('R', B(52.1), B(52.8), 'paper1', paperPick).hold('R', B(55.9), B(56.6), 'paper2', paperPick);
  C.hold('R', B(58.7), B(59.7), 'clamp', spanGrip('R', V(0, 0.01, 0), 0.058, 0.01, F));
  // rögzítőcsavarok: mutatóujj és hüvelyk a recézett fejen, kis csavaró mozdulat
  [0, 1, 2].forEach(k => { const a = k * Math.PI * 2 / 3 + Math.PI / 2; const sc = V(Math.cos(a) * 0.049, 0.015, Math.sin(a) * 0.049); const t0 = 59.9 + k * 0.55;
    C.holdF('R', B(t0), B(t0 + 0.45), 'clamp', (t) => { const w = Math.sin(seg(t, B(t0), B(t0 + 0.45)) * Math.PI * 2) * 0.35; const n = V(Math.cos(w), 0, Math.sin(w)); return pinchGrip('R', sc, n, V(0, -0.8, -0.6), { thick: 0.015, flex: { I: [0.45, 0.55, 0.3], M: [0.55, 0.6, 0.35], R: [0.6, 0.65, 0.35], P: [0.62, 0.68, 0.38] } }); }); });
  C.hold('R', B(61.7), B(62.7), 'lcap', spanGrip('R', V(0, O2.DIM.capH, 0), O2.DIM.capR, O2.DIM.capH, F));
  // cella a keretbe: két kéz a fogantyúkon (felülről, hüvelyk a cella felé)
  C.hold('L', B(64.5), B(66.5), 'base', wrapGrip('L', V(-0.13, 0.03, 0), V(1, 0, 0), 0.007, V(0, -1, 0.15)));
  C.hold('R', B(64.5), B(66.5), 'base', wrapGrip('R', V(0.13, 0.03, 0), V(-1, 0, 0), 0.007, V(0, -1, 0.15)));
  // karemelő kézikereke: a gombja körbejár
  const wheelGrip = (t) => { const a = wheelAng(t); const kx = 0.38 + Math.cos(a) * 0.038, kz = -Math.sin(a) * 0.038; const c = V(POS.O[0] + kx, BT + 0.075 + 0.018, POS.O[1] + kz);
    return wrapGrip('R', c, V(0, 1, 0), 0.006, V(-0.25, -0.2, -1), { pole: V(-0.9, -0.4, -0.3) }); };
  C.holdF('R', B(67.0), B(69.5), null, wheelGrip);
  for (const S of STEP_T) { if (S.up === undefined) continue; C.holdF('R', B(S.up - 0.05), B(S.up + 0.3), null, wheelGrip); C.holdF('R', B(S.down[0] - 0.05), B(S.down[1] + 0.02), null, wheelGrip); }
  // mérőóra nullázása: a mutatóujj a gyűrű peremén végigtolja
  C.holdF('R', B(71.0), B(72.4), null, (t) => { const a = 0.6 + 0.9 * smooth(seg(t, B(71.2), B(72.2))); const fr = X.fr; const bp = V(fr.position.x + 0.012, BT + 0.03 + 0.14, fr.position.z + 0.064);
    return pointGrip('R', V(bp.x + Math.cos(a) * 0.03, bp.y + Math.sin(a) * 0.03, bp.z + 0.009), V(0, 0, 1), V(-0.4, -0.3, -1)); });
  // főzőpohár: jobb kéz körülfogja
  C.hold('R', B(73.3), B(77.4), 'beaker', wrapGrip('R', V(0, 0.06, 0), V(0, 1, 0), 0.042, V(-0.85, 0, -0.5)));
  // időmérő gombja
  C.hold('L', B(86.6), B(86.98), null, pointGrip('L', V(POS.timer[0] + 0.028 * Math.cos(0.3), BT + 0.028, POS.timer[1] + 0.028 * Math.sin(0.3)), V(0, 1, 0), V(0.25, -0.4, -1)));
  // tárcsák: két kéz a peremen (hüvelyk a lap tetején, a középső ujj a palást oldalán), a tárcsa saját rendszerében
  X.discs.forEach((d, i) => { const r = d.r, h = d.h - 0.0024;
    // a tárcsa elülső (a laboráns felőli) peremén, ±40°-ban: hüvelyk a lap tetején, a középső ujj a palást oldalán; a kéz előre-lefelé nyúl (az alkar folytatásában)
    // (a tárcsa helyi rendszere: világ (a, 0, b) → helyi (−b, 0, a); a rés a világ −z felé, a laboráns felé eső perem helyi −x)
    const rim = (sx, rr, y) => V(-Math.cos(DISC_A) * rr, y, sx * Math.sin(DISC_A) * rr);
    // könnyű tárcsák (25, 25, 50 kPa: 1,1–2,3 kg): egy kézzel, a jobb elülső peremen csípve; nehezebbek: két kézzel a két oldalon
    const light = DISCS[i] <= 50; const fl = { I: [0.35, 0.45, 0.25], M: [0.45, 0.55, 0.3], R: [0.6, 0.7, 0.38], P: [0.65, 0.75, 0.42] };
    const rimA = (a, rr, y) => V(-Math.cos(a) * rr, y, Math.sin(a) * rr);
    const g1 = twoPoint('R', rimA(0.8, r - 0.022, h + 0.0085), rimA(0.8, r + 0.0085, h * 0.5), V(0.45, -0.8, 0.4), { to: 'M', fa: 1.1, minDy: 0.015, flex: fl });
    const gL = twoPoint('L', rim(-1, r - 0.024, h + 0.0085), rim(-1, r + 0.0085, h * 0.62), V(0.3, -0.8, -0.5), { to: 'M', fa: 1.3, minDy: 0.015, flex: fl });
    const gR = twoPoint('R', rim(1, r - 0.024, h + 0.0085), rim(1, r + 0.0085, h * 0.62), V(0.3, -0.8, 0.5), { to: 'M', fa: 1.3, minDy: 0.015, flex: fl });
    for (const e of X.discEv) if (e.i === i) { if (light) C.hold('R', B(e.a + 0.02), B(e.b - 0.02), 'disc' + i, g1); else { C.hold('L', B(e.a + 0.02), B(e.b - 0.02), 'disc' + i, gL); C.hold('R', B(e.a + 0.02), B(e.b - 0.02), 'disc' + i, gR); } } });
  // kiszerelés: a leeresztőcsap karja
  C.holdF('R', B(109.45), B(110.45), 'base', (t) => { const a = -Math.PI / 2 * smooth(seg(t, B(109.65), B(110.15))); const pt = V(0.026, 0.003, 0).applyAxisAngle(V(0, 1, 0), a).add(V(0, 0.022, 0.1)); return pinchGrip('R', pt, V(0, -1, 0), V(0.2, -0.5, -1), { thick: 0.004, fa: 1.2 }); });
}
// ---- frissítés ----
const EXPL = { base: 0, stone1: 0.06, paper1: 0.085, ring: 0.105, paper2: 0.142, stone2: 0.162, clamp: 0.192, lcap: 0.226 };
export function update(L, t, shot) {
  C.update(t);
  const expl = t > B(11.9) && t < B(20); if (expl) for (const k in EXPL) { const o = C.props[k].obj; o.position.set(POS.base0[0], BT + EXPL[k], POS.base0[1]); o.quaternion.identity(); o.visible = true; }
  // talajhenger, morzsák, minta a gyűrűben
  const push = ringPush(t), cut = t >= B(36.5); const ringBot = RING_TOP0 - push;
  let strokesDone = 0; for (let k = 0; k < 4; k++) strokesDone += clamp(seg(t, B(26.15 + 2 * k), B(27.5 + 2 * k)));
  const trimTo = 0.006 + 0.06 - Math.min(0.025, 0.00625 * strokesDone + 0.004 * Math.min(1, strokesDone));
  if (t < B(26)) X.block.setTrim(0.06, 0.06, 0); else X.block.setTrim(trimTo - 0.006, cut ? ringBot - 0.006 : 0.06, 0);
  X.crumbs.show(clamp(strokesDone / 4) * 0.85 + (t > B(42) ? 0.15 : 0)); X.crumbs.visible = t > B(26) && t < B(50);
  // minta a gyűrűben: kiszúrás közben a gyűrűben lévő rész; levágás után 25 mm (5 mm kiáll), lehúzás után 20 mm
  if (expl) X.ring.setSpec(0, 0.02); else if (t < B(26)) X.ring.setSpec(0, 0); else if (t < B(37)) X.ring.setSpec(0, Math.min(0.025, push + 0.0)); else if (t < B(40.5)) X.ring.setSpec(0, 0.025);
  else if (t < B(41.6)) { const u = smooth(seg(t, B(40.5), B(41.5))); X.ring.setSpec(0, 0.025 - 0.005 * u); } else X.ring.setSpec(0, 0.02 - sAt(t) / 1000);
  X.tin.soil.visible = t > B(42);
  // keret: kar szöge, karemelő, akasztó, mérőóra
  const th = theta(t); X.fr.beam.rotation.z = th; const jk = X.fr.jack; const jy = jackUp(t); jk.pad.position.y = jy - 0.003; jk.screw.position.y = jy - 0.066; jk.wheel.position.y = 0.075; jk.wheel.rotation.y = wheelAng(t);
  X.fr.updateMatrixWorld(true); const hp = V(FR.hang - FR.piv, -0.012, 0).applyAxisAngle(V(0, 0, 1), th).add(X.fr.beam.position); X.fr.hanger.position.copy(hp);
  const anvil = 0.034 + 0.0206 + X.specTop(t) + 0.0006 + 0.008 + O2.DIM.capH + 0.001; X.fr.gaugeTipY(t > B(66.4) ? anvil : anvil + 0.02);
  const raw = 0.37 + sAt(t); const zr = 0.37 * Math.PI * 2 * smooth(seg(t, B(71.2), B(72.2))); O2.drawDial(X.fr.dial, raw, zr);
  // víz: a cellában (elárasztás 74,6–75,9; leeresztés 109,8–110,6), a pohárban
  const fill = smooth(seg(t, B(74.7), B(75.9))) * (1 - smooth(seg(t, B(109.8), B(110.7)))); X.base.setWater(fill); X.beaker.setLevel(0.8 - 0.55 * smooth(seg(t, B(74.7), B(75.9))));
  X.base.valve.rotation.y = -Math.PI / 2 * smooth(seg(t, B(109.65), B(110.15)));
  X.saw.hL.rotation.x = X.saw.hR.rotation.x = -0.5 * sawK(t);
  // mérleg: gyűrű (üres), gyűrű + minta; a végén száraz minta
  let m = 0; if (t > B(21.5) && t < B(22.8)) m = M_RING; if (t > B(44.4) && t < B(53.8)) m = M_RING + M_SOIL; if (t > B(111.2)) m = M_RING + M_DRY; drawScale(L.scl.disp, m, 2);
  // időmérő
  const mins = minAt(t); let txt = '00:00:00'; if (t > B(86.9) && t < B(94.2)) { const s = Math.floor(mins * 60); txt = String(Math.floor(s / 3600)).padStart(2, '0') + ':' + String(Math.floor(s / 60) % 60).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); } else if (t >= B(94.2)) txt = '24:00:00';
  if (X._tt !== txt) { O2.drawTimer(X.timer.scr, txt); X._tt = txt; }
  // laboráns
  C.apply(t, L.tech, shot && shot.look !== undefined ? { look: shot.look } : {});
  if (t > B(113.5)) drawPC(L.pc.scr, t, 'Ödométer – kiértékelés', null);
  return { th, s: sAt(t), e: eAt(t), discs: discsOn(t) };
}
