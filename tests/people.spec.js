// People: painted portraits on the case cards match the walking figures, and the walking people
// wear painted faces from one atlas texture (no extra draw calls; the budget is in phone-checks).
const { test, expect } = require('@playwright/test');

async function open(page, url) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url);
  await page.waitForFunction(() => window.__agent && window.__agent.stats.frames > 2, null, { timeout: 60000 });
  await page.evaluate(() => { window.__agent.paused = true; window.__agent.act('start'); });
  return errors;
}
const near = (page, kind, id) => page.evaluate(([k, i]) => { const A = window.__agent, t = A.caseView.targets.find((q) => q.kind === k && q.id === i); A.agent.x = t.at[0] + 1; A.agent.z = t.at[1]; return A.act('interact', k, i); }, [kind, id]);
const loaded = (page, sel) => page.waitForFunction((s) => [...document.querySelectorAll(s)].length > 0 && [...document.querySelectorAll(s)].every((i) => i.complete && i.naturalWidth > 0), sel);

test('the walking people wear painted faces from the atlas, on the same one material', async ({ page }) => {
  const errors = await open(page, '/index.html?case=dossier');
  await page.waitForFunction(() => window.__agent.faces.ready, null, { timeout: 30000 });
  const r = await page.evaluate(() => {
    const A = window.__agent, mats = new Set(A.crowd.map((p) => p.mesh.material));
    const m = A.crowd[0].mesh, g = m.geometry;
    return { mats: mats.size, map: !!m.material.map, w: m.material.map?.image?.width, uv: !!g.attributes.uv, tiles: A.faces.tiles };
  });
  expect(r.mats, 'every walker shares one material').toBe(1);
  expect(r.map && r.uv).toBe(true);
  expect(r.w).toBe(1024);
  expect(r.tiles).toBe(11);
  expect(errors).toEqual([]);
});

test('witness, suspects and handler get painted portraits', async ({ page }) => {
  const errors = await open(page, '/index.html?case=dossier');
  await page.evaluate(() => window.__agent.act('briefed'));
  await loaded(page, '#caseBody .contact .av, #caseBody .msgrow .mini');
  expect(await page.locator('#caseBody .msgrow').count()).toBeGreaterThan(0);
  await page.evaluate(() => window.__agent.act('close'));
  expect(await near(page, 'witness', 'painter')).toBe('learned');
  await expect(page.locator('#talk')).toHaveClass(/face/);
  await expect(page.locator('#talkName')).toHaveText('Street painter');
  await loaded(page, '#talkPor');
  // a trace has no portrait
  expect(await near(page, 'trace', 'receipt')).toBe('learned');
  await expect(page.locator('#talkPor')).toBeHidden();
  await page.evaluate(() => window.__agent.act('notebook'));
  const n = await page.evaluate(() => window.__agent.case.suspects.length);
  await expect(page.locator('#caseBody .card img.face')).toHaveCount(n);
  await loaded(page, '#caseBody .card img.face');
  expect(errors).toEqual([]);
});

test('the seal case handler has the same contact card', async ({ page }) => {
  const errors = await open(page, '/index.html?case=compass');
  await page.evaluate(() => window.__agent.act('briefed'));
  await loaded(page, '#caseBody .contact .av');
  expect(errors).toEqual([]);
});
