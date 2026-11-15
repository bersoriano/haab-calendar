# Wedding RSVPs: guest lists, one RSVP per invitation, seating and door check-in

Date: 2026-11-08 · Status: proposed, awaiting approval

Background: `docs/wedding-rsvp-gaps.md` (what the first wedding demo could not
do) and the demo itself, `/events/boda-valeria-y-diego` (PR #82).

## 1. Intent

A wedding planner should be able to run a wedding's attendance in Haab: send
each household its own invitation link, collect one answer per household for
the whole weekend (who comes to what, how many, what they eat), chase whoever
has not answered, seat people at tables, and check them in at the door by
scanning a QR code.

Today an events page sells seats to anyone with the link, one seat per booking,
one event at a time. A wedding is the opposite: a closed guest list, households
with a fixed number of seats, and several moments over a weekend.

Success looks like: a planner sets up a 150-guest wedding in an evening (paste
the list, set seats, share links over WhatsApp), knows on any day how many
people are confirmed per event and who to chase, hands the caterer a count per
menu, and gets everyone through the door on the day without a paper list.

## 2. Decisions already made (by the product owner)

1. **One account per wedding** for now. Each wedding is its own provider page,
   so the one-provider-per-owner rule stays. Multi-wedding workspaces for
   planners are out of scope.
2. **No new vertical.** Weddings stay on the **events** vertical, with two
   separate, independent settings on the provider:
   - an **invitation-only RSVP mode** (the behavior: guest list, personal links,
     one RSVP, seating, check-in). Useful beyond weddings: quinceañeras,
     baptisms, corporate galas.
   - a **"weddings" word set** (the words), built like the existing `tours`
     word set.
3. **Plus-ones:** the planner sets the maximum number of people per invitation.
   The guest can bring up to that number and no more.
4. **One RSVP** per invitation covering every event that invitation is invited
   to (not one booking flow per event).
5. **Wording** follows the word set (section 9).
6. **RSVP deadline and reminders** as proposed: one deadline per wedding, manual
   reminders by WhatsApp link and email.
7. **RSVP questions** (for example a menu choice) are set up by the planner in
   settings.
8. **Seating:** the planner assigns seats as the date gets closer, and each
   person sees their seat in their invitation once confirmed. Door check-in is
   by QR code.
9. **Story:** a short story that shows on the public page and in the link
   preview when the URL is shared.
10. When everything has shipped, **update the demo seed** to show it.

## 3. Goals, non-goals, anti-goals

**Goals**
- Closed guest list with per-household personal links and a seat limit.
- One form per household: per event, who is coming, or "we can't make it".
- Three answers the planner can count per event: attending, declined, no answer.
- Deadline, reminders, menu-style questions with counts, CSV exports.
- Table seating per person, published to guests when the planner is ready.
- QR check-in at the door that still works when the venue's network drops.
- Story and a proper share preview for the public URL.

**Non-goals (this round)**
- Several weddings under one login.
- Phone-number + SMS/WhatsApp code login (the reference page has not shipped
  it either). Personal links only.
- Automatic, scheduled reminders. Reminders are sent by the planner.
- Gift registry, lodging blocks, FAQ, photo galleries beyond what the page
  already has, envelope animations, music.
- Payments of any kind.
- A visual seating chart (drag tables on a floor plan). Lists only.

**Anti-goals: this fails even if it works if…**
- a guest needs an account or a password to answer;
- an invited guest is turned away by the RSVP form because an event "is full"
  (the couple invited them; capacity is the planner's problem to manage);
- one household can see or guess another household's invitation;
- guests see a half-finished seating plan, or tables that keep moving;
- an existing events page (open mode) changes in any way;
- the door check-in stops working because the venue has no signal;
- wedding-only words get hard-coded into shared components instead of the word
  set (this repo is the parent template for child projects).

## 4. Concepts

- **Wedding** = one provider page on the events vertical, with
  `rsvp_mode = invitations`. The page's events (services) are the moments of
  the weekend: welcome dinner, ceremony and reception, tornaboda.
- **Invitation** = one household or party: a display name ("Familia Ortiz"),
  optional contact phone and email, a **seat limit**, the events it is invited
  to, a personal link, and planner-only notes.
- **Guest** = one person on an invitation. The planner may pre-fill names; the
  household fills or corrects the rest. An invitation never has more guests than
  its seat limit.
- **Attendance** = for each guest and each event the invitation is invited to:
  attending yes or no, plus (later) a table and a check-in time.
- **Response state of an invitation for an event**, derived, never stored by
  hand:
  - *no answer*: the household has not submitted the RSVP;
  - *attending*: at least one guest is attending;
  - *declined*: the household answered and nobody is attending.
- **RSVP question** = a planner-defined question, asked per guest or once per
  invitation, on chosen events, answered from a fixed list of options.
- **Table** = a named table for one event, with an optional seat count.

A suggested shape (names and exact columns are the builder's call):

| Entity | Holds |
| --- | --- |
| providers (new columns) | `rsvp_mode` (`open` default, `invitations`), `rsvp_deadline` (date), `default_invitation_seats`, `rsvp_questions` (jsonb), `story` (text), `seating_published` (bool), `vocabulary` gains `weddings` |
| invitations | provider, display name, phone, email, seat limit, link token, notes, `submitted_at`, `last_contacted_at`, timestamps |
| invitation_events | which events an invitation is invited to |
| invitation_guests | invitation, name, position, per-guest answers, diet |
| guest_attendance | guest × event: attending, table, `checked_in_at` |
| seating_tables | event, name, seat count, order |

Invitation-level answers (for example the hotel for the shuttle) live on the
invitation.

## 5. Guest experience

### 5.1 The public page in invitation mode

`/events/<slug>` shows the wedding: names, cover image, story, and the schedule
of events (date, time, place, dress code and other notes). There is no booking
button. In its place: "To confirm, open the personal link we sent you." Service
URLs (`/events/<slug>/<event>`) behave the same. Open-mode pages are unchanged.

### 5.2 The invitation page

`/events/<slug>/i/<token>`. Add `i` to the reserved service slugs next to
`manage`. Unknown or revoked tokens show a plain "this invitation link is not
valid, ask the person who sent it" page, never a 500, and never a hint about
whether the wedding exists.

It shows the greeting ("Familia Ortiz, we saved 4 seats for you"), the story,
and **only the events this invitation is invited to**.

**The RSVP form, one submit for everything:**
1. Guests: the names on the invitation, editable. Empty rows up to the seat
   limit ("+ Add a guest", disabled at the limit, with the limit stated). A
   plus-one whose name the household does not know yet can stay unnamed and
   shows as "Guest of Ana" until someone fills it in.
2. For each event: a checkbox per guest ("who's coming?") and a "we can't make
   it" option that unticks everyone.
3. Questions that apply: per guest (menu, diet) or once (shuttle hotel).
4. Optional: the household can correct the contact phone and email.
5. Submit. The confirmation shows what they answered per event, and it can be
   edited from the same link until the deadline.

Submitting with nobody attending anything is a valid answer (declined
everything). It counts as answered.

### 5.3 After the deadline

The link shows the household's answers read-only, plus "Need to change
something? Contact <planner phone>". The planner can still edit everything from
the dashboard. Moving the deadline reopens the form.

### 5.4 Seat and pass

Once the planner publishes seating, the confirmation shows each guest's table
per event ("Ana Ortiz · Mesa 7"). It also shows a QR code (the invitation link)
to present at the door. The planner can email the confirmation with the QR when
there is an email address.

## 6. Planner experience

### 6.1 Settings (invitation mode on)

- Invitation-only RSVP mode switch (events vertical only, like the word set).
  Turning it off with invitations present asks for confirmation and keeps the
  data.
- RSVP deadline.
- Default seats per new invitation.
- RSVP questions editor: label, per guest or per invitation, options, which
  events. Built-in toggles for **diet** (free text, per guest) and **shuttle
  hotel** (free text, per invitation), replacing the traveler fields for this
  mode. Removing an option that has answers asks first; the answers keep their
  text.
- Story text (short, around 600 characters) with the existing header image as
  the cover.

### 6.2 Guest list (new dashboard section, leads the nav in invitation mode)

- **Recent answers**: the latest submissions and changes, newest first. The
  planner gets no email per RSVP (150 households would flood the inbox).
- **Totals per event**: confirmed people, declined invitations, invitations
  with no answer, and the event's capacity with a warning when confirmed people
  exceed it.
- **List of invitations**: name, seats, per-event state, contacted date.
  Filters: no answer, attending, declined, not contacted yet. Search by name.
- **Add**: one at a time, or **paste from a spreadsheet** (name, phone, email,
  seats; columns detected from a header row, with a preview before saving and
  per-row errors).
- **Edit**: seat limit, guest names, events invited to (per invitation, not per
  guest), contact, notes, and the
  answers themselves (the planner can answer for a guest who called). Lowering
  the seat limit below the number of named guests asks which guest to drop.
- **Share**: copy link; "Send by WhatsApp" opens `wa.me/<phone>?text=` with a
  prefilled message containing the link, using the planner's own phone; "Send by
  email" through Resend. Each records `last_contacted_at`.
- **Reminders**: the same buttons on invitations with no answer, plus "Email
  everyone with no answer" (only those with an email address; shows how many
  will receive it before sending; at most once per 24 hours).
- **Regenerate link** revokes the old one.
- **Export CSV** per event: invitation, guest, attending, answers, diet, table.
  A menu-count summary per event sits above the list (for example
  "Res 82 · Pescado 41 · Vegetariano 12 · Infantil 9").
- **Delete guest list** (all invitations) with typed confirmation.

### 6.3 Seating (within the guest list, per event)

The planner said: assign seats as the date gets closer; each person sees their
seat in their confirmation. The design adds these on top, which are my calls:

- **Per person, with a one-click default per invitation.** Assign the whole
  invitation to Mesa 7 in one action, then move one person (a child to the kids'
  table) if needed. Families do split, and a per-invitation table cannot express
  that.
- **Tables per event.** Usually only the reception has seating; an event with
  no tables has no seating.
- **A "publish seating" switch.** Guests see tables only after the planner
  publishes, so a half-finished plan never leaks and the planner can rearrange
  freely. Republishing after changes is allowed; the switch says when it was
  last published.
- **Table view**: each table's guests and its filled/total seats, with a warning
  when it is over its seat count; a list of confirmed guests without a table.
  Only guests marked attending can be seated. If a seated guest later declines,
  they leave the table and the planner sees it in the unseated count.
- **Seating CSV** by table, for the venue.

### 6.4 Door check-in

- The existing dashboard scanner (`/dashboard/scan`) also accepts invitation
  QR codes (`/i/<token>` URLs). Extend `lib/booking-scan.ts`; it currently
  accepts only `/manage/` URLs.
- Scanning shows the invitation for **today's event** (asks which event if
  several happen that day): attending guests, their tables, and who is already
  in. "Check in all" or tick individual guests. Scanning again shows "checked in
  at 17:02".
- **Door list**: search by name for guests who did not bring the QR.
- Arrival counter per event: "112 of 168 arrived".
- **Works offline** (section 10).

## 7. Capacity rules

- In invitation mode the public booking flow is off. Holds, booking windows and
  `max_spots` booking rules do not apply to RSVPs.
- An event's `max_spots` becomes the planning capacity: the dashboard warns when
  confirmed people exceed it. **The RSVP form never refuses an invited guest for
  capacity** (anti-goal). This is my call. If the owner wants a hard cap later,
  it is a setting, not a redesign.
- RSVPs are not bookings. They do not appear in booking analytics, are not sent
  to Google Calendar or the integration outbox, and do not add people to the
  Clients list.
- The seat limit per invitation is hard: the server rejects more guests than
  the limit, whatever the client sends.

## 8. Story and share preview

- The story shows on the public page and the invitation page, under the header.
- Provider page metadata (`buildProviderCanonicalMetadata` /
  `generateMetadata` on `app/[verticalSegment]/[providerSlug]/page.tsx`)
  becomes provider-specific for every page: title is the business name (for a
  wedding, the couple), description is the story or hero text cut to about 160
  characters, and the image is the header image when there is one, otherwise the
  current default. Shared links on WhatsApp then show the couple and the story.
- Invitation pages are `noindex` and must not put the household's name in the
  preview (a forwarded link should not reveal who it was for).

## 9. The "weddings" word set

Added like `tours`: the `providers_vocabulary_known` check, `Vocabulary`,
`lib/vertical-copy.ts` (en and es), the settings selector. Suggested nouns:

| Key | en | es |
| --- | --- | --- |
| service | event | evento |
| booking | RSVP | confirmación |
| client | guest | invitado |
| bookVerb | RSVP | Confirmar asistencia |

Phrases replace "price", "cancellation policy", "hotel pickup",
"registration". **On any events page, a free event has no "Price" row** in the
summary or on the pass, wedding or not. The event card may still say "Free".

The word set and the mode are independent: a gala can use invitation mode with
the event words, and a wedding can use the wedding words in open mode.

## 10. Offline

The product rule is that the app keeps working without a network.

- **Door check-in must work fully offline.** When the scanner opens for an
  event, it downloads that event's guest list (names, tables, attending,
  check-ins) and the invitation tokens' hashes to the device. Scans resolve
  locally. Check-ins are queued and synced when the network returns. Two door
  phones checking in the same guest must merge: first `checked_in_at` wins,
  never an error.
