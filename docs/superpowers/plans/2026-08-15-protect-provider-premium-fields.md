# Protect Provider Premium Fields Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent authenticated provider owners from directly writing server-managed identity and premium fields while preserving ordinary profile persistence and service-role seeding.

**Architecture:** Keep existing provider ownership RLS unchanged and add column-level Postgres privileges as second authorization layer. Refactor authenticated provider persistence so insert and update payloads match those grants, then reload persisted database state so trigger-generated slug remains dashboard source of truth.

**Tech Stack:** Next.js 16.2, TypeScript, Vitest, Supabase CLI, PostgreSQL 17

**Spec:** `/Users/bersoriano/.codex/attachments/216a686f-8c7d-4b98-874c-bd4377ef800f/pasted-text.txt`

## Global Constraints

- Preserve existing provider RLS policies, authenticated client boundary, SELECT/DELETE behavior, and full `service_role` access.
- Do not add billing, Stripe, entitlement tables, checkout, Google Calendar, or trusted slug-change endpoint code.
- Do not commit changes.
- Create migration with `supabase migration new protect_provider_premium_fields`.

---

### Task 1: Provider persistence payload boundary

**Files:**
- Create: `lib/__tests__/provider-store.test.ts`
- Modify: `lib/supabase/provider-store.ts`

**Interfaces:**
- Consumes: `persistProviderStore({ supabase, ownerUserId, ownerEmail?, store })`
- Produces: insert payload containing `owner_user_id` plus editable columns; update payload containing editable columns only; returned database-reloaded `ModuleStore`

- [ ] Write insert regression test proving protected slug/tier columns are absent, editable fields persist, and returned store carries database-generated slug.
- [ ] Write update regression test proving ownership/slug/tier columns are absent, editable fields persist, and existing slug stays stable.
- [ ] Run `npm test -- lib/__tests__/provider-store.test.ts` and confirm failures identify current shared protected payload.
- [ ] Split shared editable payload from insert-only `owner_user_id` and omit protected fields.
- [ ] Re-run focused test and confirm pass.

### Task 2: Database column privileges

**Files:**
- Create: `supabase/migrations/<timestamp>_protect_provider_premium_fields.sql`

**Interfaces:**
- Consumes: existing provider table grants and unchanged ownership RLS policies
- Produces: explicit authenticated INSERT/UPDATE column privileges; unchanged service-role table privileges

- [ ] Create migration with Supabase CLI.
- [ ] Revoke authenticated table-level INSERT and UPDATE.
- [ ] Grant authenticated INSERT on allowed setup/profile columns including `owner_user_id`.
- [ ] Grant authenticated UPDATE on same editable columns excluding `owner_user_id`.
- [ ] If local Supabase runs, verify normal owner writes succeed, protected owner writes fail, and service-role premium write succeeds.

### Task 3: Security documentation and compatibility proof

**Files:**
- Modify: `docs/supabase-schema-catalog.md`
- Modify: `docs/url-management.md`
- Inspect: `scripts/seed-public-examples.mjs`

**Interfaces:**
- Produces: documented server-managed field boundary and future trusted entitlement-check requirement

- [ ] Document canonical `slug`, `custom_slug`, and `plan_tier` as server-managed.
- [ ] Document future custom-slug mutations through trusted entitlement-verified endpoint.
- [ ] Document `plan_tier` as transitional metadata, not final entitlement architecture.
- [ ] Confirm service-role demo seed still writes premium fields without authenticated-grant dependency.

### Task 4: Verification

**Files:**
- Review all changed files and migration ordering.

**Interfaces:**
- Produces: fresh command evidence and explicit report of any unavailable database checks

- [ ] Run focused provider persistence test.
- [ ] Run `npm test`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Run relevant local Supabase migration and privilege checks when environment supports them.
- [ ] Review `git diff` and report unexecuted checks without claiming success.
