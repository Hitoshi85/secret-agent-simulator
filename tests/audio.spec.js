// Sound (src/audio.js): nothing plays before the first tap; after it the engine note follows the red
// car's speed, braking squeals, crests thump on landing, footsteps tick on stone, a wrong accusation
// plays the Heat sting and buttons click, all within the live audio node budget and with no page
// errors. The mute button on the pause screen silences it and is remembered after a reload.
const { test, expect } = require('@playwright/test');

async function open(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('/index.html');
  await page.waitForFunction(() => window.__agent && window.__agent.stats.frames > 2, null, { timeout: 60000 });
  return errors;
}
const MAX = 64;

test('the chase and the walk make sound within the node budget', async ({ page }) => {
  test.setTimeout(180000);
  const errors = await open(page);
  expect(await page.evaluate(() => window.__agent.audio.ctx), 'no audio before the first tap').toBeNull();
  await page.click('#begin'); // the first tap starts sound
  await page.waitForFunction(() => window.__agent.audio.stats.state === 'running', null, { timeout: 10000 });
  await page.waitForFunction(() => window.__agent.audio.stats.bed === true, null, { timeout: 10000 }); // the handler's card: the quiet bed plays
  const r = await page.evaluate(async () => {
    const A = window.__agent, C = A.chase, S = A.audio.stats;
    A.paused = true; C.action('stage'); C.action('drive');
    const hz = [], squeal = []; let bed = null;
    for (let i = 0; i < 1300 && C.status === 'driving'; i++) {
      const p = C.player, want = (1.1 - p.d) * 0.25 - p.psi * 2.5;
      C.input.keys.left = want < -0.08; C.input.keys.right = want > 0.08;
      C.input.keys.brake = i >= 400 && i < 430;
      A.step(1 / 30);
      if (i === 30 || i === 390) hz.push([Math.round(p.v), S.engineHz]);
      if (i === 420) squeal.push(S.squeal);
      if (i === 200) { await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); bed = S.bed; } // each frame turns the bed off while driving
      if (i % 50 === 0) await new Promise((r) => setTimeout(r, 0)); // let one-shot voices end
    }
    C.input.keys.brake = false;
    return { hz, squeal, land: S.played.land, peak: S.peak, bed };
  });
  expect(r.hz[1][0], 'the car sped up').toBeGreaterThan(r.hz[0][0]);
  expect(r.hz[1][1], 'and the engine note changed with it').not.toBe(r.hz[0][1]);
  expect(r.squeal[0], 'braking squeals').toBeGreaterThan(0);
  expect(r.land, 'a thump on landing after a crest').toBeGreaterThan(0);
  expect(r.peak).toBeLessThanOrEqual(MAX);
  expect(r.bed, 'no music bed while driving').toBe(false);

  // On foot: footsteps on stone, the Heat sting on a wrong accusation, and a click on buttons.
  const f = await page.evaluate(async () => {
    const A = window.__agent, S = A.audio.stats;
    A.chase.action('skip');
    for (let i = 0; i < 3 && A.caseView.sheetOpen(); i++) A.act('close'); // the case file, then the handler's lead
    A.act('walkTo', ...A.PLACES.find((p) => p.id === 'calzaiuoli').at, true); // a long walk south down the street
    for (let i = 0; i < 120; i++) { A.step(1 / 30); if (i % 20 === 0) await new Promise((r) => setTimeout(r, 0)); }
    const steps = S.played.step;
    const wrong = A.case.suspects.find((s) => !s.thief);
    A.act('accuse', wrong.id); A.step(1 / 30);
    document.querySelector('#touch button').click();
    return { steps, sting: S.played.sting, tick: S.played.tick, peak: S.peak, heat: A.case.heat };
  });
  expect(f.steps, 'footsteps while walking').toBeGreaterThan(3);
  expect(f.heat).toBe(1);
  expect(f.sting, 'Heat rose: one sting').toBe(1);
  expect(f.tick).toBeGreaterThan(0);
  expect(f.peak, 'live audio nodes stay within the budget').toBeLessThanOrEqual(MAX);
  expect(errors).toEqual([]);
});

test('the pause screen mutes sound, and it stays muted after a reload', async ({ page }) => {
  const errors = await open(page);
  await page.click('#start');
  await page.evaluate(() => window.__agent.act('close'));
  await page.click('#pause');
  await expect(page.locator('#sound')).toHaveText('🔊 Sound on');
  await page.click('#sound');
  await expect(page.locator('#sound')).toHaveText('🔇 Sound off');
  await page.waitForFunction(() => window.__agent.audio.stats.state === 'suspended');
  await page.reload();
  await page.waitForFunction(() => window.__agent && window.__agent.stats.frames > 2, null, { timeout: 60000 });
  await page.click('#start');
  await page.evaluate(() => window.__agent.act('close'));
  expect(await page.evaluate(() => [window.__agent.audio.muted, window.__agent.audio.ctx]), 'muted, and no audio made').toEqual([true, null]);
  await page.click('#pause');
  await expect(page.locator('#sound')).toHaveText('🔇 Sound off');
  await page.click('#sound');
  await page.waitForFunction(() => window.__agent.audio.stats.state === 'running');
  expect(errors).toEqual([]);
});
