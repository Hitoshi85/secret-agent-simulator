// The AI playtester's players (browser side): each plays one mode through window.__agent as a persona
// and returns a timeline. Loaded in the page by tests/playtest/run.js and tests/playtest.spec.js with
// `await import('/tests/playtest/drivers.js')`. Not part of the game (Pages never deploys tests/).
//
// Time is simulated: `t` counts game seconds walked or driven plus the persona's modelled reading and
// thinking time while a card is open (the game holds still then). Reading times, accuracy and steering
// faults are persona settings below, not measurements of real people.

export const PERSONAS = {
  // Reacts late, reads everything, walks to the nearest lead, checks the Notebook, sometimes misreads it.
  novice: {
    run: false, briefing: 25, read: 7, think: 2.5, notebook: 5, question: 45, route: 'nearest',
    phoneWrong: 0.5, misAccuse: 0.25, accuseAfter: 'all', sealFirst: 0.6, sealRetry: 0.8, guessEarly: false,
    drive: { delay: 0, noise: 1, gain: 0.25, dead: 0.12, lapse: 0.3, lapseLen: 0.6, brakeOnSlide: true },
  },
  // Knows the shortest route and the fewest actions: the fastest possible time.
  efficient: {
    run: true, briefing: 8, read: 2, think: 0.5, notebook: 0, question: 20, route: 'best',
    phoneWrong: 0, misAccuse: 0, accuseAfter: 'solved', sealFirst: 1, sealRetry: 1, guessEarly: true,
    drive: { delay: 0, noise: 0, gain: 0.25, dead: 0.08, lapse: 0, lapseLen: 0, brakeOnSlide: false },
  },
  // Taps fast, skips the Notebook, accuses and guesses early.
  careless: {
    run: true, briefing: 3, read: 1, think: 0.3, notebook: 0, question: 10, route: 'nearest',
    phoneWrong: 1, misAccuse: 0, accuseAfter: 2, sealFirst: 0.45, sealRetry: 0.6, guessEarly: true, guessSloppy: 0.3,
    drive: { delay: 0.1, noise: 1, gain: 0.45, dead: 0.05, lapse: 0.4, lapseLen: 0.6, brakeOnSlide: false },
  },
};

const CAP = 1800; // a run stops after 30 simulated minutes

// The persona's own dice, separate from the game's seeded Math.random.
export function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const shuffled = (a, r) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// A run's clock and timeline. `info` marks new information (a clue, a seal, a word), for the longest
// stretch with nothing new.
function newRun(A, mode, persona, seed) {
  const run = { mode, persona, seed, t: 0, events: [], result: null };
  run.log = (type, data = {}) => run.events.push({ t: Math.round(run.t * 10) / 10, type, ...data });
  // Game time passes: step the city (crowd and agent) unless a card holds it still.
  run.wait = (sec) => {
    if (A.caseView.sheetOpen()) { run.t += sec; return; }
    for (let k = 0; k < sec; k += 0.25) { A.step(0.25); run.t += 0.25; }
  };
  run.walk = () => { while (A.agent.path && run.t < CAP) { A.step(0.1); run.t += 0.1; } };
  // Tapping a person or thing walks up to it; a persona that runs double-taps the street next to it first.
  run.go = (t, running) => {
    if (running) { const [x, z] = A.caseView.where(t); if (Math.hypot(x - A.agent.x, z - A.agent.z) > 5 && A.act('walkTo', x, z, true)) run.walk(); }
    const how = A.act('interact', t.kind, t.id); if (how === 'walking') run.walk(); return how;
  };
  return run;
}

// The longest stretch between info events (from the start to the end of the run).
export function longestGap(run) {
  const marks = [0, ...run.events.filter((e) => e.info).map((e) => e.t), run.t];
  let best = { s: 0, from: 'start', to: 'end' };
  const named = ['start', ...run.events.filter((e) => e.info).map((e) => e.what || e.type), 'end'];
  for (let i = 1; i < marks.length; i++) if (marks[i] - marks[i - 1] > best.s) best = { s: Math.round((marks[i] - marks[i - 1]) * 10) / 10, from: named[i - 1], to: named[i] };
  return best;
}

