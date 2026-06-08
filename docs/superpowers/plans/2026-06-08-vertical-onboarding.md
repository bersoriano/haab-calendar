# Vertical Onboarding (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a first-run welcome screen where a provider picks one of three industry verticals (Healthcare / Spaces / Professional services); selecting one seeds optimized services + weekly availability and removes the manual Services step from the setup wizard.

**Architecture:** A new pure-data seam `config/verticals.ts` defines the 3 verticals. Store helpers in `lib/store.ts` materialize a vertical into the offline-first `ModuleStore` (which gains a persisted `vertical` field). The monolith `components/haab-booking-module.tsx` renders a `VerticalPicker` welcome before the wizard, applies the chosen preset, runs a 3-step wizard (Provider → Availability → Done), and shows seeded services read-only on Done. `ServiceEditor` accepts vertical-specific placeholder hints.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind, Vitest. Spec: `docs/superpowers/specs/2026-06-08-vertical-onboarding-design.md`.

---

## File Structure

- `lib/types.ts` — add `VERTICAL_IDS` + `VerticalId`; add `vertical?: VerticalId` to `ModuleStore`.
- `config/verticals.ts` (new) — `Vertical` / `VerticalHints` interfaces + `VERTICALS` data (the seam).
- `lib/store.ts` — `normalizeVertical`, `materializeVerticalServices`, `applyVerticalToStore`; wire `vertical` into `createEmptyStore` + `normalizeStore`.
- `lib/__tests__/store.test.ts` — characterization tests for the new helpers.
- `components/provider/VerticalPicker.tsx` (new) — presentational 3-card picker.
- `components/provider/ServiceEditor.tsx` — add optional `hints` prop for placeholders.
- `components/haab-booking-module.tsx` — `applyVertical` handler, `renderWelcome`, render gate, 3-step wizard renumber, Done services review, Services-tab hints.

---

## Task 1: Add vertical types

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Add the id union near the top of the types (after the `SetupStep` line, ~line 14)**

```ts
export const VERTICAL_IDS = ["healthcare", "spaces", "professional"] as const;
export type VerticalId = (typeof VERTICAL_IDS)[number];
```

- [ ] **Step 2: Add `vertical` to `ModuleStore` (the `type ModuleStore = {...}` block, ~line 74)**

Change:
```ts
export type ModuleStore = {
  provider: ProviderInfo;
  services: Service[];
  availability: WeeklyAvailability;
  bookings: BookingRecord[];
  bookingHolds: BookingHoldRecord[];
  setupComplete: boolean;
};
```
to:
```ts
export type ModuleStore = {
  provider: ProviderInfo;
  services: Service[];
  availability: WeeklyAvailability;
  bookings: BookingRecord[];
  bookingHolds: BookingHoldRecord[];
  setupComplete: boolean;
  vertical?: VerticalId;
};
```

- [ ] **Step 3: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (no errors).

- [ ] **Step 4: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add VerticalId type and ModuleStore.vertical field"
```

---

## Task 2: Create the verticals config (the seam)

**Files:**
- Create: `config/verticals.ts`

- [ ] **Step 1: Write `config/verticals.ts`**

```ts
import type { ServiceDraft, VerticalId, WeeklyAvailability } from "../lib/types";

export interface VerticalHints {
  serviceName: string;
  description: string;
  capacity: string;
  cost: string;
}

export interface Vertical {
  id: VerticalId;
  label: string;
  tagline: string;
  description: string;
  services: ServiceDraft[];
  availability: WeeklyAvailability;
  hints: VerticalHints;
}

const WEEKDAYS_9_17: WeeklyAvailability = {
  sunday: { enabled: false, startTime: "09:00", endTime: "17:00" },
  monday: { enabled: true, startTime: "09:00", endTime: "17:00" },
  tuesday: { enabled: true, startTime: "09:00", endTime: "17:00" },
  wednesday: { enabled: true, startTime: "09:00", endTime: "17:00" },
  thursday: { enabled: true, startTime: "09:00", endTime: "17:00" },
  friday: { enabled: true, startTime: "09:00", endTime: "17:00" },
  saturday: { enabled: false, startTime: "09:00", endTime: "17:00" },
};

