// Case 02's strays and finds in the city: cats that wander and sit (more come out as Heat rises),
// stalls with Florentine food and souvenirs, their cards and the album. Rules in finds.js.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CATS, ITEMS, TOTAL, catsFor, catOrder, loadAlbum, saveAlbum, collect } from './finds.js';
import { walkable, lineClear, nearestWalkable } from '../world/nav.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
const MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });
const RING_GEO = new THREE.RingGeometry(0.42, 0.52, 28);
const RING_MAT = new THREE.MeshBasicMaterial({ color: '#8fd3c8', transparent: true, opacity: 0.85, depthWrite: false });
const HIT_GEO = new THREE.BoxGeometry(0.9, 0.8, 1), HIT_MAT = new THREE.MeshBasicMaterial({ visible: false }); // a cat is easier to tap than it looks

// One vertex-coloured geometry from boxes, cones and cylinders: [geometry, colour, x, y, z, rx, ry, rz].
function build(parts) {
  const out = [];
  for (const [g0, hex, x, y, z, rx = 0, ry = 0, rz = 0] of parts) {
    let g = g0.index ? g0.toNonIndexed() : g0;
    g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(1, 1, 1)));
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal'].includes(k)) g.deleteAttribute(k);
    const c = new THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3)); out.push(g);
  }
  return mergeGeometries(out);
}
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);

// A cat about 45 cm long, front is -z. Standing and sitting share one mesh each.
function catGeometry(c, sitting) {
  const s = c.stripe || c.main, p = [];
  const leg = (x, z) => p.push([box(0.06, 0.2, 0.06), z < 0 && c.second !== c.main ? c.second : c.main, x, 0.1, z]);
  if (sitting) {
    p.push([box(0.2, 0.26, 0.22), c.main, 0, 0.15, 0.04], [box(0.12, 0.16, 0.05), c.second, 0, 0.18, -0.08]);
    leg(-0.05, -0.08); leg(0.05, -0.08);
    p.push([new THREE.CylinderGeometry(0.025, 0.03, 0.3, 6), s, 0.11, 0.03, 0.08, Math.PI / 2, 0, 0.5]);
  } else {
    p.push([box(0.18, 0.17, 0.4), c.main, 0, 0.27, 0], [box(0.12, 0.08, 0.3), c.second, 0, 0.19, -0.02]);
    if (c.stripe) for (const z of [-0.1, 0, 0.1]) p.push([box(0.185, 0.03, 0.04), c.stripe, 0, 0.35, z]);
    leg(-0.06, -0.15); leg(0.06, -0.15); leg(-0.06, 0.15); leg(0.06, 0.15);
    p.push([new THREE.CylinderGeometry(0.02, 0.03, 0.34, 6), s, 0, 0.42, 0.28, -0.45]);
  }
  const hy = sitting ? 0.36 : 0.38, hz = sitting ? -0.02 : -0.24;
  p.push([box(0.16, 0.14, 0.14), c.main, 0, hy, hz], [box(0.08, 0.05, 0.03), c.second, 0, hy - 0.04, hz - 0.075],
    [box(0.025, 0.02, 0.01), c.nose, 0, hy - 0.02, hz - 0.075],
    [box(0.025, 0.025, 0.01), '#d8c23a', -0.04, hy + 0.02, hz - 0.072], [box(0.025, 0.025, 0.01), '#d8c23a', 0.04, hy + 0.02, hz - 0.072],
    [new THREE.ConeGeometry(0.035, 0.07, 4), c.stripe === '#262222' ? '#262222' : c.main, -0.05, hy + 0.1, hz, 0, Math.PI / 4],
    [new THREE.ConeGeometry(0.035, 0.07, 4), c.main, 0.05, hy + 0.1, hz, 0, Math.PI / 4]);
  if (c.id === 'arlecchina' || c.id === 'tartaruga') p.push([box(0.12, 0.06, 0.12), c.id === 'arlecchina' ? c.stripe : c.second, 0.03, sitting ? 0.29 : 0.36, sitting ? 0.06 : 0.08]);
  return build(p);
}

