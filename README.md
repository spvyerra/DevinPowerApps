# DevinPowerApps

An internal App Catalog where users request new apps and Devin builds them as PRs to this repo.
It runs locally as a demo MVP.

## What runs now

1. App Catalog at `/`: one card per internal app, built from each app's `app.json` manifest.
2. Service Health at `/apps/service-health`: shows each internal service as up or down.
   It is the reference pattern Devin copies for new apps.
3. A mock Feature Flags service on port 4001 that stores true/false flags in SQLite.
   Its API is documented in `docs/services/feature-flags.md`.

4. Sign-in at `/signin` with a dev login (`AUTH_DEV_LOGIN=true`), or with any OIDC provider once `OIDC_ISSUER`, `OIDC_CLIENT_ID`, and `OIDC_CLIENT_SECRET` are set.
5. Access control: members see every app but open only the apps an admin granted them.
   Admins are the emails in `ADMIN_EMAILS`.
   They open every app and grant or revoke access at `/admin/access`.

The App Creator is planned in `docs/plans/2026-10-26-powerapps-mvp.md`.

## Run it

1. Install Node 24 or newer.
2. `npm ci`
3. `cp .env.example .env` and set `AUTH_SECRET` to the output of `openssl rand -base64 32`.
4. `npm run dev` starts the Feature Flags service and Next.js together.
   Open http://localhost:3000 and sign in as `admin@example.com` to see everything.

## Checks

1. `npm run lint`
2. `npm run typecheck`
3. `npm test` boots the Feature Flags service and the dev server, then checks flag CRUD, the sign-in redirect, admin and member access, and Service Health.
4. `npm run build`

CI runs all four on every PR (`.github/workflows/ci.yml`).

## File structure

1. `src/app/`: Next.js App Router pages, the root layout, `/signin`, `/no-access`, and `/admin/access`.
2. `src/auth.ts`: Auth.js providers and the access rules (`isAdmin`, `canOpenApp`).
3. `src/proxy.ts`: the route guard for every page except sign-in.
4. `src/lib/db.ts`: the SQLite app database (`data/app.db`) holding app grants.
5. `src/app/apps/<slug>/`: one folder per internal app, with `page.tsx` and an `app.json` manifest (name, description, owner, services).
6. `src/lib/catalog.ts`: reads the app manifests.
7. `src/lib/services.ts`: the list of internal services with base URL and API doc path.
8. `services/feature-flags/server.ts`: the mock Feature Flags service.
9. `tests/`: smoke tests run with `node:test`.
10. `docs/plans/`: executed agentic plans.
11. `docs/services/`: API docs for internal services, which Devin reads when building apps.
12. `docs/notes.md`: gotchas, rejected approaches, deferred work, and the target design.
13. `AGENTS.md`: rules for agents working in this repo.

## Ownership

spvyerra owns every file in this repo unless the file names another owner.
