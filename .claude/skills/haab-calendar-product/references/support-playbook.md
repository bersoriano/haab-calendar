# Support playbook

Answers for owners and their clients. Keep replies short, in the asker's language, using their industry's words. Never promise a fix or feature date. Never reveal another person's booking data.

## Contents
- Client questions
- Owner questions
- Troubleshooting (operator)
- Reply template

## Client questions

| Question | Answer |
| --- | --- |
| "Do I need an account?" | No. Pick a time, enter your name, email and phone, and you're booked. |
| "How do I reschedule or cancel?" | Open the private link from your confirmation email or receipt, or scan the QR on it. Choose reschedule or cancel. No login. |
| "I lost my link." | Check the confirmation or reminder email; every one carries the link. Otherwise contact the business directly. Haab support cannot look up or resend another person's booking. |
| "My time disappeared while I was typing." | Each time is held for 10 minutes, with one 5-minute extension in the last 2 minutes. After that it's released. Tap "hold this time again" or choose another time; what you typed is kept. |
| "It says someone else confirmed first." | Two people tried for the same time and the other confirmed first. Nothing was booked for you. Pick another time. |
| "I can't reschedule." | Rescheduling stays within the same service and only to open times. A single-date event can't be moved, only cancelled. Neither can a cancelled booking. If no other time is open, contact the business. |
| "Can I add it to my calendar?" | Yes. Download the calendar file (`.ics`) from the confirmation, or use the add-to-calendar action on your private link page. |
| "The page is in the wrong language." | Use the language switch on the page, or add `?lang=en` or `?lang=es` to the URL. |
| "I didn't get an email." | Check spam. The private link on the receipt screen works without the email. Delivery depends on the business's email setup. |
| "I uploaded my deposit receipt; am I confirmed?" | Your time is reserved and the payment is pending until the business checks its bank. If they reject the receipt, you have 24 hours to upload a new one from your private link. |
| "I can't RSVP from the wedding page." | Invitation-only events take answers only through your personal invitation link. Ask whoever sent the invitation. |

## Owner questions

| Question | Answer |
| --- | --- |
| "What does it cost?" | Nothing. Every feature is on the free plan; no credit card. |
| "Can I try it before signing up?" | Yes. Build and preview the whole page without an account. You create one only to publish. |
| "Why isn't a time showing?" | Check, in order: weekly hours; blocked windows; booking window; an existing booking at that time (one provider is one resource across all services); an active hold by another visitor; a full-day booking that date; event spots used up; Google busy time (if busy blocking is on); times earlier today. |
| "Why can't clients book a full day?" | A full-day needs an uninterrupted day with no other booking. Remove the blocked window on that weekday. |
| "Can two people book the same slot?" | Not for ordinary appointments: the database rejects overlaps. Events and restaurants share capacity up to the limit you set. |
| "How do I get bookings into Google Calendar?" | Integrations → Connect Google → pick a calendar. Bookings appear with the service name only. Optionally turn on busy blocking and two-way sync. |
| "Bookings aren't reaching Google." | Allow up to ~5 minutes. If the connection says *needs reauth*, reconnect. If it says the feature is turned off for the account, contact support. |
| "Can I take payments?" | Not online. Eligible businesses (spaces, professional services, open events) can require a bank deposit receipt and confirm it by hand. |
| "How do reminders work?" | Settings → Email reminders: 24 hours before by default, optional second reminder and custom message, can be turned off per service. Sent in the client's language. |
| "Where did old bookings go?" | They move to Archive after 7 days and are deleted one calendar month after their date. Turn on one-year history in Settings to keep them longer. Deletion is permanent. |
| "Can I export my clients?" | Clients → export CSV. |
| "Can I run two businesses or weddings?" | One booking page per account today. Use a separate account for each. |
| "Can I change my link or industry?" | Yes. Set your own link (old links redirect) and change business type from the dashboard. |
| "Can I sell hotel stays or multi-day rentals?" | Not today. A booking covers one date. |

## Troubleshooting (operator)

| Symptom | First check |
| --- | --- |
| Emails, reminders and Google all stalled, no errors | GitHub `scheduled-workers.yml` disabled after 60 days without a commit; check `CRON_SECRET` matches on both sides |
| Emails dead-lettering | `RESEND_API_KEY` / `BOOKING_EMAIL_FROM` set and sender domain verified |
| Owner "has nothing" after paying or a grant | `provider_feature_overrides`: an active withhold beats everything |
| Dashboard errors after a deploy | Hosted migrations vs repo (`list_migrations`); unpushed migration |
| Google `event_id_collision` | Two deployments sharing `HAAB_DEPLOYMENT_NAMESPACE` |
| Google `needs_reauth` | Grant revoked or expired; only the owner can reconnect |
| Busy-blocking booking refused (503) | Google unreachable with a stale cache; it fails closed by design; retry |
| Old QR or manage links fail after a domain move | Add the old origin to `HAAB_ADDITIONAL_ORIGINS` |

Deeper references: `docs/operations/*.md`, `docs/tutorials/google-calendar-integration.md` §10.

## Reply template

1. Answer the question in the first sentence.
2. Give the exact place in the product (screen → setting) or the action.
3. State a limit plainly if one applies, without apology padding or a future promise.
4. Mirror the asker's language (EN/ES). Spanish to owners uses tú.