// A little stall: a table with a striped cloth and the thing on top.
const TOP = {
  caffe: () => [[new THREE.CylinderGeometry(0.05, 0.04, 0.07, 10), '#f4f1ea', 0, 0.86, 0], [new THREE.CylinderGeometry(0.09, 0.09, 0.01, 12), '#f4f1ea', 0, 0.82, 0]],
  schiacciata: () => [[box(0.34, 0.05, 0.2), '#d9a65a', 0, 0.85, 0], [box(0.3, 0.02, 0.16), '#b0453a', 0, 0.88, 0]],
  cantucci: () => [[box(0.08, 0.04, 0.16), '#d6a868', -0.08, 0.84, 0, 0, 0.3], [box(0.08, 0.04, 0.16), '#d6a868', 0.06, 0.84, 0.02, 0, -0.2], [box(0.08, 0.04, 0.16), '#c99a58', 0, 0.88, 0, 0, 0.1]],
  lampredotto: () => [[new THREE.SphereGeometry(0.1, 10, 6), '#d9a65a', 0, 0.88, 0], [box(0.2, 0.03, 0.12), '#5c8a3a', 0, 0.86, 0]],
  gelato: () => [[new THREE.CylinderGeometry(0.07, 0.05, 0.08, 10), '#f4f1ea', 0, 0.86, 0], [new THREE.SphereGeometry(0.06, 10, 6), '#f0b0c0', -0.02, 0.93, 0], [new THREE.SphereGeometry(0.055, 10, 6), '#8a5a3a', 0.03, 0.95, 0]],
  ribollita: () => [[new THREE.CylinderGeometry(0.12, 0.07, 0.08, 12), '#e8e2d4', 0, 0.86, 0], [new THREE.CylinderGeometry(0.11, 0.11, 0.01, 12), '#8a5a2a', 0, 0.9, 0]],
  carta: () => [[box(0.3, 0.01, 0.22), '#4a6fa8', 0, 0.83, 0], [box(0.12, 0.012, 0.08), '#e8c45c', 0.05, 0.835, 0.04], [box(0.1, 0.012, 0.06), '#b0453a', -0.07, 0.835, -0.05]],
  segnalibro: () => [[box(0.06, 0.012, 0.26), '#7a3a1e', 0, 0.83, 0], [box(0.04, 0.014, 0.04), '#d8b04a', 0, 0.835, -0.08]],
  cartolina: () => [[box(0.24, 0.012, 0.16), '#f4f1ea', 0, 0.83, 0], [box(0.18, 0.014, 0.08), '#c7843a', 0, 0.835, -0.02]],
};
function stallGeometry(id) {
  const p = [[box(0.9, 0.06, 0.6), '#6b4a2e', 0, 0.76, 0], [box(0.92, 0.2, 0.62), '#efe6d2', 0, 0.68, 0], [box(0.93, 0.05, 0.63), '#a8322a', 0, 0.62, 0]];
  for (const x of [-0.4, 0.4]) for (const z of [-0.25, 0.25]) p.push([box(0.05, 0.6, 0.05), '#4a3020', x, 0.3, z]);
  return build([...p, ...TOP[id]()]);
}

