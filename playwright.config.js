// Headless tests for the game. Run with `npm test`.
const { defineConfig, devices } = require('@playwright/test');

const PORT = 4173;

module.exports = defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  // Software WebGL is slow, and slower still with many browsers at once: allow time, use few workers.
  timeout: 120000,
  expect: { timeout: 20000 },
  workers: process.env.CI ? 2 : 3,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // WebGL in headless Chromium: software rendering through SwiftShader.
    launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } } }],
  webServer: {
    // Also builds the dev/prod Pages layout from the working tree into _site-test/ for the site tests.
    command: `bash .github/scripts/build-site.sh . . _site-test prod-test && node tests/serve.js ${PORT}`,
    url: `http://127.0.0.1:${PORT}/index.html`,
    reuseExistingServer: !process.env.CI,
  },
});
