# Provider Dashboard Tailwind UI — Design

**Date:** 2026-10-09
**Status:** Approved (design), pending spec review → implementation plan
**Branch:** `feat/app-ui-foundation` (first of five; see Delivery)
**Scope:** Every signed-in provider surface — the `/dashboard/*` sections, the app shell, the dialogs they open — plus super admin, the setup wizard and guest builder, and the auth pages. Out of scope: the marketing landing page and the public booking flow (including the manage-booking page).

## Goal

Rebuild the provider-facing UI on a small, owned component kit in the Tailwind Plus application-UI style (flat, crisp surfaces, neutral grays, ring borders, light shadows, proper tables, stacked lists and form layouts), and use the move to polish interactions: one dialog pattern, toasts for transient feedback, inline field errors, confirmations before destructive actions, and consistent loading, empty and error states. No new features, no API or data changes.

## Understanding

**Stated by the owner**
- Restyle all service-provider dashboard components with Tailwind components to improve UI and UX; not the landing page, not the public booking workflow.
- "Tailwind components" means the Tailwind Plus application-UI look, written in-repo (no Tailwind Plus licence or Catalyst source).
- Also in scope: super admin, setup wizard (and guest builder), auth pages.
- Restyle plus interaction polish; no new capabilities.
- Light only now, built so dark mode is a later token-only change.
- Approach A: own kit on semantic tokens, native browser behavior, no new dependencies.

**Assumed (confirmed through the design review)**
- Inter, Phosphor icons and Haab blue stay; Tailwind indigo is not adopted.
- Routes, store, server loaders, API contracts and offline behavior are unchanged.
- Dashboard copy stays bilingual (en/es); super admin stays English-only.
- The repo is the template parent: child projects re-brand through CSS variables, so every color must be a variable.

**Success criteria**
- In-scope components import only from `components/app-ui` for primitives and use only `app-*` tokens: no `adminGlass` classes, no raw hex/rgba, no raw Tailwind palette classes.
- The public booking flow and manage page render unchanged.
- `npm run ci` is green on every PR.
- Every in-scope page passes visual QA at 390, 768, 1280 and 1440 px, a keyboard pass, and WCAG AA contrast.

## Constraints found in the code

1. **Shared primitives.** `ActionButton`, `buttonClasses`, `ToneBadge`, `EmptyState` and `SectionTitle` in `components/ui/` are used by public booking components (`ServiceSwitchDialog`, `ServiceCard`, `BookingCampaignBadge`, `BookingNotePanel`, …). Restyling them in place would change the booking flow.
2. **Shared modals.** The cancellation, reschedule and calendar-QR modals in `components/haab-booking-module.tsx` branch on `isDedicatedPublicPage` to serve both public and admin contexts.
3. **Shared global variables.** Public themes (`lib/public-theme.ts`) override the global variables (`--ink`, `--surface-*`, `--primary`, …). The dashboard cannot reuse those names.
4. **Server-rendered tests.** Component tests render with `react-dom/server` in a node environment (no DOM, no Testing Library). A portal-based dialog would render nothing there.
5. **Root font size** is `106.25%` (17px), so rem-based Tailwind sizes are ~6% larger than nominal (`h-9` ≈ 38px). Accepted; no change.

## Decisions

| # | Decision |
|---|---|
| D1 | Tailwind Plus application-UI visual language for every in-scope surface. The liquid-glass look stays on public pages only. |
| D2 | New kit `components/app-ui/`, owned in-repo. `components/ui/*` public primitives stay untouched. |
| D3 | Colors come from a Tailwind v4 `@theme` namespace `--color-app-*`, separate from the public variables. Dark mode later = one override block. |
| D4 | Native platform behavior: `<dialog>` + `showModal()`, native `<select>`, `<input type="checkbox" role="switch">`. No new dependencies. |
| D5 | Light only. No raw palette classes, so dark mode needs no markup changes. |
| D6 | Interaction polish is in scope: toasts, `ConfirmDialog` before destructive actions, inline field errors, hidden actions on cancelled rows, the super-admin Features dialog. New capabilities are not. |
| D7 | Admin renders still inside `haab-booking-module.tsx` are extracted into presentational components where this work touches them. State and handlers stay in the module. |
| D8 | ESLint `no-restricted-imports` enforces the migration per directory; `adminGlass.ts` is deleted in the last PR. |
| D9 | Five PRs, in order, each on its own branch off `main`. |

## Design

### 1. Tokens

