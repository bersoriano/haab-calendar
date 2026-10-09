# Provider Dashboard Routes, Shell & Super Admin — Design

**Date:** 2026-10-08
**Status:** Approved (design), pending spec review → implementation plan
**Branch:** `feat/dashboard-routes-shell`
**Scope:** Signed-in provider dashboard (all sections), its header/footer chrome, the setup-wizard/guest-builder header, and the super-admin area. Out of scope: the public booking flow, the marketing landing page content, and the setup wizard's steps.

## Goal

Give every dashboard section its own URL, replace the stacked/duplicated chrome with one app shell (sidebar, top bar, footer), reorganize each section so it has one clear job, and bring super admin onto the same shell — without removing any existing functionality.

## Problems (current state)

1. **The dashboard has no route.** It lives at `/`, opened by client state `view="app"` in `components/home-experience.tsx`. A refresh drops the provider back on the marketing landing page.
2. **Sections are React state, not URLs.** `adminTab` (`components/haab-booking-module.tsx:403`) drives which section renders. Only `?tab=analytics` deep-links. Back/forward do nothing; links cannot be shared or opened in a new tab.
3. **Five stacked chrome layers:** demo-edit bar → account-status bar → `AdminHero` title → sticky `SelectedWorkflowHeader` (email, "Choose another workflow", Sign out) → module header (business name, URL, copy, view public page, email + Sign out again) → pill tabs. Email and Sign out appear twice; "Choose another workflow" makes no sense for a configured provider.
4. **Settings is a catch-all:** business profile, public link + custom slug, Google Calendar integration, weekly availability and the daily booking limit share one tab. Dashboard language sits in Appearance although it is an account preference.
5. **Unsaved edits are invisible across sections.** Profile/appearance/availability edits live in the local store until "Save changes"; the Save buttons exist only in some sections, and nothing signals pending edits elsewhere.
6. **Every admin save navigates to `/`.** `persistAdminStore` calls `onSetupPersisted`, which `home-experience` answers with `router.replace("/")` + `router.refresh()`.
7. **Redirect targets point at the landing page.** Stripe Checkout returns to `/?tab=…&checkout=…`; the Google OAuth callback returns to `/?google=<outcome>` and the outcome is never read; `startDemoEdit` redirects to `/`.
8. **Super admin is one long page** with no navigation, a 1120px-minimum table that scrolls sideways on mobile, and hardcoded violet/emerald/rose/amber colors instead of tokens.

## Decisions

| # | Decision |
|---|---|
| D1 | Dashboard lives under `/dashboard/*`. `/` redirects a signed-in provider with a finished page to `/dashboard`; the landing page stays for guests and new users. |
| D2 | Left sidebar navigation (desktop), drawer on mobile. |
| D3 | Same design tokens, Inter, `liquid-glass-style-guide.md`, and per-provider theme variables. Structural cleanup only — no new visual language. Hardcoded status colors move to existing tokens (`--success-*`, `--danger-*`, `--warning-*`). |
| D4 | Super admin gets its own routes on the shared shell. |
| D5 | Setup wizard and guest builder stay where they are (entered from the landing page); only their header is cleaned up. |
| D6 | Dashboard routing = one optional catch-all route + shallow client navigation (`history.pushState`). Super admin = layout + one page per section with `<Link>`. |
| D7 | One sticky "Unsaved changes · Save" bar replaces per-section Save buttons. |
| D8 | Dashboard copy stays bilingual (en/es); super admin stays English-only (locked i18n decision). |
| D9 | Delivered as three PRs (see Delivery). |

### Why D6 (shallow navigation) for the dashboard

The dashboard route reads cookies, so it is dynamic. In Next.js 16 a `<Link>` navigation to a dynamic route requests a fresh RSC payload from the server; prefetching only helps while online and inside the router-cache window. That breaks the offline-first rule (switching sections must work with no network) and would re-run the server loader on every click. Next.js 16 integrates native `window.history.pushState` with `usePathname`/`useSearchParams`, so the dashboard updates the URL client-side with zero server trips while a real route file still serves refreshes and deep links. Super admin is an internal, server-data tool with no offline requirement, so it uses idiomatic per-page routes that each load only their own data.

## Design

### 1. Information architecture & routes

