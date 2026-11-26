---
name: haab-calendar-product
description: Use when a task depends on what Haab Calendar (haabcalendar.com) does as a product — marketing, landing or SEO copy, blog posts, support replies, FAQ answers, pricing or plan questions, "can Haab do X?" feature questions, positioning, demo walkthroughs, roadmap or product decisions, or architecture discussions about booking pages, holds, client self-service, industry presets, invitation-only RSVPs, bank deposit receipts, or Google Calendar sync, in English or Spanish. Also use before publishing any claim about Haab.
metadata:
  version: "1.0.0"
  verified-against: "haab-calendar main @ 50fa348c, 2026-11-20"
---

# Haab Calendar — product knowledge

## Overview

Haab Calendar is free booking software for small businesses. The owner publishes one public booking page. Clients book without an account. The server holds the chosen slot for 10 minutes, so nobody double-books it. Each booking carries a private link the client uses to reschedule or cancel.

Promise: **One link. No sign-up. No double bookings.**

**Core rule: claim only what ships.** Trace every product statement to a reference file. If no reference covers it, say it is unverified and check the code; never fill gaps from generic booking-software knowledge.

## Facts to get right every time

| Topic | Fact |
| --- | --- |
| Price | Free. Every shipped feature is on the free plan (since 2026-11-20). No credit card. Never say "beta" or "early access". |
| Client accounts | None, ever. Client gives name, email and phone. Manage link token is stored hashed. |
| Hold | 10 minutes, set by the server (`expires_at`). Warning in the last 2 minutes. One 5-minute extension. |
| Booking modes | Timed appointment, full-day, capacity event. Restaurants sell N tables per seating. |
| Industries | Healthcare, spaces, professional services, events, restaurants. URL segments: `doctors`, `spaces`, `professionals`, `events`, `restaurants`. |
| Language | English and Spanish. English is the default. Industry words, e.g. patients/pacientes, diners/comensales. |
| Google Calendar | Optional. Confirmed bookings become events that carry the service name only; client name, email, phone and notes never go to Google. Busy blocking and two-way sync are included but off until the owner turns them on. |
| Payments | No online payments. Optional bank deposit: the client uploads a receipt and the owner checks it by hand. |
| RSVPs | Invitation-only mode on events pages: one link per household, seat limits, deadline, questions, seating, QR check-in at the door that works offline. |

## Which reference to read

| Task | Read |
| --- | --- |
| Marketing, landing, SEO or blog copy | `references/differentiators.md`, `references/voice-and-copy.md` |
| Support reply, FAQ, troubleshooting | `references/support-playbook.md`, `references/booking-flow.md` |
| "Can Haab do X?", feature inventory | `references/features.md`, `references/current-status.md` |
| Holds, confirmation, reschedule, cancel | `references/booking-flow.md` |
| Industries, terminology, presets, demos | `references/industries.md` |
| Google Calendar | `references/google-sync.md` |
| Weddings, private events, deposits | `references/rsvp-and-deposits.md` |
| Architecture, data, security | `references/architecture.md` |
| Limits, not-built, roadmap | `references/current-status.md` |

Load only what the task needs.

## Working rules

1. Check `references/current-status.md` before stating any capability or limit.
2. Write in the audience's industry words (`references/industries.md`).
3. When this skill and the repo disagree, the repo wins. Re-check facts that change often (plans, entitlements) in `lib/entitlements/catalog.ts`. Then update this skill and `CHANGELOG.md`.
4. Name no competitors and invent no comparisons. The project has no competitor research.

## Common mistakes

| Wrong | Right |
| --- | --- |
| "Free during beta", "early access pricing" | "Free. Every feature is on the free plan." |
| "Take payments online", "card checkout" | Haab does not process payments. Bank deposit receipts get manual review. |
| "Two-way Google sync out of the box" | Two-way sync is opt-in and off by default. Only projection runs once connected. |
| "Clients create a quick account" | Clients never create accounts. |
| "15-minute hold" or "browser timer" | 10 minutes, enforced by the server, one 5-minute extension. |
| "Hotel stays", "multi-night bookings" | Not supported: a booking covers one date. |
| "HIPAA compliant", "SOC 2", "certified" | Never claim certifications or compliance. |
| "Book a party of 4 for the workshop" | Open events take one spot per registration. Restaurants record party size. Invitations carry seat limits. |
| Waitlists, ticket tiers, SMS, recurring end dates | None of these is built. |
