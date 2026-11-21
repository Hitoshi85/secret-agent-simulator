// The opening car chase, Pienza to Florence (src/chase/): Begin starts it on a road generated fresh every
// run, a simple autopilot wins the drive of about 45 s with the off-roader always ahead (30 s in sight in a
// row, catching up behind him, or reaching the end), both cars get air time over the crests, braking
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

test('Begin starts the chase and the autopilot wins the 45-second drive with him always ahead', async ({ page }) => {
  test.setTimeout(180000);
  const errors = await open(page);
  const r = await page.evaluate((src) => {
    const A = window.__agent, C = A.chase, drive = eval(src);
    let minGap = 1e9, maxAir = 0, maxKmh = 0, passed = 0;
    drive(A, 2600, () => { minGap = Math.min(minGap, C.gap); maxAir = Math.max(maxAir, C.player.air); maxKmh = Math.max(maxKmh, C.player.v * 3.6); for (const t of C.traffic) if (t.s < C.player.s && t.s > C.player.s - 2) passed++; });
    return { state: A.state.state, status: C.status, t: C.total, end: C.road.end, minGap, maxAir, maxKmh, passed, card: document.getElementById('chaseBody').textContent };
  }, DRIVE);
  expect(r.state).toBe('chase');
  expect(r.end, 'a road of 1.5 km, about 45 s').toBe(1500);
  expect(r.status, 'the chase is won').toBe('done');
  expect(r.card).toContain('Follow on foot');
  expect(r.t, 'over within about 45 seconds').toBeLessThan(50);
  expect(r.minGap, 'the off-roader stays ahead').toBeGreaterThan(0);
  expect(r.maxAir, 'air time over a crest').toBeGreaterThan(0.2);
  expect(r.maxAir, 'short hops, not long jumps').toBeLessThan(0.75);
  expect(r.maxKmh, 'tops out near 140 km/h').toBeGreaterThan(130);
  expect(r.maxKmh).toBeLessThan(150);
  expect(r.passed, 'oncoming traffic went by').toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('every run builds a new road; catching right up or 30 s in sight wins early', async ({ page }) => {
  const errors = await open(page);
  const r = await page.evaluate(() => {
    const A = window.__agent, C = A.chase, i = 300;
    const roadA = [C.road.x[i], C.road.y[i]];
    C.start(); C.action('stage'); C.action('drive');
    const roadB = [C.road.x[i], C.road.y[i]];
    for (let k = 0; k < 30; k++) A.step(1 / 30);
    C.suv.s = C.player.s + 6; A.step(1 / 30);
    const caught = { status: C.status, card: document.getElementById('chaseBody').textContent };
    C.action('retry'); C.action('drive'); C.streak = 29.95;
    let won = null;
    for (let k = 0; k < 30 && C.status === 'driving'; k++) { A.step(1 / 30); if (C.status === 'done') won = document.getElementById('chaseBody').textContent; }
    return { roadA, roadB, caught, won, streak: C.streak };
  });
  expect(r.roadB, 'a different road the next run').not.toEqual(r.roadA);
  expect(r.caught.status).toBe('done');
  expect(r.caught.card).toContain('CAUGHT UP');
  expect(r.won, '30 s in sight in a row wins').toContain('He never left your sight');
  expect(errors).toEqual([]);
});

test('the steering slider at the bottom middle follows the steering, the car goes where it points, and off the road costs only a little speed', async ({ page }) => {
  const errors = await open(page);
  const r = await page.evaluate(async () => {
    const A = window.__agent, C = A.chase, F = C.fiat;
    for (let i = 0; i < 30; i++) A.step(1 / 30);
    C.input.keys.right = true;
    for (let i = 0; i < 8; i++) A.step(1 / 30);
    const wheel = document.querySelector('#cWheel b').style.transform, box = document.getElementById('cWheel').getBoundingClientRect(), brake = document.getElementById('cBrake').getBoundingClientRect();
    // direction of travel over one frame against the way the body points (its local +x)
    const x0 = F.position.x, z0 = F.position.z; A.step(1 / 30);
    const moved = Math.atan2(F.position.x - x0, F.position.z - z0), points = Math.atan2(Math.cos(F.rotation.y), -Math.sin(F.rotation.y));
    C.input.keys.right = false;
    let off = Math.abs(Math.atan2(Math.sin(moved - points), Math.cos(moved - points)));
    // off the road on open ground: a light slowdown only
    const { buildStage } = await import('/src/chase/land.js'); const { newCar, drivePlayer, KMH } = await import('/src/chase/drive.js');
    const { road } = buildStage(1); const clear = (a) => { for (let i = a / 2; i < a / 2 + 130; i++) if (road.cyp[i]) return false; return true; };
    let s0 = 450; while (!clear(s0)) s0 += 10;
    const car = newCar(s0, 8); car.v = 39; car.y = road.y[s0 / 2];
    for (let i = 0; i < 150; i++) { car.d = 8; car.psi = 0; drivePlayer(car, road, 1 / 30, 0, false); }
    return { wheel, box: { top: box.top, mid: box.left + box.width / 2, right: box.right, h: innerHeight, w: innerWidth, brakeLeft: brake.left, brakeRight: brake.right }, off, offKmh: car.v * KMH };
  });
  expect(Number(/translateX\((-?[\d.]+)px\)/.exec(r.wheel)[1]), 'marker slid right').toBeGreaterThan(35);
  expect(r.box.top, 'at the bottom of the screen').toBeGreaterThan(r.box.h * 0.7);
  expect(Math.abs(r.box.mid - r.box.w / 2), 'centred').toBeLessThan(1);
  expect(r.box.brakeLeft, 'Brake at the bottom right, clear of the slider').toBeGreaterThan(r.box.right);
  expect(r.box.brakeRight).toBeGreaterThan(r.box.w - 20);
  expect(r.off, 'moves the way it points').toBeLessThan(0.05);
  expect(r.offKmh, 'off road: about 115 km/h').toBeGreaterThan(105);
  expect(r.offKmh).toBeLessThan(125);
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
  expect(r.lostAt, 'out of sight for about 12 seconds loses him').toBeGreaterThan(330);
  expect(r.card).toContain("He's gone");
  expect(r.after.s, 'retry restarts the stage').toBeLessThan(20);
  expect(r.after.sight).toBe(1);
  expect(errors).toEqual([]);
});

test('M does not open the Florence map mid-chase, and reloading a stage frees its textures', async ({ page }) => {
  const errors = await open(page);
  const r = await page.evaluate(() => {
    const A = window.__agent, C = A.chase;
    const map = A.act('map');
    A.step(1 / 30); A.render(); C.action('retry'); A.step(1 / 30); A.render();
    const t0 = A.stats.textures;
    for (let i = 0; i < 3; i++) { C.action('retry'); A.step(1 / 30); A.render(); }
    return { map, open: A.state.map, t0, t1: A.stats.textures };
  });
  expect(r.map).toBe(false);
  expect(r.open).toBe(false);
  expect(r.t1, 'retries do not pile up textures').toBeLessThanOrEqual(r.t0);
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

  test('the chase view stays within 250 draw calls, 400k triangles and 4 ms of game work', async ({ page }) => {
    test.setTimeout(240000);
    await open(page);
    for (const stage of [0]) { // the chase drives the first stage
      const t = await page.evaluate(({ src, stage }) => {
        const A = window.__agent, C = A.chase, drive = eval(src);
        if (stage) { C.action('next'); while (C.stage < stage) C.action('next'); C.action('drive'); }
        const steps = []; let calls = 0, triangles = 0;
        for (let k = 0; k < 6; k++) {
          drive(A, 150);
          for (let i = 0; i < 6; i++) { const t0 = performance.now(); A.step(1 / 30); steps.push(performance.now() - t0); }
          A.render(); calls = Math.max(calls, A.stats.calls); triangles = Math.max(triangles, A.stats.triangles); // software WebGL renders slowly: one frame per view
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