- **The guest list editor** reads from a local cache when offline and queues
  edits. When a queued edit conflicts with a newer server change to the same
  field, the server wins and the planner is told which edit was dropped.
- **Guests' RSVP** needs a network (it is a public form), like booking today.
  An offline submit shows a clear "you're offline, try again" and keeps what
  they typed.

## 11. Privacy, security, retention

- Invitations, guests and answers are owner-only under RLS. The public reads
  and writes go through server routes or `security definer` RPCs keyed by the
  invitation token, scoped to that invitation only, and rate limited like
  public booking writes.
- **Tokens:** at least 128 random bits, URL-safe. Unlike booking manage tokens,
  the planner needs to copy the link again at any time, so the token is stored
  readable by the owner only. Hash-only storage is not an option here. Lookup is
  by hash or constant-time comparison. Regenerating revokes the old token.
- **Retention:** diet and question answers are health-adjacent. They are purged
  30 days after the wedding's last event, along with check-in times. Names,
  contacts and seat limits stay until the planner deletes the guest list or the
  account. This mirrors how `provider_clients` keeps contacts and drops the
  rest.
- **Privacy notice** (`lib/legal/content.ts`): the planner uploads people who
  never filled a form themselves, and guests may give diet details. Say what is
  kept, who sees it, and for how long, in en and es.
