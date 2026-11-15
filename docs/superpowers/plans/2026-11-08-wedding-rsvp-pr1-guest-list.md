# Wedding RSVPs, PR 1: Guest List and One RSVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A planner can switch an events page to invitation-only RSVPs, build a guest list with seat limits, share a personal link per household, and collect one RSVP per household covering every event it is invited to, including declines.

**Architecture:** Four new tables (`invitations`, `invitation_events`, `invitation_guests`, `guest_attendance`) under owner-only RLS, plus two provider columns. Owner reads and writes go through `/api/provider/invitations*` with the signed-in Supabase client. Guests reach their invitation through `/api/public/[v]/[p]/invitations/[token]` with the admin client, looked up by token hash. Pure rules (response state, totals, paste parsing, submission validation) live in `lib/invitations.ts`. The public page and the dashboard branch on `provider.rsvpMode`.

**Tech Stack:** Next.js App Router (repo version; read `node_modules/next/dist/docs/` before routes), Supabase Postgres with RLS, TypeScript, Tailwind app-ui kit, Vitest (unit and `test:db`), Playwright.

**Spec:** `docs/superpowers/specs/2026-11-08-wedding-rsvp-design.md`. PR 1 is delivery step 1.

## Global Constraints

- Open-mode providers (every existing page) behave exactly as before.
- Every user-facing string exists in `en` and `es`.
- New `providers` columns are granted column by column: anon `select` for what public pages read, authenticated `insert`/`update` for what settings saves.
- The migration is additive. It must be pushed to hosted before this PR merges.
- Wedding words come from the word set, never from conditionals in shared components.
- Nav changes are recorded in `e2e/nav-widths.spec.ts`, asserting what is on screen at both widths.
- Seat limit per invitation: 1 to 20. Default seats per new invitation: 2.
- Invitation tokens: 32 bytes from `crypto.randomBytes`, base64url (43 chars). Stored as `token` (owner-readable) and `token_hash` (sha256 hex, unique). Public lookup is by hash only.
- RSVPs are not bookings: no `bookings` rows, no analytics events, no Clients rows, no outbox events.
- Lint, typecheck, unit, `test:db`, `git diff --check` all pass.

## Review Focus

1. **A submission naming more guests than the seat limit, or an event the invitation is not invited to.** Expect a 400 and nothing saved. Tested in Task 4 (pure) and Task 5 (database trigger).
2. **Lowering the seat limit below the guests already named.** Expect the API to refuse with a message naming the conflict, not a silent truncation. Tested in Task 5.
3. **A deleted or edited event while invitations point at it.** Expect its attendance rows to cascade away and totals to drop it, not a 500. Tested in Task 5 (cascade) and Task 4 (totals ignore unknown service ids).
4. **An unknown, malformed or regenerated token.** Expect the plain "not valid" page and a 404 from the API, identical for every case. Tested in Task 7.
5. **Paste import with a header row in Spanish, blank lines, tabs or commas, and a seats column with junk.** Expect rows detected, blanks skipped, junk seats reported per row. Tested in Task 4.

---

### Task 1: Migration, invitation tables and provider columns

**Files:**
- Create: `supabase/migrations/20261108120000_add_invitation_rsvps.sql`
- Create: `test/db/invitations.test.ts`

**Interfaces:**
- Produces: `providers.rsvp_mode text not null default 'open'` (`'open' | 'invitations'`), `providers.default_invitation_seats integer not null default 2` (1–20), `providers.vocabulary` accepts `'weddings'`; `public_providers.rsvp_mode` (last column); tables below.

Tables (all `on delete cascade` upward):
- `invitations(id uuid pk, provider_id uuid → providers, display_name text 1–120, contact_phone text default '' ≤40, contact_email text default '' ≤254, seat_limit int 1–20, token text unique, token_hash text unique (64 hex), notes text default '' ≤1000, submitted_at timestamptz null, last_contacted_at timestamptz null, created_at, updated_at)`
- `invitation_events(invitation_id → invitations, service_id → services, primary key both)`
- `invitation_guests(id uuid pk, invitation_id → invitations, position int ≥0, name text default '' ≤120, created_at, updated_at)`
- `guest_attendance(guest_id → invitation_guests, service_id → services, attending boolean not null, primary key both)`

