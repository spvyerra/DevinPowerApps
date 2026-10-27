# Notes

Gotchas, rejected approaches, and deferred work for DevinPowerApps.

## Gotchas

`next dev` in Next.js 16 writes a managed block into the root `AGENTS.md` when it detects an AI agent.
That block contains em dashes, which this repo bans, so `next.config.ts` sets `agentRules: false`.
The useful part of that block, reading `node_modules/next/dist/docs/` before writing Next.js code, lives in `AGENTS.md` as a plain rule.

`npm run typecheck` runs `next typegen` first, because route types such as `LayoutProps` are generated and `tsc` alone cannot see them.

Tests run TypeScript directly through Node 24 type stripping, so test files must use erasable syntax only (no enums or namespaces).

## Rejected approaches

Google fonts through `next/font/google` were dropped from the scaffold, because they need network access at build time and the MVP runs locally.

## Deferred

Cloud hosting and a deploy workflow wait until a hosting target is chosen.
Devin API calls wait on a Devin service-user API key.