const ALL_DAYS_8_22: WeeklyAvailability = {
  sunday: { enabled: true, startTime: "08:00", endTime: "22:00" },
  monday: { enabled: true, startTime: "08:00", endTime: "22:00" },
  tuesday: { enabled: true, startTime: "08:00", endTime: "22:00" },
  wednesday: { enabled: true, startTime: "08:00", endTime: "22:00" },
  thursday: { enabled: true, startTime: "08:00", endTime: "22:00" },
  friday: { enabled: true, startTime: "08:00", endTime: "22:00" },
  saturday: { enabled: true, startTime: "08:00", endTime: "22:00" },
};

const WEEKDAYS_9_18: WeeklyAvailability = {
  sunday: { enabled: false, startTime: "09:00", endTime: "18:00" },
  monday: { enabled: true, startTime: "09:00", endTime: "18:00" },
  tuesday: { enabled: true, startTime: "09:00", endTime: "18:00" },
  wednesday: { enabled: true, startTime: "09:00", endTime: "18:00" },
  thursday: { enabled: true, startTime: "09:00", endTime: "18:00" },
  friday: { enabled: true, startTime: "09:00", endTime: "18:00" },
  saturday: { enabled: false, startTime: "09:00", endTime: "18:00" },
};

export const VERTICALS: Vertical[] = [
  {
    id: "healthcare",
    label: "Healthcare",
    tagline: "For doctors and medical specialists",
    description: "Timed consultations and follow-ups on a weekday schedule.",
    availability: WEEKDAYS_9_17,
    services: [
      {
        name: "New patient consultation",
        bookingType: "appointment",
        durationMinutes: 30,
        description: "A focused first consultation for history, goals, and next steps.",
        capacity: "1 patient",
        cost: "$120",
        notes: "",
      },
      {
        name: "Follow-up visit",
        bookingType: "appointment",
        durationMinutes: 15,
        description: "A short check-in to review progress and adjust care.",
        capacity: "1 patient",
        cost: "$60",
        notes: "",
      },
    ],
    hints: {
      serviceName: "Annual check-up",
      description: "What this visit covers.",
      capacity: "1 patient",
      cost: "$120 / visit",
    },
  },
  {
    id: "spaces",
    label: "Spaces",
    tagline: "For courts, venues, and shared offices",
    description: "Hourly rentals and full-day reservations, open every day.",
    availability: ALL_DAYS_8_22,
    services: [
      {
        name: "Court / space rental",
        bookingType: "appointment",
        durationMinutes: 60,
        description: "Reserve the space by the hour for training, matches, or private use.",
        capacity: "Up to 4 people",
        cost: "$40 / hour",
        notes: "",
      },
      {
        name: "Full-day venue",
        bookingType: "full-day",
        durationMinutes: 60,
        description: "Exclusive full-day reservation for events and private functions.",
        capacity: "Up to 100 guests",
        cost: "Full-day package",
        notes: "",
      },
    ],
    hints: {
      serviceName: "Court rental",
      description: "What the booking includes.",
      capacity: "Up to 4 people",
      cost: "$40 / hour",
    },
  },
  {
    id: "professional",
    label: "Professional services",
    tagline: "For advisors, accountants, and consultants",
    description: "Strategy sessions and quick consults on a weekday schedule.",
    availability: WEEKDAYS_9_18,
    services: [
      {
        name: "Strategy session",
        bookingType: "appointment",
        durationMinutes: 60,
        description: "Structured planning covering goals, priorities, and action items.",
        capacity: "1 client",
        cost: "$200",
        notes: "",
      },
      {
        name: "Quick consult",
        bookingType: "appointment",
        durationMinutes: 30,
        description: "A short session to answer a focused question.",
        capacity: "1 client",
        cost: "$90",
        notes: "",
      },
    ],
    hints: {
      serviceName: "Strategy session",
      description: "What this session covers.",
      capacity: "1 client",
      cost: "$200 / session",
    },
  },
];
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add config/verticals.ts
git commit -m "feat: add verticals config seam with 3 industry presets"
```

---

## Task 3: Store helpers (TDD)

**Files:**
- Modify: `lib/store.ts`
- Test: `lib/__tests__/store.test.ts`

- [ ] **Step 1: Write failing tests — append to `lib/__tests__/store.test.ts`**

First ensure these imports exist at the top of the test file (add any missing):
```ts
import {
  createEmptyStore,
  normalizeStore,
  materializeVerticalServices,
  applyVerticalToStore,
  normalizeVertical,
} from "@/lib/store";
import { VERTICALS } from "@/config/verticals";
```

Then add:
```ts
describe("vertical helpers", () => {
  it("normalizeVertical accepts known ids and rejects unknown", () => {
    expect(normalizeVertical("healthcare")).toBe("healthcare");
    expect(normalizeVertical("spaces")).toBe("spaces");
    expect(normalizeVertical("nope")).toBeUndefined();
    expect(normalizeVertical(undefined)).toBeUndefined();
    expect(normalizeVertical(null)).toBeUndefined();
  });

  it("materializeVerticalServices assigns ids and drops duration for full-day", () => {
    const spaces = VERTICALS.find((v) => v.id === "spaces")!;
    const result = materializeVerticalServices(spaces.services);

    expect(result).toHaveLength(2);
    expect(result.every((s) => typeof s.id === "string" && s.id.length > 0)).toBe(true);

    const appointment = result.find((s) => s.bookingType === "appointment")!;
    const fullDay = result.find((s) => s.bookingType === "full-day")!;
    expect(appointment.durationMinutes).toBe(60);
    expect(fullDay.durationMinutes).toBeUndefined();
  });

  it("applyVerticalToStore seeds services + availability + vertical, preserves the rest", () => {
    const base = createEmptyStore();
    base.provider.fullName = "Keep Me";
    base.setupComplete = false;
    const healthcare = VERTICALS.find((v) => v.id === "healthcare")!;

    const next = applyVerticalToStore(base, healthcare);

    expect(next.vertical).toBe("healthcare");
    expect(next.services).toHaveLength(2);
    expect(next.availability.saturday.enabled).toBe(false);
    expect(next.provider.fullName).toBe("Keep Me");
    expect(next.setupComplete).toBe(false);
    expect(next.bookings).toEqual([]);
  });

  it("normalizeStore round-trips vertical and rejects unknown ids", () => {
    const withVertical = normalizeStore({ ...createEmptyStore(), vertical: "professional" });
    expect(withVertical.vertical).toBe("professional");

    const bad = normalizeStore({ ...createEmptyStore(), vertical: "garbage" } as never);
    expect(bad.vertical).toBeUndefined();

    expect(createEmptyStore().vertical).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/__tests__/store.test.ts`
Expected: FAIL (`materializeVerticalServices`/`applyVerticalToStore`/`normalizeVertical` not exported).

- [ ] **Step 3: Implement helpers in `lib/store.ts`**

Add `createId` to the utils import (line 1):
```ts
import { slugify, currentTimestamp, createId } from "./utils";
```
Add to the types import (the `import type { ... } from "./types";` block) the `Service`, `VerticalId` names if not already present (`Service` is already imported; add `VerticalId`):
```ts
import type {
  BookingHoldRecord,
  BookingRecord,
  ModuleStore,
  ProviderInfo,
  Service,
  ServiceDraft,
  VerticalId,
  WeeklyAvailability,
  BookingFlow,
} from "./types";
```
Add a type-only import for `Vertical` plus the id list (after the types import block):
```ts
import { VERTICAL_IDS } from "./types";
import type { Vertical } from "../config/verticals";
```
Add the helpers (anywhere after `createEmptyStore`):
```ts
export function normalizeVertical(value?: string | null): VerticalId | undefined {
  return (VERTICAL_IDS as readonly string[]).includes(value ?? "")
    ? (value as VerticalId)
    : undefined;
}

export function materializeVerticalServices(drafts: ServiceDraft[]): Service[] {
  return drafts.map((draft) => ({
    id: createId("svc"),
    name: draft.name,
    bookingType: draft.bookingType,
    durationMinutes: draft.bookingType === "full-day" ? undefined : draft.durationMinutes,
    description: draft.description,
    capacity: draft.capacity,
    cost: draft.cost,
    notes: draft.notes,
  }));
}

export function applyVerticalToStore(store: ModuleStore, vertical: Vertical): ModuleStore {
  return {
    ...store,
    vertical: vertical.id,
    services: materializeVerticalServices(vertical.services),
    availability: normalizeAvailability(vertical.availability),
  };
}
```

- [ ] **Step 4: Wire `vertical` into `createEmptyStore` and `normalizeStore`**

In `createEmptyStore()` return object, add the field after `setupComplete: false,`:
```ts
    setupComplete: false,
    vertical: undefined,
```
In `normalizeStore()` return object, add after the `setupComplete:` line:
```ts
    setupComplete: Boolean(source?.setupComplete ?? empty.setupComplete),
    vertical: normalizeVertical(source?.vertical),
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run lib/__tests__/store.test.ts`
Expected: PASS (all green).

- [ ] **Step 6: Run full suite + typecheck**

Run: `npm test && npx tsc --noEmit`
Expected: all tests pass, no type errors.

- [ ] **Step 7: Commit**

```bash
git add lib/store.ts lib/__tests__/store.test.ts
git commit -m "feat: add vertical store helpers (materialize, apply, normalize)"
```

---

## Task 4: VerticalPicker component

**Files:**
- Create: `components/provider/VerticalPicker.tsx`

- [ ] **Step 1: Write `components/provider/VerticalPicker.tsx`**

```tsx
"use client";

import type { Vertical } from "@/config/verticals";
import type { VerticalId } from "@/lib/types";
import { cn } from "@/lib/utils";
import { adminInsetClass } from "@/components/provider/adminGlass";

export function VerticalPicker({
  verticals,
  onSelect,
}: {
  verticals: Vertical[];
  onSelect: (id: VerticalId) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {verticals.map((vertical) => (
        <button
          key={vertical.id}
          type="button"
          onClick={() => onSelect(vertical.id)}
          className={cn(
            adminInsetClass,
            "flex flex-col gap-2 p-6 text-left transition hover:shadow-[0_18px_48px_rgba(15,23,42,0.10)]",
          )}
        >
          <span className="text-lg font-semibold text-[var(--ink)]">{vertical.label}</span>
          <span className="text-sm font-medium text-[var(--accent)]">{vertical.tagline}</span>
          <span className="mt-1 text-sm leading-6 text-[var(--muted)]">{vertical.description}</span>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck + lint**

Run: `npx tsc --noEmit && npx eslint components/provider/VerticalPicker.tsx`
Expected: PASS, no warnings.

- [ ] **Step 3: Commit**

```bash
git add components/provider/VerticalPicker.tsx
git commit -m "feat: add VerticalPicker welcome-screen component"
```

---

## Task 5: ServiceEditor hints prop

**Files:**
- Modify: `components/provider/ServiceEditor.tsx`

- [ ] **Step 1: Add the `hints` prop to the type + destructure**

Add `VerticalHints` to the imports at the top:
```ts
import type { Vertical, VerticalHints } from "@/config/verticals";
```
(If only `VerticalHints` is needed, import just it: `import type { VerticalHints } from "@/config/verticals";`)

In the props destructure, add `hints`:
```ts
  onAppendTemplate,
  disabled = false,
  showQuickTemplates = true,
  hints,
}: {
```
In the props type object, add:
```ts
  showQuickTemplates?: boolean;
  hints?: VerticalHints;
}) {
```

- [ ] **Step 2: Use hints for the four placeholders**

Replace the `placeholder` attributes:
- Service name input: `placeholder={hints?.serviceName ?? "Court Rental"}`
- Description textarea: `placeholder={hints?.description ?? "Explain what the booking covers in one or two lines."}`
- Capacity input: `placeholder={hints?.capacity ?? "Max 12 people"}`
- Total input: `placeholder={hints?.cost ?? "$80 / session"}`

- [ ] **Step 3: Verify typecheck + lint**

Run: `npx tsc --noEmit && npx eslint components/provider/ServiceEditor.tsx`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/provider/ServiceEditor.tsx
git commit -m "feat: ServiceEditor accepts vertical-specific placeholder hints"
```

---

## Task 6: Wire applyVertical + welcome gate into the monolith

**Files:**
- Modify: `components/haab-booking-module.tsx`

- [ ] **Step 1: Add imports**

In the import that already pulls `adminBarClass, ... adminPanelClass` from `@/components/provider/adminGlass` is unrelated; instead add these new imports near the other `@/components/provider/*` imports:
```ts
import { VerticalPicker } from "@/components/provider/VerticalPicker";
import { VERTICALS } from "@/config/verticals";
import { applyVerticalToStore } from "@/lib/store";
```
`applyVerticalToStore` may be merged into the existing `@/lib/store` import block if one exists; otherwise add the line above. Also add `VerticalId` to the existing `@/lib/types` type import block:
```ts
  SurfaceMode,
  VerticalId,
  WeekdayKey,
```

- [ ] **Step 2: Read the store `vertical` value (near line 241, after `const availability = activeStore.availability;`)**

```ts
  const vertical = activeStore.vertical;
```

- [ ] **Step 3: Add the `applyVertical` handler (next to `resetStandaloneSetup`, ~line 974)**

```ts
  function applyVertical(id: VerticalId) {
    if (integratedMode) {
      return;
    }

    const preset = VERTICALS.find((item) => item.id === id);
    if (!preset) {
      return;
    }

    setSetupError(null);
    setSetupStep(1);
    actions.updateStandaloneStore((current) => applyVerticalToStore(current, preset));
  }
```

- [ ] **Step 4: Add `renderWelcome` (just above `function renderSetupWizard()`, ~line 1455)**

```tsx
  function renderWelcome() {
    return (
      <div className={cn(adminPanelClass, "p-6 sm:p-8")}>
        <SectionTitle
          eyebrow="Welcome"
          title="What kind of business is this?"
          body="Pick your industry and we'll set up your services and weekly hours. You can edit everything afterward."
        />
        <div className="mt-6">
          <VerticalPicker verticals={VERTICALS} onSelect={applyVertical} />
        </div>
      </div>
    );
  }
```

- [ ] **Step 5: Update the setup render gate (~line 3621)**

Change:
```tsx
  if (isSetupOpen) {
    return (
      <section className={cn(publicShellClass, "p-5 sm:p-8")}>
        {renderSetupWizard()}
      </section>
    );
  }
```
to:
```tsx
  if (isSetupOpen) {
    return (
      <section className={cn(publicShellClass, "p-5 sm:p-8")}>
        {vertical ? renderSetupWizard() : renderWelcome()}
      </section>
    );
  }
```

- [ ] **Step 6: Verify typecheck + lint**

Run: `npx tsc --noEmit && npx eslint components/haab-booking-module.tsx`
Expected: PASS. (`renderSetupWizard` still references the old Services step — that's fixed in Task 7. No type errors expected here because the step blocks still compile.)

- [ ] **Step 7: Commit**

```bash
git add components/haab-booking-module.tsx
git commit -m "feat: show vertical welcome screen before the setup wizard"
```

---

## Task 7: Reduce the wizard to 3 steps (Provider → Availability → Done)

**Files:**
- Modify: `components/haab-booking-module.tsx`

- [ ] **Step 1: Update the step indicator array (~line 1466)**

Change:
```tsx
              ["1", "Provider"],
              ["2", "Services"],
              ["3", "Availability"],
              ["4", "Done"],
```
to:
```tsx
              ["1", "Provider"],
              ["2", "Availability"],
              ["3", "Done"],
```

- [ ] **Step 2: Delete the Services wizard step block**

Remove the entire block (the `{setupStep === 2 ? ( ... ServiceEditor ... ) : null}` that renders `<ServiceEditor ... onAppendTemplate={appendQuickTemplate} />`). It looks like:
```tsx
        {setupStep === 2 ? (
          <div className="mt-8">
            <ServiceEditor
              services={services}
              serviceDraft={serviceDraft}
              onDraftChange={setServiceDraft}
              editingServiceId={editingServiceId}
              onUpsert={upsertService}
              onReset={resetServiceEditor}
              onEdit={beginEditingService}
              onRemove={removeService}
              onAppendTemplate={appendQuickTemplate}
            />
          </div>
        ) : null}
```
Delete it entirely (including the trailing blank line).

- [ ] **Step 3: Renumber the Availability step from 3 to 2**

Find `{setupStep === 3 ? (` (the block whose `SectionTitle` title is "Set the weekly availability schedule" and renders `<AvailabilityEditor .../>`). Change its condition to:
```tsx
        {setupStep === 2 ? (
```

- [ ] **Step 4: Renumber the Done step from 4 to 3**

Find `{setupStep === 4 ? (` (the block with `eyebrow="Ready"` / title "Your booking page is ready"). Change its condition to:
```tsx
        {setupStep === 3 ? (
```

- [ ] **Step 5: Update the footer Continue gate (~line 1586)**

Change:
```tsx
          {setupStep < 4 ? (
```
to:
```tsx
          {setupStep < 3 ? (
```

- [ ] **Step 6: Update `validateSetup` (~line 987)**

Replace the body so step 2 validates availability (moved from old step 3) and the service-count gate + old step-3 number are removed:
```ts
  function validateSetup(step: SetupStep) {
    if (step === 1) {
      if (!provider.fullName.trim() || !provider.businessName.trim() || !provider.email.trim()) {
        return "Provider name, business name, and email are all required.";
      }
    }

    if (step === 2) {
      const hasEnabledDay = WEEKDAY_KEYS.some((day) => availability[day].enabled);

      if (!hasEnabledDay) {
        return "Enable at least one weekday so clients can book.";
      }

      const invalidWindow = WEEKDAY_KEYS.some(
        (day) =>
          availability[day].enabled &&
          toMinutes(availability[day].endTime) <= toMinutes(availability[day].startTime),
      );

      if (invalidWindow) {
        return "Each enabled day needs an end time later than its start time.";
      }
    }

    return null;
  }
```
NOTE: keep whatever the exact existing return string/message is for the invalid-window branch — match the current text rather than inventing new copy. If the existing block already returns after the `invalidWindow` check, mirror it exactly.

- [ ] **Step 7: Update `goToNextSetupStep` bound (~line 1028)**

Change:
```ts
    setSetupStep((current) => (current < 4 ? ((current + 1) as SetupStep) : current));
```
to:
```ts
    setSetupStep((current) => (current < 3 ? ((current + 1) as SetupStep) : current));
```

- [ ] **Step 8: Update `completeSetup` final step (~line 930)**

Change `setSetupStep(4);` to:
```ts
    setSetupStep(3);
```

- [ ] **Step 9: Narrow the `SetupStep` type**

In `lib/types.ts` change:
```ts
export type SetupStep = 1 | 2 | 3 | 4;
```
to:
```ts
export type SetupStep = 1 | 2 | 3;
```

- [ ] **Step 10: Verify typecheck + lint + tests**

Run: `npx tsc --noEmit && npx eslint components/haab-booking-module.tsx && npm test`
Expected: PASS. If `tsc` flags a `4` no longer assignable to `SetupStep`, fix that line to `3` (it is the `completeSetup` call from Step 8 if missed).

- [ ] **Step 11: Commit**

```bash
git add components/haab-booking-module.tsx lib/types.ts
git commit -m "feat: reduce setup wizard to Provider/Availability/Done"
```

---

## Task 8: Done-step service review + Services-tab hints

**Files:**
- Modify: `components/haab-booking-module.tsx`

- [ ] **Step 1: Add a read-only seeded-services summary to the Done step**

Inside the `{setupStep === 3 ? (` Done block, immediately after the public-booking-URL inset `<div>` (the one showing `{publicUrl}`) and before the actions row (`<div className="mt-6 flex flex-wrap gap-3">`), insert:
```tsx
              <div className="mt-6 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
                  Your services
                </p>
                {services.map((service) => (
                  <div
                    key={service.id}
                    className={cn(adminInsetClass, "flex flex-wrap items-center gap-2 px-4 py-3")}
                  >
                    <span className="text-sm font-semibold text-[var(--ink)]">{service.name}</span>
                    <ToneBadge tone={bookingTypeTone(service.bookingType)}>
                      {getBookingTypeLabel(service.bookingType)}
                    </ToneBadge>
                    <ToneBadge tone="neutral">{formatDuration(service)}</ToneBadge>
                  </div>
                ))}
                <p className="text-sm text-[var(--muted)]">
                  Edit these anytime from the Services tab.
                </p>
              </div>
```
(`ToneBadge`, `bookingTypeTone`, `getBookingTypeLabel`, `formatDuration`, `adminInsetClass` are all already imported in this file.)

- [ ] **Step 2: Pass vertical hints into the Services-tab ServiceEditor**

In `renderServices()`, change the `<ServiceEditor ... />` call to add the `hints` prop:
```tsx
      <ServiceEditor
        services={services}
        serviceDraft={serviceDraft}
        onDraftChange={setServiceDraft}
        editingServiceId={editingServiceId}
        onUpsert={upsertService}
        onReset={resetServiceEditor}
        onEdit={beginEditingService}
        onRemove={removeService}
        onAppendTemplate={appendQuickTemplate}
        disabled={integratedMode}
        hints={VERTICALS.find((item) => item.id === vertical)?.hints}
      />
```

- [ ] **Step 3: Verify typecheck + lint + tests**

Run: `npx tsc --noEmit && npx eslint components/haab-booking-module.tsx && npm test`
Expected: PASS, 118+ tests green.

- [ ] **Step 4: Commit**

```bash
git add components/haab-booking-module.tsx
git commit -m "feat: review seeded services on Done; vertical hints in Services tab"
```

---

## Task 9: Full verification (build + live smoke)

**Files:** none (verification only)

- [ ] **Step 1: Full static checks**

Run: `npx tsc --noEmit && npx eslint . && npm test && npm run build`
Expected: all pass; build succeeds.

- [ ] **Step 2: Live smoke — fresh first run**

Start dev server (`npm run dev`) if not running. In a logged-in provider session whose store has no vertical and `setupComplete=false` (use a fresh account, or in DevTools console set the store key `haab-calendar-dev-clean` to a value with `setupComplete:false` and remove `vertical`, then reload). Confirm:
- Welcome screen shows 3 cards (Healthcare / Spaces / Professional services).
- Clicking a card enters the wizard at step Provider; the 3-step indicator reads Provider / Availability / Done.
- Step Availability is pre-seeded with the vertical's hours (Spaces shows weekends enabled, 08:00–22:00).
- Done step lists the seeded services read-only.
- Publish → workspace; Services tab shows the 2 seeded services; the Add-service form placeholders match the vertical hints.

- [ ] **Step 3: Live smoke — existing provider unaffected**

With a store that has `setupComplete=true` (e.g. seeded Demo Clinic), confirm it lands directly in the workspace (no welcome screen) and the Services tab works with generic placeholders.

- [ ] **Step 4: Live smoke — reset re-entry**

Settings → Reset standalone setup → confirm the welcome screen reappears (vertical cleared).

- [ ] **Step 5: Final commit (if any verification fixups were needed)**

```bash
git add -A
git commit -m "chore: vertical onboarding verification fixups"
```
(Skip if nothing changed.)

---

## Self-Review Notes

- **Spec coverage:** verticals data (Task 2), `ModuleStore.vertical` + types (Task 1), store helpers + tests (Task 3), welcome picker (Task 4 + 6), 3-step wizard / removed Services step (Task 7), Done review (Task 8), hints (Task 5 + 8), back-compat + reset re-entry (Task 9 smoke). Terminology is out of scope (Phase 2) — not planned here.
- **Type consistency:** `VerticalId`, `Vertical`, `VerticalHints`, `materializeVerticalServices`, `applyVerticalToStore`, `normalizeVertical` names are used identically across tasks. `SetupStep` narrowed to `1|2|3` in Task 7 after all `4` references are removed.
- **Placeholder scan:** none — every step has concrete code or exact commands. The one judgement note (Task 7 Step 6) instructs matching the existing invalid-window message verbatim rather than inventing copy.