Sidebar groups. Nav labels for Bookings and Services use the vertical-specific copy the module already resolves (`copy.Bookings`, `copy.Services` — e.g. "Reservations", "Events").

| Route | Group | Contents | Source today |
|---|---|---|---|
| `/dashboard` | Operate | **Overview** | `renderDashboard` |
| `/dashboard/bookings` | Operate | **Bookings** list | `renderBookingsList` |
| `/dashboard/calendar` | Operate | **Calendar** month view | `renderAdminCalendar` |
| `/dashboard/analytics` | Operate | **Analytics** | `ProviderAnalyticsSurface` |
| `/dashboard/services` | Set up | **Services** editor | `renderServices` / `ServiceEditor` |
| `/dashboard/availability` | Set up | **Availability**: weekly hours or event scheduling + daily booking limit | `AvailabilitySettingsSection` (moved out of Settings) |
| `/dashboard/appearance` | Set up | **Appearance**: logo, appearance fields, theme, client page language | `renderAppearance` minus dashboard language |
| `/dashboard/integrations` | Set up | **Integrations**: Google Calendar | `ProviderIntegrationsSection` (moved out of Settings) |
| `/dashboard/settings` | pinned bottom | **Settings**: business profile, booking link + custom slug, dashboard language, danger zone | `ProviderSettingsSurface` minus availability/integrations, plus dashboard language |

`AdminTab` (`lib/types.ts`) gains `"availability"` and `"integrations"`. The section ↔ path mapping lives in one pure module, `lib/dashboard-routes.ts`:

- `DASHBOARD_SECTIONS` — ordered list with group and path segment (`dashboard` ↔ no segment).
- `sectionFromPathname(pathname)` → `AdminTab | null` (null = unknown → 404).
- `pathForSection(section, search?)` → `/dashboard/...`.
- `legacyTabToPath(tab, checkout?)` → maps old `?tab=` values for the `/` redirect.
- `resolveHomeRedirect({ loggedIn, configured, demoEdit, tab, checkout })` → `string | null`: the `/` page calls it and `redirect()`s when it returns a path.
- `parseGoogleOutcome(value)` → known outcome or `null`.

#### Route behavior

- `app/dashboard/[[...section]]/page.tsx` (server):
  - Resolves the section from `params.section` via `lib/dashboard-routes.ts`; more than one segment or an unknown segment → `notFound()`.
  - No session → `redirect("/login?next=<current path>")` (existing `getSafeNextPath` accepts it).
  - Signed in, page not set up (and not demo editing) → `redirect("/")` so the landing/setup flow takes over (D5).
  - Otherwise loads the same data `app/page.tsx` loads today (dashboard context, publication status, entitlements, demo-edit target, super-admin flag, server language) — extracted into a shared server helper `lib/supabase/dashboard-loader.ts` so `/` and `/dashboard` cannot drift.
  - `generateMetadata` sets `"<Section> · Haab Calendar"` for hard loads; `robots: noindex`.
- `app/page.tsx`: calls `resolveHomeRedirect` before rendering. Signed-in + configured → `/dashboard` (or the legacy-tab target). Guests and unconfigured users render the landing page as today. The landing "Open dashboard" panel becomes a link to `/dashboard`.
- Stripe Checkout `success_url` / `cancel_url` → `/dashboard/<returnTab>?checkout=success|cancelled`. Legacy `/?tab=…&checkout=…` URLs from in-flight sessions still work through `resolveHomeRedirect`.
- Google OAuth callback → `/dashboard/integrations?google=<outcome>`. The Integrations section shows the outcome as a banner (en/es copy per known outcome) until the provider navigates to another section; navigation drops the param.
- `startDemoEdit` → `/dashboard`. `stopDemoEdit` → `/super-admin/demo-pages`.
- Setup publish (`onSetupPersisted` while setting up) → `router.replace("/dashboard")`.
- Admin saves on the dashboard do **not** navigate. `onSetupPersisted` keeps its meaning for the setup flow only; the dashboard host passes a handler that updates its store snapshot and nothing else.

#### Client navigation

