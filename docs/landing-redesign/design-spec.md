# Haab Calendar: landing page redesign spec

**Status:** approved direction ("Teal + blue, healthcare-first"). This spec covers the marketing landing page only.
**Visual source of truth:** `reference/desktop.html` (1440px) and `reference/mobile.html` (390px). Open them in a browser. Both are static HTML with inline styles. Treat them as a picture of the target, not as code to paste.
**Tokens:** `reference/landing-tokens.css`.

---

## 0. Scope and guardrails (read first)

| In scope | Out of scope: do not change |
|---|---|
| `components/landing/landing-ui.tsx` (StickyNav, Hero, LiveExamples, DemoCard, HowItWorks, Features, GoogleIntegration, Trust, FAQ, FinalCTA, Footer, LandingPage) | **`components/landing/hero-preview.tsx`**. The booking card in the hero stays exactly as it is: markup, classes, sizes, fonts, animation. Only its wrapper/column may change. |
| `VerticalsPanel` in `components/home-experience.tsx` (the "Use cases" section, id `verticals`) | The booking flow: `components/booking/**`, `haab-booking-module.tsx`, `public-booking-page-shell.tsx`, `app/[verticalSegment]/**`, `app/public/**`, `app/try-booking/**` |
| `components/landing/translations.ts` (EN **and** ES) | Existing `:root` tokens in `app/globals.css`, `--font-sans`, and the `html` font-size. The booking flow depends on them. |
| New landing-only CSS (scoped under `.haab-landing`) and new fonts, loaded only for the landing | Dashboard/provider UI, auth pages, legal pages, gallery page logic (it reuses `StickyNav`, so check it still looks right) |

Rules:

1. Scope the new tokens under `.haab-landing`, set on the `LandingPage` wrapper. Never redefine `--teal`, `--accent`, `--ink`, `--line`, `--surface-soft` and so on, because `hero-preview.tsx` reads them.
2. Only landing elements use the new fonts. The hero booking card keeps Inter (`--font-sans`). Put the display/body font classes on landing elements, not on `<body>`.
3. Keep every existing behaviour: `StartButton`/`DemoButton` actions, the start-page dialog, the live-demo dialog, `useHeroPassed` (the nav CTA appears after the hero), `AccountEntry`, language switching, the `afterHero` slot (VerticalsPanel vs dashboard panel), `showUseCases`, `featuredDemos`, section ids and anchors (`live-examples`, `how`, `verticals`, `features`, `google-calendar`, `trust`, `faq`, `early-access`).
4. All copy stays in `translations.ts`, with EN and ES in parallel. Don't hardcode strings in JSX. Numbers that come from data (demo count, pre-filled services) come from data.
5. Don't invent facts, stats or testimonials.

---

## 1. Direction in one paragraph

A calm clinical base (mint-toned whites, deep navy ink) with **teal as the action colour**, brand **blue** as the secondary, and one warm **coral** spark for decoration. Each industry gets its own tint (healthcare teal, spaces blue, professional services violet, events coral, restaurants sun-yellow), which gives the page colour without gradient washes. A distinctive grotesque display face replaces Inter on the marketing surface. The page rhythm alternates light, mint and one dark "night" band, so the sections no longer read as one flat plane. Healthcare leads: it is the large feature tile in Use cases and the first live demo, and the Trust section speaks to clinics.

---

## 2. Typography

Load with `next/font/google`, landing only (for example in `components/landing/fonts.ts`, with the variables applied on the `.haab-landing` wrapper):

```ts
import { Bricolage_Grotesque, Figtree } from "next/font/google";
export const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", weight: ["500","600","700","800"] });
export const figtree   = Figtree({ subsets: ["latin"], variable: "--font-figtree", weight: ["400","500","600","700"] });
```

`IBM Plex Mono` (`--font-plex-mono`) is already loaded. Use it for eyebrows and small labels.

