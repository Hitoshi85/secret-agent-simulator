// People, about 1.75 m tall (1 unit = 1 m). Each figure is merged into a single vertex-coloured
// mesh per walking pose, so a whole crowd stays cheap to draw on a phone. Front is -z.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rnd, pick } from '../world/rand.js';

export const SKIN = ['#e9c4a6', '#c99a78', '#a8774f', '#7a5236', '#f0d3bb'];
export const HAIR = ['#2a1d16', '#4a3020', '#7a5a3a', '#c9a66b', '#888888', '#1a1a1a', '#a0522d'];
export const CLOTH = ['#7a2e2e', '#2e4a7a', '#d8c7a0', '#4b5d3a', '#5a4a6a', '#c46a3a', '#333333', '#9a8f80', '#e8e2d4', '#1f3550', '#6b3a4a', '#b8a07a'];
export const BOTTOMS = ['#2b2f3a', '#3a3a3a', '#5a4a3a', '#c9bfa8', '#1f2a40'];

// Stride of each animation frame: a walk cycle in four poses.
export const POSES = [0.35, 0, -0.35, 0];

const tint = (geo, hex) => {
  const c = new THREE.Color(hex), n = geo.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
  for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'color'].includes(k)) geo.deleteAttribute(k);
  return geo.index ? geo.toNonIndexed() : geo;
};
const part = (geo, hex, m) => { geo.applyMatrix4(m); return tint(geo, hex); };
const M4 = () => new THREE.Matrix4();
const at = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) =>
  M4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
// Rotates a part about a joint (pivot) by rx around x, after placing it at its rest position.
const swing = (pivot, rx, rz, m) => M4().makeTranslation(...pivot).multiply(M4().makeRotationFromEuler(new THREE.Euler(rx, 0, rz))).multiply(M4().makeTranslation(-pivot[0], -pivot[1], -pivot[2])).multiply(m);

// The look of one person: colours and options, picked at random unless given.
export function randomLook(o = {}) {
  return {
    skin: o.skin || pick(SKIN), hair: o.hair || pick(HAIR), top: o.top || pick(CLOTH), bottom: o.bottom || pick(BOTTOMS),
    shoe: o.shoe || '#1d1714', skirt: o.skirt ?? rnd() < 0.35, coat: o.coat ?? rnd() < 0.2, longHair: o.longHair ?? rnd() < 0.35,
    bag: o.bag !== undefined ? o.bag : (rnd() < 0.25 ? pick(['#6b3a1e', '#1a1a1a', '#c9a66b']) : null), hat: o.hat || null, suit: !!o.suit,
    scale: o.scale || 0.92 + rnd() * 0.16,
  };
}

