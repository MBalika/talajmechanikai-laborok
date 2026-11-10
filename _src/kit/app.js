// Közös belépési pont: betűk, 2D réteg, lejátszó
import * as THREE from 'three';
import { Overlay } from './overlay.js';
import { setupPlayer } from './player.js';
import { W, H } from './world.js';
import bc700 from '@fontsource/barlow-condensed/files/barlow-condensed-latin-700-normal.woff2';
import bc700x from '@fontsource/barlow-condensed/files/barlow-condensed-latin-ext-700-normal.woff2';
import bc800 from '@fontsource/barlow-condensed/files/barlow-condensed-latin-800-normal.woff2';
import bc800x from '@fontsource/barlow-condensed/files/barlow-condensed-latin-ext-800-normal.woff2';
import in500 from '@fontsource/inter/files/inter-latin-500-normal.woff2';
import in500x from '@fontsource/inter/files/inter-latin-ext-500-normal.woff2';
import in600 from '@fontsource/inter/files/inter-latin-600-normal.woff2';
import in600x from '@fontsource/inter/files/inter-latin-ext-600-normal.woff2';
import in700 from '@fontsource/inter/files/inter-latin-700-normal.woff2';
import in700x from '@fontsource/inter/files/inter-latin-ext-700-normal.woff2';
const LATIN = 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD';
const LATINX = 'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF';
async function loadFonts() {
  const defs = [['BarlowC', bc700, '700', LATIN], ['BarlowC', bc700x, '700', LATINX], ['BarlowC', bc800, '800', LATIN], ['BarlowC', bc800x, '800', LATINX],
    ['Inter', in500, '500', LATIN], ['Inter', in500x, '500', LATINX], ['Inter', in600, '600', LATIN], ['Inter', in600x, '600', LATINX], ['Inter', in700, '700', LATIN], ['Inter', in700x, '700', LATINX]];
  for (const [fam, url, w, ur] of defs) { const ff = new FontFace(fam, `url(${url})`, { weight: w, unicodeRange: ur }); await ff.load(); document.fonts.add(ff); }
}
// V: { TOTAL, FILE, init(canvas) , render(t) -> {camera, ...ctx}, drawOverlay(O, t, ctx), soundUrl }
export function startApp(V) {
  const Q = new URLSearchParams(location.search);
  const c3d = document.getElementById('c3d'), c2d = document.getElementById('c2d');
  const overlay = new Overlay(c2d);
  const v = new THREE.Vector3();
  function renderAt(t) {
    window.__vt = t;
    const ctx = V.render(t);
    overlay.clear();
    ctx.proj = (x, y, z) => { v.set(x, y, z).project(ctx.camera); return { x: (v.x * 0.5 + 0.5) * W, y: (-v.y * 0.5 + 0.5) * H, ok: v.z < 1 && v.z > -1 }; };
    V.drawOverlay(overlay, t, ctx);
  }
  window.renderAt = renderAt; window.TOTAL = V.TOTAL;
  (async () => {
    try {
      await loadFonts();
      await V.init(c3d);
      window.ready = true;
      if (!Q.has('render')) setupPlayer({ renderAt, total: V.TOTAL, audioUrl: V.soundUrl, title: V.FILE, c3d, c2d });
      else renderAt(0);
    } catch (e) { console.error('INIT FAIL', e && e.stack || e); window.initError = String(e && e.stack || e); }
  })();
}