| Role | Font | Desktop (≥1024) | Mobile (<640) | Notes |
|---|---|---|---|---|
| H1 hero | Bricolage 700 | 66px / 1.0 / -0.035em | 44px / 1.0 | Three lines, one per sentence. Line 3 is teal-600 with a coral hand-drawn underline (inline SVG, decorative, `aria-hidden`). |
| H2 section | Bricolage 700 | 54px / 1.04 / -0.035em | 36px / 1.05 | `text-wrap: balance` |
| H3 feature card | Bricolage 700 | 26–28px / 1.1 / -0.02em | 20–22px | Healthcare tile title: 36px desktop, 30px mobile |
| H3 small (Google, Trust) | Bricolage 700 | 22–23px / 1.2 | 19–20px | |
| Stat number | Bricolage 700 | 40px | 30px | |
| Lead paragraph | Figtree 400 | 20px / 1.55 (hero), 18px (section intros) | 17px / 16.5px | colour `--lp-body` / `--lp-muted` |
| Body | Figtree 400 | 16–16.5px / 1.55–1.6 | 14.5–15px | |
| Buttons, nav | Figtree 700 / 600 | 15.5–17px | 16–17px | |
| Eyebrow | Plex Mono 500, uppercase | 13px, tracking 0.14em | 12px | Preceded by an 8px rounded square in teal-400 (blue on the Google section, mint-300 on the night band) |

---

## 3. Colour usage

See `landing-tokens.css` for all values. Contrast has been checked against WCAG AA.

- **Primary button:** `--lp-teal-700` background, white text, pill radius, `--lp-shadow-cta`. Hover: `--lp-teal-700-hover`.
- **Secondary button:** white background, 1.5px `#C9DAD6` border, ink text, with a pulsing teal-400 dot (reuse `.haab-live-dot`).
- **Inverted buttons (on teal panels):** white background, teal-700 text. Ghost: 1.5px `rgba(255,255,255,.5)` border.
- **Links:** teal-700 on white; blue-700 for Google/"Log in"; for industry tiles, use the tile's -700/-800 shade.
- **Coral-500 is decoration only** (the H1 underline and glows). Never use it for text. Text on coral fills uses `--lp-coral-ink`.
- **Section grounds, in order:** hero `--lp-paper` + glows + dot grid → fact strip (white card overlapping the hero) → Use cases white → How it works `--lp-paper` → Live examples white → Why `--lp-night` → Google white → Trust `--lp-mint-band` → FAQ white → Final CTA white with a teal-700 panel → Footer `--lp-night`.

---

## 4. Components (build once, reuse)

| Component | Spec |
|---|---|
| `Eyebrow` (update the existing one) | Mono label with a square marker. Props: `tone` = teal / blue / night. |
| `SectionHeading` (update the existing one) | Two layouts. **Split:** H2 left (max 700px), intro paragraph right (max 380–400px), aligned to the bottom. **Centered:** eyebrow and H2 centred (How it works). On mobile both stack. |
| `LpButton` | Variants: `primary`, `secondary`, `inverse`, `ghost-inverse`, `outline-ink` ("See all demos"). Heights: 56 (hero/CTA), 48 (cards), 44 (nav). Min touch target 44px. Arrow icon on the right for primary. |
| `CheckChip` | 12px radius, white/75% background, 1px `#DCE8E5` border, teal check icon, 14.5px/600. |
| `IconTile` | 44–52px square with a 14–16px radius, solid industry colour, 22–26px icon. |
| `StatCell` | Number (Bricolage) plus a one-line caption. On desktop: 4 columns with 1px dividers. On mobile: 2×2 grid. |
| `IndustryTile` | Tinted card (28px radius on desktop, 20px on mobile), icon tile, title, one-line description, link. |
| `DemoCard` (restyle) | White card with a 24px radius and a 120px coloured header (104px on mobile) that carries the vertical label (mono), a LIVE pill and a small visual by vertical (see §5.5). The body holds the title, description and a link line. The whole card is one `<a>`/button, as today. |
| `NightCard` | `--lp-night-2` background, 1px `--lp-night-line` border, 28px radius, 32px padding. Illustration on top, then mono label, H3 and body. |
| `FaqItem` | Keep `<details>`. Open state: `--lp-paper` background and a teal "minus" disc. Closed: white background, `--lp-line-soft` border and a grey "plus" disc. 20px radius. The question is Bricolage 21px (18px on mobile). |

