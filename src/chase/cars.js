// The chase cars, all original designs: the agent's small vintage red two-door, the rivals' boxy black
// off-roader, and oncoming traffic. Built from many small parts (chrome, lamps, wheels, interior) and
// then merged into one mesh per material, so each car costs about ten draw calls. x is forward, y up.
import * as THREE from 'three';
import { mergeByMaterial } from '../world/merge.js';

const M = {
  chrome: new THREE.MeshStandardMaterial({ color: '#f0f0f0', roughness: 0.12, metalness: 0.95 }),
  rubber: new THREE.MeshStandardMaterial({ color: '#1c1c1c', roughness: 0.9 }),
  black: new THREE.MeshStandardMaterial({ color: '#0d0d0e', roughness: 0.6 }),
  well: new THREE.MeshBasicMaterial({ color: '#0a0a0a', side: THREE.DoubleSide }),
  interior: new THREE.MeshStandardMaterial({ color: '#3a2c24', roughness: 0.8 }),
  amber: new THREE.MeshStandardMaterial({ color: '#f0a020', emissive: '#a05a00', emissiveIntensity: 0.4, roughness: 0.3 }),
  lamp: new THREE.MeshStandardMaterial({ color: '#fffaf0', emissive: '#fff1c4', emissiveIntensity: 0.5, roughness: 0.1 }),
};
let glowT = null;
const glowTex = () => glowT || (glowT = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })());
// One mesh per material, shadows on; the merged car is a group placed and turned as a whole.
function finish(car) { const g = mergeByMaterial(car, { castShadow: true, receiveShadow: false }); g.userData.brake = () => {}; return g; }
const plateTex = (txt) => { const c = document.createElement('canvas'); c.width = 256; c.height = 56; const g = c.getContext('2d'); g.fillStyle = '#f4f4ef'; g.fillRect(0, 0, 256, 56); g.fillStyle = '#2a4aa0'; g.fillRect(0, 0, 26, 56); g.fillRect(230, 0, 26, 56); g.strokeStyle = '#222'; g.lineWidth = 3; g.strokeRect(2, 2, 252, 52); g.fillStyle = '#111'; g.font = 'bold 36px Helvetica,Arial'; g.textAlign = 'center'; g.fillText(txt, 128, 41); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return new THREE.MeshStandardMaterial({ map: t, roughness: 0.5 }); };
function add(p, geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); p.add(m); return m; }
// rounded box: a rounded rectangle in x/y extruded along z, bevelled on every edge
function rbox(w, h, d, r = 0.08, bev = 0.04) {
  const s = new THREE.Shape(), x = -w / 2 + bev, y = -h / 2 + bev, W = w - 2 * bev, H = h - 2 * bev;
  s.moveTo(x + r, y); s.lineTo(x + W - r, y); s.quadraticCurveTo(x + W, y, x + W, y + r); s.lineTo(x + W, y + H - r); s.quadraticCurveTo(x + W, y + H, x + W - r, y + H);
  s.lineTo(x + r, y + H); s.quadraticCurveTo(x, y + H, x, y + H - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ExtrudeGeometry(s, { depth: d - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 3, curveSegments: 6 }); g.translate(0, 0, -(d - 2 * bev) / 2); return g;
}
function wheel(p, x, y, z, r, w, side, spokes) {
  const tyre = new THREE.CylinderGeometry(r, r, w, 28); tyre.rotateX(Math.PI / 2); add(p, tyre, M.rubber, x, y, z);
  const wall = new THREE.TorusGeometry(r * 0.86, r * 0.12, 8, 28); add(p, wall, M.rubber, x, y, z + side * w / 2);
  const rim = new THREE.CylinderGeometry(r * 0.66, r * 0.66, 0.02, 24); rim.rotateX(Math.PI / 2); add(p, rim, spokes ? M.black : M.chrome, x, y, z + side * (w / 2 + 0.005));
  if (spokes) { for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2; add(p, new THREE.BoxGeometry(r * 0.55, r * 0.14, 0.03), M.chrome, x + Math.cos(a) * r * 0.3, y + Math.sin(a) * r * 0.3, z + side * (w / 2 + 0.02), 0, 0, a); } }
  else { const dome = new THREE.SphereGeometry(r * 0.5, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2.6); dome.rotateX(side * Math.PI / 2); add(p, dome, M.chrome, x, y, z + side * w / 2 - side * 0.03); for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2 + 0.4; add(p, new THREE.CylinderGeometry(0.014, 0.014, 0.03, 6), M.black, x + Math.cos(a) * r * 0.42, y + Math.sin(a) * r * 0.42, z + side * (w / 2 + 0.03), Math.PI / 2); } }
  const cap = new THREE.CylinderGeometry(r * 0.16, r * 0.16, 0.03, 14); cap.rotateX(Math.PI / 2); add(p, cap, M.chrome, x, y, z + side * (w / 2 + (spokes ? 0.035 : 0.06)));
}
// a half-disc of shadow on the body side, so each wheel sits in a well
function arch(p, x, y, z, r, side) { const g = new THREE.CircleGeometry(r, 24, 0, Math.PI); add(p, g, M.well, x, y, z, 0, side > 0 ? 0 : Math.PI, 0); }

