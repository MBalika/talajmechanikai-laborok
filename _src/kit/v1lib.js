// A térfogatváltozó-videó (1. rész) környezeti elemei: égbolt, textúrák, fák, szomszéd házak, dombok.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mulberry32, clamp, lerp, smooth } from './util.js';
const { SphereGeometry, BackSide, BoxGeometry, BufferGeometry, CanvasTexture, Color, ConeGeometry, CylinderGeometry, DataTexture, DoubleSide, Float32BufferAttribute, Group, InstancedMesh, LinearFilter, LinearMipmapLinearFilter, Matrix4, Mesh, MeshDepthMaterial, MeshStandardMaterial, PlaneGeometry, Quaternion, RGBADepthPacking, RGBAFormat, RepeatWrapping, SRGBColorSpace, ShaderChunk, ShaderMaterial, Texture, Vector3 } = THREE;
const clamp2 = clamp, lerp2 = lerp;
// src/textures.js
function canvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}
function noiseTexture(size = 256, seed = 7) {
  const rnd = mulberry32(seed);
  const data = new Uint8Array(size * size * 4);
  for (let ch = 0; ch < 4; ch++) {
    const acc = new Float32Array(size * size);
    let amp = 1, tot = 0;
    for (let oct = 0; oct < 5; oct++) {
      const g = 4 << oct;
      const grid = new Float32Array(g * g);
      for (let i = 0; i < g * g; i++) grid[i] = rnd();
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const fx = x / size * g, fy = y / size * g;
        const ix = Math.floor(fx), iy = Math.floor(fy);
        const tx = fx - ix, ty = fy - iy;
        const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
        const a = grid[iy % g * g + ix % g], b = grid[iy % g * g + (ix + 1) % g];
        const c = grid[(iy + 1) % g * g + ix % g], d = grid[(iy + 1) % g * g + (ix + 1) % g];
        acc[y * size + x] += amp * ((a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy);
      }
      tot += amp;
      amp *= 0.5;
    }
    for (let i = 0; i < size * size; i++) data[i * 4 + ch] = Math.max(0, Math.min(255, Math.round((acc[i] / tot - 0.5) * 1.9 * 255 + 128)));
  }
  const t = new DataTexture(data, size, size, RGBAFormat);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.magFilter = LinearFilter;
  t.minFilter = LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}
function crackField(size = 1024, G1 = 22, G2 = 70, seed = 3) {
  const rnd = mulberry32(seed);
  function pts(G) {
    const p = new Float32Array(G * G * 2);
    for (let i = 0; i < G * G; i++) {
      p[i * 2] = 0.15 + 0.7 * rnd();
      p[i * 2 + 1] = 0.15 + 0.7 * rnd();
    }
    return p;
  }
  const P1 = pts(G1), P2 = pts(G2);
  const ids = new Float32Array(G1 * G1);
  for (let i = 0; i < ids.length; i++) ids[i] = rnd();
  const data = new Uint8Array(size * size * 4);
  function edge(px2, py2, G, P, wantId) {
    const fx = px2 * G, fy = py2 * G;
    const ix = Math.floor(fx), iy = Math.floor(fy);
    let best = 1e9, bx = 0, by = 0, bid = 0;
    const cand = [];
    for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) {
      const cx = ix + i, cy = iy + j;
      const wx = (cx % G + G) % G, wy = (cy % G + G) % G;
      const k = wy * G + wx;
      const x = cx + P[k * 2], y = cy + P[k * 2 + 1];
      cand.push(x, y, k);
      const d = (x - fx) * (x - fx) + (y - fy) * (y - fy);
      if (d < best) {
        best = d;
        bx = x;
        by = y;
        bid = k;
      }
    }
    let md = 1e9;
    for (let c = 0; c < cand.length; c += 3) {
      const x = cand[c], y = cand[c + 1];
      if (Math.abs(x - bx) < 1e-6 && Math.abs(y - by) < 1e-6) continue;
      const mx = (x + bx) / 2, my = (y + by) / 2;
      let nx = x - bx, ny = y - by;
      const l = Math.hypot(nx, ny);
      nx /= l;
      ny /= l;
      const d = (mx - fx) * nx + (my - fy) * ny;
      if (d < md) md = d;
    }
    return [md / G, wantId ? ids[bid] : 0];
  }
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const px2 = (x + 0.5) / size, py2 = (y + 0.5) / size;
    const [e1, id] = edge(px2, py2, G1, P1, true);
    const [e2] = edge(px2, py2, G2, P2, false);
    const i = (y * size + x) * 4;
    data[i] = Math.min(255, Math.round(e1 * size / 14 * 255));
    data[i + 1] = Math.round(id * 255);
    data[i + 2] = Math.min(255, Math.round(e2 * size / 6 * 255));
    data[i + 3] = 255;
  }
  const t = new DataTexture(data, size, size, RGBAFormat);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.minFilter = LinearMipmapLinearFilter;
  t.magFilter = LinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}