Triggers (security invoker, `set search_path = ''`):
- `invitation_events` and `guest_attendance`: the service's `provider_id` equals the invitation's (`errcode 23514`, message `service_not_on_this_page`).
- `guest_attendance`: the service is one the guest's invitation is invited to (`service_not_invited`).
- `invitation_guests` insert: guest count after insert ≤ `seat_limit` (`seat_limit_exceeded`).
- `invitations` update of `seat_limit`: new limit ≥ current guest count (`seat_limit_below_guests`).
- `set_updated_at` on `invitations` and `invitation_guests`.

RLS: enabled on all four; `revoke all … from public, anon, authenticated`; `grant select, insert, update, delete … to authenticated, service_role`; one policy per command for authenticated using `private.provider_owner(provider_id)` (child tables join up to the invitation).

Also recreate `public.public_providers` (append `p.rsvp_mode`) and `public.switch_provider_business_type` from `20261103190000`, adding `rsvp_mode = case when p_vertical = 'events' then rsvp_mode else 'open' end`.

- [ ] **Step 1: Write the failing db tests** in `test/db/invitations.test.ts`:
  - `it("keeps a stranger out of another owner's guest list")`: owner B selecting A's invitations gets `[]`; insert into A's provider fails.
  - `it("refuses more guests than the seat limit")`: seat_limit 2, third guest insert errors with `seat_limit_exceeded`.
  - `it("refuses a seat limit below the named guests")`: 3 guests, update to 2 errors with `seat_limit_below_guests`.
  - `it("refuses an event from another page")`: `invitation_events` insert with a foreign service errors with `service_not_on_this_page`.
  - `it("refuses attendance for an event the invitation is not invited to")`.
  - `it("drops attendance when the event is deleted")`: delete the service, attendance and invitation_events rows are gone, invitation stays.
  - `it("accepts the weddings word set and rejects unknown modes")`: `vocabulary: 'weddings'` ok, `rsvp_mode: 'secret'` fails.
  - `it("resets the mode when switching away from events")`.
- [ ] **Step 2: Run** `npm run test:db -- test/db/invitations.test.ts` against the scratch stack. Expected: FAIL (relation does not exist).
- [ ] **Step 3: Write the migration.**
- [ ] **Step 4: Apply** with `supabase migration up --workdir <scratch>`, rerun. Expected: PASS. Also `supabase db lint --local --workdir <scratch>` is clean.
- [ ] **Step 5: Commit** `feat(db): add invitation-only RSVP tables and provider mode`.

### Task 2: Provider plumbing for the mode, the seats default and the word set

**Files:**
- Modify: `lib/types.ts` (`Vocabulary = "tours" | "weddings"`, `RsvpMode = "open" | "invitations"`, `ProviderInfo.rsvpMode?: RsvpMode`, `ProviderInfo.defaultInvitationSeats?: number`, `AdminTab` gains `"guests"`)
- Modify: `lib/vertical-copy.ts` (add `parseVocabulary(value: unknown): Vocabulary | undefined`)
- Create: `lib/rsvp-mode.ts` (`parseRsvpMode(value: unknown): RsvpMode`, `clampInvitationSeats(value: unknown, fallback = 2): number`, `INVITATION_SEAT_LIMIT_MAX = 20`, `isInvitationMode(provider: Pick<ProviderInfo, "rsvpMode">, vertical?: VerticalId): boolean`)
- Modify: `lib/store.ts:315`, `lib/supabase/provider-store.ts:235`, `lib/supabase/bookings.ts:46,81,291`, `lib/public-booking-resolver.ts:39,65,232`, `app/api/public/providers/[slug]/route.ts:41,132`, `e2e/global.setup.ts`, `e2e/fixtures/providers.ts`
- Test: `lib/__tests__/rsvp-mode.test.ts`, extend `lib/__tests__/vertical-copy.test.ts`

**Interfaces:**
- Produces: `parseVocabulary`, `parseRsvpMode`, `clampInvitationSeats`, `isInvitationMode` (true only when vertical is `events` and mode is `invitations`).

- [ ] **Step 1: Failing tests:** `parseRsvpMode("invitations") === "invitations"`, `parseRsvpMode("x") === "open"`; `clampInvitationSeats("4") === 4`, `clampInvitationSeats(0) === 2`, `clampInvitationSeats(99) === 20`; `isInvitationMode({ rsvpMode: "invitations" }, "healthcare") === false`; `parseVocabulary("weddings") === "weddings"`, `parseVocabulary("pirates") === undefined`.
- [ ] **Step 2: Run** `npx vitest run lib/__tests__/rsvp-mode.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the helpers and replace the six `=== "tours" ? "tours" : undefined` sites with `parseVocabulary`. Save `rsvp_mode` (`'open'` unless vertical is events) and `default_invitation_seats` in `provider-store.ts`; select and map them in both loaders, the resolver and the public providers route.
- [ ] **Step 4: Run** `npx vitest run && npm run typecheck`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(provider): carry the RSVP mode and seat default through the store`.

