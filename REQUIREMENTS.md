# Secret Agent Simulator: requirements and feedback log

The single, always-current record of what the game must do, what has shipped, what the owner
(Hitoshi) has asked for, and what is next. Every change to the game, and every piece of feedback,
is recorded here in the same PR or thread that handles it (see the rule in [CLAUDE.md](CLAUDE.md)).

- **Play prod (stable):** https://hitoshi85.github.io/secret-agent-simulator/
- **Play dev (latest main):** https://hitoshi85.github.io/secret-agent-simulator/dev/ (add `?v=<short commit>`
  on a phone to skip a cached copy; the current links with that suffix are always in [README.md](README.md))
- **Backlog:** [open issues](https://github.com/Hitoshi85/secret-agent-simulator/issues)
- **Mockups:** the agreed look (v2) and the case screens (case 01, case 02) are in [docs/mockups/](docs/mockups/)
- **Last updated:** 2026-11-19

## 1. Core requirements

### Game

| # | Requirement | Status |
|---|---|---|
| R1 | An original secret agent simulator that is cerebral rather than action based, with international travel, expensive cars and trains. Not a copy: no names, characters, art, music, missions or UI from existing games or films. Working title "Secret Agent Simulator". | In progress |
| R2 | Runs in a phone browser from a link. Plain HTML/CSS/JS with native ES modules and no build step; 3D with Three.js (vendored under `vendor/three-<version>/`, loaded through an import map). CLAUDE.md lists which module owns what. | Done (#1) |
| R3 | Starts with one city, Florence, in 3D that looks and feels like Florence: a stylized, hand-built, original low-poly city with painted textures (Hitoshi's choice, mockup v2). The first slice runs from Piazza del Duomo down Via dei Calzaiuoli to Piazza della Signoria, along Via Por Santa Maria to the Arno, over Ponte Vecchio and into Oltrarno (Via de' Guicciardini to Piazza de' Pitti). | Done (#1) |
| R4 | Landmarks modelled by hand: the Duomo with its ribbed dome and lantern, the striped marble walls and the west front, Giotto's campanile, the Baptistery, Palazzo Vecchio with its tower, the Loggia, the Neptune fountain, the Arno with its embankments, Ponte Vecchio with overhanging shops and the Vasari corridor, and the Oltrarno hills with cypresses and San Miniato. | Done (#1) |
| R5 | Ordinary streets lined with three- and four-storey palazzi: rusticated ground floors with arched doors and shops, arched windows in stone surrounds, green louvred shutters, flower boxes, deep eaves on dark soffits and terracotta hip roofs. | Done (#1) |
| R6 | Third person, tap to walk (Hitoshi's choice): the camera follows behind the agent; a tap on the street walks there along the streets (pathfinding, never through buildings or the river; a tap on a building or the water walks to the nearest street); dragging turns the camera and tilts it up to the domes; the camera swings back behind the agent while walking and pulls in when a building is in the way. A double tap runs there at twice the speed (Hitoshi's choice, 2026-11-16). Keyboard: W A S D or arrows, Shift to run, Q / E to turn. | Done (#1, #12) |
| R7 | People about 1.75 m tall with walking poses, faces, varied clothes, skirts, coats, hats and bags; a crowd of about 70 strolls the streets and piazzas. | Done (#1) |
| R8 | The player's own agent (Hitoshi's choice): a name and look picked at the start and kept across cities. Until that screen exists the agent wears a placeholder charcoal suit, tie and sunglasses, with a blue ring underfoot. | Placeholder (#1) |
| R9 | HUD on the phone: the current place (it changes as you walk), the time, a Heat meter, and Phone, Notebook and Map buttons (N opens the Notebook); Map jumps to Piazza del Duomo, Via dei Calzaiuoli, Piazza della Signoria, Ponte Vecchio and Oltrarno. The Phone opens gadget puzzles once you hold one, otherwise the handler's messages. A round minimap (north up, leads in gold) sits in the corner; the Map shows a drawn map of the whole slice with you and the leads, plus the jump buttons (Hitoshi's choice, 2026-11-16). | Done (#1, #6, #12) |
| R10 | Pause with the ❚❚ button, P or Esc; switching tabs or apps pauses. Players send feedback with the 💬 button (or F): it pauses and opens a prefilled GitHub feedback issue with the game's context (version, where in the city, time). | Done (#1) |
| R11 | Gameplay: tradecraft and deduction (Hitoshi's choice): gather clues around the city, read people and documents, spot and shake tails, use dead drops, and work out who did it; cars and trains move you between leads. First case, "The Dossier" (Hitoshi's choices, 2026-11-15): a courier's dossier was lifted under the Loggia; witnesses and traces around the centre narrow five suspects in the crowd to the thief; tap the thief to recover it. | In progress (#5, #6) |
| R12 | Present day (Hitoshi's choice), with gadgets and hacking as logic-puzzle minigames (hacking CCTV, cloning phones, drone surveillance), kept cerebral. First one: crack the thief's dropped phone with a 3 x 3 unlock pattern, 3 tries. | In progress (#6) |
| R13 | Driving: you drive the cars yourself on the roads around the centre (the Viale ring, up to Piazzale Michelangelo and Fiesole, out into the Chianti hills); the historic centre stays on foot, as in the real limited-traffic zone (Hitoshi's choice). | Planned |
| R14 | Trains: the case climaxes on a high-speed train leaving Santa Maria Novella; walk the carriages, read the passengers and find the contact before the next stop. The same train later links new cities (Hitoshi's choice). | Planned |
| R15 | Mistakes raise Heat (Hitoshi's choice). In the dossier case only wrong accusations do, and you may accuse anyone; at 3 the thief notices you and leaves for the 19:10 at Santa Maria Novella (Hitoshi's choices, 2026-11-15). For now that ends the case with a retry; the station chase comes later. | In progress (#6) |
| R16 | The Florence case is hand written, with the culprit reshuffled each playthrough so it stays fair and replayable; an automatic playtest checks every shuffle is solvable (Hitoshi's choice). Each decoy suspect differs from the thief in one trait, so the firm clues always leave only the thief. | Done (#6) |
| R17 | One case takes about 15 minutes in one sitting (Hitoshi's choice). | Planned |
| R18 | Cases are separate code, easy to swap and edit (Hitoshi's requirement, 2026-11-15): each case is one data file in `src/cases/` (text, traits, witnesses, traces, places), run by the shared engine in `src/case/`; `?case=<id>` picks one. | Done (#6) |
| R19 | Finding leads without aimless walking (Hitoshi's feedback, 2026-11-16): gold arrows at the screen edge point to witnesses and traces not visited yet, showing only the distance, never who or what is there; and when you take the case, your handler's first lead arrives on the Phone. | Done (#12) |
| R20 | Case 02, "The Compass Ledger" (Hitoshi's request, 2026-11-19): a separate art-mystery case with an original story (a fictional guild of Renaissance engineers and its hidden ledger). Six seals at landmarks, one per subject (world, art, military and technology history, mechanical and electrical engineering), open in any order; questions at high school to college level in mixed formats (multiple choice, put in order, cipher, match pairs, calculation, control logic). Every question is different each time: engineering questions and ciphers are generated, orderings and pairs are drawn from banks, facts come from a bank of 40 per subject, and seen questions are remembered on the phone. Wrong answers add Heat; each seal gives a letter of a hidden word that may be guessed after 4 of 6 seals; then fetch the ledger at the word's place. `?case=compass`. | Done (#16, #19) |

### How we work

| # | Requirement | Status |
|---|---|---|
| W1 | All work runs in cloud sessions, not tied to the owner's computer. | In place |
| W2 | Hitoshi talks only in the project chat with one coordinator; threads send questions, ready PRs and manual steps through it instead of asking in their own thread (Hitoshi's choice, 2026-11-15). | In place |
| W3 | Questions come as clickable cards, each with options, the recommended one first (Hitoshi's choice, 2026-11-15). At kickoff he asked for questions one at a time; for later features ask about every change, not deciding small choices alone. | In place |
| W4 | Mockups before building anything visual; the build follows the approved mockup. | In place |
| W5 | Agentic loop, set up from day one like Aozora Line (Hitoshi's choice): tasks are GitHub issues labelled `task`; one thread per issue opens a small PR; CI (ESLint + headless Playwright tests) must be green. See [docs/WORKFLOW.md](docs/WORKFLOW.md). | In place (#1) |
| W6 | PRs merge on their own through the merge queue when every check is green on top of `main`, the description has a screenshot and the project review passed, for small PRs only (800 changed lines or fewer, lock files, images and `vendor/` not counted). Bigger PRs, and PRs that change `.github/workflows/`, wait for "m". A `hold` label keeps a PR out. | In place (#1) |
| W7 | Merges to `main` deploy to GitHub Pages, to **dev** only (`/secret-agent-simulator/dev/`, marked with a "DEV <commit>" tag). "Ship" promotes dev to prod as release `prod-N`; "Rollback" (or "Rollback to prod-N") puts prod back in about a minute. Both sites stay fresh on phones without a hard refresh, and a live check verifies each deploy. | In place (#1) |
| W8 | After every shipped change, share the latest dev link with a cache-busting suffix: `https://hitoshi85.github.io/secret-agent-simulator/dev/?v=<short commit>` (prod after "Ship"). | In place |
| W9 | Keep all requirements and feedback in this file, updated with every change and every piece of feedback: the latest 20 feedback rows (older ones in `docs/feedback-archive.md`), PR numbers instead of placeholders, and a CI test (`tests/requirements.spec.js`) that checks it. | In place (#1) |
| W10 | With each PR, share a screenshot of the game that highlights the new feature. | In place |
| W11 | Automatic phone checks on every PR: phone screenshots in portrait (390×844) and landscape (844×390) at the title and each landmark (artifact `phone-screenshots`, plus main's for comparison), and a rendering budget at phone size: at most 250 draw calls and 400k triangles in every view and under 4 ms of game work per frame. (CI renders WebGL in software, so frame times there are reported but not enforced.) | In place (#1) |
| W12 | Project review: a Claude reviewer reads the diff of each PR and posts a `project-review: PASS/BLOCK <sha>` verdict; the merge queue waits for a PASS. Hitoshi does not review small PRs. Process: `docs/REVIEW.md`. | In place (#1); scheduled run to be set up |
| W13 | Backlog veto window: tasks Claude proposes get `proposed` and turn `ready` after 36 hours unless vetoed; at most 3 a day; changes to controls, game modes, real places or prod get `needs-yes`. Weekly report on Fridays. Run daily by `.github/workflows/daily.yml`. | In place (#1) |
| W14 | Use several focused subagents in parallel for independent parts of a task only when it pays off, keeping token use balanced. | Preference |
| W15 | Show results (e.g. test runs) in simple tables when asked. | Preference |
| W16 | Every update says what the work is waiting on: Hitoshi, Claude or GitHub (Hitoshi's rule, 2026-11-16). Options always come as selectable cards. | In place |

## 2. Shipped changes

Every merged change is a [merged PR](https://github.com/Hitoshi85/secret-agent-simulator/pulls?q=is%3Apr+is%3Amerged) (titles say what changed,
numbers link back from this file), and every promotion to prod is a [`prod-N` release](https://github.com/Hitoshi85/secret-agent-simulator/releases)
with generated notes.

## 3. Feedback log

Newest at the bottom, latest 20 rows only: when a new row would make 21, move the oldest row to
[docs/feedback-archive.md](docs/feedback-archive.md). "Outcome" says what was done about it.

| Date | Feedback / request from Hitoshi | Outcome |
|---|---|---|
| 2026-11-15 | "Build a secret agent simulator that is more cerebral than action based but still has international travel, driving expensive cars, and riding trains. Start with one city (Florence) … 3D … run on a browser on the phone." Review train-simulator first and ask how we work. | Reviewed Aozora Line's setup and asked workflow, then gameplay questions (rows below). R1, R3. |
| 2026-11-15 | Workflow: clone the train-sim setup from day one; repo `secret-agent-simulator`; Three.js with no build step; all questions and approvals in the project chat, as clickable cards. | W2, W3, W5 to W13, R2; set up in #1. |
| 2026-11-15 | Gameplay: tradecraft and deduction; stylized hand-built Florence; third person, tap to walk; present day; gadgets and hacking puzzles; drive the hills, walk the centre; the train as a playable scene; Heat and consequences; written case with a random culprit; about 15 minutes in one sitting; mockups then a walkable slice; your own agent. | R3, R6, R8, R11 to R17. |
| 2026-11-15 | Look mockup v1 (Duomo, Ponte Vecchio at dusk): "More detail first". | Mockup v2: richer facades, life-size people, an agent close-up. |
| 2026-11-15 | Mockup v2: "Build it as shown". | Built the walkable slice from the Duomo to Ponte Vecchio and Oltrarno in #1 (R2 to R10). |
| 2026-11-15 | Main is protected now, so the deploy could not push the README play-links update. Chose "Open a small PR instead". | The links job opens a `bot/play-links` PR that the merge queue merges with no screenshot, review or deploy; #2. |
| 2026-11-15 | "Where is the case/mission?" First case cards: "Recover the stolen dossier"; "Witnesses and traces"; "Free accusations, Heat each"; "Wrong guesses only, thief flees"; "Crack the thief's phone". | Case 01 "The Dossier" built from those choices in #6 (R11, R12, R15, R16). |
| 2026-11-15 | "Keep cases as separate code so it's easy to swap/edit cases." | Each case is a data file in `src/cases/`, run by the engine in `src/case/` (R18), #6. |
| 2026-11-15 | Case mockup (five phone screens): "Build it as shown". | Saved as docs/mockups/case-01-dossier.png and built in #6. |
| 2026-11-16 | The README bot PRs got stuck behind GitHub's approval for runs from the bot and blocked the queue. Chose "Queue approves its own". | The merge queue approves the held CI run only on `bot/play-links` README-only PRs, and skips a PR it cannot merge instead of stopping; #10. |
| 2026-11-16 | Played The Dossier: "feels slow with a lot of aimless walking"; wants running, a hint or direction to witnesses and objects, and a map of the game world; open to other ideas. Cards: "Double-tap to run", "Edge arrows with distance", "Corner minimap plus big map", "Handler's first lead". | Built in #12 (R6, R9, R19), issue #11. |
| 2026-11-16 | Pacing mockup: "Don't show who the people are on the left screen but still show the direction and distance." | Arrows show only direction and distance (R19), #12. |
| 2026-11-16 | "Always show options as selectable cards." "Always tell me who/what we are waiting on: me, you, or GitHub." | W16. |
| 2026-11-19 | "Create a new separate case in the style of Da Vinci code with questions about world history, art history, military history, technology history, mechanical engineering and electrical engineering … mix up the formats … show sample questions/formats as screenshots first." | Original story (no characters or plot from the book); 8 sample screens, one per subject and format. R20, issue #15. |
| 2026-11-19 | "Can it be written in a way that questions/formats change every time and all questions are available to solve in any order?" | Seal board with all six seals open; subjects dealt to landmarks and formats drawn per play; letters fill fixed slots. Mockup revised to 11 screens. |
| 2026-11-19 | "Every question should be different each time." Chose "40 per subject" for the first fact bank. | Generated engineering and cipher questions, drawn orderings and pairs, seen-question memory on the phone. |
| 2026-11-19 | Approved the design with "Drop the early-guess finale", then: "Actually must answer 4 of 6 before guess". | The word may be guessed once 4 of 6 seals are broken (wrong guess adds Heat); saved as docs/mockups/case-02-compass.png. |
| 2026-11-20 | "What happened to CI / Lint test" (the required check never ran after the merge queue rebased #16). | The queue's own pushes do not start pull_request CI, so new commits were pushed to run it; a test-order bug and one runner timeout were fixed or rerun, and Hitoshi merged #16 by hand. The full banks follow in #19. |

## 4. Open backlog

Add the `ready` label to an issue to start it.

| Issue | Task | Status |
|---|---|---|
| – | Agent designer: name and look (R8) | To file |
| #5 | First case: recover the stolen dossier (R11, R12, R15, R16, R18) | Done (#6, #7) |
| #11 | Speed up the dossier case: running, lead arrows, maps, handler's first lead (R6, R9, R19) | In progress (#12) |
| – | Station chase when the thief gets away (R14, R15) | To file |
| #15 | Case 02, The Compass Ledger: seals, question generators, fact bank (R20) | Done (#16, #19) |

## 5. Ideas mentioned, not yet requested

- More cities linked by train (R14).
- Cars to choose and drive in the Tuscan hills (R13).
