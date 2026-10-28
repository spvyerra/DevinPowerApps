# Feature Flag Admin Panel

Owner: sai@example.com

## Goal

Add an internal app at `/apps/feature-flag-admin-panel` that lists every flag from the Feature Flags service with a toggle, and lets users create and delete flags.

## Decisions

1. Copy the Service Health pattern: a server `page.tsx` plus an `app.json` manifest, with service calls only in server code.
2. "Update" means turning a flag on or off, because `PATCH /flags/:key` only accepts `enabled`.
   Editing a description is out of scope until the service supports it.
3. The create form is a small client component (`form.tsx`), because `useActionState` needs one to show service errors such as `409` without clearing the input.
4. Each server action checks `canOpenApp` for this app.
   The request said to add no auth code, but `src/proxy.ts` only guards page paths, and a server action can be posted from any path, so without the check any signed-in user could change flags.
   `docs/notes.md` already records that server actions re-check access themselves.

## Scope

In: list, toggle, create, delete, smoke test, README update.
Out: editing descriptions, bulk actions, audit history.

## Design

1. `src/app/apps/feature-flag-admin-panel/app.json`: manifest with owner `sai@example.com` and services `["feature-flags"]`.
2. `src/app/apps/feature-flag-admin-panel/page.tsx`: server component that reads `GET /flags` and defines the `createFlag`, `toggleFlag`, and `deleteFlag` server actions.
3. `src/app/apps/feature-flag-admin-panel/form.tsx`: client create form that shows the error returned by `createFlag`.
4. `tests/smoke.test.ts`: one more smoke test for the new page.

## Steps

- [x] Write this plan.
- [x] Add the manifest, page, and create form.
- [x] Add a smoke test: an admin opens the panel and sees a flag created in the service with its toggle.
- [x] Update `README.md`.
- [x] Run lint, typecheck, test, and build.
- Acceptance: the catalog shows a Feature Flag Admin Panel card; the panel lists flags sorted by key with On or Off state; Turn on and Turn off flip the flag; creating a duplicate key shows the service error and keeps the input; Delete removes the flag; a member without a grant is sent to `/no-access`.

## Verification

1. `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` pass.
2. Manual check in the browser as `admin@example.com` along the acceptance criteria.

## Open questions

None.

## Status log

- 2026-10-28: plan written and executed from an App Creator request by sai@example.com.
- 2026-10-28: done. Lint, typecheck, test, and build pass, and the acceptance criteria were checked in the browser as admin@example.com.
