// The AI playtester (tests/playtest/): each persona plays every mode to an end through window.__agent,
// a seed replays the same steps, the efficient player always wins, and the report sums the runs up and
// shows Hitoshi's pacing targets as met or missed. `npm run playtest` runs the full 20 seeds.
const { test, expect } = require('@playwright/test');
const { summarise, markdown, SEEDED } = require('./playtest/report.js');

const URL = { dossier: '/index.html?case=dossier', compass: '/index.html?case=compass', chase: '/index.html' };

for (const mode of ['dossier', 'compass', 'chase']) {
  test(`every persona plays ${mode} to an end, and a seed replays the same run`, async ({ page }) => {
    test.setTimeout(180000);
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(SEEDED);
    await page.goto(URL[mode]);
    await page.waitForFunction(() => window.__agent && window.__agent.stats.frames > 2, null, { timeout: 60000 });
    const runs = await page.evaluate(async (mode) => {
      const A = window.__agent; A.paused = true;
      const P = await import('/tests/playtest/drivers.js');
      A.act(mode === 'chase' ? 'chase' : 'start');
      const out = ['novice', 'efficient', 'careless'].map((p) => P.PLAY[mode](A, p, 3));
      out.push(P.PLAY[mode](A, 'novice', 3)); // the same seed again
      return out;
    }, mode);
    const [novice, efficient, , again] = runs;
    for (const r of runs) {
      expect(r.events.length, `${r.persona} has a timeline`).toBeGreaterThan(0);
      expect(r.t).toBeGreaterThan(0);
      expect(['won', 'lost', 'gave up']).toContain(r.result);
      expect(r.longestNoInfo).toBeGreaterThanOrEqual(0);
    }
    expect(efficient.result, 'the efficient player wins').toBe('won');
    expect(efficient.t, 'and is quicker than the novice').toBeLessThan(novice.t);
    // The same deal and the same steps (the crowd carries on between runs, so times can differ a little).
    const steps = (r) => r.events.map((e) => `${e.type} ${e.what || e.result || ''}`);
    expect(steps(again), 'a seed replays the same run').toEqual(steps(novice));
    if (mode === 'dossier') expect(novice.clues, 'the novice visits every lead').toBe(5);
    if (mode === 'compass') expect(efficient.firstRight).toBe(efficient.first);
    if (mode === 'chase') expect(efficient.perTry[0].lowestSight).toBeGreaterThan(0.5);
    expect(errors).toEqual([]);
  });
}

test('the report sums up runs and shows each pacing target as met or missed', () => {
  const run = (mode, persona, t, extra) => ({ mode, persona, seed: 1, t, result: 'won', events: [], longestNoInfo: 30, longestNoInfoBetween: ['start', 'end'], ...extra });
  const runs = [
    run('dossier', 'novice', 720, { wrong: 0, clues: 5 }), run('dossier', 'efficient', 200, { wrong: 0, clues: 3 }),
    run('compass', 'novice', 400, { wrong: 1, heat: 1, seals: 6, first: 6, firstRight: 3 }),
    run('chase', 'novice', 50, { tries: 1, retries: 0, lowestSight: 0.4, perTry: [{ crashes: 2 }] }),
  ];
  const s = summarise(runs), byId = (id, mode) => s.targets.find((t) => t.id === id && t.mode === mode);
  expect(byId('length', 'dossier').met, '12 minutes is in 10–15').toBe(true);
  expect(byId('length', 'compass').met, '6.7 minutes is not').toBe(false);
  expect(byId('dead', 'dossier').met).toBe(true);
  expect(byId('chase', 'chase').met).toBe(true);
  expect(byId('firstTry', 'compass').value).toBe(50);
  expect(byId('firstTry', 'compass').met).toBe(false);
  const md = markdown({ commit: 'abc1234', seeds: 1, seconds: 1, problems: [], summary: s });
  expect(md).toContain('| Case length, novice, median | Case 01, The Dossier | 10–15 min | 12.0 min | met |');
  expect(md).toContain('**missed**');
});
