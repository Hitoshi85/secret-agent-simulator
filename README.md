# Secret Agent Simulator

## Play now

<!-- play-links:start -->
- **Prod** (prod-3, d0c2a91): https://hitoshi85.github.io/secret-agent-simulator/
- **Dev** (b82977b): https://hitoshi85.github.io/secret-agent-simulator/dev/
<!-- play-links:end -->

Prod is the stable version and changes only on "Ship". Dev has every merged change and shows a
"DEV" tag. Both work on phones and update on their own, no hard refresh needed.

An original, cerebral secret agent game for the phone browser: tradecraft and deduction across
international cities, with expensive cars and trains. It starts in a hand-built 3D Florence.
Plain HTML/CSS/JS with Three.js, no build step.

## Play

Play the web builds linked at the top of this page, or run `npm run serve` and open
http://127.0.0.1:8080/ (the game uses ES modules, so opening `index.html` straight from disk does not work).

Every merge to `main` goes to **dev** only. Typing "Ship" in the project chat promotes the version dev
serves to **prod** as a tagged GitHub release (`prod-1`, `prod-2`, …), and typing "Rollback" (or
"Rollback to prod-2") puts prod back on an earlier release in about a minute.
Both are run by `.github/workflows/pages.yml`; see [docs/WORKFLOW.md](docs/WORKFLOW.md).

## How to play

- **Tap the street** to walk there; the agent finds the way along the streets.
- **Drag** to look around (left and right turns, up and down tilts to the domes and towers).
- **Map** jumps to Piazza del Duomo, Via dei Calzaiuoli, Piazza della Signoria, Ponte Vecchio or Oltrarno.
- Keyboard: **W A S D** or arrows to walk, **Q / E** to turn, **M** map, **P** or **Esc** pause, **F** feedback.

## Development

No build step for the game. Dev tooling (lint and tests) needs Node 22:

```sh
npm ci
npm run serve   # play at http://127.0.0.1:8080/
npm run check   # ESLint + headless Playwright tests (walk the city, phone layout, rendering budget)
```

Requirements, feedback and the backlog are kept in [REQUIREMENTS.md](REQUIREMENTS.md).
Work is tracked as GitHub issues and shipped as small PRs gated by CI. See [docs/WORKFLOW.md](docs/WORKFLOW.md).
