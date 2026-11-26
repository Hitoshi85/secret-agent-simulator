// The player's agent: walks along a found path after a tap, or directly with the keys.
import * as THREE from 'three';
import { findPath, walkable } from './world/nav.js';
import { makeFigure, randomLook, setPose } from './people/figure.js';

export const WALK_SPEED = 4.2; // a brisk game walk, m/s
// Running (double tap or Shift): four times the walk since 2026-11-26 (Hitoshi: "twice as fast"; it was
// twice the walk). ?variant=run1.5 / run2 / run2.5 try 1.5, 2 or 2.5 times the old run (3, 4 or 5x the walk).
export const RUN_FACTOR = 4;
export const RUN_VARIANTS = { 'run1.5': 3, run2: 4, 'run2.5': 5 };

// Placeholder look until the player designs their own agent: charcoal suit, tie, sunglasses.
export const AGENT_LOOK = randomLook({ top: '#2a3038', bottom: '#2a3038', skirt: false, coat: false, hair: '#1f1712', longHair: false, bag: null, skin: '#d2a582', scale: 1.04, suit: true });

export function makeAgent(scene, [x, z], [fx, fz]) {
  const mesh = makeFigure(AGENT_LOOK);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.52, 40), new THREE.MeshBasicMaterial({ color: '#7fc8ff', transparent: true, opacity: 0.85, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03; ring.renderOrder = 1;
  const group = new THREE.Group(); group.add(mesh, ring); scene.add(group);
  const a = { group, mesh, x, z, heading: Math.atan2(fx, fz), path: null, phase: 0, walking: false, walked: 0, running: false, runFactor: RUN_FACTOR };
  place(a);
  return a;
}

function place(a) {
  a.group.position.set(a.x, 0, a.z);
  a.mesh.rotation.y = Math.atan2(-Math.sin(a.heading), -Math.cos(a.heading));
}

// heading: the direction the agent faces, as an angle where (sin, cos) = (x, z).
export function walkTo(a, x, z, run = false) {
  const path = findPath(a.x, a.z, x, z);
  a.path = path && path.length ? path : null;
  a.running = !!(a.path && run);
  return !!a.path;
}
export function teleport(a, [x, z], [fx, fz]) { a.x = x; a.z = z; a.heading = Math.atan2(fx, fz); a.path = null; place(a); }

// dir: optional [dx, dz] keyboard direction in world space (overrides a path); run: Shift held.
export function updateAgent(a, dt, dir, run = false) {
  let moved = 0;
  if (dir && (dir[0] || dir[1])) a.running = run;
  const speed = WALK_SPEED * (a.running ? a.runFactor : 1);
  if (dir && (dir[0] || dir[1])) {
    a.path = null;
    const l = Math.hypot(dir[0], dir[1]), sx = dir[0] / l * speed * dt, sz = dir[1] / l * speed * dt;
    // Slide along walls: try the full step, then each axis.
    for (const [nx, nz] of [[a.x + sx, a.z + sz], [a.x + sx, a.z], [a.x, a.z + sz]]) if (walkable(nx, nz)) { moved = Math.hypot(nx - a.x, nz - a.z); a.x = nx; a.z = nz; break; }
    a.heading = Math.atan2(dir[0], dir[1]);
  } else if (a.path) {
    let budget = speed * dt;
    while (budget > 0 && a.path.length) {
      const [tx, tz] = a.path[0], dx = tx - a.x, dz = tz - a.z, d = Math.hypot(dx, dz);
      if (d < 1e-3) { a.path.shift(); continue; }
      const s = Math.min(d, budget);
      a.x += dx / d * s; a.z += dz / d * s; budget -= s; moved += s;
      a.heading = Math.atan2(dx, dz);
      if (s >= d) a.path.shift();
    }
    if (!a.path.length) a.path = null;
  }
  a.walking = moved > 0;
  if (!a.walking) a.running = false;
  a.walked += moved;
  a.phase += moved / (a.running ? 1.3 * a.runFactor : 1.6); // longer strides when running, the same cadence at any run speed
  setPose(a.mesh, a.walking ? a.phase : 0.25);
  place(a);
}
