# Claude Code prompts: landing redesign

Run these in order from the repo root (`~/dev/haab-calendar`), **one prompt per session or after `/clear`**. Each prompt is self-contained. Review and merge (or at least commit) each phase before starting the next.

All the context lives in `docs/landing-redesign/`:
- `design-spec.md`: the spec (scope, tokens, sections, copy EN/ES, definition of done)
- `reference/desktop.html` and `reference/mobile.html`: the visual target (1440px / 390px)
- `reference/landing-tokens.css`: the scoped design tokens

> Tip: start Phase 0 in **plan mode** (Shift+Tab) so Claude proposes the plan before touching code.

---

## Phase 0: Plan (no code)

```
Read docs/landing-redesign/design-spec.md in full, then open docs/landing-redesign/reference/desktop.html and reference/mobile.html (read the markup; screenshot them with Playwright at 1440x900 full-page and 390x844 full-page if you can) and reference/landing-tokens.css.

Then study the current landing implementation: components/landing/landing-ui.tsx, components/landing/translations.ts, components/home-experience.tsx (VerticalsPanel, and how LandingPage + afterHero are composed), app/page.tsx, app/layout.tsx, app/globals.css, components/landing/hero-preview.tsx (read-only), lib/demo-gallery.ts, and the tests in components/landing/__tests__.

Follow AGENTS.md (task branch, read the relevant Next.js docs in node_modules/next/dist/docs/ before writing code, conventional commits).

Produce a written implementation plan only. Do not edit files. It should cover:
1. The component breakdown: which existing components get restyled, which new ones are needed (FactStrip, LpButton, CheckChip, IconTile, StatCell, IndustryTile, NightCard...), and where they will live.
2. How tokens and fonts get scoped to the landing (.haab-landing wrapper, next/font variables) without touching :root tokens, --font-sans, or anything hero-preview.tsx and the booking flow read.
3. Translation keys to add or change in EN and ES, mapped to spec §6.
4. Data sources: demo count, healthcare preset services, featured-demo ordering (healthcare first), and demo vertical to header colour.
5. The new section order in LandingPage and how afterHero (VerticalsPanel / dashboard panel) fits.
6. Risks: anything shared with the booking flow, the gallery page reusing StickyNav, tests that assert copy or order.
7. A phase checklist matching the remaining prompts in docs/landing-redesign/prompts.md.

Ask me about anything ambiguous before we start.
```

---

## Phase 1: Foundations (tokens, fonts, primitives)

```
Implement Phase 1 of docs/landing-redesign (read design-spec.md §0–§4 first, plus the plan we agreed).

Scope:
- Create a landing-only font module that loads Bricolage Grotesque and Figtree via next/font/google, exposing --font-bricolage and --font-figtree. Apply them ONLY on the landing wrapper, not on <html>/<body>.
- Add the tokens from docs/landing-redesign/reference/landing-tokens.css as landing-scoped CSS (under .haab-landing), imported in a way that does not affect other routes. Put the .haab-landing class (and the font variable classes) on the LandingPage wrapper in components/landing/landing-ui.tsx.
- Build the shared primitives: LpButton (primary, secondary, inverse, ghost-inverse, outline-ink), CheckChip, IconTile, StatCell, and an updated Eyebrow (tone teal/blue/night) and SectionHeading (split / centered). Use Tailwind v4 arbitrary values that reference the --lp-* variables. Use @phosphor-icons/react for icons (see spec §4 for the mapping).

Hard rules:
- No diff in components/landing/hero-preview.tsx, in the booking flow (components/booking/**, haab-booking-module.tsx, public-booking-page-shell.tsx, app/[verticalSegment]/**, app/public/**, app/try-booking/**), or in the :root block, --font-sans, or the html font-size in app/globals.css.
- No visual change to any section yet except where primitives are dropped in trivially.

Finish by running npm run typecheck && npm run lint && npm run test, and commit (feat(landing): add redesign tokens, fonts and primitives).
```

