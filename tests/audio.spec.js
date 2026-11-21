// Sound (src/audio.js): nothing plays before the first tap; after it the engine note follows the red
// car's speed, braking scrubs the tyres, the piano jazz stops while driving and plays on foot, crests thump on landing, footsteps tick on stone, a wrong accusation
// plays the Heat sting and buttons click, all within the live audio node budget and with no page
// errors. The mute button on the pause screen silences it and is remembered after a reload.
const { test, expect, chromium } = require('@playwright/test');

async function open(page, url = '/index.html') {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url);
  await page.waitForFunction(() => window.__agent && window.__agent.stats.frames > 2, null, { timeout: 60000 });
  return errors;
}
const MAX = 96;

test('the chase and the walk make sound within the node budget', async ({ page }) => {
  test.setTimeout(180000);
  const errors = await open(page, '/index.html?case=dossier'); // a wrong accusation plays the sting
  expect(await page.evaluate(() => window.__agent.audio.ctx), 'no audio before the first tap').toBeNull();
  await page.click('#begin'); // the first tap starts sound
  await page.waitForFunction(() => window.__agent.audio.stats.state === 'running', null, { timeout: 10000 });
  await page.waitForFunction(() => window.__agent.audio.stats.bed === true, null, { timeout: 10000 }); // the handler's card: the quiet bed plays
  const r = await page.evaluate(async () => {
    const A = window.__agent, C = A.chase, S = A.audio.stats;
    A.paused = true; C.action('stage'); C.action('drive');
    const hz = [], squeal = []; let bed = null, landings = 0;
    for (let i = 0; i < 1300 && C.status === 'driving'; i++) {
      const p = C.player, want = (1.1 - p.d) * 0.25 - p.psi * 2.5;
      C.input.keys.left = want < -0.08; C.input.keys.right = want > 0.08;
      C.input.keys.brake = i >= 400 && i < 430;
      if (i === 600) { p.y += 2; p.vy = 0; } // a hop, in case this run's road has no crest big enough
      A.step(1 / 30);
      if (p.landed) landings++;
      if (i % 15 === 0) hz.push([p.v, S.engineHz]); // speed and engine note through the drive
      if (i === 420) squeal.push(S.squeal);
      if (i === 200) { await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); bed = S.bed; } // each frame turns the bed off while driving
      if (i % 10 === 0) await new Promise((r) => setTimeout(r, 20)); // real time passes too, so one-shot voices end
    }
    C.input.keys.brake = false;
    return { hz, squeal, land: S.played.land, landings, peak: S.peak, bed };
  });
  const slow = r.hz.reduce((m, x) => (x[0] < m[0] ? x : m)), fast = r.hz.reduce((m, x) => (x[0] > m[0] ? x : m));
  expect(fast[0] - slow[0], 'the car changed speed').toBeGreaterThan(10);
  expect(fast[1], 'and the engine note changed with it').not.toBe(slow[1]);
  expect(r.squeal[0], 'braking squeals').toBeGreaterThan(0);
  expect(r.landings, 'the car left the ground').toBeGreaterThan(0);
  expect(r.land, 'a thump on every landing').toBe(r.landings);
  expect(r.peak).toBeLessThanOrEqual(MAX);
  expect(r.bed, 'no music bed while driving').toBe(false);

  // On foot: footsteps on stone, the Heat sting on a wrong accusation, and a click on buttons.
  const f = await page.evaluate(async () => {
    const A = window.__agent, S = A.audio.stats;
    A.chase.action('skip');
    for (let i = 0; i < 3 && A.caseView.sheetOpen(); i++) A.act('close'); // the case file, then the handler's lead
    A.act('walkTo', ...A.PLACES.find((p) => p.id === 'calzaiuoli').at, true); // a long walk south down the street
    for (let i = 0; i < 120; i++) { A.step(1 / 30); if (i % 5 === 0) await new Promise((r) => setTimeout(r, 20)); }
    const steps = S.played.step;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); const bed = S.bed; // the jazz plays on foot too
    const wrong = A.case.suspects.find((s) => !s.thief);
    A.act('accuse', wrong.id); A.step(1 / 30);
    document.querySelector('#touch button').click();
    return { steps, bed, sting: S.played.sting, tick: S.played.tick, peak: S.peak, heat: A.case.heat };
  });
  expect(f.steps, 'footsteps while walking').toBeGreaterThan(3);
  expect(f.bed, 'piano jazz in Florence').toBe(true);
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

// Phones: a real touch tap must start sound with Chrome's autoplay rule on (touch pointerdown alone is
// not a user activation), and on iPhone the page asks to play through the silent switch.
test('on a phone, the first touch tap starts sound and asks to play through the silent switch', async ({ browserName }, info) => {
  test.skip(browserName !== 'chromium');
  const browser = await chromium.launch({ args: ['--autoplay-policy=user-gesture-required'] });
  const page = await (await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 }, baseURL: info.project.use.baseURL })).newPage();
  await page.addInitScript(() => { Object.defineProperty(navigator, 'audioSession', { value: { type: 'auto' }, configurable: true }); });
  const errors = await open(page);
  await page.tap('#begin');
  await page.waitForFunction(() => window.__agent.audio.stats.state === 'running', null, { timeout: 10000 });
  expect(await page.evaluate(() => navigator.audioSession.type), 'plays like media, not muted by the silent switch').toBe('playback');
  await browser.close();
  expect(errors.filter((e) => !/AudioContext was not allowed to start/.test(e))).toEqual([]);
});
