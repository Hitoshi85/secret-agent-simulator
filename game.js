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

const VERSION = new URL(import.meta.url).searchParams.get('v') || 'local';
const REPO = 'https://github.com/hitoshi85/secret-agent-simulator';
const CROWD = 70;

const canvas = document.getElementById('game');
const renderer = makeRenderer(canvas);
const { scene, sky, followSun } = makeScene();
const camera = makeCamera();
const city = buildCity();
scene.add(city, buildLandmarks());
const agent = makeAgent(scene, START.at, START.face);
const crowd = makeCrowd(scene, CROWD);

// Tap marker: a ring that pulses where the agent is heading.
const marker = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.65, 32), new THREE.MeshBasicMaterial({ color: '#f2c14e', transparent: true, opacity: 0, depthWrite: false }));
marker.rotation.x = -Math.PI / 2; marker.position.y = 0.04; scene.add(marker);

const state = { state: 'title', paused: false, map: false, area: areaAt(...START.at), clock: 0 };
const stats = { frames: 0, calls: 0, triangles: 0, people: crowd.length, buildings: city.userData.count, lastWalkFound: null };

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false); fitCamera(camera, w, h);
}
addEventListener('resize', resize); resize();

const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
function onTap(px, py) {
  if (state.state !== 'playing' || state.paused || state.map) return;
  const r = canvas.getBoundingClientRect();
  ndc.set(((px - r.left) / r.width) * 2 - 1, -((py - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  if (!ray.ray.intersectPlane(groundPlane, hit)) return;
  act('walkTo', hit.x, hit.z);
}

function act(action, a, b) {
  switch (action) {
    case 'start': if (state.state === 'title') { state.state = 'playing'; show('title', false); } return true;
    case 'walkTo': {
      if (state.state !== 'playing') return false;
      const ok = walkTo(agent, a, b);
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
    case 'map': state.map = !state.map; show('map', state.map); return state.map;
    case 'pause': {
      if (state.state !== 'playing') return false;
      state.paused = a === 'auto' ? true : !state.paused;
      show('paused', state.paused);
      document.getElementById('pause').textContent = state.paused ? '▶' : '❚❚';
      return state.paused;
    }
    case 'phone': toast('Phone: your handler’s messages arrive in a later build'); return true;
    case 'case': toast('Case board: coming with the first case'); return true;
    case 'feedback': {
      if (state.state === 'playing' && !state.paused) act('pause');
      const context = [`Game version: ${VERSION}`, `Where: ${state.area || 'between places'} (x ${agent.x.toFixed(0)}, z ${agent.z.toFixed(0)})`, 'Time of day: 17:40'].join('\n');
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

const readKeys = setupUI({ canvas, act, onTap, onDrag: (dx, dy) => { cam.yaw -= dx * 0.006; cam.pitch = Math.max(PITCH[0], Math.min(PITCH[1], cam.pitch + dy * 0.004)); cam.lastDrag = state.clock; } });

// Advances the simulation by dt seconds (does nothing while paused or on the title).
function step(dt) {
  if (state.state !== 'playing' || state.paused || state.map) { updateCamera(camera, agent, dt, state.clock); return; }
  state.clock += dt;
  const k = readKeys();
  if (k.turn) { cam.yaw += k.turn * dt * 1.8; cam.lastDrag = state.clock; }
  let dir = null;
  if (k.forward || k.right) {
    const fx = Math.sin(cam.yaw), fz = Math.cos(cam.yaw);
    dir = [fx * k.forward - fz * k.right, fz * k.forward + fx * k.right];
  }
  updateAgent(agent, dt, dir);
  if (!agent.path) marker.material.opacity = Math.max(0, marker.material.opacity - dt * 2);
  updateCrowd(crowd, dt);
  updateCamera(camera, agent, dt, state.clock);
  const area = areaAt(agent.x, agent.z);
  if (area && area !== state.area) { state.area = area; showLocation(area); }
}

function render() {
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
  get paused() { return loop.paused; }, set paused(v) { loop.paused = v; last = performance.now(); },
  setPaused(v) { if (!!v !== state.paused) act('pause'); },
  walkable, findPath, areaAt, version: VERSION,
};
