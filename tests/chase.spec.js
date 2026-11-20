// The opening car chase, Pienza to Florence (src/chase/): Begin starts it, a simple autopilot drives a
// whole stage with the off-roader always ahead, both cars get air time over the crests, braking
// slows the car and lights the brake lamps, losing sight of him ends the stage with a retry, oncoming
// traffic passes in the other lane, Skip goes to Florence, and every chase view stays in the phone budget.
const { test, expect, devices } = require('@playwright/test');

async function open(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('/index.html');
  await page.waitForFunction(() => window.__agent && window.__agent.stats.frames > 2, null, { timeout: 60000 });
  await page.evaluate(() => { const A = window.__agent; A.paused = true; A.act('chase'); A.chase.action('stage'); A.chase.action('drive'); });
  return errors;
}

// Keeps to the right lane: steer back towards d = 1.1, straightening up as it gets there.
const DRIVE = `(A, steps, each) => {
  const C = A.chase;
  for (let i = 0; i < steps && C.status === 'driving'; i++) {
    const p = C.player, want = (1.1 - p.d) * 0.25 - p.psi * 2.5;
    C.input.keys.left = want < -0.08; C.input.keys.right = want > 0.08;
    A.step(1 / 30); if (each) each(i);
  }
}`;

test('Begin starts the chase and the autopilot finishes stage 1 with him always ahead', async ({ page }) => {
  test.setTimeout(180000);
  const errors = await open(page);
  const r = await page.evaluate((src) => {
    const A = window.__agent, C = A.chase, drive = eval(src);
    let minGap = 1e9, maxAir = 0, maxKmh = 0, passed = 0;
    drive(A, 2600, () => { minGap = Math.min(minGap, C.gap); maxAir = Math.max(maxAir, C.player.air); maxKmh = Math.max(maxKmh, C.player.v * 3.6); for (const t of C.traffic) if (t.s < C.player.s && t.s > C.player.s - 2) passed++; });
    return { state: A.state.state, status: C.status, stage: C.stage, s: C.player.s, end: C.road.end, minGap, maxAir, maxKmh, passed, card: document.getElementById('chaseBody').textContent };
  }, DRIVE);
  expect(r.state).toBe('chase');
  expect(r.s, 'reached the end of the stage').toBeGreaterThanOrEqual(r.end);
  expect(r.status).toBe('card');
  expect(r.card).toContain('Stage 1 of 3 done');
  expect(r.minGap, 'the off-roader stays ahead').toBeGreaterThan(0);
  expect(r.maxAir, 'air time over a crest').toBeGreaterThan(0.3);
  expect(r.maxKmh, 'tops out near 140 km/h').toBeGreaterThan(130);
  expect(r.maxKmh).toBeLessThan(150);
  expect(r.passed, 'oncoming traffic went by').toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('braking slows the car and lights the brake lamps; losing him ends the stage with a retry', async ({ page }) => {
  const errors = await open(page);
  const r = await page.evaluate(() => {
    const A = window.__agent, C = A.chase;
    for (let i = 0; i < 60; i++) A.step(1 / 30);
    const v0 = C.player.v; C.input.keys.brake = true;
    for (let i = 0; i < 30; i++) A.step(1 / 30);
    const braking = { v1: C.player.v, button: document.getElementById('cBrake').classList.contains('on') };
    // Stay stopped until he is long gone.
    let lostAt = -1;
    for (let i = 0; i < 1200 && C.status === 'driving'; i++) { A.step(1 / 30); if (C.status === 'lost') lostAt = i; }
    const card = document.getElementById('chaseBody').textContent;
    C.input.keys.brake = false; C.action('retry');
    return { v0, ...braking, status: C.status, lostAt, card, after: { s: C.player.s, sight: C.sight.value } };
  });
  expect(r.v1, 'braking slows the car').toBeLessThan(r.v0 - 10);
  expect(r.button, 'the Brake button lights').toBe(true);
  expect(r.lostAt, 'out of sight long enough loses him').toBeGreaterThan(0);
  expect(r.card).toContain("He's gone");
  expect(r.after.s, 'retry restarts the stage').toBeLessThan(20);
  expect(r.after.sight).toBe(1);
  expect(errors).toEqual([]);
});

test('Skip to Florence leaves the chase and opens the case in Florence', async ({ page }) => {
  await page.goto('/index.html');
  await page.waitForFunction(() => window.__agent && window.__agent.stats.frames > 2, null, { timeout: 60000 });
  await page.click('#begin');
  await expect(page.locator('#chaseCard')).toBeVisible();
  await page.click('#chaseBody [data-chase="skip"]');
  await expect(page.locator('#chaseCard')).toBeHidden();
  const s = await page.evaluate(() => ({ state: window.__agent.state.state, chasing: document.body.classList.contains('chasing') }));
  expect(s).toEqual({ state: 'playing', chasing: false });
  await expect(page.locator('#casesheet')).toBeVisible();
});

test('the handler call, the stage card, a 3-2-1 count, and the route map when paused', async ({ page }) => {
  await page.goto('/index.html');
  await page.waitForFunction(() => window.__agent && window.__agent.stats.frames > 2, null, { timeout: 60000 });
  await page.evaluate(() => { window.__agent.paused = true; });
  await page.click('#begin');
  await expect(page.locator('#chaseBody')).toContainText('PHONE · HANDLER', { ignoreCase: true });
  await page.click('#chaseBody [data-chase="stage"]');
  await expect(page.locator('#chaseBody')).toContainText('Leaving Pienza');
  await page.click('#chaseBody [data-chase="go"]');
  const r = await page.evaluate(() => {
    const A = window.__agent; A.step(0.1);
    const count = document.getElementById('cCount').textContent;
    for (let i = 0; i < 40; i++) A.step(0.1);
    return { count, status: A.chase.status };
  });
  expect(r).toEqual({ count: '3', status: 'driving' });
  await page.click('#pause');
  await expect(page.locator('#pausedMap svg')).toBeVisible();
  await expect(page.locator('#pausedMap')).toContainText('Florence');
});

test.describe('on a phone', () => {
  const iPhone = { ...devices['iPhone 13'] }; delete iPhone.defaultBrowserType;
  test.use({ ...iPhone, viewport: { width: 390, height: 844 } });

  test('holding the left or right half of the screen steers', async ({ page }) => {
    await open(page);
    const vp = page.viewportSize();
    const d0 = await page.evaluate(() => { const A = window.__agent; for (let i = 0; i < 20; i++) A.step(1 / 30); return A.chase.player.psi; });
    await page.dispatchEvent('#game', 'pointerdown', { pointerId: 7, clientX: vp.width * 0.8, clientY: vp.height * 0.7, isPrimary: true });
    const turned = await page.evaluate(() => { const A = window.__agent; for (let i = 0; i < 10; i++) A.step(1 / 30); return { psi: A.chase.player.psi, steer: A.chase.steer }; });
    await page.dispatchEvent('#game', 'pointerup', { pointerId: 7, clientX: vp.width * 0.8, clientY: vp.height * 0.7 });
    expect(turned.steer).toBe(1);
    expect(turned.psi, 'turns right').toBeGreaterThan(d0);
    expect(await page.evaluate(() => window.__agent.chase.input.right)).toBe(0);
  });

  test('every chase view stays within 250 draw calls, 400k triangles and 4 ms of game work', async ({ page }) => {
    test.setTimeout(240000);
    await open(page);
    for (const stage of [0, 1, 2]) {
      const t = await page.evaluate(({ src, stage }) => {
        const A = window.__agent, C = A.chase, drive = eval(src);
        if (stage) { C.action('next'); while (C.stage < stage) C.action('next'); C.action('drive'); }
        const steps = []; let calls = 0, triangles = 0;
        for (let k = 0; k < 6; k++) {
          drive(A, 150);
          for (let i = 0; i < 6; i++) { const t0 = performance.now(); A.step(1 / 30); steps.push(performance.now() - t0); A.render(); calls = Math.max(calls, A.stats.calls); triangles = Math.max(triangles, A.stats.triangles); }
        }
        steps.sort((a, b) => a - b);
        return { calls, triangles, step: steps[Math.floor(steps.length / 2)] };
      }, { src: DRIVE, stage });
      console.log(`chase stage ${stage + 1}: ${t.calls} calls, ${t.triangles} triangles, step ${t.step.toFixed(2)} ms`);
      expect(t.calls).toBeLessThanOrEqual(250);
      expect(t.triangles).toBeLessThanOrEqual(400000);
      expect(t.step).toBeLessThanOrEqual(4);
    }
  });
});
