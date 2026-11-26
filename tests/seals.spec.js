// Seal cases (Case 02, The Compass Ledger): every question generator gives a fair question with one
// right answer, questions vary from play to play and seen ones are avoided, seals open in any order,
// the word guess unlocks at four seals, and the case plays end to end in the city.
const { test, expect } = require('@playwright/test');

async function open(page, url = '/index.html?case=compass') {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url);
  await page.waitForFunction(() => window.__agent && window.__agent.stats.frames > 2, null, { timeout: 60000 });
  await page.evaluate(() => { localStorage.clear(); window.__agent.paused = true; window.__agent.act('start'); });
  return errors;
}

test('every subject makes fair questions with one right answer; seen ones are avoided; seals stand on streets', async ({ page }) => {
  await open(page);
  const r = await page.evaluate(async () => {
    const Q = await import('/src/case/quiz.js');
    const def = (await import('/src/cases/compass.js')).default;
    const problems = [], ids = {}, formats = {};
    for (const s of [...def.subjects, ...def.shelved]) { // shelved engineering subjects stay fair too
      ids[s.id] = new Set(); formats[s.id] = new Set();
      for (let n = 0; n < 300; n++) {
        const q = Q.makeQuestion(s); ids[s.id].add(q.id); formats[s.id].add(q.format);
        const bad = (m) => problems.push(`${s.id} ${q.id}: ${m}`);
        if (!q.prompt || !q.explain || !q.hint || !q.title) bad('missing text');
        if (q.format === 'choice') {
          if (new Set(q.options).size !== 4) bad('options repeat');
          if (!Q.isRight(q, q.answer) || q.options.filter((_, i) => Q.isRight(q, i)).length !== 1) bad('not one right option');
        }
        if (q.format === 'number' && !(Number.isFinite(q.answer) && q.answer > 0 && Q.isRight(q, String(q.answer)) && !Q.isRight(q, q.answer + 1))) bad('number');
        if (q.format === 'text' && !(Q.isRight(q, q.answer.toLowerCase()) && !Q.isRight(q, q.cipher) && /^[A-Z]+$/.test(q.answer))) bad('cipher');
        if (q.format === 'order' && !(q.items.length === 5 && new Set(q.items).size === 5 && Q.isRight(q, q.answer) && !Q.isRight(q, [...q.answer].reverse()))) bad('order');
        if (q.format === 'match' && !(q.left.length === 4 && new Set(q.right).size === 4 && Q.isRight(q, q.answer))) bad('match');
        if (q.format === 'switches') {
          let good = 0; for (let k = 0; k < 8; k++) if (Q.isRight(q, [(k >> 2) & 1, (k >> 1) & 1, k & 1])) good++;
          if (good !== 1 || !Q.isRight(q, q.answer)) bad(`${good} safe settings`);
        }
      }
    }
    const seen = new Set();
    for (const s of def.subjects) for (let n = 0; n < 5; n++) { const q = Q.makeQuestion(s, Math.random, seen); if (seen.has(q.id)) problems.push(`${q.id} asked again`); seen.add(q.id); }
    for (const p of [...def.sites, ...def.words]) if (!window.__agent.walkable(p.at[0], p.at[1])) problems.push(`${p.name || p.word} is off the street`);
    return { problems: problems.slice(0, 5), ids: Object.fromEntries(Object.entries(ids).map(([k, v]) => [k, v.size])), formats: Object.fromEntries(Object.entries(formats).map(([k, v]) => [k, [...v].sort()])) };
  });
  expect(r.problems).toEqual([]);
  for (const [s, n] of Object.entries(r.ids)) expect(n, `${s} questions vary`).toBeGreaterThan(20);
  expect(r.formats.elec).toEqual(['number', 'switches']);
  expect(r.formats.military).toEqual(['choice', 'text']);
  expect(r.formats.world).toEqual(['choice', 'order']);
});