### Task 3: Wedding word set and free events without a price

**Files:**
- Modify: `lib/vertical-copy.ts` (add `weddingsCopy`, `weddingsCopyEs`, `WEDDINGS` table, branch in `getVerticalCopy`)
- Modify: `components/booking/i18n/translations.ts` (`vocabularyWeddings`: en "Wedding: guests, RSVPs", es "Boda: invitados, confirmaciones")
- Modify: `components/provider/ProviderSettingsSurface.tsx` (third option)
- Modify: `lib/format.ts` (add `isFreeCost(cost?: string): boolean`)
- Modify: places that render the price label for a service: `components/booking/ServiceCard.tsx`, `components/booking/AppointmentSummary.tsx`, `components/booking/BookingPass.tsx` (hide the price row when `isFreeCost`)
- Test: `lib/__tests__/vertical-copy.test.ts`, `lib/__tests__/format.test.ts`, `components/booking/__tests__/service-card.test.tsx`

Nouns: en service/event, Service/Event, booking/RSVP, Booking/RSVP, bookings/RSVPs, client/guest, clients/guests, bookVerb "RSVP"; es evento, Evento, confirmación, Confirmación, confirmaciones, invitado, invitados, bookVerb "Confirmar asistencia". Phrases follow `toursCopy`, replacing traveler and departure wording with guest and event wording; cancellation wording becomes "change of plans" / "cambio de planes", hotel pickup becomes "Shuttle from your hotel" / "Transporte desde su hotel".

`isFreeCost` is true for empty, `0`, `$0`, `0.00`, `free`, `gratis`, `sin costo`, `no cost`, case and whitespace insensitive, with an optional currency prefix (`US$`, `$`, `€`, `MX$`).

- [ ] **Step 1: Failing tests:** `getVerticalCopy("events", "es", "weddings").Clients === "Invitados"`; `getVerticalCopy("healthcare", "en", "weddings")` equals the healthcare copy; `isFreeCost("Sin costo")`, `isFreeCost(" US$0 ")`, `!isFreeCost("$95")`; a ServiceCard with cost "Sin costo" renders no price text.
- [ ] **Step 2: Run** them. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npx vitest run`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(events): add a wedding word set and hide the price of free events`.

### Task 4: Pure invitation rules

**Files:**
- Create: `lib/invitations.ts`
- Test: `lib/__tests__/invitations.test.ts`

**Interfaces (produces):**

```ts
export type InvitationGuest = { id: string; name: string; position: number; attending: Record<string, boolean> };
export type Invitation = {
  id: string; displayName: string; contactPhone: string; contactEmail: string;
  seatLimit: number; token: string; notes: string; eventIds: string[];
  guests: InvitationGuest[]; submittedAt: string | null; lastContactedAt: string | null;
  createdAt: string; updatedAt: string;
};
export type ResponseState = "no_answer" | "attending" | "declined";
export function responseState(invitation: Invitation, serviceId: string): ResponseState | null; // null: not invited
export type EventTotals = { serviceId: string; attendingPeople: number; attendingInvitations: number; declinedInvitations: number; noAnswerInvitations: number; invitedInvitations: number };
export function totalsByEvent(invitations: Invitation[], serviceIds: string[]): EventTotals[];
export function overallState(invitation: Invitation): ResponseState | "partial"; // across invited events
export function guestLabel(guest: Pick<InvitationGuest, "name">, index: number, guests: Pick<InvitationGuest, "name">[], lang: Lang): string; // "Guest of Ana" / "Acompañante de Ana", or "Guest 2" when nobody is named
export type PastedRow = { displayName: string; contactPhone: string; contactEmail: string; seatLimit: number };
export type PasteResult = { rows: PastedRow[]; errors: { line: number; reason: "missing_name" | "bad_seats" | "bad_email" }[] };
export function parseGuestPaste(text: string, defaultSeats: number): PasteResult;
export type RsvpSubmission = { guests: { id?: string; name: string }[]; attendance: Record<string, boolean[]>; contactPhone?: string; contactEmail?: string };
export type RsvpValidation = { ok: true; value: RsvpSubmission } | { ok: false; reason: "too_many_guests" | "unknown_event" | "bad_attendance" | "name_too_long" | "bad_contact" };
export function validateRsvpSubmission(input: unknown, invitation: Pick<Invitation, "seatLimit" | "eventIds" | "guests">): RsvpValidation;
export function generateInvitationToken(): { token: string; tokenHash: string };
export function hashInvitationToken(token: string): string;
export function isWellFormedInvitationToken(token: string): boolean; // ^[A-Za-z0-9_-]{43}$
```

