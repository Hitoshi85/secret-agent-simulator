# Secret Agent Simulator: notes for Claude

An original, cerebral secret agent game for phone browsers (tradecraft and deduction, international
travel, expensive cars, trains), starting in a hand-built 3D Florence. Genre-inspired, never a copy of
an existing game or film: no names, characters, art, music, missions or UI lifted from them.
Plain HTML/CSS/JS with Three.js and no build step. GitHub Pages deploys `index.html`, `game.js`,
`src/`, `style.css` and `vendor/` (and `assets/` if present) from `main`.

## Code layout

`game.js` is the entry module (`<script type="module">`): it builds the city, runs the main loop and
exposes `window.__agent`. Three.js is vendored under `vendor/three-<version>/` and imported as `three`
(and `three/addons/...`) through the import map in `index.html`; to upgrade it, add a new versioned
folder and point the import map at it. No bundler.

| Module | Owns |
|---|---|
| `src/world/city.js` | The slice's layout in metres (x east, z south): walkable areas (`WALK`), the river, landmark footprints, Map places, the start, `areaAt` |
| `src/world/nav.js` | The 2 m walkability grid, `walkable`, `cellAt`, `nearestWalkable`, `lineClear` and A* `findPath` |
| `src/world/rand.js` | Seeded random numbers (the city and crowd look the same every load) |
| `src/world/textures.js` | Every texture, painted on canvases at startup: palazzo facades, marble, the Duomo front, stone, paving, sky |
| `src/world/buildings.js` | The ordinary city: palazzi filling every 16 m cell that is not a street or landmark, merged into a few meshes |
| `src/world/landmarks.js` | Duomo, campanile, Baptistery, Palazzo Vecchio, Loggia, Neptune, the Arno and Ponte Vecchio, the hills |
| `src/world/merge.js` | `mergeByMaterial`: bakes static meshes into one mesh per material (keeps draw calls low) |
| `src/people/figure.js` | People as one vertex-coloured mesh per walking pose; looks (`randomLook`), `makeFigure`, `setPose` |
| `src/people/crowd.js` | The strolling crowd |
| `src/agent.js` | The player's agent: tap-to-walk paths, keyboard walking, the placeholder look |
| `src/camera.js` | Third-person follow camera: yaw and pitch from drags, swing behind while walking, pull-in near walls |
| `src/scene.js` | Renderer, light, shadows following the agent, sky, fog and ground |
| `src/ui.js` | HUD, buttons, taps and drags on the canvas, keys, toasts |
| `src/audio.js` | All sound, made in code with Web Audio: engine, tyres, brake, landings, footsteps, the Heat sting, button clicks, the quiet music bed; mute (remembered), the live node budget |
| `src/mapdraw.js` | The city drawn from above on a 2D canvas (blocks, streets, river, landmarks, labels), pins and the agent's arrow |
| `src/navaids.js` | Edge arrows to unvisited leads (distance only), the corner minimap and the big Map |
| `src/cases/*.js` | One data file per case (text, traits, witnesses, traces, places); `src/cases/index.js` lists them, `?case=<id>` picks one |
| `src/case/engine.js` | Case rules shared by every case, no 3D or page code: random thief, one-trait decoys, clues, the phone pattern, accusations, Heat |
| `src/case/view.js` | A case in the city and on screen: witnesses, traces and suspects to tap, the case file, talk card, Notebook, phone puzzle, endings |
| `src/case/quiz.js`, `seals.js`, `sealview.js` | Seal cases (`kind: 'seals'`, Case 02): question generators and checks; the rules (seals in any order, Heat, word guess); the seal board and question sheets |
| `src/chase/land.js` | The opening car chase's countryside, one stage at a time: the road (samples, crests, cypress avenues), ground, farms, Pienza, Florence ahead, trees; `sampleRoad` |
| `src/chase/cars.js` | The chase cars (original designs): the red two-door with brake lights, the black off-roader, oncoming traffic; each merged to one mesh per material |
| `src/chase/drive.js` | Chase rules, no 3D or page code: the red car's steering, brake, crashes and air time, the off-roader's driving, oncoming traffic, the In Sight meter |
| `src/chase/chase.js` | The chase on screen: its own scene and camera, stages, the handler call and cards, the 3-2-1 count, HUD (speedometer, Brake, gap tag, In Sight), the route map when paused, touch and keys |

