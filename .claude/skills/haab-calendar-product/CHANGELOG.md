# Changelog

All notable changes to the `haab-calendar-product` skill. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow SemVer:
- **MAJOR**: a product fact reversed (e.g. pricing model changes)
- **MINOR**: new feature or reference file
- **PATCH**: wording, a correction or a re-verification

When the product changes, update the affected reference, bump `metadata.version` and `verified-against` in `SKILL.md`, and add an entry here.

## [1.0.0] - 2026-11-26

Verified against `haab-calendar` `main @ 50fa348c` (2026-11-20).

### Added
- `SKILL.md`: overview, must-know facts, task-to-reference router, working rules, common mistakes.
- `references/features.md`: full shipped feature inventory, dashboard sections, entitlement keys.
- `references/booking-flow.md`: client journey, 10-minute hold rules, receipt, manage link, modes, statuses, failure states.
- `references/industries.md`: five verticals, presets, EN/ES terminology, `tours`/`weddings` word sets, 14 live demos, unsupported verticals.
- `references/google-sync.md`: projection, busy blocking and two-way; privacy promise; correct phrasing.
- `references/rsvp-and-deposits.md`: invitation-only RSVPs and bank deposit receipts.
- `references/differentiators.md`: positioning, ten differentiators with proof, message hierarchy, objections.
- `references/voice-and-copy.md`: voice, CTAs, banned claims, Spanish rules, locked language decisions, test-pinned copy.
- `references/current-status.md`: stage, timeline, known limits, not-built list.
- `references/support-playbook.md`: client and owner answers, operator troubleshooting, reply template.
- `references/architecture.md`: stack, modes, authority, security invariants, workers, file map.
- `evals/triggers.json`: positive and negative trigger cases.

### Notes
- The same change removed out-of-date repo docs: the June–August planning docs (`STRATEGIC_PRODUCT_ROADMAP.md`, `EPICS_AND_STORIES.md`, `UX_RECOMMENDATIONS.md`, `BACKEND_RECOMMENDATIONS.md`, `docs/future-features.md`) were deleted. The Google and premium tutorials, `docs/landing-page.md`, `docs/booking-process.md` and `docs/ARCHITECTURE.md` were corrected to current behavior. The skill no longer needs a stale-sources list.
