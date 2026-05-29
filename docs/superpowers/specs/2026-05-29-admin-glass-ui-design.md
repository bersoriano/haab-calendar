# Admin UI Glass Reskin — Design

**Date:** 2026-05-29
**Scope:** The non-public (provider/admin) surfaces of `components/haab-booking-module.tsx` plus the `/` dev-overview header in `app/page.tsx`, and the global page background in `app/globals.css`.
**Type:** Presentational reskin only. **No layout, structure, or logic changes.** Bring the admin surfaces onto the same "liquid glass" visual language the public booking flow already uses, and remove the cropped-looking page gradient.

## Goal

The public booking flow (`isDedicatedPublicPage` branches) uses a translucent glass material — `backdrop-blur`, white-inset rings, soft deep shadows, large radii, `surface-soft` inner fills. The admin surfaces use a flatter fallback (`bg-white` + thin `--line` borders). Close that gap so admin reads as the same product, without changing any layout or behavior. Also remove the global decorative gradient/blobs that look cropped, giving admin a clean flat backdrop.

## Non-Goals

- No layout/structure changes (same grids, same DOM, same component tree).
- No logic/state/handler changes.
- No new features.
- No mobile *layout* rework (glass tokens still render on mobile; responsive layout fixes are a separate effort).
- **The public surface is untouched** — the existing `isDedicatedPublicPage` branches and the public page's own photographic background stay exactly as-is.
- Not porting the public photographic backdrop to admin — admin gets a flat background per the explicit instruction.

## Visual Reference (the target = existing public glass tokens)

The admin tokens copy values from the public `isDedicatedPublicPage` branch so they match exactly:
- panel: `rounded-[34px] bg-[rgba(248,249,250,0.94)] ring-1 ring-[rgba(255,255,255,0.68)] shadow-[0_28px_64px_rgba(25,28,29,0.08)]`
- elevated: `rounded-[32px] bg-[rgba(255,255,255,0.92)] ring-1 ring-[rgba(255,255,255,0.84)] shadow-[0_24px_58px_rgba(25,28,29,0.09)]`
- soft: `rounded-[32px] bg-[rgba(243,244,245,0.94)] ring-1 ring-[rgba(255,255,255,0.58)] shadow-[0_18px_46px_rgba(25,28,29,0.06)]`
- inset: `rounded-[28px] bg-[rgba(255,255,255,0.88)] ring-1 ring-[rgba(193,198,214,0.18)] shadow-[inset_0_1px_0_rgba(255,255,255,0.88)]`
- bar/strip: `border border-[rgba(255,255,255,0.58)] bg-[rgba(255,255,255,0.5)] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_22px_48px_rgba(25,28,29,0.08)] backdrop-blur-[20px]`
- field: `rounded-[24px] border border-white bg-[rgba(243,244,245,0.96)] px-4 pb-3 pt-4 shadow-[0px_4px_10px_3px_#89a6c036] focus:bg-[rgba(255,255,255,0.98)] focus:ring-2 focus:ring-[rgba(26,115,232,0.2)]`
- quiet choice / selected choice (for calendar cells, list rows): mirror `publicQuietChoiceClass` / `publicSelectedChoiceClass`.

## Design

### A. Admin glass token constants
Define a set of admin glass class constants inside `HaabBookingModule`, beside the existing `public*` consts, mirroring the values above:
`adminPanelClass`, `adminElevatedClass`, `adminSoftClass`, `adminInsetClass`, `adminBarClass`, `adminFieldClass`, `adminTabActiveClass`, `adminTabInactiveClass`, `adminChoiceQuietClass`, `adminChoiceSelectedClass`.

For buttons, apply the public pill treatment to admin `ActionButton`s where it matches: rounded-full pill (`min-h-12 rounded-full px-6`) and the glass-ghost styling for ghost-tone buttons (mirror `publicGhostButtonClass`).

These are plain string consts (or a tiny local map). They are not gated by `isDedicatedPublicPage` — they always render glass, and are only used in admin code paths.

