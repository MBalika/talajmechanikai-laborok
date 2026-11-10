# Vibrálás-jelöltek geometriai keresése: a látható hálókban egy síkba eső, azonos irányba néző és egymást átfedő háromszögek
# (különböző hálókból). Használat: python3 tools/coplanar.py <video.html> <idő1> [<idő2> …] > lista.txt
import asyncio, sys, os, json
from playwright.async_api import async_playwright
html = os.path.abspath(sys.argv[1]); TS = [float(x) for x in sys.argv[2:]]
JS = r"""
(t) => {
  window.renderAt(t);
  const R = window.R, THREE_V = (x, y, z) => ({ x, y, z });
  const meshes = []; R.scene.updateMatrixWorld(true);
  R.scene.traverse(o => { if (!o.isMesh) return; let v = true, p = o; while (p) { if (!p.visible) { v = false; break; } p = p.parent; } if (!v) return; meshes.push(o); });
  const buckets = new Map(); const e = new Float64Array(9);
  const keyOf = (nx, ny, nz, d) => Math.round(nx * 500) + ',' + Math.round(ny * 500) + ',' + Math.round(nz * 500) + ',' + Math.round(d * 400);
  meshes.forEach((m, mi) => {
    const g = m.geometry, pos = g.attributes.position; if (!pos) return; { const mt = Array.isArray(m.material) ? m.material[0] : m.material; if (mt && mt.side === 1) return; if (mt && mt.transparent && mt.depthWrite === false && (mt.opacity < 0.02 || mt.blending === 2)) return; } const idx = g.index ? g.index.array : null;
    const mats = []; if (m.isInstancedMesh) { for (let k = 0; k < Math.min(m.count, 400); k++) { const M = new m.matrixWorld.constructor(); m.getMatrixAt(k, M); mats.push(M.premultiply(m.matrixWorld)); } } else mats.push(m.matrixWorld);
    const ntri = idx ? idx.length / 3 : pos.count / 3; if (ntri > 60000) return;
    const mat = Array.isArray(m.material) ? m.material[0] : m.material; const side = mat ? mat.side : 0;
    for (const MW of mats) { const el = MW.elements;
      const P = (i) => { const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i); return [el[0] * x + el[4] * y + el[8] * z + el[12], el[1] * x + el[5] * y + el[9] * z + el[13], el[2] * x + el[6] * y + el[10] * z + el[14]]; };
      for (let f = 0; f < ntri; f++) { const a = P(idx ? idx[3 * f] : 3 * f), b = P(idx ? idx[3 * f + 1] : 3 * f + 1), c = P(idx ? idx[3 * f + 2] : 3 * f + 2);
        const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
        let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const L = Math.hypot(nx, ny, nz); if (L < 2e-4) continue; nx /= L; ny /= L; nz /= L;
        const d = nx * a[0] + ny * a[1] + nz * a[2]; const k = keyOf(nx, ny, nz, d);
        let B = buckets.get(k); if (!B) { B = []; buckets.set(k, B); } B.push([mi, a, b, c, side]); } } });
  // átfedés: a domináns tengely elhagyásával 2D-ben, konvex vágással
  const clip = (P, A, B) => { const out = []; const s = (p) => (B[0] - A[0]) * (p[1] - A[1]) - (B[1] - A[1]) * (p[0] - A[0]);
    for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length], sp = s(p), sq = s(q); if (sp >= 0) out.push(p); if ((sp >= 0) !== (sq >= 0)) { const u = sp / (sp - sq); out.push([p[0] + u * (q[0] - p[0]), p[1] + u * (q[1] - p[1])]); } } return out; };
  const area = (P) => { let s = 0; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; s += p[0] * q[1] - q[0] * p[1]; } return s / 2; };
  const res = new Map();
  for (const [k, B] of buckets) { if (B.length < 2) continue; const ms = new Set(B.map(x => x[0])); if (ms.size < 2) continue;
    const [kx, ky, kz] = k.split(',').map(Number); const ax = Math.abs(kx) >= Math.abs(ky) && Math.abs(kx) >= Math.abs(kz) ? 0 : Math.abs(ky) >= Math.abs(kz) ? 1 : 2; const i0 = ax === 0 ? 1 : 0, i1 = ax === 2 ? 1 : 2;
    const T = B.map(([mi, a, b, c]) => { let p = [[a[i0], a[i1]], [b[i0], b[i1]], [c[i0], c[i1]]]; if (area(p) < 0) p = [p[0], p[2], p[1]]; const xs = p.map(q => q[0]), ys = p.map(q => q[1]); return { mi, p, bb: [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)], c: [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3] }; });
    if (T.length > 6000) continue;
    for (let i = 0; i < T.length; i++) for (let j = i + 1; j < T.length; j++) { const A = T[i], Bt = T[j]; if (A.mi === Bt.mi) continue;
      if (A.bb[1] <= Bt.bb[0] + 1e-4 || Bt.bb[1] <= A.bb[0] + 1e-4 || A.bb[3] <= Bt.bb[2] + 1e-4 || Bt.bb[3] <= A.bb[2] + 1e-4) continue;
      let P = A.p; for (let e2 = 0; e2 < 3 && P.length; e2++) P = clip(P, Bt.p[e2], Bt.p[(e2 + 1) % 3]); if (P.length < 3) continue; const ar = area(P); if (ar < 2e-3) continue;
      const key = Math.min(A.mi, Bt.mi) + '-' + Math.max(A.mi, Bt.mi) + '|' + k; const r = res.get(key) || { a: 0, at: A.c, k }; r.a += ar; res.set(key, r); } }
  const desc = (m) => { const mat = Array.isArray(m.material) ? m.material[0] : m.material; const col = mat && mat.color ? '#' + mat.color.getHexString() : '?'; let n = m.name || ''; let p = m.parent; let path = ''; for (let i = 0; i < 3 && p; i++) { if (p.name) path = p.name + '/' + path; p = p.parent; }
    return (m.isInstancedMesh ? 'I:' : '') + m.geometry.type + ' ' + col + (mat && mat.transparent ? ' T' : '') + (mat && mat.side === 2 ? ' DS' : '') + ' ' + path + n; };
  // csak ami a kamera felől látszik: a kamera a sík elülső oldalán van, és a pont a látómezőben
  const cam = R.camera, cp = cam.position, V = new cam.position.constructor();
  const vis = (r) => { const [kx, ky, kz, kd] = r.k.split(',').map(Number); const n = [kx / 500, ky / 500, kz / 500], d = kd / 400; const sd = n[0] * cp.x + n[1] * cp.y + n[2] * cp.z - d; if (sd < 0.02) return false;
    return true; };
  return [...res.entries()].filter(([k, r]) => vis(r)).sort((a, b) => b[1].a - a[1].a).slice(0, 60).map(([key, r]) => { const [ids] = key.split('|'); const [i, j] = ids.split('-').map(Number);
    return { area: +r.a.toFixed(3), plane: r.k, at: r.at.map(v => +v.toFixed(2)), a: desc(meshes[i]), b: desc(meshes[j]) }; });
}
"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        pg = await b.new_page(viewport={'width': 640, 'height': 360}); pg.set_default_timeout(600000)
        await pg.goto('file://' + html + '?render'); await pg.wait_for_function('window.ready === true || window.initError', timeout=180000)
        for t in TS:
            r = await pg.evaluate(JS, t)
            print(f'== t = {t:.2f} s: {len(r)} átfedő síkpár', flush=True)
            for x in r: print(f"  {x['area']:8.3f} m²  @ {x['at']}  sík {x['plane']}\n      A: {x['a']}\n      B: {x['b']}", flush=True)
        await b.close()
asyncio.run(main())
