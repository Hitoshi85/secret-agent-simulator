// Sound check on the repo copy and both built sites (prod and dev, as GitHub Pages serves them): on a
// fresh phone, sound is not muted, and one touch tap on Begin starts audio that is actually heard
// (the quiet bed under the handler's card), with Chrome's autoplay rule enforced. Headless Chromium
// can't model the iPhone silent switch; src/audio.js handles that with navigator.audioSession.
const { test, expect, chromium } = require('@playwright/test');

const SITES = [['repo', '/index.html'], ['prod', '/_site-test/index.html'], ['dev', '/_site-test/dev/index.html']];

for (const [site, url] of SITES) {
  test(`${site}: a fresh phone is not muted and the first tap makes sound`, async ({ browserName }, info) => {
    test.skip(browserName !== 'chromium');
    test.setTimeout(120000);
    const browser = await chromium.launch({ args: ['--autoplay-policy=user-gesture-required'] });
    try {
      const page = await (await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 }, baseURL: info.project.use.baseURL })).newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(url);
      await page.waitForFunction(() => window.__agent && window.__agent.stats.frames > 2, null, { timeout: 60000 });
      expect(await page.evaluate(() => window.__agent.audio.muted), 'sound is on by default').toBe(false);
      await expect(page.locator('#sound')).toHaveText('🔊 Sound on');
      await page.tap('#begin');
      await page.waitForFunction(() => window.__agent.audio.stats.state === 'running', null, { timeout: 10000 });
      let level = 0;
      await expect.poll(async () => (level = await page.evaluate(() => window.__agent.audio.level())), { timeout: 10000, message: 'audible sound after the tap' }).toBeGreaterThan(0.002);
      console.log(`${site}: level ${level.toFixed(4)}`);
      expect(errors).toEqual([]);
    } finally { await browser.close(); }
  });
}
