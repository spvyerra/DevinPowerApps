# DevinPowerApps MVP

Owner: spvyerra

## Goal

Ship a locally run demo where a signed-in user browses an internal App Catalog, requests a new app, and the request becomes a Devin session that opens a PR in this repo.
The demo backend is a mock feature-flag service with its own API doc that stands in for an internal wiki.

## Decisions

1. Stack: Next.js App Router with TypeScript, one app for UI and server code, because it keeps the catalog, creator, and generated apps in one deployable unit.
2. Hosting: local only for now, run with `npm run dev`. No cloud deploy workflow in this plan.
3. Auth: generic OIDC through Auth.js plus a dev login, since real SSO is not a priority and the demo needs to work offline.
4. Storage: SQLite through the built-in `node:sqlite` module on Node 24 LTS, so no ORM or native addon is needed. Fallback is `better-sqlite3` if Next.js cannot bundle `node:sqlite`.
5. Demo service: a mock feature-flag service where users create true/false flags and toggle them.
6. Devin API: no service-user key yet. The creator stores the request and shows the generated prompt for manual paste. Calling the API is a TODO behind `DEVIN_API_KEY`.
7. Scope: phases 0 to 3 only. Later phases are listed at the end.
8. Reference app: a small read-only Service Health app, so the Feature Flags admin panel can be the first app Devin generates through the Creator as the end-to-end demo.

## Scope

In: scaffold, catalog, SSO plus access control, mock feature-flag service, App Creator.
Out: cloud deploy, Devin playbook and Knowledge setup, Devin Review loop automation, scheduled security scans, group-based access rules.

## Design

### File layout

1. `src/app/page.tsx`: catalog page built from app manifests.
2. `src/app/apps/<slug>/page.tsx` and `src/app/apps/<slug>/app.json`: one folder per internal app. The manifest holds name, description, owner, and the services it calls. A Devin PR adds an app by adding one folder, so parallel PRs do not conflict on a shared registry file.
3. `src/app/apps/service-health/`: hand-built reference app, the pattern Devin copies for new apps. It calls each service's `GET /health` from the server and shows up or down per service.
4. `src/app/create/page.tsx`: App Creator form.
5. `src/app/requests/page.tsx`: list of app requests with status, prompt, session link, and PR link.
6. `src/app/admin/access/page.tsx`: admin panel to grant or revoke app access by email.
7. `src/auth.ts` and `src/app/api/auth/[...nextauth]/route.ts`: Auth.js config with OIDC and dev login providers.
8. `src/proxy.ts`: one guard for `/apps/<slug>`, `/create`, `/requests`, and `/admin`.
9. `src/lib/db.ts`: opens `data/app.db` and applies the schema on first use.
10. `src/lib/catalog.ts`: reads all `app.json` files.
11. `src/lib/services.ts`: the list of internal services with name, base URL, and API doc path, shared by Service Health and the App Creator.
12. `src/lib/devin.ts`: builds the session prompt and, when `DEVIN_API_KEY` is set, creates and reads sessions.
13. `services/feature-flags/server.ts`: mock service on `127.0.0.1:4001` using `node:http` and its own `data/flags.db`.
14. `docs/services/feature-flags.md`: the service API doc, used as the "wiki" Devin reads.
15. `tests/smoke.test.ts`: smoke tests run by root `npm test` with `node:test`.
16. `.github/workflows/ci.yml`: lint, typecheck, test, build on PRs.
17. `.env.example`, `.gitignore`, `docs/notes.md`.

### Data model

1. No users table. Admins are the emails in `ADMIN_EMAILS`, checked on every request, so a config change applies at once.
2. `app_access(app_slug, email, primary key(app_slug, email))`.
3. `app_requests(id, requester_email, name, slug, description, screenshot_path, services, doc_links, prompt, status, devin_session_id, devin_session_url, pr_url, created_at)` where status is `draft`, `sent`, `pr_open`, `merged`, or `failed`.

### Access rules

1. Every route except sign-in needs a session.
2. Admins can open every app, the access panel, and all requests.
3. Members see every app in the catalog, but can only open apps they were granted. Locked apps show a "Request access" note naming the app owner.
4. Members see only their own requests.

### Feature-flag service API

1. `GET /health` returns `{ ok: true }`.
2. `GET /flags` returns all flags.
3. `POST /flags` with `{ key, description }` creates a flag set to false. Keys are unique, lowercase, and use dashes.
4. `PATCH /flags/:key` with `{ enabled }` toggles a flag.
5. `DELETE /flags/:key` removes a flag.
6. The Next.js server calls the service. The browser never calls it directly, so the service needs no auth or CORS.

### App Creator flow

