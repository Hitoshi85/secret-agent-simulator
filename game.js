// Secret Agent Simulator: entry module. Builds Florence, runs the main loop and exposes
// window.__agent for the tests (see CLAUDE.md).
import * as THREE from 'three';
import { START, PLACES, areaAt } from './src/world/city.js';
import { walkable, findPath } from './src/world/nav.js';
import { buildCity } from './src/world/buildings.js';
import { buildLandmarks } from './src/world/landmarks.js';
import { makeRenderer, makeScene } from './src/scene.js';
import { makeCamera, fitCamera, updateCamera, cam, PITCH } from './src/camera.js';
import { makeAgent, updateAgent, walkTo, teleport, SPEED_VARIANTS } from './src/agent.js';
import { makeCrowd, updateCrowd } from './src/people/crowd.js';
import { FACE_ATLAS } from './src/people/figure.js';
import { setupUI, showLocation, toast, show } from './src/ui.js';
import { pickCase } from './src/cases/index.js';
import { makeCaseView } from './src/case/view.js';
import { makeSealView } from './src/case/sealview.js';
import { makeNavaids } from './src/navaids.js';
import { makeChase } from './src/chase/chase.js';
import { makeSessionLog, feedbackUrl } from './src/sessionlog.js';
import { makeAudio } from './src/audio.js';

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
if (SPEED_VARIANTS[params.get('variant')]) agent.speedScale = SPEED_VARIANTS[params.get('variant')]; // walk and run speed to try
// The case: Case 02 unless the title's case picker (or ?case=<id>) chooses another. It is built when
// the player leaves the title, so the pick never needs undoing.
let def = pickCase(params.get('case')), caseView = null, navaids = null;
let pending = null; // a case person or thing the agent is walking up to
function pickTitleCase(id) {
  if (caseView) return false;
  def = pickCase(id);
  for (const b of document.querySelectorAll('#cases button')) b.setAttribute('aria-pressed', String(b.dataset.place === def.id));
  return def.id;
}
pickTitleCase(def.id);
function openCase() {
  if (caseView) return;
  caseView = def.kind === 'seals' ? makeSealView({ scene, def, agent }) : makeCaseView({ scene, crowd, def });
  caseView.toast = toast;
  if (def.train) document.getElementById('locSub').textContent = `Firenze · ${def.time} · train ${def.train}`;
  navaids = makeNavaids({ caseView, agent, cam });
}
// Where every case begins: Piazza della Signoria (START).
function toCaseStart() {
  const p = START;
  teleport(agent, p.at, p.face); cam.yaw = agent.heading; cam.pitch = p.pitch ?? START.pitch; pending = null;
  updateCamera(camera, agent, 0, state.clock, true);
  const area = areaAt(agent.x, agent.z); if (area && area !== state.area) { state.area = area; showLocation(area); }
}
const sessionLog = makeSessionLog(); // in memory only, sent nowhere until the player presses Feedback

// Tap marker: a ring that pulses where the agent is heading.
const marker = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.65, 32), new THREE.MeshBasicMaterial({ color: '#f2c14e', transparent: true, opacity: 0, depthWrite: false }));
marker.rotation.x = -Math.PI / 2; marker.position.y = 0.04; scene.add(marker);

const state = { state: 'title', paused: false, map: false, area: areaAt(...START.at), clock: 0 };
const stats = { frames: 0, calls: 0, triangles: 0, people: crowd.length, buildings: city.userData.count, lastWalkFound: null };

const audio = makeAudio();
let lastHeat = 0; // a rise in Heat plays the sting
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
      openCase();
      if (!chase) { chase = makeChase({ renderer, toast, onDone: () => { state.state = 'title'; act('start'); } }); chase.resize(innerWidth, innerHeight); }
      state.state = 'chase'; show('title', false); chase.start(); return true;
    }
    case 'start': if (state.state === 'title') { openCase(); state.state = 'playing'; show('title', false); toCaseStart(); caseView.caseFile(); } return true;
    case 'pick': return state.state === 'title' && pickTitleCase(a); // the title's case picker
    case 'walkTo': {
      if (state.state !== 'playing') return false;
      pending = null; caseView?.hideTalk();
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
    case 'map': if (state.state !== 'playing') return false; state.map = !state.map; show('map', state.map); if (state.map) navaids.drawBig(); return state.map;
    case 'pause': {
      if (state.state !== 'playing' && state.state !== 'chase') return false;
      state.paused = a === 'auto' ? true : !state.paused;
      show('paused', state.paused);
      if (chase) chase.pauseMap(state.state === 'chase' && state.paused);
      document.getElementById('pause').textContent = state.paused ? '▶' : '❚❚';
      audio.pause(state.paused);
      return state.paused;
    }
    case 'phone': if (state.state !== 'playing') return false; if (!caseView.phone()) toast('No messages from your handler'); return true;
    case 'notebook': if (state.state !== 'playing') return false; caseView.notebook(); return true;
    case 'close': caseView?.close(); return true;
    case 'briefed': if (!caseView) return false; if (caseView.def.handler) caseView.handler(); else caseView.close(); return true;
    case 'accuse': { if (!caseView) return false; const live = caseView.c && caseView.c.status === 'open', r = caseView.accuse(a); if (live && r) sessionLog.accused(a, r); return r; }
    case 'dot': if (!caseView) return false; return caseView.dot(a);
    case 'answer': if (!caseView) return false; return caseView.answer ? caseView.answer(a) : null; // seal cases: answer the open question
    case 'guess': if (!caseView) return false; return caseView.guess ? caseView.guess(a) : null;
    case 'ring': if (!caseView) return false; return caseView.ring ? caseView.ring(a) : null; // seal cases: phone a friend about the open seal
    case 'again': if (!caseView) return false; caseView.reset(); sessionLog.caseStarted(state.clock); toCaseStart(); caseView.caseFile(); return true;
    case 'interact': if (!caseView) return false; { const t = caseView.targets.find((q) => q.kind === a && String(q.id) === String(b)); return t ? approach(t) : null; }
    case 'feedback': {
      if (state.state === 'playing' && !state.paused) act('pause');
      watch();
      const context = [`Game version: ${VERSION}`, `Where: ${state.area || 'between places'} (x ${agent.x.toFixed(0)}, z ${agent.z.toFixed(0)})`, `Case: ${def.id}`, `Time of day: ${def.time}`,
        ...sessionLog.summary({ state, c: caseView?.c, chase, clock: state.clock, def })];
      const device = `${innerWidth}x${innerHeight} @${devicePixelRatio}x · ${navigator.userAgent}`;
      const href = feedbackUrl(REPO, context, sessionLog.recent(), device);
      stats.lastFeedbackUrl = href;
      window.open(href, '_blank', 'noopener');
      return true;
    }
    case 'sound': soundLabel(audio.setMuted(!audio.muted)); return !audio.muted;
    case 'turn': cam.yaw += a; cam.lastDrag = state.clock; return true;
  }
  return false;
}