Added to `app/globals.css` as a `@theme` block. Values are literal so a child project or a future dark theme overrides them by redefining the variables.

| Token (`--color-app-…`) | Value | Use |
|---|---|---|
| `canvas` | `#f9fafb` | page background |
| `surface` | `#ffffff` | cards, sidebar, top bar, dialogs |
| `subtle` | `#f3f4f6` | hover rows, table heads, insets, out-of-month cells |
| `border` | `#e5e7eb` | card rings, dividers |
| `border-strong` | `#d1d5db` | input outlines |
| `fg` | `#111827` | primary text |
| `fg-secondary` | `#374151` | labels, secondary text |
| `fg-muted` | `#6b7280` | descriptions, meta (4.8:1 on white) |
| `placeholder` | `#9ca3af` | input placeholders (labels are always present) |
| `accent` | `#005bbf` | primary buttons, focus outlines, links (6.5:1 with white) |
| `accent-hover` | `#1a73e8` | primary hover (4.6:1 with white) |
| `accent-soft` | `#e8f0fe` | active nav, accent badges, open calendar days |
| `accent-on-soft` | `#0b57d0` | text on `accent-soft` (5.9:1) |
| `accent-soft-hover` / `accent-ring` | `#d3e3fd` / `rgb(0 91 191 / 0.2)` | soft button hover / accent badge ring |
| `on-accent` | `#ffffff` | text on solid accent and danger buttons |
| `overlay` | `rgb(3 7 18 / 0.4)` | dialog and drawer backdrop |
| `success-soft` / `success-fg` / `success-ring` | `#f0fdf4` / `#15803d` / `rgb(22 163 74 / 0.2)` | success badges and alerts |
| `warning-soft` / `warning-fg` / `warning-ring` | `#fffbeb` / `#92400e` / `rgb(217 119 6 / 0.2)` | warning |
| `danger-soft` / `danger-fg` / `danger-ring` | `#fef2f2` / `#b91c1c` / `rgb(220 38 38 / 0.1)` | danger badges and alerts |
| `danger` / `danger-hover` | `#dc2626` / `#b91c1c` | solid danger buttons (4.8:1 / 6.5:1 with white; hover darkens so it stays AA) |
| `info-soft` / `info-fg` / `info-ring` | `#eff6ff` / `#1d4ed8` / `rgb(37 99 235 / 0.2)` | info alerts |
| `admin-soft` / `admin-fg` / `admin-ring` | `#f5f3ff` / `#6d28d9` / `rgb(124 58 237 / 0.2)` | super-admin signposting |
| `neutral-soft` / `neutral-fg` / `neutral-ring` | `#f9fafb` / `#4b5563` / `rgb(107 114 128 / 0.1)` | neutral badges |
| `full-day` | `#1f658f` | full-day booking color (calendar chips, legend) |
| `chart-1` / `chart-2` | `#005bbf` / `#0f766e` | analytics series |

Utilities read as `bg-app-surface`, `text-app-fg-muted`, `ring-app-border`, `outline-app-accent`. A comment above the block records that dark mode is added later with a `[data-app-theme="dark"]` block overriding these variables.

### 2. Visual language

- **Cards:** `rounded-xl bg-app-surface shadow-xs ring-1 ring-app-border`. One card level. Inside a card, structure comes from dividers (`divide-y divide-app-border`), never nested cards.
- **Controls:** `rounded-lg`. Inputs: `bg-app-surface outline-1 -outline-offset-1 outline-app-border-strong`, focus `outline-2 -outline-offset-2 outline-app-accent`. Every interactive element: `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent`.
- **Type:** shell top-bar `h1` `text-xl font-semibold` (`text-lg` below `sm`); standalone page `h1`s (auth, welcome) `text-2xl`–`text-4xl`; card headings `text-base font-semibold`, body and labels `text-sm`, meta `text-xs`/`text-sm text-app-fg-muted`, numbers `tabular-nums`. Uppercase tracked eyebrows are dropped except table column heads.
- **Density:** controls `h-9` from `sm` up and `h-11` below `sm`, keeping 44px touch targets on phones.
- **Elevation:** no glass, blur or large shadows. Shadows only on overlays: dialog, drawer, toast, sticky save bar (`shadow-lg`).
- **Motion:** 150–200ms ease-out on overlays only; the existing `prefers-reduced-motion` rule in `globals.css` already neutralizes it.

### 3. The `app-ui` kit

