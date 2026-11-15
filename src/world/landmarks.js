// The landmarks of the slice, modelled by hand in a simple, original low-poly style:
// the Duomo with Brunelleschi's dome, Giotto's campanile, the Baptistery, Palazzo Vecchio and its
// tower, the Loggia, the Neptune fountain, the Arno and Ponte Vecchio, and the Oltrarno hills.
import * as THREE from 'three';
import { LANDMARKS, RIVER } from './city.js';
import { marbleTex, duomoFrontTex, stoneTex, facadeTex, FACADES } from './textures.js';
import { rnd } from './rand.js';
import { mergeByMaterial } from './merge.js';

const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.85, ...o });
const terracotta = std({ color: '#b5583a', flatShading: true });
const white = std({ color: '#f4efe4', roughness: 0.7 });
const dark = std({ color: '#2f2620' });
const tex = (t, rx, ry) => { const c = t.clone(); c.repeat.set(rx, ry); c.needsUpdate = true; return c; };

function mesh(geo, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); return m; }

// Built facing +z in its own frame (facade at z = 117) and turned so the facade faces west.
function duomo() {
  const g = new THREE.Group();
  const marbleT = marbleTex(4, 6);
  const marble = std({ map: tex(marbleT, 5, 3) });
  const marbleS = std({ map: tex(marbleT, 2, 1) });
  g.add(mesh(new THREE.BoxGeometry(40, 34, 120), marble, 0, 17, 55));
  g.add(mesh(new THREE.BoxGeometry(42, 2, 122), terracotta, 0, 35, 55));
  for (const x of [-26, 26]) { g.add(mesh(new THREE.BoxGeometry(12, 24, 120), marble, x, 12, 55)); g.add(mesh(new THREE.BoxGeometry(13, 1.5, 121), terracotta, x, 24.5, 55)); }
  const fm = std({ map: duomoFrontTex() });
  g.add(mesh(new THREE.BoxGeometry(66, 46, 4), [marbleS, marbleS, marbleS, marbleS, fm, marbleS], 0, 23, 117));
  const tri = new THREE.Shape(); tri.moveTo(-22, 0); tri.lineTo(22, 0); tri.lineTo(0, 13); tri.lineTo(-22, 0);
  g.add(mesh(new THREE.ExtrudeGeometry(tri, { depth: 3, bevelEnabled: false }), white, 0, 46, 116));
  const pil = std({ map: tex(marbleTex(2, 1), 1, 6) });
  for (const x of [-33, -11, 11, 33]) { g.add(mesh(new THREE.ConeGeometry(1.4, 8, 6), white, x, 50, 118)); g.add(mesh(new THREE.BoxGeometry(2.4, 46, 2.4), pil, x, 23, 119)); }
  for (const [x, z] of [[-38, -2], [38, -2], [0, -36]]) {
    g.add(mesh(new THREE.CylinderGeometry(15, 15, 26, 8), marble, x, 13, z));
    const d = mesh(new THREE.SphereGeometry(15, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), terracotta, x, 26, z); d.scale.y = 0.45; g.add(d);
  }
  g.add(mesh(new THREE.CylinderGeometry(27, 27, 16, 8), std({ map: tex(marbleTex(2, 8), 4, 1) }), 0, 42, -2));
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2 + Math.PI / 8, o = mesh(new THREE.CircleGeometry(2.6, 16), dark, Math.sin(a) * 25.4, 43, Math.cos(a) * 25.4 - 2);
    o.rotation.y = a; g.add(o);
  }
  // The dome: a pointed octagonal shell with eight white ribs and the lantern on top.
  const pts = [];
  for (let i = 0; i <= 20; i++) { const t = i / 20, r = 27 * Math.cos(t * Math.PI / 2 * 0.95) ** 0.75; pts.push(new THREE.Vector2(Math.max(r, 3.2), 50 + t * 40)); }
  const dome = mesh(new THREE.LatheGeometry(pts, 8), std({ color: '#b8573a', flatShading: true }), 0, 0, -2); dome.rotation.y = Math.PI / 8; g.add(dome);
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2;
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(Math.sin(a) * (p.x + 0.4), p.y, Math.cos(a) * (p.x + 0.4) - 2)));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.9, 4), white));
  }
  g.add(mesh(new THREE.CylinderGeometry(3.4, 3.8, 9, 8), white, 0, 94, -2));
  g.add(mesh(new THREE.ConeGeometry(3.4, 8, 8), white, 0, 102, -2));
  g.add(mesh(new THREE.SphereGeometry(1.2, 8, 6), std({ color: '#d4a843', metalness: 0.8, roughness: 0.3 }), 0, 107, -2));
  g.rotation.y = -Math.PI / 2; // facade (+z) now faces west (-x)
  g.position.set(LANDMARKS.duomo.at[0] - 2, 0, LANDMARKS.duomo.at[1]);
  return g;
}