### B. Application map (flat → glass), per surface
Replace the flat `bg-white` / `border border-[var(--line)]` / `bg-[var(--surface-soft)]` patterns with the matching admin token. No element is added, removed, or repositioned.

- **Dev overview** (`app/page.tsx`): intro card, the 4 screen-overview cards, the User-Flow column, flow cards, reusability-notes card → `adminPanelClass` / `adminInsetClass`. (This file imports nothing from the module; define equivalent class strings locally or via a shared module — see § D.)
- **Admin shell** (module final return): the surface toggle (`Provider workspace` / `Public booking flow`), the Public-URL card, the tab nav pills, the header block → glass bar / pills / elevated.
- **Dashboard** (`renderDashboard`): 4 stat cards → `adminInsetClass`; "Upcoming bookings" panel → `adminPanelClass`; "Public booking page / Share" panel → `adminElevatedClass`; inner "Quick testing"/empty cards → `adminInsetClass`.
- **Bookings** (`renderBookingsList`): filter/search strip → `adminBarClass`; search input + status/type selects → `adminFieldClass`; each booking row/card → `adminInsetClass` (selected/active states via choice tokens).
- **Calendar** (`renderAdminCalendar`): month-nav strip → `adminBarClass`; day cells → `adminChoiceQuietClass` / `adminChoiceSelectedClass` (same tokens the public calendar uses); QR card → `adminInsetClass`.
- **Services** (`renderServices`): service cards → `adminInsetClass`; the service editor form container → `adminPanelClass`; all inputs/selects/textarea → `adminFieldClass`.
- **Settings** (`renderSettings`): section containers → `adminPanelClass`; all fields → `adminFieldClass`.
- **Setup Wizard** (`renderSetupWizard`): step container → `adminPanelClass`; option/template cards → `adminInsetClass` / choice tokens; inputs → `adminFieldClass`; the wizard's gradient intro card (line ~1410) → glass panel.

### C. Background (remove cropped gradient) — `app/globals.css`
- `html`: replace the multi-layer gradient (the two `radial-gradient`s + linear, lines 40–43) with a flat `background: var(--background);`.
- Delete the `body::before` and `body::after` blob rules (lines 54–80) and their now-unused effect.
- Keep `body { background: transparent; isolation: isolate; }` so the flat `html` surface shows through.
- **Public page unaffected:** `app/public/[slug]/page.tsx` paints its own `bkg2.jpg` + gradient inside its `<main>`, layered above the body; it does not depend on the global gradient.

### D. Where the tokens live
Primary: define the admin token consts inside `HaabBookingModule`. The dev overview in `app/page.tsx` is a separate file — duplicate the handful of class strings it needs there (it only needs panel + inset). Optional future cleanup (not in this scope): hoist all glass tokens (public + admin) into one shared module (`lib/glass.ts` or `components/ui/glass.ts`) consumed by both; flagged in `docs/refactor-todos.md` territory, not done here.

## Risks / Mitigations
- **Public regression:** none expected — public branches untouched. Verify the public flow looks identical at desktop + mobile after the change.
- **Background removal affecting other routes:** the manage route and `/` lose the gradient (intended). Confirm no route relied on it for legibility.
- **Contrast:** glass panels on a flat `--background` must keep text contrast (WCAG AA). The public surface already proves these tokens are legible; admin uses the same values.
- **Readability of dense admin tables/rows under glass:** booking rows use `adminInsetClass` (near-opaque white) so text stays crisp.

## Verification
- `npm run build`, `npm run lint`, `npm run test` (118) all green.
- Visual smoke at desktop (1280px) of every admin surface: dev overview, shell/tabs, Dashboard, Bookings (with a booking present), Calendar, Services (+ editor open), Settings, Setup Wizard (from empty store).
- Confirm the cropped gradient is gone and the backdrop is a clean flat surface.
- Confirm the public flow is visually unchanged at 1280px and 390px.
- Quick mobile glance at admin to ensure glass tokens render without breakage (layout fixes out of scope).
