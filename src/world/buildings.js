// The ordinary city: blocks of three- and four-storey palazzi filling every 16 m cell that is not a
// street, a piazza, the river or a landmark. Cells cut by a street are trimmed back to its edge, so
// the facades line the streets. Everything is merged into a handful of meshes (one per facade colour,
// plus roofs and eaves) to keep draw calls low on phones.
import * as THREE from 'three';
import { BOUNDS, WALK, RIVER, LANDMARKS } from './city.js';
import { facadeTex, FACADES } from './textures.js';
import { rnd } from './rand.js';

const CELLM = 16;

function obstacles() {
  const list = WALK.map((a) => a.r).concat([RIVER]);
  for (const l of Object.values(LANDMARKS)) {
    for (const b of l.block || []) list.push([b[0] - 3, b[1] - 3, b[2] + 3, b[3] + 3]);
    if (l.circle) list.push([l.at[0] - l.circle - 2, l.at[1] - l.circle - 2, l.at[0] + l.circle + 2, l.at[1] + l.circle + 2]);
  }
  return list;
}

// Trims cell c by obstacle o (both [x0, z0, x1, z1]); returns null when too little is left.
function clip(c, o) {
  if (o[0] >= c[2] || o[2] <= c[0] || o[1] >= c[3] || o[3] <= c[1]) return c;
  const fullX = o[0] <= c[0] && o[2] >= c[2], fullZ = o[1] <= c[1] && o[3] >= c[3];
  const r = c.slice();
  const cutZ = () => { if (o[1] > c[1]) r[3] = o[1]; else r[1] = o[3]; };
  const cutX = () => { if (o[0] > c[0]) r[2] = o[0]; else r[0] = o[2]; };
  if (fullX && fullZ) return null;
  if (fullX) cutZ(); else if (fullZ) cutX();
  else { const ox = Math.min(c[2], o[2]) - Math.max(c[0], o[0]), oz = Math.min(c[3], o[3]) - Math.max(c[1], o[1]); if (ox < oz) cutX(); else cutZ(); }
  return r[2] - r[0] < 5 || r[3] - r[1] < 5 ? null : r;
}

export function footprints() {
  const obs = obstacles(), out = [];
  for (let x = BOUNDS.x0; x < BOUNDS.x1; x += CELLM) for (let z = BOUNDS.z0; z < BOUNDS.z1; z += CELLM) {
    let c = [x, z, x + CELLM, z + CELLM];
    for (const o of obs) { c = clip(c, o); if (!c) break; }
    if (c) out.push(c);
  }
  return out;
}

