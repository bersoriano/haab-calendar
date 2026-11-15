# Wedding RSVPs, PR 3: RSVP Questions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The planner sets up questions in Settings (menu-style choices, plus built-in diet and shuttle), households answer them in their RSVP, and the dashboard counts each option per event and exports a CSV for the caterer.

**Architecture:** Question definitions live on the provider (`rsvp_questions` jsonb, public because the form needs them). Answers live on the guest (`invitation_guests.answers`) or the invitation (`invitations.answers`) as `{ questionId: optionId | text }`. Pure rules in `lib/rsvp-questions.ts` normalize definitions, clean answers, count and build the CSV. A SQL function clears answers 30 days after a page's last dated event, run by the existing retention worker.

**Spec:** `docs/superpowers/specs/2026-11-08-wedding-rsvp-design.md`, sections 6.1 (questions editor), 6.2 (export, menu counts), 11 (retention). Delivery step 3.

## Global Constraints

- PR 1 and PR 2 constraints hold.
- At most 10 questions per page and 12 options per choice question. Labels are up to 80 characters; text answers up to 200.
- Question kinds: `choice` (pick one option) and `text`. `per`: `guest` or `invitation`. `eventIds` empty means every event.
- Built-ins: `diet` (text, per guest) and `shuttle` (text, per invitation), with fixed ids and translated default labels. A planner turns them on or off; their label may be overridden.
- Answers to unknown questions, to an option that does not exist, or to a question the guest's events don't cover are dropped, never stored.
- Removing an option keeps existing answers' text in exports ("(removed)" suffix) and does not count them.
- Answers and per-guest data are cleared 30 days after the page's last single-date event, in the page's time zone (`private`/service-role function, called by the booking retention worker).
- The CSV is the same formula-safe format as the clients export (shared `lib/csv.ts`), and has no plan gating.

## Review Focus

1. **A choice answer whose option was later deleted.** Expect it not to be counted, and the export to show the old option id as "(removed)".
2. **A per-guest question limited to the reception, for a guest attending only the brunch.** Expect the question not to be asked and any stale answer dropped on save.
3. **A page with no dated events** (weekly events only). Expect the purge never to clear it.
4. **A hostile answer** (`=HYPERLINK(...)` as a diet note). Expect the CSV cell neutralized.
5. **Turning the diet question off after answers exist.** Expect answers kept in the database until purge, hidden from the form and counts, and present in the export only while the question exists.

---

### Task 1: Schema, types and pure rules

**Files:** Create `supabase/migrations/20261110120000_add_rsvp_questions.sql`, `lib/rsvp-questions.ts`, `lib/csv.ts`, tests `lib/__tests__/rsvp-questions.test.ts`; modify `lib/provider-clients.ts` (use `lib/csv.ts`), `lib/types.ts`, `lib/invitations.ts` (`InvitationGuest.answers`, `Invitation.answers`, `RsvpSubmission.guestAnswers`, `RsvpSubmission.answers`, `validateRsvpSubmission(input, invitation, questions?)`), the provider plumbing sites, `test/db/invitations.test.ts`.

**Interfaces (produces):**

```ts
export type RsvpQuestionOption = { id: string; label: string };
export type RsvpQuestion = { id: string; kind: "choice" | "text"; label: string; options: RsvpQuestionOption[]; per: "guest" | "invitation"; eventIds: string[] };
export const BUILT_IN_QUESTION_IDS: readonly ["diet", "shuttle"];
export function parseRsvpQuestions(value: unknown): RsvpQuestion[];
export function questionLabel(question: RsvpQuestion, lang: Lang): string;
export function appliesTo(question: RsvpQuestion, attendingEventIds: string[]): boolean;
export function cleanAnswers(raw: unknown, questions: RsvpQuestion[], per: "guest" | "invitation", attendingEventIds: string[]): Record<string, string>;
export function choiceCounts(invitations: Invitation[], questions: RsvpQuestion[], serviceId: string): Record<string, Record<string, number>>;
export function toGuestListCsv(input: { invitations: Invitation[]; questions: RsvpQuestion[]; serviceId: string; lang: Lang }): string;
// lib/csv.ts
export const UTF8_BOM: string;
export function csvCell(value: string): string;
```

- [ ] Failing tests for each Review Focus line and each constraint; DB tests (answers persist through the data layer; anon reads `rsvp_questions`; `purge_invitation_answers` clears a page whose last event was 31 days ago and leaves one 29 days ago and one with only weekly events); implement; run; commit `feat(invitations): add RSVP questions and their answers`.

### Task 2: The household answers

**Files:** Modify `components/invitations/InvitationRsvp.tsx` (per-guest questions under the guests for guests attending a covered event; per-invitation questions once), `components/invitations/invitation-copy.ts`, page props (`questions`). Test: extend `components/invitations/__tests__/invitation-rsvp.test.tsx`.

- [ ] Failing tests (a menu select per attending guest only; shuttle asked once; posted body carries `guestAnswers` aligned with guests and `answers`); implement; run; commit `feat(invitations): ask the page's questions in the RSVP`.

### Task 3: Settings, counts, editor and export

**Files:** Create `components/provider/guests/RsvpQuestionsSettings.tsx`, `app/api/provider/invitations/export/route.ts` (+ test); modify `components/provider/ProviderSettingsSurface.tsx`, `components/provider/guests/GuestListSurface.tsx` (counts per option under each event; "Download CSV" per event), `components/provider/guests/InvitationEditor.tsx` (answers editable), `guests-copy.ts`.

- [ ] Failing tests (counts under the event card; export route: 401, 400 for an unknown event, CSV with question columns and only attending guests; settings component adds a choice question and toggles diet); implement; run; commit `feat(dashboard): set up RSVP questions, count answers and export them`.

### Task 4: Retention, privacy and verification

- [ ] `lib/booking-retention/worker.ts` also calls `purge_invitation_answers` and reports `clearedInvitationAnswers`; its route test updated.
- [ ] Privacy notice (en/es): answers to the organizer's questions are deleted 30 days after the last event.
- [ ] Gate and browser walk; commit `feat(retention): clear RSVP answers a month after the event`.
