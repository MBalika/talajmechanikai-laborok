// Szemeloszlási vizsgálat – feliratok (lépésszámokkal), címkék, táblázatok, képletek, a hidrométer leolvasása, a szemeloszlási görbe
import { clamp, smooth, seg, win, fmt, C, FH, runCaptions, L3, chip, badge, clockCard, table, formula, logChart, axisLab, openTitle, endCard, finish, inset } from '../tm_lab/ui.js';
import { LX, BT } from '../tm_lab/room.js';
import * as TL from './timeline.js';
import { tb, TOTAL, CHAPTERS, COL, HY, cyc } from './timeline.js';
import { POS, rhoAt, hydInSed } from './app.js';
const B = tb, W3 = (x, y, z) => [LX + x, y, z], lg = Math.log10, d1 = (v, n = 1) => v.toFixed(n).replace('.', ',');
const dfmt = (d) => d >= 1 ? d1(d, d < 10 ? 1 : 0) : d >= 0.1 ? d1(d, 3) : d1(d, 4);
const CAPS = [
  [B(8.3), B(10.7), '1.1 A szitasor', ['Ø 200 mm-es sziták, 8 … *0,063 mm*']],
  [B(10.9), B(13.3), '1.2 A hidrometrálás', ['Ülepítőhenger és *hidrométer*']],
  [B(16.3), B(18.8), '2.1 Szárítás', ['A mintát *105 °C*-on', 'tömegállandóságig szárítjuk']],
  [B(19.0), B(21.4), '2.2 Bemérés', ['Kiszárított tömeg:', '*m_d = 500,0 g*']],
  [B(21.6), B(24.4), '2.3 Nedves szitálás', ['A mintát a *2 mm*-es és a', '*0,063 mm*-es szitára öntjük']],
  [B(24.6), B(28.3), '2.4 Mosás', ['A finomrész *kimosódik*;', 'amíg a víz tisztán nem folyik']],
  [B(28.5), B(30.0), '2.5 Újra szárítjuk', ['A fennmaradt részt']],
  [B(30.2), B(32.9), '3.1 A minta a szitára', ['A kiszárított részt a *8 mm*-es', 'szitára öntjük']],
  [B(33.1), B(35.6), '3.2 A szitasor', ['Alul a gyűjtőtál, felfelé', '*nő* a nyílás; felül a fedő']],
  [B(35.8), B(37.75), '3.3 A rázógépbe', ['A szitasort a rázógép', 'tányérjára tesszük']],
  [B(37.85), B(40.3), '3.4 Leszorítás', ['A hidat a fedőre engedjük,', 'a gombokkal *rögzítjük*']],
  [B(40.4), B(42.6), '3.5 Indítás', ['*10 perc*, 1,5 mm amplitúdó']],
  [B(42.8), B(47.6), '3.6 Rázás', ['Minden szemcse addig halad,', 'amíg egy szitán *fennakad*']],
  [B(48.2), B(50.3), '4.1 Kiszerelés', ['Lazítás, a híd fel']],
  [B(50.4), B(52.8), '4.2 Vissza az asztalra', ['A fedőt levesszük']],
  [B(52.9), B(54.9), '4.3 Mérés', ['A felső szita tartalmát a', 'mérlegen álló *tálba* öntjük']],
  [B(55.0), B(56.7), '4.4 Kefével', ['A szövetben maradt szemeket', '*kikeféljük*']],
  [B(56.8), B(61.0), '4.5 Szitánként', ['Halmozott tömeg: a különbség', 'a szitán *fennmaradt* rész']],
  [B(61.2), B(64.8), '4.5 Szitánként', ['Így haladunk lefelé,', 'a gyűjtőtálig']],
  [B(64.9), B(67.0), '4.6 Ellenőrzés', ['Az összeg ≈ *m_d*']],
  [B(67.2), B(69.6), '5.1 Finomrész', ['*40 g* a 0,063 mm alatti részből', '+ diszpergálószer']],
  [B(70.6), B(72.3), '5.2 A keverőbe', ['A szuszpenziót a keverő', 'csészéjébe öntjük']],
  [B(72.4), B(74.3), '5.3 Diszpergálás', ['Keverjük: a szemcsék', '*szétválnak* egymástól']],
  [B(74.4), B(76.8), '5.4 A hengerbe', ['A keverőt felemeljük, a tartalmat', 'az *ülepítőhengerbe* öntjük']],
  [B(77.0), B(78.8), '5.5 Feltöltés', ['Desztillált vízzel *1000 ml*-ig']],
  [B(79.0), B(82.0), '5.6 Felkeverés', ['*1 percig* fel-le keverjük', '(vagy dugóval lezárva forgatjuk)']],
  [B(82.1), B(83.5), '5.7 Indul az óra', ['A keverés végén: *t = 0*']],
  [B(83.6), B(85.0), '5.8 Hidrométer', ['Óvatosan, *forgatás nélkül*', 'engedjük be']],
  [B(85.1), B(89.0), '5.9 Leolvasás', ['0,5 · 1 · 2 · 4 percnél,', 'a *meniszkusz tetején*']],
  [B(89.1), B(90.6), '5.10 Ki a hengerből', ['A tiszta vizes', '*kontrollhengerbe* tesszük']],
  [B(90.7), B(93.2), '5.11 Később', ['Újra: 8 perctől *24 óráig*']],
  [B(93.3), B(96.6), '5.12 Hőmérséklet', ['Minden leolvasáskor mérjük:', 'a *viszkozitás* ettől függ']],
  [B(97.0), B(100.8), '5.13 Ülepedés', ['A nagyobb szemcsék', '*gyorsabban* süllyednek le']],
  [B(101.2), B(104.8), '6.1 Stokes-törvény', ['Az ülepedésből az *átmérő*']],
  [B(105.0), B(108.8), '6.2 Átesett rész', ['A sűrűségből: hány % *kisebb*']],
  [B(109.2), B(112.6), '7.1 A görbe', ['Szitálás + hidrometrálás *egy görbén*']],
  [B(112.8), B(116.2), '7.2 Jellemző átmérők', ['10, 30, 60 %-nál: *d_{10}, d_{30}, d_{60}*']],
];
// mérési táblázat: d, fennmaradt, átesett
const ROWS = [...TL.SIEVES.map((d, i) => [String(d).replace('.', ','), d1(TL.RET[i]), d1(TL.PASS[i])]), ['tál', d1(TL.PAN), '–']];
const HROWS = TL.HYD.map(h => [h.min < 1 ? '30 s' : h.min < 60 ? h.min + ' perc' : h.min / 60 + ' óra', h.R.toFixed(4).replace('.', ','), d1(h.d, 4), d1(h.S)]);
export function drawOverlay(O, t, ctx) {
  const { proj } = ctx;
  openTitle(O, t, B, TOTAL, { q1: 'Milyen szemcsékből áll a talaj?', q2: 'Lépésről lépésre', title: 'Szemeloszlási\nvizsgálat', sub: 'Szitálás és hidrometrálás' });
  for (const [b0, b1, n] of [[8, 16, '1  Az eszközök'], [16, 30, '2  A minta előkészítése'], [30, 48, '3  Száraz szitálás'], [48, 67, '4  Mérés szitánként'], [67, 101, '5  Hidrometrálás'], [101, 109, '6  Számítás'], [109, 120, '7  Szemeloszlási görbe']]) chip(O, n, win(t, B(b0), B(b1), 0.25, 0.25));
  const big = (t > B(13.4) && t < B(16)) || (t > B(56.7) && t < B(67)) || (t > B(101) && t < B(120.2));
  badge(O, 'EN ISO 17892-4', win(t, B(8.2), B(120), 0.4, 0.4) * (big ? 0 : 1));
  const SX = POS.SHK[0], SZ0 = POS.SHK[1];
  // 1.1 a rázógép részei
  if (t > B(8) && t < B(10.8)) for (const [s, p, d, b] of [['SZITASOR', [SX - 0.1, BT + 0.25, SZ0 + 0.06], [-200, -40], 8.6], ['RÁZÓGÉP', [SX + 0.15, BT + 0.06, SZ0 + 0.17], [140, 60], 9.2], ['LESZORÍTÓ HÍD', [SX + 0.18, BT + 0.38, SZ0], [150, -60], 9.8]])
    L3(O, proj, W3(...p), s, win(t, B(b), B(10.75), 0.25, 0.25), { dx: d[0], dy: d[1] });
  // 1.2 a hidrometrálás eszközei
  if (t > B(10.8) && t < B(13.4)) for (const [s, p, d, b] of [['1000 ml', [POS.SED[0], 0.95, POS.SED[1] + 0.03], [-200, -60], 11.4], ['HIDROMÉTER', [POS.CTL[0] - 0.012, 1.06, POS.CTL[1]], [120, -120], 12.0]])
    L3(O, proj, W3(...p), s, win(t, B(b), B(13.35), 0.25, 0.25), { dx: d[0], dy: d[1] });
  // 1.3 mit, mivel
  if (t > B(13.4) && t < B(16)) table(O, 600, 230, 720, ['Mit?', 'Mivel?'], [['tömeg', 'mérleg'], ['d > 0,063 mm', 'szitasor'], ['d < 0,063 mm', 'hidrométer']], win(t, B(13.6), B(15.9), 0.3, 0.3), { cols: [330, 360], size: 32, rowH: 56, title: '1.3 Mit, mivel mérünk?', color: COL.sieve });
  // 2 előkészítés
  if (t > B(20.2) && t < B(21.6)) L3(O, proj, W3(POS.SCL, BT + 0.08, -1.0), 'm_d = 500,0 g', win(t, B(20.3), B(21.55), 0.2, 0.2), { dx: 160, dy: -120 });
  if (t > B(25.2) && t < B(28.6)) { const k = TL.washK(t); L3(O, proj, W3(POS.TRG[0] + 0.15, BT + 0.03, POS.TRG[1] + 0.05), k < 0.55 ? 'ZAVAROS' : 'TISZTA', win(t, B(25.4), B(28.4), 0.2, 0.2), { dx: 170, dy: 60 }); }
  if (t > B(28.5) && t < B(30.05)) clockCard(O, win(t, B(28.6), B(30), 0.2, 0.15), '105 °C', '24 óra', { y: 104 });
  // 3 szitasor-ábra (a nyílásméretek)
  if (t > B(33.0) && t < B(35.7)) inset(O, 1640, 380, 200, win(t, B(33.2), B(35.6), 0.3, 0.3), (g, x, y, s) => { const L = ['8', '4', '2', '1', '0,5', '0,25', '0,125', '0,063', 'tál']; g.font = '700 26px Arial'; g.textBaseline = 'middle';
    L.forEach((v, i) => { const yy = y + 34 + i * 37; g.fillStyle = i === 8 ? '#8a7a5a' : '#cfd4d8'; g.fillRect(x + 90, yy - 15, 220, 30); g.fillStyle = '#1b2026'; g.textAlign = 'center'; g.fillText(v + (i < 8 ? ' mm' : ''), x + 200, yy); }); }, { title: 'Szitasor', color: COL.sieve });
  if (t > B(42.6) && t < B(47.9)) { const s = TL.shakeSec(t); clockCard(O, win(t, B(42.7), B(47.8), 0.2, 0.2), 'RÁZÁS', String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(Math.floor(s % 60)).padStart(2, '0'), { y: 104 }); }
  // 4 mérés: táblázat (a ciklusok szerint töltődik)
  if (t > B(56.7) && t < B(67)) { let n = 0; for (let i = 0; i < 9; i++) n += clamp((t - B(cyc(i).tilt + 0.1)) / 0.4);
    table(O, 1170, 150, 700, ['d [mm]', 'fennm. [g]', 'átesett [%]'], ROWS, win(t, B(56.8), B(66.9), 0.3, 0.3), { n, cols: [190, 230, 250], size: 27, rowH: 42, title: 'Szitálás · m_d = 500 g', color: COL.sieve, hi: Math.floor(n) - 1 });
    if (t > B(64.8)) formula(O, 110, 560, ['veszteség ' + d1((TL.MW - TL.CUM[7] - TL.PAN) / TL.M0 * 100, 2) + ' % < 1 %'], win(t, B(65.0), B(66.95), 0.25, 0.25), { size: 32, color: COL.sieve }); }
  // 5 hidrometrálás
  if (t > B(69.6) && t < B(70.55)) clockCard(O, win(t, B(69.65), B(70.5), 0.15, 0.15), 'ÁZTATÁS', '12 óra', { y: 104 });
  if (t > B(83.0) && t < B(97.2)) clockCard(O, win(t, B(83.1), B(97.1), 0.2, 0.2), 'ELTELT IDŐ', TL.fmtMin(TL.hydMin(t)), { y: 104 });
  if (t > B(85.0) && t < B(89.2)) { const R = rhoAt(TL.hydMin(t)); inset(O, 1650, 480, 210, win(t, B(85.1), B(89.1), 0.3, 0.3), (g, x, y, s) => {   // a szár skálája a meniszkusszal
      const cx = x + 200, cy = y + 200, sc = 2600; g.fillStyle = '#7a5e42'; g.fillRect(x, cy, 400, 210); g.fillStyle = '#f6f3e6'; g.fillRect(cx - 34, y - 10, 68, 420);
      g.strokeStyle = '#1d2228'; g.fillStyle = '#1d2228'; g.lineWidth = 3; g.font = '700 26px Arial'; g.textAlign = 'left'; g.textBaseline = 'middle';
      for (let k = -20; k <= 20; k++) { const r = Math.round(R * 2000) / 2000 + k * 0.0005; const yy = cy + (r - R) * sc * 40; if (yy < y || yy > y + 400) continue; const mj = Math.abs(Math.round(r * 1000) - r * 1000) < 1e-6; g.beginPath(); g.moveTo(cx - 34, yy); g.lineTo(cx - 34 + (mj ? 34 : 18), yy); g.stroke(); if (mj && Math.round(r * 1000) % 2 === 0) g.fillText(r.toFixed(3).replace('.', ','), cx + 4, yy); }
      g.strokeStyle = '#e8d9b8'; g.lineWidth = 4; g.beginPath(); g.moveTo(x, cy); g.quadraticCurveTo(cx - 40, cy, cx - 34, cy - 12); g.moveTo(cx + 34, cy - 12); g.quadraticCurveTo(cx + 40, cy, x + 400, cy); g.stroke();
      g.strokeStyle = '#B48CFF'; g.lineWidth = 3; g.setLineDash([8, 6]); g.beginPath(); g.moveTo(x + 10, cy - 12); g.lineTo(x + 390, cy - 12); g.stroke(); g.setLineDash([]); }, { title: 'R = ' + R.toFixed(4).replace('.', ','), color: COL.hyd });
    L3(O, proj, W3(POS.SED[0], 0.965, POS.SED[1] + 0.03), 'MENISZKUSZ TETEJE', win(t, B(85.3), B(88.9), 0.25, 0.25), { dx: -260, dy: -40 }); }
  if (t > B(89.0) && t < B(101)) { const n = clamp(TL.HYD.filter(h => TL.hydMin(t) >= h.min).length, 0, 12);
    table(O, 1350, 150, 520, ['t', 'R [g/ml]'], HROWS.map(r => [r[0], r[1]]), win(t, B(89.2), B(100.9), 0.3, 0.3), { n, cols: [220, 260], size: 25, rowH: 38, title: 'Leolvasások', color: COL.hyd }); }
  if (t > B(93.2) && t < B(96.7)) L3(O, proj, W3(POS.CTL[0] + 0.02, 0.92, POS.CTL[1] + 0.03), 'T = ' + d1(TL.TEMP) + ' °C', win(t, B(93.4), B(96.6), 0.25, 0.25), { dx: -170, dy: -90 });
  // 6 számítás
  if (t > B(101) && t < B(109)) { formula(O, 110, 170, ['d = √(18 η · H_r / ((ρ_s − ρ_w) g t))'], win(t, B(101.3), B(108.9), 0.3, 0.3), { size: 40, title: 'Stokes-törvény', color: COL.hyd });
    formula(O, 110, 380, ['η: viszkozitás · H_r: mélység'], win(t, B(102.4), B(108.9), 0.3, 0.3), { size: 28, color: COL.hyd });
    if (t > B(104.9)) formula(O, 110, 620, ['S = ρ_s / (ρ_s − 1) · (R_c − 1) · V / m_h · F'], win(t, B(105.0), B(108.9), 0.3, 0.3), { size: 34, title: 'Átesett rész', color: COL.sieve }); }
  // 7 görbe
  if (t > B(109) && t < B(120.2)) { const a = win(t, B(109.2), B(120.1), 0.3, 0.3); const draw = clamp(seg(t, B(109.4), B(111.6)));
    const P = TL.CURVE.map(([d, s]) => [lg(d), s]); const sv = TL.SIEVES.map((d, i) => [lg(d), TL.PASS[i]]), hy = TL.HYD.map(h => [lg(h.d), h.S]); const R = TL.RES;
    const vl = (d, k, col, txt, dy) => ({ x: lg(d), y: 0, color: col, a: a * k, vline: true, text: txt, dx: 8, dy, size: 24 });
    const k2 = clamp(seg(t, B(112.9), B(114.5))), k3 = clamp(seg(t, B(116.4), B(117.4)));
    logChart(O, 980, 160, 900, 600, a, { xmin: -3, xmax: lg(20), ymin: 0, ymax: 100, xticks: [-3, lg(0.002), -2, lg(0.063), -1, 0, lg(2), 1], yticks: [0, 20, 40, 60, 80, 100], title: 'Szemeloszlási görbe' },
      [{ pts: P, upto: draw, color: COL.acc, width: 3.5, glow: false, head: false }, { pts: sv, upto: draw, color: COL.sieve, width: 0.001, dots: 7, glow: false, head: false }, { pts: hy, upto: draw, color: COL.hyd, width: 0.001, dots: 7, glow: false, head: false }],
      [vl(R.d10, k2, C.white, 'd_{10} = ' + dfmt(R.d10), -380), vl(R.d30, k2, C.white, 'd_{30} = ' + dfmt(R.d30), -300), vl(R.d60, k2, C.white, 'd_{60} = ' + dfmt(R.d60), -220)]);
    axisLab(O, 980, 160, 900, 600, a, 'd [mm]', 'S [%]', { ylBottom: true });
    if (t > B(109.6)) O.list(110, 170, 560, ['szitálás', 'hidrometrálás'], [B(109.8), B(110.4)], t, win(t, B(109.7), B(112.7), 0.2, 0.3), { size: 30, mark: '●', color: C.white });
    if (t > B(116.3)) formula(O, 110, 170, ['C_U = d_{60} / d_{10} = ' + d1(R.Cu, 0), 'C_C = d_{30}^2 / (d_{10} · d_{60}) = ' + d1(R.Cc, 1)], win(t, B(116.4), B(120.1), 0.3, 0.3), { size: 36, title: 'Egyenlőtlenség', color: COL.acc });
    if (t > B(117.2)) table(O, 110, 420, 680, ['frakció', '%'], [['agyag (< 0,002)', d1(R.clay)], ['iszap', d1(R.silt)], ['homok', d1(R.sand)], ['kavics (> 2 mm)', d1(R.grav)]], win(t, B(117.3), B(120.1), 0.3, 0.3), { cols: [440, 200], size: 28, rowH: 44, title: 'Iszapos homok (siSa)', color: COL.sieve }); }
  if (t > B(120) && t < B(124.2)) O.list(100, 170, 760, ['Száraz és nedves szitálás', 'Hidrometrálás: Stokes-törvény', 'Görbe: d_{10}, d_{30}, d_{60}', 'C_U, C_C → besorolás'], [B(120.3), B(120.8), B(121.3), B(121.8)], t, win(t, B(120.2), B(124), 0.2, 0.3), { title: 'Összegzés', color: C.accent, mark: '›', size: 30 });
  endCard(O, t, B, TOTAL, 124, 'SZEMELOSZLÁS', null, 'Következik: folyási határ');
  runCaptions(O, t, CAPS);
  finish(O, t, TOTAL, CHAPTERS);
}
