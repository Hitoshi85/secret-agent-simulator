// A seal case in the city and on screen: the seals at their landmarks, the seal board (the Notebook),
// one sheet per question format, the word guess and the endings. The rules are in seals.js. It offers
// the same calls as view.js, so game.js and the navaids treat both kinds of case alike.
import * as THREE from 'three';
import { newSealCase, openSeal, answer, letters, guess, canGuess, brokenCount, claim } from './seals.js';
import { lamps } from './quiz.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
const RING_GEO = new THREE.RingGeometry(0.62, 0.78, 32);
const RING_MAT = new THREE.MeshBasicMaterial({ color: '#f2c14e', transparent: true, opacity: 0.9, depthWrite: false });
const STONE_GEO = new THREE.BoxGeometry(0.7, 0.9, 0.7), WAX_GEO = new THREE.CylinderGeometry(0.22, 0.22, 0.05, 20);
const STONE_MAT = new THREE.MeshStandardMaterial({ color: '#cbbd9f' }), WAX_MAT = new THREE.MeshStandardMaterial({ color: '#a8322a' });
const BOOK_GEO = new THREE.BoxGeometry(0.34, 0.08, 0.46), BOOK_MAT = new THREE.MeshStandardMaterial({ color: '#5a2e1a' });
const FORMATS = { choice: 'Multiple choice', number: 'Calculation', text: 'Cipher', order: 'Put in order', match: 'Match pairs', switches: 'Control logic' };
const SEEN_KEY = 'compass-seen';
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function loadSeen() { try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]')); } catch { return new Set(); } }
function saveSeen(seen) { try { localStorage.setItem(SEEN_KEY, JSON.stringify([...seen].slice(-2000))); } catch { /* private mode */ } }