---

## Phase 2: Nav + Hero + Fact strip

```
Implement Phase 2 of docs/landing-redesign: StickyNav, Hero and the new FactStrip. Follow design-spec.md §5.1–§5.3 and match reference/desktop.html (top of page) and reference/mobile.html (top of page).

- StickyNav: restyle only (logo tile with teal status dot, Bricolage wordmark, EN/ES segmented pill, teal primary CTA). Keep useHeroPassed, AccountEntry, the mobile <details> menu, anchors and anchorsGoHome. Check the gallery page, which reuses it, still looks right.
- Hero: new ground (paper, radial glows, dot grid), badge pill, 3-line H1 with a teal third line and a decorative coral underline SVG, updated body, primary and secondary buttons, three CheckChips, fine print, and HeroAccountLine. Keep the phone order (headline, then booking card, then body/CTAs) as the current component already does.
- The booking card: render <HeroBookingPreview /> exactly as today. Only its column/wrapper may change. Keep previewCaption under it.
- FactStrip: a new component directly after Hero, overlapping the hero bottom. The demo count must come from DEMO_PAGES.length via formatDemoCount.
- Add the new/changed hero and fact copy to translations.ts in EN and ES (spec §6). Keep hero.title as the full sentence for metadata, and add titleLines for the visual split.

Verify: Playwright screenshots of / at 1440 and 390, in both ?lang=en and ?lang=es, compared against the reference files. Run npm run typecheck && npm run lint && npm run test. Commit (feat(landing): redesign nav, hero and fact strip).
```

---

## Phase 3: Use cases + reorder

```
Implement Phase 3 of docs/landing-redesign: the Use cases bento (VerticalsPanel in components/home-experience.tsx, id "verticals") and the new section order in LandingPage. Follow design-spec.md §5.4 and §5.

- New order: StickyNav, Hero, FactStrip, afterHero (VerticalsPanel or dashboard panel), HowItWorks, LiveExamples, Features, GoogleIntegration, Trust, FAQ, FinalCTA, Footer.
- Desktop bento: 3 columns x 2 rows of 270px. The Healthcare tile spans both rows (teal-900, mint glow, "Our core industry" pill, "Pre-filled for you" list). The other four are tinted IndustryTiles.
- The healthcare pre-filled list must read the first two services from the real healthcare vertical preset (find where presets live; don't hardcode), plus a dashed "+ Add your own · Editable" row.
- Mobile: healthcare full width, then a 2x2 grid of compact tiles.
- Keep onSelectVertical(v.id) on every tile, and keep the tiles as real buttons.
- Make sure the dashboard-panel variant of afterHero still looks right in the new position (restyle it lightly with the new tokens if needed).
- EN and ES copy per spec §6.

Verify with screenshots at 1440/390 in EN and ES. Run typecheck, lint and tests. Commit (feat(landing): healthcare-first use cases bento and new section order).
```

---

## Phase 4: How it works + Live examples

```
Implement Phase 4 of docs/landing-redesign: HowItWorks (§5.5) and LiveExamples/DemoCard (§5.6). Match the reference files.

- HowItWorks: paper band, centred heading, three cards, each with a 150px tinted illustration panel (URL input + chips / share chips + QR tile / calendar event + "added to your calendar"). The illustrations are aria-hidden mock UI. For the QR tile, either use the existing qrcode package pointing at a demo page or a static SVG. Remove the slot-rule rail, and delete the .haab-slot-rule* CSS if nothing else uses it (grep first).
- DemoCard: white card with a coloured header whose colour and mini-visual come from the demo's vertical (mapping in §5.6, including dark text on coral/sun headers). The whole card stays the same clickable element as today. The healthcare demo appears first among the featured demos.
- Mobile: a horizontal scroll-snap row of 270px cards with pagination dots.
- "See all {n} demos" as an outline-ink button.
- EN and ES copy per spec §6.

Verify with screenshots at 1440/390 in EN and ES, then run typecheck, lint and tests. Commit (feat(landing): illustrated steps and vertical-coloured demo cards).
```