// Small painted icons for the cards and the album (64 by 64).
function catIcon(c) {
  return `<svg viewBox="0 0 64 64"><path d="M14 50 L12 16 L24 26 Q32 22 40 26 L52 16 L50 50 Q32 60 14 50 Z" fill="${c.main}" stroke="#2a2118" stroke-width="2"/>
    ${c.id === 'arlecchina' ? `<path d="M14 30 Q22 26 26 34 L14 40 Z" fill="${c.second}"/><path d="M50 22 L52 34 Q44 34 42 28 Z" fill="${c.stripe}"/>` : ''}
    ${c.id === 'tartaruga' ? `<path d="M36 28 Q46 26 50 36 L42 40 Z" fill="${c.second}"/>` : ''}
    ${c.stripe && c.id !== 'arlecchina' && c.id !== 'tartaruga' ? `<path d="M28 26 L30 32 M36 26 L34 32 M32 25 L32 31" stroke="${c.stripe}" stroke-width="2.5"/>` : ''}
    <path d="M22 44 Q32 54 42 44 Q32 40 22 44 Z" fill="${c.second}"/>
    <ellipse cx="24" cy="37" rx="3.5" ry="4.5" fill="#d8c23a"/><ellipse cx="40" cy="37" rx="3.5" ry="4.5" fill="#d8c23a"/>
    <ellipse cx="24" cy="37" rx="1.2" ry="3.5" fill="#1a1410"/><ellipse cx="40" cy="37" rx="1.2" ry="3.5" fill="#1a1410"/>
    <path d="M30 44 L34 44 L32 47 Z" fill="${c.nose}"/><path d="M20 46 L8 44 M20 48 L8 50 M44 46 L56 44 M44 48 L56 50" stroke="#2a2118" stroke-width="1"/></svg>`;
}
const ICONS = {
  caffe: '<path d="M18 26 H42 V40 Q42 50 30 50 Q18 50 18 40 Z" fill="#f4f1ea" stroke="#2a2118" stroke-width="2"/><path d="M42 30 Q52 30 50 38 Q48 42 42 40" fill="none" stroke="#2a2118" stroke-width="2"/><ellipse cx="30" cy="27" rx="11" ry="3" fill="#5a3420"/><ellipse cx="30" cy="54" rx="18" ry="4" fill="#e8e2d4" stroke="#2a2118" stroke-width="2"/><path d="M26 20 Q24 14 28 10 M34 20 Q32 14 36 10" stroke="#9a8f80" stroke-width="2" fill="none"/>',
  schiacciata: '<rect x="8" y="22" width="48" height="22" rx="8" fill="#d9a65a" stroke="#2a2118" stroke-width="2"/><path d="M10 32 H54" stroke="#b0453a" stroke-width="4"/><circle cx="18" cy="27" r="1.6" fill="#a8783a"/><circle cx="30" cy="26" r="1.6" fill="#a8783a"/><circle cx="44" cy="27" r="1.6" fill="#a8783a"/><circle cx="24" cy="39" r="1.6" fill="#a8783a"/><circle cx="38" cy="39" r="1.6" fill="#a8783a"/>',
  cantucci: '<path d="M8 40 Q20 24 34 30 L30 46 Q18 50 8 40 Z" fill="#d6a868" stroke="#2a2118" stroke-width="2"/><path d="M30 26 Q44 18 56 28 L50 44 Q40 46 32 42 Z" fill="#c99a58" stroke="#2a2118" stroke-width="2"/><ellipse cx="20" cy="38" rx="3" ry="2" fill="#f0dcb0"/><ellipse cx="44" cy="32" rx="3" ry="2" fill="#f0dcb0"/>',
  lampredotto: '<path d="M8 36 Q8 18 32 18 Q56 18 56 36 Z" fill="#d9a65a" stroke="#2a2118" stroke-width="2"/><path d="M8 38 H56" stroke="#8a4a3a" stroke-width="5"/><path d="M8 42 H56" stroke="#5c8a3a" stroke-width="3"/><path d="M8 44 Q8 52 32 52 Q56 52 56 44 Z" fill="#d9a65a" stroke="#2a2118" stroke-width="2"/>',
  gelato: '<circle cx="26" cy="24" r="10" fill="#f0b0c0" stroke="#2a2118" stroke-width="2"/><circle cx="38" cy="22" r="10" fill="#8a5a3a" stroke="#2a2118" stroke-width="2"/><path d="M14 30 H50 L44 54 H20 Z" fill="#f4f1ea" stroke="#2a2118" stroke-width="2"/><path d="M40 12 L46 4" stroke="#c9a24a" stroke-width="3"/>',
  ribollita: '<path d="M8 30 H56 Q54 52 32 52 Q10 52 8 30 Z" fill="#e8e2d4" stroke="#2a2118" stroke-width="2"/><ellipse cx="32" cy="30" rx="24" ry="5" fill="#8a5a2a" stroke="#2a2118" stroke-width="2"/><path d="M20 29 Q24 26 28 30 M36 30 Q40 26 44 29" stroke="#3f5a2a" stroke-width="3" fill="none"/>',
  carta: '<rect x="10" y="12" width="44" height="40" fill="#4a6fa8" stroke="#2a2118" stroke-width="2"/><path d="M10 22 Q22 14 30 24 T54 22 M10 34 Q20 26 32 36 T54 34 M10 46 Q24 38 34 46 T54 44" fill="none" stroke="#e8c45c" stroke-width="3"/><path d="M16 28 Q24 34 30 30 M36 40 Q44 46 50 40" fill="none" stroke="#b0453a" stroke-width="3"/>',
  segnalibro: '<path d="M24 6 H40 V54 L32 46 L24 54 Z" fill="#7a3a1e" stroke="#2a2118" stroke-width="2"/><path d="M26 12 H38 M26 40 H38" stroke="#d8b04a" stroke-width="2"/><path d="M32 18 L36 26 L32 34 L28 26 Z" fill="#d8b04a"/>',
  cartolina: '<rect x="6" y="14" width="52" height="36" fill="#f4f1ea" stroke="#2a2118" stroke-width="2"/><rect x="10" y="18" width="30" height="28" fill="#8ab8d8"/><path d="M10 36 H40 V46 H10 Z" fill="#4a7a9a"/><path d="M10 28 H40 V36 H10 Z" fill="#c7843a"/><path d="M14 36 Q19 31 24 36 Q29 31 34 36" fill="#8ab8d8"/><rect x="46" y="18" width="8" height="10" fill="#b0453a"/><path d="M44 36 H56 M44 42 H56" stroke="#9a8f80" stroke-width="1.5"/>',
};
export const findIcon = (id) => { const c = CATS.find((k) => k.id === id); return c ? catIcon(c) : `<svg viewBox="0 0 64 64">${ICONS[id]}</svg>`; };

