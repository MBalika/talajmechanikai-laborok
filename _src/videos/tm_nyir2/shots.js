import { tb } from './timeline.js';
import { LX, BT } from '../tm_lab/room.js';
import { POS } from './app.js';
const P = (x, y, z) => [LX + x, y, z];
const SPOT = { spotAt: [LX + POS.RIG[0] + 0.12, BT + 0.55, POS.RIG[1] + 0.45], spot: 0.8 };
const RX = POS.RIG[0], RZ = POS.RIG[1], SX = POS.SLAB[0], TX = POS.TRIM[0], TZ = POS.TRIM[1], SC = POS.SCL, CX = POS.CTRL[0], PY = BT + 0.006;
// a doboz hátulról-balról, felülről (a C-keret oszlopa mellett): a kezek elölről érkeznek
const RIGL = (b0, b1, f = 34) => ({ b0, b1, ...SPOT, keys: [[b0, P(RX - 0.32, BT + 0.52, RZ - 0.26), P(RX + 0.01, BT + 0.1, RZ + 0.01), f], [b1, P(RX - 0.3, BT + 0.5, RZ - 0.27), P(RX + 0.01, BT + 0.1, RZ + 0.01), f - 2]] });
// hátulról-jobbról, felülről (a kád jobb oldala, a főzőpohár, az emelőcsavarok)
const RIGR = (b0, b1, f = 36) => ({ b0, b1, ...SPOT, keys: [[b0, P(RX + 0.42, BT + 0.52, RZ - 0.3), P(RX + 0.08, BT + 0.1, RZ), f], [b1, P(RX + 0.4, BT + 0.5, RZ - 0.31), P(RX + 0.08, BT + 0.1, RZ), f - 2]] });
const CTL = (b0, b1, tech = true) => ({ b0, b1, tech, keys: [[b0, P(CX + 0.1, BT + 0.3, -0.72), P(CX + 0.03, BT + 0.07, -0.97), 30], [b1, P(CX + 0.09, BT + 0.29, -0.73), P(CX + 0.03, BT + 0.07, -0.97), 28]] });
const WIDE = (b0, b1) => ({ b0, b1, ...SPOT, keys: [[b0, P(RX - 0.3, BT + 0.6, RZ + 0.95), P(RX + 0.12, BT + 0.16, RZ), 42], [b1, P(RX - 0.26, BT + 0.58, RZ + 0.92), P(RX + 0.12, BT + 0.16, RZ), 40]] });
const CUTAWAY = (b0, b1, f0 = 26, f1 = 22) => ({ b0, b1, tech: false, ...SPOT, keys: [[b0, P(RX + 0.05, BT + 0.1, RZ + 0.24), P(RX - 0.004, BT + 0.07, RZ), f0], [b1, P(RX + 0.03, BT + 0.09, RZ + 0.22), P(RX - 0.004, BT + 0.068, RZ), f1]] });
const BOARD = (b0, b1) => ({ b0, b1, tech: false, keys: [[b0, P(1.15, 1.75, 0.9), P(1.15, 1.6, -1.9), 50], [b1, P(1.15, 1.72, 0.85), P(1.15, 1.6, -1.9), 50]] });
export const SHOTS = [
  // hideg nyitás: metszet a dobozon, nyírás közben (gyorsítva); a nyírási sík kirajzolódik
  { ...CUTAWAY(0, 4, 28, 24), cut: true },
  { b0: 4, b1: 8, keys: [[4, P(0.6, 1.95, 1.7), P(0.7, 1.0, -1.1), 52], [8, P(0.85, 1.85, 1.45), P(0.85, 1.0, -1.1), 52]] },
  // a készülék (a laboráns nélkül)
  { b0: 8, b1: 14, tech: false, keys: [[8, P(RX + 0.45, BT + 0.52, RZ + 0.8), P(RX + 0.02, BT + 0.22, RZ), 42], [14, P(RX + 0.38, BT + 0.5, RZ + 0.76), P(RX + 0.0, BT + 0.22, RZ), 40]] },
  // kiszúrás (a fal felől, a kezekre)
  { b0: 14, b1: 16.1, keys: [[14, P(SX + 0.08, 1.3, -1.5), P(SX + 0.06, PY + 0.03, -1.0), 36], [16.1, P(SX + 0.06, 1.28, -1.5), P(SX + 0.03, PY + 0.03, -1.0), 34]] },
  { b0: 16.1, b1: 20.4, keys: [[16.1, P(SX + 0.1, 1.24, -1.46), P(SX + 0.03, PY + 0.05, -0.99), 34], [20.4, P(SX + 0.12, 1.2, -1.46), P(SX + 0.06, PY + 0.04, -0.98), 32]] },
  { b0: 20.4, b1: 22.3, keys: [[20.4, P(TX + 0.04, 1.2, -1.44), P(TX, PY + 0.03, TZ), 30], [22.3, P(TX + 0.03, 1.18, -1.44), P(TX, PY + 0.03, TZ), 28]] },
  { b0: 22.3, b1: 25.8, keys: [[22.3, P(TX - 0.06, 1.24, -1.46), P(TX - 0.05, PY + 0.03, TZ - 0.02), 40], [25.8, P(TX - 0.02, 1.2, -1.46), P(TX, PY + 0.025, TZ), 32]] },
  // mérés: a kijelző elölről, a laboráns jobb válla mellől
  { b0: 25.8, b1: 28.0, keys: [[25.8, P(SC + 0.34, 1.3, -0.64), P(SC, BT + 0.05, -0.97), 32], [28, P(SC + 0.33, 1.28, -0.66), P(SC, BT + 0.05, -0.97), 30]] },
  { b0: 28.0, b1: 32.0, tech: false, keys: [[28, P(SC + 0.03, BT + 0.24, -0.62), P(SC, BT + 0.045, -0.95), 32], [32, P(SC + 0.02, BT + 0.22, -0.64), P(SC, BT + 0.045, -0.95), 30]] },
  // a keret a dobozra, kitolás, a keret le, terhelőfej
  { b0: 32.0, b1: 34.8, keys: [[32, P(0.62, 1.42, -1.5), P(0.62, 1.0, -0.9), 52], [34.8, P(0.8, 1.4, -1.5), P(0.85, 1.0, -0.95), 48]] },
  RIGL(34.8, 39.0), RIGL(39.0, 42.8, 36),
  // az erőmérő karja: balról
  { b0: 42.8, b1: 45.2, ...SPOT, keys: [[42.8, P(RX - 0.45, BT + 0.4, RZ - 0.35), P(RX - 0.29, BT + 0.15, RZ), 36], [45.2, P(RX - 0.44, BT + 0.38, RZ - 0.34), P(RX - 0.29, BT + 0.14, RZ), 34]] },
  { b0: 45.2, b1: 48.2, tech: false, ...SPOT, keys: [[45.2, P(RX - 0.16, BT + 0.2, RZ + 0.26), P(RX - 0.06, BT + 0.085, RZ), 30], [48.2, P(RX - 0.15, BT + 0.19, RZ + 0.25), P(RX - 0.06, BT + 0.085, RZ), 28]] },
  // terhelés a vezérlőn, a terhelőrúd leér
  CTL(48.2, 49.1),
  { b0: 49.1, b1: 51.2, tech: false, ...SPOT, keys: [[49.1, P(RX + 0.32, BT + 0.38, RZ + 0.44), P(RX, BT + 0.17, RZ), 38], [51.2, P(RX + 0.3, BT + 0.36, RZ + 0.42), P(RX, BT + 0.14, RZ), 36]] },
  // víz a kádba
  RIGR(51.2, 55.6, 40),
  // konszolidáció
  WIDE(55.6, 58.6), CTL(58.6, 62.0, false),
  // rögzítőcsavarok (elölről-jobbról), emelőcsavarok (hátulról-jobbról), indítás
  { b0: 62.0, b1: 65.8, ...SPOT, keys: [[62, P(RX + 0.3, BT + 0.26, RZ + 0.32), P(RX, BT + 0.09, RZ + 0.04), 32], [65.8, P(RX + 0.28, BT + 0.25, RZ + 0.3), P(RX + 0.01, BT + 0.09, RZ + 0.04), 30]] },
  RIGR(65.8, 69.5, 32), CTL(69.5, 70.6),
  { b0: 70.6, b1: 72, tech: false, ...SPOT, keys: [[70.6, P(RX + 0.32, BT + 0.38, RZ + 0.44), P(RX, BT + 0.12, RZ), 36], [72, P(RX + 0.3, BT + 0.36, RZ + 0.42), P(RX, BT + 0.12, RZ), 34]] },
  // nyírás: a kocsi elmozdul (elölről-jobbról, alacsonyan), a kijelző, a gép
  { b0: 72, b1: 76, tech: false, ...SPOT, keys: [[72, P(RX - 0.26, BT + 0.3, RZ + 0.32), P(RX + 0.1, BT + 0.07, RZ), 32], [76, P(RX - 0.24, BT + 0.29, RZ + 0.3), P(RX + 0.1, BT + 0.07, RZ), 30]] },
  CTL(76, 80, false), WIDE(80, 86),
  // nyírási sík (metszet)
  CUTAWAY(86, 92),
  BOARD(92, 98), BOARD(98, 108),
  { b0: 108, b1: 112, keys: [[108, P(0.8, 1.9, 1.7), P(0.9, 1.0, -1.1), 56], [112, P(1.0, 1.85, 1.5), P(1.0, 1.0, -1.1), 56]] },
  { b0: 112, b1: 116, keys: [[112, P(1.0, 1.9, 1.6), P(1.0, 1.0, -1.1), 56], [116, P(0.8, 2.3, 2.8), P(1.0, 1.0, -1.1), 56]] },
].map(s => ({ ...s, t0: tb(s.b0), t1: tb(s.b1) }));