class Builder {
  constructor(color) { this.p = []; this.n = []; this.uv = []; this.c = color ? [] : null; }
  tri(a, b, c, uvs = [[0, 0], [0, 0], [0, 0]], col) {
    const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize();
    for (const [v, t] of [[a, uvs[0]], [b, uvs[1]], [c, uvs[2]]]) { this.p.push(v.x, v.y, v.z); this.n.push(n.x, n.y, n.z); this.uv.push(t[0], t[1]); if (this.c) this.c.push(col.r, col.g, col.b); }
  }
  quad(a, b, c, d, uvs, col) { this.tri(a, b, c, [uvs[0], uvs[1], uvs[2]], col); this.tri(a, c, d, [uvs[0], uvs[2], uvs[3]], col); }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    if (this.c) g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    return g;
  }
}

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export function buildCity() {
  const walls = FACADES.map(() => new Builder(false));
  const roofs = new Builder(true), eaves = new Builder(true);
  const roofCols = ['#b5583a', '#a24d33', '#bf6444', '#9c4a30'].map((c) => new THREE.Color(c));
  const eaveCol = new THREE.Color('#5e3f28'), soffitCol = new THREE.Color('#3d2a1b');
  const prints = footprints();
  for (const [x0, z0, x1, z1] of prints) {
    const floors = rnd() < 0.55 ? 4 : 3, fh = 4.3 + rnd() * 0.8, h = floors * fh, vTop = floors / 4;
    const b = walls[Math.floor(rnd() * walls.length)];
    const wall = (ax, az, bx, bz) => { // facing outwards, counter-clockwise seen from outside
      const bays = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / 4.6));
      b.quad(V(ax, 0, az), V(bx, 0, bz), V(bx, h, bz), V(ax, h, az), [[0, 0], [bays, 0], [bays, vTop], [0, vTop]]);
    };
    wall(x0, z1, x1, z1); wall(x1, z1, x1, z0); wall(x1, z0, x0, z0); wall(x0, z0, x0, z1);
    // Deep Tuscan eave: a slab overhanging 1.3 m with a dark soffit.
    const o = 1.3, e0 = [x0 - o, z0 - o], e1 = [x1 + o, z1 + o], ey = h + 0.35;
    eaves.quad(V(e0[0], h, e1[1]), V(e1[0], h, e1[1]), V(e1[0], h, e0[1]), V(e0[0], h, e0[1]), [[0, 0], [0, 0], [0, 0], [0, 0]], soffitCol); // underside (faces down)
    for (const [ax, az, bx, bz] of [[e0[0], e1[1], e1[0], e1[1]], [e1[0], e1[1], e1[0], e0[1]], [e1[0], e0[1], e0[0], e0[1]], [e0[0], e0[1], e0[0], e1[1]]])
      eaves.quad(V(ax, h, az), V(bx, h, bz), V(bx, ey, bz), V(ax, ey, az), [[0, 0], [0, 0], [0, 0], [0, 0]], eaveCol);
    // Hip roof with a ridge along the longer side.
    const col = roofCols[Math.floor(rnd() * roofCols.length)].clone().offsetHSL(0, 0, (rnd() - 0.5) * 0.06);
    const w = e1[0] - e0[0], d = e1[1] - e0[1], rise = Math.min(w, d) * 0.22, mx = (e0[0] + e1[0]) / 2, mz = (e0[1] + e1[1]) / 2;
    const half = Math.abs(w - d) / 2;
    const r0 = w >= d ? V(mx - half, ey + rise, mz) : V(mx, ey + rise, mz - half);
    const r1 = w >= d ? V(mx + half, ey + rise, mz) : V(mx, ey + rise, mz + half);
    const A = V(e0[0], ey, e0[1]), B = V(e1[0], ey, e0[1]), C = V(e1[0], ey, e1[1]), D = V(e0[0], ey, e1[1]);
    if (w >= d) {
      roofs.quad(D, C, r1, r0, [[0, 0], [0, 0], [0, 0], [0, 0]], col); // south
      roofs.quad(B, A, r0, r1, [[0, 0], [0, 0], [0, 0], [0, 0]], col.clone().offsetHSL(0, 0, -0.05)); // north
      roofs.tri(C, B, r1, undefined, col); roofs.tri(A, D, r0, undefined, col);
    } else {
      roofs.quad(C, B, r0, r1, [[0, 0], [0, 0], [0, 0], [0, 0]], col);
      roofs.quad(A, D, r1, r0, [[0, 0], [0, 0], [0, 0], [0, 0]], col.clone().offsetHSL(0, 0, -0.05));
      roofs.tri(D, C, r1, undefined, col); roofs.tri(B, A, r0, undefined, col);
    }
  }
  const group = new THREE.Group();
  walls.forEach((bld, i) => {
    if (!bld.p.length) return;
    const m = new THREE.Mesh(bld.geometry(), new THREE.MeshStandardMaterial({ map: facadeTex(...FACADES[i]), roughness: 0.95 }));
    m.castShadow = m.receiveShadow = true; group.add(m);
  });
  const roofMesh = new THREE.Mesh(roofs.geometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true }));
  roofMesh.castShadow = roofMesh.receiveShadow = true; group.add(roofMesh);
  const eaveMesh = new THREE.Mesh(eaves.geometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide }));
  eaveMesh.castShadow = true; group.add(eaveMesh);
  group.userData.count = prints.length;
  return group;
}