Performance on phones comes first: merge static geometry (`mergeByMaterial` or the builders in
`buildings.js`), share materials, avoid per-frame allocations, and keep within the rendering budget
checked by `tests/phone-checks.spec.js` (250 draw calls, 400k triangles, 4 ms of game work).

## Working on a task

1. Each task is a GitHub issue labelled `task` with a **Done when** list. Work only on that issue.
   Tasks Claude proposes get `proposed` (not `ready`); they turn `ready` after a 36-hour veto window
   (`docs/WORKFLOW.md`). Mark ones that change controls, modes, real places or prod `needs-yes`.
2. Before building, ask the owner the task's clarifying questions as clickable cards (sent through
   the coordinator), one question at a time (Hitoshi's choice at kickoff), each with 3 options, the
   recommended one first and marked "(Recommended)". Ask about every change, small ones too; do not
   decide on the owner's behalf. For anything visual, show phone-size mockups first and build what
   was approved.
3. Use a few focused subagents in parallel for independent parts of a task only when it pays off;
   keep token use balanced (few agents, small prompts).
4. Branch from `main`, keep the PR small, and put `Closes #N` in the PR body.
5. Run `npm ci` once, then `npm run check` (ESLint + Playwright tests) before every push.
   Locally, Chromium is usually preinstalled; in CI the workflow installs it.
6. Add or extend a test in `tests/` for new behaviour whenever it can be checked headlessly.
7. If `game.js`, `src/` or `style.css` changed, bump `?v=N` on both asset URLs in `index.html` so
   browsers load the new version. (The Pages build also rewrites them, and every module import, to
   `?v=<commit>` and adds a reload-on-new-deploy check, see `.github/scripts/build-site.sh`.)
8. Open the PR with a screenshot of the game that highlights the new feature (commit it under
   `docs/screens/` and embed it as an image in the PR body; the merge queue looks for it).
   Wait for CI, fix failures until green. Never skip or weaken a test to get green.
9. The merge queue (`.github/workflows/merge-queue.yml`) merges small green PRs (800 changed lines or
   fewer; lock files, images and `vendor/` not counted) that have a screenshot in the description and a passing project review (see below), oldest first, testing each merged with the current `main` (a CI "queue test", no push to the branch) before it merges. Label a PR `hold` to keep it out. Bigger PRs and PRs that
   change `.github/workflows/` are merged by hand only when the owner says so ("m").
10. Merges to `main` deploy to **dev** only (`https://hitoshi85.github.io/secret-agent-simulator/dev/`). After every
   shipped change, wait for the Pages workflow's **verify-live** job (it checks that `version.json` on both
   live sites shows the expected commit and the game runs), then share the latest dev link with a
   cache-busting suffix of the deployed commit's short SHA: `.../secret-agent-simulator/dev/?v=<short-sha>`.
   When the owner says "Ship", run `pages.yml` with action `ship` (promotes what dev serves to prod at
   `https://hitoshi85.github.io/secret-agent-simulator/` as release `prod-N`) and share the prod link the same way;
   When the owner says "Rollback", run `pages.yml` with action `rollback` and an empty tag (prod goes back
   to the release before the current one); "Rollback to prod-N" passes that tag. Rollback skips the tests,
   so prod switches in about a minute; verify-live then confirms prod reports that commit and release, and
   the README label follows. Share the prod link afterwards. README.md always lists the current links.
11. The owner talks only in the project chat; send questions, ready PRs and manual steps through
   the coordinator, not in your own thread.

## Test hook