`attendance[serviceId][i]` is whether `guests[i]` attends. A guest with an empty name who attends is allowed (an unnamed plus-one). A submission with no attending guest anywhere is valid.

Paste rules: split lines on `\n`; cells on tab, else `;`, else `,`. A first row is a header when any cell matches (case-insensitive, accents folded) `name|nombre|invitacion|invitation|familia`; header columns map by `nombre|name` → name, `tel|phone|whatsapp|celular` → phone, `correo|email|mail` → email, `lugares|seats|personas|pases|guests` → seats. Without a header, columns are name, phone, email, seats in that order, and a cell containing `@` is the email wherever it sits. Blank lines are skipped. Seats outside 1–20 or not an integer → `bad_seats`. Missing seats → `defaultSeats`.

- [ ] **Step 1: Failing tests,** one `it` per rule above, plus: `totalsByEvent` ignores attendance for a service id not in `serviceIds`; `responseState` is `"no_answer"` while `submittedAt` is null even if the planner pre-ticked attendance; `"declined"` when submitted and nobody attends that event; `validateRsvpSubmission` rejects 3 guests on a limit of 2 and an attendance key outside `eventIds`; `hashInvitationToken` of the generated token equals `tokenHash`; `isWellFormedInvitationToken("short")` is false.
- [ ] **Step 2: Run** `npx vitest run lib/__tests__/invitations.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(invitations): add the RSVP rules, totals and paste import`.

### Task 5: Server data layer

**Files:**
- Create: `lib/supabase/invitations.ts`
- Test: extend `test/db/invitations.test.ts`

**Interfaces (produces):**

```ts
export class InvitationWriteError extends Error { constructor(public userMessage: string, public status: number, cause?: unknown) }
export async function listInvitations(supabase: SupabaseClient, providerId: string): Promise<Invitation[]>;
export type InvitationDraft = { displayName: string; contactPhone?: string; contactEmail?: string; seatLimit: number; eventIds: string[]; notes?: string; guestNames?: string[] };
export async function createInvitations(supabase: SupabaseClient, providerId: string, drafts: InvitationDraft[]): Promise<Invitation[]>; // ≤ 500 per call
export type InvitationPatch = Partial<Omit<InvitationDraft, "guestNames">> & { guests?: { id?: string; name: string }[]; attendance?: Record<string, boolean[]>; markAnswered?: boolean };
export async function updateInvitation(supabase: SupabaseClient, providerId: string, invitationId: string, patch: InvitationPatch): Promise<Invitation>;
export async function deleteInvitation(supabase: SupabaseClient, providerId: string, invitationId: string): Promise<boolean>;
export async function deleteAllInvitations(supabase: SupabaseClient, providerId: string): Promise<number>;
export async function regenerateInvitationToken(supabase: SupabaseClient, providerId: string, invitationId: string): Promise<Invitation>;
export type PublicInvitation = { displayName: string; seatLimit: number; guests: { id: string; name: string; attending: Record<string, boolean> }[]; eventIds: string[]; contactPhone: string; contactEmail: string; submittedAt: string | null };
export async function getPublicInvitation(admin: SupabaseClient, route: { vertical: VerticalId; providerSlug: string; token: string }): Promise<{ invitation: PublicInvitation; providerId: string } | null>;
export async function submitPublicRsvp(admin: SupabaseClient, route: { vertical: VerticalId; providerSlug: string; token: string }, input: unknown): Promise<PublicInvitation>;
```

Guest updates replace the guest list in order: rows with a known id are updated, new rows inserted, missing rows deleted (deletes first, so a lower seat limit fits). Attendance is replaced for the invitation's events. `submitPublicRsvp` resolves the provider by published vertical and slug, requires `rsvp_mode = 'invitations'`, validates with `validateRsvpSubmission`, refuses a second submit within 2 seconds of `submitted_at` (429), writes, and sets `submitted_at = now()`. `markAnswered` lets the planner record an answer given by phone. Lowering `seatLimit` below the guests named in the same patch is a 400 `"This invitation already names N guests. Remove one before lowering its seats."`.