export function makeFinds({ group, random = Math.random }) {
  const f = { targets: [], album: loadAlbum(), cats: [] };
  const catGeo = {};
  for (const c of CATS) catGeo[c.id] = [catGeometry(c, false), catGeometry(c, true)];
  for (const c of CATS) {
    const mesh = new THREE.Mesh(catGeo[c.id][1], MAT); mesh.visible = false; mesh.castShadow = true; group.add(mesh);
    const hit = new THREE.Mesh(HIT_GEO, HIT_MAT); hit.position.y = 0.35; mesh.add(hit);
    const t = { kind: 'cat', id: c.id, mesh, ring: null, at: [0, 0], cat: { target: null, wait: 0, sitting: true, bob: random() * 6 } };
    f.targets.push(t);
  }
  for (const it of ITEMS) {
    const [x, z] = nearestWalkable(...it.at) || it.at;
    const mesh = new THREE.Mesh(stallGeometry(it.id), MAT); mesh.position.set(x, 0, z); mesh.rotation.y = random() * Math.PI; mesh.castShadow = true;
    const ring = new THREE.Mesh(RING_GEO, RING_MAT); ring.rotation.x = -Math.PI / 2; ring.position.set(x, 0.03, z); ring.scale.setScalar(2);
    group.add(mesh, ring);
    f.targets.push({ kind: 'find', id: it.id, mesh, ring, at: [x, z] });
  }
  const catT = (id) => f.targets.find((t) => t.kind === 'cat' && t.id === id);

  // A stray comes out at a walkable spot 14 to 30 m from the agent (or anywhere near a stall at first).
  const spawn = (t, near) => {
    for (let k = 0; k < 40; k++) {
      let x, z;
      if (near) { const a = random() * Math.PI * 2, d = 14 + random() * 16; x = near.x + Math.cos(a) * d; z = near.z + Math.sin(a) * d; } else { const s = ITEMS[Math.floor(random() * ITEMS.length)].at; x = s[0] + (random() - 0.5) * 16; z = s[1] + (random() - 0.5) * 16; }
      if (walkable(x, z)) { t.at = [x, z]; t.mesh.position.set(x, 0, z); t.mesh.rotation.y = random() * Math.PI * 2; t.mesh.visible = true; return; }
    }
  };

  f.reset = () => {
    f.order = catOrder(random); f.out = 0;
    for (const t of f.targets) { if (t.kind === 'cat') t.mesh.visible = false; else t.mesh.visible = t.ring.visible = true; }
    f.update(0, 0, null);
  };

  // Every frame: bring out strays for the Heat, then let each wander a little or sit.
  f.update = (dt, heat, agent) => {
    const want = catsFor(heat);
    while (f.out < want && f.out < f.order.length) spawn(catT(f.order[f.out++]), f.out > 2 ? agent : null);
    for (let i = 0; i < f.out; i++) {
      const t = catT(f.order[i]), s = t.cat, m = t.mesh;
      if (s.wait > 0) { s.wait -= dt; continue; }
      if (!s.target) {
        const a = random() * Math.PI * 2, d = 3 + random() * 9, tx = m.position.x + Math.cos(a) * d, tz = m.position.z + Math.sin(a) * d;
        if (walkable(tx, tz) && lineClear(m.position.x, m.position.z, tx, tz)) { s.target = [tx, tz]; if (s.sitting) { s.sitting = false; m.geometry = catGeo[t.id][0]; } } else { s.wait = 0.5; continue; }
      }
      const dx = s.target[0] - m.position.x, dz = s.target[1] - m.position.z, dist = Math.hypot(dx, dz);
      if (dist < 0.1) { s.target = null; s.wait = 3 + random() * 8; s.sitting = true; m.geometry = catGeo[t.id][1]; m.position.y = 0; continue; }
      const step = Math.min(dist, 0.8 * dt); m.position.x += (dx / dist) * step; m.position.z += (dz / dist) * step;
      m.rotation.y = Math.atan2(-dx, -dz); s.bob += step * 9; m.position.y = Math.abs(Math.sin(s.bob)) * 0.015;
      t.at[0] = m.position.x; t.at[1] = m.position.z;
    }
  };
  f.out = 0; f.order = [];

  // A pet or a pick-up: the card's HTML. Cats stay and sit; stalls' things are taken for this play.
  f.take = (t) => {
    const fresh = collect(f.album, t.id); if (fresh) saveAlbum(f.album);
    const n = f.album.size, cat = CATS.find((c) => c.id === t.id), it = ITEMS.find((i) => i.id === t.id);
    if (cat) { t.cat.target = null; t.cat.wait = 6; t.cat.sitting = true; t.mesh.geometry = catGeo[t.id][1]; t.mesh.position.y = 0; } else { t.mesh.visible = false; t.ring.visible = false; }
    const head = cat ? `<p class="kicker">Stray cat · ${esc(cat.coat)}</p><h2>${esc(cat.name)}</h2><p>${esc(cat.name)} leans into your hand and purrs. ${random() < 0.5 ? 'A good alibi for standing still.' : 'Nobody looks twice at someone petting a cat.'}</p>`
      : `<p class="kicker">${it.kind === 'food' ? 'Florence food' : 'Souvenir'}</p><h2>${esc(it.name)}</h2><p>${esc(it.text)}</p>`;
    return { fresh, html: `<div class="findicon">${findIcon(t.id)}</div>${head}
      <p class="small">${fresh ? `New in your album: ${n} of ${TOTAL}.` : `Already in your album (${n} of ${TOTAL}).`}</p>
      <button type="button" data-q="album">Open the album</button><button type="button" class="close" data-case="close">Back to the case</button>` };
  };

  // The album: every cat, food and souvenir, found ones painted, the rest as a dim outline.
  f.albumHTML = () => {
    const tile = (id, name) => { const got = f.album.has(id); return `<div class="atile${got ? '' : ' off'}">${got ? findIcon(id) : '<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="20" fill="none" stroke="#c9b8a0" stroke-width="3" stroke-dasharray="5 5"/><text x="32" y="40" text-anchor="middle" font-size="22" fill="#c9b8a0" font-family="Georgia">?</text></svg>'}<span>${got ? esc(name) : '?'}</span></div>`; };
    const sec = (title, list) => `<p class="kicker">${title} · ${list.filter((x) => f.album.has(x.id)).length} / ${list.length}</p><div class="agrid">${list.map((x) => tile(x.id, x.name)).join('')}</div>`;
    return `<p class="kicker">Notebook · album</p><h2>Florence, collected</h2>
      <p class="small">Kept on this phone across plays. More strays come out when Heat rises.</p>
      ${sec('Stray cats', CATS)}${sec('Food', ITEMS.filter((i) => i.kind === 'food'))}${sec('Souvenirs', ITEMS.filter((i) => i.kind === 'souvenir'))}
      <button type="button" data-q="board">Back to the seal board</button>`;
  };
  return f;
}