Icons: the project already uses `@phosphor-icons/react`. Suggested mapping: Healthcare `Heartbeat`, Spaces `Buildings` (or `CourtBasketball`), Professional `Briefcase`, Events `Ticket`, Restaurants `ForkKnife`, check `Check`, arrow `ArrowRight`, Google points `ToggleRight` / `ArrowsLeftRight` / `Lock`, Trust `ShieldCheck` / `UserMinus` / `Eye`, step visuals `User` / `EnvelopeSimple` / `QrCode` / `Lightning`, menu `List`. Use the `regular` or `bold` weight, and always add `aria-hidden`.

---

## 5. Sections (new order)

`StickyNav` → **Hero** → **FactStrip** (new) → **afterHero slot** (Use cases / dashboard panel) → **HowItWorks** → **LiveExamples** → **Features** ("Why it feels different") → **GoogleIntegration** → **Trust** → **FAQ** → **FinalCTA** → **Footer**

Container: `max-w-[1200px]` content, centred (at 1440 this gives 120px gutters); `px-5` on mobile, `sm:px-8`. Section vertical padding is 120px on desktop and 72px on mobile (use cases top: 128/80 because of the overlapping strip).

### 5.1 StickyNav
- Keep the behaviour. Restyle: logo tile blue-600 with a 12px radius, a teal-400 "status dot" at the top right with a 2px ring in the background colour, and the wordmark in Bricolage 700 20px.
- Links: Figtree 600 15.5px, `--lp-ink-2`. The language switch becomes an EN/ES segmented pill (the active option is ink with white text). The primary CTA is teal-700 (still hidden until the hero has scrolled past).
- Mobile: logo, compact EN/ES pill, 44px menu button (existing `<details>` menu, restyled with the new radius and colours).

### 5.2 Hero (`Hero`)
- Ground: `--lp-paper` plus three blurred radial glows (mint top-left, blue behind the card, coral bottom-centre) plus a dot grid. All glows are `pointer-events-none`.
- **Desktop:** two columns, `596px | 556px`, 48px gap, vertically centred. **Mobile keeps today's smart order:** badge → H1 → **booking card** → caption → body → CTAs (full width, stacked) → chips → account line.
- Left column, top to bottom:
  1. Badge pill: white, teal-700 inner "EARLY ACCESS" tag and the text "Free while in early access · No card".
  2. H1, split into three lines (see copy).
  3. Body (updated copy).
  4. Primary "Create your page" plus secondary "See a real page".
  5. Three `CheckChip`s: Live availability · 10-minute hold · Private reschedule link.
  6. Fine print "Nothing to install." plus the existing `HeroAccountLine` (Already have a page? Log in).
- Right column: the unchanged `<HeroBookingPreview />` plus the existing `previewCaption` below it (13px, left-aligned on desktop, centred on mobile).
- Bottom padding is about 128px on desktop and 96px on mobile, so the fact strip can overlap.

### 5.3 FactStrip (new component, directly after Hero)
A white card with `--lp-shadow-raised` and a 24px radius, overlapping the hero by -64px (-56px on mobile). Four `StatCell`s:

| Number | Caption | Colour |
|---|---|---|
| 10 min | hold on every slot while a client types | teal-600 |
| 0 | client accounts or passwords to manage | blue-700 |
| {DEMO_PAGES.length} | public demo pages running right now | coral `#E0552F` (large text only) |
| EN · ES | every label and confirmation, both languages | ink |

The demo count must come from `DEMO_PAGES.length` (use `formatDemoCount`), not the literal 12.

