# Super Admin UI (PR 4 of 5) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the four super-admin pages (Overview, Accounts, Demo pages, Cleanups) onto the `app-ui` kit. Features move into a dialog, disabling publishing confirms through `ConfirmDialog`, and account deletion becomes a `ConfirmDialog` with typed confirmation. `super-admin-accent.ts` and the legacy `components/ui/Alert` are deleted.

**Architecture:** Components are restyled in place. The publication, feature and delete dialogs each mount once, at the table level, keyed by their target user, so one row can render as both a table row (`lg` and up) and a card (below `lg`) without duplicating dialog state. Entitlement snapshots returned by the API are written back into the table's `users` state, so the row summary and the dialog agree.

**Tech Stack:** Next.js 16, React 19, Tailwind 4.2, Vitest (node, `renderToStaticMarkup`), Playwright.

**Spec:** `docs/superpowers/specs/2026-10-09-dashboard-tailwind-ui-design.md` (§8 Super admin, Delivery item 4).

## Global Constraints

- No new dependencies. No route, API, data, store or server-action changes.
- Copy is English only, since super admin is an internal tool. Wording carries over from today unless the spec says otherwise.
- Migrated files use only kit components and `app-*` tokens. `components/super-admin` joins `MIGRATED` (the token test) as a whole directory. `components/super-admin/**` and `app/super-admin/**` join `MIGRATED_TO_APP_UI` (ESLint).
- Targets are 44px below `sm`, with focus rings everywhere. Close and dismiss labels are required.
- Public rendering is unchanged. The public screenshot guard still matches `main`.

## Review Focus

1. **Disabling publishing** never happens without the confirmation, and Cancel changes nothing. Enabling has no confirmation, as today.
2. **The Features dialog** keeps today's rules:
   - Grant is disabled while busy or while prerequisites are missing.
   - Withhold and Clear are never blocked by prerequisites.
   - Clear only shows on an overridden feature.
   - The reason is still required by the request builder.
   - The row summary reflects the snapshot the server returned.
3. **Delete stays locked** until the typed email matches (case- and space-insensitive). The protected (super admin) account has no delete action.
4. **`?q=` and `?status=`** still seed the filters and are written back on change.
5. **Accounts at 390px:** cards instead of the table, long emails wrap, and there is no horizontal page scroll.

## Tasks

Each task follows the same steps:
- **RED:** update or add the component test, and add the file to the gates when its directory is listed.
- **GREEN:** rewrite the markup on the kit, keeping every existing content and behavior assertion.
- Then lint and commit.

1. **Kit:** add `confirmDisabled` to `ConfirmDialog`, so a confirm can stay locked until a typed check passes.
2. **Overview** (`SuperAdminOverview`):
   - A `StatGroup` of four `Stat`s (Registered accounts, Publishing on, Publishing off, Pending cleanups), each linking to its filtered view.
   - A "Needs attention" `Card` holding a `StackedList` of links, each with a tone `Badge`, or a muted line when nothing is waiting.
3. **Cleanups** (`PendingDeletionCleanups`):
   - A `Card` whose header reads "Asset cleanup pending".
   - A `StackedList` of rows: mono id, status `Badge`, attempt meta and a Retry `Button` (`loading`).
   - Success shows a toast; failure shows an inline danger `Alert`.
   - `EmptyState` when the queue is empty.
4. **Demo pages** (`DemoPagesPanel`):
   - A grid of `Card`s: name, vertical `Badge`, mono path and status line.
   - Edit demo is a primary submit `Button`, disabled unless the demo is ready.
   - View live is an external `ButtonLink`.
5. **Features dialog** (`ProviderFeatureOverrides`), shown as a `Dialog size="md"`:
   - Each feature gets state `Badge`s (On/Off, Override, Blocked), plus its expiry and blocked lines.
   - Change access opens the editor with Reason, Expires and the prerequisite warning, then Grant / Withhold / Clear override / Cancel.
   - Feedback is an inline `Alert`.
   - `FeatureAccessSummary` renders the row line (plan tier and "n of 6 enabled").
6. **Delete account** (`DeleteAccountDialog`), shown as a `ConfirmDialog` (danger):
   - Children: the list of what is removed, the demo-owner warning `Alert`, and a `Field` with an `Input` for the typed confirmation.
   - Confirm uses `confirmDisabled` until the email matches, and focus moves to the input on open.
7. **Accounts** (`UserPublicationTable`):
   - **Toolbar:** a search `Input` with an icon addon, plus a `SegmentedControl` (All / Publishing on / Publishing off) whose counts respect the search. "N of M accounts" stays live.
   - **Layout:** a `Table` from `lg` (Account, Business, Publishing, Actions) and a `Card` with a `StackedList` of cards below `lg`.
   - **Publication:** enabling shows a toast on success. Disabling goes through a `ConfirmDialog` with the old wording; it stays pending while the request runs, closes and toasts on success, and shows the error inside the dialog on failure. Errors from enabling stay inline in the row.
   - **Account feedback** moves to the kit `Alert`, with the success case as a toast.
   - Both `EmptyState`s keep their wording.
8. **Clean-up and gates:**
   - Delete `components/app-shell/super-admin-accent.ts`, `components/ui/Alert.tsx`, its barrel export and `legacy-alert.test.tsx`.
   - Add the gate entries.
9. **E2E and verification:**
   - Seed a `superAdmin` role (the policy's hard-coded address, local stack only) and a `superAdminTarget` provider.
   - New spec covering:
     - the Features dialog grants, then clears, `custom_slug`;
     - Disable publishing asks first: Cancel keeps it on, Disable turns it off with a toast, Enable turns it back on;
     - the delete dialog stays locked until the email is typed, then cancels;
     - `?status=disabled` preselects the filter.
   - Then: `npm run ci`, a fresh-seed full e2e run, the public visual guard, visual QA at 390 and 1280, and a whole-branch review. Then a fix pass, PR, CI, squash merge and branch deletion.
