// Talajmechanikai laborok – közös jelenet: csak labor (belső fények), a videó készüléke az app-ból.
import { clamp } from '../../kit/util.js';
import { initWorld, shotAt, cameraAt, placeCamera, heroMode } from '../../kit/world.js';
import { buildRoom } from './room.js';

export function makeScene(APP, SHOTS, tb, roomOpts = {}) {
  let R, L;
  async function init(canvas) {
    R = await initWorld(canvas, { exposure: 0.95 });
    L = buildRoom(R, roomOpts); APP.build(L, R);
    R.sun.intensity = 0; R.hemi.intensity = 0.35; R.scene.environmentIntensity = 0.32;
    R.sky.visible = false; R.terrain.visible = false; R.trees.group.visible = false; R.neigh.visible = false; R.scene.fog.near = 1e5; R.scene.fog.far = 2e5;
    R.scene.children.forEach(o => { if (o.userData && o.userData.isHills) o.visible = false; });
    if (R.under) R.under.intensity = 0;
    return R;
  }
  function render(t) {
    const shot = shotAt(SHOTS, t); heroMode(R, false);
    R.sun.intensity = 0; R.hemi.intensity = 0.35; R.scene.environmentIntensity = 0.32; if (R.under) R.under.intensity = 0;
    L.tech.visible = shot.tech !== false;
    const C = APP.update(L, t, shot, R) || {};
    const cam = cameraAt(SHOTS, t, { t }, tb);
    placeCamera(R, cam, t, 0);
    const dist = cam.pos.distanceTo(cam.tgt); R.camera.near = clamp(dist * 0.02, 0.004, 0.25); R.camera.far = 40; R.camera.updateProjectionMatrix();
    if (shot.spotAt) { L.spot.position.set(...shot.spotAt); L.spot.intensity = shot.spot ?? 1.2; } else L.spot.intensity = 0;
    R.bloom.strength = 0.18;
    R.composer.render();
    return { S: { t }, shot, camera: R.camera, C, L };
  }
  return { init, render };
}
