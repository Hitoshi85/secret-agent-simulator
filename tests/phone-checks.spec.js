// Automatic phone and speed checks that run on every PR.
// 1. Phone screenshots: portrait and landscape, on the title and at each landmark, saved to
//    phone-screenshots/ (CI uploads them as an artifact so each PR can be eyeballed on phone size).
// 2. Rendering budget at phone size. CI renders WebGL in software (SwiftShader), so wall-clock frame
//    time there says little about a real phone's GPU. Instead every view must stay within a budget
//    of draw calls and triangles that phones handle at 60 fps, and the game's own per-frame work
//    (step: agent, crowd, camera) must stay under 4 ms. Frame times are reported in the job summary.
const fs = require('fs');
const path = require('path');
const { test, expect, devices } = require('@playwright/test');

const iPhone = { ...devices['iPhone 13'] };
delete iPhone.defaultBrowserType; // keep size, touch and mobile settings but run on Chromium

const BUDGET = { calls: 250, triangles: 400000, stepMs: 4 };
const SHOTS = path.join(__dirname, '..', 'phone-screenshots');
const VIEWS = ['duomo', 'calzaiuoli', 'signoria', 'ponte', 'oltrarno'];

async function ready(page) {
  await page.goto('/index.html');
  await page.waitForFunction(() => window.__agent && window.__agent.stats.frames > 2, null, { timeout: 60000 });
}
async function at(page, place) {
  await page.evaluate((place) => { const A = window.__agent; A.paused = true; A.act('start'); A.act('close'); A.act('jump', place); for (let i = 0; i < 10; i++) A.step(0.05); A.render(); }, place);
}
function summary(head, line) {
  if (!process.env.GITHUB_STEP_SUMMARY) return;
  const has = fs.existsSync(process.env.GITHUB_STEP_SUMMARY) && fs.readFileSync(process.env.GITHUB_STEP_SUMMARY, 'utf8').includes(head.split('\n')[0]);
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, (has ? '' : head) + line);
}

for (const [name, viewport] of [['portrait', { width: 390, height: 844 }], ['landscape', { width: 844, height: 390 }]]) {
  test.describe(`phone ${name}`, () => {
    test.use({ ...iPhone, viewport });

    test('screenshots of the title and each landmark', async ({ page }) => {
      test.setTimeout(120000);
      fs.mkdirSync(SHOTS, { recursive: true });
      await ready(page);
      await page.screenshot({ path: path.join(SHOTS, `${name}-title.png`) });
      for (const v of VIEWS) {
        await at(page, v);
        await page.evaluate(() => document.getElementById('toast').classList.remove('on'));
        await page.screenshot({ path: path.join(SHOTS, `${name}-${v}.png`) });
      }
      expect(fs.statSync(path.join(SHOTS, `${name}-duomo.png`)).size).toBeGreaterThan(20000);
    });

    test(`every view stays within ${BUDGET.calls} draw calls, ${BUDGET.triangles / 1000}k triangles and ${BUDGET.stepMs} ms of game work`, async ({ page }) => {
      test.setTimeout(240000);
      await ready(page);
      for (const v of VIEWS) {
        await at(page, v);
        const t = await page.evaluate(() => {
          const A = window.__agent, steps = [], frames = [];
          A.act('walkTo', A.agent.x + 30 * Math.sin(A.agent.heading), A.agent.z + 30 * Math.cos(A.agent.heading));
          let calls = 0, triangles = 0;
          for (let i = 0; i < 16; i++) {
            const t0 = performance.now(); A.step(1 / 30); const t1 = performance.now(); A.render(); const t2 = performance.now();
            if (i >= 3) { steps.push(t1 - t0); frames.push(t2 - t0); }
            calls = Math.max(calls, A.stats.calls); triangles = Math.max(triangles, A.stats.triangles);
          }
          const med = (a) => a.sort((x, y) => x - y)[Math.floor(a.length / 2)];
          return { step: med(steps), frame: med(frames), calls, triangles };
        });
        console.log(`${name} ${v}: ${t.calls} calls, ${t.triangles} triangles, step ${t.step.toFixed(2)} ms, frame ${t.frame.toFixed(1)} ms (software GL)`);
        summary('### Rendering budget (phone size)\n\n| View | Draw calls | Triangles | Game work (step) | Frame in CI (software GL, info only) |\n|---|---|---|---|---|\n',
          `| ${name} ${v} | ${t.calls} / ${BUDGET.calls} | ${t.triangles} / ${BUDGET.triangles} | ${t.step.toFixed(2)} / ${BUDGET.stepMs} ms | ${t.frame.toFixed(1)} ms |\n`);
        expect(t.calls, `draw calls at ${v}`).toBeLessThanOrEqual(BUDGET.calls);
        expect(t.triangles, `triangles at ${v}`).toBeLessThanOrEqual(BUDGET.triangles);
        expect(t.step, `game work per frame at ${v}`).toBeLessThanOrEqual(BUDGET.stepMs);
      }
    });
  });
}