`components/app-ui/`, one file per component, barrel `index.ts`. Class recipes are pure functions in `components/app-ui/styles.ts` (`buttonStyles({ variant, size })`, `inputStyles({ invalid })`, `badgeStyles(tone)`, `cardStyles()`) so links, labels and module markup can reuse a look without a wrapper. Everything renders on the server; nothing uses portals.

**Actions**
- `Button` — `variant: "primary" | "secondary" | "soft" | "plain" | "danger" | "danger-plain"` (`danger-plain` = plain button with danger text, for row-level Cancel/Delete), `size: "sm" | "md"`, `leadingIcon?`, `loading?` (spinner, `aria-busy="true"`, disabled while pending), passes through native button props.
- `ButtonLink` — the same looks for `<a>` or `next/link` (`href`, `external?` adds `target="_blank" rel="noopener noreferrer"` and a ↗ icon).
- `IconButton` — `label` required, rendered as `aria-label` and `title`; same variants.

**Display**
- `Card`, `CardHeader` (`title`, `description?`, `actions?`), `CardBody`, `CardFooter` (top divider, right-aligned actions).
- `SectionHeading` — heading, description and actions row for use inside cards and pages.
- `Badge` — `tone: "neutral" | "accent" | "success" | "warning" | "danger" | "info" | "admin"`, `dot?`. Look: `rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset`.
- `Stat` — `label`, `value`, `detail?`, `href?` + `linkLabel` (visible link text; the label is appended for screen readers) + `onClick?` for client-side navigation. `StatGroup` lays stats out with dividers.
- `StackedList`, `StackedListItem` (`leading?`, children, `trailing?`), `StackedListHeading` (sticky group heading).
- `Table`, `THead`, `TBody`, `Tr`, `Th`, `Td` — wrapped so horizontal overflow scrolls inside the card, never the page.
- `DescriptionList`, `DescriptionItem` (`term`, children).
- `EmptyState` — `icon?`, `title`, `body`, `action?`, `variant: "plain" | "dashed"`.
- `Alert` — `tone` (`neutral | success | warning | danger | info | admin`), `title?`, children, `actions?`, `role?`, `onDismiss?`. API-compatible with today's `components/ui/Alert` (whose `accent` tone maps to `admin`), which is deleted once nothing uses it — only dashboard and admin do.
- `Skeleton` — block placeholder with `animate-pulse`.
- `Avatar` — `src?`, `name` (initial fallback), `size`.

**Forms**
- `Field` — `label`, `description?`, `error?`, `required?`. Provides context (`useId`) that `Input`, `Textarea`, `Select`, `Checkbox` and `Switch` read to set `id`, `aria-describedby` (description and error ids) and `aria-invalid`. The error renders below the control with `text-app-danger-fg`.
- `Input` — `leadingAddon?` (icon or text such as `haab.app/`), `trailingAddon?` (text such as "min", or an `IconButton`), native props.
- `Textarea`, `Select` (native `<select>` with a chevron, `appearance-none`), `Checkbox`.
- `Switch` — `<input type="checkbox" role="switch">` styled as a toggle; label via `Field` or `aria-label`.
- `RadioCards` — `name`, `value`, `onChange`, `options: { value, label, description?, icon?, preview? }[]`; a `role="radiogroup"` of native radios presented as cards with an accent ring when checked.
- `Fieldset`, `Legend` — grouping (weekly availability days, service editor groups).
- `FormSection` — `title`, `description?`, children. Two columns from `lg` (text left, fields right), stacked below; sections separated by dividers. The Tailwind Plus settings-page layout.

**Navigation and overlays**
- `SegmentedControl` — `options`, `value`, `onChange`, `ariaLabel`, optional count per option; `role="radiogroup"` with `aria-checked`.
- `LanguageToggle` — EN/ES `SegmentedControl` with the same `lang` / `onChange` / `hrefFor` API as `components/ui/LanguageSwitcher` (anchors when `hrefFor` is given, buttons otherwise). Used by auth, the setup header and the `chrome="module"` header. The public `LanguageSwitcher` is untouched.
- `Dialog` — `open`, `onClose`, `title`, `description?`, `size: "sm" | "md" | "lg"`, children, `footer?`.
  - Renders a native `<dialog>` and calls `showModal()` / `close()` from an effect when `open` changes. The browser supplies focus containment, Esc, an inert background and the top layer.
  - `onClose` fires on the `cancel` event (Esc), on a backdrop click (`isBackdropClick(rect, point)`), and from the header close `IconButton`.
  - `aria-labelledby` / `aria-describedby` point at the title and description.
  - Children render only while `open` (so stale content never flashes, and server markup still contains them when open).
  - Locks page scroll while open and returns focus to the previously focused element on close.
  - Bottom sheet below `sm` (full width, rounded top), centered card from `sm`. Backdrop `backdrop:bg-app-overlay`.
