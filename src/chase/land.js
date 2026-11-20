// The Tuscan countryside for the car chase, one stage at a time: a gravel road winding north over
// rolling hills (Val d'Orcia, then the Siena road, then the Chianti hills), patchwork fields,
// cypress avenues, farms, and a hill town or Florence at the ends. Coordinates in metres, x east,
// z south; the road runs towards -z. Everything static is merged or instanced to keep draw calls low.
import * as THREE from 'three';
import { mergeByMaterial } from '../world/merge.js';
import { rnd, reseed } from '../world/rand.js';

export const STEP = 2; // metres between road samples
export const STAGES = [
  { name: "Val d'Orcia", place: 'Strada dei cipressi', seed: 11, amp: 1, town: 'pienza', fields: ['#d8b860', '#c9a94f', '#9fae5a', '#86a04c', '#b7b26b', '#b98d5c', '#e1cd8c', '#a5a35f'] },
  { name: 'Siena road', place: 'Strada per Siena', seed: 23, amp: 0.8, town: null, fields: ['#c9a94f', '#a9b562', '#8fa456', '#d8b860', '#b98d5c', '#9a9a5c', '#cdbf7a'] },
  { name: 'Chianti hills', place: 'Colline del Chianti', seed: 37, amp: 1.25, town: 'florence', vines: true, fields: ['#7f9a48', '#93a854', '#6f8c42', '#a7a35f', '#b98d5c', '#8a9a50'] },
];
const LEN = 2100; // road length per stage: about a minute at chase speed

function baseH(st, x, z) {
  const a = st.amp;
  return a * (16 * Math.sin(x * 0.0075 + st.seed) * Math.cos(z * 0.0062) + 9 * Math.sin(x * 0.016 + z * 0.011) + 5 * Math.sin(z * 0.021 - x * 0.006 + st.seed)) + 3 * Math.sin(x * 0.04 + 2) * Math.sin(z * 0.035);
}

// The road: centre line samples with height, heading, curvature, and whether cypresses line it.
function makeRoad(st) {
  reseed(st.seed);
  const pts = [new THREE.Vector3(0, 0, 0)];
  let x = 0;
  for (let k = 1; k <= 15; k++) { if (!(st.town === 'florence' && k >= 13)) x = x * 0.4 + (rnd() - 0.5) * 140; pts.push(new THREE.Vector3(x, 0, -k * 150)); } // Florence: a straight run at the end, the city ahead
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const n = Math.floor(Math.min(curve.getLength(), LEN + 200) / STEP);
  const P = curve.getSpacedPoints(Math.round(curve.getLength() / STEP)).slice(0, n + 1);
  let h = P.map((p) => baseH(st, p.x, p.z));
  for (let k = 0; k < 40; k++) h = h.map((v, i) => (h[Math.max(0, i - 1)] + v + h[Math.min(h.length - 1, i + 1)]) / 3);
  // Short sharp crests where both cars leave the ground.
  const crests = [];
  for (let s = 380; s < LEN - 150; s += 520 + rnd() * 160) crests.push(s);
  const road = { n: P.length, x: new Float32Array(P.length), z: new Float32Array(P.length), y: new Float32Array(P.length), dir: new Float32Array(P.length), curv: new Float32Array(P.length), cyp: new Uint8Array(P.length), crests, len: (P.length - 1) * STEP, end: LEN };
  P.forEach((p, i) => {
    let y = h[i];
    for (const c of crests) { const u = (i * STEP - c) / 38; if (Math.abs(u) < 1) y += 2.8 * Math.cos(u * Math.PI / 2) ** 2; }
    road.x[i] = p.x; road.z[i] = p.z; road.y[i] = y;
  });
  for (let i = 0; i < road.n; i++) { const a = Math.max(0, i - 1), b = Math.min(road.n - 1, i + 1); road.dir[i] = Math.atan2(road.x[b] - road.x[a], road.z[b] - road.z[a]); }
  for (let i = 0; i < road.n; i++) { const a = Math.max(0, i - 4), b = Math.min(road.n - 1, i + 4); let d = road.dir[b] - road.dir[a]; d = Math.atan2(Math.sin(d), Math.cos(d)); road.curv[i] = d / ((b - a) * STEP); }
  // Cypress avenues: the first stretch, then a few more
  const runs = [[30, 420]]; for (let s = 700; s < LEN; s += 500 + rnd() * 300) runs.push([s, s + 160 + rnd() * 160]);
  for (const [a, b] of runs) if (!(st.town === 'florence' && b > LEN - 400)) for (let i = Math.floor(a / STEP); i < Math.min(road.n, b / STEP); i++) road.cyp[i] = 1;
  return road;
}

