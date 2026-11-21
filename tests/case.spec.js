// The case: the rules in src/case/engine.js always give a solvable case with a random thief, and the
// dossier case plays end to end in the city (case file, witnesses, the phone puzzle, Heat, endings).
const { test, expect } = require('@playwright/test');

async function open(page, url = '/index.html?case=dossier') {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url);
  await page.waitForFunction(() => window.__agent && window.__agent.stats.frames > 2, null, { timeout: 60000 });
  await page.evaluate(() => { window.__agent.paused = true; window.__agent.act('start'); });
  return errors;
}

test('every case is solvable: one thief, decoys differ in one trait, firm clues leave only the thief', async ({ page }) => {
  await open(page);
  const r = await page.evaluate(async () => {
    const E = await import('/src/case/engine.js');
    const { CASES } = await import('/src/cases/index.js');
    const problems = [], thieves = new Set();
    for (const def of CASES.filter((d) => !d.kind)) { // suspect cases (seal cases have tests/seals.spec.js)
      for (let n = 0; n < 200; n++) {
        const c = E.newCase(def);
        const t = c.suspects[c.thief], keys = (s) => JSON.stringify(s.traits);
        if (c.suspects.length !== def.suspects) problems.push(`${def.id}: ${c.suspects.length} suspects`);
        if (c.suspects.filter((s) => s.thief).length !== 1) problems.push(`${def.id}: not one thief`);
        if (new Set(c.suspects.map(keys)).size !== c.suspects.length) problems.push(`${def.id}: two suspects look the same`);
        for (const s of c.suspects) if (s !== t && Object.keys(def.traits).filter((k) => s.traits[k] !== t.traits[k]).length !== 1) problems.push(`${def.id}: a decoy differs in more than one trait`);
        for (const k of def.clues.filter((x) => x.firm && !x.pattern)) E.learn(c, k.id);
        for (const k of def.clues.filter((x) => x.pattern)) { E.pickUp(c, k.id); E.crack(c, k.id, k.pattern); }
        const left = c.suspects.filter((s) => !s.out);
        if (left.length !== 1 || !left[0].thief) problems.push(`${def.id}: firm clues leave ${left.length}`);
        thieves.add(keys(t));
      }
    }
    return { problems: problems.slice(0, 5), thieves: thieves.size };
  });
  expect(r.problems).toEqual([]);
  expect(r.thieves, 'the thief changes from play to play').toBeGreaterThan(5);
});

test('the Notebook and Phone stay shut on the title screen', async ({ page }) => {
  await page.goto('/index.html');
  await page.waitForFunction(() => window.__agent && window.__agent.stats.frames > 2, null, { timeout: 60000 });
  await page.keyboard.press('n');
  expect(await page.evaluate(() => window.__agent.act('phone'))).toBe(false);
  await expect(page.locator('#casesheet')).toBeHidden();
});

test('replaying frees the old suspects', async ({ page }) => {
  await open(page);
  const r = await page.evaluate(() => {
    const A = window.__agent, old = A.caseView.targets.filter((t) => t.kind === 'suspect').map((t) => t.mesh);
    let disposed = 0;
    for (const m of old) for (const g of m.userData.frames) g.addEventListener('dispose', () => disposed++);
    A.act('again');
    return { removed: old.every((m) => !m.parent), disposed, frames: old.length * old[0].userData.frames.length, people: A.crowd.length };
  });
  expect(r.removed).toBe(true);
  expect(r.disposed).toBe(r.frames);
  expect(r.people).toBe(75);
});

