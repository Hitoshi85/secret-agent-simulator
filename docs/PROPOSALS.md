# Weekly proposal run: how Claude proposes the next tasks

Once a week a scheduled Claude task ("Secret Agent Simulator weekly task proposals") files up to 3
new task issues, so work does not wait for Hitoshi to file it (Hitoshi's choices, 2026-11-21: a
scheduled Claude run, Fridays at 7:00 New York time). It runs before the daily backlog run (12:30
UTC), so the Friday report lists the new proposals under **Proposed**.

## Inputs (read these, nothing else)

1. `REQUIREMENTS.md`: requirements whose status is **Planned**, **Placeholder** or **In progress**
   with no open issue, the **Open backlog** rows marked "To file", and **Ideas mentioned, not yet
   requested**.
2. The latest playtest report: run `npm ci`, then `npm run playtest -- --seeds 5` on `main` and read
   `playtest/playtest-report.md`, especially the R23 targets marked missed.
3. Open feedback: open issues labelled `feedback`, and feedback-log rows from the last 7 days whose
   outcome is still open.
4. The open issues, so nothing is proposed twice (skip a topic that already has an open `task` issue
   or one closed as not planned in the last 30 days, which means Hitoshi dropped it).

## What to file

- **At most 3 issues**, fewer if there is nothing worth doing. Prefer, in order: a missed R23 pacing
  target, open feedback, then Planned requirements that make the game more fun (first candidates:
  R17 15-minute cases, R8 agent designer, the station chase R14 and R15).
- Each follows `.github/ISSUE_TEMPLATE/task.yml`: **Goal**, **Done when** (a checklist that a test or
  a screenshot can confirm), **Size** (S, M or L), and the requirement it serves (`R17`, `W13`, ...)
  in the Goal. Write for Hitoshi: plain words, no code names.
- Labels: `task` and `proposed`. Add:
  - `needs-yes` when it changes controls, game modes, real-world places or the route, or prod; it
    stays `proposed` until Hitoshi says yes;
  - `visual` when it changes what players see. A `visual` task turns `ready` only once its body
    links a phone-size mockup in `docs/mockups/` (the daily run checks this); make the mockup in a
    thread first, or say in the issue that one is needed.
- End the issue body with the Claude Code footer.

## Afterwards

- Close nothing and promote nothing: the daily backlog run does both (`.github/scripts/daily.js`).
- Send the coordinator one line per proposal (`#N title, size, labels`) so it lists them in the project
  chat with the 36-hour veto reminder: Hitoshi vetoes with `hold`, a comment starting "no" or
  "drop", or "drop #N" in the chat.