// Where along the road (index, lateral offset) a point lies: a local search from a hint index.
export function locate(road, x, z, hint = 0) {
  let best = 1e18, bi = hint;
  const lo = Math.max(0, hint - 60), hi = Math.min(road.n - 1, hint + 60);
  for (let i = lo; i <= hi; i++) { const d = (road.x[i] - x) ** 2 + (road.z[i] - z) ** 2; if (d < best) { best = d; bi = i; } }
  return bi;
}
export function sampleRoad(road, s, out) {
  const f = Math.max(0, Math.min(road.n - 1.001, s / STEP)), i = Math.floor(f), t = f - i;
  out.x = road.x[i] + (road.x[i + 1] - road.x[i]) * t; out.z = road.z[i] + (road.z[i + 1] - road.z[i]) * t; out.y = road.y[i] + (road.y[i + 1] - road.y[i]) * t;
  out.dir = road.dir[i]; out.curv = road.curv[i]; out.cyp = road.cyp[i]; out.slope = (road.y[i + 1] - road.y[i]) / STEP;
  return out;
}

const OFFS = [-260, -150, -90, -55, -32, -18, -10, -6.5, -4.2, -3.2, 0, 3.2, 4.2, 6.5, 10, 18, 32, 55, 90, 150, 260];
function fieldCol(st, x, z) {
  const a = 0.5, u = x * Math.cos(a) - z * Math.sin(a), v = x * Math.sin(a) + z * Math.cos(a);
  const cu = Math.floor(u / 90 + Math.sin(v * 0.01) * 0.6), cv = Math.floor(v / 70 + Math.sin(u * 0.012) * 0.5);
  return st.fields[Math.floor((Math.abs(Math.sin(cu * 127.1 + cv * 311.7 + st.seed) * 43758.5) % 1) * st.fields.length)];
}

// Ground: a strip that follows the road (dense near it, so the road always sits on it), the gravel
// road itself, and a coarse grid for the far hills, all flat shaded with per-face field colours.
function ground(st, road) {
  const pos = [], col = [], c = new THREE.Color(), J = 6 / STEP;
  const ny = (i, d) => { // height of the strip at road index i, lateral offset d
    const x = road.x[i] + Math.cos(road.dir[i]) * d, z = road.z[i] - Math.sin(road.dir[i]) * d;
    const w = THREE.MathUtils.smoothstep(Math.abs(d), 4.5, 60);
    return [x, THREE.MathUtils.lerp(road.y[i] - (Math.abs(d) < 3.3 ? 0 : 0.25), baseH(st, x, z), w), z];
  };
  const tri = (a, b, cc, colr) => { pos.push(...a, ...b, ...cc); c.set(colr); for (let k = 0; k < 3; k++) col.push(c.r, c.g, c.b); };
  for (let i = 0; i + J < road.n; i += J) {
    for (let k = 0; k < OFFS.length - 1; k++) {
      const a = ny(i, OFFS[k]), b = ny(i, OFFS[k + 1]), cc = ny(i + J, OFFS[k]), d = ny(i + J, OFFS[k + 1]);
      const mid = (OFFS[k] + OFFS[k + 1]) / 2, onRoad = Math.abs(mid) < 3.2, edge = Math.abs(mid) < 4.2;
      const colr = onRoad ? (mid < 0 ? '#bfa77c' : '#c4ad82') : edge ? '#a8946d' : fieldCol(st, a[0], a[2]);
      const j = onRoad ? 1 : 0.95 + rnd() * 0.08;
      c.set(colr); c.multiplyScalar(j); const hex = '#' + c.getHexString();
      tri(a, cc, b, hex); tri(b, cc, d, hex);
    }
  }
  // far hills: a coarse grid, sunk under the strip near the road
  const xs = [], zs = [];
  for (let x = -1400; x <= 1400; x += 40) xs.push(x);
  for (let z = 600; z >= -LEN - 1600; z -= 40) zs.push(z);
  const nearest = (x, z) => { let b = 1e18; for (let i = 0; i < road.n; i += 10) { const d = (road.x[i] - x) ** 2 + (road.z[i] - z) ** 2; if (d < b) b = d; } return Math.sqrt(b); };
  const gh = zs.map((z) => xs.map((x) => { const d = nearest(x, z); return baseH(st, x, z) + Math.max(0, Math.hypot(x, z + LEN / 2) - 1300) * 0.12 - (d < 280 ? 6 : 0); }));
  for (let r = 0; r < zs.length - 1; r++) for (let q = 0; q < xs.length - 1; q++) {
    const A = [xs[q], gh[r][q], zs[r]], B = [xs[q + 1], gh[r][q + 1], zs[r]], C = [xs[q], gh[r + 1][q], zs[r + 1]], D = [xs[q + 1], gh[r + 1][q + 1], zs[r + 1]];
    c.set(fieldCol(st, A[0], A[2])); c.multiplyScalar(0.95 + rnd() * 0.08); const hex = '#' + c.getHexString();
    tri(A, B, C, hex); tri(B, D, C, hex);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true })); m.receiveShadow = true;
  return m;
}