test('the case file opens the case, and every witness and trace stands on a street', async ({ page }) => {
  const errors = await open(page);
  await expect(page.locator('#caseBody h1')).toHaveText('The Dossier');
  await page.locator('#caseBody button', { hasText: 'Take the case' }).click();
  // The handler's first lead comes in on the Phone, and the Phone shows it again later.
  await expect(page.locator('#caseBody .kicker')).toHaveText('Phone · Handler');
  await expect(page.locator('#caseBody .msg').first()).toContainText('Start at the Duomo');
  await page.locator('#caseBody button', { hasText: 'Got it' }).click();
  await expect(page.locator('#casesheet')).toBeHidden();
  await page.locator('#touch [data-act="phone"]').click();
  await expect(page.locator('#caseBody .kicker')).toHaveText('Phone · Handler');
  await page.locator('#caseBody button', { hasText: 'Got it' }).click();
  await expect(page.locator('#locSub')).toHaveText('Firenze · 17:40 · train 19:10');
  const off = await page.evaluate(() => window.__agent.caseView.targets.filter((t) => t.kind !== 'suspect' && !window.__agent.walkable(...t.at)).map((t) => t.id));
  expect(off).toEqual([]);
  expect(errors).toEqual([]);
});

test('walk up to a witness, crack the phone, and the notebook keeps track', async ({ page }) => {
  const errors = await open(page);
  await page.evaluate(() => window.__agent.act('close'));
  // The flower seller is a short walk from the start: tap them and the agent walks over and talks.
  const r = await page.evaluate(() => {
    const A = window.__agent, how = A.act('interact', 'witness', 'flowers');
    for (let i = 0; i < 2000 && A.agent.path; i++) A.step(0.05);
    A.step(0.05);
    return { how, notes: A.case.notes.length, out: A.case.suspects.filter((s) => s.out).length };
  });
  expect(r.how).toBe('walking');
  expect(r.notes, 'the vague clue is noted').toBe(1);
  expect(r.out, 'but crosses no one out').toBe(0);
  await expect(page.locator('#talk')).toBeVisible();
  await expect(page.locator('#talkWho')).toHaveText('Witness · Flower seller');

  // The phone: pick it up, get the order wrong once, then right.
  await page.evaluate(() => { const A = window.__agent; A.act('jump', 'ponte'); A.agent.x = -140; A.agent.z = 592; A.act('interact', 'gadget', 'phone'); A.act('phone'); });
  await expect(page.locator('.dot.smudge')).toHaveCount(5);
  for (const d of [0, 4, 1, 5, 8]) await page.locator(`.dot[data-dot="${d}"]`).click();
  await expect(page.locator('#padMsg')).toHaveText('Wrong order. 2 tries left.');
  for (const d of [0, 1, 4, 5, 8]) await page.locator(`.dot[data-dot="${d}"]`).click();
  await expect(page.locator('#caseBody .msg')).toContainText('coat before the station');
  const coat = await page.evaluate(() => { const c = window.__agent.case; return c.suspects.filter((s) => !s.out).every((s) => s.traits.coat === c.suspects[c.thief].traits.coat); });
  expect(coat, 'the phone crosses out every other coat').toBe(true);

  await page.evaluate(() => window.__agent.act('notebook'));
  await expect(page.locator('#caseBody .card')).toHaveCount(5);
  await expect(page.locator('#caseBody .clue')).toHaveCount(2);
  expect(errors).toEqual([]);
});

test('wrong accusations raise Heat until the thief gets away; the right one wins', async ({ page }) => {
  const errors = await open(page);
  const lost = await page.evaluate(() => {
    const A = window.__agent, c = A.case, wrong = c.suspects.filter((s) => !s.thief).map((s) => s.id);
    return wrong.slice(0, 3).map((i) => A.act('accuse', i));
  });
  expect(lost).toEqual(['wrong', 'wrong', 'lost']);
  await expect(page.locator('#heatN')).toHaveText('3 / 3');
  await expect(page.locator('#caseBody h2')).toHaveText('The thief got away');
  await page.locator('#caseBody button', { hasText: 'Try again' }).click();
  await expect(page.locator('#heatN')).toHaveText('0 / 3');
  const won = await page.evaluate(() => { const A = window.__agent; A.act('close'); return A.act('accuse', A.case.thief); });
  expect(won).toBe('right');
  await expect(page.locator('#caseBody h2')).toHaveText('Dossier recovered');
  expect(errors).toEqual([]);
});
