# Wedding RSVPs, PR 4: Seating Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The planner creates tables per event, seats attending people (a whole household in one click, then moves individuals), and publishes the seating; each guest then sees their table in their invitation.

**Architecture:** `seating_tables` belong to one event of one page. A guest's seat is `guest_attendance.table_id`, per person per event. A trigger keeps seats consistent: only attending people sit, and only at a table of that event; marking someone as not attending frees their seat. `providers.seating_published` gates what households see; it is read by the server only (admin client), so it needs no public grant. Seating is managed through its own API and panel, outside the provider store, so a settings save never overwrites it.

**Spec:** `docs/superpowers/specs/2026-11-08-wedding-rsvp-design.md`, sections 5.4 and 6.3. Delivery step 4.

## Global Constraints

- PR 1–3 constraints hold.
- Table names 1–60 characters; seat count optional, 1–100. At most 100 tables per event.
- Only attending guests can be seated; un-attending clears the seat in the database, not only in the UI.
- Households see tables only while `seating_published` is true; unpublishing hides them again.
- Over-capacity is a warning, never a refusal.

## Review Focus

1. **A seated guest who later says they won't come.** Expect the seat freed and the guest gone from the table view.
2. **Deleting a table with people at it.** Expect them back in "Not seated", not lost.
3. **Seating a household where one person doesn't attend that event.** Expect only the attending people seated.
4. **A table of the ceremony assigned to a reception attendance row.** Expect the database to refuse it.
5. **Unpublished seating.** Expect the public invitation payload to carry no table names at all.

---

### Task 1: Schema and pure rules

**Files:** `supabase/migrations/20261111120000_add_seating.sql`, `lib/seating.ts`, `lib/__tests__/seating.test.ts`, `lib/invitations.ts` (`InvitationGuest.tables?: Record<string, string>` service id → table id), `lib/supabase/invitations.ts` (select `table_id`), `test/db/invitations.test.ts`.

**Interfaces:** `SeatingTable = { id; serviceId; name; seatCount: number | null; position }`; `seatingFor(invitations, tables, serviceId): { tables: { table: SeatingTable; seated: SeatedGuest[]; over: boolean }[]; unseated: SeatedGuest[] }` where `SeatedGuest = { invitationId; invitationName; guestId; label }`; `toSeatingCsv({ invitations, tables, serviceId, lang }): string`.

- [ ] Failing unit and DB tests for each Review Focus line; migration; implement; commit `feat(seating): add tables and seats per event`.

### Task 2: Data layer and API

**Files:** `lib/supabase/seating.ts`; routes `app/api/provider/seating/route.ts` (GET `?event=` tables; POST create table), `app/api/provider/seating/tables/[tableId]/route.ts` (PATCH, DELETE), `app/api/provider/seating/assign/route.ts` (POST `{ serviceId, guestIds, tableId | null }`), `app/api/provider/seating/publish/route.ts` (POST `{ published }`), `app/api/provider/seating/export/route.ts` (GET `?event=&lang=`); tests beside them.

- [ ] Failing tests (assign refuses guests of another page; publish stamps `seating_published_at`; export lists tables in order then "Not seated"); implement; commit `feat(api): manage tables, seats and publishing`.

### Task 3: Seating panel and the household's table

**Files:** `components/provider/guests/SeatingPanel.tsx`, `GuestListSurface.tsx` (Guests | Seating switch), `guests-copy.ts`; `lib/supabase/invitations.ts` (`PublicInvitation.guests[].tables` names, only when published); `components/invitations/InvitationRsvp.tsx` (table per guest per event in the saved view).

- [ ] Failing tests (panel lists unseated attending guests, seats a household with one click, shows "9 of 8" over capacity; invitation shows "Ana · Mesa 7" only with tables present); implement; browser walk; commit `feat(seating): seat guests and show each their table`.
