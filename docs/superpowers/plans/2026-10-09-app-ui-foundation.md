# App UI Foundation (PR 1 of 5) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the `app-*` design tokens, the `components/app-ui` kit, toasts, and the restyled app shell (sidebar, drawer, top bar, banners, footer, save bar) so PRs 2–5 can migrate each surface onto them.

**Architecture:** Tailwind v4 `@theme` tokens in their own `--color-app-*` namespace (public themes never touch them); a server-renderable kit of small components whose class recipes live in pure functions; native `<dialog>` and form controls for behavior; a context-based toast queue driven by a pure reducer. The shell keeps its structure and behavior and swaps its styling onto the kit.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS 4.2, Phosphor icons, Vitest 4 (`renderToStaticMarkup`, node env), Playwright, ESLint 9 flat config.

**Spec:** `docs/superpowers/specs/2026-10-09-dashboard-tailwind-ui-design.md` (sections 1–5, Testing, Delivery item 1).

## Global Constraints

- No new dependencies.
- In-scope files use only `app-*` tokens: no hex literals, no `rgba(`, no raw Tailwind palette classes (`gray-500`, `violet-700`, …), no `text-white`/`bg-white`, no legacy `var(--ink)`-style variables.
- Public files are not modified: `components/booking/**`, `components/landing/**`, `components/ui/**`, `app/[verticalSegment]/**`, `app/public/**`.
- Controls: `h-11` below `sm`, `h-9` (`sm` size: `h-8`) from `sm`.
- Focus: `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent` on every interactive element.
- Dashboard copy stays en/es in `components/provider/dashboard-copy.ts`; super admin stays English.
- Component tests render with `renderToStaticMarkup` in the node environment; `next/link` is mocked as in `components/app-shell/__tests__/app-shell.test.tsx`.
- Commits: Conventional Commits, ending with the session attribution lines.
- Work on branch `feat/app-ui-foundation`; never push to `main`.

## Review Focus

1. **Long text in the sidebar** (a 60-character business name or email) must truncate with a `title`, never push the sign-out button out of a 272px sidebar or a 288px drawer. Test in Task 8.
2. **A dialog opened from server markup** (`open` already true on first render) must not throw `InvalidStateError` from calling `showModal()` on an element that already has `open`. The dialog never renders the `open` attribute itself. Test in Task 6.
3. **Two `ToastProvider`s nested** (dashboard shell + module) must yield exactly one live region, or a screen reader announces every toast twice. Test in Task 7.
4. **Same save message twice in a row** ("Saved." after "Saved.") must still toast the second time; the module clears the message to `null` between saves, so the effect keys on the transition. Test (e2e) in Task 12.
5. **Spanish workspace** must get Spanish toast and dismiss strings, never English fallbacks. Test in Task 9.

---

## File Structure

| Path | Responsibility |
|---|---|
| `app/globals.css` | `@theme` block: `app-*` colors, overlay animations |
| `lib/format.ts` | `StatusTone` type, `bookingStatusBadgeTone`, `bookingTypeBadgeTone` |
| `components/app-ui/styles.ts` | Pure class recipes: `focusRing`, `buttonStyles`, `inputStyles`, `badgeStyles`, `cardStyles`, `segmentStyles` |
| `components/app-ui/Button.tsx` | `Button`, `ButtonLink`, `IconButton` |
| `components/app-ui/Badge.tsx` | `Badge` |
| `components/app-ui/Card.tsx` | `Card`, `CardHeader`, `CardBody`, `CardFooter`, `SectionHeading` |
| `components/app-ui/Stat.tsx` | `StatGroup`, `Stat` |
| `components/app-ui/Avatar.tsx` | `Avatar` |
| `components/app-ui/Skeleton.tsx` | `Skeleton` |
| `components/app-ui/EmptyState.tsx` | `EmptyState` |
| `components/app-ui/Alert.tsx` | `Alert` |
| `components/app-ui/StackedList.tsx` | `StackedList`, `StackedListItem`, `StackedListHeading` |
| `components/app-ui/Table.tsx` | `Table`, `THead`, `TBody`, `Tr`, `Th`, `Td` |
| `components/app-ui/DescriptionList.tsx` | `DescriptionList`, `DescriptionItem` |
| `components/app-ui/Field.tsx` | `Field`, `useFieldControl` (id/aria wiring context) |
| `components/app-ui/Input.tsx` | `Input`, `Textarea`, `Select`, `Checkbox`, `Switch` |
| `components/app-ui/Fieldset.tsx` | `Fieldset`, `FormSection` |
| `components/app-ui/SegmentedControl.tsx` | `SegmentedControl` |
| `components/app-ui/RadioCards.tsx` | `RadioCards` |
| `components/app-ui/LanguageToggle.tsx` | `LanguageToggle` |
| `components/app-ui/Dialog.tsx` | `Dialog`, `DialogActions`, `ConfirmDialog`, `isBackdropClick` |
| `components/app-ui/toast-state.ts` | `toastReducer`, constants, types |
| `components/app-ui/Toast.tsx` | `ToastProvider`, `useToast` |
| `components/app-ui/index.ts` | Barrel |
| `components/app-shell/AppShell.tsx` | Restyle; drawer close button outside the panel |
| `components/app-shell/SidebarNav.tsx` | Restyle; `Badge` for counts |
| `components/app-shell/ShellIcon.tsx` | Active/idle icon color |
| `components/app-shell/ShellFooter.tsx` | Restyle |
| `components/app-shell/ShellSidebarParts.tsx` | New: `ShellBrand`, `ShellWorkspace`, `ShellAccount` shared by dashboard and super admin |
| `components/provider/DashboardApp.tsx` | Sidebar/top bar/banners on the kit; `ToastProvider`; copy toast; skeleton placeholder |
| `components/provider/SaveBar.tsx` | Restyle; success → toast |
| `components/provider/dashboard-copy.ts` | `linkCopiedToast`, `dismiss` |
| `components/super-admin/SuperAdminShell.tsx` | Sidebar on the shared parts; `ToastProvider` |
| `components/haab-booking-module.tsx` | `ToastProvider` around management content in `chrome="module"` only |
| `eslint.config.mjs` | `no-restricted-imports` for migrated files |
| `components/__tests__/app-ui-tokens.test.ts` | Token presence + no raw colors in migrated files |

---

### Task 1: Tokens and badge-tone helpers

**Files:**
- Modify: `app/globals.css` (after the `@theme inline { … }` block)
- Modify: `lib/format.ts:141-155`
- Test: `components/__tests__/app-ui-tokens.test.ts`, `lib/__tests__/format.test.ts`

**Interfaces:**
- Produces: CSS utilities `bg-app-*`, `text-app-*`, `ring-app-*`, `outline-app-*`, `divide-app-*`, `border-app-*`, `accent-app-*`, `backdrop:bg-app-overlay`; animations `animate-app-drawer-in`, `animate-app-dialog-in`, `animate-app-toast-in`. `export type StatusTone = "neutral" | "accent" | "success" | "warning" | "danger" | "info" | "admin"`; `bookingStatusBadgeTone(status: BookingStatus): StatusTone`; `bookingTypeBadgeTone(type: BookingType): StatusTone`.

- [ ] **Step 1: Write the failing token test**

Create `components/__tests__/app-ui-tokens.test.ts`:

```ts
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(import.meta.dirname, "..", "..");

const REQUIRED_TOKENS = [
  "canvas", "surface", "subtle", "border", "border-strong",
  "fg", "fg-secondary", "fg-muted", "placeholder",
  "accent", "accent-hover", "accent-soft", "accent-soft-hover", "accent-on-soft", "accent-ring", "on-accent",
  "success-soft", "success-fg", "success-ring",
  "warning-soft", "warning-fg", "warning-ring",
  "danger-soft", "danger-fg", "danger-ring", "danger", "danger-hover",
  "info-soft", "info-fg", "info-ring",
  "admin-soft", "admin-fg", "admin-ring",
  "neutral-soft", "neutral-fg", "neutral-ring",
  "full-day", "chart-1", "chart-2", "overlay",
];

/**
 * Files already migrated to the app-ui kit. Each later PR appends the files
 * it migrates; the last one replaces the list with whole directories.
 */
const MIGRATED = [
  "components/app-ui",
  "components/app-shell/AppShell.tsx",
  "components/app-shell/SidebarNav.tsx",
  "components/app-shell/ShellFooter.tsx",
  "components/app-shell/ShellIcon.tsx",
  "components/app-shell/ShellSidebarParts.tsx",
  "components/provider/DashboardApp.tsx",
  "components/provider/SaveBar.tsx",
  "components/super-admin/SuperAdminShell.tsx",
];

const RAW_PALETTE =
  /\b(?:bg|text|border|ring|outline|divide|fill|stroke|from|via|to|shadow|accent|placeholder|decoration)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/;
const RAW_BLACK_WHITE = /\b(?:bg|text|border|ring)-(?:white|black)\b/;
const HEX = /#[0-9a-f]{3,8}\b/i;
const LEGACY_VAR = /var\(--(?!color-app-|font-)/;

function files(path: string): string[] {
  const full = join(root, path);
  if (statSync(full).isFile()) return [full];
  return readdirSync(full)
    .filter((name) => name !== "__tests__")
    .flatMap((name) => files(join(path, name)))
    .filter((file) => /\.(ts|tsx)$/.test(file));
}

describe("app tokens", () => {
  const css = readFileSync(join(root, "app/globals.css"), "utf8");

  it("defines every app color token in the theme", () => {
    const missing = REQUIRED_TOKENS.filter(
      (token) => !new RegExp(`--color-app-${token}:`).test(css),
    );
    expect(missing).toEqual([]);
  });

  it("keeps migrated files on app tokens only", () => {
    const offenders = MIGRATED.flatMap(files)
      .map((file) => ({ file: relative(root, file), text: readFileSync(file, "utf8") }))
      .filter(
        ({ text }) =>
          RAW_PALETTE.test(text) ||
          RAW_BLACK_WHITE.test(text) ||
          HEX.test(text) ||
          text.includes("rgba(") ||
          LEGACY_VAR.test(text),
      )
      .map(({ file }) => file);

    expect(offenders).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run components/__tests__/app-ui-tokens.test.ts`
Expected: FAIL — first test lists every token as missing; second fails with `ENOENT` for `components/app-ui` (does not exist yet).

- [ ] **Step 3: Add the tokens**

In `app/globals.css`, directly after the closing `}` of `@theme inline { … }`, add:

```css
/* Signed-in app (dashboard, super admin, setup wizard, auth). Its own
   namespace: public themes re-point --ink/--surface/--primary and must never
   reach the app. Literal values on purpose — a child project re-brands, and a
   future dark mode switches, by redefining these variables (planned as a
   [data-app-theme="dark"] block), with no markup changes. */
@theme {
  --color-app-canvas: #f9fafb;
  --color-app-surface: #ffffff;
  --color-app-subtle: #f3f4f6;
  --color-app-border: #e5e7eb;
  --color-app-border-strong: #d1d5db;
  --color-app-fg: #111827;
  --color-app-fg-secondary: #374151;
  --color-app-fg-muted: #6b7280;
  --color-app-placeholder: #9ca3af;
  --color-app-accent: #005bbf;
  --color-app-accent-hover: #1a73e8;
  --color-app-accent-soft: #e8f0fe;
  --color-app-accent-soft-hover: #d3e3fd;
  --color-app-accent-on-soft: #0b57d0;
  --color-app-accent-ring: rgb(0 91 191 / 0.2);
  --color-app-on-accent: #ffffff;
  --color-app-success-soft: #f0fdf4;
  --color-app-success-fg: #15803d;
  --color-app-success-ring: rgb(22 163 74 / 0.2);
  --color-app-warning-soft: #fffbeb;
  --color-app-warning-fg: #92400e;
  --color-app-warning-ring: rgb(217 119 6 / 0.2);
  --color-app-danger-soft: #fef2f2;
  --color-app-danger-fg: #b91c1c;
  --color-app-danger-ring: rgb(220 38 38 / 0.1);
  --color-app-danger: #dc2626;
  --color-app-danger-hover: #ef4444;
  --color-app-info-soft: #eff6ff;
  --color-app-info-fg: #1d4ed8;
  --color-app-info-ring: rgb(37 99 235 / 0.2);
  --color-app-admin-soft: #f5f3ff;
  --color-app-admin-fg: #6d28d9;
  --color-app-admin-ring: rgb(124 58 237 / 0.2);
  --color-app-neutral-soft: #f9fafb;
  --color-app-neutral-fg: #4b5563;
  --color-app-neutral-ring: rgb(107 114 128 / 0.1);
  --color-app-full-day: #1f658f;
  --color-app-chart-1: #005bbf;
  --color-app-chart-2: #0f766e;
  --color-app-overlay: rgb(3 7 18 / 0.4);

  --animate-app-drawer-in: app-drawer-in 200ms ease-out;
  --animate-app-dialog-in: app-dialog-in 150ms ease-out;
  --animate-app-toast-in: app-toast-in 200ms ease-out;

  @keyframes app-drawer-in {
    from { transform: translateX(-100%); }
    to { transform: translateX(0); }
  }
  @keyframes app-dialog-in {
    from { opacity: 0; transform: translateY(8px) scale(0.98); }
    to { opacity: 1; transform: none; }
  }
  @keyframes app-toast-in {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: none; }
  }
}
```

- [ ] **Step 4: Write the failing badge-tone test**

Append to `lib/__tests__/format.test.ts` (add the two names to its existing `@/lib/format` import):

```ts
describe("badge tones", () => {
  it("colors booking statuses by meaning", () => {
    expect(bookingStatusBadgeTone("confirmed")).toBe("success");
    expect(bookingStatusBadgeTone("rescheduled")).toBe("warning");
    expect(bookingStatusBadgeTone("cancelled")).toBe("danger");
  });

  it("tells appointments from full days", () => {
    expect(bookingTypeBadgeTone("appointment")).toBe("accent");
    expect(bookingTypeBadgeTone("full-day")).toBe("neutral");
  });
});
```

- [ ] **Step 5: Implement the helpers**

In `lib/format.ts`, after `bookingTypeTone`:

```ts
/** The app-ui badge palette; components/app-ui reads this type. */
export type StatusTone =
  | "neutral"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "admin";

export function bookingStatusBadgeTone(status: BookingStatus): StatusTone {
  if (status === "cancelled") return "danger";
  if (status === "rescheduled") return "warning";
  return "success";
}

export function bookingTypeBadgeTone(type: BookingType): StatusTone {
  return type === "appointment" ? "accent" : "neutral";
}
```

- [ ] **Step 6: Run tests**

Run: `npx vitest run lib/__tests__/format.test.ts components/__tests__/app-ui-tokens.test.ts -t "badge tones|defines every"`
Expected: PASS for both named tests (the migrated-files test still fails until Task 2 creates `components/app-ui`).