- [ ] **Step 1: Failing db tests:** create two invitations with events and guest names, list returns them with `eventIds` and guests ordered by position; update replaces guests and attendance; `submitPublicRsvp` with a valid body sets `submittedAt`; a third guest on a limit of 2 throws status 400; a provider in open mode makes `getPublicInvitation` return null; a regenerated token makes the old one return null.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm run test:db -- test/db/invitations.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(invitations): read and write guest lists and RSVPs`.

### Task 6: Owner API routes

**Files:**
- Create: `app/api/provider/invitations/route.ts` (GET list; POST `{ drafts: InvitationDraft[] }`; DELETE `?all=1` with body `{ confirm: "DELETE" }`)
- Create: `app/api/provider/invitations/[invitationId]/route.ts` (PATCH `InvitationPatch`; DELETE)
- Create: `app/api/provider/invitations/[invitationId]/token/route.ts` (POST regenerate)
- Test: `app/api/provider/invitations/route.test.ts`

Same shape as `app/api/provider/clients`: 401 without a user, 404 without a provider, `Cache-Control: no-store`, `describeError` logging, `userMessage` bodies. The list response is `{ invitations: Invitation[] }`.

- [ ] **Step 1: Failing tests** with the Supabase client mocked as in `app/api/provider/clients/export/route.test.ts`: GET without a user is 401; POST with 501 drafts is 400; DELETE all without `confirm` is 400.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): add owner routes for the guest list`.

### Task 7: The invitation page and its public API

**Files:**
- Create: `app/api/public/[verticalSegment]/[providerSlug]/invitations/[token]/route.ts` (GET, POST)
- Create: `app/[verticalSegment]/[providerSlug]/i/[token]/page.tsx` (`PRIVATE_PAGE_METADATA`; resolves the page like `manage/[token]/page.tsx`, then renders `InvitationPageShell`)
- Create: `components/invitations/InvitationPageShell.tsx` (theme, header, footer, like `PublicBookingPageShell`)
- Create: `components/invitations/InvitationRsvp.tsx` (client form)
- Create: `components/invitations/invitation-copy.ts` (en/es)
- Modify: `lib/public-url.ts:58` (`RESERVED_SERVICE_SLUGS` gains `"i"`)
- Test: `components/invitations/__tests__/invitation-rsvp.test.tsx`, `app/api/public/[verticalSegment]/[providerSlug]/invitations/[token]/route.test.ts`