- Sidebar items render real `<a href="/dashboard/…">` so middle-click, ⌘/Ctrl-click and "open in new tab" work.
- A plain primary click (no modifier keys, same target) calls `preventDefault()` and `history.pushState(null, "", href)`. Next.js syncs `usePathname`; the shell derives the active section from it with `sectionFromPathname`.
- Query params that belong to one landing (`?checkout`, `?google`) are dropped when navigating to another section.
- On section change: scroll content to top, move focus to the section `<h1>`, set `document.title`.
- Back/forward work through Next's history integration; no server request.

#### Saving (D7)

- The dashboard host keeps `savedStore` (the last store returned by `/api/provider/store`, initialised from the server store) and compares it with the live store through a pure `isStoreDirty(saved, current)` in `lib/store-dirty.ts`. The comparison covers the fields the PUT persists (provider, availability, services, vertical) and ignores bookings and other server-owned data.
- When dirty, a sticky bar at the bottom of the content column shows "Unsaved changes" + **Save** (calls the existing `persistAdminStore(activeStore, …)`), with the existing saving/error/saved states. A `beforeunload` listener warns when leaving the page dirty.
- The per-section "Save changes" buttons in Appearance and Settings are removed in favor of the bar; Save stays reachable from every section that can make the store dirty. Services keep their existing save-on-submit; a service save persists the whole store, which also clears the bar.
- Edits survive section switches because sections share one module instance and one store.

### 2. App shell, header, footer

New shared components in `components/app-shell/`, used by both the dashboard and super admin:

- **`AppShell`** — layout grid: sidebar column + content column (top bar, banners slot, content, footer). Props: `sidebar`, `title`, `description`, `topBarActions`, `banners`, `footer`, `children`.
- **`SidebarNav`** — grouped items `{ id, href, label, icon, badge? }`, Phosphor icons (already a dependency), `aria-current="page"` on the active item, `<nav aria-label>`. Optional `onNavigate(href, event)`; the dashboard passes the shallow-navigation handler, super admin omits it and renders `next/link`.
- **Sidebar layout** (≥ `lg`): sticky, full height, ~264px.
  - Top: Haab mark linking to the area home (`/dashboard` or `/super-admin`); workspace card with the provider logo (or initial), business name, and a publish status dot (live / publishing disabled).
  - Middle: grouped nav.
  - Bottom: Settings, "Super admin" (super admins only), account row (initial avatar, truncated email, Sign out via the `logout` server action).
- **Mobile drawer** (< `lg`): the top bar shows a menu button that opens the sidebar as a drawer — focus trapped, Esc and backdrop close it, closes on navigation, body scroll locked while open.
- **Top bar** (sticky in the content column): menu button (mobile), section title as the page `<h1>` + a one-line description, and on the right **Copy link** and **View page ↗** (icon-only on mobile). Section-specific controls live in the section's own toolbar, not here.
- **Banners slot** (under the top bar): demo-edit notice (label, public path, View live, Exit demo editing), publication status message (`publicationStatus.dashboardMessage`), Google outcome. The Stripe checkout result stays inside Analytics, which needs entitlements to word it. Replaces `DemoEditBar` + `AccountStatusBar` full-width bars and the `AdminHero` title on the dashboard.
- **Footer** (bottom of the content column): `© <year> Haab Calendar · Terms · Privacy · View public page`. en/es on the dashboard, English on super admin.
- **Accessibility:** skip-to-content link, one `<h1>` per page, focus moved to it on section change, 44px minimum targets (`min-h-11`), visible focus rings, drawer focus management.

#### Module wiring (no new store ownership)

`HaabBookingModule` gains optional props:

- `adminSection?: AdminTab` — controlled section. When set, the module renders that section and ignores its internal `adminTab`.
- `onAdminSectionChange?: (section: AdminTab) => void` — used by in-module links (e.g. Availability's "Manage events" → Services, Overview's "See all bookings").
- `chrome?: "module" | "shell"` — `"shell"` suppresses the module's own header and pill tabs. Default `"module"` keeps today's header and tabs for embedded/child hosts (template seam stays intact).

The shell reads business name, logo, public URL, and publish state from the store snapshot the module already emits through `onStoreChange`. Dirty tracking and the save bar render inside the module (it owns `persistAdminStore`, `isSavingAdmin`, `adminSaveError`, `adminSaveMessage`) when `chrome="shell"`.

