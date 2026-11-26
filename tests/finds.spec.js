// Case 02's collectibles (R29): stray cats come out with Heat (two at Heat 0, two more per point),
// stalls hold Florence food and souvenirs, finds go into an album kept on the phone, and none of it
// changes the case. Case 01 has none of it.
const { test, expect } = require('@playwright/test');

async function open(page, url = '/index.html?case=compass') {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url);
  await page.waitForFunction(() => window.__agent && window.__agent.stats.frames > 2, null, { timeout: 60000 });
  await page.evaluate(() => { localStorage.clear(); window.__agent.paused = true; window.__agent.act('start'); window.__agent.act('close'); });
  return errors;
}

test('strays follow Heat, finds fill the album and stay on the phone, the case is unchanged', async ({ page }) => {
  const errors = await open(page);
  const r = await page.evaluate(() => {
    const A = window.__agent, v = A.caseView, f = v.finds;
    const visibleCats = () => f.targets.filter((t) => t.kind === 'cat' && t.mesh.visible).length;
    const out = { start: visibleCats(), stalls: f.targets.filter((t) => t.kind === 'find' && t.mesh.visible).length };
    for (let i = 0; i < 300; i++) A.step(1 / 30); // the strays wander and stay on the streets
    out.onStreets = f.targets.filter((t) => t.kind === 'cat' && t.mesh.visible).every((t) => A.walkable(t.mesh.position.x, t.mesh.position.z));
    A.case.heat = 1; A.step(1 / 30); out.heat1 = visibleCats();
    A.case.heat = 2; A.step(1 / 30); out.heat2 = visibleCats();
    out.leads = A.navaids ? v.leads().every((t) => t.kind === 'seal' || t.kind === 'ledger') : false;
    const heat = A.case.heat;
    const cat = f.targets.find((t) => t.kind === 'cat' && t.mesh.visible);
    out.pet = v.interact(cat); out.card = document.getElementById('caseBody').textContent.includes('New in your album: 1 of 17');
    out.again = v.interact(cat); out.catStays = cat.mesh.visible;
    const gelato = f.targets.find((t) => t.id === 'gelato');
    out.food = v.interact(gelato); out.taken = !gelato.mesh.visible;
    out.saved = JSON.parse(localStorage.getItem('album')).sort();
    out.expect = [cat.id, 'gelato'].sort();
    out.heatSame = A.case.heat === heat;
    v.album(); out.album = document.getElementById('caseBody').textContent.includes('Stray cats · 1 / 8') && document.getElementById('caseBody').textContent.includes('Food · 1 / 6');
    A.act('close'); A.act('again'); out.afterAgain = { cats: visibleCats(), gelato: gelato.mesh.visible, album: v.finds.album.size };
    return out;
  });
  expect(r.start).toBe(2);
  expect(r.stalls).toBe(9);
  expect(r.onStreets).toBe(true);
  expect(r.heat1).toBe(4);
  expect(r.heat2).toBe(6);
  expect(r.leads).toBe(true);
  expect(r.pet).toBe('found');
  expect(r.card).toBe(true);
  expect(r.again).toBe('again');
  expect(r.catStays).toBe(true);
  expect(r.food).toBe('found');
  expect(r.taken).toBe(true);
  expect(r.saved).toEqual(r.expect);
  expect(r.heatSame).toBe(true);
  expect(r.album).toBe(true);
  expect(r.afterAgain).toEqual({ cats: 2, gelato: true, album: 2 });

  // The album survives a reload.
  await page.reload();
  await page.waitForFunction(() => window.__agent && window.__agent.stats.frames > 2, null, { timeout: 60000 });
  const kept = await page.evaluate(() => { window.__agent.act('start'); return window.__agent.caseView.finds.album.size; });
  expect(kept).toBe(2);
  expect(errors).toEqual([]);
});

test('every stall stands on a street and Case 01 has no strays or stalls', async ({ page }) => {
  await open(page, '/index.html?case=dossier');
  const r = await page.evaluate(async () => {
    const { ITEMS, CATS, catsFor } = await import('/src/case/finds.js');
    return { onStreet: ITEMS.every((i) => window.__agent.walkable(...i.at)), finds: !!window.__agent.caseView.finds, n: CATS.length + ITEMS.length, cats: [0, 1, 2, 3].map(catsFor) };
  });
  expect(r).toEqual({ onStreet: true, finds: false, n: 17, cats: [2, 4, 6, 6] });
});

test('?variant=items2, items3 and items4 put 2, 3 or 4 of each thing on the streets, spread apart', async ({ page }) => {
  for (const [v, n] of [['items2', 18], ['items3', 27], ['items4', 36]]) {
    await open(page, `/index.html?case=compass&variant=${v}`);
    const r = await page.evaluate(() => {
      const A = window.__agent, s = A.caseView.finds.targets.filter((t) => t.kind === 'find');
      let close = 0;
      for (const a of s) for (const b of s) if (a !== b && Math.hypot(a.at[0] - b.at[0], a.at[1] - b.at[1]) < 15) close++;
      return { n: s.length, onStreet: s.every((t) => A.walkable(...t.at)), close, leads: A.caseView.leads().every((t) => t.kind !== 'find') };
    });
    expect(r, v).toEqual({ n, onStreet: true, close: 0, leads: true });
  }
});
