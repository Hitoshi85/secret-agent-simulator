// A case in the city and on screen: witnesses, traces and suspects as people and things you can tap,
// and the case file, talk card, notebook, phone puzzle and endings. The rules are in engine.js.
import * as THREE from 'three';
import { makeFigure, randomLook, setPose } from '../people/figure.js';
import { newCase, learn, pickUp, crack, accuse, describe, suspectLook } from './engine.js';

const $ = (id) => document.getElementById(id);
const RING_GEO = new THREE.RingGeometry(0.62, 0.78, 32);
const RING_MAT = new THREE.MeshBasicMaterial({ color: '#f2c14e', transparent: true, opacity: 0.9, depthWrite: false });
const esc = (s) => String(s).replace(/[&<>]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[ch]);

export function makeCaseView({ scene, crowd, def, random = Math.random }) {
  const v = { def, c: null, targets: [], suspectPeople: [], group: new THREE.Group(), order: [], gadget: null };
  scene.add(v.group);

  // Witnesses and traces stay put; build them once.
  for (const clue of def.clues) {
    const [x, z] = clue.at;
    let mesh;
    if (clue.kind === 'witness') {
      mesh = makeFigure(randomLook({ ...clue.look, scale: 1 }));
      mesh.rotation.y = Math.atan2(-clue.face[0], -clue.face[1]); setPose(mesh, 0.25);
    } else {
      mesh = new THREE.Mesh(new THREE.BoxGeometry(clue.kind === 'gadget' ? 0.09 : 0.12, 0.02, clue.kind === 'gadget' ? 0.17 : 0.2),
        new THREE.MeshStandardMaterial({ color: clue.kind === 'gadget' ? '#15171c' : '#f4f1ea' }));
      mesh.position.y = 0.02;
    }
    mesh.position.x = x; mesh.position.z = z;
    const ring = new THREE.Mesh(RING_GEO, RING_MAT);
    ring.rotation.x = -Math.PI / 2; ring.position.set(x, 0.035, z);
    v.group.add(mesh, ring);
    v.targets.push({ kind: clue.kind, id: clue.id, mesh, ring, at: clue.at });
  }

  // A new case: a fresh thief and suspects, every clue back in place.
  v.reset = () => {
    for (const p of v.suspectPeople) { scene.remove(p.mesh); crowd.splice(crowd.indexOf(p), 1); }
    v.suspectPeople = []; v.targets = v.targets.filter((t) => t.kind !== 'suspect');
    v.c = newCase(def, random);
    for (const t of v.targets) { t.mesh.visible = true; t.ring.visible = true; }
    for (const s of v.c.suspects) {
      const mesh = makeFigure(randomLook({ ...suspectLook(def, s), scale: 1 }));
      const [hx, hz] = s.haunt.at;
      mesh.position.set(hx + (random() - 0.5) * 6, 0, hz + (random() - 0.5) * 6);
      scene.add(mesh);
      const person = { mesh, target: null, speed: 1.1, wait: random() * 3, phase: random(), home: s.haunt.at, range: s.haunt.range };
      crowd.push(person); v.suspectPeople.push(person);
      v.targets.push({ kind: 'suspect', id: s.id, mesh });
    }
    hud();
  };

  // What a tap hit: the nearest case person or thing along the ray, or null.
  const hitList = [];
  v.pick = (ray) => {
    hitList.length = 0;
    for (const t of v.targets) if (t.mesh.visible) { hitList.push(t.mesh); if (t.ring) hitList.push(t.ring); }
    const hit = ray.intersectObjects(hitList, false)[0];
    return hit ? v.targets.find((t) => t.mesh === hit.object || t.ring === hit.object) : null;
  };
  v.where = (t) => [t.mesh.position.x, t.mesh.position.z];

  // Talking to someone or picking something up.
  v.interact = (t) => {
    const c = v.c; if (c.status !== 'open') return null;
    if (t.kind === 'suspect') { confirm(t.id); return 'confirm'; }
    if (t.kind === 'gadget') {
      const clue = pickUp(c, t.id); t.mesh.visible = false; t.ring.visible = false;
      talk(`Trace · ${clue.what}`, clue.says());
      return 'picked';
    }
    const before = c.suspects.filter((s) => s.out).length;
    const r = learn(c, t.id);
    if (t.kind === 'trace') { t.mesh.visible = false; t.ring.visible = false; }
    const crossed = c.suspects.filter((s) => s.out).length - before;
    const note = r.fresh ? `Added to your notebook: ${esc(c.notes[c.notes.length - 1])}.${crossed ? ` ${crossed} suspect${crossed > 1 ? 's' : ''} crossed out.` : ''}` : 'Already in your notebook.';
    talk(r.clue.who ? `Witness · ${r.clue.who}` : `Trace · ${r.clue.what}`, r.text, note);
    return 'learned';
  };

  function talk(label, text, note) {
    $('talkWho').textContent = label;
    $('talkText').innerHTML = text;
    $('talkNote').innerHTML = note || '';
    $('talkNote').hidden = !note;
    $('talk').hidden = false;
  }
  v.hideTalk = () => { $('talk').hidden = true; };

  // Sheets over the city (the game holds still while one is open).
  v.sheetOpen = () => !$('casesheet').hidden;
  const open = (html, cls = '') => { $('caseBody').className = 'sheet case ' + cls; $('caseBody').innerHTML = html; $('casesheet').hidden = false; v.hideTalk(); };
  v.close = () => { $('casesheet').hidden = true; };

  v.caseFile = () => open(`<div class="stamp">CASE ${esc(def.number)}</div><p class="kicker">Firenze · ${esc(def.time)}</p>
    <h1>${esc(def.title)}</h1>${def.briefing.map((p) => `<p>${p}</p>`).join('')}
    <ul>${def.tasks.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
    <button type="button" data-case="close">Take the case</button>`, 'file');

  v.notebook = () => {
    const c = v.c;
    const fig = (s) => {
      const L = suspectLook(def, s);
      return `<span class="fig">${L.hat ? `<i class="hat" style="background:${L.hat}"></i>` : ''}<i class="hd"></i><i class="bd" style="background:${L.top}"></i>${L.bag ? `<i class="bg" style="background:${L.bag}"></i>` : ''}<i class="lg"></i></span>`;
    };
    const cards = c.suspects.map((s) => {
      const [first, ...rest] = describe(def, s).split(', ');
      return `<div class="card${s.out ? ' out' : ''}" data-suspect="${s.id}">${fig(s)}<span><b>${esc(first)}</b><br>${esc(rest.join(', '))}<br>seen: ${esc(s.haunt.name)}</span></div>`;
    }).join('');
    const left = c.suspects.filter((s) => !s.out).length;
    open(`<p class="kicker">Notebook</p><h2>Suspects · ${left} left</h2><div class="cards">${cards}</div>
      <h2>Clues · ${c.notes.length}</h2>${c.notes.length ? c.notes.map((n) => `<p class="clue">${esc(n)}</p>`).join('') : '<p class="clue">Nothing yet. Witnesses and traces have gold rings.</p>'}
      ${c.picked.length ? '<p class="clue">A locked phone in your pocket. Open your Phone to crack it.</p>' : ''}
      <p class="small">Firm clues cross suspects out. Unsure ones are yours to weigh. When you’re sure, tap the person in the crowd to accuse them.</p>
      <button type="button" class="close" data-case="close">Close</button>`, 'book');
  };

  function confirm(i) {
    const s = v.c.suspects[i];
    open(`<p class="kicker">Accuse</p><h2>${esc(describe(def, s))}</h2>
      <p>${s.out ? 'Your notes say it isn’t them. ' : ''}A wrong accusation raises Heat (${v.c.heat} / ${def.maxHeat}).</p>
      <button type="button" data-case="accuse" data-suspect="${i}">Accuse</button>
      <button type="button" class="close" data-case="close">Not yet</button>`);
  }

  v.accuse = (i) => {
    const r = accuse(v.c, i); hud();
    if (r === 'right') ending(true);
    else if (r === 'lost') ending(false);
    else { v.close(); v.toast(`Wrong person. Heat ${v.c.heat} / ${def.maxHeat}.`); }
    return r;
  };

  function ending(won) {
    const c = v.c, wrong = c.heat;
    open(won
      ? `<p class="kicker">Case ${esc(def.number)} closed</p><h2>Dossier recovered</h2>
        <p>The thief (${esc(describe(def, c.suspects[c.thief]).toLowerCase())}) hands it over without a scene.</p>
        <p>Clues found: ${c.found.length} of ${def.clues.length} · wrong accusations: ${wrong}</p>
        <button type="button" data-case="again">Play again (new thief)</button>`
      : `<p class="kicker">Heat is full</p><h2>The thief got away</h2>
        <p>Too many wrong accusations. The thief (${esc(describe(def, c.suspects[c.thief]).toLowerCase())}) noticed you and left for the ${esc(def.train)} at Santa Maria Novella.</p>
        <p class="small">Chasing them at the station comes in a later build.</p>
        <button type="button" data-case="again">Try again (new thief)</button>`, 'end');
  }

  // The phone gadget: a 3 x 3 unlock pattern. Smudges show which dots; tap them in order.
  v.phone = () => {
    const id = v.c.picked[0]; if (!id) return false;
    const clue = def.clues.find((k) => k.id === id);
    v.gadget = id; v.order = [];
    open(`<p class="kicker">Gadget · unlock</p><h2>${esc(clue.what)}</h2>
      <p>Smudges show ${clue.pattern.length} dots. Find the order: it starts top left and each step goes to a dot next to it.</p>
      <div class="pad">${[...Array(9).keys()].map((d) => `<button type="button" class="dot${clue.pattern.includes(d) ? ' smudge' : ''}" data-dot="${d}" aria-label="Dot ${d + 1}"></button>`).join('')}</div>
      <p class="small" id="padMsg">${v.c.tries[id]} tries before it locks.</p>
      <button type="button" class="close" data-case="close">Close</button>`, 'gadget');
    return true;
  };
  v.dot = (d) => {
    const id = v.gadget; if (!id || v.order.includes(d)) return null;
    const clue = def.clues.find((k) => k.id === id);
    v.order.push(d);
    document.querySelector(`.dot[data-dot="${d}"]`)?.classList.add('on');
    if (v.order.length < clue.pattern.length) return null;
    const r = crack(v.c, id, v.order); v.order = [];
    if (r === 'open') {
      const res = learn(v.c, id); hud();
      open(`<p class="kicker">Unlocked</p><h2>Last message</h2><p class="msg">${res.text}</p>
        <p class="small">Added to your notebook: ${esc(v.c.notes[v.c.notes.length - 1])}.</p>
        <button type="button" class="close" data-case="close">Close</button>`, 'gadget');
    } else if (r === 'locked') {
      open('<p class="kicker">Locked</p><h2>The phone locked itself</h2><p>Too many wrong patterns. Whatever was on it is gone.</p><button type="button" class="close" data-case="close">Close</button>', 'gadget');
    } else {
      document.querySelectorAll('.dot.on').forEach((e) => e.classList.remove('on'));
      $('padMsg').textContent = `Wrong order. ${v.c.tries[id]} ${v.c.tries[id] === 1 ? 'try' : 'tries'} left.`;
    }
    return r;
  };

  function hud() {
    const c = v.c;
    $('heatBar').style.width = `${Math.max(4, (c.heat / def.maxHeat) * 100)}%`;
    $('heatN').textContent = `${c.heat} / ${def.maxHeat}`;
  }
  v.toast = () => {}; // game.js plugs in the HUD toast
  v.reset();
  return v;
}