export function makeCar(col = '#a81c16') {
  const brake = false;
  const car = new THREE.Group();
  const paint = new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.4, metalness: 0.05, clearcoat: 0.5, clearcoatRoughness: 0.2 });
  const cream = new THREE.MeshStandardMaterial({ color: '#ece2cb', roughness: 0.85 });
  const glass = new THREE.MeshPhysicalMaterial({ color: '#9fb6c4', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.45 });
  // body: low rounded nose, rounded tail over the engine
  const prof = new THREE.Shape();
  prof.moveTo(-1.42, 0.24); prof.lineTo(1.38, 0.24);
  prof.bezierCurveTo(1.58, 0.25, 1.6, 0.46, 1.57, 0.58); prof.bezierCurveTo(1.52, 0.76, 1.3, 0.83, 1.05, 0.86);
  prof.lineTo(0.62, 0.9); prof.lineTo(-0.98, 0.9);
  prof.bezierCurveTo(-1.36, 0.9, -1.56, 0.78, -1.58, 0.56); prof.bezierCurveTo(-1.59, 0.38, -1.55, 0.25, -1.42, 0.24);
  const body = add(car, new THREE.ExtrudeGeometry(prof, { depth: 1.18, bevelEnabled: true, bevelThickness: 0.13, bevelSize: 0.11, bevelSegments: 6, curveSegments: 28 }), paint, 0, 0, 0); body.geometry.translate(0, 0, -0.59);
  // dark underside and sills
  add(car, rbox(2.9, 0.12, 1.28, 0.04, 0.02), M.black, 0, 0.2, 0);
  for (const s of [-1, 1]) {
    arch(car, 0.98, 0.3, s * 0.716, 0.36, s); arch(car, -1.0, 0.3, s * 0.716, 0.36, s);
    // door seam, handle, chrome belt and window frame, side indicator
    add(car, new THREE.BoxGeometry(0.012, 0.5, 0.01), M.black, 0.5, 0.58, s * 0.717, 0, 0, -0.08);
    add(car, new THREE.BoxGeometry(0.012, 0.52, 0.01), M.black, -0.42, 0.58, s * 0.717);
    add(car, new THREE.BoxGeometry(2.4, 0.012, 0.01), M.black, 0.05, 0.33, s * 0.717);
    add(car, rbox(0.16, 0.035, 0.03, 0.012, 0.006), M.chrome, -0.3, 0.8, s * 0.72);
    add(car, new THREE.BoxGeometry(1.6, 0.025, 0.02), M.chrome, -0.2, 0.905, s * 0.645);
    add(car, new THREE.BoxGeometry(2.95, 0.04, 0.015), cream, 0.02, 0.62, s * 0.716);
    add(car, new THREE.SphereGeometry(0.03, 10, 6), M.amber, 1.18, 0.66, s * 0.705).scale.set(1.6, 0.8, 0.5);
  }
  // cabin: glass all round with chrome-framed pillars and a body-colour roof
  const cab = new THREE.Shape(); cab.moveTo(-1.0, 0.9); cab.lineTo(0.62, 0.9); cab.quadraticCurveTo(0.42, 1.32, 0.18, 1.38); cab.lineTo(-0.62, 1.38); cab.quadraticCurveTo(-0.96, 1.3, -1.0, 0.9);
  add(car, new THREE.ExtrudeGeometry(cab, { depth: 1.08, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.04, bevelSegments: 3, curveSegments: 14 }), glass, 0, 0, 0).geometry.translate(0, 0, -0.54);
  const roof = new THREE.Shape(); roof.moveTo(-0.67, 1.33); roof.lineTo(0.24, 1.33); roof.quadraticCurveTo(0.27, 1.44, 0.15, 1.45); roof.lineTo(-0.62, 1.45); roof.quadraticCurveTo(-0.74, 1.41, -0.67, 1.33);
  add(car, new THREE.ExtrudeGeometry(roof, { depth: 1.12, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.04, bevelSegments: 4, curveSegments: 10 }), paint, 0, 0, 0).geometry.translate(0, 0, -0.56);
  // folding canvas top with ribs
  add(car, rbox(0.66, 0.05, 0.84, 0.02, 0.015), cream, -0.24, 1.5, 0);
  const rib = new THREE.MeshStandardMaterial({ color: '#d6cab0' });
  for (let k = 0; k < 4; k++) add(car, new THREE.BoxGeometry(0.03, 0.03, 0.84), rib, -0.5 + k * 0.17, 1.53, 0);
  for (const s of [-1, 1]) {
    add(car, new THREE.BoxGeometry(0.06, 0.46, 0.05), paint, 0.48, 1.13, s * 0.6, 0, 0, 0.62);   // A pillar
    add(car, new THREE.BoxGeometry(0.07, 0.46, 0.05), paint, -0.2, 1.14, s * 0.6);                 // B pillar
    add(car, new THREE.BoxGeometry(0.12, 0.44, 0.05), paint, -0.88, 1.12, s * 0.58, 0, 0, -0.55); // C pillar
    add(car, new THREE.BoxGeometry(0.5, 0.012, 0.012), M.black, 0.62, 0.95, s * 0.25, 0, 0, 0.55).rotation.y = s * 0.1; // wiper
  }
  // inside: seats, headrests, wheel
  add(car, rbox(1.4, 0.2, 1.0, 0.04, 0.02), M.interior, -0.25, 0.75, 0);
  for (const s of [-1, 1]) { add(car, rbox(0.12, 0.45, 0.42, 0.05, 0.02), M.interior, -0.42, 1.0, s * 0.27, 0, 0, -0.15); add(car, rbox(0.1, 0.14, 0.24, 0.05, 0.02), M.interior, -0.48, 1.26, s * 0.27); }
  add(car, new THREE.TorusGeometry(0.16, 0.018, 6, 20), M.black, 0.28, 1.0, 0.27, 0, Math.PI / 2, 0).rotation.z = -0.5;
  // front: round lamps in chrome rings, amber indicators, chrome whiskers and badge, bumper with overriders
  for (const s of [-1, 1]) {
    add(car, new THREE.SphereGeometry(0.11, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.lamp, 1.63, 0.6, s * 0.48, 0, 0, -Math.PI / 2);
    add(car, new THREE.TorusGeometry(0.115, 0.02, 8, 22), M.chrome, 1.64, 0.6, s * 0.48, 0, Math.PI / 2, 0);
    add(car, new THREE.SphereGeometry(0.04, 10, 6), M.amber, 1.66, 0.43, s * 0.48).scale.set(0.6, 1, 1.4);
    add(car, new THREE.BoxGeometry(0.03, 0.025, 0.28), M.chrome, 1.69, 0.5, s * 0.17, s * 0.28, 0, 0);
    add(car, rbox(0.06, 0.13, 0.05, 0.02, 0.01), M.chrome, 1.76, 0.33, s * 0.38); // overriders
    add(car, rbox(0.06, 0.13, 0.05, 0.02, 0.01), M.chrome, -1.76, 0.33, s * 0.38);
  }
  add(car, new THREE.CylinderGeometry(0.055, 0.055, 0.025, 16), M.chrome, 1.7, 0.68, 0, 0, 0, Math.PI / 2);
  add(car, rbox(0.06, 0.06, 1.38, 0.025, 0.012), M.chrome, 1.74, 0.31, 0);
  add(car, rbox(0.06, 0.06, 1.38, 0.025, 0.012), M.chrome, -1.74, 0.31, 0);
  // back: louvred engine lid, plate, slim upright lamps, exhaust
  for (let k = 0; k < 7; k++) add(car, new THREE.BoxGeometry(0.02, 0.018, 0.46), M.black, -1.665 + k * 0.012, 0.66 + k * 0.03, 0, 0, 0, -0.4);
  add(car, new THREE.BoxGeometry(0.01, 0.1, 0.4), plateTex('FI 41730'), -1.72, 0.44, 0, 0, Math.PI / 2, 0).rotation.set(0, -Math.PI / 2, 0);
  const tlMat = new THREE.MeshStandardMaterial({ color: '#a8231a', emissive: '#ff2a10', emissiveIntensity: 0.15, roughness: 0.2 });
  const glow = [];
  for (const s of [-1, 1]) {
    add(car, rbox(0.05, 0.2, 0.09, 0.03, 0.01), tlMat, -1.66, 0.58, s * 0.57);
    add(car, rbox(0.05, 0.06, 0.09, 0.02, 0.01), M.amber, -1.66, 0.44, s * 0.57);
    const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: '#ff3018', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    gl.scale.set(0.9, 0.9, 1); gl.position.set(-1.78, 0.58, s * 0.57); gl.visible = brake; glow.push(gl);
  }
  add(car, new THREE.CylinderGeometry(0.035, 0.035, 0.18, 10), M.chrome, -1.7, 0.25, 0.35, 0, 0, Math.PI / 2);
  // mirror on a stalk
  add(car, new THREE.CylinderGeometry(0.008, 0.008, 0.14), M.chrome, 0.62, 0.97, 0.72, 0.5, 0, 0);
  add(car, new THREE.SphereGeometry(0.055, 12, 8), M.chrome, 0.62, 1.03, 0.76).scale.set(0.5, 1, 1);
  for (const x of [0.98, -1.0]) for (const s of [-1, 1]) wheel(car, x, 0.29, s * 0.64, 0.29, 0.17, s, false);
  const out = finish(car); out.add(...glow);
  // Brake lights: the lamps glow and a soft red halo shows behind them.
  out.userData.brake = (on) => { tlMat.color.set(on ? '#ff3a22' : '#a8231a'); tlMat.emissiveIntensity = on ? 3 : 0.15; for (const g of glow) g.visible = on; };
  return out;
}

