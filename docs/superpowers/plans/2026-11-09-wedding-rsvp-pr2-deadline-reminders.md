# Wedding RSVPs, PR 2: Deadline and Reminders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A planner sets an RSVP deadline, sends each household its link by WhatsApp or email, and reminds the households that have not answered; after the deadline the link shows the answer read-only.

**Architecture:** One provider column (`rsvp_deadline`, a date in the page's time zone) plus `last_bulk_reminder_at` written only by the server. Pure helpers decide whether answers are open and build the message text and the `wa.me` link. Emails go through Resend like booking emails, with the planner as Reply-To. WhatsApp opens on the planner's own phone; the app only records that the household was contacted.

**Tech Stack:** as PR 1.

**Spec:** `docs/superpowers/specs/2026-11-08-wedding-rsvp-design.md`, sections 5.3, 6.1 and 6.2 (Share, Reminders).

## Global Constraints

- Everything from the PR 1 plan's constraints.
- The deadline is a date. Answers are open through the end of that date in the page's time zone (`provider.timezone`, falling back to UTC).
- After the deadline the server refuses a household's submit with 409 `"The RSVP deadline has passed. Contact the organizer to change your answer."`. The planner can always edit.
- Email: `RESEND_API_KEY` and `BOOKING_EMAIL_FROM`. Reply-To is the provider's email. Plain text, in the page's language.
- "Email everyone with no answer" sends only to invitations with no answer and an email address, at most once per 24 hours per page (`providers.last_bulk_reminder_at`, written with the admin client after the owner is verified). Over 100 recipients go in batches of 100.
- `wa.me` links use the phone's digits only; an empty phone gives `https://wa.me/?text=…` so the planner picks the contact.

## Review Focus

1. **A deadline of today.** Expect the form open all day in the page's zone and closed from midnight. Tested in Task 1.
2. **Email not configured** (no key or sender). Expect a 503 with a clear message and nothing marked contacted. Tested in Task 3.
3. **A bulk reminder twice in a day.** Expect a 429 that names when it is allowed again, and no emails sent. Tested in Task 3.
4. **A phone written with spaces, dashes, a plus sign or parentheses.** Expect the digits in the `wa.me` link. Tested in Task 1.
5. **A household opening its link after the deadline without having answered.** Expect "Answers closed on {date}" and the organizer's phone, with no form. Tested in Task 4.

---

### Task 1: Migration and pure helpers

**Files:** Create `supabase/migrations/20261109120000_add_rsvp_deadline.sql`, `lib/rsvp-deadline.ts`, `lib/invitation-messages.ts`, tests `lib/__tests__/rsvp-deadline.test.ts`, `lib/__tests__/invitation-messages.test.ts`; extend `test/db/invitations.test.ts`. Modify `lib/types.ts` (`ProviderInfo.rsvpDeadline?: string`), the PR 1 provider plumbing sites (store, provider-store save, both loaders, resolver, public providers route).

**Interfaces (produces):**
- `isRsvpOpen(deadline: string | undefined, timeZone: string | undefined, now?: Date): boolean`
- `parseRsvpDeadline(value: unknown): string | undefined` (a valid `YYYY-MM-DD` or undefined)
- `buildInvitationMessage(input: { lang: Lang; kind: "invite" | "reminder"; displayName: string; pageName: string; link: string; deadline?: string }): string`
- `buildInvitationEmail(input: same + { replyTo?: string }): { subject: string; text: string }`
- `whatsappUrl(phone: string, text: string): string`

- [ ] Steps: failing tests (deadline today open at 23:59 local and closed at 00:00 next day for `America/Mexico_City`; no deadline is open; message includes name, link, and the deadline formatted in the language; `whatsappUrl("+52 (777) 555-0101", "hola")` is `https://wa.me/527775550101?text=hola`; empty phone gives `https://wa.me/?text=…`), db test (owner can set `rsvp_deadline`; anon can read it from `public_providers`), implement, run, commit `feat(invitations): add an RSVP deadline and invitation messages`.

### Task 2: Deadline on the household's side

**Files:** Modify `lib/supabase/invitations.ts` (`submitPublicRsvp` refuses after the deadline), `components/invitations/InvitationRsvp.tsx` (props `deadline?: string`, `open: boolean`, `organizerPhone?: string`; closed states), `components/invitations/invitation-copy.ts`, `app/[verticalSegment]/[providerSlug]/i/[token]/page.tsx`, `components/invitations/InvitationOnlyPage.tsx` ("Please RSVP by {date}"). Tests: extend `components/invitations/__tests__/invitation-rsvp.test.tsx`, `test/db/invitations.test.ts`.

- [ ] Steps: failing tests (closed and answered: answers shown, no "Change my answer", contact line; closed and unanswered: closed message, no form; open with a deadline: "Please answer by …" line; db: submit after a past deadline throws status 409), implement, run, commit `feat(invitations): close answers after the RSVP deadline`.

### Task 3: Sending and reminding

**Files:** Create `lib/email/invitations.ts` (`sendInvitationEmails({ messages: { to: string; subject: string; text: string }[]; apiKey; from; replyTo; idempotencyKey; fetcher? }): Promise<number>`), `app/api/provider/invitations/[invitationId]/email/route.ts` (POST `{ kind }`), `app/api/provider/invitations/remind/route.ts` (POST), tests beside each. Modify `lib/supabase/invitations.ts` (`markContacted(supabase, providerId, ids: string[]): Promise<void>`).

- [ ] Steps: failing tests (email route: 503 when unconfigured and nothing marked; 400 when the invitation has no email; sends one message with Reply-To and marks contacted; remind route: 429 inside 24 hours with no fetch; sends only to unanswered invitations with an email; 0 recipients is 200 with `{ sent: 0 }` and does not start the 24-hour clock), implement, run, commit `feat(api): send invitations and reminders by email`.

### Task 4: Dashboard and settings

**Files:** Modify `components/provider/ProviderSettingsSurface.tsx` (deadline date input), `components/provider/guests/GuestListSurface.tsx` (deadline banner, WhatsApp and email actions per row, contacted date, "Not contacted" filter, "Email everyone with no answer" with a count and confirmation), `components/provider/guests/guests-copy.ts`. Tests: extend `components/provider/guests/__tests__/guest-list-surface.test.tsx`.

- [ ] Steps: failing tests (banner says the date and how many have not answered; the WhatsApp action's href is the `wa.me` link with the message; "Not contacted" filter; bulk button states the count of unanswered invitations with an email), implement, run, commit `feat(dashboard): share invitations and remind households`.

### Task 5: Privacy notice and verification

- [ ] Privacy notice (en/es): the business can send the invitation link by email through Haab Calendar, which uses the household's email address for that purpose only.
- [ ] Gate: typecheck, lint, unit, `test:db`, `git diff --check`, browser walk (deadline in the past closes a link; WhatsApp link opens with the message; email send with a fake Resend key is refused clearly).
- [ ] Commit `docs: say invitations can be sent by email`.
