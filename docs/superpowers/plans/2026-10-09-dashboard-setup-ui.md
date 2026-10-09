# Dashboard Set-up UI (PR 3 of 5) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the Set up sections — Services, Availability, Appearance, Integrations, Settings — and the business-type flow onto the `app-ui` kit. Add confirmations before deleting a service, disconnecting Google Calendar and resetting setup.

**Architecture:** Same seam as PR 2. Presentational provider components are restyled in place, and `renderAppearance` is extracted from the module into `AppearanceSection`. Form controls use `Field` + `Input`/`Select`/`Textarea`/`Switch`/`RadioCards`, and settings pages use `FormSection` stacks. Destructive actions go through `ConfirmDialog`, with state local to the component that owns the button.

**Tech Stack:** Next.js 16, React 19, Tailwind 4.2, Vitest (node, `renderToStaticMarkup`), Playwright.

**Spec:** `docs/superpowers/specs/2026-10-09-dashboard-tailwind-ui-design.md` (§7 Services / Availability / Appearance / Integrations / Settings, Delivery item 3).

## Global Constraints

Same as PR 2:
- No new dependencies.
- Migrated files use only kit + `app-*` tokens. They are appended to `MIGRATED` (token test) and `MIGRATED_TO_APP_UI` (ESLint).
- Public rendering is unchanged; the opt-in public screenshot guard must still match `main`.
- New strings go in `dashboard-copy.ts` in en + es.
- 44px targets below `sm`; focus rings everywhere.
- Close and dismiss labels are required.

**Shared editors:** `ProviderInfoForm`, `ServiceEditor`, `AvailabilityEditor` and `VerticalPicker` also appear in the setup wizard, which PR 5 restyles. Until then the wizard shows these restyled editors inside its old frame. That is expected.

## Review Focus

1. **Deleting a service, disconnecting Google and resetting setup** must not happen without a confirmation. Cancelling the confirmation must change nothing.
2. **The keep-one-service rule** (the last service can't be deleted) and the existing delete errors still show.
3. **The custom slug editor:** errors stay inline, Save URL keeps its disabled rule, and the e2e `input[name="publicSlug"]` still works.
4. **Settings and Appearance at 390px:** `FormSection` stacks with no horizontal overflow.
5. **Spanish:** every new confirm title, body and label comes from `dashboard-copy` es.

## Tasks

Each task: RED (append files to the token `MIGRATED` list, plus new behavior tests), then GREEN (rewrite markup on the kit, keeping every existing assertion about content and behavior), then lint, then commit.

1. **Copy:** confirm titles, bodies and labels for service delete, Google disconnect and setup reset, in en + es.
2. **Profile fields:** `ProviderInfoForm`, `TimeZoneField` (the time-zone prompt becomes a warning `Alert`).
3. **Services:** `ServiceEditor`.
   - List: `Card` + `StackedList`.
   - Editor: `Card` with `Fieldset` groups, booking-type choice as `SegmentedControl`, and a footer with Reset/Save.
   - **Delete opens a `ConfirmDialog`.**
4. **Availability:**
   - `AvailabilitySettingsSection` → `Card`.
   - `AvailabilityEditor`: each day row has a `Switch`, start/end time `Input`s, and breaks with a trash `IconButton`.
   - `DailyBookingLimitField`: `Switch` + number `Input`.
5. **Appearance:**
   - Extract `AppearanceSection`.
   - `LogoImageUploader`/`HeaderImageUploader`: preview, Upload/Remove buttons, dashed drop zone.
   - `ProviderAppearanceForm` fields.
   - `ThemeSettingsSection`: `RadioCards`; swatches keep the public theme colors.
   - `ClientLanguageField` → `Select`; `DashboardLanguageField` → `LanguageToggle`.
6. **Integrations:** `ProviderIntegrationsSection`, `GoogleCalendarCapabilities` (Card, status Badge, capability list). **Disconnect opens a `ConfirmDialog`.**
7. **Settings:**
   - `ProviderSettingsSurface` as a `FormSection` stack.
   - `PublicSlugEditor`: URL-prefix `Input` + Save.
   - `BookingRetentionSettings`: card with a `Switch`.
   - Business type row.
   - Danger zone. **Reset opens a `ConfirmDialog`.**
8. **Business type:**
   - `BusinessTypeSwitch` and `VerticalPicker` as cards.
   - `ChangeBusinessTypeDialog` on `Dialog`: blocking bookings as a `StackedList`, the summary as a `DescriptionList`.
9. **Gates:**
   - lint list;
   - e2e: service delete asks first and keeping changes nothing;
   - `npm run ci`, fresh-seed full e2e, public visual guard vs `main`, visual QA at 390/1280;
   - whole-branch review → fix pass → PR → CI → squash merge → delete branch.
