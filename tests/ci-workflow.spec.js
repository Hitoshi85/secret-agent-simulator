// Checks on the CI and Pages workflows that the merge queue relies on (no browser needed).
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const q = require('../.github/scripts/merge-queue.js');

const read = (f) => fs.readFileSync(path.join(__dirname, '..', '.github', 'workflows', f), 'utf8');
// The text of one top-level job, from its key to the next job.
const job = (yml, id) => {
  const m = yml.match(new RegExp(`^  ${id}:\\n([\\s\\S]*?)(?=^  [\\w-]+:\\n|(?![\\s\\S]))`, 'm'));
  return m ? m[1] : '';
};

test('CI still reports the one check that main and the merge queue require', () => {
  const ci = read('ci.yml');
  const check = job(ci, 'check');
  expect(check).toContain(`name: ${q.REQUIRED_CHECK}`);
  // It sums up lint and every test shard, even when the shards were skipped.
  expect(check).toMatch(/needs: \[changes, lint, test\]/);
  expect(check).toMatch(/if: always\(\)/);
  expect(job(ci, 'wake-queue')).toMatch(/needs: check/);
});

test('the browser tests run in 3 shards, and README-only changes skip them', () => {
  const ci = read('ci.yml');
  const tests = job(ci, 'test');
  expect(tests).toMatch(/shard: \[1, 2, 3\]/);
  expect(tests).toContain('--shard=${{ matrix.shard }}/3');
  expect(tests).toContain("needs.changes.outputs.readme_only != 'true'");
  expect(job(ci, 'changes')).toContain("grep -cvx 'README.md'");
  // The lint job still checks README links against REQUIREMENTS.md.
  expect(job(ci, 'lint')).toContain('tests/requirements.spec.js');
  // The before screenshots from main no longer hold up the required check.
  expect(job(ci, 'main-screenshots')).toContain('continue-on-error: true');
  expect(job(ci, 'check')).not.toContain('main-src');
});

test('the deploy tests main in 3 shards before it goes live', () => {
  const pages = read('pages.yml');
  const tests = job(pages, 'test');
  expect(tests).toMatch(/shard: \[1, 2, 3\]/);
  expect(tests).toContain('--shard=${{ matrix.shard }}/3');
  expect(job(pages, 'deploy')).toMatch(/needs: test/);
});