`game.js` exposes `window.__agent` for tests: `state` (`state` title/playing, `paused`, `map`, `area`, `clock`),
`stats` (`frames`, `calls` and `triangles` of the last render, `textures` (GPU textures, chase only), `people`, `buildings`, `lastWalkFound`),
`agent` (`x`, `z`, `heading`, `path`, `walking`, `walked`), `crowd` (each `mesh`), `cam` (`yaw`, `pitch`),
`act(action, ...)` (`chase` (Begin: the opening car chase), `start` (Florence), `walkTo` x z run, `jump` place-id, `map`, `pause`, `sound` (flip mute), `phone`, `notebook`, `close`, `briefed` (case file taken: the handler's lead), `interact` kind id, `accuse` suspect-id, `dot` 0-8, `answer` value and `guess` word (seal cases), `again`, `feedback`, `turn` radians),
`chase` (once begun: `status` card/count/driving/lost/done, `stage`, `seed` (this run's road), `streak` (seconds in sight in a row), `wheel` (steering indicator, -1 to 1), `fiat` (the red car's mesh), `player` and `suv` (`s` metres along the road, `d`, `v`, `air`), `gap`, `sight`, `traffic`, `input.keys` left/right/brake, `action('stage'|'go'|'drive'|'next'|'retry'|'skip')`),
`audio` (`muted`, `ctx`, `stats`: `state`, `nodes`, `peak`, `engineHz`, `squeal`, `bed`, `played` counts), `case` (the running case: `suspects`, `thief`, `notes`, `heat`, `status`), `caseView` (its `targets`, `leads()`), `navaids` (`leads`: each open lead's `id`, `d` metres, `ahead`),
`step(dt)` (advance the simulation; does nothing while paused, on the title or with the Map open), `render()`,
`paused` (set true to stop the real-time loop and drive frames from the test), `setPaused(bool)` (player pause),
`PLACES`, `walkable(x, z)`, `findPath(ax, az, bx, bz)`, `areaAt(x, z)`, `version`.
Keep it working when refactoring; add to it when a new feature needs checking.
`tests/smoke.spec.js` walks the agent from the Duomo to Ponte Vecchio. `tests/case.spec.js` checks every case shuffle is solvable and plays the dossier case end to end. `tests/phone-checks.spec.js` saves phone
screenshots to `phone-screenshots/` (a CI artifact) and enforces the rendering budget. `tests/mobile.spec.js`
checks the phone layout and touch controls on the repo copy and both built sites.

## Project review

A scheduled Claude run reviews every PR without a verdict on its latest commit once a day (7:00 New York
time). When a PR should not wait for it, tell the coordinator `Review #N please (head <short sha>)`.
The reviewer reviews the diff and posts a PR comment with a
`<!-- project-review: PASS|BLOCK <sha> -->` verdict; the merge queue waits for a PASS on the latest
commit (docs-only PRs skip it). On BLOCK, fix it and ask again. Full process: `docs/REVIEW.md`.

## Requirements and feedback log

`REQUIREMENTS.md` is the single shareable record of requirements, the owner's feedback and the
backlog. Every thread keeps it current in the same PR as its change: log every piece of owner
feedback (dated, with the outcome) in **Feedback log**, update requirement statuses, and keep
**Open backlog** in step with the issues. A thread that only receives feedback (no code change) still
opens a small PR updating the log. Shipped changes are the merged PRs and `prod-N` releases (no table).
Keep it small, `tests/requirements.spec.js` checks it in CI:
- The feedback log keeps the latest 20 rows; move older rows to the bottom of `docs/feedback-archive.md`.
- Write PR numbers, never "this PR": open the PR, then push its number into the log (CI fails on the
  placeholder on every branch).
- R and W requirements stay numbered in order with no gaps; the play links match README.md.
- Mockups that were agreed live in `docs/mockups/`; build visual changes from an approved mockup.

## Commands

- `npm run serve` serves the game at http://127.0.0.1:8080/
- `npm run lint`, `npm test`, `npm run check`
- `npm run playtest` (`-- --seeds 5`, `--modes chase`): the AI playtester in `tests/playtest/` plays every mode as
  three personas and writes `playtest/playtest-report.json` and `.md` with the pacing targets (R23). Report only;
  `.github/workflows/playtest.yml` runs it on PRs that touch `src/` or `game.js` (artifact `playtest`)
