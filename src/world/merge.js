// Merges static meshes that share a material into one mesh, so the whole city costs a few dozen
// draw calls on a phone instead of thousands.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const KEEP = ['position', 'normal', 'uv', 'color'];

function prepared(geo, matrix, withColor) {
  let g = geo.index ? geo.toNonIndexed() : geo.clone();
  g.applyMatrix4(matrix);
  for (const name of Object.keys(g.attributes)) if (!KEEP.includes(name)) g.deleteAttribute(name);
  const n = g.attributes.position.count;
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n * 2), 2));
  if (withColor && !g.attributes.color) g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(n * 3).fill(1), 3));
  if (!withColor && g.attributes.color) g.deleteAttribute('color');
  return g;
}

// Part of a non-indexed geometry: vertices [start, start + count).
function slice(g, start, count) {
  const out = new THREE.BufferGeometry();
  for (const [name, a] of Object.entries(g.attributes)) out.setAttribute(name, new THREE.BufferAttribute(a.array.slice(start * a.itemSize, (start + count) * a.itemSize), a.itemSize));
  return out;
}

// Bakes every mesh under `root` into world space and returns a group with one mesh per material.
export function mergeByMaterial(root, { castShadow = true, receiveShadow = true } = {}) {
  root.updateMatrixWorld(true);
  const buckets = new Map();
  const add = (mat, g) => { if (!buckets.has(mat)) buckets.set(mat, []); buckets.get(mat).push(g); };
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    if (!Array.isArray(o.material)) { add(o.material, prepared(o.geometry, o.matrixWorld, !!o.material.vertexColors)); return; }
    const groups = o.geometry.groups.length ? o.geometry.groups : [{ start: 0, count: Infinity, materialIndex: 0 }];
    const indexed = !!o.geometry.index;
    for (const grp of groups) {
      const m = mats[grp.materialIndex]; if (!m) continue;
      const full = prepared(o.geometry, o.matrixWorld, !!m.vertexColors);
      // toNonIndexed keeps the draw order, so index ranges become vertex ranges.
      const start = grp.start, count = Math.min(grp.count, full.attributes.position.count - start);
      add(m, indexed || groups.length > 1 ? slice(full, start, count) : full);
    }
  });
  const out = new THREE.Group();
  for (const [mat, list] of buckets) {
    const geo = mergeGeometries(list, false);
    if (!geo) continue;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = castShadow; mesh.receiveShadow = receiveShadow;
    out.add(mesh);
  }
  return out;
}