test('engineering seals are hidden for now, still six seals; ?eng brings them back', async ({ page }) => {
  const errors = await open(page);
  const ids = () => page.evaluate(() => window.__agent.case.seals.map((s) => s.id).sort());
  const off = await ids();
  await open(page, '/index.html?case=compass&eng');
  const on = await ids();
  expect(off).toEqual(['art', 'art2', 'military', 'tech', 'world', 'world2']);
  expect(on).toEqual(['art', 'elec', 'mech', 'military', 'tech', 'world']);
  expect(errors).toEqual([]);
});

test('the banks are big and clean: 40 facts per subject, 100+ events, unique pairs', async ({ page }) => {
  await open(page);
  const r = await page.evaluate(async () => {
    const { FACTS } = await import('/src/cases/compass-facts.js');
    const { BANKS } = await import('/src/cases/compass.js');
    const bad = [], ids = new Set();
    for (const [k, list] of Object.entries(FACTS)) for (const f of list) {
      if (ids.has(f.id)) bad.push(`${f.id} twice`); ids.add(f.id);
      if (!f.q || !f.a || !f.why || f.wrong.length < 4 || new Set([f.a, ...f.wrong]).size !== f.wrong.length + 1) bad.push(`${k} ${f.id}`);
    }
    const texts = BANKS.EVENTS.map((e) => e[1]);
    if (new Set(texts).size !== texts.length) bad.push('an event appears twice');
    for (const b of [BANKS.INVENTIONS, BANKS.ARTWORKS]) if (new Set(b.map((p) => p[0])).size !== b.length || new Set(b.map((p) => p[1])).size !== b.length) bad.push('a pair repeats');
    return { bad, counts: Object.values(FACTS).map((l) => l.length), events: BANKS.EVENTS.length };
  });
  expect(r.bad).toEqual([]);
  expect(r.counts).toEqual([40, 40, 40, 40]);
  expect(r.events).toBeGreaterThanOrEqual(100);
});

test('the hidden word: 20 six-letter place words, none repeats until every one is played', async ({ page }) => {
  await open(page);
  const r = await page.evaluate(async () => {
    const S = await import('/src/case/seals.js');
    const def = (await import('/src/cases/compass.js')).default;
    const bad = [], seen = new Set(), run = [];
    if (new Set(def.words.map((w) => w.word)).size !== def.words.length) bad.push('a word appears twice');
    for (const w of def.words) if (!/^[A-Z]{6}$/.test(w.word) || !w.place) bad.push(`${w.word} is not a six-letter place word`);
    for (let n = 0; n < def.words.length * 3; n++) run.push(S.newSealCase(def, Math.random, seen).word.word);
    for (let k = 0; k < 3; k++) if (new Set(run.slice(k * def.words.length, (k + 1) * def.words.length)).size !== def.words.length) bad.push(`round ${k + 1} repeats a word`);
    for (let n = 1; n < run.length; n++) if (run[n] === run[n - 1]) bad.push(`${run[n]} twice in a row`);
    // The page remembers played words on the phone, and the next play picks another.
    const first = window.__agent.case.word.word, stored = JSON.parse(localStorage.getItem('compass-seen'));
    window.__agent.act('again');
    return { bad, count: def.words.length, stored: stored.includes('word:' + first), next: window.__agent.case.word.word !== first };
  });
  expect(r.bad).toEqual([]);
  expect(r.count).toBeGreaterThanOrEqual(20);
  expect(r.stored).toBe(true);
  expect(r.next).toBe(true);
});