// Facades for farms and towns: travertine and ochre walls with dark windows.
function facadeTex(base, rows, cols, stone) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(${rnd() > 0.5 ? '255,255,255' : '80,55,30'},${rnd() * 0.09})`; g.fillRect(rnd() * 128, rnd() * 128, 1 + rnd() * 5, 1 + rnd() * 3); }
  if (stone) { g.strokeStyle = 'rgba(90,70,45,.25)'; for (let y = 0; y < 128; y += 5) { g.beginPath(); g.moveTo(0, y); g.lineTo(128, y); g.stroke(); } }
  for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) { const cw = 128 / cols, rh = 128 / rows; g.fillStyle = '#2b241e'; g.fillRect(k * cw + cw * 0.32, r * rh + rh * 0.25, cw * 0.36, rh * 0.5); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function buildings(st, road, H) {
  const root = new THREE.Group();
  const roof = new THREE.MeshLambertMaterial({ color: '#b5583a', flatShading: true });
  const roofGeo = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1); roofGeo.rotateY(Math.PI / 4);
  const walls = ['#e4d6b8', '#d9c7a1', '#cdb48a', '#c9a77c'].map((b, i) => new THREE.MeshLambertMaterial({ map: facadeTex(b, 3, 3, i % 2 === 0) }));
  const house = (x, z, w, d, h, rot, y = H(x, z)) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), walls[Math.floor(rnd() * walls.length)]); b.position.set(x, y + h / 2 - 2, z); b.rotation.y = rot;
    const r = new THREE.Mesh(roofGeo, roof); r.rotation.y = rot; r.scale.set(w * 1.05, Math.min(w, d) * 0.32, d * 1.05); r.position.set(x, y + h - 2 + Math.min(w, d) * 0.16, z);
    root.add(b, r);
  };
  // farms along the way, set back from the road
  for (let s = 150; s < road.len - 100; s += 260 + rnd() * 200) {
    const i = Math.floor(s / STEP), side = rnd() < 0.5 ? -1 : 1, off = side * (70 + rnd() * 160);
    const x = road.x[i] + Math.cos(road.dir[i]) * off, z = road.z[i] - Math.sin(road.dir[i]) * off, rot = rnd() * 3;
    house(x, z, 16, 10, 8, rot); house(x + 9, z + 3, 6, 6, 11, rot); house(x - 12, z - 5, 9, 7, 5, rot);
  }
  if (st.town === 'pienza') { // a walled hill town on a ridge beside the start
    const cx = 230, cz = -40, top = H(cx, cz) + 26;
    const wall = new THREE.MeshLambertMaterial({ map: facadeTex('#d6c39c', 1, 1, true) });
    for (let k = -8; k <= 8; k++) { const w = new THREE.Mesh(new THREE.BoxGeometry(13, 22, 3), wall); w.position.set(cx - 50, top - 6, cz + k * 12.5); w.rotation.y = Math.PI / 2; root.add(w); }
    for (let k = 0; k < 60; k++) house(cx - 40 + rnd() * 90, cz - 100 + rnd() * 200, 8 + rnd() * 6, 8 + rnd() * 6, 9 + rnd() * 8, rnd() * 0.2, top - 8);
    const tower = new THREE.Mesh(new THREE.BoxGeometry(7, 40, 7), walls[0]); tower.position.set(cx - 20, top + 12, cz + 10); root.add(tower);
    const spire = new THREE.Mesh(new THREE.ConeGeometry(4.9, 9, 8), roof); spire.position.set(cx - 20, top + 36.5, cz + 10); root.add(spire);
  }
  if (st.town === 'florence') { // the city in the valley ahead at the end of the road
    const e = road.n - 1, cx = road.x[e] + Math.sin(road.dir[e]) * 300, cz = road.z[e] + Math.cos(road.dir[e]) * 300, base = Math.max(road.y[e], baseH(st, cx, cz)) - 2;
    for (let k = 0; k < 260; k++) { const x = cx + (rnd() - 0.5) * 560, z = cz - 200 + rnd() * 330; if (Math.hypot(x - cx, z - cz) < 30 || Math.hypot(x - road.x[e], z - road.z[e]) < 150) continue; house(x, z, 10 + rnd() * 8, 10 + rnd() * 8, 12 + rnd() * 6, rnd() * 0.15, base); }
    const brick = new THREE.MeshLambertMaterial({ color: '#c0603e', flatShading: true }), marble = new THREE.MeshLambertMaterial({ color: '#efe9dc' });
    const add = (geo, mat, x, y, z, sy = 1) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.y = sy; root.add(m); };
    add(new THREE.BoxGeometry(70, 26, 26), marble, cx + 45, base + 13, cz);
    add(new THREE.CylinderGeometry(20, 20, 18, 8), marble, cx, base + 35, cz);
    add(new THREE.SphereGeometry(20, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2), brick, cx, base + 44, cz, 1.45);
    add(new THREE.CylinderGeometry(2.6, 3, 7, 8), marble, cx, base + 76, cz); add(new THREE.ConeGeometry(2.6, 5, 8), marble, cx, base + 82, cz);
    add(new THREE.BoxGeometry(8, 70, 8), walls[0], cx + 34, base + 35, cz + 22);
    add(new THREE.BoxGeometry(6, 34, 6), walls[3], cx - 30, base + 47, cz + 40); add(new THREE.ConeGeometry(3, 6, 4), brick, cx - 30, base + 67, cz + 40);
    road.city = { x: cx, z: cz };
  }
  return mergeByMaterial(root);
}

// Cypresses (instanced): avenues on both sides where road.cyp is set, groups on the hills.
function trees(st, road, H) {
  const pts = []; for (let i = 0; i <= 8; i++) { const y = i / 8; pts.push(new THREE.Vector2(Math.max(0.02, Math.sin(Math.PI * y ** 0.75) * (1 - y * 0.35)) * 0.55, y)); }
  const cyGeo = new THREE.LatheGeometry(pts, 6), round = new THREE.IcosahedronGeometry(1, 0);
  const cyp = [], olive = [];
  for (let i = 4; i < road.n; i += 3) if (road.cyp[i]) for (const sd of [-1, 1]) { const off = sd * 7.2; cyp.push([road.x[i] + Math.cos(road.dir[i]) * off, road.z[i] - Math.sin(road.dir[i]) * off, 8 + rnd() * 3.5]); }
  for (let k = 0; k < 120; k++) {
    const i = Math.floor(rnd() * road.n), off = (rnd() < 0.5 ? -1 : 1) * (25 + rnd() * 260);
    const x = road.x[i] + Math.cos(road.dir[i]) * off, z = road.z[i] - Math.sin(road.dir[i]) * off;
    if (rnd() < 0.45) for (let j = 0; j < 1 + rnd() * 4; j++) cyp.push([x + j * 5, z + rnd() * 3, 8 + rnd() * 4]); else olive.push([x, z, 2.5 + rnd() * 3]);
  }
  if (st.vines) for (let k = 0; k < 40; k++) { const i = Math.floor(rnd() * road.n), off = (rnd() < 0.5 ? -1 : 1) * (20 + rnd() * 90); for (let a = 0; a < 6; a++) for (let b = 0; b < 4; b++) olive.push([road.x[i] + Math.cos(road.dir[i]) * off + a * 4, road.z[i] - Math.sin(road.dir[i]) * off + b * 4, 1.2]); }
  const o = new THREE.Object3D(), out = [];
  const inst = (geo, color, list, fn) => {
    const m = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color, flatShading: true }), list.length);
    list.forEach((a, i) => { fn(a); o.updateMatrix(); m.setMatrixAt(i, o.matrix); }); m.castShadow = true; m.receiveShadow = true; out.push(m);
  };
  inst(cyGeo, '#3d5c33', cyp, ([x, z, h]) => { o.position.set(x, H(x, z) - 0.3, z); o.scale.set(1.7 + rnd() * 0.5, h, 1.7 + rnd() * 0.5); o.rotation.set(0, rnd() * 6, 0); });
  inst(round, '#7d8f58', olive, ([x, z, s]) => { o.position.set(x, H(x, z) + s * 0.7, z); o.scale.set(s, s * 0.65, s); o.rotation.set(0, 0, 0); });
  return out;
}

// Builds one stage: returns the group to add to the scene and the road the cars drive on.
export function buildStage(k) {
  const st = STAGES[k], road = makeRoad(st), group = new THREE.Group();
  // ground height anywhere: the road near it, the hills beyond (used to place trees and buildings)
  let hint = 0;
  const H = (x, z) => {
    hint = locate(road, x, z, hint);
    if ((road.x[hint] - x) ** 2 + (road.z[hint] - z) ** 2 > 3600) { // more than 60 m from where we looked: search the whole road coarsely, then refine
      let b = 1e18; for (let i = 0; i < road.n; i += 20) { const d = (road.x[i] - x) ** 2 + (road.z[i] - z) ** 2; if (d < b) { b = d; hint = i; } }
      hint = locate(road, x, z, hint);
    }
    const i = hint, d = Math.hypot(road.x[i] - x, road.z[i] - z);
    return THREE.MathUtils.lerp(road.y[i], baseH(st, x, z), THREE.MathUtils.smoothstep(d, 4.5, 60));
  };
  road.H = H;
  group.add(ground(st, road), buildings(st, road, H), ...trees(st, road, H));
  return { group, road, stage: st };
}