A new client component `components/provider/DashboardApp.tsx` composes `LanguageProvider` + `AppShell` + `HaabBookingModule` for `/dashboard`, replacing the `view === "app"` branch of `home-experience` for configured providers. The demo-edit and super-admin behaviors move with it.

#### Setup wizard / guest builder header (D5)

`AdminHero` + `SelectedWorkflowHeader` + the module header collapse into one slim sticky header: Haab mark, selected workflow label, "Choose another workflow", and either email + Sign out (signed in) or the guest "Publish" call to action (guest). The guest draft notice stays as a single banner below it. Wizard steps are unchanged.

### 3. Per-section organization

Shared rules: one card level (no card inside card inside card), a consistent section toolbar, one alert component on status tokens (replaces hardcoded `#fecdd3`/`#fff1f2`/`#bbf7d0`/`#f0fdf4` and rose/emerald classes), consistent spacing scale.

- **Overview** — Row 1: four stat tiles (2×2 on mobile, 4 across on desktop): upcoming 7 days, services, confirmed, total. Row 2, two columns: *Upcoming 7 days* as compact rows (time block, client, service, type/status/campaign badges, reschedule/cancel actions; reschedule hidden for single-occurrence services as today) with "See all bookings →"; side column with *Your booking page* (URL, Copy, View, publish status) and *Next steps* — shown only when something is missing (no services → Services, no available days → Availability, publishing disabled → status message).
- **Bookings** — sticky toolbar: search, status filter, type filter, result count, "Clear filters" (when any filter is active), "Scan appointment" (integrated mode). Rows grouped under date headings ("Today", "Tomorrow", then formatted dates), contact details on the second line, actions right-aligned and stacking on mobile, cancelled rows dimmed with actions disabled as today. Empty states distinguish "no bookings yet" from "no matches".
- **Calendar** — one toolbar: ‹ Today › and month label, legend, "New booking for: [service]" select. Desktop grid keeps booking chips. Mobile cells show the date, colored dots per booking type, and "+N"; tapping an open day still launches the in-app booking flow, which renders in the content area with "Back to calendar".
- **Analytics** — content unchanged (recent work). Its top `SectionTitle` is dropped because the top bar `<h1>` names the page; the checkout banner stays in the section and switches to the shared `Alert`.
- **Services** — list | editor split kept; editor column sticky on desktop; on mobile an "Add service" button scrolls to and focuses the editor. Behavior unchanged.
- **Availability** — weekly hours (or event scheduling for the events vertical) and the daily booking limit in one panel.
- **Appearance** — left: logo uploader + appearance fields; right: theme picker + client page language. Dashboard language moves to Settings.
- **Integrations** — Google Calendar card, plus the OAuth outcome banner.
- **Settings** — stacked cards: Business profile (`ProviderInfoForm`, including time zone and phones), Booking link (URL, copy, custom slug editor when entitled), Dashboard language, Danger zone (reset standalone setup; non-integrated only, as today).

`LanguageSettingsSection` splits into `ClientLanguageField` (Appearance) and `DashboardLanguageField` (Settings), keeping the same store fields and the `onDashboardLanguageChange` upward call.

### 4. Super admin

English-only. Idiomatic routes on the shared `AppShell`:

- `app/super-admin/layout.tsx` — `requireSuperAdmin`; on `SuperAdminAccessError` → `notFound()` (same as today). Renders the shell with admin nav and the pending-cleanup count as a badge.
- `/super-admin` — **Overview**: tiles (registered accounts, publishing on, publishing off, pending cleanups) and a "Needs attention" list linking to cleanups and to the accounts list filtered to disabled.
- `/super-admin/accounts` — `UserPublicationTable` with search (email, business name) and filter chips (All · Publishing on · Publishing off, reflected in `?status=`). Table at ≥ `lg`, stacked cards below (no horizontal page scroll). Actions unchanged: toggle publication, feature overrides, typed-confirmation delete.
- `/super-admin/demo-pages` — `DemoPagesPanel` cards; Edit starts demo editing and lands on `/dashboard`.
- `/super-admin/cleanups` — `PendingDeletionCleanups` with retry and an empty state.
- Sidebar bottom: "← My dashboard" (`/dashboard`), email, Sign out.
- Emerald/rose/amber classes move to the `--success-*` / `--danger-*` / `--warning-*` tokens. The violet super-admin accent becomes one exported class constant in `components/app-shell/` used everywhere super admin is signposted (sidebar item, demo-edit banner), instead of per-component palette classes.
- `revalidatePath` calls in server actions and API routes cover the new paths.