- `DialogActions` — footer row: secondary on the left of primary; stacked full-width below `sm`.
- `ConfirmDialog` — `open`, `title`, `body`, `confirmLabel`, `cancelLabel`, `tone: "danger" | "primary"`, `pending`, `error?`, `onConfirm`, `onCancel`, `children?` (for extra inputs such as a typed confirmation). `pending` disables both actions and shows `loading` on confirm; `error` renders as a danger `Alert` inside the dialog.
- `ToastProvider`, `useToast()` — `notify({ tone: "success" | "neutral", message })`.
  - One `role="status" aria-live="polite"` region, bottom-right (bottom-center below `sm`).
  - At most 3 toasts; each auto-dismisses after 4s, paused while hovered or focused; dismiss button per toast.
  - Queue logic is a pure reducer (`toastReducer`) in `components/app-ui/toast-state.ts`.
  - A `ToastProvider` nested inside another passes through, so the module can mount one for embedded hosts without doubling the region.
  - Errors are never toasts; they stay next to their cause.

**Not in the kit (YAGNI):** dropdown menus, tooltips, combobox, pagination. Current flows do not need them; row actions stay visible buttons.

### 4. App shell

`components/app-shell/` keeps its structure and behavior (drawer focus trap, Esc, navigation key, skip link, `ShellLink` shallow navigation). Restyle:

- **Sidebar** — `bg-app-surface border-r border-app-border`.
  - Top: Haab mark (64px row) linking to the area home.
  - Workspace block: provider logo `Avatar`, business name, `Badge` "Live" (success) or "Publishing off" (danger).
  - Nav items: `rounded-lg px-2 h-9 text-sm font-semibold`, icon 20px. Active: `bg-app-subtle text-app-accent` with accent icon and `aria-current="page"`. Idle: `text-app-fg-secondary hover:bg-app-subtle hover:text-app-fg`. Group labels `text-xs font-semibold text-app-fg-muted`. Item badges use `Badge`.
  - Bottom: Settings; "Super admin" (super admins only, `admin` tone); account row (`Avatar`, email, sign-out `IconButton`).
- **Mobile drawer** — panel slides in from the left (200ms); close `IconButton` sits outside the panel at top-right on the backdrop (`bg-app-overlay`).
- **Top bar** — sticky, 64px, `bg-app-surface border-b border-app-border`. Menu button (below `lg`), page `h1` (`text-lg` below `sm`, `text-xl` from `sm`) with the one-line description from `lg`. Actions: Copy link and View page as `secondary` buttons (icon-only below `sm`); Copy link also calls `notify` ("Link copied"). The primary color is left to the main action in each section.
- **Banners** — `Alert` (`admin` tone for demo editing, `success`/`danger` for publication, mapped tone for the Google outcome, business-type switch notices).
- **Content** — `max-w-7xl px-4 sm:px-6 lg:px-8 py-8` on `bg-app-canvas`.
- **Footer** — `text-sm text-app-fg-muted`, top border.
- **Save bar** (`components/provider/SaveBar.tsx`) — floating `bg-app-surface ring-1 ring-app-border shadow-lg rounded-xl`, warning dot, "Unsaved changes" and hint, primary Save with `loading`. Success becomes a "Changes saved" toast instead of the inline success alert; a save error stays as an inline danger `Alert` above the bar. No Discard.
- **Section placeholder** (`DashboardApp`) — `Skeleton` blocks shaped like a stat card group and a card.
- The super-admin accent constants (`components/app-shell/super-admin-accent.ts`) are replaced by the `admin` tone and deleted in PR 4.

### 5. Feedback rules

| Situation | Pattern |
|---|---|
| Transient success (saved, link copied, booking cancelled, service deleted, publication toggled, cleanup retried) | Toast |
| Persistent state (publishing off, demo editing, OAuth outcome, retention policy) | Banner or in-card `Alert` |
| Field validation | Inline `Field` error + `aria-invalid` |
| Destructive or irreversible action | `ConfirmDialog` with `tone="danger"` |
| Async action in flight | `Button loading`; related controls disabled |
| Any list | Distinct empty, loading and error states |

New strings (toast messages, confirm titles and bodies, a few labels) go into `components/provider/dashboard-copy.ts` in en and es; the language-purity tests cover them. Super-admin strings stay inline English.