---

## Phase 5: Why it feels different + Google + Trust

```
Implement Phase 5 of docs/landing-redesign: Features / "Why it feels different" (§5.7, night band), GoogleIntegration (§5.8) and Trust (§5.9). Match the reference files.

- Features: --lp-night band, new H2, three NightCards with illustrations (three modes / industry words + EN-ES toggle / private-link reschedule mock). Keep the existing label/title/body copy.
- GoogleIntegration: two columns (text + blue-50 visual with the day list and the "Stays in Haab" card), then three icon points. DO NOT change the disclosure copy. components/landing/__tests__/google-disclosure.test.tsx must keep passing unchanged, and the Google OAuth review depends on that text.
- Trust: mint band, new intro line, three white cards with solid IconTiles.
- EN and ES copy per spec §6. Mock-UI groups get aria-hidden.

Verify with screenshots at 1440/390 in EN and ES, then run typecheck, lint and tests. Commit (feat(landing): night band, Google visual and trust cards).
```

---

## Phase 6: FAQ + Final CTA + Footer

```
Implement Phase 6 of docs/landing-redesign: FAQ (§5.10), FinalCTA (§5.11) and Footer (§5.12). Match the reference files.

- FAQ: desktop two-column grid with a sticky left column (eyebrow, H2, aside line, "See a real page" via DemoButton). The accordion keeps <details>, and the first item is open by default.
- FinalCTA: teal-700 panel with a dot grid and glows, a two-line H2, inverse + ghost-inverse buttons (StartButton / DemoButton) and fine print.
- Footer: night background, 4-column grid on desktop, stacked on mobile, mono column labels, teal-400 CTA, EN/ES switch. Keep showUseCases handling for the links.

Verify with screenshots at 1440/390 in EN and ES, then run typecheck, lint and tests. Commit (feat(landing): FAQ, final CTA and footer redesign).
```

---

## Phase 7: QA pass

```
Final QA for the landing redesign in docs/landing-redesign. Do not add features.

1. Guardrails: confirm with git diff main --stat and targeted diffs that components/landing/hero-preview.tsx, the booking flow files, and the :root block, --font-sans and html font-size in app/globals.css are unchanged. Open a public booking page (e.g. /doctors/<demo-slug>) and /try-booking and confirm they look exactly like main.
2. Responsive: take full-page screenshots of / at 390, 768, 1024, 1280 and 1440, in EN and ES. Fix overflow, awkward wraps (H1 at 1024–1279 → ~56px), and anything under 44px touch targets.
3. Accessibility: check contrast of every text/background pair against spec §9. One h1, headings in order, decorative SVGs and mock UI aria-hidden, keyboard focus visible on every link and button, and the <details> menu and FAQ usable by keyboard.
4. States: logged-out visitor, logged-in owner with a page (dashboard panel in afterHero, nav CTA hidden), super-admin demo edit banner, guest draft bar, and the gallery page (reuses StickyNav).
5. Performance: fonts are next/font with swap and only the weights we use; no layout shift from the fact strip overlap; the Lighthouse Performance/Accessibility scores on / do not drop versus main.
6. Update docs/landing-page.md to describe the new structure (short).
7. Run npm run ci. Fix anything that fails. Commit (chore(landing): redesign QA fixes).

Report a short checklist of what you verified and any follow-ups.
```

---

## Follow-up prompts (optional)

**Tweak a single section**
```
In the landing redesign (docs/landing-redesign), change only <SECTION> so that <CHANGE>. Don't touch other sections, hero-preview.tsx or the booking flow. Screenshot before/after at 1440 and 390.
```

**Spanish copy review**
```
Review every landing string we added in components/landing/translations.ts (es) for natural Mexican Spanish that matches the existing tone ("apartado", "reagendar"). Propose changes as a table before editing.
```
