// Phone layout and touch: with an iPhone device profile, in portrait and landscape, the game fits on
// one screen with no scrolling, every button is on screen and at least 44 px tall, the keyboard help
// is hidden, a tap on the street walks the agent there, a drag turns the camera, and Pause, Map and
// Feedback work by touch.
const { test, expect, devices } = require('@playwright/test');

const iPhone = { ...devices['iPhone 13'] };
delete iPhone.defaultBrowserType;

// The repo copy plus both Pages copies (prod at the root, dev under /dev/) built by
// .github/scripts/build-site.sh into _site-test/ before the tests start (see playwright.config.js).
const SITES = [['repo', '/index.html'], ['prod', '/_site-test/index.html'], ['dev', '/_site-test/dev/index.html']];
const ready = (page) => page.waitForFunction(() => window.__agent && window.__agent.stats.frames > 2, null, { timeout: 60000 });

// The case file opens after Begin (on builds that have cases): take the case like a player would.
async function takeCase(page) {
  const sheet = page.locator('#casesheet'); // the case file, then (on newer builds) the handler's message
  for (let i = 0; i < 3 && await sheet.count() && await sheet.isVisible(); i++) await page.tap('#caseBody button >> nth=0');
}

for (const [site, url] of SITES)
for (const [name, viewport] of [['portrait', { width: 390, height: 844 }], ['landscape', { width: 844, height: 390 }]]) {
  test.describe(`${site} phone ${name} ${viewport.width}x${viewport.height}`, () => {
    test.use({ ...iPhone, viewport });

    test('fits without scrolling, with big enough buttons', async ({ page }) => {
      await page.goto(url); await ready(page);
      await page.tap('#start'); await takeCase(page);
      const r = await page.evaluate(() => {
        const box = (el) => { const b = el.getBoundingClientRect(); return { top: b.top, left: b.left, bottom: b.bottom, right: b.right, height: b.height }; };
        return {
          vw: innerWidth, vh: innerHeight,
          scrollW: document.documentElement.scrollWidth, scrollH: document.documentElement.scrollHeight,
          canvas: box(document.getElementById('game')),
          buttons: [...document.querySelectorAll('#touch button, #pause, #feedback')].map((b) => ({ id: b.id || b.dataset.act, ...box(b) })),
          helpShown: getComputedStyle(document.querySelector('.help')).display !== 'none',
        };
      });
      expect(r.scrollH, 'no vertical scrolling').toBeLessThanOrEqual(r.vh);
      expect(r.scrollW, 'no horizontal scrolling').toBeLessThanOrEqual(r.vw);
      expect(r.canvas.height).toBeGreaterThan(200);
      expect(r.buttons).toHaveLength(5);
      for (const b of r.buttons) {
        expect(b.top >= 0 && b.left >= 0 && b.bottom <= r.vh && b.right <= r.vw, `${b.id} in view`).toBe(true);
        expect(b.height, `${b.id} at least 44 px tall`).toBeGreaterThanOrEqual(44);
      }
      expect(r.helpShown, 'keyboard help hidden on touch').toBe(false);
    });

    test('tap the street to walk, drag to turn, pause and resume', async ({ page }) => {
      await page.goto(url); await ready(page);
      await page.tap('#start'); await takeCase(page);
      const vp = page.viewportSize();
      const before = await page.evaluate(() => [window.__agent.agent.x, window.__agent.agent.z]);
      await page.touchscreen.tap(vp.width / 2, vp.height * 0.78); // the paving just ahead of the agent
      await expect.poll(() => page.evaluate(() => window.__agent.stats.lastWalkFound)).toBe(true);
      await expect.poll(() => page.evaluate((b) => Math.hypot(window.__agent.agent.x - b[0], window.__agent.agent.z - b[1]), before), { timeout: 15000 }).toBeGreaterThan(1);
      const yaw = await page.evaluate(() => window.__agent.cam.yaw);
      await page.mouse.move(vp.width / 2, vp.height / 2); await page.mouse.down();
      await page.mouse.move(vp.width / 2 + 120, vp.height / 2, { steps: 6 }); await page.mouse.up();
      expect(await page.evaluate(() => window.__agent.cam.yaw)).not.toBeCloseTo(yaw, 2);
      await page.tap('#pause');
      expect(await page.evaluate(() => window.__agent.state.paused)).toBe(true);
      await page.tap('#paused button');
      expect(await page.evaluate(() => window.__agent.state.paused)).toBe(false);
    });
  });
}

test.describe('on a phone', () => {
  test.use({ ...iPhone, viewport: { width: 390, height: 844 } });

  test('the Map jumps to Ponte Vecchio', async ({ page }) => {
    await page.goto('/index.html'); await ready(page);
    await page.tap('#start'); await takeCase(page);
    await page.tap('#touch [data-act="map"]');
    await expect(page.locator('#map')).toBeVisible();
    await page.tap('#places [data-place="ponte"]');
    await expect(page.locator('#map')).toBeHidden();
    await expect.poll(() => page.evaluate(() => window.__agent.state.area)).toBe('Lungarno degli Archibusieri');
  });

  test('Feedback pauses and opens a prefilled feedback issue', async ({ page }) => {
    await page.goto('/index.html'); await ready(page);
    await page.evaluate(() => { window.__opened = []; window.open = (u) => { window.__opened.push(u); return null; }; });
    await page.tap('#start'); await takeCase(page);
    await page.tap('#feedback');
    expect(await page.evaluate(() => window.__agent.state.paused)).toBe(true);
    const opened = await page.evaluate(() => window.__opened);
    expect(opened).toHaveLength(1);
    const u = new URL(opened[0]);
    expect(u.origin + u.pathname).toBe('https://github.com/hitoshi85/secret-agent-simulator/issues/new');
    expect(u.searchParams.get('template')).toBe('feedback.yml');
    expect(u.searchParams.get('context')).toContain('Where: Piazza del Duomo');
    expect(u.searchParams.get('device')).toBeTruthy();
  });
});