### 5.4 Use cases (`VerticalsPanel`, id `verticals`)
- Split `SectionHeading`: eyebrow "USE CASES", H2 "Pick what you book. Your page arrives filled in.", intro on the right.
- **Desktop bento:** `grid-cols-3`, two rows of 270px, 20px gap. **Healthcare spans both rows in column 1.** The other four fill the 2×2 on the right: Spaces (blue-100), Professional services (violet-100), Events (coral-100), Restaurants (sun-100).
- **Healthcare tile:** teal-900 background with a mint glow at the top right, teal-400 icon tile and a "Our core industry" pill. Title "Healthcare" at 36px, then the description. Below that a **"PRE-FILLED FOR YOU"** mini list showing the first two real services from the healthcare vertical preset (find where presets live; the demo uses "New patient consultation · 30 min · $95" and "Follow-up visit · 20 min · $65"). The third row is dashed: "+ Add your own · Editable". The inverse button reads "Start with Healthcare →".
- **Mobile:** the healthcare tile is full width, followed by a 2×2 grid of compact tiles (icon, title, short description, "Start →").
- Each tile keeps the existing `onSelectVertical(v.id)` behaviour. The buttons stay real `<button>`s.

### 5.5 How it works (`HowItWorks`, id `how`)
- `--lp-paper` band, centred heading. Three white cards (28px radius, 1px `--lp-line`), each with a **150px tinted illustration panel** on top, then "STEP 0N" (Bricolage 700 15px in the step colour), the H3 and the body.
  - **01 Name your page (mint):** a fake URL input `haabcalendar.com/your-name` with a caret, plus chips ✓ Services, ✓ Hours, ✓ Prices.
  - **02 Share the link (blue):** three chips (Your bio, Your emails, Door QR code) and a decorative QR tile. Generate it with the already-installed `qrcode` package, pointing at a demo page, or use a static SVG.
  - **03 Switch on autopilot (coral):** a calendar event row "TUE 29 · New patient consultation · 9:00–9:30 AM · Booked by the client" and "⚡ Added to your calendar, no message needed".
- These replace the "slot rule" rail between steps. You can delete `.haab-slot-rule*` once nothing uses it.
- Mobile: the cards stack. The step number sits beside the title (28px, 800).

### 5.6 Live examples (`LiveExamples` / `DemoCard`, id `live-examples`)
- Split heading. Four cards in `grid-cols-4` on desktop and a horizontal scroll-snap row on mobile (270px cards, 12px gap, pagination dots, `scroll-snap-type: x mandatory`).
- The header colour and mini-visual depend on the **demo's vertical** (not the card index):
  - healthcare → teal-900 with time pills (first selected in teal-400)
  - spaces → blue-600 with a row of six hour blocks (two white = booked)
  - professional or salon → violet-600 with service chips
  - restaurant → coral-600 with table dots and **dark text** (`--lp-coral-ink`) for the label and LIVE pill
  - events → sun-500 with dark text and a "40 seats" capacity bar
  - fallback → blue-600 with time pills
- The healthcare demo should be the first featured card. Adjust `pickFeaturedDemos` ordering, or sort in the component.
- Below the grid: an outline-ink button "See all {n} demos" and the existing note.

### 5.7 Why it feels different (`Features`, id `features`), the night band
- `--lp-night` ground with one teal glow at the top centre. Eyebrow in mint-300. H2 (new): "One page that fits the way you actually work."
- Three `NightCard`s, each with an illustration (about 148px tall):
  1. **Three modes:** three rows, "Consulting hour · Appointment", "Venue for a Saturday · Full day", "Forty seats at a class · Tickets", with pills in teal, blue and coral tints.
  2. **Industry language:** chips Patients (filled teal-400), Guests, Clients, Attendees, Diners (outlined), plus a mini EN/ES toggle and "Patient · Paciente".
  3. **Self-service:** a private-link mock with a lock icon, "Tue 29 Sep · 9:00 AM" and [Reschedule] [Cancel]. These are decorative spans, not buttons.
- Card text keeps the existing copy (label, title, body). The old texture helper `.haab-slot-rule-dense` can go.

### 5.8 Google Calendar (`GoogleIntegration`, id `google-calendar`)
- Two columns: text left (eyebrow in blue, H2, paragraph, "How we handle Google data →" link) and a visual right on a blue-50 panel:
  - A white "YOUR GOOGLE CALENDAR · Tue 29" day list: 8 AM grey "Busy, already on your calendar"; 9 AM a teal-600 event "New patient consultation / Service name only"; 10–11 AM dashed empty slots.
  - A night card "🔒 STAYS IN HAAB" with chips Client name, Email, Phone, Notes.