// One pose of a person as a single geometry.
export function figureGeometry(L, stride) {
  const parts = [];
  const legC = L.skirt ? L.skin : L.bottom;
  for (const side of [-1, 1]) {
    const hip = [side * 0.1, 0.92, 0], s = side * stride;
    parts.push(part(new THREE.CapsuleGeometry(0.075, 0.38, 2, 6), legC, swing(hip, s, 0, at(side * 0.1, 0.7, 0))));
    parts.push(part(new THREE.CapsuleGeometry(0.06, 0.38, 2, 6), legC, swing(hip, s, 0, at(side * 0.1, 0.3, 0))));
    parts.push(part(new THREE.BoxGeometry(0.1, 0.07, 0.24), L.shoe, swing(hip, s, 0, at(side * 0.1, 0.04, -0.05))));
  }
  if (L.skirt) parts.push(part(new THREE.CylinderGeometry(0.16, 0.3, 0.5, 10), L.bottom, at(0, 0.82, 0)));
  parts.push(part(new THREE.CylinderGeometry(0.17, 0.16, 0.2, 10), L.bottom, at(0, 0.98, 0)));
  parts.push(part(new THREE.CylinderGeometry(0.2, 0.16, 0.52, 10), L.top, at(0, 1.32, 0, 0, 0, 0, 1, 1, 0.7)));
  parts.push(part(new THREE.SphereGeometry(0.205, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), L.top, at(0, 1.57, 0, 0, 0, 0, 1, 0.4, 0.72)));
  if (L.coat || L.suit) parts.push(part(new THREE.CylinderGeometry(0.21, L.coat ? 0.3 : 0.22, L.coat ? 0.95 : 0.3, 10, 1, true), L.top, at(0, L.coat ? 1.08 : 1.0, 0, 0, 0, 0, 1, 1, 0.75)));
  for (const side of [-1, 1]) {
    const sh = [side * 0.25, 1.54, 0], s = -side * stride * 0.8;
    parts.push(part(new THREE.CapsuleGeometry(0.055, 0.26, 2, 6), L.top, swing(sh, s, side * 0.06, at(side * 0.25, 1.37, 0))));
    parts.push(part(new THREE.CapsuleGeometry(0.048, 0.24, 2, 6), L.top, swing(sh, s, side * 0.06, at(side * 0.25, 1.1, 0))));
    parts.push(part(new THREE.SphereGeometry(0.05, 6, 4), L.skin, swing(sh, s, side * 0.06, at(side * 0.25, 0.92, 0))));
  }
  parts.push(part(new THREE.CylinderGeometry(0.05, 0.055, 0.1, 6), L.skin, at(0, 1.64, 0)));
  parts.push(part(new THREE.SphereGeometry(0.11, 12, 8), L.skin, at(0, 1.77, 0, 0, 0, 0, 0.9, 1.08, 0.98)));
  parts.push(part(new THREE.SphereGeometry(0.118, 12, 8, 0, Math.PI * 2, 0, Math.PI * (L.longHair ? 0.75 : 0.52)), L.hair, at(0, 1.795, 0.012, 0.38)));
  for (const side of [-1, 1]) parts.push(part(new THREE.SphereGeometry(0.013, 4, 3), '#1a1410', at(side * 0.037, 1.785, -0.098)));
  parts.push(part(new THREE.ConeGeometry(0.016, 0.04, 4), L.skin, at(0, 1.76, -0.11, -Math.PI / 2)));
  if (L.bag) parts.push(part(new THREE.BoxGeometry(0.08, 0.22, 0.3), L.bag, at(0.3, 0.95, 0)));
  if (L.hat) { parts.push(part(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 12), L.hat, at(0, 1.88, 0))); parts.push(part(new THREE.CylinderGeometry(0.11, 0.12, 0.1, 12), L.hat, at(0, 1.93, 0))); }
  if (L.suit) { // shirt, tie, lapels, pocket square and sunglasses
    const fr = Math.PI;
    parts.push(part(new THREE.PlaneGeometry(0.12, 0.3), '#f4f1ea', at(0, 1.42, -0.142, 0, fr)));
    parts.push(part(new THREE.PlaneGeometry(0.04, 0.26), '#5a1f2a', at(0, 1.4, -0.144, 0, fr)));
    for (const side of [-1, 1]) parts.push(part(new THREE.PlaneGeometry(0.05, 0.24), '#1c2128', at(side * 0.065, 1.43, -0.143, 0, fr, side * 0.25)));
    parts.push(part(new THREE.PlaneGeometry(0.05, 0.015), '#f4f1ea', at(-0.1, 1.42, -0.142, 0, fr)));
    for (const side of [-1, 1]) parts.push(part(new THREE.SphereGeometry(0.026, 8, 6), '#0b0b0b', at(side * 0.038, 1.787, -0.104, 0, 0, 0, 1.1, 0.8, 0.35)));
  }
  const g = mergeGeometries(parts, false);
  g.scale(L.scale, L.scale, L.scale);
  g.computeBoundingSphere();
  return g;
}

export const PEOPLE_MATERIAL = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 });

// A figure mesh that can switch between the four walking poses.
export function makeFigure(look) {
  const frames = POSES.map((s) => figureGeometry(look, s));
  const mesh = new THREE.Mesh(frames[1], PEOPLE_MATERIAL);
  mesh.castShadow = true;
  mesh.userData.frames = frames;
  return mesh;
}
export function setPose(mesh, phase) { // phase in [0, 1): one full walk cycle
  const f = mesh.userData.frames; mesh.geometry = f[Math.floor(((phase % 1) + 1) % 1 * f.length) % f.length];
}
