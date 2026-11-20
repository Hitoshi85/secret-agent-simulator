// Secret Agent Simulator: entry module. Builds Florence, runs the main loop and exposes
// window.__agent for the tests (see CLAUDE.md).
import * as THREE from 'three';
import { START, PLACES, areaAt } from './src/world/city.js';
import { walkable, findPath } from './src/world/nav.js';
import { buildCity } from './src/world/buildings.js';
import { buildLandmarks } from './src/world/landmarks.js';
import { makeRenderer, makeScene } from './src/scene.js';
import { makeCamera, fitCamera, updateCamera, cam, PITCH } from './src/camera.js';
import { makeAgent, updateAgent, walkTo, teleport } from './src/agent.js';
import { makeCrowd, updateCrowd } from './src/people/crowd.js';
import { setupUI, showLocation, toast, show } from './src/ui.js';
import { pickCase } from './src/cases/index.js';
import { makeCaseView } from './src/case/view.js';
import { makeSealView } from './src/case/sealview.js';
import { makeNavaids } from './src/navaids.js';
import { makeChase } from './src/chase/chase.js';

const VERSION = new URL(import.meta.url).searchParams.get('v') || 'local';
const REPO = 'https://github.com/hitoshi85/secret-agent-simulator';
const CROWD = 70;
const REACH = 5; // metres: close enough to talk, pick up or accuse

const canvas = document.getElementById('game');
const renderer = makeRenderer(canvas);
const { scene, sky, followSun } = makeScene();
const camera = makeCamera();
const city = buildCity();
scene.add(city, buildLandmarks());
const agent = makeAgent(scene, START.at, START.face);
const crowd = makeCrowd(scene, CROWD);
const params = new URL(location.href).searchParams;
const def = pickCase(params.get('case'));
const caseView = def.kind === 'seals' ? makeSealView({ scene, def, agent }) : makeCaseView({ scene, crowd, def });
caseView.toast = toast;
if (def.train) document.getElementById('locSub').textContent = `Firenze · ${def.time} · train ${def.train}`;
let pending = null; // a case person or thing the agent is walking up to
const navaids = makeNavaids({ caseView, agent, cam });

// Tap marker: a ring that pulses where the agent is heading.
const marker = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.65, 32), new THREE.MeshBasicMaterial({ color: '#f2c14e', transparent: true, opacity: 0, depthWrite: false }));
marker.rotation.x = -Math.PI / 2; marker.position.y = 0.04; scene.add(marker);

const state = { state: 'title', paused: false, map: false, area: areaAt(...START.at), clock: 0 };
const stats = { frames: 0, calls: 0, triangles: 0, people: crowd.length, buildings: city.userData.count, lastWalkFound: null };

let chase = null; // the opening car chase, built the first time it starts
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false); fitCamera(camera, w, h);
  if (chase) chase.resize(w, h);
}
addEventListener('resize', resize); resize();