- [ ] **Step 7: Commit**

```bash
git add app/globals.css lib/format.ts lib/__tests__/format.test.ts components/__tests__/app-ui-tokens.test.ts
git commit -m "feat(app-ui): add app design tokens and badge tone helpers"
```

---

### Task 2: Class recipes, buttons, badge

**Files:**
- Create: `components/app-ui/styles.ts`, `components/app-ui/Button.tsx`, `components/app-ui/Badge.tsx`, `components/app-ui/index.ts`
- Test: `components/app-ui/__tests__/button.test.tsx`

**Interfaces:**
- Consumes: `StatusTone` from `@/lib/format`; `cn` from `@/lib/utils`.
- Produces:
  - `focusRing: string`
  - `type ButtonVariant = "primary" | "secondary" | "soft" | "plain" | "danger" | "danger-plain"`; `type ButtonSize = "sm" | "md"`
  - `buttonStyles(opts?: { variant?: ButtonVariant; size?: ButtonSize; iconOnly?: boolean; className?: string }): string`
  - `inputStyles(opts?: { invalid?: boolean; className?: string }): string`
  - `badgeStyles(tone: StatusTone, className?: string): string`
  - `toneSurface: Record<StatusTone, string>` (soft background + text + ring, shared by Badge and Alert)
  - `cardStyles(className?: string): string`
  - `segmentStyles(selected: boolean): string`
  - `Button(props: ButtonHTMLAttributes<HTMLButtonElement> & { variant?; size?; leadingIcon?: ReactNode; loading?: boolean })`
  - `ButtonLink(props: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; variant?; size?; leadingIcon?; external?: boolean })`
  - `IconButton(props: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; icon: ReactNode; variant?; size? })`
  - `Badge({ tone?: StatusTone; dot?: boolean; children; className? })`

- [ ] **Step 1: Write the failing test**

Create `components/app-ui/__tests__/button.test.tsx`:

```tsx
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const { Button, ButtonLink, IconButton, Badge, buttonStyles } = await import(
  "@/components/app-ui"
);

describe("Button", () => {
  it("is a real button that defaults to type=button", () => {
    const html = renderToStaticMarkup(<Button>Save</Button>);
    expect(html).toMatch(/^<button[^>]*type="button"/);
    expect(html).toContain("bg-app-accent");
  });

  it("keeps an explicit submit type", () => {
    expect(renderToStaticMarkup(<Button type="submit">Go</Button>)).toContain('type="submit"');
  });

  it("is busy and disabled while loading", () => {
    const html = renderToStaticMarkup(<Button loading>Save</Button>);
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("disabled");
    expect(html).toContain("Save");
  });

  it("styles each variant from app tokens", () => {
    expect(buttonStyles({ variant: "secondary" })).toContain("ring-app-border-strong");
    expect(buttonStyles({ variant: "danger" })).toContain("bg-app-danger");
    expect(buttonStyles({ variant: "danger-plain" })).toContain("text-app-danger-fg");
    expect(buttonStyles({ variant: "soft" })).toContain("bg-app-accent-soft");
    expect(buttonStyles({ variant: "plain" })).toContain("hover:bg-app-subtle");
  });

  it("keeps 44px targets on phones", () => {
    expect(buttonStyles({ size: "md" })).toContain("h-11");
    expect(buttonStyles({ size: "sm" })).toContain("h-11");
  });
});

describe("ButtonLink", () => {
  it("opens external links safely in a new tab", () => {
    const html = renderToStaticMarkup(
      <ButtonLink href="https://example.com" external>
        View page
      </ButtonLink>,
    );
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("renders internal links without a target", () => {
    const html = renderToStaticMarkup(<ButtonLink href="/dashboard">Home</ButtonLink>);
    expect(html).toContain('href="/dashboard"');
    expect(html).not.toContain("target=");
  });
});

describe("IconButton", () => {
  it("names itself for assistive tech and on hover", () => {
    const html = renderToStaticMarkup(<IconButton label="Sign out" icon={<span />} />);
    expect(html).toContain('aria-label="Sign out"');
    expect(html).toContain('title="Sign out"');
  });
});

describe("Badge", () => {
  it("uses the tone's soft surface and an optional dot", () => {
    const html = renderToStaticMarkup(
      <Badge tone="success" dot>
        Live
      </Badge>,
    );
    expect(html).toContain("bg-app-success-soft");
    expect(html).toContain("ring-app-success-ring");
    expect(html).toContain("rounded-full");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run components/app-ui/__tests__/button.test.tsx`
Expected: FAIL — `Failed to resolve import "@/components/app-ui"`.

- [ ] **Step 3: Implement the recipes**

Create `components/app-ui/styles.ts`:

```ts
import type { StatusTone } from "@/lib/format";
import { cn } from "@/lib/utils";

/** The one keyboard focus treatment for every interactive element. */
export const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent";

export type ButtonVariant = "primary" | "secondary" | "soft" | "plain" | "danger" | "danger-plain";
export type ButtonSize = "sm" | "md";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-app-accent text-app-on-accent shadow-xs hover:bg-app-accent-hover",
  secondary:
    "bg-app-surface text-app-fg shadow-xs ring-1 ring-inset ring-app-border-strong hover:bg-app-subtle",
  soft: "bg-app-accent-soft text-app-accent-on-soft hover:bg-app-accent-soft-hover",
  plain: "text-app-fg-secondary hover:bg-app-subtle hover:text-app-fg",
  danger: "bg-app-danger text-app-on-accent shadow-xs hover:bg-app-danger-hover",
  "danger-plain": "text-app-danger-fg hover:bg-app-danger-soft",
};

const BUTTON_SIZES: Record<ButtonSize, { text: string; icon: string }> = {
  md: { text: "h-11 px-4 sm:h-9 sm:px-3", icon: "h-11 w-11 sm:h-9 sm:w-9" },
  sm: { text: "h-11 px-3 sm:h-8 sm:px-2.5", icon: "h-11 w-11 sm:h-8 sm:w-8" },
};

export function buttonStyles({
  variant = "primary",
  size = "md",
  iconOnly = false,
  className,
}: { variant?: ButtonVariant; size?: ButtonSize; iconOnly?: boolean; className?: string } = {}) {
  return cn(
    "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
    focusRing,
    BUTTON_VARIANTS[variant],
    iconOnly ? BUTTON_SIZES[size].icon : BUTTON_SIZES[size].text,
    className,
  );
}

export function inputStyles({ invalid = false, className }: { invalid?: boolean; className?: string } = {}) {
  return cn(
    "block w-full rounded-lg bg-app-surface px-3 text-base text-app-fg outline-1 -outline-offset-1 placeholder:text-app-placeholder focus:outline-2 focus:-outline-offset-2 disabled:cursor-not-allowed disabled:bg-app-subtle disabled:text-app-fg-muted sm:text-sm",
    invalid
      ? "outline-app-danger-fg focus:outline-app-danger-fg"
      : "outline-app-border-strong focus:outline-app-accent",
    className,
  );
}

/** Soft background, readable text and an inset ring, per tone. */
export const toneSurface: Record<StatusTone, string> = {
  neutral: "bg-app-neutral-soft text-app-neutral-fg ring-app-neutral-ring",
  accent: "bg-app-accent-soft text-app-accent-on-soft ring-app-accent-ring",
  success: "bg-app-success-soft text-app-success-fg ring-app-success-ring",
  warning: "bg-app-warning-soft text-app-warning-fg ring-app-warning-ring",
  danger: "bg-app-danger-soft text-app-danger-fg ring-app-danger-ring",
  info: "bg-app-info-soft text-app-info-fg ring-app-info-ring",
  admin: "bg-app-admin-soft text-app-admin-fg ring-app-admin-ring",
};

export function badgeStyles(tone: StatusTone, className?: string) {
  return cn(
    "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset",
    toneSurface[tone],
    className,
  );
}

export function cardStyles(className?: string) {
  return cn("rounded-xl bg-app-surface shadow-xs ring-1 ring-app-border", className);
}

/** One option of a segmented control or language toggle. */
export function segmentStyles(selected: boolean) {
  return cn(
    "inline-flex h-11 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold transition-colors sm:h-8",
    focusRing,
    selected
      ? "bg-app-surface text-app-fg shadow-xs ring-1 ring-app-border"
      : "text-app-fg-muted hover:text-app-fg",
  );
}
```

- [ ] **Step 4: Implement buttons and badge**

Create `components/app-ui/Button.tsx`:

```tsx
import { ArrowUpRight, CircleNotch } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

import { buttonStyles, type ButtonSize, type ButtonVariant } from "@/components/app-ui/styles";

type StyleProps = { variant?: ButtonVariant; size?: ButtonSize };

export function Button({
  variant,
  size,
  leadingIcon,
  loading = false,
  type = "button",
  disabled,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> &
  StyleProps & { leadingIcon?: ReactNode; loading?: boolean }) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonStyles({ variant, size, className })}
      {...rest}
    >
      {loading ? (
        <CircleNotch aria-hidden="true" size={16} className="animate-spin" />
      ) : (
        leadingIcon
      )}
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "secondary",
  size,
  leadingIcon,
  external = false,
  className,
  children,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement> &
  StyleProps & { href: string; leadingIcon?: ReactNode; external?: boolean }) {
  const classes = buttonStyles({ variant, size, className });

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classes} {...rest}>
        {leadingIcon}
        {children}
        <ArrowUpRight aria-hidden="true" size={16} />
      </a>
    );
  }

  return (
    <Link href={href} className={classes} {...rest}>
      {leadingIcon}
      {children}
    </Link>
  );
}

export function IconButton({
  label,
  icon,
  variant = "plain",
  size,
  type = "button",
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & StyleProps & { label: string; icon: ReactNode }) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={buttonStyles({ variant, size, iconOnly: true, className })}
      {...rest}
    >
      {icon}
    </button>
  );
}
```

> Phosphor's `dist/ssr` entry renders without React context, so these stay usable from server components (super-admin pages in PR 4). Check the entry exists: `ls node_modules/@phosphor-icons/react/dist/ssr`. If it does not, import from `@phosphor-icons/react` and add `"use client";` at the top of the file.

Create `components/app-ui/Badge.tsx`:

```tsx
import type { ReactNode } from "react";

import { badgeStyles } from "@/components/app-ui/styles";
import type { StatusTone } from "@/lib/format";

export function Badge({
  tone = "neutral",
  dot = false,
  className,
  children,
}: {
  tone?: StatusTone;
  dot?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span className={badgeStyles(tone, className)}>
      {dot ? <span aria-hidden="true" className="size-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}
```

Create `components/app-ui/index.ts`:

```ts
export * from "@/components/app-ui/styles";
export { Button, ButtonLink, IconButton } from "@/components/app-ui/Button";
export { Badge } from "@/components/app-ui/Badge";
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run components/app-ui components/__tests__/app-ui-tokens.test.ts`
Expected: PASS (token test now finds `components/app-ui` and it is clean).

- [ ] **Step 6: Commit**

```bash
git add components/app-ui
git commit -m "feat(app-ui): add class recipes, buttons and badge"
```

---

### Task 3: Display components

**Files:**
- Create: `components/app-ui/Card.tsx`, `Stat.tsx`, `Avatar.tsx`, `Skeleton.tsx`, `EmptyState.tsx`, `Alert.tsx`, `StackedList.tsx`, `Table.tsx`, `DescriptionList.tsx`
- Modify: `components/app-ui/index.ts`
- Test: `components/app-ui/__tests__/display.test.tsx`

**Interfaces:**
- Consumes: `cardStyles`, `toneSurface`, `IconButton` (Task 2).
- Produces:
  - `Card({ as?: "div" | "section" | "article"; className?; children; "aria-labelledby"? })`
  - `CardHeader({ title: ReactNode; description?: ReactNode; actions?: ReactNode; headingLevel?: 2 | 3; titleId?: string; divider?: boolean })`
  - `CardBody({ className?; children })`, `CardFooter({ className?; children })`
  - `SectionHeading({ title; description?; actions?; headingLevel?: 2 | 3; titleId? })`
  - `StatGroup({ columns?: 2 | 3 | 4; children })`, `Stat({ label; value: ReactNode; detail?; action? })` — `Stat` only inside `StatGroup` (it renders `dt`/`dd`)
  - `Avatar({ name: string; src?: string; size?: "sm" | "md" | "lg"; shape?: "circle" | "square" })`
  - `Skeleton({ className? })`
  - `EmptyState({ title; body?; icon?: ReactNode; action?: ReactNode; variant?: "plain" | "dashed"; headingLevel?: 2 | 3 | 4 })`
  - `type AlertTone = "neutral" | "success" | "warning" | "danger" | "info" | "admin"`; `Alert({ tone; title?; children?; actions?; role?: "status" | "alert"; onDismiss?: () => void; dismissLabel?: string; className? })`
  - `StackedList({ children; className? })` (`ul`), `StackedListItem({ leading?; trailing?; children; className? })` (`li`), `StackedListHeading({ id?; children; level?: 2 | 3 })`
  - `Table({ children; className? })`, `THead`, `TBody`, `Tr`, `Th({ children; className?; align?: "left" | "right" })`, `Td({ children; className?; align? })`
  - `DescriptionList({ children; className? })`, `DescriptionItem({ term: ReactNode; children; flush?: boolean })`

- [ ] **Step 1: Write the failing test**

Create `components/app-ui/__tests__/display.test.tsx`:

```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  Alert,
  Avatar,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  DescriptionItem,
  DescriptionList,
  EmptyState,
  Skeleton,
  StackedList,
  StackedListHeading,
  StackedListItem,
  Stat,
  StatGroup,
  TBody,
  THead,
  Table,
  Td,
  Th,
  Tr,
} from "@/components/app-ui";

describe("Card", () => {
  it("renders one flat surface with header, body and footer", () => {
    const html = renderToStaticMarkup(
      <Card as="section">
        <CardHeader title="Weekly hours" description="When clients can book" actions={<button>Add</button>} />
        <CardBody>Rows</CardBody>
        <CardFooter>
          <button>Save</button>
        </CardFooter>
      </Card>,
    );
    expect(html).toMatch(/^<section[^>]*ring-app-border/);
    expect(html).toMatch(/<h2[^>]*>Weekly hours<\/h2>/);
    expect(html).toContain("When clients can book");
    expect(html).toContain("border-t border-app-border");
  });
});

describe("StatGroup", () => {
  it("is a definition list of label/value pairs", () => {
    const html = renderToStaticMarkup(
      <StatGroup columns={4}>
        <Stat label="Upcoming" value={3} detail="Next 7 days" />
      </StatGroup>,
    );
    expect(html).toMatch(/^<dl/);
    expect(html).toMatch(/<dt[^>]*>Upcoming<\/dt>/);
    expect(html).toContain("tabular-nums");
    expect(html).toContain("lg:grid-cols-4");
  });
});

describe("Avatar", () => {
  it("falls back to the first initial without an image", () => {
    const html = renderToStaticMarkup(<Avatar name="rivera clinic" />);
    expect(html).toContain(">R<");
    expect(html).not.toContain("<img");
  });

  it("shows the image with empty alt when given one", () => {
    const html = renderToStaticMarkup(<Avatar name="Rivera" src="/logo.png" />);
    expect(html).toContain('src="/logo.png"');
    expect(html).toContain('alt=""');
  });
});

describe("Skeleton", () => {
  it("is hidden from assistive tech", () => {
    expect(renderToStaticMarkup(<Skeleton className="h-4" />)).toContain('aria-hidden="true"');
  });
});

describe("EmptyState", () => {
  it("titles the empty list and offers its action", () => {
    const html = renderToStaticMarkup(
      <EmptyState title="No bookings yet" body="They appear here." action={<button>Share</button>} variant="dashed" />,
    );
    expect(html).toMatch(/<h3[^>]*>No bookings yet<\/h3>/);
    expect(html).toContain("border-dashed");
    expect(html).toContain("Share");
  });
});

describe("Alert", () => {
  it("uses the tone's tokens and carries its role", () => {
    const html = renderToStaticMarkup(
      <Alert tone="danger" role="alert" title="Could not save">
        Try again.
      </Alert>,
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain("bg-app-danger-soft");
    expect(html).toContain("Could not save");
  });

  it("offers a dismiss button only when dismissable", () => {
    expect(renderToStaticMarkup(<Alert tone="info">Hi</Alert>)).not.toContain("<button");
    const html = renderToStaticMarkup(
      <Alert tone="info" onDismiss={() => undefined} dismissLabel="Dismiss">
        Hi
      </Alert>,
    );
    expect(html).toContain('aria-label="Dismiss"');
  });
});

describe("StackedList", () => {
  it("renders a list with sticky group headings", () => {
    const html = renderToStaticMarkup(
      <div>
        <StackedListHeading id="today">Today</StackedListHeading>
        <StackedList>
          <StackedListItem trailing={<button>Cancel</button>}>Ana</StackedListItem>
        </StackedList>
      </div>,
    );
    expect(html).toMatch(/<h3[^>]*id="today"[^>]*>Today<\/h3>/);
    expect(html).toContain("sticky");
    expect(html).toMatch(/<ul[^>]*role="list"/);
    expect(html).toContain("<li");
  });
});

describe("Table", () => {
  it("scrolls inside its wrapper and scopes column heads", () => {
    const html = renderToStaticMarkup(
      <Table>
        <THead>
          <Tr>
            <Th>Account</Th>
          </Tr>
        </THead>
        <TBody>
          <Tr>
            <Td>a@b.c</Td>
          </Tr>
        </TBody>
      </Table>,
    );
    expect(html).toMatch(/^<div[^>]*overflow-x-auto/);
    expect(html).toContain('scope="col"');
  });
});

describe("DescriptionList", () => {
  it("pairs terms with values", () => {
    const html = renderToStaticMarkup(
      <DescriptionList>
        <DescriptionItem term="Calendar">Work</DescriptionItem>
      </DescriptionList>,
    );
    expect(html).toMatch(/<dt[^>]*>Calendar<\/dt>/);
    expect(html).toContain("break-words");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run components/app-ui/__tests__/display.test.tsx`
Expected: FAIL — `Card` (and the rest) is not exported from `@/components/app-ui`.

- [ ] **Step 3: Implement**

Create `components/app-ui/Card.tsx`:

```tsx
import type { ReactNode } from "react";

import { cardStyles } from "@/components/app-ui/styles";
import { cn } from "@/lib/utils";

export function Card({
  as: Tag = "div",
  className,
  children,
  ...rest
}: {
  as?: "div" | "section" | "article";
  className?: string;
  children: ReactNode;
  "aria-labelledby"?: string;
}) {
  return (
    <Tag className={cardStyles(className)} {...rest}>
      {children}
    </Tag>
  );
}

export function SectionHeading({
  title,
  description,
  actions,
  headingLevel = 2,
  titleId,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  headingLevel?: 2 | 3;
  titleId?: string;
  className?: string;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";

  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="min-w-0">
        <Heading id={titleId} className="text-base font-semibold text-app-fg">
          {title}
        </Heading>
        {description ? <p className="mt-1 text-sm text-app-fg-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function CardHeader({
  divider = true,
  ...props
}: Parameters<typeof SectionHeading>[0] & { divider?: boolean }) {
  return (
    <SectionHeading
      {...props}
      className={cn("px-4 py-4 sm:px-6", divider && "border-b border-app-border", props.className)}
    />
  );
}

export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("px-4 py-5 sm:px-6", className)}>{children}</div>;
}

export function CardFooter({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-2 border-t border-app-border px-4 py-3 sm:flex-row sm:items-center sm:justify-end sm:px-6",
        className,
      )}
    >
      {children}
    </div>
  );
}
```

Create `components/app-ui/Stat.tsx`:

```tsx
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const COLUMNS = { 2: "lg:grid-cols-2", 3: "lg:grid-cols-3", 4: "lg:grid-cols-4" } as const;

/** Stats separated by hairlines: a 1px gap over the border color. */
export function StatGroup({
  columns = 4,
  className,
  children,
}: {
  columns?: 2 | 3 | 4;
  className?: string;
  children: ReactNode;
}) {
  return (
    <dl
      className={cn(
        "grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-app-border shadow-xs ring-1 ring-app-border",
        COLUMNS[columns],
        className,
      )}
    >
      {children}
    </dl>
  );
}

/** One stat. Renders dt/dd, so it belongs inside StatGroup. */
export function Stat({
  label,
  value,
  detail,
  action,
}: {
  label: ReactNode;
  value: ReactNode;
  detail?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col bg-app-surface px-4 py-5 sm:p-6">
      <dt className="text-sm font-medium text-app-fg-muted">{label}</dt>
      <dd className="mt-1 text-3xl font-semibold tracking-tight text-app-fg tabular-nums">
        {value}
      </dd>
      {detail ? <dd className="mt-1 text-sm text-app-fg-muted">{detail}</dd> : null}
      {action ? <dd className="mt-3">{action}</dd> : null}
    </div>
  );
}
```


Create `components/app-ui/Avatar.tsx`:

```tsx
import { cn } from "@/lib/utils";

const SIZES = { sm: "size-8 text-xs", md: "size-10 text-sm", lg: "size-14 text-lg" } as const;

export function Avatar({
  name,
  src,
  size = "md",
  shape = "circle",
  className,
}: {
  name: string;
  src?: string;
  size?: keyof typeof SIZES;
  shape?: "circle" | "square";
  className?: string;
}) {
  const classes = cn(
    "shrink-0 overflow-hidden",
    SIZES[size],
    shape === "circle" ? "rounded-full" : "rounded-lg",
    className,
  );

  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- owner-uploaded image on an arbitrary host
    return <img src={src} alt="" className={cn(classes, "bg-app-surface object-cover ring-1 ring-app-border")} />;
  }

  return (
    <span
      aria-hidden="true"
      className={cn(classes, "grid place-items-center bg-app-accent-soft font-semibold text-app-accent-on-soft")}
    >
      {name.trim().slice(0, 1).toUpperCase() || "?"}
    </span>
  );
}
```

Create `components/app-ui/Skeleton.tsx`:

```tsx
import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-lg bg-app-subtle", className)} />;
}
```

Create `components/app-ui/EmptyState.tsx`:

```tsx
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  body,
  icon,
  action,
  variant = "plain",
  headingLevel = 3,
  className,
}: {
  title: ReactNode;
  body?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  variant?: "plain" | "dashed";
  headingLevel?: 2 | 3 | 4;
  className?: string;
}) {
  const Heading = `h${headingLevel}` as "h2" | "h3" | "h4";

  return (
    <div
      className={cn(
        "px-6 py-10 text-center",
        variant === "dashed" && "rounded-xl border-2 border-dashed border-app-border-strong",
        className,
      )}
    >
      {icon ? <div className="mx-auto mb-3 flex justify-center text-app-fg-muted">{icon}</div> : null}
      <Heading className="text-sm font-semibold text-app-fg">{title}</Heading>
      {body ? <p className="mx-auto mt-1 max-w-md text-sm text-app-fg-muted">{body}</p> : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
```

Create `components/app-ui/Alert.tsx`:

```tsx
import {
  CheckCircle,
  Info,
  ShieldStar,
  Warning,
  WarningCircle,
  X,
} from "@phosphor-icons/react/dist/ssr";
import type { ReactNode } from "react";

import { IconButton } from "@/components/app-ui/Button";
import { toneSurface } from "@/components/app-ui/styles";
import { cn } from "@/lib/utils";

export type AlertTone = "neutral" | "success" | "warning" | "danger" | "info" | "admin";

const ICONS = {
  neutral: Info,
  info: Info,
  success: CheckCircle,
  warning: Warning,
  danger: WarningCircle,
  admin: ShieldStar,
} as const;

/** One status message style for every signed-in surface. */
export function Alert({
  tone,
  title,
  children,
  actions,
  role,
  onDismiss,
  dismissLabel = "Dismiss",
  className,
}: {
  tone: AlertTone;
  title?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  role?: "status" | "alert";
  onDismiss?: () => void;
  dismissLabel?: string;
  className?: string;
}) {
  const Icon = ICONS[tone];
  const surface =
    tone === "neutral" ? "bg-app-surface text-app-fg ring-app-border" : toneSurface[tone];

  return (
    <div role={role} className={cn("flex gap-3 rounded-lg p-4 text-sm ring-1 ring-inset", surface, className)}>
      <Icon aria-hidden="true" size={20} weight="fill" className="mt-px shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 break-words">
          {title ? <p className="font-semibold">{title}</p> : null}
          {children ? <div className={cn(title ? "mt-1" : "font-medium")}>{children}</div> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {onDismiss ? (
        <IconButton
          label={dismissLabel}
          icon={<X aria-hidden="true" size={16} />}
          size="sm"
          onClick={onDismiss}
          className="-my-1.5 -mr-1.5 text-current hover:bg-app-surface/60"
        />
      ) : null}
    </div>
  );
}
```

> `onDismiss` makes `Alert` a client-only use; server callers never pass it.

Create `components/app-ui/StackedList.tsx`:

```tsx
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function StackedList({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <ul role="list" className={cn("divide-y divide-app-border", className)}>
      {children}
    </ul>
  );
}

export function StackedListItem({
  leading,
  trailing,
  className,
  children,
}: {
  leading?: ReactNode;
  trailing?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <li className={cn("flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-4 sm:px-6", className)}>
      {leading ? <div className="shrink-0">{leading}</div> : null}
      <div className="min-w-0 flex-1">{children}</div>
      {trailing ? <div className="flex shrink-0 flex-wrap items-center gap-2">{trailing}</div> : null}
    </li>
  );
}

/** Sticks under the 4rem shell top bar while its group scrolls past. */
export function StackedListHeading({
  id,
  level = 3,
  children,
}: {
  id?: string;
  level?: 2 | 3;
  children: ReactNode;
}) {
  const Heading = level === 2 ? "h2" : "h3";

  return (
    <Heading
      id={id}
      className="sticky top-16 z-10 border-y border-app-border bg-app-subtle px-4 py-1.5 text-xs font-semibold text-app-fg-secondary sm:px-6"
    >
      {children}
    </Heading>
  );
}
```

Create `components/app-ui/Table.tsx`:

```tsx
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Table({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className={cn("min-w-full divide-y divide-app-border text-sm", className)}>{children}</table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return <thead className="bg-app-subtle">{children}</thead>;
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-app-border bg-app-surface">{children}</tbody>;
}

export function Tr({ className, children }: { className?: string; children: ReactNode }) {
  return <tr className={className}>{children}</tr>;
}

export function Th({
  align = "left",
  className,
  children,
}: {
  align?: "left" | "right";
  className?: string;
  children?: ReactNode;
}) {
  return (
    <th
      scope="col"
      className={cn(
        "px-4 py-3 text-xs font-semibold uppercase tracking-wide text-app-fg-secondary first:pl-4 sm:first:pl-6",
        align === "right" ? "text-right" : "text-left",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  align = "left",
  className,
  children,
}: {
  align?: "left" | "right";
  className?: string;
  children?: ReactNode;
}) {
  return (
    <td
      className={cn(
        "px-4 py-4 align-top text-app-fg-secondary first:pl-4 sm:first:pl-6",
        align === "right" && "text-right",
        className,
      )}
    >
      {children}
    </td>
  );
}
```

Create `components/app-ui/DescriptionList.tsx`:

```tsx
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function DescriptionList({ className, children }: { className?: string; children: ReactNode }) {
  return <dl className={cn("divide-y divide-app-border", className)}>{children}</dl>;
}

export function DescriptionItem({
  term,
  flush = false,
  children,
}: {
  term: ReactNode;
  /** Drop the side padding when the list sits in an already padded body. */
  flush?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={cn("py-4 sm:grid sm:grid-cols-3 sm:gap-4", flush ? "px-0" : "px-4 sm:px-6")}>
      <dt className="text-sm font-medium text-app-fg">{term}</dt>
      <dd className="mt-1 break-words text-sm text-app-fg-secondary sm:col-span-2 sm:mt-0">{children}</dd>
    </div>
  );
}
```

Append to `components/app-ui/index.ts`:

```ts
export { Card, CardHeader, CardBody, CardFooter, SectionHeading } from "@/components/app-ui/Card";
export { StatGroup, Stat } from "@/components/app-ui/Stat";
export { Avatar } from "@/components/app-ui/Avatar";
export { Skeleton } from "@/components/app-ui/Skeleton";
export { EmptyState } from "@/components/app-ui/EmptyState";
export { Alert, type AlertTone } from "@/components/app-ui/Alert";
export { StackedList, StackedListItem, StackedListHeading } from "@/components/app-ui/StackedList";
export { Table, THead, TBody, Tr, Th, Td } from "@/components/app-ui/Table";
export { DescriptionList, DescriptionItem } from "@/components/app-ui/DescriptionList";
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run components/app-ui components/__tests__/app-ui-tokens.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/app-ui
git commit -m "feat(app-ui): add cards, stats, lists, tables and alerts"
```

---

### Task 4: Form controls

**Files:**
- Create: `components/app-ui/Field.tsx`, `components/app-ui/Input.tsx`, `components/app-ui/Fieldset.tsx`
- Modify: `components/app-ui/index.ts`
- Test: `components/app-ui/__tests__/forms.test.tsx`

