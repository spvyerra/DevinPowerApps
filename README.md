# DevinPowerApps

An internal App Catalog where users request new apps and Devin builds them as PRs to this repo.
It runs locally as a demo MVP.

## What runs now

A Next.js 16 app with a placeholder home page.
The catalog, mock feature-flag service, sign-in, access control, and App Creator are planned in `docs/plans/2026-10-26-powerapps-mvp.md`.

## Run it

1. Install Node 24 or newer.
2. `npm ci`
3. `npm run dev` and open http://localhost:3000.

## Checks

1. `npm run lint`
2. `npm run typecheck`
3. `npm test` boots the dev server and checks the home page renders.
4. `npm run build`

CI runs all four on every PR (`.github/workflows/ci.yml`).

## File structure

1. `src/app/`: Next.js App Router pages and the root layout.
2. `tests/`: smoke tests run with `node:test`.
3. `docs/plans/`: executed agentic plans.
4. `docs/notes.md`: gotchas, rejected approaches, deferred work, and the target design.
5. `AGENTS.md`: rules for agents working in this repo.

## Ownership

spvyerra owns every file in this repo unless the file names another owner.