const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
function onTap(px, py, run = false) {
  if (state.state !== 'playing' || state.paused || state.map || caseView.sheetOpen()) return;
  const r = canvas.getBoundingClientRect();
  ndc.set(((px - r.left) / r.width) * 2 - 1, -((py - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const t = caseView.pick(ray);
  if (t) return approach(t, run);
  if (!ray.ray.intersectPlane(groundPlane, hit)) return;
  act('walkTo', hit.x, hit.z, run);
}

// Tapped a witness, trace or suspect: act at once when close, otherwise walk up to them first.
function approach(t, run = false) {
  const [x, z] = caseView.where(t);
  if (Math.hypot(x - agent.x, z - agent.z) <= REACH) { pending = null; agent.path = null; return caseView.interact(t); }
  if (!act('walkTo', x, z, run)) return null;
  pending = t; return 'walking';
}

function act(action, a, b, c) {
  switch (action) {
    case 'chase': {
      if (state.state !== 'title') return false;
      if (!chase) { chase = makeChase({ renderer, toast, onDone: () => { state.state = 'title'; act('start'); } }); chase.resize(innerWidth, innerHeight); }
      state.state = 'chase'; show('title', false); chase.start(); return true;
    }
    case 'start': if (state.state === 'title') { state.state = 'playing'; show('title', false); caseView.caseFile(); } return true;
    case 'walkTo': {
      if (state.state !== 'playing') return false;
      pending = null; caseView.hideTalk();
      const ok = walkTo(agent, a, b, c);
      stats.lastWalkFound = ok;
      if (ok) { document.getElementById('hint').classList.add('done'); const end = agent.path[agent.path.length - 1]; marker.position.set(end[0], 0.04, end[1]); marker.material.opacity = 1; }
      else toast('You can’t get there from here');
      return ok;
    }
    case 'jump': {
      const p = PLACES.find((q) => q.id === a); if (!p) return false;
      teleport(agent, p.at, p.face); cam.yaw = agent.heading; cam.pitch = p.pitch ?? -0.05; state.map = false; show('map', false);
      updateCamera(camera, agent, 0, state.clock, true); toast(p.name); return true;
    }
    case 'map': if (state.state === 'chase') return false; state.map = !state.map; show('map', state.map); if (state.map) navaids.drawBig(); return state.map;
    case 'pause': {
      if (state.state !== 'playing' && state.state !== 'chase') return false;
      state.paused = a === 'auto' ? true : !state.paused;
      show('paused', state.paused);
      if (chase) chase.pauseMap(state.state === 'chase' && state.paused);
      document.getElementById('pause').textContent = state.paused ? '▶' : '❚❚';
      return state.paused;
    }
    case 'phone': if (state.state !== 'playing') return false; if (!caseView.phone()) toast('No messages from your handler'); return true;
    case 'notebook': if (state.state !== 'playing') return false; caseView.notebook(); return true;
    case 'close': caseView.close(); return true;
    case 'briefed': if (caseView.def.handler) caseView.handler(); else caseView.close(); return true;
    case 'accuse': return caseView.accuse(a);
    case 'dot': return caseView.dot(a);
    case 'answer': return caseView.answer ? caseView.answer(a) : null; // seal cases: answer the open question
    case 'guess': return caseView.guess ? caseView.guess(a) : null;
    case 'again': caseView.reset(); teleport(agent, START.at, START.face); cam.yaw = agent.heading; cam.pitch = START.pitch; caseView.caseFile(); return true;
    case 'interact': { const t = caseView.targets.find((q) => q.kind === a && String(q.id) === String(b)); return t ? approach(t) : null; }
    case 'feedback': {
      if (state.state === 'playing' && !state.paused) act('pause');
      const context = [`Game version: ${VERSION}`, `Where: ${state.area || 'between places'} (x ${agent.x.toFixed(0)}, z ${agent.z.toFixed(0)})`, `Case: ${def.id}`, `Time of day: ${def.time}`].join('\n');
      const device = `${innerWidth}x${innerHeight} @${devicePixelRatio}x · ${navigator.userAgent}`;
      const u = new URL(`${REPO}/issues/new`);
      u.searchParams.set('template', 'feedback.yml'); u.searchParams.set('labels', 'feedback');
      u.searchParams.set('context', context); u.searchParams.set('device', device);
      window.open(u.href, '_blank', 'noopener');
      return true;
    }
    case 'turn': cam.yaw += a; cam.lastDrag = state.clock; return true;
  }
  return false;
}

// Buttons inside the case sheets and the talk card.
document.addEventListener('click', (e) => {
  const b = e.target.closest('button[data-case], button[data-dot]'); if (!b) return;
  if (b.dataset.dot) return act('dot', Number(b.dataset.dot));
  const k = b.dataset.case;
  if (k === 'talk') caseView.hideTalk(); else act(k, Number(b.dataset.suspect));
});

const runPill = document.getElementById('run');
const readKeys = setupUI({ canvas, act, onTap, onDrag: (dx, dy) => { cam.yaw -= dx * 0.006; cam.pitch = Math.max(PITCH[0], Math.min(PITCH[1], cam.pitch + dy * 0.004)); cam.lastDrag = state.clock; } });

// Advances the simulation by dt seconds (does nothing while paused or on the title).
function step(dt) {
  if (state.state === 'chase') { if (!state.paused) chase.step(dt, innerWidth, innerHeight); return; }
  if (state.state !== 'playing' || state.paused || state.map || caseView.sheetOpen()) { updateCamera(camera, agent, dt, state.clock); return; }
  state.clock += dt;
  const k = readKeys();
  if (k.turn) { cam.yaw += k.turn * dt * 1.8; cam.lastDrag = state.clock; }
  let dir = null;
  if (k.forward || k.right) {
    const fx = Math.sin(cam.yaw), fz = Math.cos(cam.yaw);
    dir = [fx * k.forward - fz * k.right, fz * k.forward + fx * k.right];
  }
  if (dir) pending = null;
  updateAgent(agent, dt, dir, k.run);
  if (pending && !agent.path) { // arrived: talk to them, or say they moved on
    const t = pending; pending = null; const [x, z] = caseView.where(t);
    if (Math.hypot(x - agent.x, z - agent.z) <= REACH + 2) caseView.interact(t); else toast('They moved on. Tap them again');
  }
  if (!agent.path) marker.material.opacity = Math.max(0, marker.material.opacity - dt * 2);
  updateCrowd(crowd, dt);
  navaids.update(dt, innerWidth, innerHeight);
  runPill.classList.toggle('on', agent.running && agent.walking);
  updateCamera(camera, agent, dt, state.clock);
  const area = areaAt(agent.x, agent.z);
  if (area && area !== state.area) { state.area = area; showLocation(area); }
}

function render() {
  if (state.state === 'chase') { chase.render(); stats.frames++; stats.calls = renderer.info.render.calls; stats.triangles = renderer.info.render.triangles; stats.textures = renderer.info.memory.textures; return; }
  followSun(agent.x, agent.z);
  sky.position.copy(camera.position); // the sky always surrounds the camera
  renderer.render(scene, camera);
  stats.frames++;
  stats.calls = renderer.info.render.calls; stats.triangles = renderer.info.render.triangles;
}

let last = performance.now();
const loop = {
  paused: false, // tests set this to drive frames themselves
};
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (!loop.paused) { step(dt); render(); }
  requestAnimationFrame(frame);
}
cam.pitch = START.pitch; updateCamera(camera, agent, 0, 0, true);
showLocation(state.area);
requestAnimationFrame(frame);

// Test hook (see CLAUDE.md). Keep it working when refactoring; add to it for new features.
window.__agent = {
  state, stats, agent, crowd, act, step, render, cam, PLACES,
  get case() { return caseView.c; }, caseView, navaids, get chase() { return chase; },
  get paused() { return loop.paused; }, set paused(v) { loop.paused = v; last = performance.now(); },
  setPaused(v) { if (!!v !== state.paused) act('pause'); },
  walkable, findPath, areaAt, version: VERSION,
};
