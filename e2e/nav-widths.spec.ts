import { expect, test, type Cookie, type Locator, type Page } from "@playwright/test";

import { localAdminClient } from "./fixtures/local-supabase";
import { authStatePath, E2E_PASSWORD } from "./fixtures/providers";

/**
 * The rule: whatever a navigation offers, it offers at every width.
 *
 * A bar is a row of controls on a desktop and a collapsed menu on a phone, and
 * the two are separate markup. A check made at one width says nothing about
 * the other. That is how a just-signed-in account came to face a desktop bar
 * with no account control in it at all: the change that emptied it was checked
 * on a phone, where the menu still had its row.
 *
 * So a case below is one navigation in one account state: what that visitor
 * must be able to use, and what they must not be shown. Every case runs at
 * every width in WIDTHS. Add a case, or a control to one, and both widths come
 * with it; there is no way to check only one. A change to what a navigation
 * shows is recorded here.
 *
 * Two things the cases insist on, because each has let a broken bar through:
 *
 * - Every case names its `account` control. "Log in is gone" is true of a bar
 *   with nothing in it, so each state says what stands there instead.
 * - A control counts only if it can be seen and clicked. Markup that is present
 *   but faded out does not: see `expectUsable`.
 */

const WIDTHS = [
  { name: "phone", width: 390, height: 844 },
  // The narrowest width that lays the landing bar out in full, so its tightest.
  { name: "desktop", width: 1280, height: 720 },
] as const;

type Control = {
  label: string;
  find: (nav: Locator) => Locator;
};

const link = (name: string): Control => ({
  label: `the "${name}" link`,
  find: (nav) => nav.getByRole("link", { name, exact: true }),
});

const button = (name: string): Control => ({
  label: `the "${name}" button`,
  find: (nav) => nav.getByRole("button", { name, exact: true }),
});

/** A dashboard section, by address: its label changes with the business type. */
const section = (path: string): Control => ({
  label: `the link to ${path}`,
  find: (nav) => nav.getByRole("navigation").locator(`a[href="${path}"]`),
});

type Session = "signed out" | "signed in with no page yet" | "signed in with a page";

type NavCase = {
  surface: string;
  session: Session;
  path: string;
  /** The navigation, opened first wherever this width collapses it. */
  open: (page: Page) => Promise<Locator>;
  /**
   * What tells this visitor where they stand: the way in, or the way out.
   * Required, so no state is left with a navigation that is silent about the
   * session.
   */
  account: Control;
  /** Everything else this visitor must be able to use. */
  offers: Control[];
  /** What must not be offered: it would be untrue, or lead nowhere. */
  hides: Control[];
};

/** The landing bar, which the gallery wears too. Its menu is a <details>. */
async function landingBar(page: Page) {
  const bar = page.getByRole("banner");
  const menu = bar.getByLabel("Open menu");

  if (await menu.isVisible()) {
    await menu.click();
  }

  return bar;
}

/** The dashboard's sidebar, or the drawer that holds it on a phone. */
async function dashboardNav(page: Page) {
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const menu = page.getByRole("button", { name: "Open menu" });

  if (!(await menu.isVisible())) {
    return page.locator("[data-shell-sidebar]");
  }

  await menu.click();
  const drawer = page.getByRole("dialog");
  await expect(drawer).toBeVisible();
  return drawer;
}