### 6. Module seam

Extracted from `components/haab-booking-module.tsx` into presentational components that take computed data and callbacks; the module keeps all state and handlers.

| New component | Replaces | Notes |
|---|---|---|
| `components/provider/AdminCalendar.tsx` | `renderAdminCalendar` | month matrix, per-day bookings, open-day predicate and launch callback passed in |
| `components/provider/AppearanceSection.tsx` | `renderAppearance` | |
| `components/provider/CancelBookingDialog.tsx` | admin path of `renderCancellationModal` | `ConfirmDialog`; public path (`isDedicatedPublicPage`) keeps today's markup |
| `components/provider/RescheduleBookingDialog.tsx` | admin path of `renderRescheduleModal` | `Dialog size="lg"`; dates, slots, selection, pending and error passed in; public path unchanged |
| `components/provider/AppointmentScannerDialog.tsx` | `components/booking/AppointmentScanner.tsx` (moved) | admin-only (integrated mode, Bookings → Scan); scanning logic unchanged |
| `components/provider/setup/*` (PR 5) | `renderWelcome`, `renderSetupWizard` frame | wizard steps keep their existing field components |

The in-app booking flow launched from the dashboard calendar is the public flow and is out of scope; only its cancel confirmation uses `CancelBookingDialog`, because that modal is the non-public path. The calendar-QR modal belongs to the booking flow's success step and is unchanged.

`HaabBookingModule` wraps its admin UI in a pass-through `ToastProvider`, so embedded hosts (`chrome="module"`) get toasts without the shell.

### 7. Dashboard sections

Same data, routes and handlers.

- **Overview**
  - `StatGroup` card with four stats (upcoming 7 days, services, confirmed, total), 2×2 below `lg`, four across from `lg`. Upcoming links to Bookings, Services to Services.
  - "Upcoming 7 days" card with a `StackedList`: date block (weekday + day number), time, client name, type/status/campaign badges, service · capacity · total line; actions Reschedule (`secondary sm`, hidden for single-occurrence services as today) and Cancel (`plain`, danger text). "See all" in the card header.
  - Side column: **Booking page** card (status `Badge`, read-only URL `Input` with a copy `IconButton` addon that toasts, View page `ButtonLink external`) and **Next steps** card (only when something is missing): checklist rows with icon, title, body and a `soft` CTA.
- **Bookings**
  - One card. Header: Active/Archive `SegmentedControl` with counts, the archive hint as description, Scan appointment (`primary`, integrated mode only).
  - Filter row: search `Input` with a magnifier addon, Status, Type and Sort `Select`s; below it the live result count and Clear filters (`plain`, only when a filter is active).
  - The retention notice (`BookingRetentionNotice`) becomes an info `Alert` at the top of the card.
  - `StackedList` with sticky `StackedListHeading` per day (Today / Tomorrow / formatted date). Below `lg` a row stacks; from `lg` it lays out as columns: time · client + contact · service + details · badges · actions. One markup.
  - Cancelled rows are muted, show a Cancelled badge and **hide** their actions; the Archive view hides actions on every row (today they render disabled).
  - Cancel opens `CancelBookingDialog`.
  - Empty states (none yet, none active, none archived, no matches) use `EmptyState` with icons.
- **Calendar** (`AdminCalendar`)
  - Card toolbar: month `h2` (`aria-live="polite"`), ‹ Today › button group, "New booking for" `Select` on the right; legend and hint below.
  - Month grid: `grid grid-cols-7 gap-px bg-app-border` with `bg-app-surface` cells, `bg-app-subtle text-app-fg-muted` for days outside the month, today's number in an accent circle.
  - Open days: `bg-app-accent-soft` tint plus "Open" (from `sm`); click still launches the in-app booking flow. Other days are not interactive, as today.
  - Booking chips from `sm`: dot (accent for appointments, `full-day` for full day), time, truncated service; at most 3 then "+N more". Below `sm`: dots and "+N", text kept for screen readers.
- **Analytics** (`ProviderAnalyticsSurface`)
  - Data, gating and section order unchanged. Panels → `Card`, KPI tiles → `Stat`, campaign/referrer tables → `Table`, period pickers → `SegmentedControl`.
  - Charts (daily bars, funnel, popular-times heatmap) recolored to `chart-1`/`chart-2` and neutral `app-border` gridlines; existing text alternatives kept. Implementation follows the `dataviz` skill.
  - Premium teaser: `Card` with a primary upgrade CTA. Checkout result: `Alert`.