test('the compass case plays end to end: any order, Heat, guess at four seals, the ledger', async ({ page }) => {
  const errors = await open(page);
  await page.evaluate(() => window.__agent.act('briefed'));
  await expect(page.locator('#caseBody')).toContainText('Handler');
  const r = await page.evaluate(() => {
    const A = window.__agent, v = A.caseView, c = A.case, out = {};
    out.leads = v.leads().length;
    const order = [...c.seals].reverse(); // any order works
    v.ask(order[0].id);
    const q = order[0].q;
    const wrong = q.format === 'choice' ? (q.answer + 1) % 4 : q.format === 'number' ? q.answer + 7 : q.format === 'text' ? 'ZZZ' : q.format === 'switches' ? q.answer.map((b) => 1 - b) : q.format === 'order' ? [...q.answer].reverse() : Object.fromEntries(q.left.map((l, i) => [l, q.answer[q.left[(i + 1) % 4]]]));
    out.wrong = A.act('answer', wrong); out.heat = c.heat;
    out.lockedGuess = A.act('guess', c.word.word);
    for (const s of order.slice(0, 4)) { v.ask(s.id); out[s.id] = A.act('answer', s.q.answer); }
    v.notebook(); out.board = document.getElementById('caseBody').textContent.includes('Guess the word');
    out.leadsLeft = v.leads().length;
    out.badGuess = A.act('guess', 'QQQQQQ'); out.heat2 = c.heat;
    out.guess = A.act('guess', c.word.word);
    const ledger = v.targets.find((t) => t.kind === 'ledger');
    out.ledger = ledger.mesh.visible && v.leads().includes(ledger);
    out.end = v.interact(ledger); out.status = c.status; out.endText = document.getElementById('caseBody').textContent;
    v.ask(c.seals[0].id); A.act('again'); out.fresh = v.cur === null; // a new play never reuses the last play's input
    out.seen = JSON.parse(localStorage.getItem('compass-seen')).filter((id) => !id.startsWith('word:')).length; // questions answered
    return out;
  });
  expect(r.leads).toBe(6);
  expect(r.wrong).toBe('wrong'); expect(r.heat).toBe(1);
  expect(r.lockedGuess).toBe('locked');
  expect(r.board).toBe(true);
  expect(r.leadsLeft).toBe(2);
  expect(r.badGuess).toBe('wrong'); expect(r.heat2).toBe(2);
  expect(r.guess).toBe('right'); expect(r.ledger).toBe(true);
  expect(r.end).toBe('won'); expect(r.status).toBe('won');
  expect(r.seen).toBe(4);
  expect(r.fresh).toBe(true);
  expect(r.endText).toContain('The ledger is yours');
  expect(r.endText).toContain('Someone else wanted it gone'); // phase one's villain thread
  expect(r.endText).toContain('Someone is behind all of it');
  expect(errors).toEqual([]);
});

test('unfinished answers cost no Heat, wrong picks stay crossed out, and the lamps stay dark until the key turns', async ({ page }) => {
  await open(page, '/index.html?case=compass&eng'); // calculations and lamps live in the shelved engineering seals
  const r = await page.evaluate(async () => {
    const A = window.__agent, v = A.caseView, S = await import('/src/case/seals.js'), out = {};
    const find = (fmt) => { for (let n = 0; n < 300; n++) { A.act('again'); A.act('close'); const s = A.case.seals.find((x) => { v.ask(x.id); return x.q.format === fmt; }); if (s) { v.ask(s.id); return s; } } return null; };
    find('number'); out.number = [A.act('answer', ''), A.act('answer', '.'), A.case.heat];
    const t = find('text'); out.text = [A.act('answer', t.q.answer.slice(1)), A.case.heat];
    const m = find('match'); out.match = [A.act('answer', { [m.q.left[0]]: m.q.answer[m.q.left[0]] }), A.case.heat];
    const c = find('choice'); const bad = (c.q.answer + 1) % 4;
    A.act('answer', bad); A.act('close'); v.ask(c.id);
    out.choice = [A.act('answer', bad), A.case.heat, document.querySelector(`.opt[data-i="${bad}"]`).classList.contains('wrong')];
    const w = find('switches'); out.dark = document.querySelectorAll('.circuit circle[fill="#3f7d4a"], .circuit circle[fill="#d9502f"]').length;
    document.querySelector('[data-q="submit"]').click();
    const Q = await import('/src/case/quiz.js'), l = Q.lamps(w.q.circuit, [0, 0, 0]);
    out.lit = w.broken || document.querySelectorAll('.circuit circle[fill="#3f7d4a"], .circuit circle[fill="#d9502f"]').length === l.open + l.alarm;
    A.act('again'); for (const s of A.case.seals.slice(0, 4)) { v.ask(s.id); A.act('answer', s.q.answer); }
    out.guess = [A.act('guess', A.case.word.word.slice(0, 3)), A.case.heat, S.canGuess(A.case)];
    return out;
  });
  expect(r.number).toEqual(['incomplete', 'incomplete', 0]);
  expect(r.text).toEqual(['incomplete', 0]);
  expect(r.match).toEqual(['incomplete', 0]);
  expect(r.choice).toEqual(['incomplete', 1, true]);
  expect(r.dark).toBe(0);
  expect(r.lit).toBe(true);
  expect(r.guess).toEqual(['incomplete', 0, true]);
});