const pathLen = (A, a, b) => {
  const p = A.findPath(a[0], a[1], b[0], b[1]); if (!p) return 1e9;
  let d = 0, x = a[0], z = a[1]; for (const [px, pz] of p) { d += Math.hypot(px - x, pz - z); x = px; z = pz; } return d;
};
const here = (A) => [A.agent.x, A.agent.z];
// Nearest by straight line (what a player sees on the map) or by walking distance.
function nearest(A, list, byPath) {
  let best = null, bd = 1e9;
  for (const t of list) { const d = byPath ? pathLen(A, here(A), t.at) : Math.hypot(t.at[0] - A.agent.x, t.at[1] - A.agent.z); if (d < bd) { bd = d; best = t; } }
  return best;
}
// The shortest order through a few places (tries every order; fine for up to 5).
function bestOrder(A, list) {
  const perms = (a) => (a.length <= 1 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map((p) => [x, ...p])));
  const memo = new Map(), leg = (a, b) => { const k = `${a}|${b}`; if (!memo.has(k)) memo.set(k, pathLen(A, a, b)); return memo.get(k); };
  let best = list, bd = 1e9;
  for (const p of perms(list)) { let d = 0, at = here(A); for (const t of p) { d += leg(at, t.at); at = t.at; } if (d < bd) { bd = d; best = p; } }
  return best;
}

// ---- Case 01, The Dossier ----
export function playDossier(A, name, seed) {
  const P = PERSONAS[name], r = rng(seed * 7919 + 1), run = newRun(A, 'dossier', name, seed);
  window.__reseed(seed); A.act('again');
  run.wait(P.briefing); A.act('briefed'); run.wait(P.read); A.act('close'); run.log('briefed');
  const c = () => A.case, def = A.caseView.def, left = () => c().suspects.filter((s) => !s.out);
  const accused = new Set();
  let misread = false;

  function visit(t) {
    const notes = c().notes.length, out = c().suspects.filter((s) => s.out).length;
    run.go(t, P.run);
    if (t.kind === 'gadget') {
      run.wait(P.read); run.log('picked', { what: t.id });
      const clue = def.clues.find((k) => k.id === t.id);
      A.act('phone'); run.wait(P.think * 4);
      let res = null, tries = 0;
      while (c().picked.includes(t.id) && tries < 6) {
        const order = r() < P.phoneWrong ? shuffled(clue.pattern, r) : clue.pattern;
        for (const d of order) res = A.act('dot', d) || res;
        tries++; run.log('pattern', { result: res }); run.wait(P.think * 2);
      }
      A.act('close');
    } else run.wait(P.read);
    const crossed = c().suspects.filter((s) => s.out).length - out;
    if (c().notes.length > notes) run.log('clue', { what: t.id, info: true, crossed, left: left().length });
    else run.log('visit', { what: t.id, found: false });
    A.caseView.hideTalk();
    if (P.notebook) { A.act('notebook'); run.wait(P.notebook); A.act('close'); run.log('notebook'); }
  }

  function accuse(id) {
    for (let k = 0; k < 20 && run.t < CAP; k++) {
      run.go(A.caseView.targets.find((q) => q.kind === 'suspect' && q.id === id), P.run);
      if (A.caseView.sheetOpen()) break;
      run.wait(P.think); // they moved on: look again
    }
    run.wait(P.think * 2);
    const res = A.act('accuse', id); accused.add(id);
    run.log('accuse', { suspect: id, result: res, heat: c().heat, info: res === 'right' });
    if (res === 'wrong') A.act('close');
    return res;
  }
  // Who to accuse now: the one left, unless the persona misreads the Notebook or is guessing.
  function suspect() {
    const open = left().filter((s) => !accused.has(s.id));
    if (open.length === 1 && !misread && r() < P.misAccuse) { misread = true; // misreads the Notebook, once
      const other = c().suspects.filter((s) => s.out && !accused.has(s.id)); if (other.length) return other[Math.floor(r() * other.length)].id; }
    const pool = open.length ? open : c().suspects.filter((s) => !accused.has(s.id));
    return pool[Math.floor(r() * pool.length)].id;
  }
  // When to accuse: once the clues leave one (efficient), after every lead (novice), or early (careless).
  const ready = (todo) => P.accuseAfter === 'solved' ? left().length === 1 : P.accuseAfter === 'all' ? !todo.length : c().notes.length >= P.accuseAfter;

  let pending = P.route === 'best'
    ? bestOrder(A, A.caseView.leads().filter((t) => def.clues.find((k) => k.id === t.id).firm))
    : null;
  while (c().status === 'open' && run.t < CAP) {
    const leads = A.caseView.leads();
    const todo = pending ? pending.filter((t) => leads.includes(t)) : leads;
    if (ready(todo)) { if (accuse(suspect()) !== 'wrong') break; if (!todo.length) continue; }
    if (!todo.length) { if (accuse(suspect()) !== 'wrong') break; continue; }
    visit(pending ? todo[0] : nearest(A, todo, false));
  }
  run.result = c().status;
  return finish(run, { clues: c().found.length, of: def.clues.length, wrong: c().heat, heat: c().heat });
}

