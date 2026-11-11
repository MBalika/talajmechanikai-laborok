// Triaxiális vizsgálat – kameraállások. Terep: x ≈ 0 (metszet: z = 0 sík), labor: x = 300 + helyi.
import { tb } from './timeline.js';
import { LX, FRX, FRZ, EXT, LAT, SCL, PC } from './layout.js';
const P = (x, y, z) => [LX + x, y, z];
const CY = 1.41;                        // a minta közepe a vizsgálat alatt (felfekvés után)
export const SHOTS = [
  // hideg nyitás: a minta törése a cellában
  { b0: 0, b1: 4, lab: 1, tech: false, keys: [[0, P(FRX + 0.17, CY + 0.06, FRZ + 0.36), P(FRX, CY, FRZ), 32], [4, P(FRX + 0.1, CY + 0.03, FRZ + 0.26), P(FRX, CY, FRZ), 32]] },
  // címkártya: a labor
  { b0: 4, b1: 8, lab: 1, keys: [[4, P(-0.6, 1.85, 2.9), P(0.4, 1.1, -1.1), 42], [8, P(0.2, 1.75, 2.6), P(0.6, 1.1, -1.1), 42]] },
  // 1. próbatest: kupak le, kinyomás, faragás, mérés
  { b0: 8, b1: 10.5, lab: 1, keys: [[8, P(EXT.x + 0.95, 1.22, -0.72), P(EXT.x + 0.45, 1.02, -1.02), 40], [10.5, P(EXT.x + 0.9, 1.2, -0.76), P(EXT.x + 0.48, 1.02, -1.02), 40]] },
  { b0: 10.5, b1: 13.5, lab: 1, keys: [[10.5, P(EXT.x + 0.3, 1.62, -1.58), P(EXT.x + 0.32, 0.98, -0.86), 50], [13.5, P(EXT.x + 0.42, 1.6, -1.58), P(EXT.x + 0.44, 0.98, -0.86), 50]] },
  { b0: 13.5, b1: 17.5, lab: 1, keys: [[13.5, P(LAT.x + 0.42, 1.42, -1.48), P(LAT.x - 0.02, 1.1, -0.82), 40], [17.5, P(LAT.x + 0.36, 1.38, -1.5), P(LAT.x - 0.02, 1.08, -0.84), 40]] },
  { b0: 17.5, b1: 20, lab: 1, tech: false, keys: [[17.5, P(SCL.x + 0.32, 1.18, -0.62), P(SCL.x + 0.06, 0.99, SCL.z), 32], [20, P(SCL.x + 0.26, 1.14, -0.66), P(SCL.x + 0.06, 0.99, SCL.z), 32]] },
  // 2. beépítés lépésenként
  { b0: 20, b1: 21.25, lab: 1, keys: [[20, P(FRX + 0.42, 1.42, FRZ - 0.42), P(FRX + 0.14, 1.12, FRZ + 0.05), 40], [21.25, P(FRX + 0.4, 1.4, FRZ - 0.4), P(FRX + 0.12, 1.13, FRZ + 0.05), 40]] },
  { b0: 21.25, b1: 22.75, lab: 1, keys: [[21.25, P(FRX + 0.34, 1.36, FRZ - 0.36), P(FRX + 0.1, 1.17, FRZ + 0.04), 38], [22.75, P(FRX + 0.32, 1.35, FRZ - 0.34), P(FRX + 0.08, 1.18, FRZ + 0.04), 38]] },
  { b0: 22.75, b1: 24, lab: 1, keys: [[22.75, P(FRX + 0.3, 1.42, FRZ - 0.32), P(FRX + 0.07, 1.24, FRZ + 0.04), 36], [24, P(FRX + 0.28, 1.41, FRZ - 0.3), P(FRX + 0.06, 1.25, FRZ + 0.04), 36]] },
  { b0: 24, b1: 28.25, lab: 1, keys: [[24, P(FRX + 0.62, 1.45, -0.72), P(FRX, 1.24, FRZ), 38], [28.25, P(FRX + 0.56, 1.42, -0.76), P(FRX, 1.24, FRZ), 38]] },
  { b0: 28.25, b1: 30, lab: 1, keys: [[28.25, P(FRX - 0.4, 1.38, FRZ + 0.08), P(FRX - 0.02, 1.31, FRZ - 0.01), 34], [30, P(FRX - 0.37, 1.37, FRZ + 0.06), P(FRX - 0.02, 1.31, FRZ - 0.01), 34]] },
  { b0: 30, b1: 32.9, lab: 1, keys: [[30, P(FRX + 0.5, 1.55, FRZ - 0.42), P(FRX, 1.32, FRZ + 0.05), 42], [32.9, P(FRX + 0.46, 1.53, FRZ - 0.4), P(FRX, 1.34, FRZ + 0.05), 42]] },
  { b0: 32.9, b1: 35, lab: 1, tech: false, keys: [[32.9, P(FRX + 0.3, 1.32, FRZ + 0.55), P(FRX, 1.28, FRZ), 34], [35, P(FRX + 0.26, 1.33, FRZ + 0.5), P(FRX, 1.3, FRZ), 34]] },
  { b0: 35, b1: 36, lab: 1, keys: [[35, P(FRX + 0.34, 1.62, FRZ + 0.34), P(FRX + 0.05, 1.41, FRZ + 0.01), 36], [36, P(FRX + 0.31, 1.61, FRZ + 0.32), P(FRX + 0.05, 1.41, FRZ + 0.01), 36]] },
  { b0: 36, b1: 38, lab: 1, keys: [[36, P(FRX + 0.75, 1.72, FRZ + 1.15), P(FRX, 1.42, FRZ), 40], [38, P(FRX + 0.68, 1.72, FRZ + 1.08), P(FRX, 1.46, FRZ), 40]] },
  { b0: 38, b1: 44, lab: 1, keys: [[38, P(1.3, 1.8, 1.4), P(1.25, 1.15, -1.15), 44], [44, P(1.0, 1.75, 1.25), P(1.15, 1.15, -1.15), 44]] },
  // betűk: a háttérben a labor
  { b0: 44, b1: 48, lab: 1, keys: [[44, P(0.4, 1.65, 1.9), P(0.8, 1.2, -1.2), 44], [48, P(0.7, 1.6, 1.7), P(0.8, 1.2, -1.2), 44]] },
  // UU
  { b0: 48, b1: 51, lab: 1, tech: false, keys: [[48, P(FRX + 0.22, CY + 0.05, FRZ + 0.36), P(FRX, CY, FRZ), 34], [51, P(FRX + 0.18, CY + 0.04, FRZ + 0.32), P(FRX, CY, FRZ), 34]] },
  { b0: 51, b1: 55, lab: 1, keys: [[51, P(FRX + 0.62, CY + 0.12, FRZ + 0.95), P(FRX + 0.36, CY - 0.02, FRZ), 38], [55, P(FRX + 0.56, CY + 0.1, FRZ + 0.88), P(FRX + 0.34, CY - 0.02, FRZ), 38]] },
  { b0: 55, b1: 58, lab: 1, tech: false, cut: 1, keys: [[55, P(FRX + 0.2, CY + 0.03, FRZ + 0.24), P(FRX + 0.07, CY - 0.005, FRZ), 30], [58, P(FRX + 0.17, CY + 0.03, FRZ + 0.21), P(FRX + 0.065, CY - 0.005, FRZ), 30]] },
  { b0: 58, b1: 66, lab: 1, keys: [[58, P(FRX - 0.5, CY + 0.15, FRZ + 0.75), P(FRX - 0.05, CY, FRZ), 36], [66, P(FRX - 0.35, CY + 0.1, FRZ + 0.62), P(FRX - 0.05, CY, FRZ), 36]] },
  // CU
  { b0: 66, b1: 69, lab: 1, tech: false, keys: [[66, P(FRX + 0.13, CY + 0.03, FRZ + 0.25), P(FRX, CY, FRZ), 30], [69, P(FRX + 0.1, CY + 0.02, FRZ + 0.23), P(FRX, CY - 0.01, FRZ), 30]] },
  { b0: 69, b1: 74, lab: 1, keys: [[69, P(FRX + 0.8, CY + 0.2, FRZ + 0.85), P(FRX + 0.5, 1.2, FRZ - 0.05), 40], [74, P(FRX + 0.72, CY + 0.18, FRZ + 0.8), P(FRX + 0.5, 1.2, FRZ - 0.05), 40]] },
  { b0: 74, b1: 79, lab: 1, keys: [[74, P(FRX + 0.5, CY + 0.08, FRZ + 0.72), P(FRX + 0.28, CY - 0.03, FRZ), 36], [79, P(FRX + 0.45, CY + 0.07, FRZ + 0.66), P(FRX + 0.27, CY - 0.03, FRZ), 36]] },
  { b0: 79, b1: 82.5, lab: 1, keys: [[79, P(FRX + 0.62, CY + 0.12, FRZ + 0.95), P(FRX + 0.36, CY - 0.02, FRZ), 38], [82.5, P(FRX + 0.58, CY + 0.1, FRZ + 0.9), P(FRX + 0.35, CY - 0.02, FRZ), 38]] },
  { b0: 82.5, b1: 84, lab: 1, tech: false, cut: 1, keys: [[82.5, P(FRX + 0.2, CY + 0.03, FRZ + 0.24), P(FRX + 0.07, CY - 0.005, FRZ), 30], [84, P(FRX + 0.18, CY + 0.03, FRZ + 0.22), P(FRX + 0.065, CY - 0.005, FRZ), 30]] },
  { b0: 84, b1: 92, lab: 1, keys: [[84, P(FRX - 0.5, CY + 0.15, FRZ + 0.75), P(FRX - 0.05, CY, FRZ), 36], [92, P(FRX - 0.35, CY + 0.1, FRZ + 0.62), P(FRX - 0.05, CY, FRZ), 36]] },
  // CD
  { b0: 92, b1: 95, lab: 1, keys: [[92, P(FRX + 0.62, CY + 0.25, FRZ + 1.0), P(FRX + 0.42, 1.25, FRZ - 0.05), 42], [95, P(FRX + 0.56, CY + 0.22, FRZ + 0.95), P(FRX + 0.42, 1.25, FRZ - 0.05), 42]] },
  { b0: 95, b1: 100, lab: 1, keys: [[95, P(FRX + 0.62, CY + 0.12, FRZ + 0.95), P(FRX + 0.36, CY - 0.02, FRZ), 38], [100, P(FRX + 0.56, CY + 0.1, FRZ + 0.88), P(FRX + 0.34, CY - 0.02, FRZ), 38]] },
  { b0: 100, b1: 104, lab: 1, tech: false, cut: 1, keys: [[100, P(FRX + 0.2, CY + 0.03, FRZ + 0.24), P(FRX + 0.07, CY - 0.005, FRZ), 30], [104, P(FRX + 0.17, CY + 0.03, FRZ + 0.21), P(FRX + 0.065, CY - 0.005, FRZ), 30]] },
  { b0: 104, b1: 112, lab: 1, keys: [[104, P(FRX - 0.5, CY + 0.15, FRZ + 0.75), P(FRX - 0.05, CY, FRZ), 36], [112, P(FRX - 0.35, CY + 0.1, FRZ + 0.62), P(FRX - 0.05, CY, FRZ), 36]] },
  // összevetés, összegzés, zárás
  { b0: 112, b1: 122, lab: 1, keys: [[112, P(0.4, 1.65, 1.9), P(0.8, 1.2, -1.2), 44], [122, P(0.8, 1.6, 1.6), P(0.8, 1.2, -1.2), 44]] },
  { b0: 122, b1: 131, lab: 1, keys: [[122, P(-0.6, 1.85, 2.9), P(0.4, 1.1, -1.1), 42], [131, P(-1.6, 2.4, 4.0), P(0.4, 1.1, -1.1), 42]] },
].map(s => ({ ...s, t0: tb(s.b0), t1: tb(s.b1) }));