test('questions answer by tapping: options, keypad, switches', async ({ page }) => {
  await open(page, '/index.html?case=compass&eng');
  for (const fmt of ['choice', 'number', 'switches', 'text']) {
    const id = await page.evaluate((fmt) => {
      const A = window.__agent, v = A.caseView;
      for (let n = 0; n < 200; n++) { A.act('again'); const s = A.case.seals.find((x) => { v.ask(x.id); return x.q.format === fmt; }); if (s) { v.ask(s.id); return s.id; } }
      return null;
    }, fmt);
    expect(id, fmt).not.toBeNull();
    const q = await page.evaluate((id) => window.__agent.case.seals.find((s) => s.id === id).q, id);
    if (fmt === 'choice') await page.locator(`.opt[data-i="${q.answer}"]`).click();
    if (fmt === 'number') { for (const ch of String(q.answer)) await page.locator(`.keys [data-k="${ch}"]`).click(); await page.locator('[data-q="submit"]').click(); }
    if (fmt === 'text') { for (const ch of q.answer) await page.locator(`.keys [data-k="${ch}"]`).click(); await page.locator('[data-q="submit"]').click(); }
    if (fmt === 'switches') { for (let i = 0; i < 3; i++) if (q.answer[i]) await page.locator(`.tog[data-i="${i}"]`).click(); await page.locator('[data-q="submit"]').click(); }
    await expect(page.locator('#caseBody .reveal'), fmt).toContainText('Seal broken');
  }
});

test('Case 02 is the default and the title picks Case 01; Begin still offers the chase', async ({ page }) => {
  test.setTimeout(240000); // three page loads
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const ready = () => page.waitForFunction(() => window.__agent && window.__agent.stats.frames > 2, null, { timeout: 60000 });
  await page.goto('/index.html'); await ready();
  await expect(page.locator('#cases [data-place="compass"]')).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => [window.__agent.caseId, window.__agent.caseView])).toEqual(['compass', null]);
  // The title runs frames and Feedback with no case built yet.
  await page.evaluate(() => { window.open = () => null; for (let i = 0; i < 5; i++) window.__agent.step(0.05); window.__agent.act('feedback'); });
  expect(await page.evaluate(() => window.__agent.stats.lastFeedbackUrl)).toContain('Mode%3A+title');
  expect(errors, 'no page errors on the title').toEqual([]);
  await page.click('#begin');
  await expect(page.locator('#chaseCard')).toBeVisible();
  await page.click('#chaseBody [data-chase="skip"]');
  await expect(page.locator('#casesheet')).toContainText('Compass Ledger');
  expect(await page.evaluate(() => window.__agent.act('pick', 'dossier')), 'no switching once the case is open').toBe(false);

  await page.reload(); await ready();
  await page.click('#cases [data-place="dossier"]');
  await expect(page.locator('#cases [data-place="dossier"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#cases [data-place="compass"]')).toHaveAttribute('aria-pressed', 'false');
  await page.click('#start');
  await expect(page.locator('#casesheet')).toContainText('The Dossier');
  expect(await page.evaluate(() => window.__agent.caseView.def.id)).toBe('dossier');

  await page.goto('/index.html?case=dossier'); await ready();
  await expect(page.locator('#cases [data-place="dossier"]')).toHaveAttribute('aria-pressed', 'true');
  expect(errors).toEqual([]);
});
