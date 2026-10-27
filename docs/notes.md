# Notes

Gotchas, rejected approaches, and deferred work for DevinPowerApps.

## Gotchas

`next dev` in Next.js 16 writes a managed block into the root `AGENTS.md` when it detects an AI agent.
That block contains em dashes, which this repo bans, so `next.config.ts` sets `agentRules: false`.
The useful part of that block, reading `node_modules/next/dist/docs/` before writing Next.js code, lives in `AGENTS.md` as a plain rule.

`npm run typecheck` runs `next typegen` first, because route types such as `LayoutProps` are generated and `tsc` alone cannot see them.

Tests run TypeScript directly through Node 24 type stripping, so test files must use erasable syntax only (no enums or namespaces).

The Feature Flags service uses Node's built-in `node:sqlite`, so it needs no database dependency.
It keeps data in `data/flags.db`, which git ignores; delete that file to reset flags.

`npm run dev` starts the service with a shell `&` instead of a process manager such as `concurrently`.
Ctrl-C stops both, but the two logs interleave and a service crash does not stop Next.js.
If that becomes a problem, switch to `concurrently`.

The catalog reads manifests at build time, so `next start` only shows apps that existed at the last build.
This is fine because new apps arrive through merged PRs, which trigger a rebuild.

## Rejected approaches

Google fonts through `next/font/google` were dropped from the scaffold, because they need network access at build time and the MVP runs locally.

## Deferred

Cloud hosting and a deploy workflow wait until a hosting target is chosen.
Devin API calls wait on a Devin service-user API key.