- New `providers` columns need the column grants (anon `select` for what the
  public page shows: `rsvp_mode`, `story`, `seating_published`, `rsvp_deadline`;
  authenticated `insert` and `update` for what settings saves). Without them,
  public pages 404 or saves 500, and only a real database shows it.

## 12. Constraints

- Next.js in this repo differs from common knowledge: read
  `node_modules/next/dist/docs/` before writing routes or metadata.
- Navigation changes (the new section, nav order in invitation mode) are
  recorded in `e2e/nav-widths.spec.ts` at phone and desktop widths, asserting
  what is on screen.
- English and Spanish for every string. The page language follows the existing
  rules (owner's language, Accept-Language, toggle).
- Migrations are additive. Open-mode providers must behave exactly as before.
  Hosted migrations are pushed by the owner (`npx supabase db push`), and
  deploys must not get ahead of them (see the 2026-10-10 outage).
- Customization goes through seams (word set, config, settings), not wedding
  conditionals in shared components.
- Available on all plans in this round (my call; pricing is undecided).

## 13. Delivery order

Each step is a PR that leaves the product working. The demo stays in open mode
until the last step.

1. **Guest list and one RSVP.** Mode switch, word set, invitations, guests,
   attendance, seat limits, paste import, personal links, invitation page with
   the single RSVP form and declines, per-event totals, privacy notice, nav.
2. **Deadline and reminders.** Deadline behavior, WhatsApp and email sharing,
   reminders, contacted dates.
3. **RSVP questions.** Settings editor, diet and shuttle built-ins, per-event
   counts, CSV export.
4. **Seating.** Tables per event, per-person assignment with invitation default,
   publish switch, seat shown to guests, seating CSV.
5. **Door check-in.** Invitation QR codes, scanner support, door list, arrival
   counts, offline queue.
6. **Story and share preview.**
7. **Demo seed.** Switch "Boda de Valeria & Diego" to invitation mode with the
   wedding word set, a story, three events, about 30 invitations in mixed states
   (answered, declined, no answer, partly attending), a menu question, tables
   for the reception with seating published, and a few check-ins. The landing
   card links to one sample invitation, so visitors can try the RSVP (re-seeding
   resets it). README and `docs/wedding-rsvp-gaps.md` updated.

PR #82 (the first wedding demo) merges first, after its hosted seed.

## 14. Left to the builder

Exact schema and names; API route shapes; UI layout within the existing
dashboard kit; the paste-import parser; email templates; CSV column order; the
offline queue mechanism (within section 10); whether invitation mode hides the
Bookings, Clients and Campaigns sections or only reorders the nav.

## 15. Calls made in this document (not yet confirmed by the owner)

1. Capacity warns, never blocks an invited guest (section 7).
2. Seating is per person with a per-invitation default, per event, behind a
   publish switch (section 6.3).
3. Invitation tokens are stored readable by the owner so links can be re-copied;
   regenerate revokes (section 11).
4. Reminders are manual. "Email all" is capped at once per 24 hours.
5. Diet and question answers are purged 30 days after the last event; contacts
   stay until deleted.
6. Built-in diet and shuttle questions replace traveler fields in invitation
   mode.
7. Price is hidden for free events on every events page, not only weddings.
8. No plan gating this round.
9. Invitation links never show the household name in link previews.
10. Unnamed plus-ones are allowed ("Guest of Ana").
11. Events are invited per invitation, not per guest.
12. No email to the planner per RSVP; a recent-answers list instead.
13. RSVPs stay out of bookings, analytics, Clients and calendar sync.