- **Services** (`ServiceEditor`)
  - Two columns from `lg`, editor sticky, as today; mobile "Add service" jump kept.
  - List card with a `StackedList`: name, type and duration badges, description clamped to two lines, a muted meta line; the row being edited gets `ring-2 ring-app-accent`. Edit (`secondary sm`) and Delete (`plain`, danger text).
  - **Delete opens a `ConfirmDialog`** (today it deletes immediately). The keep-one-service rule is unchanged.
  - Editor card: `Fieldset` groups — Basics · Type & duration · Capacity & price · Location & phone · Notes. Booking type and occurrence mode use `RadioCards`. Footer: Cancel/Reset (`secondary`) and Save (`primary`, `loading`). Read-only notice → neutral `Alert`.
- **Availability** (`AvailabilitySettingsSection`, `AvailabilityEditor`, `DailyBookingLimitField`)
  - Weekly hours card: a row per day with `Switch` + day name, start and end time `Input`s; a disabled day collapses to muted "Closed". Breaks: "Add break" (`soft sm`) and rows of two time inputs plus a trash `IconButton`.
  - Daily limit card: number `Input` `Field` with description.
  - Events vertical: scheduling card with a "Manage events" `ButtonLink`.
- **Appearance** (`AppearanceSection`) — `FormSection` stack:
  - Logo: `LogoImageUploader` restyled — `Avatar` preview, Upload/Remove buttons, dashed drop zone, upload progress and errors inline.
  - Page details: `ProviderAppearanceForm` fields (including `HeaderImageUploader` where it appears).
  - Theme: `ThemeSettingsSection` as `RadioCards` with swatch previews; swatches keep public theme colors because they depict the public page.
  - Client page language: `ClientLanguageField`.
- **Integrations** (`ProviderIntegrationsSection`, `GoogleCalendarCapabilities`)
  - Google Calendar card: header with icon, title and status `Badge` (connected / needs reauth / paused / disconnected); `DescriptionList` of connection details; capabilities list with check/x icons.
  - Connect is `primary`; **Disconnect opens a `ConfirmDialog`** (today it disconnects immediately). The existing "failed" state stays inline.
  - OAuth outcome stays a banner.
- **Settings** (`ProviderSettingsSurface`) — Tailwind Plus settings page of `FormSection`s:
  - Business profile: `ProviderInfoForm` and `TimeZoneField` on `Field`/`Input`/`Select`.
  - Booking link: URL-prefix `Input`, copy `IconButton`, custom slug editor with inline errors and its own Save URL (`loading`).
  - Booking history retention (`BookingRetentionSettings`): `Switch` with description; Premium `Badge` when gated.
  - Dashboard language (`DashboardLanguageField`).
  - Business type: current type plus Change, which opens `ChangeBusinessTypeDialog` rebuilt on `Dialog` (blocking bookings as a `StackedList`, replacement summary as a `DescriptionList`).
  - Danger zone (non-integrated mode only, as today): card with `ring-app-danger-ring`; Reset now opens a `ConfirmDialog` (today it resets immediately).
  - `/dashboard/business-type` (`BusinessTypeSwitch`, `VerticalPicker`): `RadioCards` and a step header in the wizard style; behavior unchanged.

### 8. Super admin

English only, on the restyled `AppShell`.

- **Overview** (`SuperAdminOverview`): `StatGroup` (registered accounts, publishing on, publishing off, pending cleanups) and a "Needs attention" `StackedList` linking to the filtered views.
- **Accounts** (`UserPublicationTable`)
  - Toolbar: search `Input`; All / Publishing on / Publishing off `SegmentedControl` with counts, still reflected in `?status=`.
  - `Table` from `lg` (account email + business name, business type, public URL, publishing `Badge`, actions); stacked cards below `lg`.
  - Toggle publication: `Button loading`, toast on success, inline error on failure. Disabling keeps its confirmation, moved from `window.confirm` to a danger `ConfirmDialog` with the same wording; enabling has none, as today.
  - **Feature overrides** (`ProviderFeatureOverrides`): the inline `<details>` panel is replaced by a "Features" `secondary sm` button that opens a `Dialog size="md"`. The dialog lists each feature with its state `Badge`; editing a feature shows the expiry date `Field`, the prerequisite warning, and Grant / Withhold / Clear override / Cancel exactly as today (same disabled rules, same resolver).
  - Delete: `ConfirmDialog` (danger) with the typed confirmation as children, replacing `DeleteAccountDialog`'s markup; server action unchanged.
