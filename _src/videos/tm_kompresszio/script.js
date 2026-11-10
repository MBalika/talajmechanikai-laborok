// Kompressziós vizsgálat – feliratok, σ–ε és log σ′–e görbék, E_{oed}, C_c, C_s, σ′_p
import { clamp, smooth, seg, win, fmt, C, runCaptions, xyChart, L3, chip, badge, clockCard, table, formula, logChart, axisLab, openTitle, endCard, finish } from '../tm_lab/ui.js';
import { LX, BT } from '../tm_lab/room.js';
import * as TL from './timeline.js';
import { tb, TOTAL, CHAPTERS, COL } from './timeline.js';
import { POS } from './app.js';
const B = tb, W3 = (x, y, z) => [LX + x, y, z], lg = Math.log10, f2 = (v) => v.toFixed(2).replace('.', ',');
const CAPS = [
  [B(8.3), B(11), 'Kiszúrás', ['Éles *kompressziós gyűrű*:', 'Ø 75 mm, magasság 20 mm']],
  [B(11.1), B(13), 'Mérés', ['Gyűrű + minta tömege']],
  [B(13.1), B(17), 'Beépítés', ['Alul-felül *szűrőkő*, felül a', '*terhelőlap*; oldalt merev gyűrű']],
  [B(17.1), B(20), 'A keretben', ['Kis előterhelés (*< 3 kPa*), a mérőóra', 'nullázása, majd víz a cellába']],
  [B(20.1), B(26), 'Lépcsők', ['A feszültséget lépcsőnként', '*duplázzuk*: 25, 50, 100 … kPa']],
  [B(26.1), B(32), 'Kivárás', ['Minden lépcsőben megvárjuk,', 'amíg az összenyomódás *lezajlik*']],
  [B(32.1), B(35), 'Tehermentesítés', ['Visszaterhelve *kisebb* az', 'alakváltozás: rugalmas szakasz']],
  [B(35.1), B(40), 'σ–ε görbe', ['Meredekség: *E_{oed}*']],
  [B(40.1), B(46), 'log σ′ – e', ['Két egyenes: *C_s* és *C_c*,', 'a töréspont az előterhelés']],
  [B(46.1), B(52), 'Eredmény', ['Süllyedésszámítás bemenő', 'adatai']],
];
const pts = TL.PATH.slice(0, 6).map(p => [p.s, TL.epsOf(p.e)]), unl = TL.PATH.slice(5).map(p => [p.s, TL.epsOf(p.e)]);
export function drawOverlay(O, t, ctx) {
  const { proj } = ctx;
  openTitle(O, t, B, TOTAL, { q1: 'Mennyit nyomódik össze?', q2: 'Lépcsőnként terheljük', title: 'Kompressziós\nvizsgálat', sub: 'Ödométer, lépcsős terhelés' });
  for (const [b0, b1, n] of [[8, 20, '1  Beépítés'], [20, 35, '2  Terhelés'], [35, 46, '3  Kiértékelés'], [46, 52, '4  Eredmény']]) chip(O, n, win(t, B(b0), B(b1), 0.25, 0.25));
  badge(O, 'EN ISO 17892-5', win(t, B(8.2), B(52), 0.4, 0.4));
  if (t > B(13) && t < B(17)) { L3(O, proj, W3(POS.oed + 0.04, BT + 0.065, -1.12), 'KOMPRESSZIÓS GYŰRŰ', win(t, B(14.6), B(17), 0.3, 0.3), { dx: -120, dy: 120 }); }
  if (t > B(17) && t < B(20)) L3(O, proj, W3(POS.oed + 0.12, BT + 0.2, -1.1), 'MÉRŐÓRA', win(t, B(17.5), B(20), 0.3, 0.3), { dx: 150, dy: -80 });
  if (t > B(20) && t < B(26)) L3(O, proj, W3(POS.oed + 0.86, BT + 0.4, -1.12), 'TÁRCSÁK (1:10 KAR)', win(t, B(20.5), B(26), 0.3, 0.3), { dx: 150, dy: -100 });
  const st = TL.stepAt(t);
  if (t > B(20) && t < B(35.2)) { const sig = st.i < 0 ? 0 : st.i <= 5 ? TL.STEPS[st.i] : st.i === 6 ? 100 : 800; O.hud([{ k: 'σ′', v: String(sig), u: 'kPa', color: COL.load }, { k: 'Δh', v: fmt(TL.sNow(t), 2), u: 'mm', color: COL.load }, { k: 'ε', v: fmt(TL.sNow(t) / TL.H * 100, 1), u: '%', hi: true, color: COL.load }], win(t, B(20.3), B(35), 0.3, 0.3));
    if (t > B(26)) clockCard(O, win(t, B(26.2), B(32), 0.3, 0.3), 'LÉPCSŐNKÉNT', '24 óra'); }
  // σ–ε (20–40)
  if (t > B(20) && t < B(40.2)) { const a = t < B(26) || (t > B(32) && t < B(35)) ? win(t, B(20.6), B(40), 0.35, 0.3) * (t < B(35) ? 1 : 1) : win(t, B(20.6), B(40), 0.35, 0.3); const n = st.i < 0 ? 0 : Math.min(6, st.i + (st.k > 0.95 ? 1 : 0)) / 6;
    const big = t > B(35); const x = big ? 1040 : 1240, y = big ? 170 : 300, w = big ? 820 : 620, h = big ? 560 : 400;
    const r = xyChart(O, x, y, w, h, t > B(26) && t < B(32) ? win(t, B(20.6), B(40), 0.35, 0.3) : a, { xmax: 900, ymax: 18, xticks: [0, 200, 400, 600, 800], yticks: [0, 5, 10, 15], flipY: true, title: big ? 'Kompressziós görbe (σ–ε)' : null },
      [{ pts, upto: t > B(32) ? 1 : n, color: COL.load, width: 4, dots: 5 }, { pts: unl, upto: t < B(32) ? 0 : clamp(seg(t, B(32), B(35))), color: COL.un, width: 4, dots: 5 }],
      big ? [{ x: 150, y: (TL.epsOf(TL.eOf(100)) + TL.epsOf(TL.eOf(200))) / 2, color: C.white, a: win(t, B(36), B(40), 0.3, 0.3), text: 'E_{oed} ≈ 4,0 MPa', dx: 20, dy: 30, size: 28 }] : []);
    axisLab(O, x, y, w, h, a, 'σ′ [kPa]', 'ε [%]'); }
  if (t > B(36) && t < B(40.2)) formula(O, 120, 170, ['E_{oed} = Δσ / Δε ≈ 4,0 MPa', '(100–200 kPa)'], win(t, B(36.2), B(40), 0.3, 0.3), { size: 38, title: 'Összenyomódási modulus', color: COL.load });
  // log σ′ – e (40–52)
  if (t > B(40) && t < B(52.2)) { const a = win(t, B(40.2), B(52), 0.35, 0.3); const P = TL.PATH.slice(0, 6).map(p => [lg(p.s), p.e]), U = TL.PATH.slice(5).map(p => [lg(p.s), p.e]); const ep = TL.eOf(TL.SP);
    const cs = [[lg(10), TL.E0 - TL.CS * lg(2)], [lg(400), TL.E0 - TL.CS * lg(80)]], cc = [[lg(100), ep + TL.CC * lg(TL.SP / 100)], [lg(900), ep - TL.CC * lg(900 / TL.SP)]];
    logChart(O, 1040, 170, 820, 560, a, { xmin: 1, xmax: 3, ymin: 0.5, ymax: 0.9, xticks: [1, lg(20), lg(50), 2, lg(200), lg(500), 3], yticks: [0.5, 0.6, 0.7, 0.8, 0.9], title: 'log σ′ – e', yfmt: (v) => v.toFixed(1).replace('.', ',') },
      [{ pts: P, upto: 1, color: COL.load, width: 4, dots: 5 }, { pts: U, upto: 1, color: COL.un, width: 4, dots: 5 }, { pts: cs, upto: clamp(seg(t, B(41), B(42))), color: C.white, width: 2, dash: [8, 6], glow: false, head: false }, { pts: cc, upto: clamp(seg(t, B(42), B(43))), color: COL.cc, width: 2, dash: [8, 6], glow: false, head: false }],
      [{ x: lg(TL.SP), y: ep, color: COL.acc, a: win(t, B(43.2), B(52), 0.3, 0.3), vline: true, text: 'σ′_p ≈ 150 kPa', dx: 14, dy: -30, size: 28 }]);
    axisLab(O, 1040, 170, 820, 560, a, 'σ′ [kPa]', 'e'); }
  if (t > B(40) && t < B(46.2)) formula(O, 120, 170, ['C_c = −Δe / log(σ_1 / σ_0)', 'C_c = 0,30   C_s = 0,05'], win(t, B(41.2), B(46), 0.3, 0.3), { size: 38, title: 'Indexek', color: COL.cc });
  if (t > B(46) && t < B(52.2)) O.list(120, 200, 800, ['E_{oed} ≈ 4,0 MPa (100–200 kPa)', 'C_c = 0,30 · C_s = 0,05', 'σ′_p ≈ 150 kPa: előterhelt', 'Δε = Δe / (1 + e_0)'], [B(46.2), B(46.6), B(47), B(47.4)], t, win(t, B(46.1), B(52), 0.2, 0.3), { title: 'Eredmény', color: C.accent, mark: '›', size: 32 });
  endCard(O, t, B, TOTAL, 52, 'KOMPRESSZIÓ', 'ödométer · lépcsős terhelés', 'Következik: konszolidációs vizsgálat');
  runCaptions(O, t, CAPS);
  finish(O, t, TOTAL, CHAPTERS);
}
