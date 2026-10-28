# Feature Flags Admin Panel

Owner: sai@example.com

## Goal

Add an internal app at `/apps/feature-flags-admin-panel` that lists every flag from the Feature Flags service with an on/off toggle, and lets a user create and delete flags.
It is the first app built from an App Creator request, requested by sai@example.com.

## Decisions

1. Copy the Service Health pattern: `page.tsx` plus `app.json`, with every service call in server code using the base URL from `src/lib/services.ts`.
2. "Update" means setting a flag on or off, because `PATCH /flags/:key` with `{ enabled }` is the only update the service API offers.
   Editing a description would need a new service endpoint, which is out of scope for an app request.
3. Each server action re-checks `canOpenApp` for this app.
   The request said to add no auth code because `src/proxy.ts` guards `/apps/<slug>`, but the Next.js 16 docs (`proxy.md`, `data-security.md`) say to verify auth inside each server function and not rely on the proxy alone.
   `AGENTS.md` also says never to simplify away security, so this is a three-line guard that reuses `canOpenApp`.
4. One small client component shows service errors (for example `409` on a duplicate key) next to the form that caused them, using `useActionState` like the App Creator form.
   It also asks for confirmation before a delete, since a delete cannot be undone.

## Scope

In: list, toggle, create, delete, service error messages, a smoke test, README update.
Out: editing descriptions, bulk actions, search, audit history.

## Design

1. `src/app/apps/feature-flags-admin-panel/app.json`: manifest with name, description, owner `sai@example.com`, and services `["feature-flags"]`.
2. `src/app/apps/feature-flags-admin-panel/page.tsx`: server component that reads `GET /flags` and defines two server actions.
   `createFlag` calls `POST /flags`.
   `changeFlag` calls `PATCH /flags/:key` for the toggle and `DELETE /flags/:key` for delete, picked by the submit button's `intent`.
   Both call `revalidatePath` on success, so the list re-renders.
3. `src/app/apps/feature-flags-admin-panel/form.tsx`: client `ActionForm` wrapping a server action with `useActionState`, showing its error and confirming buttons that carry `data-confirm`.

## Steps

- [x] Write this plan.
- [x] Add `app.json`, `page.tsx`, and `form.tsx`.
  Acceptance: an admin sees every flag with an On or Off switch, a create form, and a Delete button per flag; a member without a grant is sent to `/no-access`.
- [x] Add a smoke test in `tests/smoke.test.ts`.
  Acceptance: the catalog links the app, and the app page lists a flag created through the service with its state.
- [x] Update `README.md` and `docs/notes.md`.
- [x] Run lint, typecheck, test, and build, check the flows in a browser, and open a PR.

## Verification

1. `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` pass.
2. In the browser as `admin@example.com`: create a flag, toggle it on and off, try a duplicate key and see the error, delete it after confirming.

## Open questions

None.

## Status log

- 2026-10-28: plan written from the App Creator request.
- 2026-10-28: done. Lint, typecheck, test, and build pass, and create, toggle, duplicate-key error, delete confirm and cancel were checked in the browser as admin.
