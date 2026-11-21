// Merge queue for Secret Agent Simulator, run by .github/workflows/merge-queue.yml through actions/github-script.
//
// Each run looks at open PRs into main, oldest first, and works on the first one that may merge
// on its own (see `eligibility`: small, with a screenshot, no `hold` label, no workflow changes):
//   - behind main      -> test it merged with the current main (a "queue test" CI run, see `queueTest`),
//                         without pushing to the PR branch, and wait for that run
//   - checks running   -> wait (CI wakes the queue when it finishes)
//   - a check failed   -> skip it for now and move on to the next PR
//   - all checks green -> needs a passing project review of its head commit (see `reviewState`),
//                         then squash-merge it, deploy, and start the next run
// One PR at a time, in the order they were opened, so parallel work never lands untested on main.
//
// The queue never pushes to a PR branch. A push made with the built-in token starts no workflows,
// changes the head commit (so the project review goes stale) and makes the bot the last pusher
// (so a "most recent push must be approved" rule refuses the merge). That stalled PR 16 overnight.

const REQUIRED_CHECK = 'Lint and smoke test'; // the job in ci.yml; must be present and green
const MAX_CHANGED_LINES = 800;                // bigger PRs wait for the owner ("m"), unless labelled
const ALLOW_BIG_LABEL = 'automerge';          // lets a PR over the size limit into the queue
const HOLD_LABELS = ['hold', 'do-not-merge']; // keeps a PR out of the queue
const CONFLICT_LABEL = 'queue-conflict';      // set when a PR conflicts with main
const QUEUE_WORKFLOW = 'merge-queue.yml';
const CI_WORKFLOW = 'ci.yml';
const DEPLOY_WORKFLOW = 'pages.yml';
// The queue's own jobs, and the report-only AI playtest (playtest.yml): never wait on them or count them.
const SELF_CHECKS = ['Merge queue', 'Wake the merge queue', 'AI playtest (report only)'];
// Not counted towards the size limit: lock files, images and vendored libraries (vendor/).
const SIZE_IGNORED = [/^package-lock\.json$/, /^docs\/screens\//, /^vendor\//, /\.(png|jpe?g|gif|webp)$/i];
// GITHUB_TOKEN may not push or merge workflow changes, and those deserve the owner's eyes anyway.
const OWNER_ONLY = [/^\.github\/workflows\//];
// The Pages workflow's README play-links update (see the links job in pages.yml): no screenshot, no deploy.
const PLAY_LINKS_BRANCH = 'bot/play-links';

// Project review: a Claude thread in the project reads each PR's diff and posts a PR comment ending in
// `<!-- project-review: PASS <head sha> -->` (or BLOCK). Only comments by the owner's account, members
// or the queue itself count. PRs that only touch docs and images need no review. See docs/REVIEW.md.
const REVIEW_MARKER = /<!--\s*project-review:\s*(PASS|BLOCK)\s+([0-9a-f]{7,40})\s*-->/i;
const REVIEW_TRUSTED = ['OWNER', 'MEMBER', 'COLLABORATOR'];
const REVIEW_BOTS = ['github-actions[bot]'];
const NO_REVIEW_NEEDED = [/\.md$/i, /^docs\//, /\.(png|jpe?g|gif|webp)$/i];

// A queue test is a workflow_dispatch CI run on the PR branch with `base` set to main's commit: CI merges
// that commit into the branch before testing, and names the run after it (see run-name in ci.yml).
const QUEUE_TEST_TITLE = (n, base) => `Queue test of #${n} on main ${base}`;
// Marks the one comment the queue posts when GitHub refuses a merge of a given commit.
const REFUSED_MARKER = (sha) => `<!-- merge-queue: refused ${sha} -->`;

const BAD = new Set(['failure', 'cancelled', 'timed_out', 'action_required', 'startup_failure', 'stale']);

// True for the Pages workflow's own README update: its branch, and README.md is the only file.
function playLinksOnly(pr, files) {
  return pr.head.ref === PLAY_LINKS_BRANCH && files.length > 0 && files.every((f) => f.filename === 'README.md');
}

// True when the PR description shows at least one image (Markdown or HTML).
function hasScreenshot(body) {
  if (!body) return false;
  const text = body.replace(/<!--[\s\S]*?-->/g, ''); // ignore commented-out template text
  return /!\[[^\]]*\]\(\s*\S+?\s*\)/.test(text) || /<img\b[^>]*\bsrc\s*=\s*["']?[^"'\s>]+/i.test(text);
}

// Lines changed, leaving out lock files and images.
function changedLines(files) {
  return files
    .filter((f) => !SIZE_IGNORED.some((re) => re.test(f.filename)))
    .reduce((n, f) => n + (f.additions || 0) + (f.deletions || 0), 0);
}

// Decides whether a PR may merge without the owner. Returns { ok, reason }.
function eligibility(pr, files, repoFullName) {
  const labels = (pr.labels || []).map((l) => (typeof l === 'string' ? l : l.name));
  if (pr.draft) return { ok: false, reason: 'draft' };
  if (pr.base.ref !== 'main') return { ok: false, reason: 'not into main' };
  if (!pr.head.repo || pr.head.repo.full_name !== repoFullName) return { ok: false, reason: 'from a fork' };
  const hold = labels.find((l) => HOLD_LABELS.includes(l));
  if (hold) return { ok: false, reason: `labelled ${hold}` };
  if (!hasScreenshot(pr.body) && !playLinksOnly(pr, files)) return { ok: false, reason: 'no screenshot in the description' };
  const owner = files.find((f) => OWNER_ONLY.some((re) => re.test(f.filename)));
  if (owner) return { ok: false, reason: `changes ${owner.filename}, so the owner merges it` };
  const lines = changedLines(files);
  if (lines > MAX_CHANGED_LINES && !labels.includes(ALLOW_BIG_LABEL)) {
    return { ok: false, reason: `${lines} changed lines (limit ${MAX_CHANGED_LINES}), so the owner merges it` };
  }
  return { ok: true, reason: `${lines} changed lines with a screenshot` };
}

// True when every changed file is documentation or an image, so the PR needs no code review.
function docsOnly(files) {
  return files.length > 0 && files.every((f) => NO_REVIEW_NEEDED.some((re) => re.test(f.filename)));
}

// The project review verdict for a commit, from the PR's comments: 'pass', 'block' or 'missing'.
// The newest trusted verdict for that exact commit wins, so a new push needs a new review.
function reviewState(comments, sha) {
  let state = 'missing';
  for (const c of comments) {
    const trusted = REVIEW_TRUSTED.includes(c.author_association) || REVIEW_BOTS.includes(c.user && c.user.login);
    const m = trusted && REVIEW_MARKER.exec(c.body || '');
    if (m && sha.startsWith(m[2].toLowerCase())) state = m[1].toUpperCase() === 'PASS' ? 'pass' : 'block';
  }
  return state;
}

// CI runs on a commit that GitHub holds for approval.
function parkedRuns(runs) {
  return (runs || []).filter((r) => r.conclusion === 'action_required' || r.status === 'action_required');
}

// True when a CI run on the commit will still report: queued or running, and not parked waiting
// for approval (GitHub holds a pull_request run from github-actions[bot], such as the play-links PR,
// as action_required with no check run; a workflow_dispatch run needs no approval).
function ciRunPending(runs) {
  return (runs || []).some((r) => r.status !== 'completed' && r.conclusion !== 'action_required');
}

// Sums up the check runs on a commit: 'success', 'pending', 'failure' or 'missing'.
// Only the newest run of each check counts, so a passing re-run replaces an old failure.
function checksState(runs) {
  const latest = new Map();
  for (const r of runs) {
    if (SELF_CHECKS.includes(r.name)) continue;
    const prev = latest.get(r.name);
    if (!prev || r.id > prev.id) latest.set(r.name, r);
  }
  const list = [...latest.values()];
  if (list.some((r) => r.status === 'completed' && BAD.has(r.conclusion))) return 'failure';
  if (list.some((r) => r.status !== 'completed')) return 'pending';
  if (!latest.has(REQUIRED_CHECK)) return 'missing';
  return 'success';
}

// The state of the queue test of a PR's head commit on a given main commit: 'success', 'pending',
// 'failure' or 'missing'. Only the newest matching run counts.
function queueTest(runs, n, headSha, baseSha) {
  const title = QUEUE_TEST_TITLE(n, baseSha);
  const mine = (runs || [])
    .filter((r) => r.event === 'workflow_dispatch' && r.head_sha === headSha && r.display_title === title)
    .sort((a, b) => b.id - a.id);
  if (!mine.length) return 'missing';
  const r = mine[0];
  if (r.status !== 'completed') return 'pending';
  return r.conclusion === 'success' ? 'success' : 'failure';
}

async function run({ github, context, core }) {
  const { owner, repo } = context.repo;
  const full = `${owner}/${repo}`;
  const say = (msg) => core.info(msg);
  const summary = [];

  const prs = await github.paginate(github.rest.pulls.list, {
    owner, repo, state: 'open', base: 'main', sort: 'created', direction: 'asc', per_page: 100,
  });
  if (!prs.length) { say('No open PRs into main.'); return; }

  for (const listed of prs) {
    const n = listed.number;
    const { data: pr } = await github.rest.pulls.get({ owner, repo, pull_number: n });
    const files = await github.paginate(github.rest.pulls.listFiles, { owner, repo, pull_number: n, per_page: 100 });
    const el = eligibility(pr, files, full);
    summary.push(`#${n}: ${el.ok ? 'in queue' : 'not in queue'} (${el.reason})`);
    if (!el.ok) { say(`#${n} skipped: ${el.reason}`); continue; }

    const labels = pr.labels.map((l) => l.name);
    if (labels.includes(CONFLICT_LABEL)) { say(`#${n} skipped: ${CONFLICT_LABEL} (fix and remove the label)`); continue; }

    // 0. GitHub parks CI on PRs opened by github-actions[bot] until someone approves the run, and main's
    //    rules never see the required check until it runs. The queue approves that run, but only on
    //    the Pages workflow's own README play-links PRs (owner's choice, 2026-11-16).
    if (playLinksOnly(pr, files)) {
      const { data: wf } = await github.rest.actions.listWorkflowRuns({
        owner, repo, workflow_id: CI_WORKFLOW, head_sha: pr.head.sha, per_page: 20,
      });
      const parked = parkedRuns(wf.workflow_runs);
      if (parked.length) {
        try {
          for (const r of parked) await github.rest.actions.approveWorkflowRun({ owner, repo, run_id: r.id });
          say(`#${n}: approved its parked CI run. Waiting for it.`);
          break;
        } catch (e) { say(`#${n}: could not approve its CI run (${e.message}). Skipping it.`); continue; }
      }
    }

    // 1. It needs a passing project review of its head commit.
    const comments = await github.paginate(github.rest.issues.listComments, { owner, repo, issue_number: n, per_page: 100 });
    const review = docsOnly(files) ? 'pass' : reviewState(comments, pr.head.sha);
    if (review === 'block') { say(`#${n}: the project review found a must-fix problem. Skipping until fixed.`); continue; }
    if (review === 'missing') { say(`#${n}: waiting for the project review of ${pr.head.sha.slice(0, 7)}.`); continue; }

    // 2. Make sure it is tested on top of the current main. A PR that already contains main was tested
    //    as it will land; one that is behind gets a queue test: CI merges main into it and tests that.
    const { data: mainBranch } = await github.rest.repos.getBranch({ owner, repo, branch: pr.base.ref });
    const mainSha = mainBranch.commit.sha;
    const { data: cmp } = await github.rest.repos.compareCommitsWithBasehead({
      owner, repo, basehead: `${mainSha}...${pr.head.sha}`,
    });
    if (cmp.behind_by > 0) {
      if (pr.mergeable === false) {
        say(`#${n} conflicts with main.`);
        await github.rest.issues.addLabels({ owner, repo, issue_number: n, labels: [CONFLICT_LABEL] });
        await github.rest.issues.createComment({
          owner, repo, issue_number: n,
          body: `This PR conflicts with \`main\`, so the merge queue can't test it on top of \`main\`. ` +
            `Update the branch by hand, push, then remove the \`${CONFLICT_LABEL}\` label to put it back in the queue.`,
        });
        continue;
      }
      const { data: wf } = await github.rest.actions.listWorkflowRuns({
        owner, repo, workflow_id: CI_WORKFLOW, head_sha: pr.head.sha, event: 'workflow_dispatch', per_page: 50,
      });
      const tested = queueTest(wf.workflow_runs, n, pr.head.sha, mainSha);
      if (tested === 'failure') { say(`#${n} fails its tests on top of main ${mainSha.slice(0, 7)}. Skipping it.`); continue; }
      if (tested === 'pending') { say(`#${n}: queue test on main ${mainSha.slice(0, 7)} running. Waiting.`); break; }
      if (tested === 'missing') {
        await github.rest.actions.createWorkflowDispatch({
          owner, repo, workflow_id: CI_WORKFLOW, ref: pr.head.ref, inputs: { pr: String(n), base: mainSha },
        });
        say(`#${n} is ${cmp.behind_by} commit(s) behind main: started its queue test on main ${mainSha.slice(0, 7)}.`);
        break;
      }
      say(`#${n} passed its queue test on main ${mainSha.slice(0, 7)}.`);
    }

    // 3. Look at the checks on its head commit.
    const runs = await github.paginate(github.rest.checks.listForRef, { owner, repo, ref: pr.head.sha, per_page: 100 });
    const state = checksState(runs);
    if (state === 'failure') { say(`#${n} has a failing check: skipping until it is fixed.`); continue; }
    if (state === 'missing') {
      const { data: wf } = await github.rest.actions.listWorkflowRuns({
        owner, repo, workflow_id: CI_WORKFLOW, head_sha: pr.head.sha, per_page: 20,
      });
      if (!ciRunPending(wf.workflow_runs)) {
        await github.rest.actions.createWorkflowDispatch({ owner, repo, workflow_id: CI_WORKFLOW, ref: pr.head.ref });
        say(`#${n} had no CI run on ${pr.head.sha.slice(0, 7)}: started one.`);
      } else {
        say(`#${n}: CI is queued. Waiting.`);
      }
      break;
    }
    if (state === 'pending') { say(`#${n}: checks still running. Waiting.`); break; }

    // 4. Green, current and eligible: merge it.
    if (pr.mergeable === false) { say(`#${n}: GitHub reports it cannot merge. Skipping.`); continue; }
    try {
      await github.rest.pulls.merge({
        owner, repo, pull_number: n, sha: pr.head.sha, merge_method: 'squash',
        commit_title: `${pr.title} (#${n})`,
      });
    } catch (e) { // one PR that can't merge must not stop the PRs behind it
      // Keep GitHub's whole answer: for "Repository rule violations found" the lines after it name the rule.
      const why = e.message.trim();
      say(`#${n} could not be merged: ${why}\nSkipping it.`);
      summary.push(`#${n}: merge refused (${why.split('\n')[0]})`);
      if (!comments.some((c) => (c.body || '').includes(REFUSED_MARKER(pr.head.sha)))) {
        await github.rest.issues.createComment({
          owner, repo, issue_number: n,
          body: `GitHub refused the merge queue's merge of ${pr.head.sha.slice(0, 7)}:\n\n` +
            `\`\`\`\n${why}\n\`\`\`\n\nThe queue skips this PR until that is fixed.\n${REFUSED_MARKER(pr.head.sha)}`,
        });
      }
      continue;
    }
    say(`#${n} merged.`);
    await github.rest.issues.createComment({
      owner, repo, issue_number: n,
      body: `Merged by the merge queue: checks green on top of \`main\`, project review passed, ${el.reason}. ` +
        `Deploying now; the play link follows once the live site serves this commit.`,
    });
    try {
      await github.rest.git.deleteRef({ owner, repo, ref: `heads/${pr.head.ref}` });
    } catch (e) { say(`Branch not deleted: ${e.message}`); }
    // A merge made with GITHUB_TOKEN does not fire "push", so start the deploy and the next queue run.
    // A play-links update changes nothing on the site, and deploying it would only open another one.
    if (!playLinksOnly(pr, files)) {
      await github.rest.actions.createWorkflowDispatch({ owner, repo, workflow_id: DEPLOY_WORKFLOW, ref: 'main' });
    }
    await github.rest.actions.createWorkflowDispatch({ owner, repo, workflow_id: QUEUE_WORKFLOW, ref: 'main' });
    break;
  }

  await core.summary.addHeading('Merge queue').addList(summary).write();
}

module.exports = {
  run, hasScreenshot, changedLines, eligibility, MAX_CHANGED_LINES, checksState, REQUIRED_CHECK, reviewState, docsOnly,
  playLinksOnly, PLAY_LINKS_BRANCH, ciRunPending, parkedRuns, queueTest, QUEUE_TEST_TITLE,
};