**Interfaces:**
- Consumes: `inputStyles`, `focusRing` (Task 2).
- Produces:
  - `Field({ label: ReactNode; description?: ReactNode; error?: ReactNode; required?: boolean; inline?: boolean; labelHidden?: boolean; className?; children })`
  - `useFieldControl<P extends { id?: string; "aria-describedby"?: string; "aria-invalid"?: boolean | "true" | "false" }>(props: P): P & { id?: string; "aria-describedby"?: string; "aria-invalid"?: true }` — merges field context into control props; explicit props win
  - `Input(props: InputHTMLAttributes<HTMLInputElement> & { leadingAddon?: ReactNode; trailingAddon?: ReactNode })`
  - `Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>)`
  - `Select(props: SelectHTMLAttributes<HTMLSelectElement>)`
  - `Checkbox(props: Omit<InputHTMLAttributes<HTMLInputElement>, "type">)`
  - `Switch(props: Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "role">)`
  - `Fieldset({ legend: ReactNode; description?: ReactNode; className?; children })`
  - `FormSection({ title: ReactNode; description?: ReactNode; titleId?: string; className?; children })`

- [ ] **Step 1: Write the failing test**

Create `components/app-ui/__tests__/forms.test.tsx`:

```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  Checkbox,
  Field,
  Fieldset,
  FormSection,
  Input,
  Select,
  Switch,
  Textarea,
} from "@/components/app-ui";

function attr(html: string, tag: string, name: string) {
  const element = html.match(new RegExp(`<${tag}[^>]*>`))?.[0] ?? "";
  return element.match(new RegExp(`${name}="([^"]*)"`))?.[1];
}

describe("Field", () => {
  it("labels the control and points it at its description and error", () => {
    const html = renderToStaticMarkup(
      <Field label="Business name" description="Shown on your page" error="Required">
        <Input defaultValue="" />
      </Field>,
    );
    const id = attr(html, "input", "id");
    const describedBy = attr(html, "input", "aria-describedby") ?? "";

    expect(id).toBeTruthy();
    expect(html).toContain(`for="${id}"`);
    expect(describedBy.split(" ")).toHaveLength(2);
    for (const target of describedBy.split(" ")) {
      expect(html).toContain(`id="${target}"`);
    }
    expect(attr(html, "input", "aria-invalid")).toBe("true");
    expect(html).toContain("outline-app-danger-fg");
  });

  it("leaves a valid control unmarked", () => {
    const html = renderToStaticMarkup(
      <Field label="Email">
        <Input type="email" />
      </Field>,
    );
    expect(html).not.toContain("aria-invalid");
    expect(html).not.toContain("aria-describedby");
  });

  it("lets an explicit id win", () => {
    const html = renderToStaticMarkup(
      <Field label="Slug">
        <Input id="public-slug" />
      </Field>,
    );
    expect(html).toContain('for="public-slug"');
    expect(attr(html, "input", "id")).toBe("public-slug");
  });

  it("wires selects and textareas the same way", () => {
    const select = renderToStaticMarkup(
      <Field label="Status" error="Pick one">
        <Select>
          <option>All</option>
        </Select>
      </Field>,
    );
    expect(attr(select, "select", "aria-invalid")).toBe("true");

    const textarea = renderToStaticMarkup(
      <Field label="Notes" description="Optional">
        <Textarea />
      </Field>,
    );
    expect(attr(textarea, "textarea", "aria-describedby")).toBeTruthy();
  });
});

describe("Input addons", () => {
  it("renders prefix text beside the input", () => {
    const html = renderToStaticMarkup(<Input aria-label="Slug" leadingAddon="haab.app/" />);
    expect(html).toContain("haab.app/");
    expect(html).toContain("focus-within:outline-2");
  });
});

describe("Switch and Checkbox", () => {
  it("renders a native checkbox with switch semantics", () => {
    const html = renderToStaticMarkup(<Switch aria-label="Keep history" defaultChecked />);
    expect(html).toMatch(/<input[^>]*type="checkbox"[^>]*role="switch"|<input[^>]*role="switch"[^>]*type="checkbox"/);
  });

  it("puts the label beside an inline control", () => {
    const html = renderToStaticMarkup(
      <Field label="Monday" inline>
        <Checkbox />
      </Field>,
    );
    expect(html).toContain('type="checkbox"');
    expect(html.indexOf("<input")).toBeLessThan(html.indexOf("Monday"));
  });
});