- **Demo pages** (`DemoPagesPanel`): grid of `Card`s — name, type `Badge`, path, Edit (`primary`, starts demo editing), View ↗.
- **Cleanups** (`PendingDeletionCleanups`): `StackedList` rows with a status `Badge`, error text and Retry (`loading`, toast on success); `EmptyState` when none.

### 9. Setup wizard and guest builder

- **`SetupHeader`**: `bg-app-surface border-b` 64px bar — Haab mark, selected workflow label, "Choose another workflow" (`plain`), then account email + Sign out (signed in) or Publish (`primary`, guest). `LanguageToggle` where the header shows a language control today.
- **Welcome** (`renderWelcome` → `components/provider/setup/WelcomeStep.tsx`): flat `bg-app-canvas`, centered heading (`text-3xl sm:text-4xl font-semibold`) and body; `VerticalPicker` as a grid of clickable cards (icon, label, description); a click selects and starts, as today. Feature checklist line kept with `Badge`-style check icons. Decorative radial gradients removed.
- **Wizard** (`renderSetupWizard` frame → `components/provider/setup/SetupWizardFrame.tsx`): Tailwind Plus progress steps (numbered circles with connectors from `sm`, "Step 2 of 4" text below `sm`, `aria-current="step"`). Each step's content sits in a `Card` with `CardHeader` and a `CardFooter` holding Back (`secondary`) and Continue / Publish (`primary`, `loading`). Step contents reuse the restyled `ProviderInfoForm`, `ServiceEditor` and `AvailabilityEditor`.
- **Step 4 preview** stays public-styled inside a framed `Card`, because it shows what clients will see.
- **Guest draft notice** → info `Alert`.
- **`chrome="module"` header and pill tabs** (embedded and child hosts): restyled with `app-ui` — header row (business name, URL, View page, account) and `SegmentedControl`-style section tabs. Default stays `chrome="module"`, so the template seam keeps working.

### 10. Auth

`/login` (`AuthForm`), `/login/reset` (`PasswordResetRequestForm`), `/reset-password` (`NewPasswordForm`).

- Tailwind Plus "simple sign-in": `bg-app-canvas`, Haab mark and `h1` centered above a `max-w-md` `Card`; `Field`s with inline errors; a form-level error as a danger `Alert`; full-width primary submit with `loading` driven by the forms' existing `useActionState` `isPending`; secondary links (forgot password, sign in/sign up switch).
- `LoginHeader`: slim `bg-app-surface border-b` bar — mark and brand on the left; `LanguageToggle` (same `hrefFor` links that keep `next` and `mode`) and "Back to home" on the right. Its comment about mirroring the landing nav is updated: auth now belongs to the app look.
- Server actions, redirects and `next` handling unchanged.

### 11. Error handling and edge cases

- Dialog opened while another is open: the new one stacks in the top layer; closing returns focus to the opener.
- `showModal()` unsupported: not a concern for the supported browsers (Baseline since 2022); no polyfill.
- Toast while offline: toasts are local; save failures still render inline in the save bar.
- Long values (emails, URLs, business names) truncate with `title`, or `break-all` in `DescriptionList` values; no horizontal page scroll at 390px.
- Demo editing: banner and saves behave as today.
- Embedded hosts without the shell: pass-through `ToastProvider` inside the module; `chrome="module"` header restyled.
- Reduced motion: overlay transitions are disabled by the existing global rule.

## Testing

TDD for pure helpers and kit components; tests first. No new test dependencies.

- **Kit markup** (Vitest + `renderToStaticMarkup`):
  - `Button` variants and sizes; `loading` sets `aria-busy` and `disabled`. `ButtonLink external` sets `rel` and `target`. `IconButton` renders `aria-label` and `title`.
  - `Field` wires `id`, `aria-describedby` (description and error) and `aria-invalid` into `Input`, `Select`, `Textarea`, `Checkbox`, `Switch`.
  - `Dialog`: `aria-labelledby`/`aria-describedby` match the title/description ids; closed renders no children.
  - `ConfirmDialog`: `pending` disables both actions; `error` renders a danger alert.
  - `SegmentedControl`: `role="radiogroup"`, `role="radio"` buttons with `aria-checked` and roving `tabindex`. `RadioCards`: `role="radiogroup"` of native radios, `checked` on the selected one.
  - `Switch`: `role="switch"`. Toast region: `role="status"`, `aria-live="polite"`.
  - `LanguageToggle`: anchors with `hrefFor`, buttons without.
  - `Badge` and `Alert` tones map to the right token classes.
