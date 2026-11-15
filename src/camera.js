// Third-person camera: behind and above the agent, turned by dragging, swinging back behind the
// agent while walking, and pulled in when a building is in the way.
import * as THREE from 'three';
import { cellAt } from './world/nav.js';

export const cam = { yaw: 0, pitch: -0.05, dist: 9, height: 4.3, lastDrag: -1e9, actual: 9 };
export const PITCH = [-0.3, 0.42]; // drag up and down to look up at the domes and towers

export function makeCamera() { return new THREE.PerspectiveCamera(60, 1, 0.3, 1600); }

export function fitCamera(camera, w, h) {
  camera.aspect = w / h;
  camera.fov = w < h ? 70 : 56; // vertical field of view: portrait needs more to see the domes
  // Shift the picture up a little, so the agent stands clear of the bottom buttons.
  camera.setViewOffset(w, h, 0, h * (w < h ? 0.1 : 0.16), w, h);
  camera.updateProjectionMatrix();
}

const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

export function updateCamera(camera, a, dt, now, snap = false) {
  // While walking (and not just dragged by the player), swing slowly round behind the agent.
  if (a.walking && now - cam.lastDrag > 2.5) cam.yaw += angDiff(a.heading, cam.yaw) * Math.min(1, dt * 1.2);
  if (snap) cam.yaw = a.heading;
  const bx = -Math.sin(cam.yaw), bz = -Math.cos(cam.yaw);
  // Pull in when the camera would end up inside a building.
  let d = 1.5;
  while (d < cam.dist && cellAt(a.x + bx * (d + 0.6), a.z + bz * (d + 0.6)) !== 0) d += 0.5;
  cam.actual = snap ? d : cam.actual + (d - cam.actual) * Math.min(1, dt * (d < cam.actual ? 12 : 3));
  const k = cam.actual / cam.dist;
  camera.position.set(a.x + bx * cam.actual, 1.6 + (cam.height - 1.6) * (0.55 + 0.45 * k), a.z + bz * cam.actual);
  const L = 20; camera.lookAt(camera.position.x - bx * L, camera.position.y + Math.tan(cam.pitch) * L, camera.position.z - bz * L);
}