describe("Fieldset and FormSection", () => {
  it("groups fields under a legend", () => {
    const html = renderToStaticMarkup(
      <Fieldset legend="Breaks" description="Times you are away">
        <p>fields</p>
      </Fieldset>,
    );
    expect(html).toMatch(/<fieldset[\s\S]*<legend[^>]*>Breaks<\/legend>/);
  });

  it("lays out a settings section with its heading", () => {
    const html = renderToStaticMarkup(
      <FormSection title="Business profile" description="Shown to clients">
        <p>fields</p>
      </FormSection>,
    );
    expect(html).toMatch(/<h2[^>]*>Business profile<\/h2>/);
    expect(html).toContain("lg:grid-cols-3");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run components/app-ui/__tests__/forms.test.tsx`
Expected: FAIL — `Field` is not exported.

- [ ] **Step 3: Implement**

Create `components/app-ui/Field.tsx`:

```tsx
"use client";

import { createContext, useContext, useId, type ReactNode } from "react";

import { cn } from "@/lib/utils";

type FieldContextValue = {
  id: string;
  descriptionId?: string;
  errorId?: string;
  invalid: boolean;
};

const FieldContext = createContext<FieldContextValue | null>(null);

type ControlProps = {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false";
};

/** Merges the surrounding Field's id and aria wiring into a control's props. */
export function useFieldControl<P extends ControlProps>(props: P) {
  const field = useContext(FieldContext);

  if (!field) {
    return props;
  }

  const describedBy = [field.descriptionId, field.errorId, props["aria-describedby"]]
    .filter(Boolean)
    .join(" ");

  return {
    ...props,
    id: props.id ?? field.id,
    "aria-describedby": describedBy || undefined,
    "aria-invalid": props["aria-invalid"] ?? (field.invalid ? true : undefined),
  };
}

export function Field({
  label,
  description,
  error,
  required = false,
  inline = false,
  labelHidden = false,
  className,
  children,
}: {
  label: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  /** Checkbox and switch: the control sits left of its label. */
  inline?: boolean;
  labelHidden?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const generatedId = useId();
  const controlId = findControlId(children) ?? generatedId;
  const descriptionId = description ? `${generatedId}-description` : undefined;
  const errorId = error ? `${generatedId}-error` : undefined;

  const labelNode = (
    <label
      htmlFor={controlId}
      className={cn("text-sm font-medium text-app-fg", labelHidden && "sr-only")}
    >
      {label}
      {required ? (
        <span aria-hidden="true" className="text-app-danger-fg">
          {" "}
          *
        </span>
      ) : null}
    </label>
  );
  const descriptionNode = description ? (
    <p id={descriptionId} className="text-sm text-app-fg-muted">
      {description}
    </p>
  ) : null;
  const errorNode = error ? (
    <p id={errorId} className="text-sm font-medium text-app-danger-fg">
      {error}
    </p>
  ) : null;

  return (
    <FieldContext.Provider value={{ id: controlId, descriptionId, errorId, invalid: Boolean(error) }}>
      {inline ? (
        <div className={cn("flex items-start gap-3", className)}>
          <div className="flex h-6 shrink-0 items-center">{children}</div>
          <div className="grid gap-1">
            {labelNode}
            {descriptionNode}
            {errorNode}
          </div>
        </div>
      ) : (
        <div className={cn("grid gap-2", className)}>
          {labelNode}
          {children}
          {descriptionNode}
          {errorNode}
        </div>
      )}
    </FieldContext.Provider>
  );
}

/** An explicit id on the single child control wins over the generated one. */
function findControlId(children: ReactNode): string | undefined {
  if (children && typeof children === "object" && "props" in children) {
    const id = (children.props as { id?: unknown }).id;
    return typeof id === "string" ? id : undefined;
  }
  return undefined;
}
```

Create `components/app-ui/Input.tsx`:

```tsx
"use client";

import { CaretDown } from "@phosphor-icons/react";
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

import { useFieldControl } from "@/components/app-ui/Field";
import { inputStyles } from "@/components/app-ui/styles";
import { cn } from "@/lib/utils";

export function Input({
  leadingAddon,
  trailingAddon,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { leadingAddon?: ReactNode; trailingAddon?: ReactNode }) {
  const control = useFieldControl(props);
  const invalid = control["aria-invalid"] === true || control["aria-invalid"] === "true";

  if (!leadingAddon && !trailingAddon) {
    return <input {...control} className={inputStyles({ invalid, className: cn("h-11 sm:h-9", className) })} />;
  }

  return (
    <div
      className={cn(
        "flex h-11 items-center rounded-lg bg-app-surface outline-1 -outline-offset-1 focus-within:outline-2 focus-within:-outline-offset-2 sm:h-9",
        invalid
          ? "outline-app-danger-fg focus-within:outline-app-danger-fg"
          : "outline-app-border-strong focus-within:outline-app-accent",
        className,
      )}
    >
      {leadingAddon ? (
        <span className="flex shrink-0 select-none items-center pl-3 text-sm text-app-fg-muted">
          {leadingAddon}
        </span>
      ) : null}
      <input
        {...control}
        className="block h-full min-w-0 grow bg-transparent px-3 text-base text-app-fg placeholder:text-app-placeholder focus:outline-none disabled:cursor-not-allowed disabled:text-app-fg-muted sm:text-sm"
      />
      {trailingAddon ? (
        <span className="flex shrink-0 items-center pr-1.5 text-sm text-app-fg-muted">{trailingAddon}</span>
      ) : null}
    </div>
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const control = useFieldControl(props);
  const invalid = control["aria-invalid"] === true || control["aria-invalid"] === "true";

  return <textarea {...control} className={inputStyles({ invalid, className: cn("min-h-24 py-2", className) })} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  const control = useFieldControl(props);
  const invalid = control["aria-invalid"] === true || control["aria-invalid"] === "true";

  return (
    <div className={cn("grid grid-cols-1", className)}>
      <select
        {...control}
        className={inputStyles({
          invalid,
          className: "col-start-1 row-start-1 h-11 appearance-none pr-8 sm:h-9",
        })}
      >
        {children}
      </select>
      <CaretDown
        aria-hidden="true"
        size={16}
        className="pointer-events-none col-start-1 row-start-1 mr-2.5 self-center justify-self-end text-app-fg-muted"
      />
    </div>
  );
}

export function Checkbox({ className, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const control = useFieldControl(props);

  return (
    <input
      {...control}
      type="checkbox"
      className={cn(
        "size-4 rounded border-app-border-strong accent-app-accent disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent",
        className,
      )}
    />
  );
}

/** A native checkbox announced as a switch, drawn as a toggle. */
export function Switch({ className, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "role">) {
  const control = useFieldControl(props);

  return (
    <span
      className={cn(
        "group relative inline-flex h-6 w-11 shrink-0 rounded-full bg-app-border-strong p-0.5 transition-colors has-checked:bg-app-accent has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-app-accent has-disabled:opacity-50",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="size-5 rounded-full bg-app-surface shadow-xs ring-1 ring-app-border transition-transform group-has-checked:translate-x-5"
      />
      <input
        {...control}
        type="checkbox"
        role="switch"
        className="absolute inset-0 size-full cursor-pointer appearance-none focus:outline-none disabled:cursor-not-allowed"
      />
    </span>
  );
}
```

Create `components/app-ui/Fieldset.tsx`:

```tsx
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Fieldset({
  legend,
  description,
  className,
  children,
}: {
  legend: ReactNode;
  description?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <fieldset className={cn("grid gap-4", className)}>
      {/* legend must be the fieldset's first child */}
      <legend className="text-sm font-semibold text-app-fg">{legend}</legend>
      {description ? <p className="-mt-3 text-sm text-app-fg-muted">{description}</p> : null}
      {children}
    </fieldset>
  );
}

/**
 * The Tailwind Plus settings layout: heading on the left, fields on the
 * right from lg. Stack sections inside `divide-y divide-app-border`.
 */
export function FormSection({
  title,
  description,
  titleId,
  className,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  titleId?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={titleId}
      className={cn("grid grid-cols-1 gap-x-8 gap-y-6 py-8 first:pt-0 last:pb-0 lg:grid-cols-3", className)}
    >
      <div>
        <h2 id={titleId} className="text-base font-semibold text-app-fg">
          {title}
        </h2>
        {description ? <p className="mt-1 text-sm text-app-fg-muted">{description}</p> : null}
      </div>
      <div className="grid gap-6 lg:col-span-2">{children}</div>
    </section>
  );
}
```


Append to `components/app-ui/index.ts`:

```ts
export { Field, useFieldControl } from "@/components/app-ui/Field";
export { Input, Textarea, Select, Checkbox, Switch } from "@/components/app-ui/Input";
export { Fieldset, FormSection } from "@/components/app-ui/Fieldset";
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run components/app-ui components/__tests__/app-ui-tokens.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/app-ui
git commit -m "feat(app-ui): add fields, inputs, switch and form layout"
```

---

### Task 5: Segmented control, radio cards, language toggle

**Files:**
- Create: `components/app-ui/SegmentedControl.tsx`, `components/app-ui/RadioCards.tsx`, `components/app-ui/LanguageToggle.tsx`
- Modify: `components/app-ui/index.ts`
- Test: `components/app-ui/__tests__/choice.test.tsx`

**Interfaces:**
- Consumes: `segmentStyles`, `focusRing` (Task 2); `bookingTranslations` from `@/components/booking/i18n/translations` (read-only); `Lang` from `@/lib/types`.
- Produces:
  - `SegmentedControl<T extends string>({ value: T; onChange: (value: T) => void; options: { value: T; label: ReactNode; count?: number }[]; ariaLabel: string; className? })`
  - `nextSegmentIndex(current: number, key: string, length: number): number | null` (pure; arrow/Home/End)
  - `RadioCards<T extends string>({ name: string; value: T; onChange: (value: T) => void; options: { value: T; label: ReactNode; description?: ReactNode; icon?: ReactNode; preview?: ReactNode; disabled?: boolean }[]; ariaLabel?: string; ariaLabelledBy?: string; columns?: 1 | 2 | 3 | 4; disabled?: boolean })`
  - `LanguageToggle({ lang: Lang; onChange?: (lang: Lang) => void; hrefFor?: (lang: Lang) => string; className? })`

- [ ] **Step 1: Write the failing test**

Create `components/app-ui/__tests__/choice.test.tsx`:

```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LanguageToggle, RadioCards, SegmentedControl, nextSegmentIndex } from "@/components/app-ui";

describe("SegmentedControl", () => {
  const html = renderToStaticMarkup(
    <SegmentedControl
      ariaLabel="Booking view"
      value="archive"
      onChange={() => undefined}
      options={[
        { value: "active", label: "Active", count: 4 },
        { value: "archive", label: "Archive", count: 9 },
      ]}
    />,
  );

  it("is a radiogroup of radio buttons", () => {
    expect(html).toContain('role="radiogroup"');
    expect(html).toContain('aria-label="Booking view"');
    expect(html.match(/role="radio"/g)).toHaveLength(2);
  });

  it("checks and focuses only the selected option", () => {
    expect(html.match(/aria-checked="true"/g)).toHaveLength(1);
    expect(html).toMatch(/aria-checked="true"[^>]*tabindex="0"|tabindex="0"[^>]*aria-checked="true"/);
    expect(html.match(/tabindex="-1"/g)).toHaveLength(1);
  });

  it("shows counts", () => {
    expect(html).toContain(">9<");
  });
});

describe("nextSegmentIndex", () => {
  it("moves with arrows and wraps", () => {
    expect(nextSegmentIndex(0, "ArrowRight", 3)).toBe(1);
    expect(nextSegmentIndex(2, "ArrowRight", 3)).toBe(0);
    expect(nextSegmentIndex(0, "ArrowLeft", 3)).toBe(2);
    expect(nextSegmentIndex(1, "ArrowDown", 3)).toBe(2);
    expect(nextSegmentIndex(1, "ArrowUp", 3)).toBe(0);
  });

  it("jumps to the ends and ignores other keys", () => {
    expect(nextSegmentIndex(1, "Home", 3)).toBe(0);
    expect(nextSegmentIndex(1, "End", 3)).toBe(2);
    expect(nextSegmentIndex(1, "a", 3)).toBeNull();
  });
});

describe("RadioCards", () => {
  it("renders native radios sharing one name, the selected one checked", () => {
    const html = renderToStaticMarkup(
      <RadioCards
        name="theme"
        ariaLabel="Theme"
        value="dark"
        onChange={() => undefined}
        options={[
          { value: "default", label: "Classic" },
          { value: "dark", label: "Dark", description: "Charcoal" },
        ]}
      />,
    );
    expect(html).toContain('role="radiogroup"');
    expect(html.match(/type="radio"/g)).toHaveLength(2);
    expect(html.match(/name="theme"/g)).toHaveLength(2);
    expect(html.match(/checked=""/g)).toHaveLength(1);
    expect(html).toContain("Charcoal");
  });
});

describe("LanguageToggle", () => {
  it("renders links when the page builds the URLs", () => {
    const html = renderToStaticMarkup(<LanguageToggle lang="es" hrefFor={(lang) => `?lang=${lang}`} />);
    expect(html).toContain('href="?lang=en"');
    expect(html).toMatch(/<a[^>]*aria-current="true"[^>]*>ES|<a[^>]*>[^<]*ES/);
    expect(html).not.toContain('role="radio"');
  });

  it("renders a segmented control when it changes state", () => {
    const html = renderToStaticMarkup(<LanguageToggle lang="en" onChange={() => undefined} />);
    expect(html).toContain('role="radiogroup"');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run components/app-ui/__tests__/choice.test.tsx`
Expected: FAIL — `SegmentedControl` is not exported.

- [ ] **Step 3: Implement**

Create `components/app-ui/SegmentedControl.tsx`:

```tsx
"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";

import { segmentStyles } from "@/components/app-ui/styles";
import { cn } from "@/lib/utils";

/** Roving-focus movement for a radiogroup: arrows wrap, Home/End jump. */
export function nextSegmentIndex(current: number, key: string, length: number): number | null {
  if (key === "ArrowRight" || key === "ArrowDown") return (current + 1) % length;
  if (key === "ArrowLeft" || key === "ArrowUp") return (current - 1 + length) % length;
  if (key === "Home") return 0;
  if (key === "End") return length - 1;
  return null;
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: ReactNode; count?: number }[];
  ariaLabel: string;
  className?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = nextSegmentIndex(index, event.key, options.length);
    if (next === null) return;
    event.preventDefault();
    onChange(options[next].value);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn("inline-flex max-w-full gap-1 overflow-x-auto rounded-lg bg-app-subtle p-1", className)}
    >
      {options.map((option, index) => {
        const selected = option.value === value;

        return (
          <button
            key={option.value}
            ref={(element) => {
              refs.current[index] = element;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={segmentStyles(selected)}
          >
            {option.label}
            {option.count !== undefined ? (
              <span className="rounded-md bg-app-subtle px-1.5 py-0.5 text-xs font-medium tabular-nums text-app-fg-secondary">
                {option.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
```

Create `components/app-ui/RadioCards.tsx`:

```tsx
"use client";

import { CheckCircle } from "@phosphor-icons/react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const COLUMNS = { 1: "", 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4" } as const;

export function RadioCards<T extends string>({
  name,
  value,
  onChange,
  options,
  ariaLabel,
  ariaLabelledBy,
  columns = 2,
  disabled = false,
  className,
}: {
  name: string;
  value: T;
  onChange: (value: T) => void;
  options: {
    value: T;
    label: ReactNode;
    description?: ReactNode;
    icon?: ReactNode;
    preview?: ReactNode;
    disabled?: boolean;
  }[];
  ariaLabel?: string;
  ariaLabelledBy?: string;
  columns?: 1 | 2 | 3 | 4;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      className={cn("grid grid-cols-1 gap-3", COLUMNS[columns], className)}
    >
      {options.map((option) => (
        <label
          key={option.value}
          className="group relative flex cursor-pointer flex-col gap-3 rounded-lg bg-app-surface p-4 ring-1 ring-app-border transition has-checked:ring-2 has-checked:ring-app-accent has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-app-accent has-disabled:cursor-not-allowed has-disabled:opacity-50"
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={option.value === value}
            disabled={disabled || option.disabled}
            onChange={() => onChange(option.value)}
            className="sr-only"
          />
          {option.preview}
          <span className="flex items-start gap-3">
            {option.icon ? <span className="shrink-0 text-app-fg-muted">{option.icon}</span> : null}
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-app-fg">{option.label}</span>
              {option.description ? (
                <span className="mt-1 block text-sm text-app-fg-muted">{option.description}</span>
              ) : null}
            </span>
            <CheckCircle
              aria-hidden="true"
              size={20}
              weight="fill"
              className="invisible shrink-0 text-app-accent group-has-checked:visible"
            />
          </span>
        </label>
      ))}
    </div>
  );
}
```

Create `components/app-ui/LanguageToggle.tsx`:

```tsx
"use client";

import { SegmentedControl } from "@/components/app-ui/SegmentedControl";
import { segmentStyles } from "@/components/app-ui/styles";
import { bookingTranslations } from "@/components/booking/i18n/translations";
import type { Lang } from "@/lib/types";
import { cn } from "@/lib/utils";

const LANGUAGES: Lang[] = ["en", "es"];

/**
 * EN/ES for signed-in surfaces. Same API as the public LanguageSwitcher:
 * links when the page builds the URLs (`hrefFor`), state otherwise.
 */
export function LanguageToggle({
  lang,
  onChange,
  hrefFor,
  className,
}: {
  lang: Lang;
  onChange?: (lang: Lang) => void;
  hrefFor?: (lang: Lang) => string;
  className?: string;
}) {
  const label = bookingTranslations[lang].language.chooseLanguage;

  if (hrefFor) {
    return (
      <div role="group" aria-label={label} className={cn("inline-flex gap-1 rounded-lg bg-app-subtle p-1", className)}>
        {LANGUAGES.map((option) => (
          <a
            key={option}
            href={hrefFor(option)}
            hrefLang={option}
            lang={option}
            aria-current={option === lang ? "true" : undefined}
            className={segmentStyles(option === lang)}
          >
            {option.toUpperCase()}
          </a>
        ))}
      </div>
    );
  }

  return (
    <SegmentedControl
      ariaLabel={label}
      value={lang}
      onChange={(next) => onChange?.(next)}
      options={LANGUAGES.map((option) => ({ value: option, label: option.toUpperCase() }))}
      className={className}
    />
  );
}
```

Append to `components/app-ui/index.ts`:

```ts
export { SegmentedControl, nextSegmentIndex } from "@/components/app-ui/SegmentedControl";
export { RadioCards } from "@/components/app-ui/RadioCards";
export { LanguageToggle } from "@/components/app-ui/LanguageToggle";
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run components/app-ui components/__tests__/app-ui-tokens.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/app-ui
git commit -m "feat(app-ui): add segmented control, radio cards and language toggle"
```

---

### Task 6: Dialogs

**Files:**
- Create: `components/app-ui/Dialog.tsx`
- Modify: `components/app-ui/index.ts`
- Test: `components/app-ui/__tests__/dialog.test.tsx`

**Interfaces:**
- Consumes: `Button`, `IconButton`, `Alert` (Tasks 2–3).
- Produces:
  - `isBackdropClick(rect: { left: number; top: number; right: number; bottom: number }, point: { x: number; y: number }): boolean`
  - `Dialog({ open: boolean; onClose: () => void; title: ReactNode; description?: ReactNode; size?: "sm" | "md" | "lg"; footer?: ReactNode; closeLabel?: string; children?: ReactNode })`
  - `DialogActions({ children })`
  - `ConfirmDialog({ open; title; body?: ReactNode; confirmLabel: string; cancelLabel: string; tone?: "danger" | "primary"; pending?: boolean; error?: ReactNode; onConfirm: () => void; onCancel: () => void; children?: ReactNode; closeLabel?: string })`

- [ ] **Step 1: Write the failing test**

Create `components/app-ui/__tests__/dialog.test.tsx`:

```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ConfirmDialog, Dialog, isBackdropClick } from "@/components/app-ui";

const rect = { left: 100, top: 100, right: 500, bottom: 400 };

describe("isBackdropClick", () => {
  it("is true only outside the panel", () => {
    expect(isBackdropClick(rect, { x: 50, y: 200 })).toBe(true);
    expect(isBackdropClick(rect, { x: 300, y: 450 })).toBe(true);
    expect(isBackdropClick(rect, { x: 300, y: 200 })).toBe(false);
    expect(isBackdropClick(rect, { x: 100, y: 100 })).toBe(false);
  });
});

describe("Dialog", () => {
  it("names itself from its title and description", () => {
    const html = renderToStaticMarkup(
      <Dialog open onClose={() => undefined} title="Reschedule" description="Pick a new time">
        <p>slots</p>
      </Dialog>,
    );
    const labelledBy = html.match(/aria-labelledby="([^"]+)"/)?.[1];
    const describedBy = html.match(/aria-describedby="([^"]+)"/)?.[1];

    expect(html).toMatch(/^<dialog/);
    expect(html).toContain(`id="${labelledBy}"`);
    expect(html).toContain(`id="${describedBy}"`);
    expect(html).toContain("slots");
  });

  it("never renders the open attribute itself (showModal owns it)", () => {
    const html = renderToStaticMarkup(
      <Dialog open onClose={() => undefined} title="T">
        x
      </Dialog>,
    );
    expect(html).not.toMatch(/<dialog[^>]*\sopen[\s=>]/);
  });

  it("renders no content while closed", () => {
    const html = renderToStaticMarkup(
      <Dialog open={false} onClose={() => undefined} title="Hidden title">
        secret
      </Dialog>,
    );
    expect(html).not.toContain("secret");
    expect(html).not.toContain("Hidden title");
  });
});

describe("ConfirmDialog", () => {
  it("disables both actions and shows progress while pending", () => {
    const html = renderToStaticMarkup(
      <ConfirmDialog
        open
        title="Cancel booking?"
        body="The client is emailed."
        confirmLabel="Cancel booking"
        cancelLabel="Keep booking"
        tone="danger"
        pending
        onConfirm={() => undefined}
        onCancel={() => undefined}
      />,
    );
    const buttons = html.match(/<button[^>]*>/g) ?? [];
    const actions = buttons.filter((tag) => !tag.includes("aria-label="));

    expect(actions).toHaveLength(2);
    expect(actions.every((tag) => tag.includes("disabled"))).toBe(true);
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("bg-app-danger");
  });

  it("shows a failure inside the dialog", () => {
    const html = renderToStaticMarkup(
      <ConfirmDialog
        open
        title="Delete?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        error="Could not delete."
        onConfirm={() => undefined}
        onCancel={() => undefined}
      />,
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain("Could not delete.");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run components/app-ui/__tests__/dialog.test.tsx`
Expected: FAIL — `Dialog` is not exported.

- [ ] **Step 3: Implement**

Create `components/app-ui/Dialog.tsx`:

```tsx
"use client";

import { X } from "@phosphor-icons/react";
import { useEffect, useId, useRef, type MouseEvent, type ReactNode } from "react";

import { Alert } from "@/components/app-ui/Alert";
import { Button, IconButton } from "@/components/app-ui/Button";
import { cn } from "@/lib/utils";

/** A click on the dialog element outside its panel box hit the backdrop. */
export function isBackdropClick(
  rect: { left: number; top: number; right: number; bottom: number },
  point: { x: number; y: number },
) {
  return point.x < rect.left || point.x > rect.right || point.y < rect.top || point.y > rect.bottom;
}

const SIZES = { sm: "sm:max-w-md", md: "sm:max-w-lg", lg: "sm:max-w-3xl" } as const;

/**
 * A native modal dialog. `showModal()` gives the top layer, an inert page,
 * focus containment and Esc; this component adds the look, labelling, scroll
 * lock and focus return. The `open` attribute is never rendered: calling
 * showModal() on an element that already has it throws.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  size = "md",
  footer,
  closeLabel = "Close",
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  size?: keyof typeof SIZES;
  footer?: ReactNode;
  closeLabel?: string;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !open) return;

    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.documentElement.style.overflow;

    if (!dialog.open) dialog.showModal();
    document.documentElement.style.overflow = "hidden";

    return () => {
      if (dialog.open) dialog.close();
      document.documentElement.style.overflow = previousOverflow;
      opener?.focus();
    };
  }, [open]);

  function onClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target !== event.currentTarget) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (isBackdropClick(rect, { x: event.clientX, y: event.clientY })) onClose();
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={onClick}
      className={cn(
        "m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-hidden rounded-t-2xl bg-app-surface p-0 text-app-fg shadow-xl ring-1 ring-app-border backdrop:bg-app-overlay open:animate-app-dialog-in sm:m-auto sm:rounded-xl",
        SIZES[size],
      )}
    >
      {open ? (
        <div className="flex max-h-[92dvh] flex-col">
          <div className="flex items-start gap-4 px-4 pb-2 pt-5 sm:px-6">
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="text-base font-semibold text-app-fg">
                {title}
              </h2>
              {description ? (
                <p id={descriptionId} className="mt-1 text-sm text-app-fg-muted">
                  {description}
                </p>
              ) : null}
            </div>
            <IconButton
              label={closeLabel}
              icon={<X aria-hidden="true" size={18} />}
              size="sm"
              onClick={onClose}
              className="-mr-2 -mt-1"
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-6">{children}</div>
          {footer ? <div className="border-t border-app-border px-4 py-3 sm:px-6">{footer}</div> : null}
        </div>
      ) : null}
    </dialog>
  );
}

export function DialogActions({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end [&>*]:w-full sm:[&>*]:w-auto">
      {children}
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  tone = "danger",
  pending = false,
  error,
  onConfirm,
  onCancel,
  closeLabel,
  children,
}: {
  open: boolean;
  title: ReactNode;
  body?: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  tone?: "danger" | "primary";
  pending?: boolean;
  error?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  closeLabel?: string;
  children?: ReactNode;
}) {
  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!pending) onCancel();
      }}
      title={title}
      size="sm"
      closeLabel={closeLabel}
      footer={
        <DialogActions>
          <Button variant="secondary" disabled={pending} onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={tone} loading={pending} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </DialogActions>
      }
    >
      <div className="grid gap-4">
        {body ? <div className="text-sm text-app-fg-secondary">{body}</div> : null}
        {children}
        {error ? (
          <Alert tone="danger" role="alert">
            {error}
          </Alert>
        ) : null}
      </div>
    </Dialog>
  );
}
```

> The close `IconButton` carries `aria-label`, which is how the test tells it apart from the two actions. `pending` disables the cancel action explicitly and the confirm action through `loading`.

Append to `components/app-ui/index.ts`:

```ts
export { Dialog, DialogActions, ConfirmDialog, isBackdropClick } from "@/components/app-ui/Dialog";
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run components/app-ui components/__tests__/app-ui-tokens.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/app-ui
git commit -m "feat(app-ui): add native dialog and confirm dialog"
```

---

### Task 7: Toasts

**Files:**
- Create: `components/app-ui/toast-state.ts`, `components/app-ui/Toast.tsx`
- Modify: `components/app-ui/index.ts`
- Test: `components/app-ui/__tests__/toast.test.tsx`

**Interfaces:**
- Consumes: `IconButton` (Task 2).
- Produces:
  - `TOAST_DURATION_MS = 4000`, `MAX_TOASTS = 3`
  - `type ToastTone = "success" | "neutral"`; `type ToastItem = { id: number; tone: ToastTone; message: string; remainingMs: number; paused: boolean }`; `type ToastState = { items: ToastItem[]; nextId: number }`
  - `type ToastAction = { type: "add"; tone: ToastTone; message: string } | { type: "dismiss"; id: number } | { type: "pause"; id: number; elapsedMs: number } | { type: "resume"; id: number }`
  - `initialToastState: ToastState`; `toastReducer(state: ToastState, action: ToastAction): ToastState`
  - `ToastProvider({ dismissLabel?: string; children })` — renders the live region once; nested providers pass through
  - `useToast(): { notify: (toast: { tone?: ToastTone; message: string }) => void }` — no-op outside a provider

- [ ] **Step 1: Write the failing test**

Create `components/app-ui/__tests__/toast.test.tsx`:

```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  MAX_TOASTS,
  TOAST_DURATION_MS,
  ToastProvider,
  initialToastState,
  toastReducer,
} from "@/components/app-ui";

function add(state = initialToastState, message = "Saved") {
  return toastReducer(state, { type: "add", tone: "success", message });
}

describe("toastReducer", () => {
  it("adds a toast with the full duration", () => {
    const state = add();
    expect(state.items).toEqual([
      { id: 0, tone: "success", message: "Saved", remainingMs: TOAST_DURATION_MS, paused: false },
    ]);
    expect(state.nextId).toBe(1);
  });

  it("keeps at most three, dropping the oldest", () => {
    let state = initialToastState;
    for (const message of ["a", "b", "c", "d"]) state = add(state, message);
    expect(state.items).toHaveLength(MAX_TOASTS);
    expect(state.items.map((item) => item.message)).toEqual(["b", "c", "d"]);
  });

  it("dismisses by id", () => {
    const state = toastReducer(add(add()), { type: "dismiss", id: 0 });
    expect(state.items.map((item) => item.id)).toEqual([1]);
  });

  it("pauses with the time already shown taken off, then resumes", () => {
    const paused = toastReducer(add(), { type: "pause", id: 0, elapsedMs: 1500 });
    expect(paused.items[0]).toMatchObject({ paused: true, remainingMs: TOAST_DURATION_MS - 1500 });

    const resumed = toastReducer(paused, { type: "resume", id: 0 });
    expect(resumed.items[0]).toMatchObject({ paused: false, remainingMs: TOAST_DURATION_MS - 1500 });
  });

  it("never lets remaining time go below zero", () => {
    const paused = toastReducer(add(), { type: "pause", id: 0, elapsedMs: 99_999 });
    expect(paused.items[0].remainingMs).toBe(0);
  });

  it("ignores pausing an already paused toast", () => {
    const once = toastReducer(add(), { type: "pause", id: 0, elapsedMs: 1000 });
    expect(toastReducer(once, { type: "pause", id: 0, elapsedMs: 1000 })).toBe(once);
  });
});

describe("ToastProvider", () => {
  it("renders one polite live region", () => {
    const html = renderToStaticMarkup(
      <ToastProvider>
        <p>page</p>
      </ToastProvider>,
    );
    expect(html.match(/role="status"/g)).toHaveLength(1);
    expect(html).toContain('aria-live="polite"');
  });

  it("does not add a second region when nested", () => {
    const html = renderToStaticMarkup(
      <ToastProvider>
        <ToastProvider>
          <p>module</p>
        </ToastProvider>
      </ToastProvider>,
    );
    expect(html.match(/role="status"/g)).toHaveLength(1);
    expect(html).toContain("module");
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run components/app-ui/__tests__/toast.test.tsx`
Expected: FAIL — `toastReducer` is not exported.

- [ ] **Step 3: Implement the reducer**

Create `components/app-ui/toast-state.ts`:

```ts
export const TOAST_DURATION_MS = 4000;
export const MAX_TOASTS = 3;

export type ToastTone = "success" | "neutral";

export type ToastItem = {
  id: number;
  tone: ToastTone;
  message: string;
  remainingMs: number;
  paused: boolean;
};

export type ToastState = { items: ToastItem[]; nextId: number };

export type ToastAction =
  | { type: "add"; tone: ToastTone; message: string }
  | { type: "dismiss"; id: number }
  | { type: "pause"; id: number; elapsedMs: number }
  | { type: "resume"; id: number };

export const initialToastState: ToastState = { items: [], nextId: 0 };

export function toastReducer(state: ToastState, action: ToastAction): ToastState {
  switch (action.type) {
    case "add": {
      const item: ToastItem = {
        id: state.nextId,
        tone: action.tone,
        message: action.message,
        remainingMs: TOAST_DURATION_MS,
        paused: false,
      };
      return { items: [...state.items, item].slice(-MAX_TOASTS), nextId: state.nextId + 1 };
    }
    case "dismiss":
      return { ...state, items: state.items.filter((item) => item.id !== action.id) };
    case "pause": {
      const target = state.items.find((item) => item.id === action.id);
      if (!target || target.paused) return state;
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.id
            ? { ...item, paused: true, remainingMs: Math.max(0, item.remainingMs - action.elapsedMs) }
            : item,
        ),
      };
    }
    case "resume":
      return {
        ...state,
        items: state.items.map((item) => (item.id === action.id ? { ...item, paused: false } : item)),
      };
  }
}
```

- [ ] **Step 4: Implement the provider**

Create `components/app-ui/Toast.tsx`:

```tsx
"use client";

import { CheckCircle, Info, X } from "@phosphor-icons/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type Dispatch,
  type ReactNode,
} from "react";

import { IconButton } from "@/components/app-ui/Button";
import {
  initialToastState,
  toastReducer,
  type ToastAction,
  type ToastItem,
  type ToastTone,
} from "@/components/app-ui/toast-state";

type ToastApi = { notify: (toast: { tone?: ToastTone; message: string }) => void };

const ToastContext = createContext<ToastApi | null>(null);
const NO_TOASTS: ToastApi = { notify: () => undefined };

/** Outside a provider, notifications are dropped rather than throwing. */
export function useToast(): ToastApi {
  return useContext(ToastContext) ?? NO_TOASTS;
}

/**
 * Transient confirmations ("Saved", "Link copied"). One live region per page:
 * a provider inside another passes straight through, so the dashboard shell
 * and the module can both mount one.
 */
export function ToastProvider({
  dismissLabel = "Dismiss notification",
  children,
}: {
  dismissLabel?: string;
  children: ReactNode;
}) {
  const parent = useContext(ToastContext);

  if (parent) {
    return <>{children}</>;
  }

  return <ToastRoot dismissLabel={dismissLabel}>{children}</ToastRoot>;
}

function ToastRoot({ dismissLabel, children }: { dismissLabel: string; children: ReactNode }) {
  const [state, dispatch] = useReducer(toastReducer, initialToastState);
  const notify = useCallback<ToastApi["notify"]>(
    ({ tone = "success", message }) => dispatch({ type: "add", tone, message }),
    [],
  );
  const api = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6"
      >
        {state.items.map((item) => (
          <Toast key={item.id} item={item} dispatch={dispatch} dismissLabel={dismissLabel} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function Toast({
  item,
  dispatch,
  dismissLabel,
}: {
  item: ToastItem;
  dispatch: Dispatch<ToastAction>;
  dismissLabel: string;
}) {
  const startedAt = useRef(0);

  useEffect(() => {
    if (item.paused) return;
    startedAt.current = Date.now();
    const timer = window.setTimeout(() => dispatch({ type: "dismiss", id: item.id }), item.remainingMs);
    return () => window.clearTimeout(timer);
  }, [item.paused, item.remainingMs, item.id, dispatch]);

  const pause = () => dispatch({ type: "pause", id: item.id, elapsedMs: Date.now() - startedAt.current });
  const resume = () => dispatch({ type: "resume", id: item.id });
  const Icon = item.tone === "success" ? CheckCircle : Info;

  return (
    <div
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocus={pause}
      onBlur={resume}
      className="pointer-events-auto flex w-full max-w-sm animate-app-toast-in items-center gap-3 rounded-xl bg-app-surface p-3 pl-4 shadow-lg ring-1 ring-app-border"
    >
      <Icon
        aria-hidden="true"
        size={20}
        weight="fill"
        className={item.tone === "success" ? "shrink-0 text-app-success-fg" : "shrink-0 text-app-fg-muted"}
      />
      <p className="min-w-0 flex-1 text-sm font-medium text-app-fg">{item.message}</p>
      <IconButton
        label={dismissLabel}
        icon={<X aria-hidden="true" size={16} />}
        size="sm"
        onClick={() => dispatch({ type: "dismiss", id: item.id })}
      />
    </div>
  );
}
```

Append to `components/app-ui/index.ts`:

```ts
export {
  MAX_TOASTS,
  TOAST_DURATION_MS,
  initialToastState,
  toastReducer,
  type ToastAction,
  type ToastItem,
  type ToastState,
  type ToastTone,
} from "@/components/app-ui/toast-state";
export { ToastProvider, useToast } from "@/components/app-ui/Toast";
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run components/app-ui components/__tests__/app-ui-tokens.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/app-ui
git commit -m "feat(app-ui): add toast queue and provider"
```

---

### Task 8: Shell restyle

**Files:**
- Modify: `components/app-shell/AppShell.tsx`, `components/app-shell/SidebarNav.tsx`, `components/app-shell/ShellIcon.tsx`, `components/app-shell/ShellFooter.tsx`
- Create: `components/app-shell/ShellSidebarParts.tsx`
- Test: `components/app-shell/__tests__/app-shell.test.tsx`

**Interfaces:**
- Consumes: `Avatar`, `Badge`, `IconButton`, `focusRing` (Tasks 2–3); `ShellLink` (existing).
- Produces:
  - `shellNavItemClass: string`, `shellNavItemStateClass(active: boolean): string`, `shellNavItemAdminClass: string` (SidebarNav)
  - `ShellBrand({ href: string; onNavigate?: () => void; badge?: ReactNode })`
  - `ShellWorkspace({ name: string; logoUrl?: string; status: { tone: "success" | "danger"; label: string } })`
  - `ShellAccount({ email?: string; signedInAsLabel: string; signOutLabel: string; signOutAction: () => void | Promise<void> })`
  - `AppShell` props unchanged.

- [ ] **Step 1: Update and extend the shell test**

In `components/app-shell/__tests__/app-shell.test.tsx`:

1. Replace the `const { Alert } = await import("@/components/ui/Alert");` line and the whole `describe("Alert", …)` block — `Alert` coverage moved to `components/app-ui/__tests__/display.test.tsx` in Task 3.
2. Add these imports next to the others:

```tsx
const { ShellAccount, ShellBrand, ShellWorkspace } = await import(
  "@/components/app-shell/ShellSidebarParts"
);
```

3. Add inside `describe("SidebarNav", …)`:

```tsx
  it("colors the active item from app tokens", () => {
    const html = renderToStaticMarkup(
      <SidebarNav groups={groups} activeId="bookings" ariaLabel="Dashboard" />,
    );
    expect(html).toContain("text-app-accent");
    expect(html).not.toContain("var(--");
  });
```

4. Add inside `describe("AppShell", …)`:

```tsx
  it("paints the page on the app canvas", () => {
    expect(html).toContain("bg-app-canvas");
    expect(html).not.toContain("var(--");
  });
```

5. Append:

```tsx
describe("sidebar parts", () => {
  const longName = "The Extremely Long Family Medicine And Pediatrics Practice Of Doctor Rivera";
  const longEmail = "someone.with.a.very.long.address@an-extremely-long-domain-example.com";

  it("links the brand home and shows an optional badge", () => {
    const html = renderToStaticMarkup(<ShellBrand href="/super-admin" badge={<span>Super admin</span>} />);
    expect(html).toContain('href="/super-admin"');
    expect(html).toContain("Haab Calendar");
    expect(html).toContain("Super admin");
  });

  it("truncates a long business name and keeps it in a title", () => {
    const html = renderToStaticMarkup(
      <ShellWorkspace name={longName} status={{ tone: "success", label: "Live" }} />,
    );
    expect(html).toContain(`title="${longName}"`);
    expect(html).toContain("truncate");
    expect(html).toContain("Live");
  });

  it("keeps sign-out reachable beside a long email", () => {
    const html = renderToStaticMarkup(
      <ShellAccount
        email={longEmail}
        signedInAsLabel="Signed in as"
        signOutLabel="Sign out"
        signOutAction={async () => undefined}
      />,
    );
    expect(html).toContain(`title="${longEmail}"`);
    expect(html).toContain("min-w-0 flex-1");
    expect(html).toMatch(/<button[^>]*type="submit"[^>]*aria-label="Sign out"|<button[^>]*aria-label="Sign out"[^>]*type="submit"/);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run components/app-shell`
Expected: FAIL — `ShellSidebarParts` does not exist; `text-app-accent`/`bg-app-canvas` missing.

- [ ] **Step 3: Restyle `SidebarNav.tsx`**

Replace the two exported class helpers and the badge/label markup:

```tsx
export const shellNavItemClass =
  "group flex h-11 items-center gap-x-3 rounded-lg px-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent sm:h-9";

export function shellNavItemStateClass(active: boolean) {
  return active
    ? "bg-app-subtle text-app-accent"
    : "text-app-fg-secondary hover:bg-app-subtle hover:text-app-fg";
}

/** Super-admin signpost: the entry point from the dashboard into the admin area. */
export const shellNavItemAdminClass = "text-app-admin-fg hover:bg-app-admin-soft";
```

In `SidebarNav`, change the group label class to `"px-2 text-xs font-semibold text-app-fg-muted"`, the `<nav>` class to `"grid gap-6"`, and replace the badge `<span>` with:

```tsx
                    {item.badge !== undefined ? <Badge tone="neutral">{item.badge}</Badge> : null}
```

Add `import { Badge } from "@/components/app-ui";`.

- [ ] **Step 4: Restyle `ShellIcon.tsx`**

Replace the component:

```tsx
export function ShellIcon({ name, active = false }: { name: ShellIconName; active?: boolean }) {
  const Component = ICONS[name];
  return (
    <Component
      aria-hidden="true"
      size={20}
      weight={active ? "fill" : "regular"}
      className={active ? "shrink-0 text-app-accent" : "shrink-0 text-app-fg-muted group-hover:text-app-fg"}
    />
  );
}
```


- [ ] **Step 5: Restyle `ShellFooter.tsx`**

```tsx
export function ShellFooter({
  links,
  note,
}: {
  links: { href: string; label: string; external?: boolean }[];
  note: string;
}) {
  const linkClass =
    "inline-flex min-h-11 items-center rounded-md transition-colors hover:text-app-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent sm:min-h-0";

  return (
    <footer className="border-t border-app-border px-4 py-6 text-sm text-app-fg-muted sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p>{note}</p>
        <ul className="flex flex-wrap gap-x-5">
          {links.map((link) => (
            <li key={link.href}>
              {link.external ? (
                <a href={link.href} target="_blank" rel="noopener noreferrer" className={linkClass}>
                  {link.label}
                </a>
              ) : (
                <Link href={link.href} className={linkClass}>
                  {link.label}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
```

- [ ] **Step 6: Create `ShellSidebarParts.tsx`**

```tsx
"use client";

import { SignOut } from "@phosphor-icons/react";
import Link from "next/link";
import type { ReactNode } from "react";

import { ShellLink } from "@/components/app-shell/SidebarNav";
import { Avatar, Badge, IconButton } from "@/components/app-ui";

const brandClass =
  "flex min-h-11 items-center gap-2.5 rounded-lg px-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-app-accent";

/** Haab mark + name, linking to the area's home. */
export function ShellBrand({
  href,
  onNavigate,
  badge,
}: {
  href: string;
  /** Client-side navigation (dashboard); omitted → next/link. */
  onNavigate?: () => void;
  badge?: ReactNode;
}) {
  const content = (
    <>
      <span
        aria-hidden="true"
        className="grid size-8 shrink-0 place-items-center rounded-lg bg-app-accent text-sm font-bold text-app-on-accent"
      >
        H
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold text-app-fg">Haab Calendar</span>
        {badge ? <span className="mt-0.5 block">{badge}</span> : null}
      </span>
    </>
  );

  return onNavigate ? (
    <ShellLink href={href} onNavigate={onNavigate} className={brandClass}>
      {content}
    </ShellLink>
  ) : (
    <Link href={href} className={brandClass}>
      {content}
    </Link>
  );
}

/** The business this workspace manages, and whether its page is live. */
export function ShellWorkspace({
  name,
  logoUrl,
  status,
}: {
  name: string;
  logoUrl?: string;
  status: { tone: "success" | "danger"; label: string };
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-lg p-2 ring-1 ring-app-border">
      <Avatar name={name} src={logoUrl} shape="square" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-app-fg" title={name}>
          {name}
        </p>
        <Badge tone={status.tone} dot className="mt-1">
          {status.label}
        </Badge>
      </div>
    </div>
  );
}

/**
 * Who is signed in, and the way out. A flex row with a shrinking middle: a
 * long email truncates instead of pushing sign-out out of the sidebar.
 */
export function ShellAccount({
  email,
  signedInAsLabel,
  signOutLabel,
  signOutAction,
}: {
  email?: string;
  signedInAsLabel: string;
  signOutLabel: string;
  signOutAction: () => void | Promise<void>;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 px-2">
      <Avatar name={email ?? "?"} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-app-fg-muted">{signedInAsLabel}</p>
        <p className="truncate text-sm font-medium text-app-fg" title={email}>
          {email}
        </p>
      </div>
      <form action={signOutAction}>
        <IconButton type="submit" label={signOutLabel} icon={<SignOut aria-hidden="true" size={18} />} />
      </form>
    </div>
  );
}
```

- [ ] **Step 7: Restyle `AppShell.tsx`**

Keep all hooks and keyboard logic unchanged. Replace the JSX `return (...)` with:

```tsx
  return (
    <div className="min-h-screen bg-app-canvas lg:grid lg:grid-cols-[272px_minmax(0,1fr)]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-app-fg focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-app-surface"
      >
        {copy.skipToContent}
      </a>

      <aside
        data-shell-sidebar=""
        className="hidden border-r border-app-border bg-app-surface lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:overflow-y-auto"
      >
        {sidebar}
      </aside>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            tabIndex={-1}
            aria-label={copy.closeMenu}
            onClick={() => setOpenFor(null)}
            className="absolute inset-0 bg-app-overlay"
          />
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label={copy.menu ?? copy.openMenu}
            className="relative mr-16 flex h-full w-full max-w-[288px] animate-app-drawer-in"
          >
            <div className="absolute left-full top-0 flex w-16 justify-center pt-3">
              <button
                type="button"
                aria-label={copy.closeMenu}
                onClick={() => setOpenFor(null)}
                className="inline-flex size-11 items-center justify-center rounded-full bg-app-surface text-app-fg shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent"
              >
                <X aria-hidden="true" size={22} />
              </button>
            </div>
            <div className="flex w-full flex-col overflow-y-auto bg-app-surface shadow-xl">{sidebar}</div>
          </div>
        </div>
      ) : null}

      <div className="flex min-h-screen min-w-0 flex-col">
        <header className="sticky top-0 z-40 border-b border-app-border bg-app-surface">
          <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              ref={menuButtonRef}
              type="button"
              aria-label={copy.openMenu}
              aria-expanded={open}
              onClick={() => setOpenFor(navigationKey)}
              className="-ml-2 inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-app-fg-secondary hover:bg-app-subtle focus-visible:outline-2 focus-visible:outline-app-accent lg:hidden"
            >
              <List aria-hidden="true" size={22} />
            </button>
            <div className="min-w-0 flex-1">
              <h1
                id="shell-title"
                tabIndex={-1}
                className="truncate text-lg font-semibold text-app-fg focus:outline-none sm:text-xl"
              >
                {title}
              </h1>
              {description ? (
                <p className="hidden truncate text-sm text-app-fg-muted lg:block">{description}</p>
              ) : null}
            </div>
            {topBarActions ? <div className="flex shrink-0 items-center gap-2">{topBarActions}</div> : null}
          </div>
        </header>

        {banners ? (
          <div className="mx-auto w-full max-w-7xl space-y-3 px-4 pt-6 sm:px-6 lg:px-8">{banners}</div>
        ) : null}

        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 focus:outline-none sm:px-6 lg:px-8"
        >
          {children}
        </main>

        {footer}
      </div>
    </div>
  );
```

> The drawer `ref` now wraps both the panel and the outside close button, so the existing focus trap includes the close button.

- [ ] **Step 8: Run tests**

Run: `npx vitest run components/app-shell components/__tests__`
Expected: PASS. (`status-color-tokens.test.ts` still passes: it does not scan `components/app-shell`.)

- [ ] **Step 9: Commit**

```bash
git add components/app-shell
git commit -m "feat(shell): restyle app shell on the app-ui kit"
```

---

### Task 9: Dashboard and super-admin shells on the kit

**Files:**
- Modify: `components/provider/DashboardApp.tsx` (imports, `topActionClass`, `copyPublicLink`, `sidebar`, `topBarActions`, `banners`, root return, `SectionPlaceholder`)
- Modify: `components/provider/dashboard-copy.ts` (type + en + es)
- Modify: `components/super-admin/SuperAdminShell.tsx`
- Test: `components/provider/__tests__/dashboard-copy.test.ts`, `components/provider/__tests__/dashboard-app.test.tsx`

**Interfaces:**
- Consumes: `ShellBrand`, `ShellWorkspace`, `ShellAccount`, `shellNavItemClass`, `shellNavItemAdminClass` (Task 8); `Alert`, `Button`, `ButtonLink`, `Badge`, `Skeleton`, `ToastProvider`, `useToast` (Tasks 2–7).
- Produces: `DashboardShellCopy.linkCopiedToast: string`, `DashboardShellCopy.dismiss: string`.

- [ ] **Step 1: Write the failing copy test**

Add to `components/provider/__tests__/dashboard-copy.test.ts` inside the `describe`:

```ts
  it("words toasts in both languages", () => {
    for (const key of ["linkCopiedToast", "dismiss"] as const) {
      expect(dashboardCopy.en[key]).toBeTruthy();
      expect(dashboardCopy.es[key]).toBeTruthy();
      expect(dashboardCopy.es[key]).not.toBe(dashboardCopy.en[key]);
    }
  });
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run components/provider/__tests__/dashboard-copy.test.ts`
Expected: FAIL — `expected undefined to be truthy`.

- [ ] **Step 3: Add the copy**

In `components/provider/dashboard-copy.ts`: add to `DashboardShellCopy` after `linkCopied: string;`:

```ts
  /** Toast after copying the booking link. */
  linkCopiedToast: string;
  /** Label of a toast's close button. */
  dismiss: string;
```

In `en` after `linkCopied: "Copied",`:

```ts
    linkCopiedToast: "Booking link copied",
    dismiss: "Dismiss notification",
```

In `es` after `linkCopied: "Copiado",`:

```ts
    linkCopiedToast: "Enlace de reservas copiado",
    dismiss: "Cerrar aviso",
```

Run: `npx vitest run components/provider/__tests__/dashboard-copy.test.ts` → PASS.

- [ ] **Step 4: Move `DashboardApp` onto the kit**

1. Imports: remove `SignOut`, `Copy`/`Check`/`ArrowSquareOut` stay; remove `ShellIcon` only if unused after step 3; remove the `super-admin-accent` import block; replace `import { Alert } from "@/components/ui/Alert";` with:

```tsx
import { ShellAccount, ShellBrand, ShellWorkspace } from "@/components/app-shell/ShellSidebarParts";
import { Alert, Button, ButtonLink, Skeleton, ToastProvider, useToast } from "@/components/app-ui";
```

and change the SidebarNav import to `import { SidebarNav, shellNavItemAdminClass, shellNavItemClass } from "@/components/app-shell/SidebarNav";`.

2. Delete `topActionClass`.

3. Rename the component body: the exported `DashboardApp` becomes a wrapper that provides toasts, and the current body moves into `DashboardAppContent` so it can call `useToast()`:

```tsx
export function DashboardApp(props: DashboardAppProps) {
  const lang: Lang = props.store.provider.dashboardLanguage ?? props.viewerLanguage;

  return (
    <ToastProvider dismissLabel={dashboardCopy[lang].dismiss}>
      <DashboardAppContent {...props} />
    </ToastProvider>
  );
}

function DashboardAppContent({
  initialSection,
  // …the existing destructured props, unchanged
}: DashboardAppProps) {
  const { notify } = useToast();
  // …existing body
```

> The provider reads the initial dashboard language; the content re-renders with the live one. A language switch mid-session leaves only the toast close-button label in the old language until reload, which is acceptable and avoids remounting the module.

4. In `copyPublicLink`, after `setCopied(true);` add:

```tsx
      notify({ message: shell.linkCopiedToast });
```

5. Replace the whole `const sidebar = (…);` with:

```tsx
  const sidebar = (
    <div className="flex min-h-full flex-1 flex-col gap-6 px-4 pb-5 pt-4">
      <ShellBrand href={pathForSection("dashboard")} onNavigate={() => navigate("dashboard")} />

      <ShellWorkspace
        name={businessName}
        logoUrl={snapshot.provider.logoImageUrl || undefined}
        status={
          publishingOff
            ? { tone: "danger", label: shell.publishingOff }
            : { tone: "success", label: shell.pageLive }
        }
      />

      <SidebarNav
        groups={navGroups}
        activeId={section}
        ariaLabel={shell.navLabel}
        onNavigate={(item) => navigate(item.id as AdminTab)}
      />

      <div className="mt-auto flex flex-col gap-3 border-t border-app-border pt-4">
        {isSuperAdmin ? (
          <Link href="/super-admin" className={cn(shellNavItemClass, shellNavItemAdminClass)}>
            <span className="text-current">
              <ShieldStar aria-hidden="true" size={20} className="shrink-0" />
            </span>
            <span className="min-w-0 flex-1 truncate">{shell.superAdmin}</span>
          </Link>
        ) : null}
        <ShellAccount
          email={email}
          signedInAsLabel={shell.signedInAs}
          signOutLabel={shell.signOut}
          signOutAction={logout}
        />
      </div>
    </div>
  );
```

Add `ShieldStar` to the `@phosphor-icons/react` import and drop `SignOut` and the now-unused `ShellIcon` import.

6. Replace `topBarActions` with:

```tsx
  const topBarActions = publicPath ? (
    <>
      <Button
        variant="secondary"
        onClick={copyPublicLink}
        leadingIcon={copied ? <Check aria-hidden="true" size={16} /> : <Copy aria-hidden="true" size={16} />}
        className="max-sm:w-11 max-sm:px-0"
      >
        <span className="sr-only sm:not-sr-only">{copied ? shell.linkCopied : shell.copyLink}</span>
      </Button>
      <ButtonLink
        href={publicPath}
        external
        variant="secondary"
        className="max-sm:w-11 max-sm:px-0 max-sm:[&>svg:last-child]:hidden"
        leadingIcon={<ArrowSquareOut aria-hidden="true" size={16} className="sm:hidden" />}
      >
        <span className="sr-only sm:not-sr-only">{shell.viewPage}</span>
      </ButtonLink>
    </>
  ) : undefined;
```

> Below `sm` both are 44px icon buttons (copy icon; open-in-new icon); from `sm` they show text, and View page shows the ↗ that `external` adds.

7. In `banners`, change the demo-edit `Alert` to:

```tsx
          <Alert
            tone="admin"
            title={shell.editingDemo}
            actions={
              <>
                <ButtonLink href={demoEdit.publicPath} external variant="plain" size="sm">
                  {shell.viewLive}
                </ButtonLink>
                <form action={stopDemoEdit}>
                  <Button type="submit" variant="secondary" size="sm">
                    {shell.exitDemo}
                  </Button>
                </form>
              </>
            }
          >
            {demoEdit.label} · {demoEdit.publicPath}
          </Alert>
```

The other banner `Alert`s keep their props (the app-ui `Alert` has the same API).

8. Replace `SectionPlaceholder`:

```tsx
/** Holds the section's space while the module mounts, without layout jump. */
function SectionPlaceholder() {
  return (
    <div aria-hidden="true" className="grid gap-6">
      <Skeleton className="h-32 rounded-xl" />
      <Skeleton className="h-72 rounded-xl" />
    </div>
  );
}
```

- [ ] **Step 5: Move `SuperAdminShell` onto the kit**

Replace imports of `SignOut`, `ShellIcon`, `super-admin-accent`, `shellNavItemStateClass` usage as follows, and the `sidebar`:

```tsx
import { ArrowLeft } from "@phosphor-icons/react";
// …
import { ShellAccount, ShellBrand } from "@/components/app-shell/ShellSidebarParts";
import { SidebarNav, shellNavItemClass, shellNavItemStateClass } from "@/components/app-shell/SidebarNav";
import { Badge, ToastProvider } from "@/components/app-ui";
```

```tsx
  const sidebar = (
    <div className="flex min-h-full flex-1 flex-col gap-6 px-4 pb-5 pt-4">
      <ShellBrand href="/super-admin" badge={<Badge tone="admin">Super admin</Badge>} />

      <SidebarNav groups={groups} activeId={page.id} ariaLabel="Super admin" />

      <div className="mt-auto flex flex-col gap-3 border-t border-app-border pt-4">
        <Link href="/dashboard" className={cn(shellNavItemClass, shellNavItemStateClass(false))}>
          <ArrowLeft aria-hidden="true" size={20} className="shrink-0 text-app-fg-muted" />
          <span className="min-w-0 flex-1 truncate">My dashboard</span>
        </Link>
        <ShellAccount
          email={email}
          signedInAsLabel="Signed in as"
          signOutLabel="Sign out"
          signOutAction={logout}
        />
      </div>
    </div>
  );
```

Wrap the returned `<AppShell …>` in `<ToastProvider>…</ToastProvider>`.

- [ ] **Step 6: Run the affected tests**

Run: `npx vitest run components/provider components/super-admin components/app-shell components/__tests__`
Expected: PASS. If `dashboard-app.test.tsx` asserts old class strings or the `"Copied"` text in a top-bar `<button>`, update the assertion to the new markup (the button still contains the copy label text; the anchor still has `href` to the public path and `target="_blank"`). Do not delete assertions about presence.

- [ ] **Step 7: Typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add components/provider/DashboardApp.tsx components/provider/dashboard-copy.ts components/provider/__tests__ components/super-admin/SuperAdminShell.tsx
git commit -m "feat(dashboard): move dashboard and super admin shells onto app-ui"
```

---

### Task 10: Save bar and module toasts

**Files:**
- Modify: `components/provider/SaveBar.tsx`
- Modify: `components/haab-booking-module.tsx` (the `chrome="module"` management block near the end of the file: `{surface === "management" && surfaceMode === "adaptive" ? (<div className="p-5 sm:p-8">{renderManagementSections()}{saveBar}</div>) : …}`)
- Test: `components/provider/__tests__/save-bar.test.tsx`

**Interfaces:**
- Consumes: `Alert`, `Button`, `useToast`, `ToastProvider` (Tasks 3, 2, 7); `dashboardCopy[lang].dismiss` (Task 9).
- Produces: `SaveBar` props unchanged; a success `message` becomes a toast instead of inline markup.

- [ ] **Step 1: Update the test for the new behavior**

In `components/provider/__tests__/save-bar.test.tsx`, replace the last test (`"confirms a save once the changes are gone"`) with:

```tsx
  it("leaves the save confirmation to a toast instead of inline markup", () => {
    const html = renderToStaticMarkup(
      <SaveBar visible={false} saving={false} message="Saved" onSave={noop} lang="en" />,
    );

    expect(html).toBe("");
  });

  it("marks the save button busy while saving", () => {
    const html = renderToStaticMarkup(<SaveBar visible saving onSave={noop} lang="en" />);

    expect(html).toContain('aria-busy="true"');
  });
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run components/provider/__tests__/save-bar.test.tsx`
Expected: FAIL — inline "Saved" status still renders; no `aria-busy`.

- [ ] **Step 3: Implement**

Replace `components/provider/SaveBar.tsx` with:

```tsx
"use client";

import { useEffect } from "react";

import { Alert, Button, useToast } from "@/components/app-ui";
import { bookingTranslations } from "@/components/booking/i18n/translations";
import { dashboardCopy } from "@/components/provider/dashboard-copy";
import type { Lang } from "@/lib/types";

/**
 * One save control for every section whose edits wait for "Save changes".
 * Sticks to the bottom of the content while there is something to save, so
 * an edit made in Appearance is still one click from saved after the owner
 * has moved on to Bookings. A finished save is confirmed with a toast; a
 * failed one stays here, next to the button that retries it.
 */
export function SaveBar({
  visible,
  saving,
  error,
  message,
  onSave,
  lang,
}: {
  /** There are edits the server has not seen. */
  visible: boolean;
  saving: boolean;
  error?: string | null;
  /** Set once per successful save (the module clears it in between). */
  message?: string | null;
  onSave: () => void;
  lang: Lang;
}) {
  const shell = dashboardCopy[lang];
  const t = bookingTranslations[lang];
  const { notify } = useToast();

  useEffect(() => {
    if (message) notify({ message });
  }, [message, notify]);

  if (!visible && !error) {
    return null;
  }

  return (
    <div className="pointer-events-none sticky bottom-4 z-30 mt-6 grid gap-2">
      {error ? (
        <Alert tone="danger" role="alert" className="pointer-events-auto">
          {error}
        </Alert>
      ) : null}
      {visible ? (
        <div
          role="region"
          aria-label={shell.unsavedChanges}
          className="pointer-events-auto flex flex-col gap-3 rounded-xl bg-app-surface px-4 py-3 shadow-lg ring-1 ring-app-border sm:flex-row sm:items-center sm:justify-between sm:px-5"
        >
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-semibold text-app-fg">
              <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-app-warning-fg" />
              {shell.unsavedChanges}
            </p>
            <p className="mt-0.5 text-sm text-app-fg-muted">{shell.unsavedChangesHint}</p>
          </div>
          <Button loading={saving} onClick={onSave}>
            {saving ? t.common.saving : t.admin.saveChanges}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 4: Give embedded hosts a toast region**

In `components/haab-booking-module.tsx`, in the final (`chrome="module"`) return, change:

```tsx
        {surface === "management" && surfaceMode === "adaptive" ? (
          <div className="p-5 sm:p-8">
            {renderManagementSections()}
            {saveBar}
          </div>
        ) : (
```

to:

```tsx
        {surface === "management" && surfaceMode === "adaptive" ? (
          <ToastProvider dismissLabel={dashboardCopy[lang].dismiss}>
            <div className="p-5 sm:p-8">
              {renderManagementSections()}
              {saveBar}
            </div>
          </ToastProvider>
        ) : (
```

Add `import { ToastProvider } from "@/components/app-ui";` and, if not already imported, `import { dashboardCopy } from "@/components/provider/dashboard-copy";`. The `chrome="shell"` branch needs nothing: `DashboardApp` provides the region. Public rendering paths are untouched.

- [ ] **Step 5: Run tests**

Run: `npx vitest run components/provider components/__tests__ && npm run typecheck`
Expected: PASS, no type errors.

- [ ] **Step 6: Commit**

```bash
git add components/provider/SaveBar.tsx components/provider/__tests__/save-bar.test.tsx components/haab-booking-module.tsx
git commit -m "feat(dashboard): confirm saves with a toast"
```

---

### Task 11: Lint gate

**Files:**
- Modify: `eslint.config.mjs`

**Interfaces:**
- Produces: `MIGRATED_TO_APP_UI` file list that PRs 2–5 extend.

- [ ] **Step 1: Add the rule**

In `eslint.config.mjs`, above `const eslintConfig = …`:

```js
// Files rebuilt on components/app-ui. Each dashboard UI PR appends what it
// migrates; the last one replaces the list with whole directories. The
// public primitives stay available to the booking flow, just not here.
const MIGRATED_TO_APP_UI = [
  "components/app-shell/**/*.{ts,tsx}",
  "components/provider/DashboardApp.tsx",
  "components/provider/SaveBar.tsx",
  "components/super-admin/SuperAdminShell.tsx",
];

const LEGACY_UI = ["ActionButton", "ActionLink", "buttonClasses", "ToneBadge", "EmptyState", "SectionTitle", "Alert"];
const LEGACY_UI_MESSAGE = "Signed-in surfaces use @/components/app-ui; components/ui is the public booking look.";
```

and add this entry to the `defineConfig([...])` array after `...nextTs,`:

```js
  {
    files: MIGRATED_TO_APP_UI,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "@/components/provider/adminGlass", message: LEGACY_UI_MESSAGE },
            { name: "@/components/ui", importNames: LEGACY_UI, message: LEGACY_UI_MESSAGE },
            ...LEGACY_UI.map((name) => ({ name: `@/components/ui/${name}`, message: LEGACY_UI_MESSAGE })),
          ],
        },
      ],
    },
  },
```

- [ ] **Step 2: Prove the rule fires**

Run:

```bash
printf 'import { Alert } from "@/components/ui/Alert";\nexport const x = Alert;\n' > components/app-shell/__lint_probe.tsx
npx eslint components/app-shell/__lint_probe.tsx; echo "exit=$?"
rm components/app-shell/__lint_probe.tsx
```

Expected: an `no-restricted-imports` error naming `@/components/ui/Alert`, `exit=1`.

- [ ] **Step 3: Lint the repo**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add eslint.config.mjs
git commit -m "chore(lint): keep migrated shell files on app-ui"
```

---

### Task 12: Verification

**Files:**
- Modify (only if a spec breaks): `e2e/dashboard-routes.spec.ts`, `e2e/dashboard-save-bar.spec.ts`, `e2e/super-admin-access.spec.ts`
- Create: `e2e/dashboard-toasts.spec.ts`

**Interfaces:**
- Consumes: everything above.

- [ ] **Step 1: Full unit + build gate**

Run: `npm run ci`
Expected: typecheck, lint, coverage (thresholds unchanged) and `next build` all pass.

- [ ] **Step 2: Public files untouched**

Run: `git diff --stat main -- components/booking components/landing components/ui 'app/[verticalSegment]' app/public`
Expected: empty output.

- [ ] **Step 3: Write the toast e2e spec**

Create `e2e/dashboard-toasts.spec.ts` (follow the login/auth-state pattern used in `e2e/dashboard-save-bar.spec.ts`; reuse its `test.use({ storageState: … })` line and the same provider role):

```ts
import { expect, test } from "@playwright/test";

import { authStatePath } from "./fixtures/providers";

test.use({ storageState: authStatePath("premium") });

test.describe("dashboard toasts", () => {
  test("copying the booking link confirms with a toast", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/dashboard");
    await page.getByRole("button", { name: /Copy link|Copiar enlace/ }).click();
    await expect(
      page.getByRole("status").filter({ hasText: /Booking link copied|Enlace de reservas copiado/ }),
    ).toBeVisible();
  });

  test("every save is confirmed, including the same message twice", async ({ page }) => {
    await page.goto("/dashboard/appearance");
    const field = page.getByLabel(/Hero text|Texto principal/);
    const saved = page.getByRole("status").getByText(/^(Saved\.|Guardado\.)$/);

    for (const suffix of [" A", " B"]) {
      await field.fill(`Welcome${suffix}`);
      await page.getByRole("button", { name: /Save changes|Guardar cambios/ }).click();
      await expect(saved.first()).toBeVisible();
      await expect(saved).toHaveCount(0, { timeout: 8_000 });
    }
  });
});
```

> Check the role name used by `dashboard-save-bar.spec.ts` (`authStatePath("<role>")`) and use the same one; replace `"premium"` if it differs.

- [ ] **Step 4: Run e2e against the local stack**

Follow the local verification setup (scratch Supabase on 553xx, `next dev -p 3100`, `E2E_BASE_URL=http://localhost:3100`; `supabase db reset --workdir <copy>` before re-running setup):

```bash
E2E_BASE_URL=http://localhost:3100 npx playwright test
```

Expected: all specs pass, including `dashboard-toasts.spec.ts`. Fix any selector that relied on removed classes; keep role/label-based selectors.

- [ ] **Step 5: Manual visual QA**

With the dev server running, check `/dashboard`, `/dashboard/bookings`, `/dashboard/settings` and `/super-admin` at 390, 768, 1280 and 1440 px:
- Sidebar: brand, workspace badge, active item, account row; long name/email truncate.
- Drawer (below `lg`): slides in, close button outside the panel, Esc closes, focus returns to the menu button.
- Top bar: 64px, title, icon-only actions below `sm`.
- Save bar: appears after an Appearance edit, Save shows a spinner, "Saved." toast bottom-right (bottom-center on phones).
- Keyboard: Tab order sidebar → top bar → content; visible focus rings everywhere.
Take screenshots for the PR description.

- [ ] **Step 6: Commit**

```bash
git add e2e
git commit -m "test(e2e): cover dashboard toasts"
```

---

## Self-Review Notes

- **Spec coverage (PR 1 scope):** tokens §1 → Task 1; visual language §2 → recipes in Task 2 used throughout; kit §3 → Tasks 2–7 (every listed component); shell §4 → Tasks 8–10; feedback rules §5 → toasts (Task 7, 9, 10), alerts (Task 3); `bookingStatusBadgeTone`/`bookingTypeBadgeTone` → Task 1; lint gate → Task 11; testing + public guard → Tasks 1, 12. Sections §6–§10 belong to PRs 2–5 and get their own plans.
- **Review Focus mapping:** long sidebar text → Task 8 test; dialog `open` attribute → Task 6 test; nested providers → Task 7 test; repeated save message → Task 12 e2e; Spanish toast strings → Task 9 test.
- **Known judgement calls:** Phosphor `dist/ssr` imports keep `Button`, `Badge`, `Alert` and the other display components usable from server components (super-admin pages in PR 4); interactive components are `"use client"`.