function plasterTexture(base = [227, 211, 174], seed = 11) {
  const S = 1024, c = canvas(S, S), g = c.getContext("2d");
  const img = g.createImageData(S, S);
  const rnd = mulberry32(seed);
  const n = new Float32Array(S * S);
  for (let oct = 0; oct < 5; oct++) {
    const G = 4 << oct, amp = 1 / (1 + oct * 0.9);
    const grid = new Float32Array(G * G).map(() => rnd() - 0.5);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const fx = x / S * G, fy = y / S * G, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
      const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      const a = grid[iy % G * G + ix % G], b = grid[iy % G * G + (ix + 1) % G], cc = grid[(iy + 1) % G * G + ix % G], d = grid[(iy + 1) % G * G + (ix + 1) % G];
      n[y * S + x] += amp * ((a * (1 - sx) + b * sx) * (1 - sy) + (cc * (1 - sx) + d * sx) * sy);
    }
  }
  for (let i = 0; i < S * S; i++) {
    const grain = (rnd() - 0.5) * 18;
    const v = n[i] * 26 + grain;
    img.data[i * 4] = base[0] + v;
    img.data[i * 4 + 1] = base[1] + v * 0.95;
    img.data[i * 4 + 2] = base[2] + v * 0.85;
    img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.wrapS = t.wrapT = RepeatWrapping;
  t.anisotropy = 4;
  return t;
}
function roofTexture(seed = 5) {
  const S = 1024, c = canvas(S, S), g = c.getContext("2d");
  const rnd = mulberry32(seed);
  g.fillStyle = "#5a2a18";
  g.fillRect(0, 0, S, S);
  const rows = 16, cols = 12, rh = S / rows, cw = S / cols;
  for (let r = rows; r >= -1; r--) {
    const off = r % 2 * cw / 2;
    for (let k = -1; k <= cols; k++) {
      const x = k * cw + off, y = r * rh;
      const h = 22 + rnd() * 10, s = 52 + rnd() * 12, l = 30 + rnd() * 9 - (rnd() < 0.08 ? 8 : 0);
      const grd = g.createLinearGradient(0, y - rh * 0.2, 0, y + rh * 1.6);
      grd.addColorStop(0, `hsl(${h},${s}%,${l + 6}%)`);
      grd.addColorStop(1, `hsl(${h},${s}%,${l - 9}%)`);
      g.fillStyle = grd;
      g.beginPath();
      const w = cw - 3, x0 = x + 1.5, y0 = y - rh * 0.15, y1 = y + rh * 1.55;
      g.moveTo(x0, y0);
      g.lineTo(x0 + w, y0);
      g.lineTo(x0 + w, y1 - w * 0.35);
      g.quadraticCurveTo(x0 + w, y1, x0 + w / 2, y1);
      g.quadraticCurveTo(x0, y1, x0, y1 - w * 0.35);
      g.closePath();
      g.fill();
      g.strokeStyle = "rgba(30,10,5,0.55)";
      g.lineWidth = 2;
      g.stroke();
      for (let q = 0; q < 6; q++) {
        g.fillStyle = `rgba(${60 + rnd() * 40},${60 + rnd() * 30},${40},${rnd() * 0.25})`;
        g.fillRect(x0 + rnd() * w, y0 + rnd() * rh * 1.5, 2 + rnd() * 4, 2 + rnd() * 3);
      }
    }
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.wrapS = t.wrapT = RepeatWrapping;
  t.anisotropy = 4;
  return t;
}
function crackMap(L, H3, paths, seed = 1) {
  const PX = 200;
  const W2 = Math.round(L * PX), Hh = Math.round(H3 * PX);
  const c = canvas(W2, Hh), g = c.getContext("2d");
  const rnd = mulberry32(seed);
  g.clearRect(0, 0, W2, Hh);
  g.lineCap = "round";
  g.lineJoin = "round";
  function jag(p, depth, amp) {
    if (depth === 0) return p;
    const out = [p[0]];
    for (let i = 0; i < p.length - 1; i++) {
      const a = p[i], b = p[i + 1];
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy);
      const o = (rnd() - 0.5) * amp * l;
      out.push([mx - dy / l * o, my + dx / l * o], b);
    }
    return jag(out, depth - 1, amp * 0.9);
  }
  for (const path of paths) {
    const pts = jag(path.pts, 6, 0.35);
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const tot = cum[cum.length - 1];
    const o0 = path.start ?? 0, o1 = path.end ?? 1;
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < pts.length - 1; i++) {
        const ord = o0 + (o1 - o0) * cum[i] / tot;
        const taper = 1 - 0.75 * (cum[i] / tot);
        const w0 = (path.w ?? 1) * taper;
        const r = Math.round(ord * 255);
        if (pass === 0) {
          g.strokeStyle = `rgba(${r},0,255,1)`;
          g.lineWidth = Math.max(2, 9 * w0);
        } else {
          g.strokeStyle = `rgba(${r},255,255,1)`;
          g.lineWidth = Math.max(1.2, 3.2 * w0);
        }
        g.beginPath();
        g.moveTo(pts[i][0] * PX, Hh - pts[i][1] * PX);
        g.lineTo(pts[i + 1][0] * PX, Hh - pts[i + 1][1] * PX);
        g.stroke();
      }
    }
    for (let b = 0; b < (path.branches ?? 3); b++) {
      const i = Math.floor(rnd() * (pts.length - 2));
      const a = pts[i];
      const ang = Math.atan2(pts[i + 1][1] - a[1], pts[i + 1][0] - a[0]) + (rnd() < 0.5 ? -1 : 1) * (0.5 + rnd() * 0.6);
      const len = 0.12 + rnd() * 0.25;
      const bp = jag([a, [a[0] + Math.cos(ang) * len, a[1] + Math.sin(ang) * len]], 4, 0.4);
      const ord = Math.min(1, o0 + (o1 - o0) * (cum[i] / tot) + 0.08);
      g.strokeStyle = `rgba(${Math.round(ord * 255)},255,80,1)`;
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(bp[0][0] * PX, Hh - bp[0][1] * PX);
      for (const q of bp) g.lineTo(q[0] * PX, Hh - q[1] * PX);
      g.stroke();
    }
  }
  const t = new CanvasTexture(c);
  t.colorSpace = NoColorSpace;
  t.minFilter = LinearFilter;
  t.generateMipmaps = false;
  return t;
}
function hexTexture(color = "#bfe3ff") {
  const S = 512, c = canvas(S, S), g = c.getContext("2d");
  g.fillStyle = "#000";
  g.fillRect(0, 0, S, S);
  const r = 22, h = r * Math.sqrt(3);
  g.strokeStyle = color;
  g.lineWidth = 2.2;
  g.globalAlpha = 0.85;
  for (let y = -h; y < S + h; y += h) for (let x = -r * 3, k = 0; x < S + r * 3; x += r * 1.5, k++) {
    const cy = y + k % 2 * h / 2;
    g.beginPath();
    for (let a = 0; a < 7; a++) {
      const ang = Math.PI / 3 * a;
      const px2 = x + r * Math.cos(ang), py2 = cy + r * Math.sin(ang);
      a ? g.lineTo(px2, py2) : g.moveTo(px2, py2);
    }
    g.stroke();
    g.fillStyle = color;
    g.beginPath();
    g.arc(x + r, cy, 3.2, 0, Math.PI * 2);
    g.fill();
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.wrapS = t.wrapT = RepeatWrapping;
  return t;
}
function loadImageTexture(url2, srgb = true, repeat = true) {
  const t = new Texture();
  const img = new Image();
  t.image = img;
  t.userData.promise = new Promise((res) => {
    img.onload = () => {
      t.needsUpdate = true;
      res();
    };
    img.src = url2;
  });
  if (srgb) t.colorSpace = SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

// src/sky.js
var SKY = {
  uSunDir: { value: new Vector3(0, 0.4, 1).normalize() },
  uZenith: { value: new Color(3108800) },
  uHorizon: { value: new Color(13623534) },
  uGround: { value: new Color(9078136) },
  uSunCol: { value: new Color(16773590) },
  uCloud: { value: 0.45 },
  // coverage 0..1
  uCloudDark: { value: 0 },
  // overcast darkening
  uTime: { value: 0 },
  uNoise: { value: null }
};
function makeSkyDome(noiseTex) {
  SKY.uNoise.value = noiseTex;
  const m = new ShaderMaterial({
    side: BackSide,
    depthWrite: false,
    fog: false,
    uniforms: SKY,
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }`,
    fragmentShader: `
    varying vec3 vDir; uniform vec3 uSunDir, uZenith, uHorizon, uGround, uSunCol; uniform float uCloud, uCloudDark, uTime; uniform sampler2D uNoise;
    float fbm(vec2 p){ float a=0.0, w=0.5; for(int i=0;i<4;i++){ a += w * texture2D(uNoise, p).r; p *= 2.07; w *= 0.5; } return a; }
    void main(){
      vec3 d = normalize(vDir);
      float h = d.y;
      float t = pow(1.0 - max(h, 0.0), 3.2);
      vec3 col = mix(uZenith, uHorizon, t);
      float sd = max(dot(d, normalize(uSunDir)), 0.0);
      col += uSunCol * (pow(sd, 6.0) * 0.28 + pow(sd, 64.0) * 0.6) * (1.0 - uCloudDark * 0.7);
      col += uSunCol * smoothstep(0.9993, 0.99975, sd) * 6.0 * (1.0 - uCloudDark);
      // clouds on a virtual plane
      if (h > 0.0) {
        vec2 cp = d.xz / (h + 0.08) * 0.055 + vec2(uTime * 0.0015, uTime * 0.0006);
        float n = fbm(cp);
        float c = smoothstep(1.0 - uCloud * 0.95, 1.12 - uCloud * 0.8, n + 0.1);
        float shade = fbm(cp + normalize(uSunDir).xz * 0.02);
        vec3 cc = mix(vec3(1.0, 0.98, 0.95), vec3(0.62, 0.66, 0.72), clamp((shade - n) * 4.0 + 0.35 + uCloudDark * 0.5, 0.0, 1.0));
        cc += uSunCol * pow(sd, 8.0) * 0.4;
        cc *= mix(1.0, 0.55, uCloudDark);
        col = mix(col, cc, c * smoothstep(0.0, 0.12, h) * 0.95);
      } else {
        col = mix(uHorizon, uGround, smoothstep(0.0, 0.25, -h));
      }
      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`
  });
  const mesh = new Mesh(new SphereGeometry(5e3, 48, 24), m);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1;
  return mesh;
}
// src/trees.js
var TU2 = { uLeaf: { value: new Color(5208620) }, uLeafAmt: { value: 1 }, uWind: { value: 0 } };
function leafTexture(seed = 3, kind = "broad") {
  const S = 512, c = canvas(S, S), g = c.getContext("2d");
  const rnd = mulberry32(seed);
  g.clearRect(0, 0, S, S);
  const N = kind === "poplar" ? 46 : 34;
  for (let i = 0; i < N; i++) {
    const x = S * (0.15 + 0.7 * rnd()), y = S * (0.15 + 0.7 * rnd());
    const L = S * (kind === "poplar" ? 0.075 : 0.1) * (0.7 + 0.6 * rnd()), Wd = L * (kind === "poplar" ? 0.75 : 0.5);
    const a = rnd() * Math.PI * 2;
    const l = 150 + rnd() * 90;
    g.save();
    g.translate(x, y);
    g.rotate(a);
    g.fillStyle = `rgb(${l * 0.86},${l},${l * 0.7})`;
    g.beginPath();
    if (kind === "poplar") {
      g.moveTo(0, -L);
      g.quadraticCurveTo(Wd, -L * 0.1, 0, L * 0.55);
      g.quadraticCurveTo(-Wd, -L * 0.1, 0, -L);
    } else {
      g.ellipse(0, 0, Wd, L, 0, 0, Math.PI * 2);
    }
    g.fill();
    g.strokeStyle = `rgba(60,70,40,0.45)`;
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(0, -L * 0.9);
    g.lineTo(0, L * 0.6);
    g.stroke();
    g.strokeStyle = "rgba(70,60,40,0.8)";
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(0, L * (kind === "poplar" ? 0.55 : 1));
    g.lineTo(0, L * 1.35);
    g.stroke();
    g.restore();
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
function crownGeo({ seed = 1, count = 2e3, y0 = 3, y1 = 18, profile, size = [0.6, 1], cx = 0, cz = 0, squash = 1 }) {
  const rnd = mulberry32(seed);
  const pos = [], nrm = [], uv = [], col = [], rr = [], idx = [];
  const tmp2 = new Vector3(), a = new Vector3(), b = new Vector3(), n = new Vector3();
  for (let i = 0; i < count; i++) {
    const u = rnd();
    const y = y0 + u * (y1 - y0);
    const R2 = profile(u);
    const rad = R2 * Math.pow(rnd(), 0.35);
    const ang = rnd() * Math.PI * 2;
    const px2 = cx + Math.cos(ang) * rad, pz2 = cz + Math.sin(ang) * rad * squash;
    const s = size[0] + rnd() * (size[1] - size[0]);
    n.set(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize();
    a.set(0, 1, 0).cross(n);
    if (a.lengthSq() < 1e-4) a.set(1, 0, 0);
    a.normalize();
    b.copy(n).cross(a).normalize();
    const base = pos.length / 3;
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    tmp2.set(px2 - cx, (y - (y0 + y1) / 2) * 0.35, pz2 - cz).normalize().lerp(new Vector3(0, 1, 0), 0.25).normalize();
    const shade = 0.75 + 0.35 * (rad / Math.max(R2, 0.01)) * (0.6 + 0.4 * u) + (rnd() - 0.5) * 0.15;
    const r0 = rnd();
    for (const [cu, cv] of corners) {
      pos.push(px2 + (a.x * cu + b.x * cv) * s * 0.5, y + (a.y * cu + b.y * cv) * s * 0.5, pz2 + (a.z * cu + b.z * cv) * s * 0.5);
      nrm.push(tmp2.x, tmp2.y, tmp2.z);
      uv.push((cu + 1) / 2, (cv + 1) / 2);
      col.push(shade, shade, shade);
      rr.push(r0);
    }
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new Float32BufferAttribute(nrm, 3));
  g.setAttribute("uv", new Float32BufferAttribute(uv, 2));
  g.setAttribute("color", new Float32BufferAttribute(col, 3));
  g.setAttribute("rnd", new Float32BufferAttribute(rr, 1));
  g.setIndex(idx);
  return g;
}
function foliageMaterial(tex) {
  const m = new MeshStandardMaterial({ map: tex, alphaTest: 0.42, side: DoubleSide, vertexColors: true, roughness: 0.78, metalness: 0 });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, TU2);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nuniform float uWind, uLeafAmt; attribute float rnd; varying float vRnd;").replace("#include <begin_vertex>", `#include <begin_vertex>
      vRnd = rnd;
      float hh = max(position.y, 0.0);
      transformed.x += sin(uWind * 1.3 + position.y * 0.35 + position.z) * 0.010 * hh + sin(uWind*4.0 + rnd*30.0)*0.03;
      transformed.z += cos(uWind * 1.1 + position.y * 0.31 + position.x) * 0.008 * hh;
      if (rnd > uLeafAmt) transformed *= 0.0;`);
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform vec3 uLeaf; varying float vRnd;").replace("#include <color_fragment>", `#include <color_fragment>
      diffuseColor.rgb *= uLeaf * 2.1 * (0.85 + 0.3 * vRnd);`).replace("#include <normal_fragment_begin>", ShaderChunk.normal_fragment_begin.replace("normal *= faceDirection;", ""));
  };
  m.customProgramCacheKey = () => "leafcards";
  return m;
}
function foliageDepth(tex) {
  const d = new MeshDepthMaterial({ depthPacking: RGBADepthPacking, map: tex, alphaTest: 0.42, side: DoubleSide });
  return d;
}
function trunk(seed, h, r0, nb, spread = 0.6, lenK = 0.35) {
  const rnd = mulberry32(seed);
  const parts = [];
  const t = new CylinderGeometry(r0 * 0.3, r0, h, 10, 8);
  t.translate(0, h / 2, 0);
  const p = t.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    p.setX(i, p.getX(i) + Math.sin(y * 0.3 + seed) * 0.08 * y / h);
  }
  parts.push(t);
  for (let i = 0; i < nb; i++) {
    const L = h * (0.12 + rnd() * lenK);
    const b = new CylinderGeometry(r0 * 0.08, r0 * 0.28, L, 6);
    b.translate(0, L / 2, 0);
    b.rotateZ(spread * (0.5 + rnd() * 0.7));
    b.rotateY(rnd() * Math.PI * 2);
    b.translate(0, h * (0.25 + rnd() * 0.65), 0);
    parts.push(b);
  }
  return mergeGeometries(parts.map((g) => g.index ? g.toNonIndexed() : g));
}
function makeTreesV2() {
  const group = new Group();
  const texP = leafTexture(3, "poplar"), texB = leafTexture(8, "broad");
  const folP = foliageMaterial(texP), folB = foliageMaterial(texB);
  const bark = new MeshStandardMaterial({ color: 5917760, roughness: 0.95 });
  const poplar = new Group();
  const pc = new Mesh(crownGeo({ seed: 11, count: 3400, y0: 2.2, y1: 20, size: [0.55, 0.95], profile: (u) => 0.5 + 1.75 * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.08)), 0.7) * (1 - 0.25 * u) }), folP);
  pc.castShadow = true;
  pc.receiveShadow = true;
  pc.customDepthMaterial = foliageDepth(texP);
  const pt = new Mesh(trunk(4, 17, 0.42, 26, 0.35, 0.18), bark);
  pt.castShadow = true;
  poplar.add(pc, pt);
  poplar.position.set(-11.5, 0, -7.5);
  group.add(poplar);
  const walnut = new Group();
  const wc = new Mesh(crownGeo({ seed: 21, count: 2600, y0: 3, y1: 10.5, size: [0.8, 1.3], profile: (u) => 1.2 + 3.6 * Math.sin(Math.PI * Math.min(1, u * 1.02)) }), folB);
  wc.castShadow = true;
  wc.receiveShadow = true;
  wc.customDepthMaterial = foliageDepth(texB);
  const wt = new Mesh(trunk(8, 8, 0.32, 14, 0.9, 0.3), bark);
  wt.castShadow = true;
  walnut.add(wc, wt);
  walnut.position.set(13, 0, -13);
  group.add(walnut);
  const rnd = mulberry32(77);
  const bgC = crownGeo({ seed: 31, count: 520, y0: 2.6, y1: 10.5, size: [1.3, 2], profile: (u) => 1 + 3.3 * Math.sin(Math.PI * Math.min(1, u * 1.05)) });
  const bgT = trunk(5, 7, 0.32, 6, 0.8, 0.25);
  const N = 170;
  const imF = new InstancedMesh(bgC, folB, N), imT = new InstancedMesh(bgT, bark, N);
  const M = new Matrix4(), q = new Quaternion(), s = new Vector3(), p = new Vector3();
  let k = 0;
  while (k < N) {
    const a = rnd() * Math.PI * 2, r = 40 + Math.pow(rnd(), 0.7) * 170;
    const x = Math.cos(a) * r, z = Math.sin(a) * r - 10;
    if (z > -2 && Math.abs(x) < 60) continue;
    if (Math.abs(z - 19) < 6) continue;
    if (Math.hypot(x - 160, z - 140) < 40) continue;
    const sc = 0.75 + rnd() * 0.7;
    q.setFromAxisAngle(new Vector3(0, 1, 0), rnd() * 6.28);
    s.set(sc, sc * (0.85 + rnd() * 0.4), sc);
    p.set(x, 0, z);
    M.compose(p, q, s);
    imF.setMatrixAt(k, M);
    imT.setMatrixAt(k, M);
    k++;
  }
  imF.castShadow = false;
  imF.receiveShadow = false;
  group.add(imF, imT);
  return { group, poplar, walnut };
}



function makeNeighbours(T2) {
  const group = new Group();
  const cols = [14206884, 15130831, 13612954, 14864296, 13881542];
  const specs = [[-19, -13, 0], [19, -14, 1], [-36, -16, 2], [36, -12, 3], [0, -32, 4], [-22, -38, 1], [24, -40, 2]];
  for (const [x, z, c] of specs) {
    const g = new Group();
    const mw = new MeshStandardMaterial({ map: T2.plaster, color: cols[c], roughness: 0.92 });
    const w = new Mesh(new BoxGeometry(9.5, 3.2, 9), mw);
    w.position.y = 1.6;
    w.castShadow = w.receiveShadow = true;
    const roof = new Mesh(new ConeGeometry(7.3, 3.6, 4, 1), new MeshStandardMaterial({ map: T2.roof, roughness: 0.8 }));
    roof.rotation.y = Math.PI / 4;
    roof.scale.set(1, 1, 0.95);
    roof.position.y = 3.2 + 1.8;
    roof.castShadow = true;
    const wm = new MeshStandardMaterial({ color: 1975852, roughness: 0.1, metalness: 0.2 });
    for (const dx of [-2.3, 2.3]) {
      const wi = new Mesh(new PlaneGeometry(1.4, 1.4), wm);
      wi.position.set(dx, 1.7, 4.51);
      g.add(wi);
    }
    g.add(w, roof);
    g.position.set(x, 0, z);
    g.rotation.y = x * 0.013;
    group.add(g);
  }
  return group;
}

function makeHills() {
  const rnd = mulberry32(5);
  const g = new CylinderGeometry(900, 900, 60, 128, 4, true);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const a = Math.atan2(z, x);
    const h = 18 + 14 * Math.sin(a * 3 + 1) + 9 * Math.sin(a * 7 + 2) + 5 * Math.sin(a * 13);
    if (y > 0) p.setY(i, h);
    else p.setY(i, -5);
  }
  g.computeVertexNormals();
  const m = new MeshStandardMaterial({ color: 7307114, roughness: 1, side: BackSide });
  const mesh = new Mesh(g, m);
  mesh.position.y = 0;
  return mesh;
}

export { canvas, noiseTexture, plasterTexture, roofTexture, loadImageTexture, SKY, makeSkyDome, TU2, leafTexture, crownGeo, foliageMaterial, foliageDepth, trunk, makeTreesV2, makeNeighbours, makeHills, crackField, crackMap, hexTexture };
