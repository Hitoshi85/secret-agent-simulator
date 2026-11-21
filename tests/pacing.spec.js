// Getting around faster (Hitoshi's feedback, 2026-11-16): running, gold arrows to the leads you
// haven't visited (direction and distance only), the corner minimap and the big map.
const { test, expect } = require('@playwright/test');

async function open(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('/index.html?case=dossier'); // the dossier's five fixed leads
  await page.waitForFunction(() => window.__agent && window.__agent.stats.frames > 2, null, { timeout: 60000 });
  await page.evaluate(() => { window.__agent.paused = true; window.__agent.act('start'); window.__agent.act('close'); });
  return errors;
}

test('running covers twice the ground of walking', async ({ page }) => {
  const errors = await open(page);
  const r = await page.evaluate(() => {
    const A = window.__agent, go = (run) => {
      A.act('jump', 'calzaiuoli'); A.act('walkTo', -106, 400, run);
      const z0 = A.agent.z; for (let i = 0; i < 20; i++) A.step(0.05);
      return { d: A.agent.z - z0, running: A.agent.running };
    };
    return { walk: go(false), run: go(true) };
  });
  expect(r.walk.running).toBe(false);
  expect(r.run.running).toBe(true);
  expect(r.run.d / r.walk.d).toBeCloseTo(2, 1);
  expect(errors).toEqual([]);
});

test('a double tap on the street runs there', async ({ page }) => {
  await open(page);
  const vp = page.viewportSize();
  await page.mouse.click(vp.width / 2, vp.height * 0.6);
  await page.mouse.click(vp.width / 2, vp.height * 0.6);
  expect(await page.evaluate(() => window.__agent.agent.running)).toBe(true);
});

test('arrows point to every lead not yet visited, with distance only, and go once visited', async ({ page }) => {
  const errors = await open(page);
  const before = await page.evaluate(() => { const A = window.__agent; A.step(0.05); return A.navaids.leads.map((l) => l.id); });
  expect(before.sort()).toEqual(['flowers', 'jeweller', 'painter', 'phone', 'receipt']);
  const pills = page.locator('#leads .lead:not([hidden])');
  await expect(pills).toHaveCount(5);
  for (const text of await pills.allTextContents()) expect(text).toMatch(/^\d+ m$/);
  // Visit the flower seller: their arrow goes.
  const after = await page.evaluate(() => {
    const A = window.__agent; A.agent.x = 60; A.agent.z = 66; A.act('interact', 'witness', 'flowers'); A.step(0.05);
    return A.navaids.leads.map((l) => l.id);
  });
  expect(after).not.toContain('flowers');
  expect(after).toHaveLength(4);
  // Facing the lead puts its arrow at the top of the screen.
  const top = await page.evaluate(() => {
    const A = window.__agent; A.act('jump', 'calzaiuoli'); A.agent.x = -106; A.agent.z = 300; A.cam.yaw = 0; A.step(0.05);
    const l = A.navaids.leads.find((q) => q.id === 'painter'); return l.ahead;
  });
  expect(top).toBe(true);
  expect(errors).toEqual([]);
});

test('the minimap and the big map draw the city', async ({ page }) => {
  const errors = await open(page);
  await page.evaluate(() => { for (let i = 0; i < 4; i++) window.__agent.step(0.05); });
  const painted = (id) => page.evaluate((id) => {
    const c = document.getElementById(id), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    const colours = new Set(); for (let i = 0; i < d.length; i += 4 * 97) colours.add(`${d[i]},${d[i + 1]},${d[i + 2]}`); return colours.size;
  }, id);
  expect(await painted('mini'), 'minimap has streets and blocks').toBeGreaterThan(2);
  await page.evaluate(() => window.__agent.act('map'));
  await expect(page.locator('#map')).toBeVisible();
  expect(await painted('bigmap'), 'big map is drawn').toBeGreaterThan(4);
  await page.locator('#places [data-place="signoria"]').click();
  await expect(page.locator('#map')).toBeHidden();
  expect(await page.evaluate(() => { window.__agent.step(0.05); return window.__agent.state.area; })).toBe('Piazza della Signoria');
  expect(errors).toEqual([]);
});
