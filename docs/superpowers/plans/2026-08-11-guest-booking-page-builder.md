# Guest Booking Page Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let anonymous visitors configure and preview a booking page, then require email-and-password authentication only when they publish.

**Architecture:** Reuse existing standalone `ModuleStore` localStorage mode as guest draft storage and existing provider/public surfaces as builder and preview. Add explicit guest/resume props around `HomeExperience` and `HaabBookingModule`; route Publish through signup-first auth, then migrate local draft through existing authenticated provider API. Keep public server routes unavailable until migration succeeds.

**Tech Stack:** Next.js 16.2.7 App Router, React 19.2, TypeScript, Supabase Auth, Vitest, Tailwind CSS 4.

## Global Constraints

- Work directly in current checkout.
- Run no git commands.
- Keep email-and-password authentication.
- Anonymous visitors must not reach authentication before Publish.
- Guest edits must survive navigation through localStorage.
- Header and hero Create controls must use identical start behavior.
- Preserve existing English and Spanish translation parity.
- Reuse existing UI tokens, public page, service editor, and availability editor.

---

### Task 1: Guest publish routing helpers

**Files:**
- Create: `lib/guest-builder.ts`
- Create: `lib/__tests__/guest-builder.test.ts`
- Modify: `app/page.tsx`

**Interfaces:**
- Produces: `isGuestDraftMeaningful(store: ModuleStore): boolean`
- Produces: `buildGuestPublishReturnPath(lang: Lang): string`
- Produces: `isGuestPublishResume(value?: string): boolean`

- [ ] Write failing unit tests proving blank stores are ignored, vertical/business/service drafts count as meaningful, return path carries `resumePublish=1` plus language, and only `"1"` enables resume.
- [ ] Run `npm test -- lib/__tests__/guest-builder.test.ts` and confirm failure.
- [ ] Implement pure helpers without browser access.
- [ ] Run focused test and confirm pass.
- [ ] Extend `app/page.tsx` search params with `resumePublish?: string` and pass parsed boolean into `HomeExperience`.

### Task 2: Signup-first account screen

**Files:**
- Modify: `components/auth/AuthForm.tsx`
- Modify: `app/login/page.tsx`
- Modify: `components/landing/translations.ts`
- Create: `components/auth/__tests__/auth-form.test.tsx`
- Modify: `components/landing/__tests__/translations.test.ts`

**Interfaces:**
- `AuthForm` gains `initialIntent?: "login" | "signup"`.
- `/login?mode=signup` renders signup as primary.
- Publish-resume copy reassures that local draft is retained.

- [ ] Write failing static-render tests for signup-primary and login-primary modes.
- [ ] Add translation assertions for publish-gate reassurance in English and Spanish.
- [ ] Run focused auth/translation tests and confirm failure.
- [ ] Replace equal submit buttons with one intent-owned primary submit and one secondary mode switch.
- [ ] Preserve `mode` across language links and select publish-specific page/panel copy when `next` contains `resumePublish=1`.
- [ ] Run focused tests and confirm pass.

### Task 3: Anonymous landing entry and draft resume

**Files:**
- Modify: `components/landing/landing-ui.tsx`
- Modify: `components/home-experience.tsx`
- Modify: `components/landing/__tests__/account-entry.test.tsx`

**Interfaces:**
- Landing actions gain `hasDraft?: boolean`.
- `HomeExperience` gains `resumeGuestPublish?: boolean`.
- Anonymous vertical selection opens app directly.
- Guest Publish navigation uses `/login?mode=signup&next=...resumePublish=1`.

- [ ] Write failing rendering tests proving saved drafts make Create resume the builder and returning-user Sign in stays separate.
- [ ] Run focused landing tests and confirm failure.
- [ ] Detect meaningful local draft after mount using `DEFAULT_STORAGE_KEY` and `normalizeStore`.
- [ ] Make generic Create resume a saved draft; new visitors still get business-type/name dialog.
- [ ] Make every anonymous vertical selection call `openApp` instead of `/login`.
- [ ] Add guest status bar with “saved in this browser” and Publish action.
- [ ] Run focused tests and confirm pass.

### Task 4: Four-step guest setup and real preview

**Files:**
- Modify: `lib/types.ts`
- Modify: `components/booking/i18n/translations.ts`
- Modify: `components/haab-booking-module.tsx`
- Modify: `components/booking/i18n/__tests__/translations.test.ts`

**Interfaces:**
- `SetupStep` becomes `1 | 2 | 3 | 4`.
- `HaabBookingModule` gains `isGuestDraft?: boolean`, `resumeGuestPublish?: boolean`, and `onRequestPublish?: (store: ModuleStore) => void`.
- Steps become Profile → Services → Availability → Preview.

- [ ] Write failing translation assertions for Services and Preview steps plus guest preview/publish copy.
- [ ] Run focused translation tests and confirm failure.
- [ ] Add step 2 using existing `ServiceEditor`; move availability to step 3 and completion to step 4.
- [ ] Validate provider on step 1, at least one service on step 2, availability windows on step 3.
- [ ] For guests, prepare only local preview state at step 3; do not call authenticated provider API.
- [ ] At step 4, show Preview and Create account to publish actions. Preview uses existing public surface from local store.
- [ ] Keep signed-in unfinished-provider behavior publishing through existing API.
- [ ] Run focused translation tests and TypeScript check.

### Task 5: Resume, migrate, and publish after authentication

**Files:**
- Modify: `components/home-experience.tsx`
- Modify: `components/haab-booking-module.tsx`
- Modify: `app/login/actions.ts`
- Modify: `app/auth/confirm/route.ts` only if return-path coverage exposes a gap
- Modify: `lib/__tests__/auth-i18n.test.ts`

**Interfaces:**
- Authenticated `resumeGuestPublish` triggers one guarded `publishSetup()` attempt after local hydration.
- Successful persistence replaces local draft with server-backed store and clears resume state through `router.replace("/")` plus refresh.

- [ ] Extend failing auth return-path tests for signup confirmation returning to `/?resumePublish=1&lang=...`.
- [ ] Run focused auth tests and confirm failure if behavior is missing.
- [ ] Guard automatic migration with a ref so React rerenders cannot duplicate writes.
- [ ] Keep guest data on validation, auth, network, or API failure and show Retry publishing.
- [ ] On success, call existing `onSetupPersisted`, remove resume query, and display normal completion state.
- [ ] Run focused tests and TypeScript check.

### Task 6: Verification and visual QA

**Files:**
- Modify only files required by failures found during verification.

- [ ] Run `npm test`.
- [ ] Run `npx tsc --noEmit`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Walk landing → Create → type/name → Profile → Services → Availability → Preview → Publish in local browser without signing up.
- [ ] Confirm header and hero Create behavior match.
- [ ] Confirm business-type cards never open login before Publish.
- [ ] Confirm Publish opens signup-first page with preserved-draft copy.
- [ ] Capture and inspect screenshots for landing entry, services step, preview, and publish gate.
- [ ] Check desktop and mobile layouts, keyboard focus, visible errors, and no console errors.