// ---- Case 02, The Compass Ledger (seals) ----
function wrongValue(q, s, r) {
  if (q.format === 'choice') { const opts = [0, 1, 2, 3].filter((i) => i !== q.answer && !s.wrong.includes(i)); return opts[Math.floor(r() * opts.length)]; }
  if (q.format === 'number') return String(q.answer + 1 + Math.floor(r() * 9));
  if (q.format === 'text') return q.answer.split('').reverse().join('') === q.answer ? 'Z'.repeat(q.answer.length) : q.answer.split('').reverse().join('');
  if (q.format === 'order') { const a = [...q.answer]; [a[0], a[1]] = [a[1], a[0]]; return a; }
  if (q.format === 'match') { const l = q.left, m = { ...q.answer }; [m[l[0]], m[l[1]]] = [m[l[1]], m[l[0]]]; return m; }
  if (q.format === 'switches') return q.answer.map((b) => 1 - b);
  return null;
}

export function playSeals(A, name, seed) {
  const P = PERSONAS[name], r = rng(seed * 7919 + 2), run = newRun(A, 'compass', name, seed);
  window.__reseed(seed); try { localStorage.removeItem('compass-seen'); } catch { /* private mode */ }
  A.act('again'); A.case.seen.clear();
  run.wait(P.briefing); A.act('briefed'); run.wait(P.read); A.act('close'); run.log('briefed');
  const c = () => A.case, def = A.caseView.def, v = A.caseView;
  let first = 0, firstRight = 0, wrong = 0;
  const words = () => { const L = c().seals.filter((s) => s.broken); return def.words.filter((w) => L.every((s) => w.word[s.slot] === s.letter)); };

  const walkTo = (t) => run.go(t, P.run);
  function seal(t) {
    walkTo(t); const s = c().seals.find((x) => x.id === t.id);
    if (!s.q) v.ask(s.id);
    for (let k = 0; c().status === 'open' && !s.broken && k < 8; k++) {
      run.wait(k ? P.question / 2 : P.question);
      const right = r() < (k ? P.sealRetry : P.sealFirst);
      const res = A.act('answer', right ? s.q.answer : wrongValue(s.q, s, r));
      if (!k) { first++; if (res === 'right') firstRight++; }
      if (res === 'wrong' || res === 'lost') wrong++;
      run.log('answer', { what: s.id, format: s.q.format, result: res, heat: c().heat, info: res === 'right', try: k + 1 });
    }
    run.wait(P.read); A.act('close');
  }
  function guessWord() {
    const ok = words(), sloppy = P.guessSloppy && r() < P.guessSloppy;
    const pool = sloppy ? def.words.filter((w) => !ok.includes(w)) : ok;
    const w = (pool.length ? pool : ok)[Math.floor(r() * (pool.length || ok.length))];
    A.act('notebook'); run.wait(P.think * 6);
    const res = A.act('guess', w.word);
    run.log('guess', { word: w.word, result: res, heat: c().heat, info: res === 'right', what: 'word' });
    A.act('close');
    return res;
  }

  while (c().status === 'open' && run.t < CAP) {
    const open = v.leads().filter((t) => t.kind === 'seal');
    const broken = c().seals.filter((s) => s.broken).length;
    if (c().known) { const ledger = v.targets.find((t) => t.kind === 'ledger'); walkTo(ledger); run.log('ledger', { info: true, what: 'ledger' }); break; }
    // Efficient guesses once the letters fit one word; careless as soon as it may; novice breaks all six.
    if (broken >= def.guessAt && P.guessEarly && (name === 'careless' || words().length === 1)) { guessWord(); continue; }
    if (!open.length) break;
    seal(nearest(A, open, P.route === 'best'));
  }
  run.result = c().status;
  return finish(run, { seals: c().seals.filter((s) => s.broken).length, wrong, heat: c().heat, first, firstRight });
}

