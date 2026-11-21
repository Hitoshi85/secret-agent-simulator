// People, about 1.75 m tall (1 unit = 1 m). Each figure is merged into a single vertex-coloured
// mesh per walking pose, so a whole crowd stays cheap to draw on a phone. Front is -z. Limbs hang
// from joints inside the body (shoulders, elbows, hips, knees), and the face is painted (portrait.js).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rnd, pick } from '../world/rand.js';
import { SKIN, FACES, faceTile, portraitSVG } from './portrait.js';

export { SKIN };
export const HAIR = ['#2a1d16', '#4a3020', '#7a5a3a', '#c9a66b', '#888888', '#1a1a1a', '#a0522d'];
export const CLOTH = ['#7a2e2e', '#2e4a7a', '#d8c7a0', '#4b5d3a', '#5a4a6a', '#c46a3a', '#333333', '#9a8f80', '#e8e2d4', '#1f3550', '#6b3a4a', '#b8a07a'];
export const BOTTOMS = ['#2b2f3a', '#3a3a3a', '#5a4a3a', '#c9bfa8', '#1f2a40'];

// Stride of each animation frame: a walk cycle in four poses.
export const POSES = [0.35, 0, -0.35, 0];

const tint = (geo, hex) => {
  const c = new THREE.Color(hex), n = geo.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
  for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'color', 'uv'].includes(k)) geo.deleteAttribute(k);
  if (!geo.userData.face) { // everything but the face samples the atlas's plain white tile, so only the vertex colour shows
    const uv = new Float32Array(n * 2); for (let i = 0; i < n; i++) { uv[i * 2] = 0.875; uv[i * 2 + 1] = 0.125; }
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  }
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
  // a tapered limb segment from y0 (radius r0) down to y1 (radius r1), centred on x
  const seg = (x, y0, y1, r0, r1, z = 0) => { const g = new THREE.CylinderGeometry(r0, r1, y0 - y1, 8); return [g, at(x, (y0 + y1) / 2, z)]; };
  const ball = (x, y, r, z = 0, sy = 1) => [new THREE.SphereGeometry(r, 8, 6), at(x, y, z, 0, 0, 0, 1, sy, 1)];
  for (const side of [-1, 1]) {
    const x = side * 0.095, hip = [x, 0.92, 0], s = side * stride;
    const knee = (q) => { const [g, m] = q; return part(g, legC, swing(hip, s, 0, m)); };
    parts.push(knee(seg(x, 0.98, 0.5, 0.088, 0.066)), knee(ball(x, 0.5, 0.066)), knee(seg(x, 0.5, 0.07, 0.064, 0.046)));
    parts.push(part(new THREE.BoxGeometry(0.1, 0.075, 0.25), L.shoe, swing(hip, s, 0, at(x, 0.04, -0.05))));
  }
  if (L.skirt) parts.push(part(new THREE.CylinderGeometry(0.17, 0.3, 0.52, 12), L.bottom, at(0, 0.8, 0)));
  // pelvis wraps the tops of the legs, so a swinging leg never shows a gap
  parts.push(part(new THREE.CylinderGeometry(0.175, 0.19, 0.2, 12), L.bottom, at(0, 0.98, 0, 0, 0, 0, 1, 1, 0.78)));
  // torso: one smooth profile from waist to shoulders and the base of the neck
  const prof = [[0.001, 1.04], [0.165, 1.04], [0.175, 1.15], [0.2, 1.32], [0.215, 1.45], [0.2, 1.53], [0.13, 1.6], [0.055, 1.63], [0.001, 1.635]].map(([r, y]) => new THREE.Vector2(r, y));
  parts.push(part(new THREE.LatheGeometry(prof, 14), L.top, at(0, 0, 0, 0, 0, 0, 1, 1, 0.72)));
  if (L.coat || L.suit) parts.push(part(new THREE.CylinderGeometry(0.218, L.coat ? 0.3 : 0.225, L.coat ? 0.9 : 0.3, 12, 1, true), L.top, at(0, L.coat ? 1.06 : 1.0, 0, 0, 0, 0, 1, 1, 0.76)));
  for (const side of [-1, 1]) {
    const x = side * 0.212, sh = [x, 1.47, 0], s = -side * stride * 0.8, rz = side * 0.07;
    const arm = ([g, m], c) => part(g, c, swing(sh, s, rz, m));
    parts.push(arm(ball(x, 1.47, 0.064), L.top)); // shoulder joint, rounds into the torso
    parts.push(arm(seg(x, 1.48, 1.2, 0.062, 0.052), L.top), arm(ball(x, 1.2, 0.053), L.top), arm(seg(x, 1.2, 0.96, 0.052, 0.042), L.top));
    parts.push(arm(seg(x, 0.97, 0.93, 0.036, 0.04), L.skin), arm(ball(x, 0.89, 0.045, -0.005, 1.45), L.skin)); // wrist and hand
  }
  parts.push(part(new THREE.CylinderGeometry(0.05, 0.058, 0.16, 8), L.skin, at(0, 1.66, 0)));
  parts.push(part(new THREE.SphereGeometry(0.11, 12, 8), L.skin, at(0, 1.77, 0, 0, 0, 0, 0.9, 1.08, 0.98)));
  parts.push(part(new THREE.SphereGeometry(0.118, 12, 8, 0, Math.PI * 2, 0, Math.PI * (L.longHair ? 0.75 : 0.52)), L.hair, at(0, 1.795, 0.012, 0.38)));
  { // the painted face: a patch over the front of the head showing this look's tile of the face atlas
    const tile = faceTile(L), tx = tile % 4, ty = Math.floor(tile / 4);
    const g = new THREE.SphereGeometry(0.1112, 14, 10, Math.PI * 1.5 - 1.05, 2.1, Math.PI * 0.25, Math.PI * 0.6), uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (tx + 0.01 + uv.getX(i) * 0.98) / 4, 1 - (ty + 0.01 + (1 - uv.getY(i)) * 0.98) / 4);
    g.userData.face = true;
    parts.push(part(g, '#ffffff', at(0, 1.77, 0, 0, 0, 0, 0.9, 1.08, 0.98)));
  }
  if (L.bag) parts.push(part(new THREE.BoxGeometry(0.08, 0.22, 0.3), L.bag, at(0.3, 0.95, 0)));
  if (L.hat) { parts.push(part(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 12), L.hat, at(0, 1.88, 0))); parts.push(part(new THREE.CylinderGeometry(0.11, 0.12, 0.1, 12), L.hat, at(0, 1.93, 0))); }
  if (L.suit) { // shirt, tie, lapels, pocket square and sunglasses
    const fr = Math.PI;
    parts.push(part(new THREE.PlaneGeometry(0.12, 0.3), '#f4f1ea', at(0, 1.42, -0.158, 0, fr)));
    parts.push(part(new THREE.PlaneGeometry(0.04, 0.26), '#5a1f2a', at(0, 1.4, -0.16, 0, fr)));
    for (const side of [-1, 1]) parts.push(part(new THREE.PlaneGeometry(0.05, 0.24), '#1c2128', at(side * 0.065, 1.43, -0.159, 0, fr, side * 0.25)));
    parts.push(part(new THREE.PlaneGeometry(0.05, 0.015), '#f4f1ea', at(-0.1, 1.42, -0.158, 0, fr)));
    for (const side of [-1, 1]) parts.push(part(new THREE.SphereGeometry(0.026, 8, 6), '#0b0b0b', at(side * 0.038, 1.772, -0.106, 0, 0, 0, 1.1, 0.8, 0.35)));
  }
  const g = mergeGeometries(parts, false);
  g.scale(L.scale, L.scale, L.scale);
  g.computeBoundingSphere();
  return g;
}

// The face atlas: 4 x 4 tiles of 256 px, one painted face per tile (see FACES), the last tile white.
// Each tile starts as plain skin and gets its face once the portraits have been painted.
export const FACE_ATLAS = { ready: false, tiles: FACES.length };
function faceAtlas() {
  if (typeof document === 'undefined') return null;
  const cv = document.createElement('canvas'); cv.width = cv.height = 1024;
  const x = cv.getContext('2d'), T = 256, xy = (i) => [(i % 4) * T, Math.floor(i / 4) * T];
  x.fillStyle = '#fff'; x.fillRect(0, 0, 1024, 1024);
  FACES.forEach((f, i) => { x.fillStyle = f.skin; x.fillRect(...xy(i), T, T); });
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  Promise.all(FACES.map((f, i) => {
    const img = new Image();
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(portraitSVG(f, { faceOnly: true, vb: '78 92 144 144', size: T }))}`;
    return img.decode().then(() => x.drawImage(img, ...xy(i), T, T));
  })).then(() => { tex.needsUpdate = true; FACE_ATLAS.ready = true; }, () => { tex.needsUpdate = true; });
  return tex;
}
export const PEOPLE_MATERIAL = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75, map: faceAtlas() });

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