### 5. Error handling & edge cases

- Unknown dashboard section or extra segments → `notFound()`.
- Dashboard store load failure → same behavior as today's `/`: log `provider_dashboard_store_load_failed`, treat as not configured, redirect to `/`.
- Entitlement load failure → `providerEntitlements` undefined; Integrations/Analytics show their existing "cannot tell" states.
- Offline: section switches work (no server trips). Save failures show the existing error in the save bar; edits stay local and the bar stays visible.
- Demo editing: the dashboard banner always shows the demo target; saves go to the demo provider exactly as today.
- Integrated-mode-off / embedded hosts: `chrome` defaults to `"module"`, so hosts that do not opt into the shell see no change.

### 6. Testing

TDD for the pure modules; tests first.

The repo's component tests render with `react-dom/server` in a node environment (no DOM, no Testing Library). This design adds no test dependencies: interaction logic lives in pure helpers that are unit-tested, markup is asserted with `renderToStaticMarkup`, and real interactions are covered in Playwright.

- **Unit (Vitest):** `lib/dashboard-routes.ts` (every section ↔ path, unknown/extra segments, legacy `?tab` mapping incl. `checkout`, `resolveHomeRedirect` matrix: guest / signed-in unconfigured / configured / demo edit, Google outcome parsing), `lib/store-dirty.ts` (each persisted field flips dirty; bookings do not), `shouldInterceptNavClick(event)` (plain primary click → true; modifier keys, middle click, `target="_blank"`, already-prevented → false), bookings date-grouping helper, overview "Next steps" helper.
- **Markup (Vitest + `renderToStaticMarkup`):** `SidebarNav` (`aria-current` on the active item, real `href`s, super-admin item only for super admins), save bar (absent when clean, present when dirty), `AppShell` (skip link, single `<h1>`, footer links), super-admin accounts list (cards and table variants).
- **Existing tests:** update language-purity coverage for new en/es keys; update or replace `admin-hero.test.tsx`, `selected-workflow-header.test.tsx`, `appearance-split.test.tsx`, `settings-surface-composition.test.ts`, `provider-settings-surface.test.tsx`, and `dashboard-language.test.tsx` to match the new composition — every assertion about a feature being present moves to the section that now owns it, none is deleted without a replacement.
- **E2E (Playwright, local Supabase):** deep link to each section renders it; refresh keeps the section; back/forward move between sections; sidebar click changes the URL without a document request; mobile drawer opens, closes on Esc and on navigation; an unsaved Appearance edit survives switching to Bookings and back and the save bar persists it; `/` redirects a configured provider to `/dashboard`; update `premium-entitlements.spec.ts` for the new URLs.
- **Manual visual QA** in the browser at 390px, 768px, 1280px, and 1440px for every section and super-admin page.
- **Gate:** `npm run ci` (typecheck, lint, coverage, build) green on each PR.

## Delivery

Three PRs, each from its own branch off `main`, each independently shippable:

1. **Routes + shell + header/footer + redirects** — `lib/dashboard-routes.ts`, dashboard loader, `/dashboard/[[...section]]`, `AppShell`, `DashboardApp`, module `adminSection`/`chrome` props, `/` redirect, Stripe/Google/demo-edit retargeting, setup-wizard slim header. Sections render their current content inside the shell (Availability and Integrations routes already split out of Settings).
2. **Section reorganization + save bar** — overview, bookings grouping/toolbar, calendar toolbar/mobile cells, appearance/settings/language split, unified alerts, dirty tracking + save bar + `beforeunload`.
3. **Super admin** — layout + four routes, search/filters, responsive accounts list, token colors.

## Non-goals

- No change to the public booking flow, booking engine, or API contracts beyond redirect targets.
- No new visual language, fonts, or theme system.
- No change to the setup wizard's steps or the guest builder's behavior.
- No translation of super admin.
- No server-side persistence of filter state (bookings filters stay client state).
