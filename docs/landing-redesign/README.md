# Landing redesign: handoff

Scope: the marketing landing page (`/`) only. The booking flow and the hero booking card (`components/landing/hero-preview.tsx`) are unchanged.

| File | What it is |
|---|---|
| `design-spec.md` | Full spec: guardrails, typography, colour, components, section-by-section layout (desktop + mobile), EN/ES copy changes, a11y, definition of done |
| `prompts.md` | Phased Claude Code prompts (Phase 0 plan → Phase 7 QA). Run one per session. |
| `reference/desktop.html` | Visual target at 1440px. Open in a browser. |
| `reference/mobile.html` | Visual target at 390px. Open it in a browser with devtools set to 390px wide. |
| `reference/landing-tokens.css` | Design tokens scoped under `.haab-landing` |

The editable design canvas (desktop + mobile artboards) lives in the Claude artifact "Haab Calendar Landing Redesign".

**Assets:** there are no image files to add. The design uses:
- Fonts: Bricolage Grotesque and Figtree (Google Fonts, loaded with `next/font/google`), plus the IBM Plex Mono you already load.
- Icons: `@phosphor-icons/react` (already a dependency; mapping in spec §4).
- Illustrations: built from markup and CSS (mock UI panels) and inline SVG (the H1 underline and the QR tile). They are all in the reference HTML.

The reference HTML files show one frozen moment of the booking card, the 9:00 AM hold. In the app, keep rendering the real animated `HeroBookingPreview`.
