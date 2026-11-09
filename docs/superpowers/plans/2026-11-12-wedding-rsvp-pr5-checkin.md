# Wedding RSVPs, PR 5: Door Check-in Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** At the door, staff scan a household's QR code (or find them by name), see who is coming and their table, and check people in. It works when the venue has no signal.

**Architecture:** `guest_attendance.checked_in_at` records arrival per person per event; the first time recorded wins. The Scan section of an invitation-only page becomes a door screen. When it opens for an event it downloads a door list (attending guests, tables, check-ins, and each invitation's token hash) and keeps it in the browser. A scanned invitation URL is hashed in the browser and matched against the list, so a scan needs no network. Check-ins are written to a local queue, applied to the local list at once, and sent when the connection allows; the server merges them first-wins, so two door phones never conflict.

**Spec:** sections 5.4 (QR), 6.4 (door), 10 (offline: door). Delivery step 5.

**Scope note:** spec section 10 also asks the guest list editor to queue offline edits. This PR does the door only; the editor stays read-only offline (PR 1 behaviour). Flagged to the owner.

## Global Constraints

- PR 1–4 constraints hold.
- A check-in time is accepted up to 5 minutes in the future (clock skew) and not before the invitation existed; anything else is refused.
- Undo of a check-in is online only (it would otherwise fight the first-wins merge).
- Check-in times are cleared with the answers, 30 days after the last event.
- The household's invitation shows a QR of its own link once it has answered.

## Review Focus

1. **Two phones check in the same guest offline, then sync.** Expect one `checked_in_at`, the earlier one, and no error on either phone.
2. **A scan of a QR from another page or a booking QR.** Expect "not an invitation for this page", no crash.
3. **A household that answered after the door list was downloaded.** Expect the next refresh to bring them in; a scan before that says to refresh when online.
4. **Storage blocked or full.** Expect the door to keep working in memory for the session, with a warning.
5. **Checking in someone who isn't attending that event.** Expect the server to ignore it, and the door not to offer it.

---

### Task 1: Schema, pure rules, browser storage

**Files:** `supabase/migrations/20261112120000_add_checkin.sql` (column; `purge_invitation_answers` recreated to clear check-ins too), `lib/door.ts` (+ test), `lib/door-store.ts` (+ test), `lib/invitations.ts` (`InvitationGuest.checkedIn?: Record<string, string>`), `lib/supabase/invitations.ts` (select it), `test/db/invitations.test.ts`.

**Interfaces:** `DoorGuest = { guestId; invitationId; invitationName; label; table: string | null; checkedInAt: string | null }`; `DoorList = { serviceId; serviceName; generatedAt; invitations: { invitationId; invitationName; tokenHash; guestIds: string[] }[]; guests: DoorGuest[] }`; `invitationTokenFromCode(code: string): string | null`; `findByTokenHash(list, hash)`; `searchDoor(list, query)`; `arrivals(list): { arrived; expected }`; `applyCheckins(list, entries)`; `mergeDoorList(server, queue)`.

### Task 2: Server and routes

**Files:** `lib/supabase/checkin.ts` (`getDoorList`, `recordCheckins`), `app/api/provider/checkin/route.ts` (GET `?event=&lang=`, POST `{ serviceId, entries: { guestId, at | null }[] }`) + test.

### Task 3: Door screen and the household's QR

**Files:** `components/provider/guests/DoorCheckIn.tsx`, `components/provider/QrCamera.tsx`, `guests-copy.ts`, `components/haab-booking-module.tsx` (`case "scan"` in invitation mode), `components/invitations/InvitationRsvp.tsx` (QR in the saved view).