- **Pure helpers:** `bookingStatusBadgeTone`, `bookingTypeBadgeTone` (`lib/format`); `toastReducer` (add, max 3, dismiss, pause, resume, expire); `isBackdropClick`.
- **Extracted components:** `AdminCalendar`, `CancelBookingDialog`, `RescheduleBookingDialog`, `AppearanceSection` markup tests covering what the module rendered before (open-day buttons, chip text for screen readers, slot buttons, error alert).
- **Existing tests:** dashboard and admin tests that assert style classes switch to semantic assertions (roles, labels, text). Presence assertions move with the feature to the component that now renders it; none is deleted without a replacement. Public tests (`components/booking/__tests__`, `components/ui/__tests__`) must pass unchanged.
- **Lint gate:** `no-restricted-imports` bans `@/components/provider/adminGlass` and `@/components/ui/{ActionButton,ActionLink,buttonClasses,ToneBadge,EmptyState,SectionTitle,Alert}` in each migrated directory; directories are added PR by PR, ending with `components/provider/**`, `components/app-shell/**`, `components/super-admin/**`, `components/auth/**`, `app/dashboard/**`, `app/super-admin/**`, `app/login/**`, `app/reset-password/**`.
- **E2E** (Playwright, local Supabase on 553xx, `http://localhost:3100`): update existing specs where markup changed (native `<dialog>` keeps `role="dialog"`; save-bar region name kept). New specs: service delete confirmation; booking cancel confirmation from Bookings; "Changes saved" and "Link copied" toasts; super-admin Features dialog grant/clear; sign-in end to end; mobile drawer open/close on the restyled shell.
- **Public-flow guard:** PR 1 changes no public file (verified by the `git diff --stat` check below). Before PR 2 — the first PR that edits the module's shared modals — capture Playwright screenshot baselines from `main` of public booking steps 1–4 and the manage page at 390 and 1280; every PR compares locally (`toHaveScreenshot`), not CI-gated because font rendering differs between machines. Each PR description lists `git diff --stat main` for `components/booking`, `components/landing`, `components/ui` and `app/[verticalSegment]`, `app/public`.
- **Manual:** visual QA at 390 / 768 / 1280 / 1440 for every in-scope page with screenshots in the PR; keyboard pass; Lighthouse accessibility audit on Overview, Bookings, Services, Settings, super-admin Accounts and Login.
- **Gate:** `npm run ci` (typecheck, lint, coverage, build) green on every PR.

## Delivery

Five PRs, each on its own branch off `main`, merged in order, atomic Conventional Commits. This spec and the implementation plan are committed on the first branch.

1. **`feat/app-ui-foundation`** — tokens; `components/app-ui` kit and tests; `LanguageToggle`; toasts; `bookingStatusBadgeTone`/`bookingTypeBadgeTone`; shell restyle (sidebar, drawer, top bar, banners, footer, save bar, skeleton); lint rule for `components/app-shell/**` and the shell files it restyles.
2. **`feat/dashboard-operate-ui`** — public screenshot baselines (fixed browser clock), Overview, Bookings, Calendar (`AdminCalendar` extraction), Analytics, `CancelBookingDialog`, `RescheduleBookingDialog`, scanner moved to `components/provider/`.
3. **`feat/dashboard-setup-ui`** — Services (delete confirmation), Availability, Appearance (`AppearanceSection` extraction), Integrations (disconnect confirmation), Settings, business-type flow and dialog.
4. **`feat/super-admin-ui`** — the four super-admin pages, Features dialog, delete confirmation, `super-admin-accent.ts` removed.
5. **`feat/setup-auth-ui`** — welcome, wizard frame, `SetupHeader`, guest builder, `chrome="module"` header, auth pages; `adminGlass.ts` and the old `components/ui/Alert` deleted; lint rule covers the full scope.

## Non-goals

- No change to the public booking flow, the manage-booking page or the landing page.
- `components/ui` public primitives (`ActionButton`, `buttonClasses`, `ToneBadge`, `EmptyState`, `SectionTitle`, `LanguageSwitcher`, …) are not modified.
- No dark mode yet (tokens are ready for it).
- No new features. Behavior additions are limited to: new confirmations before service delete, Google disconnect and standalone setup reset (booking cancel and publication disable already confirm; they move to `ConfirmDialog`), toasts, hidden actions on cancelled and archived rows, and the super-admin Features dialog.
- No route, API, data, store or server-action changes.
- No new dependencies.
- No save-bar Discard, dropdown menus, tooltips, combobox or pagination.