// ---- The car chase ----
export function playChase(A, name, seed, maxTries = 5) {
  const P = PERSONAS[name].drive, r = rng(seed * 7919 + 3), run = newRun(A, 'chase', name, seed), C = A.chase, dt = 1 / 30;
  window.__reseed(seed); C.start(); C.seed = seed; C.action('retry'); // this seed's road
  const tries = [];
  let lowest = 1, outLongest = 0;
  for (let k = 0; k < maxTries; k++) {
    C.action('go'); for (let i = 0; i < 100 && C.status === 'count'; i++) { A.step(0.05); run.t += 0.05; }
    let low = 1, out = 0, outMax = 0, wobble = 0, slide = 0, steer = 0, late = 0, lapse = 0;
    const crashes0 = C.player.crashes, start = run.t;
    while (C.status === 'driving' && run.t < CAP) {
      const p = C.player;
      // The efficient driver is the lane-keeping autopilot of tests/chase.spec.js. The others aim a little
      // off the lane now and then and look away for a moment (reaction delay: the keys stay as they were);
      // the careless one also lets go of a turn late. (Letting go 0.15 s late on average loses almost
      // every run: the car turns fast, so that alone makes it weave out of control.)
      if (r() < 0.02) wobble = (r() - 0.5) * 2 * P.noise;
      const want = (1.1 + wobble - p.d) * P.gain - p.psi * 2.5, ideal = want < -P.dead ? -1 : want > P.dead ? 1 : 0;
      if (lapse > 0) lapse -= dt;
      else if (r() < P.lapse * dt) lapse = P.lapseLen * (0.5 + r());
      else if (late > 0) late -= dt;
      else if (ideal !== steer) { if (steer && !ideal && P.delay && r() < 0.5) late = P.delay * (0.5 + r()); else steer = ideal; }
      C.input.keys.left = steer < 0; C.input.keys.right = steer > 0;
      slide = P.brakeOnSlide && Math.abs(p.psi) > 0.35 ? 0.5 : Math.max(0, slide - dt);
      C.input.keys.brake = slide > 0;
      A.step(dt); run.t += dt;
      low = Math.min(low, C.sight.value);
      out = C.sight.visible ? 0 : out + dt; outMax = Math.max(outMax, out);
    }
    C.input.keys = { left: false, right: false, brake: false };
    const card = document.getElementById('chaseBody').textContent;
    const why = C.status === 'done' ? (card.includes('CAUGHT UP') ? 'caught' : card.includes('never left') ? 'sight' : 'end') : C.status;
    const tr = { try: k + 1, result: why, s: Math.round((run.t - start) * 10) / 10, lowestSight: Math.round(low * 100) / 100, longestOut: Math.round(outMax * 10) / 10, crashes: C.player.crashes - crashes0, closest: Math.round(C.closest) };
    tries.push(tr); lowest = Math.min(lowest, low); outLongest = Math.max(outLongest, outMax);
    run.log('drive', { ...tr, info: C.status === 'done' });
    if (C.status === 'done') break;
    run.t += 3; C.action('retry'); // reading the card and pressing Retry
  }
  run.result = C.status === 'done' ? 'won' : 'gave up';
  // In the chase the dead time that matters is how long he stays out of sight.
  return finish(run, { longestOut: outLongest, tries: tries.length, retries: tries.length - (run.result === 'won' ? 1 : 0), lowestSight: Math.round(lowest * 100) / 100, perTry: tries });
}

function finish(run, extra) {
  const gap = longestGap(run);
  delete run.log; delete run.wait; delete run.walk; delete run.go;
  const chase = run.mode === 'chase';
  return { ...run, t: Math.round(run.t * 10) / 10, ...extra, longestNoInfo: chase ? Math.round(extra.longestOut * 10) / 10 : gap.s, longestNoInfoBetween: chase ? ['out of sight', 'back in sight'] : [gap.from, gap.to] };
}

export const PLAY = { dossier: playDossier, compass: playSeals, chase: playChase };