1. The user fills in app name, description of the UI, an optional screenshot (PNG or JPEG, up to 5 MB), the services to use (picked from `src/lib/services.ts`), and optional doc links.
2. A server action validates the input, saves the screenshot under `data/uploads/`, and inserts an `app_requests` row.
3. `src/lib/devin.ts` builds the prompt: the repo, the request, the paths of the chosen API docs, the instruction to copy the `service-health` app pattern, add an `app.json`, update the README, and open a PR.
4. Without `DEVIN_API_KEY`, the row stays `draft` and the requests page shows the prompt with a copy button, so the demo works by pasting into the Devin webapp.
5. With `DEVIN_API_KEY`, the server uploads the screenshot as an attachment, creates a session, and stores its id and URL with status `sent`. The requests page refreshes session status and PR URL on load. Endpoint shapes get checked against docs.devin.ai when the key exists.

## Steps

### Phase 0: Scaffold

- [x] Install Node 24 LTS and create the Next.js TypeScript app with ESLint.
- [x] Add `.gitignore` (node, `.next`, `.env*` except `.env.example`, `data/`).
- [x] Add `npm run dev`.
- [x] Add `npm test` running `node:test`, and CI running lint, typecheck, test, build.
- [x] Add `docs/notes.md` for gotchas and deferred work.
- Acceptance: a fresh clone runs `npm ci && npm run dev`, and the home page loads; CI is green.

### Phase 1: Catalog, mock service, reference app

- [x] Build the feature-flag service and its API doc.
- [x] Add `.env.example` with placeholder values, and make `npm run dev` start Next.js and the feature-flag service together.
- [x] Build `src/lib/catalog.ts` and the catalog page with a card per app.
- [x] Build the Service Health app: one row per service with its name, base URL, and up or down state.
- Acceptance: the catalog shows the Service Health card; Service Health shows the feature-flag service as up while it runs and down after it stops; flags created through `curl` persist across a service restart; the smoke test covers service CRUD and catalog loading.

### Phase 2: SSO and access control

- [x] Add Auth.js with a generic OIDC provider, enabled when `OIDC_ISSUER` is set.
- [x] Add a dev login provider, enabled when `AUTH_DEV_LOGIN=true`, that signs in with any email.
- [x] Add the app_access table and the route guard.
- [x] Build the access panel: pick an app, list granted emails, add or remove an email.
- Acceptance: a signed-out user is sent to sign-in; a member without a grant gets a locked page at `/apps/service-health`; after an admin grants them access, the app opens; the smoke test covers the guard decision function.

### Phase 3: App Creator

- [ ] Build the create form and server action with input validation.
- [ ] Build the prompt builder and the draft flow.
- [ ] Build the requests page with copy-prompt, session link, and PR link.
- [ ] Add the Devin API calls behind `DEVIN_API_KEY` (TODO until a service-user key exists).
- Acceptance: submitting the form creates a `draft` request whose prompt names the chosen service doc and the reference app; pasting that prompt into Devin produces a PR that adds a working app folder; the smoke test covers prompt building and request storage.

Each phase ends with a README update and its own PR, based on the previous phase branch if that one is not merged yet.

## Verification

1. `npm run lint`, typecheck, and `npm test` pass locally and in CI.
2. Each phase is checked by hand in the browser along the acceptance criteria above.
3. After phase 3, the end-to-end demo: request the Feature Flags admin panel through the creator (list, create, toggle, and delete true/false flags against the feature-flag service), paste the prompt into Devin, review the PR, and run it locally.

## Later phases

1. Devin playbook and Knowledge entries for app generation, and DeepWiki indexing of this repo.
2. Devin Review on generated PRs until it finds no issues, then human merge.
3. Deploy workflow once hosting is chosen.
4. Scheduled Devin security scans with fix PRs.
5. Group-based access rules from OIDC claims.

## Open questions

None.

## Status log

- 2026-10-26: plan drafted with user decisions on stack, hosting, auth, storage, demo service, Devin API key, and scope.
- 2026-10-26: per user, the Feature Flags admin panel is the Creator demo and Service Health is the reference app.
- 2026-10-26: plan approved.
- 2026-10-26: Phase 0 done. `.env.example` and the combined dev command moved to Phase 1, since Phase 0 has no env vars and no service yet.
- 2026-10-26: Phase 1 done. Added `src/lib/services.ts` as the one list of services, so Service Health and the Creator read base URLs and API docs from the same place.
- 2026-10-26: per review, the service API doc moved to `docs/services/feature-flags.md` to keep docs under `./docs`, and the service binds to `127.0.0.1` because it has no auth.
- 2026-10-26: Phase 2 done. Dropped the users table, because the admin role comes from `ADMIN_EMAILS` and grants are keyed by email, so nothing reads it.
  A member who opens a locked app is sent to `/no-access`, which names the owner.
  Session emails are lowercased in the Auth.js `jwt` callback, so OIDC addresses in any case match grants and `ADMIN_EMAILS`.
  Auth.js is `next-auth@5.0.0-beta.32`, since v5 is the line that supports the App Router and Next.js 16.