// Buttons inside the case sheets and the talk card.
document.addEventListener('click', (e) => {
  const b = e.target.closest('button[data-case], button[data-dot]'); if (!b) return;
  if (b.dataset.dot) return act('dot', Number(b.dataset.dot));
  const k = b.dataset.case;
  if (k === 'talk') caseView?.hideTalk(); else act(k, Number(b.dataset.suspect));
});

// Every button ticks; the pause screen's sound button shows and flips mute.
document.addEventListener('click', (e) => { if (e.target.closest('button')) audio.tick(); });
const soundLabel = (muted) => { document.getElementById('sound').textContent = muted ? '🔇 Sound off' : '🔊 Sound on'; };
soundLabel(audio.muted);

const runPill = document.getElementById('run');
const readKeys = setupUI({ canvas, act, onTap, onDrag: (dx, dy) => { cam.yaw -= dx * 0.006; cam.pitch = Math.max(PITCH[0], Math.min(PITCH[1], cam.pitch + dy * 0.004)); cam.lastDrag = state.clock; } });

// Advances the simulation by dt seconds (does nothing while paused or on the title), then notes
// what changed in the session log.
const seen = { state, c: null, chase: null, clock: 0 }; // reused every frame
const watch = (dt = 0) => { seen.c = caseView?.c ?? null; seen.chase = chase; seen.clock = state.clock; sessionLog.watch(seen, state.paused || state.map ? 0 : dt); };
function step(dt) { advance(dt); watch(dt); }
function advance(dt) {
  const heat = caseView?.c ? caseView.c.heat : 0;
  if (heat > lastHeat) audio.sting();
  lastHeat = heat;
  if (state.state === 'chase') { if (!state.paused) chase.step(dt, innerWidth, innerHeight); audio.chase(chase); return; }
  audio.chase(null);
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
  audio.walk(agent);
  if (pending && !agent.path) { // arrived: talk to them, or say they moved on
    const t = pending; pending = null; const [x, z] = caseView.where(t);
    if (Math.hypot(x - agent.x, z - agent.z) <= REACH + 2) caseView.interact(t); else toast('They moved on. Tap them again');
  }
  if (!agent.path) marker.material.opacity = Math.max(0, marker.material.opacity - dt * 2);
  updateCrowd(crowd, dt);
  caseView.update?.(dt); // Case 02's stray cats
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
const $id = (id) => document.getElementById(id);
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (!loop.paused) { step(dt); render(); }
  // The piano jazz plays all the time: full on the title and the cards, softer under the car and on foot.
  const driving = state.state === 'chase' && chase && (chase.status === 'driving' || chase.status === 'count');
  audio.bed(true, driving ? 0.55 : state.state === 'playing' && $id('title').hidden ? 0.7 : 1);
  requestAnimationFrame(frame);
}
cam.pitch = START.pitch; updateCamera(camera, agent, 0, 0, true);
showLocation(state.area);
requestAnimationFrame(frame);

// Test hook (see CLAUDE.md). Keep it working when refactoring; add to it for new features.
window.__agent = {
  state, stats, agent, crowd, act, step, render, cam, PLACES,
  get case() { return caseView?.c; }, get caseView() { return caseView; }, get navaids() { return navaids; }, get caseId() { return def.id; }, audio, get chase() { return chase; },
  get paused() { return loop.paused; }, set paused(v) { loop.paused = v; last = performance.now(); },
  setPaused(v) { if (!!v !== state.paused) act('pause'); },
  sessionLog, walkable, findPath, areaAt, version: VERSION, faces: FACE_ATLAS,
};