// A signed-in owner with a page never sees the landing page: `/` sends them to
// the dashboard, which is their case below.
const CASES: NavCase[] = [
  {
    surface: "landing page",
    session: "signed out",
    path: "/?lang=en",
    open: landingBar,
    account: link("Log in"),
    offers: [link("Live examples"), link("How it works"), link("Use cases"), link("FAQ")],
    hides: [button("Sign out"), button("Your dashboard")],
  },
  {
    surface: "landing page",
    session: "signed in with no page yet",
    path: "/?lang=en",
    open: landingBar,
    account: button("Sign out"),
    offers: [link("Live examples"), link("How it works"), link("Use cases"), link("FAQ")],
    // The dashboard sends an account with no page straight back here.
    hides: [link("Log in"), button("Your dashboard")],
  },
  {
    surface: "gallery",
    session: "signed out",
    path: "/gallery?lang=en",
    open: landingBar,
    account: link("Log in"),
    offers: [
      link("Live examples"),
      link("How it works"),
      link("FAQ"),
      button("Create your page"),
    ],
    hides: [button("Sign out")],
  },
  {
    surface: "gallery",
    session: "signed in with no page yet",
    path: "/gallery?lang=en",
    open: landingBar,
    account: button("Sign out"),
    offers: [
      link("Live examples"),
      link("How it works"),
      link("FAQ"),
      button("Create your page"),
    ],
    hides: [link("Log in")],
  },
  {
    surface: "gallery",
    session: "signed in with a page",
    path: "/gallery?lang=en",
    open: landingBar,
    account: button("Sign out"),
    offers: [link("Live examples"), link("How it works"), link("FAQ")],
    hides: [link("Log in")],
  },
  {
    surface: "dashboard",
    session: "signed in with a page",
    path: "/dashboard",
    open: dashboardNav,
    account: button("Sign out"),
    offers: [section("/dashboard"), section("/dashboard/bookings"), section("/dashboard/settings")],
    hides: [link("Log in")],
  },
];

/**
 * On screen and able to take a click.
 *
 * Playwright's visibility check passes for an element faded to nothing:
 * opacity is not visibility. That is how the landing bar's create button was
 * "there" for a visitor who could not see it.
 */
async function expectUsable(control: Locator, label: string) {
  await expect(control, `${label} should be on screen`).toBeVisible();

  // Polled: menus and drawers fade or slide in.
  await expect
    .poll(
      () =>
        control.evaluate((node) => {
          let opacity = 1;
          for (let el: Element | null = node; el; el = el.parentElement) {
            opacity *= Number(getComputedStyle(el).opacity);
          }
          return opacity;
        }),
      { message: `${label} should not be faded out` },
    )
    .toBe(1);

  // Everything a click checks, without the click: in view, enabled, not
  // covered, and taking pointer events.
  await control.click({ trial: true });
}

async function expectNoSidewaysScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

// An account and nothing else: no provider row, so no page, finished or not.
const noPageAccount = {
  id: "00000000-0000-4000-8000-0000000e2ef2",
  email: "nav-no-page-yet@example.invalid",
};

let noPageSession: Cookie[] = [];

test.beforeAll(async ({ browser }) => {
  const admin = localAdminClient();
  await admin.auth.admin.deleteUser(noPageAccount.id).catch(() => undefined);
  const { error } = await admin.auth.admin.createUser({
    id: noPageAccount.id,
    email: noPageAccount.email,
    password: E2E_PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;

  // Signed in once, through the real form, and the session reused: the local
  // stack limits sign-ins, and one per case would spend the suite's allowance.
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/login?lang=en");
  await page.getByLabel("Email").fill(noPageAccount.email);
  await page.getByLabel("Password").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  // No page, so no dashboard: signing in ends on the landing page.
  await page.waitForURL((url) => url.pathname === "/", { timeout: 30_000 });
  noPageSession = await context.cookies();
  await context.close();
});

for (const navCase of CASES) {
  test.describe(`${navCase.surface}, ${navCase.session}`, () => {
    if (navCase.session === "signed in with a page") {
      test.use({ storageState: authStatePath("free") });
    }

    for (const width of WIDTHS) {
      test(`shows the same navigation at ${width.name} width`, async ({ page }) => {
        await page.setViewportSize({ width: width.width, height: width.height });

        if (navCase.session === "signed in with no page yet") {
          await page.context().addCookies(noPageSession);
        }

        await page.goto(navCase.path);
        await expectNoSidewaysScroll(page);

        const nav = await navCase.open(page);

        for (const control of [navCase.account, ...navCase.offers]) {
          await expectUsable(control.find(nav), control.label);
        }

        for (const control of navCase.hides) {
          await expect(control.find(nav), `${control.label} should not be offered`).toHaveCount(0);
        }
      });
    }
  });
}