function campanile() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(14, 82, 14), std({ map: tex(marbleTex(5, 2), 1, 4) }), 0, 41, 0));
  g.add(mesh(new THREE.BoxGeometry(16.5, 2, 16.5), white, 0, 83, 0));
  for (let k = 0; k < 3; k++) for (const [x, z] of [[0, 7.05], [7.05, 0], [0, -7.05], [-7.05, 0]]) {
    const w = mesh(new THREE.PlaneGeometry(k === 2 ? 5 : 3.4, k === 2 ? 12 : 8), dark, x, 46 + k * 13, z); w.rotation.y = Math.atan2(x, z); g.add(w);
  }
  g.position.set(...[LANDMARKS.campanile.at[0], 0, LANDMARKS.campanile.at[1]]);
  return g;
}

function baptistery() {
  const g = new THREE.Group(), bm = std({ map: tex(marbleTex(3, 3), 3, 2) });
  const a = mesh(new THREE.CylinderGeometry(17, 17, 26, 8), bm, 0, 13, 0); a.rotation.y = Math.PI / 8; g.add(a);
  const b = mesh(new THREE.CylinderGeometry(15, 17, 8, 8), bm, 0, 30, 0); b.rotation.y = Math.PI / 8; g.add(b);
  const c = mesh(new THREE.ConeGeometry(16, 9, 8), std({ color: '#efe9dc', flatShading: true }), 0, 38.5, 0); c.rotation.y = Math.PI / 8; g.add(c);
  g.add(mesh(new THREE.CylinderGeometry(2, 2.4, 5, 8), white, 0, 45, 0));
  g.position.set(LANDMARKS.baptistery.at[0], 0, LANDMARKS.baptistery.at[1]);
  return g;
}

