// The Feedback button sends session context (#37): an in-memory event log, and the prefilled
// GitHub issue's Game context carries mode, stage, time in case, clues, accusations, Heat, chase
// retries, time since the last new clue and the last 10 events, in a link short enough for GitHub.
const { test, expect } = require('@playwright/test');

async function open(page, url = '/index.html') {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url);
  await page.waitForFunction(() => window.__agent && window.__agent.stats.frames > 2, null, { timeout: 60000 });
  await page.evaluate(() => { window.__agent.paused = true; window.open = (href) => { window.__opened = href; return null; }; });
  return errors;
}
const context = (href) => new URL(href).searchParams.get('context');

test('Feedback after a lost chase and some casework carries the session in the issue link', async ({ page }) => {
  test.setTimeout(120000);
  const errors = await open(page, '/index.html?case=dossier'); // walks to a dossier witness
  const href = await page.evaluate(() => {
    const A = window.__agent;
    A.act('chase'); const C = A.chase; C.action('stage'); C.action('drive');
    C.input.keys.brake = true; // stop until he is gone, then retry and skip to Florence
    for (let i = 0; i < 1400 && C.status === 'driving'; i++) A.step(1 / 30);
    C.input.keys.brake = false; C.action('retry'); A.step(1 / 30); C.action('skip'); A.step(1 / 30);
    A.act('close');
    A.act('interact', 'witness', 'flowers'); // walk over and hear the first clue
    for (let i = 0; i < 2000 && A.agent.path; i++) A.step(0.05);
    A.step(0.05); A.act('close');
    A.act('accuse', A.case.suspects.findIndex((s, i) => i !== A.case.thief)); A.step(0.05);
    for (let i = 0; i < 100; i++) A.step(0.1); // ten seconds with nothing new
    A.act('feedback');
    return window.__opened;
  });
  const ctx = context(href);
  expect(href.length, 'GitHub refuses very long new-issue links').toBeLessThanOrEqual(8000);
  expect(new URL(href).searchParams.get('template')).toBe('feedback.yml');
  expect(ctx).toContain('Mode: case (paused)');
  expect(ctx).toMatch(/Chase: 1 retries, lost him 1 times/);
  expect(ctx).toMatch(/Case dossier: open, \d+:\d\d in case/);
  expect(ctx).toMatch(/Clues: 1 of \d+ · Accusations: 1 · Heat: 1 of \d+/);
  expect(ctx).toMatch(/Since last new clue: 0:1\d/);
  const events = ctx.split('Last events:\n')[1].split('\n');
  expect(events.length, 'at most the last 10 events').toBeLessThanOrEqual(10);
  expect(events.join('\n')).toMatch(/chase: lost him[\s\S]*chase: retry[\s\S]*at: Piazza del Duomo/);
  expect(events.join('\n')).toMatch(/clue: 1\/\d+[\s\S]*accuse: suspect \d+: wrong[\s\S]*heat: 1\//);
  expect(errors).toEqual([]);
});

test('Feedback during the chase names the stage; before any clue it says none yet', async ({ page }) => {
  await open(page);
  const chase = await page.evaluate(() => { const A = window.__agent; A.act('chase'); A.chase.action('stage'); A.chase.action('drive'); A.step(1 / 30); A.act('feedback'); return window.__opened; });
  expect(context(chase)).toContain('Mode: chase, stage 1, driving');
  expect(context(chase)).not.toContain('Clues:');
  await open(page);
  const fresh = await page.evaluate(() => { const A = window.__agent; A.act('start'); A.act('close'); for (let i = 0; i < 30; i++) A.step(0.1); A.act('feedback'); return window.__opened; });
  expect(context(fresh)).toMatch(/Clues: 0 of \d+ · Accusations: 0 · Heat: 0 of \d+/);
  expect(context(fresh)).toMatch(/Since last new clue: none yet \(0:0\d in\)/);
});

test('a long session keeps the link under the limit and the log stays in memory', async ({ page }) => {
  await open(page);
  const r = await page.evaluate(async () => {
    const { feedbackUrl, URL_LIMIT, makeSessionLog } = await import('/src/sessionlog.js');
    const log = makeSessionLog();
    for (let i = 0; i < 500; i++) log.add('clue', 'x'.repeat(900));
    const href = feedbackUrl('https://github.com/o/r', ['Game version: t', 'Mode: case'], log.recent(), 'ua '.repeat(3000));
    return { len: href.length, limit: URL_LIMIT, kept: log.events.length, recent: log.recent().length, ctx: new URL(href).searchParams.get('context') };
  });
  expect(r.len).toBeLessThanOrEqual(r.limit);
  expect(r.ctx, 'the summary always survives the trim').toContain('Mode: case');
  expect(r.kept, 'only the latest events are kept').toBe(200);
  expect(r.recent, 'the issue gets the last 10').toBe(10);
});
