// Passers-by strolling the streets and piazzas. Each picks a nearby walkable spot it can reach in a
// straight line and walks there; idle ones stand for a moment, looking around.
import * as THREE from 'three';
import { WALK } from '../world/city.js';
import { walkable, lineClear } from '../world/nav.js';
import { rnd } from '../world/rand.js';
import { makeFigure, randomLook, setPose } from './figure.js';

export function makeCrowd(scene, count) {
  const total = WALK.reduce((s, a) => s + (a.r[2] - a.r[0]) * (a.r[3] - a.r[1]), 0);
  const people = [];
  let guard = 0;
  while (people.length < count && guard++ < count * 50) {
    let u = rnd() * total, area = WALK[0];
    for (const a of WALK) { u -= (a.r[2] - a.r[0]) * (a.r[3] - a.r[1]); if (u <= 0) { area = a; break; } }
    const [x0, z0, x1, z1] = area.r, x = x0 + rnd() * (x1 - x0), z = z0 + rnd() * (z1 - z0);
    if (!walkable(x, z)) continue;
    const mesh = makeFigure(randomLook());
    mesh.position.set(x, 0, z); mesh.rotation.y = rnd() * Math.PI * 2;
    scene.add(mesh);
    people.push({ mesh, target: null, speed: 1.05 + rnd() * 0.5, wait: rnd() * 4, phase: rnd() });
  }
  return people;
}

const tmp = new THREE.Vector3();
export function updateCrowd(people, dt) {
  for (const p of people) {
    const m = p.mesh;
    if (p.wait > 0) { p.wait -= dt; setPose(m, 0.25); continue; }
    if (!p.target) {
      const a = rnd() * Math.PI * 2, d = 8 + rnd() * 30, tx = m.position.x + Math.cos(a) * d, tz = m.position.z + Math.sin(a) * d;
      const away = p.home && Math.hypot(tx - p.home[0], tz - p.home[1]) > p.range; // case suspects keep to their haunt
      if (!away && walkable(tx, tz) && lineClear(m.position.x, m.position.z, tx, tz)) p.target = [tx, tz]; else { p.wait = 0.3; continue; }
    }
    tmp.set(p.target[0] - m.position.x, 0, p.target[1] - m.position.z);
    const dist = tmp.length();
    if (dist < 0.3) { p.target = null; p.wait = rnd() < 0.4 ? 1 + rnd() * 5 : 0; continue; }
    const step = Math.min(dist, p.speed * dt);
    m.position.addScaledVector(tmp.normalize(), step);
    m.rotation.y = Math.atan2(-tmp.x, -tmp.z); // front is -z
    p.phase += step / 1.4; setPose(m, p.phase);
  }
}