// Palazzo Vecchio: a rough stone block with a crenellated gallery and its tall, off-centre tower.
function palazzoVecchio() {
  const g = new THREE.Group(), [x0, z0, x1, z1] = LANDMARKS.palazzoVecchio.block[0];
  const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const stone = std({ map: tex(stoneTex('#b39a72', 20), w / 12, 4) });
  g.add(mesh(new THREE.BoxGeometry(w, 34, d), stone, cx, 17, cz));
  g.add(mesh(new THREE.BoxGeometry(w + 3, 6, d + 3), stone, cx, 37, cz)); // jutting gallery
  for (let i = 0; i < 4; i++) for (let k = 0; k < Math.round((i % 2 ? d : w) / 3); k++) { // merlons
    const along = (k + 0.5) * 3 - (i % 2 ? d : w) / 2;
    const [mx, mz] = [[along, -d / 2 - 1.5], [w / 2 + 1.5, along], [along, d / 2 + 1.5], [-w / 2 - 1.5, along]][i];
    g.add(mesh(new THREE.BoxGeometry(1.4, 2, 1.4), stone, cx + mx, 41, cz + mz));
  }
  // Arched windows on the west front (facing the piazza).
  for (let f = 0; f < 2; f++) for (let k = 0; k < 5; k++) {
    const win = mesh(new THREE.PlaneGeometry(2.4, 4.4), dark, x0 - 0.05, 14 + f * 11, z0 + 9 + k * (d - 18) / 4); win.rotation.y = -Math.PI / 2; g.add(win);
  }
  const door = mesh(new THREE.PlaneGeometry(4, 6), dark, x0 - 0.05, 3, cz); door.rotation.y = -Math.PI / 2; g.add(door);
  const tx = x0 + 8, tz = cz;
  g.add(mesh(new THREE.BoxGeometry(7, 40, 7), stone, tx, 60, tz));
  g.add(mesh(new THREE.BoxGeometry(9.5, 8, 9.5), stone, tx, 82, tz));
  for (let i = 0; i < 4; i++) for (let k = 0; k < 3; k++) { const a = (k - 1) * 3; const [mx, mz] = [[a, -4.4], [4.4, a], [a, 4.4], [-4.4, a]][i]; g.add(mesh(new THREE.BoxGeometry(1.2, 1.6, 1.2), stone, tx + mx, 86.8, tz + mz)); }
  for (const [px, pz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) g.add(mesh(new THREE.BoxGeometry(0.8, 8, 0.8), stone, tx + px, 90.5, tz + pz));
  g.add(mesh(new THREE.BoxGeometry(7.5, 1, 7.5), stone, tx, 95, tz));
  g.add(mesh(new THREE.ConeGeometry(3.4, 6, 4), terracotta, tx, 98.5, tz));
  const clock = mesh(new THREE.CircleGeometry(1.6, 20), std({ color: '#1f2c4a' }), tx - 3.55, 76, tz); clock.rotation.y = -Math.PI / 2; g.add(clock);
  return g;
}

function loggia() {
  const g = new THREE.Group(), [x0, z0, x1, z1] = LANDMARKS.loggia.block[0], w = x1 - x0, d = z1 - z0;
  const stone = std({ color: '#c2b49a' });
  g.add(mesh(new THREE.BoxGeometry(w, 4, d), stone, (x0 + x1) / 2, 20, (z0 + z1) / 2));
  g.add(mesh(new THREE.BoxGeometry(w + 1, 1.2, d + 1), stone, (x0 + x1) / 2, 22.6, (z0 + z1) / 2));
  for (let k = 0; k <= 3; k++) for (const z of [z0 + 1, z1 - 1]) g.add(mesh(new THREE.BoxGeometry(2.2, 18, 2.2), stone, x0 + 1 + k * (w - 2) / 3, 9, z));
  for (let k = 0; k < 3; k++) { // round arches seen from the piazza
    const arch = mesh(new THREE.TorusGeometry((w - 2) / 6 - 1, 0.9, 4, 12, Math.PI), stone, x0 + 1 + (k + 0.5) * (w - 2) / 3, 18, z0 + 1); g.add(arch);
  }
  g.add(mesh(new THREE.BoxGeometry(w - 2, 0.6, d - 2), std({ color: '#3a3128' }), (x0 + x1) / 2, 0.3, (z0 + z1) / 2));
  return g;
}

function neptune() {
  const g = new THREE.Group(), [x, z] = LANDMARKS.neptune.at;
  g.add(mesh(new THREE.CylinderGeometry(5, 5.2, 1.2, 8), std({ color: '#d9cfbd' }), x, 0.6, z));
  g.add(mesh(new THREE.CylinderGeometry(4.4, 4.4, 0.3, 8), std({ color: '#5f8a86', roughness: 0.2 }), x, 1.1, z));
  g.add(mesh(new THREE.BoxGeometry(2, 3, 2), std({ color: '#e8e2d4' }), x, 2.5, z));
  g.add(mesh(new THREE.CapsuleGeometry(0.7, 3, 3, 8), std({ color: '#f1ece2' }), x, 6, z));
  g.add(mesh(new THREE.SphereGeometry(0.5, 8, 6), std({ color: '#f1ece2' }), x, 8.3, z));
  return g;
}

// The Arno with its embankments and parapets, and Ponte Vecchio with its overhanging shops.
function riverAndBridge(shopTexs) {
  const g = new THREE.Group(), [rx0, rz0, rx1, rz1] = RIVER, rw = rx1 - rx0;
  const water = mesh(new THREE.PlaneGeometry(rw, rz1 - rz0), std({ color: '#6f8a7a', roughness: 0.25 }), (rx0 + rx1) / 2, -4, (rz0 + rz1) / 2);
  water.rotation.x = -Math.PI / 2; g.add(water);
  const emb = std({ map: tex(stoneTex('#b9a582', 6), rw / 20, 1) });
  for (const z of [rz0, rz1]) {
    g.add(mesh(new THREE.BoxGeometry(rw, 6, 1.5), emb, (rx0 + rx1) / 2, -1.5, z));
    g.add(mesh(new THREE.BoxGeometry(rw, 1, 0.8), std({ color: '#d9cbb0' }), (rx0 + rx1) / 2, 0.5, z + (z === rz0 ? 0.6 : -0.6)));
  }
  const bx = -140, bz0 = rz0, bz1 = rz1, blen = bz1 - bz0, bzc = (bz0 + bz1) / 2;
  const bstone = std({ map: tex(stoneTex('#c9b48e', 8), 2, 1) });
  // Deck with three segmental arches below.
  g.add(mesh(new THREE.BoxGeometry(14, 1.2, blen), bstone, bx, -0.6, bzc));
  for (const k of [-1, 0, 1]) {
    const zc = bzc + k * blen / 3, span = blen / 3 - 6;
    const arch = new THREE.Shape(); arch.moveTo(-span / 2 - 3, 0); arch.lineTo(span / 2 + 3, 0); arch.lineTo(span / 2 + 3, -1.2);
    arch.lineTo(span / 2, -1.2); arch.quadraticCurveTo(0, -1.2 + 2, -span / 2, -1.2); arch.lineTo(-span / 2 - 3, -1.2);
    const side = new THREE.Shape(); side.moveTo(-span / 2 - 3, 0); side.lineTo(span / 2 + 3, 0); side.lineTo(span / 2 + 3, -4.5); side.lineTo(span / 2, -4.5);
    side.quadraticCurveTo(0, -0.4, -span / 2, -4.5); side.lineTo(-span / 2 - 3, -4.5); side.lineTo(-span / 2 - 3, 0);
    const sg = new THREE.ExtrudeGeometry(side, { depth: 14, bevelEnabled: false });
    const s = mesh(sg, bstone, bx - 7, 0, zc); s.rotation.y = Math.PI / 2; g.add(s);
  }
  for (const k of [-0.5, 0.5]) g.add(mesh(new THREE.BoxGeometry(15, 5, 6), bstone, bx, -2.5, bzc + k * blen / 3));
  // The shops: a row of small houses on each side, overhanging the water on wooden brackets.
  const shopCols = ['#d98a3d', '#e2a24e', '#c7703a', '#e7b866', '#d27f45', '#b9663a', '#e39b52'];
  const shopMats = shopTexs.map((t, i) => { const c = t.clone(); c.repeat.set(1, 0.5); c.offset.set(0, 0.5); c.needsUpdate = true; return std({ map: c, color: shopCols[i % shopCols.length], roughness: 0.95 }); });
  const wood = std({ color: '#5a3d26' });
  for (const side of [-1, 1]) {
    for (let z = bz0 + 2; z < bz1 - 6; z += 6.4 + rnd() * 1.6) {
      if (Math.abs(z - bzc) < 6) continue; // the open terrace in the middle
      const w = 5.6 + rnd() * 1.4, h = 5 + rnd() * 3, d = 5 + rnd() * 2;
      const cxs = bx + side * (7 + d / 2 - 1.2);
      g.add(mesh(new THREE.BoxGeometry(d, h, w), shopMats[Math.floor(rnd() * shopMats.length)], cxs, h / 2, z + w / 2));
      g.add(mesh(new THREE.BoxGeometry(d + 1, 0.5, w + 0.6), terracotta, cxs, h + 0.25, z + w / 2));
      g.add(mesh(new THREE.BoxGeometry(d * 0.7, 1, 0.5), wood, bx + side * (7 + d / 2), -0.5, z + w / 2));
      // shop front facing the walkway: wooden shutters
      const sf = mesh(new THREE.PlaneGeometry(w * 0.8, 2.6), std({ color: '#7a4a24' }), bx + side * 5.75, 1.5, z + w / 2); sf.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2; g.add(sf);
    }
  }
  // Vasari corridor on top of the east-side shops.
  const cor = std({ color: '#e3c58f', roughness: 1 });
  g.add(mesh(new THREE.BoxGeometry(5, 4.5, blen - 4), cor, bx + 10, 10.5, bzc));
  g.add(mesh(new THREE.BoxGeometry(6, 0.5, blen - 3), terracotta, bx + 10, 13, bzc));
  for (let z = bz0 + 5; z < bz1 - 4; z += 5) { const wnd = mesh(new THREE.PlaneGeometry(1.2, 1.8), dark, bx + 7.45, 10.5, z); wnd.rotation.y = -Math.PI / 2; g.add(wnd); }
  // Low parapets along the walkway, open at the terrace.
  for (const side of [-1, 1]) for (const [za, zb] of [[bz0, bzc - 6], [bzc + 6, bz1]]) g.add(mesh(new THREE.BoxGeometry(0.5, 1, zb - za), bstone, bx + side * 7.2, 0.5, (za + zb) / 2));
  return g;
}

function hills() {
  const g = new THREE.Group();
  const hill = mesh(new THREE.SphereGeometry(500, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2), std({ color: '#6b7350', flatShading: true }), -60, -20, 1250);
  hill.scale.set(1.6, 0.2, 0.6); g.add(hill);
  const north = mesh(new THREE.SphereGeometry(500, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2), std({ color: '#7a7f5a', flatShading: true }), -60, -20, -900);
  north.scale.set(1.8, 0.28, 0.5); g.add(north);
  const cyp = std({ color: '#2f3d2a', flatShading: true });
  for (let i = 0; i < 70; i++) g.add(mesh(new THREE.ConeGeometry(2.2, 16, 5), cyp, -500 + rnd() * 900, 50 + rnd() * 28, 1000 + rnd() * 120));
  // San Miniato al Monte on the hill, white and green.
  g.add(mesh(new THREE.BoxGeometry(24, 18, 14), std({ map: tex(marbleTex(3, 4), 2, 1) }), -20, 88, 1060));
  return g;
}

export function buildLandmarks() {
  const all = new THREE.Group();
  const shopTexs = FACADES.slice(0, 4).map(([b, s]) => facadeTex(b, s));
  all.add(duomo(), campanile(), baptistery(), palazzoVecchio(), loggia(), neptune(), riverAndBridge(shopTexs));
  const out = mergeByMaterial(all);
  const far = mergeByMaterial(hills(), { castShadow: false, receiveShadow: false });
  out.add(far);
  return out;
}
