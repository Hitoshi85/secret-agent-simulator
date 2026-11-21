// The opening car chase, Pienza to Florence: its own scene, camera and HUD, one drive of about 45 s
// on a road generated fresh every run. Hold the left or right half of the screen to steer (or arrows /
// A D), Brake (Space, Down or S). Keep the black off-roader in sight for 30 s straight, or catch right
// up behind him, and the chase is won early; lose him for 12 seconds and the drive restarts.
import * as THREE from 'three';
import { skyTex } from '../world/textures.js';
import { buildStage, sampleRoad, STAGES } from './land.js';
import { makeCar, makeSUV, makeTraffic } from './cars.js';
import { newCar, drivePlayer, driveSUV, bump, moveTraffic, sightStep, secondsLeft, clearView, KMH } from './drive.js';

const $ = (id) => document.getElementById(id);
const r1 = {}, r2 = {}, v3 = new THREE.Vector3(), look = new THREE.Vector3();
const PLAY = 1;                       // stages played (STAGES has three; the chase uses the first)
export const WIN_SIGHT = 30, CATCH_GAP = 8; // seconds in sight in a row, or metres behind him, to win

export function makeChase({ renderer, onDone, toast }) {
  const scene = new THREE.Scene();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(3000, 24, 12), new THREE.MeshBasicMaterial({ map: skyTex(['#3f7fc8', '#5f9bd8', '#86b6e2', '#b4d0e6', '#ece0c4']), side: THREE.BackSide, fog: false, depthWrite: false }));
  { const uv = sky.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, Math.min(1, Math.max(0, (uv.getY(i) - 0.5) * 2.6))); }
  sky.renderOrder = -1; scene.add(sky);
  scene.fog = new THREE.Fog('#e3dccb', 350, 2600);
  scene.add(new THREE.HemisphereLight('#fff2dc', '#7d6a4c', 1.25));
  const sun = new THREE.DirectionalLight('#ffe2b8', 2.9), SUN = new THREE.Vector3(-0.7, 0.5, 0.35).normalize();
  sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.05;
  Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 700 });
  scene.add(sun, sun.target);
  // Chrome and paint reflect a soft copy of the sky and fields.
  { const es = new THREE.Scene(); es.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), new THREE.MeshBasicMaterial({ map: sky.material.map, side: THREE.BackSide })));
    const g = new THREE.Mesh(new THREE.CircleGeometry(49, 32), new THREE.MeshBasicMaterial({ color: '#b89a62' })); g.rotation.x = -Math.PI / 2; g.position.y = -2; es.add(g);
    scene.environment = new THREE.PMREMGenerator(renderer).fromScene(es, 0.02).texture; }
  const camera = new THREE.PerspectiveCamera(62, 1, 0.5, 4000);

  const fiat = makeCar(), suv = makeSUV();
  const traffic = [makeTraffic('van', '#ecebe4'), makeTraffic('ape', '#3f6f9a'), makeTraffic('hatch', '#2f5d8a'), makeTraffic('hatch', '#e8e2cf')];
  scene.add(fiat, suv, ...traffic);
  for (const o of [fiat, suv, ...traffic]) o.rotation.order = 'YZX';

  const c = { stage: 0, status: 'off', player: null, suv: null, traffic: [], sight: null, gap: 0, clock: 0, total: 0, steer: 0, brake: false, world: null, road: null, best: 1e9 };
  const input = { left: 0, right: 0, keys: { left: false, right: false, brake: false }, brakeBtn: false };

  function load(k) {
    if (c.world) { scene.remove(c.world.group); c.world.group.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      for (const m of [].concat(o.material || [])) { if (m.map) m.map.dispose(); m.dispose(); }
    }); }
    c.world = buildStage(k, c.seed); c.streak = 0; c.wheel = 0; c.road = c.world.road; scene.add(c.world.group);
    c.stage = k; c.player = newCar(10, 1.1); c.player.v = 28; c.suv = newCar(55, 1.1); c.suv.v = 34;
    for (const car of [c.player, c.suv]) { sampleRoad(c.road, car.s, r1); car.y = r1.y; car.vy = r1.slope * car.v; } // start on the road, following its slope
    c.traffic = traffic.map((m, i) => ({ ...newCar(160 + i * 200 + Math.random() * 120, -1.4), v: 15 + Math.random() * 8, mesh: m }));
    c.sight = { value: 1, visible: true, wasVisible: true, losses: 0 }; c.clock = 0;
    $('locName').textContent = STAGES[k].place; $('locSub').textContent = `${STAGES[k].name} · to Florence`; place(); fitCam(true);
  }

  // Road coordinates to the scene: right of the road is (-cos dir, sin dir).
  function put(o, car, yaw = 0) {
    const r = sampleRoad(c.road, car.s, r1), rx = -Math.cos(r.dir), rz = Math.sin(r.dir);
    o.position.set(r.x + rx * car.d, car.y, r.z + rz * car.d);
    o.rotation.y = r.dir - car.psi - Math.PI / 2 + yaw;
    o.rotation.z = car.air > 0.05 ? Math.atan2(car.vy, Math.max(5, car.v)) * 0.8 : Math.atan(r.slope);
    o.rotation.z *= yaw ? -1 : 1;
  }
  function place() {
    put(fiat, c.player); put(suv, c.suv);
    for (const t of c.traffic) put(t.mesh, t, Math.PI);
  }
  function fitCam(snap) {
    const p = fiat.position, f = sampleRoad(c.road, c.player.s, r2);
    const yaw = f.dir - c.player.psi * 0.6, bx = -Math.sin(yaw), bz = -Math.cos(yaw);
    const sh = c.player.shake > 0 ? (Math.random() - 0.5) * c.player.shake * 0.8 : 0;
    v3.set(p.x + bx * 9.5 + sh, Math.max(p.y, sampleRoad(c.road, c.player.s - 9, r1).y) + 3.6, p.z + bz * 9.5);
    if (snap) camera.position.copy(v3); else camera.position.lerp(v3, 0.18);
    look.set(p.x - bx * 22, p.y + 1.2, p.z - bz * 22); camera.lookAt(look);
    sun.target.position.copy(p); sun.position.set(p.x + SUN.x * 300, p.y + SUN.y * 300, p.z + SUN.z * 300);
    sky.position.copy(camera.position);
  }

  // HUD: speedometer dial drawn once, needle and number each frame.
  const sp = $('cSpeedo'), sctx = sp.getContext('2d'), dpr = Math.min(2, devicePixelRatio || 1);
  sp.width = sp.height = 104 * dpr;
  const ang = (k) => (225 - 270 * k / 160) * Math.PI / 180;
  let lastKmh = -1;
  function speedo(kmh) {
    if (kmh === lastKmh) return; lastKmh = kmh;
    const g = sctx; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, 104, 104);
    g.fillStyle = 'rgba(16,20,27,.86)'; g.strokeStyle = '#f4ecdc'; g.lineWidth = 2.5; g.beginPath(); g.arc(52, 54, 48, 0, 7); g.fill(); g.stroke();
    for (let k = 0; k <= 160; k += 10) {
      const a = ang(k), big = k % 40 === 0, r0 = 42, rr = big ? 33 : 37;
      g.strokeStyle = k >= 140 ? '#e0572c' : '#f4ecdc'; g.lineWidth = big ? 2 : 1;
      g.beginPath(); g.moveTo(52 + Math.cos(a) * r0, 54 - Math.sin(a) * r0); g.lineTo(52 + Math.cos(a) * rr, 54 - Math.sin(a) * rr); g.stroke();
      if (big && k > 0 && k < 160) { g.fillStyle = '#c9c1b0'; g.font = '9px Helvetica'; g.textAlign = 'center'; g.fillText(k, 52 + Math.cos(a) * 24, 54 - Math.sin(a) * 24 + 3); }
    }
    const a = ang(Math.min(160, kmh)); g.strokeStyle = '#e8c45c'; g.lineWidth = 3; g.lineCap = 'round';
    g.beginPath(); g.moveTo(52, 54); g.lineTo(52 + Math.cos(a) * 38, 54 - Math.sin(a) * 38); g.stroke();
    g.fillStyle = '#e8c45c'; g.beginPath(); g.arc(52, 54, 5, 0, 7); g.fill();
    g.fillStyle = '#fff'; g.font = 'bold 17px Helvetica'; g.textAlign = 'center'; g.fillText(kmh, 52, 82);
    g.fillStyle = '#c9c1b0'; g.font = '7.5px Helvetica'; g.fillText('KM/H', 52, 92);
  }

  // The gap: a gold tag over the off-roader, or at the screen edge pointing to him.
  function tag(w, h) {
    const t = $('cTag'); v3.copy(suv.position); v3.y += 2.7; v3.project(camera);
    const on = v3.z < 1 && Math.abs(v3.x) < 0.95 && v3.y < 0.95 && v3.y > -0.9;
    t.textContent = `${on ? '' : v3.x < -0.95 ? '◀ ' : v3.x > 0.95 ? '▶ ' : '▲ '}${Math.round(c.gap)} m`;
    const x = Math.max(44, Math.min(w - 44, (v3.x + 1) / 2 * w)), y = Math.max(180, Math.min(h * 0.62, (1 - v3.y) / 2 * h));
    t.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
    t.classList.toggle('edge', !on);
    return on;
  }

  function hud(w, h) {
    const onScreen = tag(w, h), s = c.sight;
    speedo(Math.round(c.player.v * KMH));
    $('cSightBar').style.width = `${(s.value * 100).toFixed(1)}%`;
    $('cSight').classList.toggle('alarm', !s.visible);
    $('cSightL').textContent = s.visible ? 'IN SIGHT' : 'LOST';
    $('cSightN').textContent = s.visible ? `${Math.min(WIN_SIGHT, Math.floor(c.streak))}/${WIN_SIGHT} s` : `${secondsLeft(s)} s`;
    const left = Math.max(0, (c.road.end - c.player.s) / 33);
    $('locSub').textContent = `${STAGES[c.stage].name} · ${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')} left`;
    const pill = $('cPill');
    if (!s.visible) { pill.hidden = false; pill.className = 'cpill red'; pill.textContent = `Out of sight · ${secondsLeft(s)} s`; }
    else if (c.player.air > 0.25) { pill.hidden = false; pill.className = 'cpill air'; pill.textContent = `AIR TIME · ${c.player.air.toFixed(1)} s`; }
    else pill.hidden = true;
    $('cBrake').classList.toggle('on', c.brake);
    $('cWheel').lastChild.style.left = `calc(${(50 + c.wheel * 36).toFixed(1)}% - 9px)`; // the gold marker slides L to R with the steering
    $('chase').querySelector('.steer.l').classList.toggle('on', c.steer < 0);
    $('chase').querySelector('.steer.r').classList.toggle('on', c.steer > 0);
    return onScreen;
  }

  function card(html) { $('chaseBody').innerHTML = html; $('chaseCard').hidden = !html; $('chase').classList.toggle('carded', !!html); }
  const stageCard = (k) => card(`<p class="kicker">Pienza to Florence · ${STAGES[k].name}</p><h2>${['Leaving Pienza', 'The Siena road', 'Into Florence'][k]}</h2>
    <p>${['Cypress avenues and gravel lanes under the town walls.', 'Open hills, farms and long straights: he is faster there, so take the bends well.', 'Vineyards and olive groves, then the dome in the valley ahead.'][k]} About 45 seconds. Keep him in sight for ${WIN_SIGHT} seconds straight, or catch right up behind him, and the chase is yours.</p>
    <div class="route">${[0, 1, 2, 3].map((i) => `<i class="${i <= k ? 'on' : ''}"></i>`).join('<u></u>')}</div>
    <div class="rl"><span>Pienza</span><span>Siena road</span><span>Chianti</span><span>Florence</span></div>
    <button type="button" data-chase="go">Drive</button><button type="button" class="close" data-chase="skip">Skip to Florence</button>`);

  // Flow: the handler's call, then each stage card, driving, and the end cards.
  c.start = () => {
    document.body.classList.add('chasing'); $('chase').hidden = false; c.total = 0; c.closest = 1e9; c.lostCount = 0;
    c.seed = 1 + Math.floor(Math.random() * 1e6); load(0); c.status = 'card'; // a new road every run
    card(`<div class="gadget"><p class="kicker">Phone · Handler</p><p class="msg">A black off-roader just left Pienza with a dealer in stolen art inside. He's heading for Florence, and something there is on his list.</p>
      <p class="msg">The little red car by the gate is yours. Keys are under the sun visor. <b>Don't lose sight of him.</b></p>
      <p class="small">Hold the left or right side of the screen to steer (or ← → / A D). The car drives itself forward; Brake is at the bottom (Space).</p>
      <button type="button" data-chase="stage">Drive</button><button type="button" class="close" data-chase="skip">Skip to Florence</button></div>`);
  };
  c.action = (a) => {
    if (a === 'stage') { c.status = 'card'; stageCard(c.stage); return true; }
    if (a === 'go') { card(''); c.status = 'count'; c.count = 3; return true; } // 3-2-1, then drive
    if (a === 'drive') { card(''); c.status = 'driving'; return true; }
    if (a === 'retry') { load(c.stage); stageCard(c.stage); c.status = 'card'; return true; }
    if (a === 'next') { load(c.stage + 1); stageCard(c.stage); c.status = 'card'; return true; }
    if (a === 'skip' || a === 'foot') { c.stop(); onDone(); return true; }
    return false;
  };
  c.stop = () => { c.status = 'off'; card(''); $('chase').hidden = true; document.body.classList.remove('chasing'); $('locName').textContent = 'Piazza del Duomo'; };
  function finishStage(why) {
    if (c.stage < PLAY - 1) { c.status = 'card'; card(`<p class="kicker">Stage ${c.stage + 1} of 3 done</p><h2>Still on his tail</h2><p>Gap ${Math.round(c.gap)} m. ${STAGES[c.stage + 1].name} next.</p><button type="button" data-chase="next">Next stage</button>`); return; }
    c.status = 'done';
    const t = Math.round(c.total);
    card(`<p class="kicker">Pienza to Florence</p><div class="stamp ok">${why === 'caught' ? 'CAUGHT UP' : 'IN SIGHT'}</div><h2>${{ caught: 'Right on his bumper', sight: 'He never left your sight' }[why] || 'You followed him all the way'}</h2>
      <p>The off-roader drops into the city and stops near the cathedral. Before he gets out he makes a short call, and you catch one line: “Tell your employer it'll be done by tonight.”</p>
      <p>Leave the car and follow on foot.</p>
      <p class="stat"><span>Time</span><b>${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}</b></p><p class="stat"><span>Closest gap</span><b>${Math.round(c.closest)} m</b></p><p class="stat"><span>Times out of sight</span><b>${c.lostCount}</b></p>
      <button type="button" data-chase="foot">Follow on foot</button>`);
  }

  c.step = (dt, w, h) => {
    const cnt = $('cCount');
    if (c.status === 'count') { c.count -= dt; cnt.textContent = Math.ceil(c.count); if (c.count <= 0) { c.status = 'driving'; cnt.textContent = ''; } }
    if (c.status !== 'driving') { place(); fitCam(false); return; }
    c.clock += dt; c.total += dt;
    const k = input.keys;
    c.steer = (input.right || k.right ? 1 : 0) - (input.left || k.left ? 1 : 0);
    c.brake = input.brakeBtn || k.brake;
    drivePlayer(c.player, c.road, dt, c.steer, c.brake);
    c.gap = c.suv.s - c.player.s;
    driveSUV(c.suv, c.road, dt, c.gap, c.player.v); bump(c.player, c.suv); c.gap = c.suv.s - c.player.s;
    moveTraffic(c.traffic, c.road, dt, c.player);
    if (c.player.crashes !== c.crashes) { c.crashes = c.player.crashes; if (navigator.vibrate) navigator.vibrate(60); }
    fiat.userData.brake(c.brake);
    c.wheel += (c.steer - c.wheel) * Math.min(1, dt * 12); // the steering slider at the bottom follows the steering
    place(); fitCam(false);
    c.closest = Math.min(c.closest, c.gap);
    const onScreen = hud(w, h);
    const seen = c.gap < 400 && onScreen && clearView(c.road, c.player.s - 9, camera.position.y, c.suv.s, c.suv.y + 1.6);
    const before = c.sight.losses;
    if (sightStep(c.sight, seen, dt)) { c.status = 'lost'; card(`<p class="kicker">Pienza to Florence</p><h2>He's gone</h2><p>You lost sight of the off-roader for too long. Try again.</p><button type="button" data-chase="retry">Retry</button><button type="button" class="close" data-chase="skip">Skip to Florence</button>`); }
    if (c.sight.losses > before) c.lostCount++;
    c.streak = seen ? c.streak + dt : 0;
    if (c.status === 'driving') {
      if (c.gap < CATCH_GAP) finishStage('caught');
      else if (c.streak >= WIN_SIGHT) finishStage('sight');
      else if (c.player.s >= c.road.end) finishStage('end');
    }
  };
  // Pausing shows the route north: you and him on the way from Pienza to Florence at the top.
  c.pauseMap = (on) => {
    const m = $('pausedMap'); if (!on) { m.innerHTML = ''; return; }
    const pts = [[70, 250], [55, 175], [90, 105], [80, 30]], f = Math.min(1, c.player.s / c.road.end), g = Math.min(1, c.suv.s / c.road.end);
    const at = (k, t) => [pts[k][0] + (pts[k + 1][0] - pts[k][0]) * t, pts[k][1] + (pts[k + 1][1] - pts[k][1]) * t];
    const along = (t) => { t = Math.min(3, (c.stage + t) * 3 / PLAY); const k = Math.min(2, Math.floor(t)); return at(k, t - k); }, reached = Math.floor((c.stage + f) * 3 / PLAY);
    const [yx, yy] = along(f), [hx, hy] = along(g);
    m.innerHTML = `<svg viewBox="0 0 220 280" class="routemap" aria-label="Route map"><rect width="220" height="280" rx="12" fill="#e9dcbf"/>
      <path d="M0 22 C70 18 120 34 220 26" stroke="#8fb4c8" stroke-width="7" fill="none"/>
      <polyline points="${pts.map((p) => p.join(',')).join(' ')}" fill="none" stroke="#fffaf0" stroke-width="8" stroke-linecap="round"/>
      <polyline points="${pts.slice(0, reached + 1).map((p) => p.join(',')).join(' ')} ${yx},${yy}" fill="none" stroke="#c9a24a" stroke-width="4" stroke-linecap="round"/>
      ${pts.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="6" fill="${i <= reached ? '#c9a24a' : '#f4ecdc'}" stroke="#8a6d2c" stroke-width="2"/>`).join('')}
      <rect x="${hx - 6}" y="${hy - 5}" width="12" height="10" rx="2" fill="#16181b"/><polygon points="${yx},${yy - 8} ${yx + 6},${yy + 6} ${yx},${yy + 2} ${yx - 6},${yy + 6}" fill="#2f6fd0" stroke="#fff" stroke-width="1.2"/>
      <g font-family="Georgia,serif" font-size="12" fill="#262019"><text x="96" y="34">Florence</text><text x="84" y="254">Pienza</text><text x="104" y="109" font-size="10" font-style="italic" fill="#6b5f4c">Chianti</text><text x="72" y="179" font-size="10" font-style="italic" fill="#6b5f4c">Siena road</text></g>
      <text x="12" y="272" font-size="10" fill="#5c5040" font-family="Helvetica">About 45 seconds · a new road every run</text></svg>`;
  };
  c.render = () => { renderer.render(scene, camera); };
  c.resize = (w, h) => { camera.aspect = w / h; camera.fov = w < h ? 64 : 50; camera.updateProjectionMatrix(); };

  // Touch: hold either half of the screen; the Brake button; keys.
  const pointers = new Map();
  const zones = () => { input.left = 0; input.right = 0; for (const x of pointers.values()) { if (x < innerWidth / 2) input.left = 1; else input.right = 1; } };
  const canvas = renderer.domElement;
  canvas.addEventListener('pointerdown', (e) => { if (c.status !== 'driving') return; pointers.set(e.pointerId, e.clientX); zones(); });
  canvas.addEventListener('pointermove', (e) => { if (pointers.has(e.pointerId)) { pointers.set(e.pointerId, e.clientX); zones(); } });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) canvas.addEventListener(ev, (e) => { pointers.delete(e.pointerId); zones(); });
  const brake = $('cBrake');
  brake.addEventListener('pointerdown', (e) => { e.preventDefault(); input.brakeBtn = true; });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) brake.addEventListener(ev, () => { input.brakeBtn = false; });
  const KEYS = { arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right', ' ': 'brake', arrowdown: 'brake', s: 'brake' };
  addEventListener('keydown', (e) => { const k = KEYS[e.key.toLowerCase()]; if (k && c.status !== 'off') { input.keys[k] = true; e.preventDefault(); } });
  addEventListener('keyup', (e) => { const k = KEYS[e.key.toLowerCase()]; if (k) input.keys[k] = false; });
  addEventListener('blur', () => { input.keys = { left: false, right: false, brake: false }; pointers.clear(); zones(); });
  document.addEventListener('click', (e) => { const b = e.target.closest('button[data-chase]'); if (b) c.action(b.dataset.chase); });
  c.input = input; c.toast = toast;
  c.fiat = fiat; // for tests
  return c;
}