- Below, a divider and then the three existing points as 3 columns, each with an `IconTile` (blue / mint / coral) and H3 + body.
- **Keep the existing disclosure copy word for word.** There is a test for it (`components/landing/__tests__/google-disclosure.test.tsx`), and the Google OAuth review depends on it.
- Mobile: text, then the visual (the day list shows 2 rows; the "stays in Haab" chips wrap), then the points as icon + text rows.

### 5.9 Trust (`Trust`, id `trust`)
- `--lp-mint-band` ground. Split heading with a new intro: "Especially when the calendar belongs to a clinic, and the people booking are patients."
- Three white cards (24px radius), each with a 52px solid `IconTile` (teal-600 / blue-600 / coral-600), H3 and body (existing copy).

### 5.10 FAQ (`FAQ`, id `faq`)
- Desktop: a two-column grid, `400px | 1fr`, with an 80px gap. The left column is sticky: eyebrow, H2 "Questions, answered.", a short line (new) and a "See a real page →" link (`DemoButton`). The right column is the accordion, with the first item open by default.
- Mobile: heading, then the accordion.

### 5.11 Final CTA (`FinalCTA`, id `early-access`)
- A teal-700 panel with a 36px radius (28px on mobile), a light dot grid, a mint glow at the top right and a blue glow at the bottom. Left: H2 "One link. / Then autopilot." (72px, 44px on mobile) and the sub-line. Right: an inverse "Create your page" button, a ghost "See a real page" button and the fine print.
- Mobile: stacked, with full-width buttons.

### 5.12 Footer (`Footer`)
- `--lp-night` background. Desktop grid `1.6fr 1fr 1fr 1.2fr`: brand + tagline | Product | Company | "Get started" with a teal-400 CTA and the EN/ES switch. Column labels are Plex Mono in mint-300. A bottom bar holds the copyright.
- Mobile: brand, tagline and CTA, then the two link columns, then the copyright.

---

## 6. Copy changes (EN / ES)

Only new or changed strings are listed. Everything else keeps its current translation. The Spanish uses the same register as the existing file ("apartado", "reagendar"). Review it before shipping.

