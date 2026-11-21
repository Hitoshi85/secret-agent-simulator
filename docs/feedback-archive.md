# Feedback archive

Older rows of the feedback log in [REQUIREMENTS.md](../REQUIREMENTS.md), oldest first. The log there keeps the latest 20.

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