export function makeSealView({ scene, def, random = Math.random, agent }) {
  const v = { def, c: null, targets: [], group: new THREE.Group(), cur: null, input: null };
  scene.add(v.group);
  const seen = loadSeen();

  // A stone post with a wax seal, and the ledger once the word is known; placed anew each play.
  const post = () => { const g = new THREE.Group(); const s = new THREE.Mesh(STONE_GEO, STONE_MAT); s.position.y = 0.45; const w = new THREE.Mesh(WAX_GEO, WAX_MAT); w.position.set(0, 0.6, 0.36); w.rotation.x = Math.PI / 2; g.add(s, w); return g; };
  const ring = () => { const r = new THREE.Mesh(RING_GEO, RING_MAT); r.rotation.x = -Math.PI / 2; r.position.y = 0.035; return r; };
  for (const s of def.subjects) { const mesh = post(), r = ring(); v.group.add(mesh, r); v.targets.push({ kind: 'seal', id: s.id, mesh, ring: r, at: [0, 0] }); }
  const book = new THREE.Mesh(BOOK_GEO, BOOK_MAT), bookRing = ring();
  v.group.add(book, bookRing); v.targets.push({ kind: 'ledger', id: 'ledger', mesh: book, ring: bookRing, at: [0, 0] });

  const place = (t, [x, z]) => { t.at = [x, z]; t.mesh.position.x = x; t.mesh.position.z = z; t.ring.position.x = x; t.ring.position.z = z; if (t.kind === 'ledger') t.mesh.position.y = 0.06; };
  v.reset = () => {
    v.c = newSealCase(def, random, seen);
    for (const t of v.targets) {
      if (t.kind === 'seal') { place(t, v.c.seals.find((s) => s.id === t.id).site.at); t.mesh.visible = t.ring.visible = true; } else { place(t, v.c.word.at); t.mesh.visible = t.ring.visible = false; }
    }
    hud();
  };
  const seal = (id) => v.c.seals.find((s) => s.id === id);

  const hitList = [];
  v.pick = (ray) => {
    hitList.length = 0;
    for (const t of v.targets) if (t.mesh.visible) hitList.push(t.mesh, t.ring);
    const hit = ray.intersectObjects(hitList, true)[0];
    if (!hit) return null;
    return v.targets.find((t) => t.ring === hit.object || t.mesh === hit.object || t.mesh === hit.object.parent) || null;
  };
  v.where = (t) => t.at;
  v.leads = () => v.targets.filter((t) => t.mesh.visible && (t.kind === 'ledger' || !seal(t.id).broken));
  v.interact = (t) => {
    if (v.c.status !== 'open') return null;
    if (t.kind === 'ledger') { claim(v.c); ending(); return 'won'; }
    v.ask(t.id); return 'seal';
  };
  v.hideTalk = () => { $('talk').hidden = true; };
  v.sheetOpen = () => !$('casesheet').hidden;
  const open = (html, cls = '') => { $('caseBody').className = 'sheet case seal ' + cls; $('caseBody').innerHTML = html; $('casesheet').hidden = false; v.hideTalk(); };
  v.close = () => { $('casesheet').hidden = true; v.cur = null; v.guessing = false; };

  v.caseFile = () => open(`<div class="stamp">CASE ${esc(def.number)}</div><p class="kicker">Firenze · ${esc(def.time)}</p>
    <h1>${esc(def.title)}</h1>${def.briefing.map((p) => `<p>${p}</p>`).join('')}
    <ul>${def.tasks.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
    <button type="button" data-case="briefed">Take the case</button>`, 'file');
  v.handler = () => open(`<p class="kicker">Phone · Handler</p>${def.handler.map((m) => `<p class="msg">${m}</p>`).join('')}
    <button type="button" class="close" data-case="close">Got it</button>`, 'gadget');
  v.phone = () => { v.handler(); return true; };
  v.accuse = () => null; v.dot = () => null;

  // The seal board: every seal, its place or format, and the hidden word so far.
  const slotsHtml = () => `<div class="slotline">${letters(v.c).map((ch) => `<span>${ch}</span>`).join('')}</div>`;
  v.notebook = () => {
    const c = v.c, n = brokenCount(c);
    const rows = [...c.seals].sort((a, b) => b.broken - a.broken).map((s) => {
      const d = agent ? Math.round(Math.hypot(s.site.at[0] - agent.x, s.site.at[1] - agent.z) / 10) * 10 : 0;
      return `<div class="hubrow${s.broken ? ' done' : ''}"><span class="wax${s.broken ? '' : ' off'}">${s.broken ? s.letter : '?'}</span>
        <div><b>${esc(s.subject.name)}</b><br><span>${esc(s.site.name)} · ${s.broken ? FORMATS[s.q.format].toLowerCase() : `${d} m`}</span></div>
        <em>${s.broken ? `slot ${s.slot + 1}` : 'open'}</em></div>`;
    }).join('');
    const foot = c.known ? `<p class="small">The ledger is at <b>${esc(c.word.place)}</b>. Follow the gold arrow.</p>`
      : canGuess(c) ? '<button type="button" data-q="guess">Guess the word</button>'
        : `<p class="small">Break ${def.guessAt} seals to guess the word (${n} / ${def.guessAt}).</p>`;
    open(`<p class="kicker">Notebook · seal board</p><h2>Six seals, any order</h2>
      <p class="small">Walk to any seal and tap it. Its question is drawn fresh for this play.</p>${rows}
      <p class="kicker" style="margin-top:10px !important">Hidden word</p>${slotsHtml()}${foot}
      <button type="button" class="close" data-case="close">Close</button>`, 'book');
  };

  // A seal's question.
  v.ask = (id) => {
    const s = openSeal(v.c, id); if (!s) return; v.guessing = false;
    if (v.cur !== id) { v.cur = id; v.input = s.q.format === 'order' ? [...s.q.items] : s.q.format === 'match' ? { pairs: {}, sel: null } : s.q.format === 'switches' ? [0, 0, 0] : s.q.format === 'choice' ? [] : ''; }
    render(s);
  };
  function render(s, msg = '') {
    const q = s.q, done = s.broken;
    let body = '';
    if (q.format === 'choice') body = q.options.map((o, i) => `<button type="button" class="opt${done && i === q.answer ? ' right' : ''}${v.input.includes(i) ? ' wrong' : ''}" data-q="opt" data-i="${i}"><span class="k">${'ABCD'[i]}</span>${esc(o)}</button>`).join('');
    if (q.format === 'number') body = `<div class="entry"><span>${esc(v.input) || '&nbsp;'}</span> ${esc(q.unit)}</div>${pad([...'123456789', '⌫', '0', '.'])}`;
    if (q.format === 'text') body = `<div class="cipher">${q.cipher.split('   ').map((g) => `<span>${esc(g)}</span>`).join(' ')}</div><div class="entry letters">${[...Array(q.answer.length).keys()].map((i) => `<span>${v.input[i] || ''}</span>`).join('')}</div>${pad([...LETTERS, '⌫'], 'abc')}`;
    if (q.format === 'order') body = `<div class="olist">${v.input.map((t, i) => `<div class="orow" data-row="${i}"><span class="grip">⋮⋮</span>${esc(t)}</div>`).join('')}</div><p class="small">Hold and drag a line to move it.</p>`;
    if (q.format === 'match') body = matchHtml(q);
    if (q.format === 'switches') body = circuitHtml(q.circuit, v.input);
    const action = { number: 'Answer', text: 'Decode', order: 'Check order', match: 'Check pairs', switches: 'Turn the key' }[q.format];
    const foot = done
      ? `<div class="reveal"><b>Seal broken: letter ${s.letter}, slot ${s.slot + 1} of ${v.c.seals.length}.</b> ${q.explain}${v.c.known ? `<br><b>All six broken: ${v.c.word.word}.</b> The ledger is at ${esc(v.c.word.place)}.` : ''}</div>
        <button type="button" data-q="board">Back to the seal board</button>`
      : `${msg ? `<p class="qmsg">${msg}</p>` : ''}${v.c.hinted.includes(s.id) ? `<p class="small hint">Hint: ${q.hint}</p>` : ''}
        <div class="qbtns"><button type="button" class="close" data-q="hint">Hint</button>${action ? `<button type="button" data-q="submit">${action}</button>` : ''}</div>
        <button type="button" class="close" data-case="close">Leave it for now</button>`;
    open(`<span class="subj">${esc(s.subject.name)}</span><span class="fmt">${FORMATS[q.format]}</span>
      <h2>${esc(q.title)}</h2><p>${q.prompt}</p>${body}${foot}`, 'quiz');
    if (q.format === 'match') requestAnimationFrame(drawLines);
  }
  const pad = (keys, cls = '') => `<div class="keys ${cls}">${keys.map((k) => `<button type="button" data-q="key" data-k="${k}">${k}</button>`).join('')}</div>`;

  function matchHtml(q) {
    const { pairs, sel } = v.input, used = new Set(Object.values(pairs));
    return `<div class="match"><svg></svg>${q.left.map((l, i) => `<button type="button" class="l${pairs[l] ? ' done' : ''}${sel === l ? ' sel' : ''}" data-q="left" data-i="${i}">${esc(l)}</button><button type="button" class="${used.has(q.right[i]) ? 'done' : ''}" data-q="right" data-i="${i}">${esc(q.right[i])}</button>`).join('')}</div>
      <p class="small">Tap a name, then what goes with it. Tap a name again to undo.</p>`;
  }
  function drawLines() {
    const box = document.querySelector('.match'), svg = box?.querySelector('svg'); if (!svg) return;
    const s = seal(v.cur), b = box.getBoundingClientRect(); let d = '';
    for (const [l, r] of Object.entries(v.input.pairs)) {
      const a = box.querySelector(`[data-q="left"][data-i="${s.q.left.indexOf(l)}"]`).getBoundingClientRect();
      const c = box.querySelector(`[data-q="right"][data-i="${s.q.right.indexOf(r)}"]`).getBoundingClientRect();
      const x1 = a.right - b.left, y1 = a.top + a.height / 2 - b.top, x2 = c.left - b.left, y2 = c.top + c.height / 2 - b.top, m = (x1 + x2) / 2;
      d += `M${x1} ${y1} C${m} ${y1},${m} ${y2},${x2} ${y2} `;
    }
    svg.innerHTML = `<path d="${d}" stroke="#c9a24a" stroke-width="3" fill="none"/>`;
  }

  // The strongbox circuit: gate 1 (A, B) feeds gate 2 with C into Open; gate 3 takes two inputs into Alarm.
  function circuitHtml(c, sw) {
    const Y = [30, 62, 124], name = 'ABC', l = lamps(c, sw);
    const bubble = (x, y) => `<circle cx="${x - 5}" cy="${y}" r="4" fill="#fffaf0"/>`;
    const wire = (i, tx, y, gx, not) => `<path d="M24 ${Y[i]} H${tx} V${y} H${gx - (not ? 9 : 0)}"/>${not ? bubble(gx, y) : ''}<circle cx="${tx}" cy="${Y[i]}" r="2.5" fill="#262019"/>`;
    const gate = (x, y, h, label) => `<rect x="${x}" y="${y}" width="46" height="${h}" rx="5" fill="#fffaf0"/><text x="${x + 23}" y="${y + h / 2 + 4}" stroke="none" fill="#262019" font-size="10" text-anchor="middle">${label}</text>`;
    return `<svg class="circuit" viewBox="0 0 330 186" font-family="Helvetica,Arial" font-weight="700">
      ${Y.map((y, i) => `<text x="6" y="${y + 4}" fill="#262019" font-size="13">${name[i]}</text>`).join('')}
      <g stroke="#262019" stroke-width="2" fill="none">
        ${wire(0, 84, 36, 110)}${wire(1, 90, 56, 110)}<path d="M156 46 H178 V62 H214"/>${wire(2, 184, 90, 214, c.notC)}
        ${wire(c.a[0], 40 + 14 * c.a[0], 142, 214, c.na[0])}${wire(c.a[1], 46 + 14 * c.a[1], 170, 214, c.na[1])}
        ${gate(110, 24, 44, c.g1)}${gate(214, 48, 56, c.g2)}${gate(214, 128, 56, c.g3)}<path d="M260 76 H300 M260 156 H300"/>
      </g>
      <circle cx="312" cy="76" r="10" fill="${l.open ? '#3f7d4a' : '#d8cfbd'}" stroke="#3f7d4a" stroke-width="2"/><circle cx="312" cy="156" r="10" fill="${l.alarm ? '#d9502f' : '#d8cfbd'}" stroke="#a8322a" stroke-width="2"/>
      <text x="300" y="66" fill="#3f7d4a" font-size="10" text-anchor="end">OPEN</text><text x="300" y="146" fill="#a8322a" font-size="10" text-anchor="end">ALARM</text></svg>
      <div class="sw">${sw.map((on, i) => `<button type="button" class="tog${on ? ' on' : ''}" data-q="sw" data-i="${i}" aria-label="Switch ${name[i]}">${name[i]}</button>`).join('')}</div>`;
  }

  // Answers come from the sheet's buttons, or straight from tests through act('answer', value).
  v.answer = (value) => {
    const s = seal(v.cur); if (!s || s.broken) return null;
    const r = answer(v.c, s.id, value); hud();
    if (r === 'right') { saveSeen(seen); for (const t of v.targets) { if (t.id === s.id) t.mesh.children[1].material = STONE_MAT; if (t.kind === 'ledger' && v.c.known) t.mesh.visible = t.ring.visible = true; } }
    if (r === 'lost') ending();
    else render(s, r === 'wrong' ? `Not right. Heat ${v.c.heat} / ${def.maxHeat}: the rivals are closer. Try again.` : '');
    return r;
  };
  const submit = () => {
    const q = seal(v.cur).q;
    return v.answer(q.format === 'match' ? v.input.pairs : v.input);
  };

  v.guessSheet = (msg = '') => {
    if (!canGuess(v.c)) return v.notebook();
    v.cur = null; v.input = v.input && typeof v.input === 'string' && v.guessing ? v.input : ''; v.guessing = true;
    const known = letters(v.c); let k = 0;
    const tiles = known.map((ch) => (ch ? `<span class="got">${ch}</span>` : `<span>${v.input[k++] || ''}</span>`)).join('');
    open(`<span class="subj">Finale</span><span class="fmt">Word puzzle</span><h2>Guess the hiding place</h2>
      <p>Each seal filled its own slot. Fill the gaps. A wrong guess adds Heat (${v.c.heat} / ${def.maxHeat}).</p>
      <div class="entry letters">${tiles}</div>${msg ? `<p class="qmsg">${msg}</p>` : ''}${pad([...LETTERS, '⌫'], 'abc')}
      <div class="qbtns"><button type="button" class="close" data-q="board">Not yet</button><button type="button" data-q="sendguess">Guess</button></div>`, 'quiz');
  };
  v.guess = (w) => {
    const r = guess(v.c, w); hud();
    if (r === 'right') { for (const t of v.targets) if (t.kind === 'ledger') t.mesh.visible = t.ring.visible = true; v.guessing = false; v.input = ''; v.notebook(); v.toast(`${v.c.word.word}: the ledger is at ${v.c.word.place}`); }
    else if (r === 'lost') ending();
    else if (r === 'wrong') { v.input = ''; v.guessSheet(`Not it. Heat ${v.c.heat} / ${def.maxHeat}.`); }
    return r;
  };
  const fullGuess = () => { const known = letters(v.c); let k = 0; return known.map((ch) => ch || v.input[k++] || '').join(''); };

  function ending() {
    const c = v.c, won = c.status === 'won';
    open(won
      ? `<p class="kicker">Case ${esc(def.number)} closed</p><h2>The ledger is yours</h2><p>Under ${esc(c.word.place)}, wrapped in oilcloth: the guild's ledger of inventions, safe from the rivals.</p>
        <p>Seals broken: ${brokenCount(c)} of ${c.seals.length} · Heat: ${c.heat} / ${def.maxHeat}</p><button type="button" data-case="again">Play again (new questions)</button>`
      : `<p class="kicker">Heat is full</p><h2>The rivals got there first</h2><p>Too many wrong answers. The collector's people found the ledger at ${esc(c.word.place)} (the word was ${c.word.word}).</p>
        <button type="button" data-case="again">Try again (new questions)</button>`, 'end');
  }

  // Taps inside the sheets.
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-q]'); if (!b || $('casesheet').hidden) return;
    const k = b.dataset.q, i = Number(b.dataset.i), s = v.cur && seal(v.cur);
    if (k === 'board') { v.guessing = false; return v.notebook(); }
    if (k === 'guess') { v.input = ''; v.guessing = true; return v.guessSheet(); }
    if (v.guessing && k === 'key') { const free = letters(v.c).filter((ch) => !ch).length; v.input = b.dataset.k === '⌫' ? v.input.slice(0, -1) : v.input.length < free ? v.input + b.dataset.k : v.input; return v.guessSheet(); }
    if (k === 'sendguess') return v.guess(fullGuess());
    if (!s || s.broken) return;
    if (k === 'hint') { if (!v.c.hinted.includes(s.id)) v.c.hinted.push(s.id); return render(s); }
    if (k === 'opt') { if (!v.input.includes(i)) { const r = v.answer(i); if (r === 'wrong') { v.input.push(i); render(s, `Not right. Heat ${v.c.heat} / ${def.maxHeat}: the rivals are closer. Try again.`); } } return; }
    if (k === 'key') {
      const max = s.q.format === 'text' ? s.q.answer.length : 8;
      v.input = b.dataset.k === '⌫' ? v.input.slice(0, -1) : v.input.length < max ? v.input + b.dataset.k : v.input;
      return render(s);
    }
    if (k === 'sw') { v.input[i] = 1 - v.input[i]; return render(s); }
    if (k === 'left') { const l = s.q.left[i]; if (v.input.pairs[l]) delete v.input.pairs[l]; else v.input.sel = l; return render(s); }
    if (k === 'right' && v.input.sel) { const r = s.q.right[i]; for (const [l, x] of Object.entries(v.input.pairs)) if (x === r) delete v.input.pairs[l]; v.input.pairs[v.input.sel] = r; v.input.sel = null; return render(s); }
    if (k === 'submit') submit();
  });

  // Dragging lines of an ordering question.
  let drag = null;
  $('caseBody').addEventListener('pointerdown', (e) => {
    const row = e.target.closest('.orow'); if (!row) return;
    drag = Number(row.dataset.row); row.classList.add('lift'); $('caseBody').setPointerCapture(e.pointerId); e.preventDefault();
  });
  $('caseBody').addEventListener('pointermove', (e) => {
    if (drag === null) return;
    const rows = [...document.querySelectorAll('.orow')];
    const to = rows.findIndex((r) => { const b = r.getBoundingClientRect(); return e.clientY >= b.top && e.clientY <= b.bottom; });
    if (to < 0 || to === drag) return;
    const [item] = v.input.splice(drag, 1); v.input.splice(to, 0, item); drag = to;
    const list = document.querySelector('.olist');
    list.innerHTML = v.input.map((t, i) => `<div class="orow${i === drag ? ' lift' : ''}" data-row="${i}"><span class="grip">⋮⋮</span>${esc(t)}</div>`).join('');
  });
  const drop = () => { if (drag === null) return; drag = null; document.querySelectorAll('.orow.lift').forEach((r) => r.classList.remove('lift')); };
  $('caseBody').addEventListener('pointerup', drop); $('caseBody').addEventListener('pointercancel', drop);

  function hud() {
    $('heatBar').style.width = `${Math.max(4, (v.c.heat / def.maxHeat) * 100)}%`;
    $('heatN').textContent = `${v.c.heat} / ${def.maxHeat}`;
    $('locSub').textContent = `Firenze · ${def.time} · broken ${brokenCount(v.c)} of ${v.c.seals.length}`;
  }
  v.toast = () => {};
  v.reset();
  return v;
}
