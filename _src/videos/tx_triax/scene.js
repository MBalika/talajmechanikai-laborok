// Triaxiális vizsgálat – jelenet: terepi mintavétel (x = 0) és talajmechanikai labor (x = 300)
import * as THREE from 'three';
import { clamp } from '../../kit/util.js';
import { initWorld, shotAt, cameraAt, placeCamera, heroMode } from '../../kit/world.js';
import { buildLab, updateLab } from './lab.js';
import * as TL from './timeline.js';
import { tb } from './timeline.js';
import { SHOTS } from './shots.js';

let R;
export async function init(canvas) {
  R = await initWorld(canvas, { exposure: 0.95 });
  R.L = buildLab(R);
  R.base = { sun: R.sun.intensity, hemi: R.hemi.intensity, env: R.scene.environmentIntensity };
  return R;
}
export function stateAt(t) { return { t, d: TL.DS }; }
export function render(t) {
  const S = stateAt(t);
  const shot = shotAt(SHOTS, t);
  const lab = true;
  heroMode(R, false);
  // világítás: terepen nap + égbolt, a laborban belső fények
  R.sun.intensity = lab ? 0 : R.base.sun; R.hemi.intensity = lab ? 0.35 : R.base.hemi; R.scene.environmentIntensity = lab ? 0.32 : R.base.env;
  R.sky.visible = !lab; R.terrain.visible = !lab; R.trees.group.visible = !lab; R.neigh.visible = !lab; R.scene.fog.near = lab ? 1e5 : 140; R.scene.fog.far = lab ? 2e5 : 900;
  R.scene.children.forEach(o => { if (o.userData && o.userData.isHills) o.visible = !lab; });
  const fs = null;
  const C = updateLab(R.L, t, shot, R);
  if (lab) R.under.intensity = 0;
  const cam = cameraAt(SHOTS, t, S, tb);
  const pxs = placeCamera(R, cam, t, 0);
  // a közeli vágósík a kamera–cél távolsággal nő (vibrálás ellen), de a közeli képeken is éles marad
  const dist = cam.pos.distanceTo(cam.tgt); R.camera.near = clamp(dist * 0.02, 0.004, 0.25); R.camera.far = lab ? 40 : 6000; R.camera.updateProjectionMatrix();
  R.bloom.strength = lab ? 0.18 : 0.28;
  R.composer.render();
  return { S, shot, camera: R.camera, C, fs };
}
