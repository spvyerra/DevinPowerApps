# Feature Flag Admin Panel

Owner: admin@example.com

## Goal

Add the Feature Flag Admin Panel at `/apps/feature-flag-admin-panel`.
It lists every flag from the Feature Flags service with an on/off toggle, and has forms to create and delete flags.

## Decisions

1. Copy the Service Health pattern: one folder with `page.tsx` and `app.json`, because the catalog and the route guard pick it up with no other change.
2. The page calls the service only from server code: the flag list renders in a server component and every change runs in a server action.
3. The base URL comes from `src/lib/services.ts`, so the app and Service Health read the same setting.
4. The service validates keys and descriptions, so the actions pass input through and show the service's error message instead of copying its rules.
   The form adds matching HTML `pattern` and `maxLength` hints so most mistakes are caught before a round trip.
5. Each server action checks `canOpenApp` before calling the service.
   The proxy guards the page, but the Next.js 16 server actions guide says render-time gating is not a security boundary and every action must authorize itself.
   `docs/notes.md` already records the same rule for the admin panel.
6. "Update" means turning a flag on or off, because `PATCH /flags/:key` accepts only `enabled`.
   Editing a description is out until the service supports it.
7. The forms live in one small client component, because `useActionState` is needed to show service errors inline and keep typed input after a failed create.

## Scope

In: list, toggle, create, and delete flags; inline errors; a smoke test; README update.
Out: editing descriptions, bulk actions, search, audit history.

## Design

1. `src/app/apps/feature-flag-admin-panel/app.json`: manifest with name, description, owner `admin@example.com`, and services `["feature-flags"]`.
2. `src/app/apps/feature-flag-admin-panel/page.tsx`: server page with the flag list and three server actions, `createFlag`, `setFlagEnabled`, and `deleteFlag`.
3. `src/app/apps/feature-flag-admin-panel/form.tsx`: client forms for create and for each row's toggle and delete buttons.
4. `src/app/globals.css`: a `.switch` style for the toggle.
5. `tests/smoke.test.ts`: one more test in the existing file, since it already boots the service and dev server on fixed ports.

## Steps

### Phase 1: Build the app

- [x] Add the manifest and the server page with the list and actions.
- [x] Add the client forms with inline errors, a confirm before delete, and disabled buttons while pending.
- [x] Add the toggle style.
- Acceptance: an admin sees every flag with its state; toggling flips it; creating `new-checkout` adds a row that starts off; creating it again shows "already exists" and keeps the typed values; deleting removes the row; with the service stopped the page says the service is unavailable.

### Phase 2: Test and document

- [x] Add a smoke test: the catalog links the app, the page lists a flag made through the service, its create, toggle, and delete forms change the service, a duplicate key shows the service error, and a member without a grant is redirected.
- [x] Update `README.md` and `docs/notes.md`.
- [x] `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` pass.
- Acceptance: all four commands pass locally and in CI.

## Verification

1. The four npm checks.
2. A manual run of `npm run dev` with sign-in as `admin@example.com`, walking the Phase 1 acceptance list.

## Open questions

None.

## Status log

- 2026-10-27: plan written from the App Creator request by admin@example.com.
- 2026-10-27: built and checked by hand in the browser in light and dark mode, then lint, typecheck, test, and build passed.
  The smoke test went into `tests/smoke.test.ts` instead of a new file, because `node --test` runs files in parallel and a second file would race the first for the dev server ports and the `.next` lock.
- 2026-10-27: per Devin Review, the smoke test now submits the create, toggle, and delete forms the way a browser without JavaScript does, so the server action boundary is covered.
