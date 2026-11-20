// Chase rules with no 3D or page code: how the red car drives (steering, brake, off the road,
// crashes, air time over crests), how the off-roader drives, oncoming traffic, and the In Sight meter.
// Cars live in road coordinates: s metres along the road, d metres to the right of the centre line,
// psi their heading relative to the road, v speed (m/s), y height and vy vertical speed.
import { sampleRoad } from './land.js';

export const KMH = 3.6;
export const TOP = 39;          // about 140 km/h
const SUV_TOP = 42;             // a little faster on the straights
const G = 9.8, LOST_AFTER = 12; // seconds out of sight before he is gone
const tmp = {};

export function newCar(s, d) { return { s, d, psi: 0, v: 0, y: 0, vy: 0, air: 0, airTime: 0, shake: 0, crashes: 0 }; }

// Height: free flight under gravity, held up by the road. A crest drops away faster than the car
// falls, so it leaves the ground for a moment.
function vertical(c, road, dt) {
  const r = sampleRoad(road, c.s, tmp);
  c.y += c.vy * dt; c.vy -= G * (c.air > 0 ? 2.2 : 1) * dt; // heavier once airborne: short hops
  if (c.y <= r.y) {
    if (c.air > 0.25) { c.airTime = c.air; c.landed = true; } else c.landed = false;
    c.y = r.y; c.vy = r.slope * c.v * Math.cos(c.psi); c.air = 0;
  } else { c.air += dt; c.landed = false; }
  return r;
}

// The player's car: steer is -1 (left), 0 or 1 (right); brake is true while held.
export function drivePlayer(c, road, dt, steer, brake) {
  const r = sampleRoad(road, c.s, tmp), off = Math.abs(c.d) > 3.6, flying = c.air > 0.05;
  const top = off ? 17 : TOP;
  if (!flying) {
    if (brake) c.v = Math.max(0, c.v - 16 * dt);
    else if (c.v < top) c.v += (8.5 - 5 * c.v / top) * dt; else c.v = Math.max(top, c.v - 12 * dt);
    // nimble: quick to turn at any speed; the road bending away turns the car relative to it
    const rate = steer * 1.7 * Math.min(1, c.v / 6) / (1 + c.v / 70);
    c.psi += (rate - r.curv * c.v * Math.cos(c.psi)) * dt - c.psi * 0.4 * dt * (steer ? 0 : 1);
  } else c.psi -= r.curv * c.v * Math.cos(c.psi) * dt;
  c.psi = Math.max(-1.1, Math.min(1.1, c.psi));
  c.d += c.v * Math.sin(c.psi) * dt; c.s += c.v * Math.cos(c.psi) * dt;
  const rr = vertical(c, road, dt);
  // A crooked landing costs speed.
  if (c.landed && Math.abs(c.psi) > 0.15) { c.v *= 1 - Math.min(0.45, Math.abs(c.psi)); c.shake = 0.3; }
  // Cypress rows and field edges stop the car.
  const wall = rr.cyp ? 5.6 : 13;
  if (Math.abs(c.d) > wall) crash(c, Math.sign(c.d) * (wall - 0.2));
  c.shake = Math.max(0, c.shake - dt);
}

// Right behind him: you can't drive through him, so you bump and drop back.
export function bump(p, suv) { if (suv.s - p.s < 4.8 && suv.s > p.s && Math.abs(suv.d - p.d) < 1.9) { p.v = Math.min(p.v, suv.v * 0.85); p.s = suv.s - 4.8; p.shake = 0.25; } }

export function crash(c, d) { c.v *= 0.35; if (d !== undefined) c.d = d; c.psi *= -0.3; c.shake = 0.5; c.crashes++; }

// The off-roader keeps to the right lane, brakes for bends, and eases off or pushes on to keep the
// chase close: a close match all the way.
export function driveSUV(c, road, dt, gap, playerV) {
  let k = 0; for (let a = 0; a <= 60; a += 6) k = Math.max(k, Math.abs(sampleRoad(road, c.s + a, tmp).curv));
  let target = Math.min(SUV_TOP, Math.sqrt(8 / Math.max(k, 1e-4)));
  if (gap > 200) target *= 0.6; else if (gap > 110) target *= 0.8; else if (gap < 30) target = Math.max(target, Math.min(SUV_TOP + 4, playerV + 4));
  if (c.s > road.end + 40) target = 0;
  c.v += Math.max(-14, Math.min(7, (target - c.v) * 1.5)) * dt;
  c.d += (1.1 - c.d) * Math.min(1, dt * 2);
  c.s = Math.min(road.len - 5, c.s + c.v * dt);
  vertical(c, road, dt);
}

// Oncoming traffic in the left lane: a few cars recycled ahead of the chase.
export function moveTraffic(list, road, dt, player) {
  for (const t of list) {
    t.s -= t.v * dt; t.d = -1.4;
    if (t.s < player.s - 40) { t.s = player.s + 450 + Math.random() * 350; }
    vertical(t, road, dt);
    if (Math.abs(t.s - player.s) < 3.6 && Math.abs(t.d - player.d) < 1.9 && !t.hit) { crash(player); t.hit = 1.5; }
    if (t.hit) t.hit = Math.max(0, t.hit - dt);
  }
}

// In Sight: drains while he is hidden (over a crest, round a bend, too far), refills in view.
export function sightStep(sight, visible, dt) {
  sight.visible = visible;
  sight.value = visible ? Math.min(1, sight.value + 0.7 * dt) : Math.max(0, sight.value - dt / LOST_AFTER);
  if (!visible && sight.wasVisible) sight.losses++;
  sight.wasVisible = visible;
  return sight.value <= 0;
}
export const secondsLeft = (sight) => Math.ceil(sight.value * LOST_AFTER);

// Is a point at height y2, a metres further along, visible from height y1? The road between them
// must stay below the line of sight (the crests are what hide him).
export function clearView(road, s1, y1, s2, y2) {
  for (let k = 1; k < 10; k++) { const t = k / 10, s = s1 + (s2 - s1) * t; if (sampleRoad(road, s, tmp).y > y1 + (y2 - y1) * t - 0.4) return false; }
  return true;
}
