const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  { ignores: ['node_modules/', 'test-results/', 'playwright-report/', '_site/', '_site-test/', 'main-src/', 'vendor/', 'phone-screenshots/', 'playtest/'] },
  js.configs.recommended,
  {
    files: ['game.js', 'src/**/*.js', 'tests/playtest/drivers.js'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'module', globals: globals.browser },
    rules: { 'no-unused-vars': ['error', { args: 'none' }] },
  },
  {
    files: ['eslint.config.js', 'playwright.config.js', 'tests/**/*.js', '.github/scripts/**/*.js'],
    ignores: ['tests/playtest/drivers.js'], // runs in the page, as a module
    languageOptions: { ecmaVersion: 2022, sourceType: 'commonjs', globals: { ...globals.node, ...globals.browser } },
  },
];
