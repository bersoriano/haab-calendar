# Landing Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Measure landing acquisition, section reach, calls to action, FAQs, video engagement, and scroll depth with PostHog's free plan.

**Architecture:** Load a named PostHog client only while the actual landing page is mounted. An event/property allowlist removes sensitive URLs and unapproved data. A landing-owned observer records meaningful section visibility and explicitly tagged interactions without changing navigation or booking analytics.

**Tech Stack:** Next.js 16.2.7, React 19, TypeScript, posthog-js, Vitest, Happy DOM.

**Spec:** The approved scope in this conversation: PostHog free plan; traffic sources and campaigns; section reach; CTA placement; FAQ/video engagement; English/Spanish and device comparisons; no autocapture, session replay, or sensitive fields.

## Global Constraints

- Work on codex/landing-analytics; no worktrees or changes to main.
- No tracking without configured project token/region and explicit production hostname allowlist.
- No tracking outside the landing page, including dashboards, setup, bookings, or embedded demos.
- Use cookieless mode, no person profiles, no autocapture, no replay, no surveys or feature flags.
- Section exposure is counted once per page load, after one continuous visible second, only while the tab is visible.
- Never send form contents, account identity, arbitrary element text, query strings, fragments, or private destination URLs.
- Existing provider analytics and visible navigation remain unchanged.

## Review Focus

- Missing configuration, local/preview hosts, DNT, and Global Privacy Control must cause no SDK initialization.
- Queries/referrers can contain tokens and personal data; emitted URLs must be sanitized.
- Tall sections, quick scrolls, hidden tabs, language changes, and Strict Mode must not inflate exposure counts.
- SDK loading failures and blocked analytics must leave landing controls functional.
- Navigation away, embedded demo interactions, FAQ defaults, and media seeks must not create false engagement.

### Task 1: Safe PostHog boundary

**Files:** Create `lib/analytics/landing-policy.ts`, `lib/analytics/landing-client.ts`, and `lib/analytics/__tests__/landing-policy.test.ts`; modify package manifests.

**Interfaces:** `getLandingAnalyticsConfig` validates host/token/region and privacy signals. `sanitizeLandingEvent` enforces the event/property boundary. `loadLandingCapture` returns a failure-safe capture function.

- [ ] Write failing tests for configuration gating, approved campaign attribution, event allowlisting, URL redaction, and privacy settings.
- [ ] Run focused tests and verify missing implementation fails.
- [ ] Add SDK and implement the boundary; read installed SDK types and current official documentation.
- [ ] Run focused tests and typecheck.
- [ ] Commit the tested boundary.

### Task 2: Landing interactions and exposure

**Files:** Create `lib/analytics/landing-browser.ts`, `components/landing/landing-analytics.tsx`, and `lib/analytics/__tests__/landing-browser.test.ts`; annotate existing landing components.

**Interfaces:** `observeLanding(root, capture)` returns cleanup. Data attributes identify approved sections/actions; capture receives only bounded metadata. The React bridge reads current language without resetting the visit.

- [ ] Write failing DOM tests for timed exposure, tall sections, hidden-tab resets, deduplication, nested click targets, FAQ defaults, video milestones/seeks, scroll thresholds, and cleanup.
- [ ] Run focused tests and verify expected failures.
- [ ] Implement observation and attach it only to `LandingPage`; annotate CTA/section/FAQ/video targets using stable IDs.
- [ ] Verify real landing markup, privacy filtering, and failure-safe loading with focused tests.
- [ ] Commit the integration.

### Task 3: Setup, disclosure, and verification

**Files:** Modify `.env.example`, `lib/legal/content.ts`, `README.md`; create `docs/operations/landing-analytics.md` and relevant disclosure tests.

**Interfaces:** Deployment uses `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`, and `NEXT_PUBLIC_POSTHOG_ALLOWED_HOSTS`. Operators enable cookieless collection in PostHog and create reports from documented event names.

- [ ] Document free-project setup, region/token configuration, cookieless project toggle, strict host allowlist, report recipes, QA, limitations, and disabling analytics.
- [ ] Update English/Spanish privacy disclosures and substantiate them against actual SDK behavior.
- [ ] Run focused tests, full unit suite, lint, typecheck, and production build; inspect browser behavior where local runtime permits.
- [ ] Review complete diff, repair material findings, commit, and report activation requirements separately from code completion.

## Execution record

- Task branch created. Its remote does not exist yet; attempted required pull, then successfully synchronized with origin/main. User's untracked video-demo directory is outside this change.
- Approved implementation proceeds inline under the user's instruction to start. No further design approval is needed for the scope above.