Copy (es first, the demo's language): greeting `"{name}, guardamos {seats} lugares para ustedes."` (singular `"1 lugar para usted"`); per event `"¿Quién viene?"`; decline `"No podremos asistir"`; add `"+ Agregar invitado"`, at the limit `"Su invitación es para {seats} personas."`; submit `"Enviar confirmación"`; saved `"¡Gracias! Recibimos su confirmación."`; edit `"Cambiar mi respuesta"`; invalid link `"Este enlace de invitación no es válido. Pídale el suyo a quien le invitó."`; offline `"Sin conexión. Su respuesta sigue aquí; intente de nuevo."` English equivalents in the same file.

The page shows the business name, hero text, and per invited event: name, date and time in the provider's time zone, place, and notes. Then the form (spec 5.2). After submit it shows the answers per event and "Change my answer". The API answers 404 with one body for unknown, malformed (`!isWellFormedInvitationToken`) and regenerated tokens, and for pages not in invitation mode.

- [ ] **Step 1: Failing tests:** the add-guest button is disabled at the seat limit and the limit sentence shows; choosing "No podremos asistir" unticks every guest for that event; submit posts `{ guests, attendance }` with attendance arrays aligned to guests; a failed fetch keeps the typed names and shows the offline message; the route returns the same 404 body for `"short"` and for a well-formed unknown token.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(invitations): add the household RSVP page`.

### Task 8: Public page in invitation mode

**Files:**
- Modify: `components/public-booking-page-shell.tsx` (when `isInvitationMode(injectedConfig.provider, injectedConfig.vertical)`, render `InvitationOnlySchedule` instead of `HaabBookingModule`)
- Create: `components/invitations/InvitationOnlySchedule.tsx`
- Test: `components/invitations/__tests__/invitation-only-schedule.test.tsx`

Shows header, hero text, each event (name, date and time, place, notes) and the line `"Para confirmar, abra el enlace personal que le enviaron."` / `"To RSVP, open the personal link you were sent."`. No booking button. The language toggle uses the existing `LanguageLinks` with `?lang=`.

- [ ] **Step 1: Failing test:** with `rsvpMode: "invitations"` the schedule renders event names and the RSVP line and no "Ver fecha"/"See date" button; with `rsvpMode: "open"` the shell still renders the booking module (mocked).
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(events): show a schedule instead of booking on invitation-only pages`.

### Task 9: Guest list section and settings

**Files:**
- Modify: `lib/dashboard-routes.ts` (`{ id: "guests", segment: "guests", group: "operate" }` first in operate after the overview)
- Modify: `components/provider/DashboardApp.tsx` (`SECTION_ICONS.guests = "clients"`; in invitation mode show `guests` and hide `bookings`, `clients`, `campaigns`; outside it hide `guests`)
- Modify: `components/provider/dashboard-copy.ts` (`titles.guests`, `descriptions.guests` en/es; `sectionTitle("guests") → copy.Clients`)
- Modify: `components/haab-booking-module.tsx` (`case "guests"` renders `GuestListSurface` with `lang`, `integratedMode`, `services`, `provider`, `publicPath`)
- Modify: `components/provider/ProviderSettingsSurface.tsx` (events only: "Invitation-only RSVPs" switch and "Seats per new invitation" number input)
- Create: `components/provider/guests/GuestListSurface.tsx`, `components/provider/guests/InvitationEditor.tsx`, `components/provider/guests/PasteImportDialog.tsx`, `components/provider/guests/guests-copy.ts`, `lib/guest-list-cache.ts`
- Modify: `e2e/fixtures/providers.ts`, `e2e/global.setup.ts` (role `weddingsPage`: events, vocabulary weddings, rsvp_mode invitations), `e2e/nav-widths.spec.ts` (case "dashboard of a wedding page": offers `/dashboard/guests` named "Guests", `/dashboard/scan`, `/dashboard/services` named "Events"; hides `/dashboard/bookings`, `/dashboard/clients`, `/dashboard/campaigns`)
- Test: `components/provider/guests/__tests__/guest-list-surface.test.tsx`, `lib/__tests__/guest-list-cache.test.ts`, extend `lib/__tests__/dashboard-routes.test.ts`

Surface layout (spec 6.2): totals card per event, recent answers (latest 5 by `updatedAt` with `submittedAt`), filters (all, no answer, attending, declined) and search, table of invitations (name, seats, per-event state badges), actions per row (copy link, edit, delete), header actions (add, paste list, delete all). `InvitationEditor` edits every field including attendance, with "Mark as answered". `lib/guest-list-cache.ts` exports `readGuestListCache(providerId: string): { invitations: Invitation[]; savedAt: string } | null` and `writeGuestListCache(providerId: string, invitations: Invitation[]): void` over `localStorage` key `haab:guest-list:<providerId>`, both swallowing storage errors. Offline (fetch fails, or `navigator.onLine === false`) the surface shows the cached list read-only with `"Sin conexión: mostrando la lista guardada el {date}. Los cambios se activan al volver la conexión."` Queued offline edits come with door check-in (PR 5), which builds the offline queue.

- [ ] **Step 1: Failing tests:** `sectionFromSegments(["guests"]) === "guests"`; the surface renders totals for two events from mocked data; filter "no answer" shows only unanswered invitations; the paste dialog previews 2 rows and 1 error for a 3-line paste with a bad seat count; offline with a cache renders the list and the offline banner and disables edit buttons; the cache helpers survive a throwing `localStorage`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npx vitest run`, then the e2e nav spec on the scratch stack (`npx playwright test e2e/nav-widths.spec.ts`). Expected: PASS.
- [ ] **Step 5: Commit** `feat(dashboard): add the guest list section and invitation settings`.

### Task 10: Privacy notice, docs and full verification

**Files:**
- Modify: `lib/legal/content.ts` (en/es: the organizer may upload a guest list of names, phone numbers and email addresses of people who did not fill a form; guests may add names of companions; kept until the organizer deletes it or closes the account)
- Modify: `README.md` (invitation mode in one paragraph), `docs/wedding-rsvp-gaps.md` (mark items 1–4 addressed by PR 1)

- [ ] **Step 1:** Edit the copy.
- [ ] **Step 2: Run** the whole gate: `npm run typecheck && npm run lint && npx vitest run && npm run test:db && git diff --check`, then manual check on the scratch stack: switch the demo to invitation mode, add 3 invitations by paste, open one link at 390px and 1280px, submit with a decline on one event, see the totals update.
- [ ] **Step 3: Commit** `docs: describe invitation-only RSVPs in the privacy notice and README`.
