# Setup, Guest Builder and Auth UI (PR 5 of 5) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the last signed-in surfaces onto the `app-ui` kit: the welcome step, the setup wizard frame, `SetupHeader` and the guest-builder bars, the module's own `chrome="module"` header and tabs, and the three auth pages. Then delete `adminGlass.ts`, widen the lint and token gates to whole directories, and remove the unreachable admin branches from the public modal JSX.

**Architecture:**
- `renderWelcome` moves out to `components/provider/setup/WelcomeStep.tsx`.
- The frame of `renderSetupWizard` (progress steps, step card, Back/Continue footer) moves to `components/provider/setup/SetupWizardFrame.tsx`. The module keeps the step contents and every handler, and passes them in as props and children.
- The module header becomes `components/provider/ModuleHeader.tsx`, a presentational component.
- Auth pages share a new `components/auth/AuthPageFrame.tsx`: a canvas, the brand mark, an `h1` and optional body, and a `max-w-md` card.
- The forms keep their server actions and `useActionState`. Only the markup changes, with `isPending` driving `Button loading`.

**Tech Stack:** Next.js 16, React 19, Tailwind 4.2, Vitest (node, `renderToStaticMarkup`), Playwright.

**Spec:** `docs/superpowers/specs/2026-10-09-dashboard-tailwind-ui-design.md` (§9 Setup wizard and guest builder, §10 Auth, Testing → lint gate, Delivery item 5).

## Global Constraints

- No new dependencies. No route, API, data, store or server-action changes. Redirects and `next` handling stay unchanged.
- Migrated files use only kit components and `app-*` tokens. The gates end with these whole directories:
  - `components/provider/**`
  - `components/app-shell/**`
  - `components/super-admin/**`
  - `components/auth/**`
  - `app/dashboard/**`
  - `app/super-admin/**`
  - `app/login/**`
  - `app/reset-password/**`
- The token test covers the same set. Copy-only `.ts` files are covered too: they contain no classes.
- Public rendering is unchanged, and the public screenshot guard still matches `main`. The landing page itself is not restyled.
- New strings come in English and Spanish, from the copy module the surface already uses: `translations` for auth and setup, `dashboardCopy` for the module.
- Targets are 44px below `sm`, with focus rings everywhere.

## Review Focus

1. **The wizard behaves as before:**
   - Back is hidden once the setup is published.
   - Continue shows saving and stays disabled while saving.
   - Step 3's label is the publish label.
   - Step 4's guest, retry and signed-in branches are kept.
   - The setup error still shows.
2. **Auth forms:**
   - Pending disables submit and shows progress.
   - The sign-up toggle and Forgot password still work.
   - Messages from `?message=` and from the action both show, with the right tone.
   - The language links keep `next` and `mode`.
3. **The `chrome="module"` header** (embedded hosts) still offers copy link, view page, account and sign out, and every section tab. The shell path is untouched.
4. **The welcome step:** clicking a business type selects it and starts setup, as today.
5. **At 390px** the wizard, welcome step and auth card have no horizontal overflow.

## Tasks

Each task follows the same steps:
- **RED:** a component test, plus the gate entry for the file.
- **GREEN:** the markup on the kit, keeping every existing content and behavior assertion.
- Then lint and commit.

1. **Auth frame and header:**
   - `AuthPageFrame`.
   - `LoginHeader`: an app bar with the mark, `LanguageToggle` (links built by `hrefFor`) and Back to home. Update its comment.
2. **Auth forms:** `AuthForm`, `PasswordResetRequestForm`, `NewPasswordForm`.
   - `Field` and `Input` for each control.
   - The form message is an `Alert` (success or danger) in a live region.
   - Submit is a full-width primary `Button loading={isPending}`, with secondary links below it.
3. **Auth pages:** `/login`, `/login/reset`, `/reset-password` on `AuthPageFrame`.
   - The `?message=` notice becomes an `Alert`.
   - The draft-safe note becomes an info `Alert`.
4. **SetupHeader and the guest bars:**
   - `SetupHeader` becomes a `bg-app-surface border-b` bar.
   - `GuestDraftBar` becomes an info `Alert`-style band with a primary Publish button.
   - `AccountStatusBar` uses tone tokens and the admin `ButtonLink`.
5. **WelcomeStep:** extracted. It has a centered heading and body, `VerticalPicker`, and a feature checklist with check icons. The decorative gradients are dropped.
6. **SetupWizardFrame:** extracted.
   - Numbered progress steps with connectors from `sm`, "Step N of 4" below `sm`, and `aria-current="step"`.
   - A `Card` for each step with `CardHeader` and a `CardFooter` holding Back and Continue.
   - Step 3's length select becomes `Field` + `Select`. Step 4's summary uses `DescriptionList` and `Badge`s.
   - The guest notice becomes an info `Alert`; the setup error becomes a danger `Alert`.
7. **ModuleHeader:** the `chrome="module"` header and its section tabs as `SegmentedControl`-style links or buttons (ARIA tab pattern not needed; buttons with `aria-current`). Also restyle the "Back to workspace" buttons.
8. **Clean-up and gates:**
   - Delete `adminGlass.ts`.
   - Make `ConfirmDialog`'s `closeLabel` required: its default copied the cancel label, so the corner button and Cancel shared a name. `BusinessTypeSwitch`, the last caller that duplicated it, now passes `closeDialog`.
   - Remove the admin-only arms of the public modal JSX that `!isDedicatedPublicPage` now short-circuits.
   - Switch the lint and token lists to the whole-directory set.
9. **E2E and verification:**
   - A sign-in e2e: wrong password shows an error, the right one lands on the dashboard.
   - An e2e that walks the welcome step and wizard as a guest at 390px.
   - Then `npm run ci`, a fresh-seed full e2e, the public visual guard, visual QA at 390 and 1280, and a review. Then the fix pass, PR, CI and merge.
