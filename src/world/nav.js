// Walkability grid (2 m cells) and A* pathfinding for tap-to-walk.
// Cell values: 0 blocked (buildings, landmarks), 1 walkable, 2 open but not walkable (the river: the camera may go there).
import { BOUNDS, WALK, RIVER, LANDMARKS } from './city.js';

export const CELL = 2;
export const W = Math.ceil((BOUNDS.x1 - BOUNDS.x0) / CELL);
export const H = Math.ceil((BOUNDS.z1 - BOUNDS.z0) / CELL);
export const grid = new Uint8Array(W * H);

const cx = (x) => Math.floor((x - BOUNDS.x0) / CELL);
const cz = (z) => Math.floor((z - BOUNDS.z0) / CELL);
const fill = ([x0, z0, x1, z1], v) => {
  for (let j = Math.max(0, cz(z0)); j <= Math.min(H - 1, cz(z1 - 0.01)); j++)
    for (let i = Math.max(0, cx(x0)); i <= Math.min(W - 1, cx(x1 - 0.01)); i++) grid[j * W + i] = v;
};

fill(RIVER, 2);
for (const a of WALK) fill(a.r, 1);
for (const l of Object.values(LANDMARKS)) {
  for (const b of l.block || []) fill(b, 0);
  if (l.circle) for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const x = BOUNDS.x0 + (i + 0.5) * CELL, z = BOUNDS.z0 + (j + 0.5) * CELL;
    if (Math.hypot(x - l.at[0], z - l.at[1]) < l.circle) grid[j * W + i] = 0;
  }
}

export function cellAt(x, z) {
  const i = cx(x), j = cz(z);
  return i < 0 || j < 0 || i >= W || j >= H ? 0 : grid[j * W + i];
}
export const walkable = (x, z) => cellAt(x, z) === 1;
const centre = (i, j) => [BOUNDS.x0 + (i + 0.5) * CELL, BOUNDS.z0 + (j + 0.5) * CELL];

// The nearest walkable point to (x, z) within `radius` metres, or null.
export function nearestWalkable(x, z, radius = 14) {
  if (walkable(x, z)) return [x, z];
  const i0 = cx(x), j0 = cz(z), R = Math.ceil(radius / CELL);
  let best = null, bd = Infinity;
  for (let j = j0 - R; j <= j0 + R; j++) for (let i = i0 - R; i <= i0 + R; i++) {
    if (i < 0 || j < 0 || i >= W || j >= H || grid[j * W + i] !== 1) continue;
    const [px, pz] = centre(i, j), d = Math.hypot(px - x, pz - z);
    if (d < bd && d <= radius) { bd = d; best = [px, pz]; }
  }
  return best;
}

// True when a straight walk from a to b stays on walkable cells.
export function lineClear(ax, az, bx, bz, test = walkable) {
  const n = Math.ceil(Math.hypot(bx - ax, bz - az) / (CELL * 0.5));
  for (let k = 0; k <= n; k++) { const t = n ? k / n : 0; if (!test(ax + (bx - ax) * t, az + (bz - az) * t)) return false; }
  return true;
}

// A* over the grid (8 directions, no corner cutting), then string-pulled into a few straight legs.
// Returns a list of [x, z] waypoints ending at the target, or null when there is no way there.
export function findPath(ax, az, bx, bz) {
  const end = nearestWalkable(bx, bz); const start = nearestWalkable(ax, az, 6);
  if (!end || !start) return null;
  if (lineClear(start[0], start[1], end[0], end[1])) return [end];
  const si = cx(start[0]), sj = cz(start[1]), ei = cx(end[0]), ej = cz(end[1]);
  const N = W * H, g = new Float32Array(N).fill(Infinity), from = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
  const heap = []; // binary heap of [f, idx]
  const push = (f, idx) => { heap.push([f, idx]); let c = heap.length - 1; while (c > 0) { const p = (c - 1) >> 1; if (heap[p][0] <= heap[c][0]) break; [heap[p], heap[c]] = [heap[c], heap[p]]; c = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let c = 0; for (;;) { const l = 2 * c + 1, r = l + 1; let m = c; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === c) break; [heap[m], heap[c]] = [heap[c], heap[m]]; c = m; } } return top; };
  const hEst = (i, j) => { const dx = Math.abs(i - ei), dz = Math.abs(j - ej); return Math.max(dx, dz) + 0.414 * Math.min(dx, dz); };
  const s = sj * W + si, e = ej * W + ei;
  g[s] = 0; push(hEst(si, sj), s);
  const D = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
  while (heap.length) {
    const [, cur] = pop();
    if (cur === e) break;
    if (closed[cur]) continue; closed[cur] = 1;
    const i = cur % W, j = (cur - i) / W;
    for (const [di, dj, cost] of D) {
      const ni = i + di, nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= W || nj >= H) continue;
      const n = nj * W + ni;
      if (grid[n] !== 1 || closed[n]) continue;
      if (di && dj && (grid[j * W + ni] !== 1 || grid[nj * W + i] !== 1)) continue;
      const ng = g[cur] + cost;
      if (ng < g[n]) { g[n] = ng; from[n] = cur; push(ng + hEst(ni, nj), n); }
    }
  }
  if (from[e] === -1 && e !== s) return null;
  const cells = [];
  for (let c = e; c !== -1 && c !== s; c = from[c]) cells.push(centre(c % W, Math.floor(c / W)));
  cells.reverse(); cells[cells.length - 1] = end;
  // String pulling: skip waypoints while the straight line stays walkable.
  const out = []; let px = start[0], pz = start[1], k = 0;
  while (k < cells.length) {
    let far = k;
    for (let m = cells.length - 1; m > k; m--) if (lineClear(px, pz, cells[m][0], cells[m][1])) { far = m; break; }
    out.push(cells[far]); [px, pz] = cells[far]; k = far + 1;
  }
  return out;
}
