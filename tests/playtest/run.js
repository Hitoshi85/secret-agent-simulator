// The AI playtester: plays the dossier case, Case 02 and the car chase as three personas (novice,
// efficient, careless) over many seeds through window.__agent, and writes a report.
//   npm run playtest                 20 seeds per persona and mode
//   npm run playtest -- --seeds 5    fewer seeds; --modes chase,dossier picks modes; --variant speed2.5 plays a ?variant=
// Writes playtest/playtest-report.json (every run's timeline) and playtest/playtest-report.md (the
// summary, also added to the GitHub job summary in CI). Report only: targets show met or missed and
// never fail the run. The personas are in tests/playtest/drivers.js.
const { chromium } = require('@playwright/test');
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { summarise, markdown, SEEDED } = require('./report.js');

const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, 'playtest');
const arg = (name, def) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : def; };
const SEEDS = Number(arg('seeds', process.env.PLAYTEST_SEEDS || 20));
const MODES = arg('modes', 'dossier,compass,chase').split(',');
const PERSONAS = ['novice', 'efficient', 'careless'];
const WORKERS = Number(arg('workers', process.env.PLAYTEST_WORKERS || 3));
const PORT = Number(arg('port', 4180));
const VARIANT = arg('variant', ''); // --variant speed2.5: play a ?variant= build
const q = VARIANT ? `&variant=${VARIANT}` : '';
const URL = { dossier: `/index.html?case=dossier${q}`, compass: `/index.html?case=compass${q}`, chase: `/index.html?${q.slice(1)}` };

async function openMode(browser, mode) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(SEEDED);
  await page.goto(`http://127.0.0.1:${PORT}${URL[mode]}`);
  await page.waitForFunction(() => window.__agent && window.__agent.stats.frames > 2, null, { timeout: 90000 });
  await page.evaluate(async (mode) => {
    const A = window.__agent; A.paused = true;
    window.__play = await import('/tests/playtest/drivers.js');
    if (mode === 'chase') { A.act('chase'); } else A.act('start');
  }, mode);
  return { page, errors };
}

async function main() {
  const t0 = Date.now();
  fs.mkdirSync(OUT, { recursive: true });
  const server = spawn(process.execPath, [path.join(ROOT, 'tests/serve.js'), String(PORT)], { stdio: 'ignore' });
  await new Promise((res) => setTimeout(res, 400));
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const jobs = MODES.flatMap((mode) => PERSONAS.map((persona) => ({ mode, persona })));
  const runs = [], problems = [];
  try {
    let next = 0;
    await Promise.all([...Array(Math.min(WORKERS, jobs.length))].map(async () => {
      while (next < jobs.length) {
        const { mode, persona } = jobs[next++];
        const { page, errors } = await openMode(browser, mode);
        const t = Date.now();
        for (let seed = 1; seed <= SEEDS; seed++) {
          try { runs.push(await page.evaluate(({ mode, persona, seed }) => window.__play.PLAY[mode](window.__agent, persona, seed), { mode, persona, seed })); }
          catch (e) { problems.push(`${mode} ${persona} seed ${seed}: ${e.message.split('\n')[0]}`); }
        }
        for (const e of errors) problems.push(`${mode} ${persona}: page error ${e}`);
        console.log(`${mode.padEnd(8)} ${persona.padEnd(10)} ${SEEDS} seeds in ${((Date.now() - t) / 1000).toFixed(1)} s`);
        await page.close();
      }
    }));
  } finally {
    await browser.close(); server.kill();
  }
  let commit = 'local'; try { commit = execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim(); } catch { /* not a checkout */ }
  const summary = summarise(runs);
  const report = { commit, generated: new Date().toISOString(), seeds: SEEDS, seconds: Math.round((Date.now() - t0) / 1000), problems, summary, runs };
  fs.writeFileSync(path.join(OUT, 'playtest-report.json'), JSON.stringify(report, null, 1));
  const md = markdown(report);
  fs.writeFileSync(path.join(OUT, 'playtest-report.md'), md);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n');
  console.log('\n' + md);
}

main().catch((e) => { console.error(e); process.exit(1); });
