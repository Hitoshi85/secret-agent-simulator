// Headless smoke tests: the city loads without errors, the agent walks the whole slice from the Duomo
// to Ponte Vecchio along streets (never through buildings or the river), the Map jumps work, the
// crowd strolls, and pause freezes everything. Tests drive the game through window.__agent.
const { test, expect } = require('@playwright/test');

async function open(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('/index.html');
  await page.waitForFunction(() => window.__agent && window.__agent.stats.frames > 2, null, { timeout: 60000 });
  await page.evaluate(() => { window.__agent.paused = true; window.__agent.act('start'); window.__agent.act('close'); });
  return errors;
}

test('loads Florence without errors; Case 02 starts in Piazza della Signoria', async ({ page }) => {
  const errors = await open(page);
  const s = await page.evaluate(() => ({ ...window.__agent.state, stats: window.__agent.stats }));
  expect(s.state).toBe('playing');
  expect(s.area).toBe('Piazza della Signoria');
  expect(s.stats.buildings, 'palazzi fill the city').toBeGreaterThan(800);
  expect(s.stats.people, 'a crowd is out').toBeGreaterThanOrEqual(60);
  await expect(page.locator('#locName')).toHaveText('Piazza della Signoria');
  const again = await page.evaluate(() => { const A = window.__agent; A.act('jump', 'ponte'); A.act('again'); return A.state.area; });
  expect(again, 'Play again starts back in Signoria').toBe('Piazza della Signoria');
  expect(errors).toEqual([]);
});

test('Case 01 starts in Piazza della Signoria too', async ({ page }) => {
  await page.goto('/index.html?case=dossier');
  await page.waitForFunction(() => window.__agent && window.__agent.stats.frames > 2, null, { timeout: 60000 });
  const area = await page.evaluate(() => { window.__agent.paused = true; window.__agent.act('start'); return window.__agent.state.area; });
  expect(area).toBe('Piazza della Signoria');
});

test('walks from the Duomo to Ponte Vecchio along the streets', async ({ page }) => {
  const errors = await open(page);
  const r = await page.evaluate(() => {
    const A = window.__agent, seen = [], off = [];
    A.act('jump', 'duomo'); A.act('close');
    if (!A.act('walkTo', -140, 690)) return { found: false };
    for (let i = 0; i < 6000 && A.agent.path; i++) {
      A.step(0.05);
      if (!A.walkable(A.agent.x, A.agent.z)) off.push([A.agent.x, A.agent.z]);
      if (A.state.area && seen[seen.length - 1] !== A.state.area) seen.push(A.state.area);
    }
    A.render();
    return { found: true, seen, off: off.slice(0, 5), at: [A.agent.x, A.agent.z], area: A.state.area, walked: A.agent.walked };
  });
  expect(r.found, 'a path exists').toBe(true);
  expect(r.off, 'never inside a building or the river').toEqual([]);
  expect(r.area).toBe('Ponte Vecchio');
  expect(r.seen).toEqual(['Piazza del Duomo', 'Via dei Calzaiuoli', 'Piazza della Signoria', 'Via Por Santa Maria', 'Lungarno degli Archibusieri', 'Ponte Vecchio']);
  expect(r.walked).toBeGreaterThan(700); // about 0.8 km through the centre
  await expect(page.locator('#locName')).toHaveText('Ponte Vecchio');
  expect(errors).toEqual([]);
});

test('a tap on a building or the river walks to the nearest street instead', async ({ page }) => {
  await open(page);
  const r = await page.evaluate(() => {
    const A = window.__agent;
    A.act('jump', 'ponte');
    const river = A.act('walkTo', -100, 632); // in the Arno, just off the embankment
    for (let i = 0; i < 400 && A.agent.path; i++) A.step(0.05);
    return { river, ok: A.walkable(A.agent.x, A.agent.z), z: A.agent.z, noPath: A.findPath(0, 0, -100, 300) };
  });
  expect(r.river).toBe(true);
  expect(r.ok).toBe(true);
  expect(r.z, 'stayed on the embankment').toBeLessThan(624);
  expect(r.noPath, 'no way into the middle of a block').toBeNull();
});

test('keyboard walking slides along walls and never enters a building', async ({ page }) => {
  await open(page);
  const r = await page.evaluate(async () => {
    const A = window.__agent; A.act('jump', 'calzaiuoli');
    A.cam.yaw = Math.PI / 2; // face east, straight at the palazzi lining the street
    return { x: A.agent.x };
  });
  await page.keyboard.down('w');
  const after = await page.evaluate(() => { const A = window.__agent; for (let i = 0; i < 100; i++) A.step(0.05); return { x: A.agent.x, z: A.agent.z, ok: A.walkable(A.agent.x, A.agent.z) }; });
  await page.keyboard.up('w');
  expect(after.ok).toBe(true);
  expect(after.x).toBeGreaterThan(r.x);
  expect(after.x).toBeLessThanOrEqual(-100);
});

test('the Map jumps to every place', async ({ page }) => {
  await open(page);
  const r = await page.evaluate(() => {
    const A = window.__agent;
    return A.PLACES.map((p) => { A.act('jump', p.id); A.step(0.05); return [p.id, A.walkable(A.agent.x, A.agent.z), A.state.area]; });
  });
  for (const [id, ok, area] of r) { expect(ok, id).toBe(true); expect(area, id).toBeTruthy(); }
});

test('the crowd strolls and stays on the streets; pause freezes the city', async ({ page }) => {
  await open(page);
  const r = await page.evaluate(() => {
    const A = window.__agent, pos = () => A.crowd.map((p) => [p.mesh.position.x, p.mesh.position.z]);
    const before = pos();
    for (let i = 0; i < 200; i++) A.step(0.05);
    const after = pos();
    const moved = after.filter((p, i) => Math.hypot(p[0] - before[i][0], p[1] - before[i][1]) > 1).length;
    const off = after.filter(([x, z]) => !A.walkable(x, z)).length;
    A.setPaused(true);
    const frozen = pos(); const ax = A.agent.x;
    A.act('walkTo', A.agent.x + 10, A.agent.z);
    for (let i = 0; i < 50; i++) A.step(0.05);
    const still = pos().every((p, i) => p[0] === frozen[i][0] && p[1] === frozen[i][1]) && A.agent.x === ax;
    A.setPaused(false);
    return { moved, off, still, paused: A.state.paused };
  });
  expect(r.moved).toBeGreaterThan(20);
  expect(r.off).toBe(0);
  expect(r.still).toBe(true);
  expect(r.paused).toBe(false);
});
