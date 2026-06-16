# Manual test workflows — events vertical

Reproducible, persona-driven manual tests for the events vertical, especially
single-occurrence vs periodic scheduling. Each file is a self-contained script:
setup, steps, expected results, and findings from the last run.

Run them against a local dev server:

```bash
npm run dev   # http://localhost:3000
```

These are manual/browser tests (driven via Chrome DevTools MCP or by hand). They
complement the automated unit tests in `lib/__tests__/` — the unit tests cover
availability/spots math; these cover the end-to-end provider + public flow.

## Conventions

- **Reset workspace** = Settings → "Reset standalone setup" → pick a vertical.
  This clears the local standalone store and re-runs onboarding. The signed-in
  account used for local testing is the disposable "Delete Test Co".
- Native segmented date/time inputs don't accept a single string via automated
  `fill`. Set them with a React-compatible native value setter + `input`/`change`
  events (see snippet in each script), or type into them by hand.
- Each scenario uses **one single-occurrence** event and **one periodic** event
  so both code paths are exercised.

## Scenarios

- [events-single-occurrence-yoga.md](events-single-occurrence-yoga.md) — yoga
  studio: recurring class + one-off community class.
- [events-hotel.md](events-hotel.md) — hotel: wine tasting (one-off) + Petronas
  sightseeing (recurring tours).
- [events-weekly-recurring.md](events-weekly-recurring.md) — yoga: hot yoga every
  Tuesday 6:30 PM (per-event weekday + time recurrence).
- [events-capacity-spots.md](events-capacity-spots.md) — spots as the single
  capacity source; spots-left shown across single/weekly/periodic.

## Occurrence modes

Events support three occurrence modes:

- **Single** — one fixed calendar date + time.
- **Weekly** — recurs on chosen weekday(s) at a fixed time (self-contained).
- **Periodic** — follows the page's global weekly availability.
