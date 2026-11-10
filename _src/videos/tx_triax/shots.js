// Triaxiális vizsgálat – kameraállások. Terep: x ≈ 0 (metszet: z = 0 sík), labor: x = 300 + helyi.
import { tb, DS } from './timeline.js';
import { LX, FRX, FRZ, EXT, LAT, SCL, PC } from './layout.js';
const P = (x, y, z) => [LX + x, y, z];
const CY = 1.41;                        // a minta közepe a vizsgálat alatt (felfekvés után)
export const SHOTS = [
  // hideg nyitás: a minta törése a cellában
  { b0: 0, b1: 4, lab: 1, tech: false, keys: [[0, P(FRX + 0.17, CY + 0.06, FRZ + 0.36), P(FRX, CY, FRZ), 32], [4, P(FRX + 0.1, CY + 0.03, FRZ + 0.26), P(FRX, CY, FRZ), 32]] },
  // címkártya: a labor
  { b0: 4, b1: 8, lab: 1, keys: [[4, P(-0.6, 1.85, 2.9), P(0.4, 1.1, -1.1), 42], [8, P(0.2, 1.75, 2.6), P(0.6, 1.1, -1.1), 42]] },
  // 1. mintavétel
  { b0: 8, b1: 11, mode: 'surface', keys: [[8, [-6.4, 3.0, 8.2], [1.3, 2.4, 0], 40], [11, [-5.6, 2.7, 7.2], [1.0, 2.0, 0], 40]] },
  { b0: 11, b1: 12.5, mode: 'surface', keys: [[11, [0.62, 1.45, 1.65], [-0.12, 0.95, 0.0], 40], [12.5, [0.58, 1.3, 1.55], [-0.12, 0.8, 0.0], 40]] },
  { b0: 12.5, b1: 15, mode: 'section', grains: 0, sx: 0.2, keys: [[12.5, [0.75, -DS + 0.05, 2.15], [0.05, -DS - 0.3, 0], 38], [15, [0.7, -DS, 2.0], [0.05, -DS - 0.35, 0], 38]] },
  { b0: 15, b1: 16.75, mode: 'surface', keys: [[15, [-2.6, 2.2, 3.6], [0.1, 1.6, 0.1], 40], [16.75, [-2.4, 2.4, 3.3], [0.1, 2.0, 0.1], 40]] },
  { b0: 16.75, b1: 18, mode: 'surface', cutTube: 1, keys: [[16.75, [0.5, 1.86, 0.8], [0.0, 1.9, 0], 36], [18, [0.44, 1.86, 0.72], [0.0, 1.9, 0], 36]] },
  { b0: 18, b1: 22, mode: 'surface', crate: 1, noW: 1, keys: [[18, [-0.95, 1.2, 3.0], [-1.6, 0.62, 1.9], 38], [22, [-1.15, 1.05, 2.75], [-1.6, 0.66, 1.9], 38]] },
  // 2. próbatest
  { b0: 22, b1: 25.2, lab: 1, keys: [[22, P(EXT.x + 1.35, 1.68, -0.1), P(EXT.x + 0.1, 1.08, -0.92), 44], [25.2, P(EXT.x + 1.28, 1.64, -0.16), P(EXT.x + 0.2, 1.08, -0.92), 44]] },
  { b0: 25.2, b1: 29, lab: 1, keys: [[25.2, P(LAT.x + 0.42, 1.42, -1.48), P(LAT.x - 0.02, 1.1, -0.82), 40], [29, P(LAT.x + 0.36, 1.38, -1.5), P(LAT.x - 0.02, 1.08, -0.84), 40]] },
  { b0: 29, b1: 32, lab: 1, tech: false, keys: [[29, P(SCL.x + 0.32, 1.18, -0.62), P(SCL.x + 0.06, 0.99, SCL.z), 32], [32, P(SCL.x + 0.26, 1.14, -0.66), P(SCL.x + 0.06, 0.99, SCL.z), 32]] },
  { b0: 32, b1: 33.5, lab: 1, tech: false, keys: [[32, P(FRX + 0.24, 1.26, FRZ + 0.4), P(FRX, 1.205, FRZ), 36], [33.5, P(FRX + 0.2, 1.25, FRZ + 0.36), P(FRX, 1.205, FRZ), 36]] },
  { b0: 33.5, b1: 36, lab: 1, keys: [[33.5, P(FRX + 0.62, 1.45, -0.72), P(FRX, 1.24, FRZ), 38], [36, P(FRX + 0.56, 1.42, -0.76), P(FRX, 1.24, FRZ), 38]] },
  { b0: 36, b1: 38, lab: 1, keys: [[36, P(FRX + 0.85, 1.6, 0.35), P(FRX, 1.3, FRZ), 40], [38, P(FRX + 0.78, 1.55, 0.25), P(FRX, 1.28, FRZ), 40]] },
  { b0: 38, b1: 40, lab: 1, keys: [[38, P(FRX + 0.3, 1.32, FRZ + 0.55), P(FRX, 1.28, FRZ), 34], [40, P(FRX + 0.26, 1.33, FRZ + 0.5), P(FRX, 1.3, FRZ), 34]] },
  { b0: 40, b1: 44, lab: 1, keys: [[40, P(1.3, 1.8, 1.4), P(1.25, 1.15, -1.15), 44], [44, P(1.0, 1.75, 1.25), P(1.15, 1.15, -1.15), 44]] },
  // betűk: a háttérben a labor
  { b0: 44, b1: 48, lab: 1, keys: [[44, P(0.4, 1.65, 1.9), P(0.8, 1.2, -1.2), 44], [48, P(0.7, 1.6, 1.7), P(0.8, 1.2, -1.2), 44]] },
  // UU
  { b0: 48, b1: 51, lab: 1, tech: false, keys: [[48, P(FRX + 0.22, CY + 0.05, FRZ + 0.36), P(FRX, CY, FRZ), 34], [51, P(FRX + 0.18, CY + 0.04, FRZ + 0.32), P(FRX, CY, FRZ), 34]] },
  { b0: 51, b1: 55, lab: 1, keys: [[51, P(FRX + 0.62, CY + 0.12, FRZ + 0.95), P(FRX + 0.36, CY - 0.02, FRZ), 38], [55, P(FRX + 0.56, CY + 0.1, FRZ + 0.88), P(FRX + 0.34, CY - 0.02, FRZ), 38]] },
  { b0: 55, b1: 58, lab: 1, tech: false, keys: [[55, P(FRX + 0.14, CY + 0.02, FRZ + 0.27), P(FRX, CY - 0.005, FRZ), 32], [58, P(FRX + 0.11, CY + 0.02, FRZ + 0.24), P(FRX, CY - 0.005, FRZ), 32]] },
  { b0: 58, b1: 66, lab: 1, keys: [[58, P(FRX - 0.5, CY + 0.15, FRZ + 0.75), P(FRX - 0.05, CY, FRZ), 36], [66, P(FRX - 0.35, CY + 0.1, FRZ + 0.62), P(FRX - 0.05, CY, FRZ), 36]] },
  // CU
  { b0: 66, b1: 69, lab: 1, tech: false, keys: [[66, P(FRX + 0.13, CY + 0.03, FRZ + 0.25), P(FRX, CY, FRZ), 30], [69, P(FRX + 0.1, CY + 0.02, FRZ + 0.23), P(FRX, CY - 0.01, FRZ), 30]] },
  { b0: 69, b1: 74, lab: 1, keys: [[69, P(FRX + 0.8, CY + 0.2, FRZ + 0.85), P(FRX + 0.5, 1.2, FRZ - 0.05), 40], [74, P(FRX + 0.72, CY + 0.18, FRZ + 0.8), P(FRX + 0.5, 1.2, FRZ - 0.05), 40]] },
  { b0: 74, b1: 79, lab: 1, keys: [[74, P(FRX + 0.5, CY + 0.08, FRZ + 0.72), P(FRX + 0.28, CY - 0.03, FRZ), 36], [79, P(FRX + 0.45, CY + 0.07, FRZ + 0.66), P(FRX + 0.27, CY - 0.03, FRZ), 36]] },
  { b0: 79, b1: 84, lab: 1, keys: [[79, P(FRX + 0.62, CY + 0.12, FRZ + 0.95), P(FRX + 0.36, CY - 0.02, FRZ), 38], [84, P(FRX + 0.56, CY + 0.1, FRZ + 0.88), P(FRX + 0.34, CY - 0.02, FRZ), 38]] },
  { b0: 84, b1: 92, lab: 1, keys: [[84, P(FRX - 0.5, CY + 0.15, FRZ + 0.75), P(FRX - 0.05, CY, FRZ), 36], [92, P(FRX - 0.35, CY + 0.1, FRZ + 0.62), P(FRX - 0.05, CY, FRZ), 36]] },
  // CD
  { b0: 92, b1: 95, lab: 1, keys: [[92, P(FRX + 0.62, CY + 0.25, FRZ + 1.0), P(FRX + 0.42, 1.25, FRZ - 0.05), 42], [95, P(FRX + 0.56, CY + 0.22, FRZ + 0.95), P(FRX + 0.42, 1.25, FRZ - 0.05), 42]] },
  { b0: 95, b1: 100, lab: 1, keys: [[95, P(FRX + 0.62, CY + 0.12, FRZ + 0.95), P(FRX + 0.36, CY - 0.02, FRZ), 38], [100, P(FRX + 0.56, CY + 0.1, FRZ + 0.88), P(FRX + 0.34, CY - 0.02, FRZ), 38]] },
  { b0: 100, b1: 104, lab: 1, tech: false, keys: [[100, P(FRX + 0.14, CY + 0.02, FRZ + 0.27), P(FRX, CY - 0.005, FRZ), 32], [104, P(FRX + 0.11, CY + 0.02, FRZ + 0.24), P(FRX, CY - 0.005, FRZ), 32]] },
  { b0: 104, b1: 112, lab: 1, keys: [[104, P(FRX - 0.5, CY + 0.15, FRZ + 0.75), P(FRX - 0.05, CY, FRZ), 36], [112, P(FRX - 0.35, CY + 0.1, FRZ + 0.62), P(FRX - 0.05, CY, FRZ), 36]] },
  // összevetés, összegzés, zárás
  { b0: 112, b1: 122, lab: 1, keys: [[112, P(0.4, 1.65, 1.9), P(0.8, 1.2, -1.2), 44], [122, P(0.8, 1.6, 1.6), P(0.8, 1.2, -1.2), 44]] },
  { b0: 122, b1: 131, lab: 1, keys: [[122, P(-0.6, 1.85, 2.9), P(0.4, 1.1, -1.1), 42], [131, P(-1.6, 2.4, 4.0), P(0.4, 1.1, -1.1), 42]] },
].map(s => ({ ...s, t0: tb(s.b0), t1: tb(s.b1) }));