export function makeSUV() {
  const car = new THREE.Group();
  const paint = new THREE.MeshPhysicalMaterial({ color: '#0f1013', roughness: 0.22, metalness: 0.5, clearcoat: 1, clearcoatRoughness: 0.08 });
  const tint = new THREE.MeshPhysicalMaterial({ color: '#0e151b', roughness: 0.05, metalness: 0.6 });
  const plastic = new THREE.MeshStandardMaterial({ color: '#161617', roughness: 0.75 });
  add(car, rbox(4.4, 0.95, 1.84, 0.1, 0.05), paint, 0, 0.98, 0);        // lower body
  add(car, rbox(2.95, 0.84, 1.76, 0.08, 0.04), paint, -0.45, 1.86, 0);   // upright cabin
  add(car, rbox(2.98, 0.06, 1.62, 0.02, 0.01), plastic, -0.45, 2.3, 0);  // roof gutter strip
  for (const s of [-1, 1]) {
    add(car, new THREE.BoxGeometry(2.6, 0.04, 0.04), M.chrome, -0.45, 2.36, s * 0.7);  // roof rails
    for (const x of [-1.6, -0.45, 0.7]) add(car, new THREE.BoxGeometry(0.06, 0.06, 0.05), plastic, x, 2.33, s * 0.7);
    // side glass in three panes
    for (const [x, w] of [[0.62, 0.62], [-0.27, 0.86], [-1.33, 0.9]]) add(car, new THREE.BoxGeometry(w, 0.5, 0.02), tint, x, 1.9, s * 0.885);
    // fender flares, rubbing strip, sill step, door seams, handles, hinges
    for (const x of [1.45, -1.45]) { add(car, rbox(1.1, 0.16, 0.14, 0.05, 0.02), plastic, x, 1.02, s * 0.93); add(car, rbox(0.12, 0.42, 0.14, 0.04, 0.02), plastic, x + 0.52, 0.8, s * 0.93); add(car, rbox(0.12, 0.42, 0.14, 0.04, 0.02), plastic, x - 0.52, 0.8, s * 0.93); }
    add(car, new THREE.BoxGeometry(1.8, 0.06, 0.03), plastic, -0.05, 1.12, s * 0.93);
    add(car, rbox(1.75, 0.07, 0.18, 0.03, 0.01), plastic, -0.05, 0.5, s * 1.0);
    for (const x of [0.92, -0.05, -1.0]) add(car, new THREE.BoxGeometry(0.012, 1.4, 0.01), M.black, x, 1.45, s * 0.925);
    for (const x of [0.02, -0.92]) add(car, rbox(0.18, 0.05, 0.04, 0.015, 0.008), M.chrome, x - 0.2, 1.36, s * 0.93);
    for (const y of [1.2, 1.7]) add(car, rbox(0.1, 0.07, 0.05, 0.015, 0.008), plastic, 0.95, y, s * 0.93);
    // indicators sitting on top of the front wings
    add(car, rbox(0.14, 0.07, 0.12, 0.02, 0.01), M.amber, 2.05, 1.48, s * 0.82);
    // mirrors
    add(car, new THREE.BoxGeometry(0.1, 0.05, 0.16), plastic, 0.9, 1.75, s * 0.98);
    add(car, rbox(0.08, 0.2, 0.26, 0.04, 0.015), paint, 0.88, 1.82, s * 1.12);
    // round headlamps with chrome rings, round fogs in the bumper
    add(car, new THREE.SphereGeometry(0.15, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.lamp, 2.2, 1.18, s * 0.66, 0, 0, -Math.PI / 2);
    add(car, new THREE.TorusGeometry(0.155, 0.025, 8, 24), M.chrome, 2.21, 1.18, s * 0.66, 0, Math.PI / 2, 0);
    add(car, new THREE.SphereGeometry(0.06, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.lamp, 2.31, 0.62, s * 0.7, 0, 0, -Math.PI / 2);
    // rear lamps, upright
    add(car, rbox(0.06, 0.34, 0.16, 0.03, 0.01), new THREE.MeshStandardMaterial({ color: '#c8281a', emissive: '#b01a0a', emissiveIntensity: 1.1, roughness: 0.2 }), -2.21, 1.1, s * 0.8);
    add(car, rbox(0.06, 0.08, 0.16, 0.02, 0.01), M.amber, -2.21, 0.88, s * 0.8);
    // wipers
    add(car, new THREE.BoxGeometry(0.012, 0.012, 0.6), M.black, 1.02, 1.5, s * 0.35, 0.3 * s, 0, 0);
  }
  // near-upright windscreen and rear window, grille with chrome slats and a round badge
  add(car, new THREE.BoxGeometry(0.02, 0.56, 1.58), tint, 1.0, 1.9, 0, 0, 0, -0.06);
  add(car, new THREE.BoxGeometry(0.02, 0.5, 1.5), tint, -1.93, 1.9, 0);
  add(car, rbox(0.06, 0.42, 1.0, 0.03, 0.01), M.black, 2.21, 1.12, 0);
  for (let k = 0; k < 3; k++) add(car, new THREE.BoxGeometry(0.03, 0.035, 0.98), M.chrome, 2.24, 1.0 + k * 0.12, 0);
  add(car, new THREE.CylinderGeometry(0.1, 0.1, 0.03, 20), M.chrome, 2.25, 1.12, 0, 0, 0, Math.PI / 2);
  add(car, rbox(0.16, 0.26, 2.0, 0.06, 0.02), plastic, 2.26, 0.62, 0);   // front bumper
  add(car, rbox(0.16, 0.26, 2.0, 0.06, 0.02), plastic, -2.26, 0.62, 0);  // rear bumper
  add(car, new THREE.BoxGeometry(0.01, 0.12, 0.5), plateTex('MI 88K21'), 2.35, 0.62, 0, 0, Math.PI / 2, 0).rotation.set(0, Math.PI / 2, 0);
  add(car, new THREE.BoxGeometry(0.01, 0.12, 0.5), plateTex('MI 88K21'), -2.35, 0.62, 0, 0, -Math.PI / 2, 0).rotation.set(0, -Math.PI / 2, 0);
  // spare wheel on the tailgate in a black cover with a chrome ring
  const sp = new THREE.CylinderGeometry(0.4, 0.4, 0.26, 28); sp.rotateZ(Math.PI / 2); add(car, sp, plastic, -2.37, 1.28, 0.12);
  add(car, new THREE.TorusGeometry(0.36, 0.025, 8, 28), M.chrome, -2.51, 1.28, 0.12, 0, Math.PI / 2, 0);
  add(car, new THREE.CylinderGeometry(0.08, 0.08, 0.03, 16), M.chrome, -2.51, 1.28, 0.12, 0, 0, Math.PI / 2);
  for (const x of [1.45, -1.45]) for (const s of [-1, 1]) { arch(car, x, 0.44, s * 0.925, 0.5, s); wheel(car, x, 0.43, s * 0.86, 0.43, 0.3, s, true); }
  return finish(car);
}

// oncoming traffic: a white delivery van, small hatchbacks and a three-wheeled farm truck
export function makeTraffic(kind, col = '#e9e6dc') {
  const car = new THREE.Group();
  const paint = new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.35, metalness: 0.1, clearcoat: 0.6 });
  const glass = new THREE.MeshPhysicalMaterial({ color: '#33434e', roughness: 0.05, metalness: 0.5 });
  const plastic = new THREE.MeshStandardMaterial({ color: '#202022', roughness: 0.8 });
  if (kind === 'van') {
    add(car, rbox(4.6, 1.75, 1.85, 0.14, 0.05), paint, -0.2, 1.35, 0);
    add(car, rbox(1.0, 0.95, 1.83, 0.12, 0.05), paint, 2.35, 0.95, 0);
    add(car, new THREE.BoxGeometry(0.03, 0.62, 1.6), glass, 2.12, 1.75, 0, 0, 0, -0.35);
    for (const s of [-1, 1]) { add(car, new THREE.BoxGeometry(0.6, 0.5, 0.02), glass, 1.8, 1.75, s * 0.93); add(car, rbox(0.06, 0.14, 0.24, 0.02, 0.01), M.lamp, 2.85, 1.05, s * 0.62); add(car, new THREE.BoxGeometry(0.1, 0.2, 0.06), plastic, 1.55, 1.85, s * 1.0); }
    add(car, rbox(0.14, 0.24, 1.95, 0.05, 0.02), plastic, 2.86, 0.55, 0); add(car, rbox(0.04, 0.22, 1.0, 0.02, 0.01), plastic, 2.86, 0.86, 0);
    for (const x of [1.95, -1.7]) for (const s of [-1, 1]) { arch(car, x, 0.4, s * 0.93, 0.44, s); wheel(car, x, 0.37, s * 0.86, 0.37, 0.24, s, true); }
  } else if (kind === 'ape') {
    add(car, rbox(1.1, 1.2, 1.25, 0.18, 0.05), paint, 0.9, 1.05, 0);
    add(car, new THREE.BoxGeometry(0.03, 0.5, 1.05), glass, 1.46, 1.3, 0, 0, 0, -0.15);
    add(car, new THREE.BoxGeometry(1.7, 0.08, 1.35), plastic, -0.55, 0.62, 0);
    const wood = new THREE.MeshStandardMaterial({ color: '#7a5a3a' });
    for (const s of [-1, 1]) add(car, new THREE.BoxGeometry(1.7, 0.35, 0.05), wood, -0.55, 0.82, s * 0.66);
    add(car, new THREE.BoxGeometry(0.05, 0.35, 1.35), wood, -1.4, 0.82, 0);
    const bale = new THREE.CylinderGeometry(0.45, 0.45, 1.0, 14); bale.rotateX(Math.PI / 2); add(car, bale, new THREE.MeshLambertMaterial({ color: '#d4a64f' }), -0.6, 1.1, 0);
    add(car, rbox(0.05, 0.14, 0.14, 0.05, 0.01), M.lamp, 1.47, 0.85, 0);
    wheel(car, 1.1, 0.27, 0, 0.27, 0.14, 1, false);
    for (const s of [-1, 1]) wheel(car, -0.6, 0.27, s * 0.6, 0.27, 0.14, s, false);
  } else { // small hatchback
    add(car, rbox(3.7, 0.7, 1.66, 0.14, 0.06), paint, 0, 0.68, 0);
    const cab = new THREE.Shape(); cab.moveTo(-1.8, 1.0); cab.lineTo(0.6, 1.0); cab.lineTo(-0.1, 1.48); cab.lineTo(-1.65, 1.48); cab.lineTo(-1.8, 1.0);
    const cg = add(car, new THREE.ExtrudeGeometry(cab, { depth: 1.44, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2 }), glass, 0, 0, 0); cg.geometry.translate(0, 0, -0.72);
    add(car, rbox(1.62, 0.06, 1.5, 0.03, 0.01), paint, -0.9, 1.52, 0);
    for (const s of [-1, 1]) { for (const x of [0.2, -0.75, -1.6]) add(car, new THREE.BoxGeometry(0.07, 0.5, 0.05), paint, x, 1.24, s * 0.74, 0, 0, x > 0 ? 0.6 : 0); add(car, rbox(0.05, 0.12, 0.3, 0.03, 0.01), M.lamp, 1.86, 0.82, s * 0.55); add(car, new THREE.BoxGeometry(0.1, 0.12, 0.18), plastic, 0.45, 1.08, s * 0.88); }
    add(car, rbox(0.14, 0.2, 1.7, 0.05, 0.02), plastic, 1.86, 0.45, 0); add(car, rbox(0.14, 0.2, 1.7, 0.05, 0.02), plastic, -1.86, 0.45, 0);
    for (const x of [1.2, -1.2]) for (const s of [-1, 1]) { arch(car, x, 0.38, s * 0.84, 0.36, s); wheel(car, x, 0.3, s * 0.76, 0.3, 0.18, s, true); }
  }
  return finish(car);
}