| Key (suggested) | EN | ES |
|---|---|---|
| `hero.badge` | Early access | Acceso anticipado |
| `hero.badgeText` | Free while in early access · No card | Gratis durante el acceso anticipado · Sin tarjeta |
| `hero.titleLines` | ["One link.", "No sign-up.", "No double bookings."] | ["Un enlace.", "Sin registrarse.", "Sin reservas duplicadas."] |
| `hero.title` (keep for metadata/a11y) | One link. No sign-up. No double bookings. | Un enlace. Sin registrarse. Sin reservas duplicadas. |
| `hero.body` | Live availability, a ten-minute hold while they type, and a private link to reschedule. Your patients and clients never make an account — and you never confirm a time by hand. | Disponibilidad en vivo, un apartado de diez minutos mientras escriben y un enlace privado para reagendar. Tus pacientes y clientes nunca crean una cuenta, y tú nunca confirmas un horario a mano. |
| `hero.chips` | Live availability · 10-minute hold · Private reschedule link | Disponibilidad en vivo · Apartado de 10 minutos · Enlace privado para reagendar |
| `hero.fineprint` | Nothing to install. | Sin instalar nada. |
| `facts[0]` | 10 min — hold on every slot while a client types | 10 min — de apartado en cada horario mientras el cliente escribe |
| `facts[1]` | 0 — client accounts or passwords to manage | 0 — cuentas o contraseñas de clientes que administrar |
| `facts[2]` | {n} — public demo pages running right now | {n} — páginas de demostración públicas funcionando ahora |
| `facts[3]` | EN · ES — every label and confirmation, both languages | EN · ES — cada etiqueta y confirmación, en ambos idiomas |
| `useCases.healthBadge` | Our core industry | Nuestra industria principal |
| `useCases.healthLanguage` | Patients see “patients,” not “customers.” | Tus pacientes leen “pacientes”, no “clientes”. |
| `useCases.prefilled` | Pre-filled for you | Precargado para ti |
| `useCases.addOwn` | + Add your own · Editable | + Agrega los tuyos · Editable |
| `useCases.startShort` | Start → | Empezar → |
| `how.visual` | Services · Hours · Prices / Your bio · Your emails · Door QR code / Booked by the client / Added to your calendar — no message needed | Servicios · Horarios · Precios / Tu bio · Tus correos · QR en la puerta / Reservado por el cliente / Agregado a tu calendario, sin mensajes de por medio |
| `features.eyebrow` | Why it feels different | Por qué se siente distinto |
| `features.title` | One page that fits the way you actually work. | Una sola página que se adapta a tu forma de trabajar. |
| `features.modes` | Consulting hour · Appointment / Venue for a Saturday · Full day / Forty seats at a class · Tickets | Hora de consultoría · Cita / Salón para un sábado · Día completo / Cuarenta lugares en una clase · Boletos |
| `features.words` | Patients · Guests · Clients · Attendees · Diners | Pacientes · Invitados · Clientes · Asistentes · Comensales |
| `features.selfService` | Private link · only for this booking / Reschedule / Cancel | Enlace privado · solo para esta reserva / Reagendar / Cancelar |
| `google.visual` | Your Google Calendar / Busy — already on your calendar / Service name only / Stays in Haab / Client name · Email · Phone · Notes | Tu Google Calendar / Ocupado: ya está en tu calendario / Solo el nombre del servicio / Se queda en Haab / Nombre del cliente · Correo · Teléfono · Notas |
| `trust.eyebrow` | Trust & privacy | Confianza y privacidad |
| `trust.intro` | Especially when the calendar belongs to a clinic, and the people booking are patients. | Sobre todo cuando el calendario es de una clínica y quienes reservan son pacientes. |
| `faq.aside` | The quickest answer is usually a real page. Book one of the demos like a client would. | La respuesta más rápida suele ser una página real. Reserva una demo como lo haría un cliente. |
| `finalCta.titleLines` | ["One link.", "Then autopilot."] | Split the existing ES title across two lines. |
| `footer.getStarted` | Get started | Empieza |

Make the illustration strings (mock UI inside cards) `aria-hidden` groups, or give them one concise `aria-label`, so screen readers don't read fake UI as content.

---

## 7. Responsive rules

- `<640` (mobile): single column. Gutters are 20px. Buttons are full width in the hero and final CTA. The fact strip is 2×2. Use cases are healthcare, then a 2×2 grid. Demos scroll horizontally. Night cards, trust cards and steps stack.
- `640–1023` (tablet): two columns where natural (fact strip 4-up if it fits, industry tiles 2-up with healthcare full width, demos 2-up, night cards 1-up with the illustration beside the text). The hero stays single column, with the card centred at a maximum of 440px (current behaviour).
- `≥1024`: the layout as in `reference/desktop.html`.
- The hero H1 must never overflow. At 1024–1279 reduce it to about 56px.

## 8. Motion
- Keep the existing `Reveal` entrance for sections. Add a subtle hover lift to cards: `translateY(-2px)` plus a slightly stronger shadow, 160ms.
- Keep the `.haab-live-dot` pulse on the secondary CTA and the LIVE pills.
- Everything respects the existing `prefers-reduced-motion` block.

## 9. Accessibility checklist
- Text contrast is at least 4.5:1 (3:1 at 24px and above). The pairs in the tokens file have been checked; don't put white text on coral-500/600.
- Real `<a>`/`<button>` elements everywhere, and touch targets of at least 44px.
- One `<h1>`, and the H2s stay in order.
- Decorative SVGs, glows and mock UI are `aria-hidden`.
- `<html lang>` still follows the language switch.

## 10. Definition of done
- Visual match at 1440 and 390 against the reference files (take Playwright screenshots and compare them side by side).
- `hero-preview.tsx` has no diff. Booking-flow files have no diff. The `:root` block in `globals.css` has no diff.
- EN and ES both render with no missing keys (`translations.test.ts` passes).
- `npm run ci` passes (typecheck, lint, coverage tests, build).
- Lighthouse on `/`: no drop in Performance or Accessibility versus `main`. The fonts are `display: swap` via next/font.
