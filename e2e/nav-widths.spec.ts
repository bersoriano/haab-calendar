import { expect, test, type Cookie, type Locator, type Page } from "@playwright/test";

import { localAdminClient } from "./fixtures/local-supabase";
import { authStatePath, E2E_PASSWORD, providerFor } from "./fixtures/providers";
import { DEFAULT_STORAGE_KEY } from "../lib/constants";

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

/** A tab of the workspace a draft is built in, by its label. */
const tab = (name: string): Control => ({
  label: `the "${name}" tab`,
  find: (nav) =>
    nav.getByRole("navigation", { name: "Dashboard" }).getByRole("button", { name, exact: true }),
});

type Session = "signed out" | "signed in with no page yet" | "signed in with a page";

type NavCase = {
  surface: string;
  session: Session;
  path: string;
  /** A finished draft is waiting in the browser, as the page builder leaves it. */
  draft?: true;
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

/**
 * The workspace of a draft that is not published: the landing page hands over
 * to it, and it wears the module's own header and tabs, not the dashboard's
 * sidebar. The save control sits outside the tabs, at the bottom of the
 * screen, so the whole page is the navigation here.
 */
function draftWorkspace(enter: string) {
  return async (page: Page) => {
    await page.getByRole("main").getByRole("button", { name: enter }).first().click();
    await expect(page.getByRole("navigation", { name: "Dashboard" })).toBeVisible();
    return page.locator("body");
  };
}

const DRAFT_TABS = [
  tab("Dashboard"),
  tab("Medical services"),
  tab("Availability"),
  tab("Appearance"),
  tab("Settings"),
  {
    label: "the preview of the page",
    find: (nav: Locator) =>
      nav.getByRole("button", { name: "Preview booking page", exact: true }).first(),
  },
];

// Nothing is published: no bookings to list, no visits to count, nothing to
// connect, and a link that would be a 404.
const PUBLISHED_ONLY = [
  tab("Appointments"),
  tab("Analytics"),
  tab("Integrations"),
  {
    // By its start: the link's name goes on to say it opens a new tab.
    label: "the link to the page",
    find: (nav: Locator) => nav.getByRole("link", { name: /^View public page/ }),
  },
  button("Copy link"),
];

/** A finished draft, as the guest builder leaves it in the browser. */
const draft = {
  vertical: "healthcare",
  setupComplete: true,
  provider: {
    fullName: "Dr. Nav Draft",
    businessName: "Nav Draft Clinic",
    email: "nav-draft@example.invalid",
    publicSlug: "nav-draft-clinic",
  },
  services: [
    {
      id: "nav-draft-visit",
      name: "First visit",
      bookingType: "appointment",
      durationMinutes: 30,
      description: "A first visit.",
    },
  ],
};

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
    surface: "draft workspace",
    session: "signed out",
    draft: true,
    path: "/?lang=en",
    open: draftWorkspace("Create your page"),
    // The way in is the save: an account is what keeps the draft and publishes it.
    account: button("Create account to publish"),
    offers: DRAFT_TABS,
    hides: [...PUBLISHED_ONLY, button("Publish my page")],
  },
  {
    // Signing in does not publish a draft: an account that made one signed out
    // and came back by the ordinary log-in has a draft and still no page.
    surface: "draft workspace",
    session: "signed in with no page yet",
    draft: true,
    path: "/?lang=en",
    open: draftWorkspace("Start with Healthcare"),
    account: button("Sign out"),
    offers: [...DRAFT_TABS, button("Publish my page")],
    hides: [...PUBLISHED_ONLY, button("Create account to publish")],
  },
  {
    surface: "dashboard",
    session: "signed in with a page",
    path: "/dashboard",
    open: dashboardNav,
    account: button("Sign out"),
    offers: [
      section("/dashboard"),
      section("/dashboard/bookings"),
      section("/dashboard/scan"),
      section("/dashboard/analytics"),
      section("/dashboard/campaigns"),
      section("/dashboard/services"),
      section("/dashboard/availability"),
      section("/dashboard/appearance"),
      section("/dashboard/integrations"),
      section("/dashboard/settings"),
    ],
    // The calendar section is gone: a link to it would be a 404.
    hides: [link("Log in"), section("/dashboard/calendar")],
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
  // An empty session, said outright: a context made here otherwise inherits
  // the signed-in state of whichever case the worker happens to start on.
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
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
  test.describe(`${navCase.surface}, ${navCase.session}${navCase.draft ? ", with a draft" : ""}`, () => {
    if (navCase.session === "signed in with a page") {
      test.use({ storageState: authStatePath("free") });
    }

    for (const width of WIDTHS) {
      test(`shows the same navigation at ${width.name} width`, async ({ page }) => {
        await page.setViewportSize({ width: width.width, height: width.height });

        if (navCase.session === "signed in with no page yet") {
          await page.context().addCookies(noPageSession);
        }

        if (navCase.draft) {
          await page.addInitScript(
            ([key, value]) => window.localStorage.setItem(key, value),
            [DEFAULT_STORAGE_KEY, JSON.stringify(draft)],
          );
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

// Footer links are public navigation too: verify visible attribution and its
// destination on both page widths, including service and manage URLs.
for (const width of WIDTHS) {
  test(`public footer links to Haab at ${width.name} width`, async ({ page }) => {
    await page.setViewportSize({ width: width.width, height: width.height });
    const seed = providerFor("free");
    const { data: service, error } = await localAdminClient().from("services")
      .select("slug").eq("provider_id", seed.providerId).single();
    if (error) throw error;
    for (const path of [`/doctors/${seed.slug}`, `/doctors/${seed.slug}/${service.slug}`, `/doctors/${seed.slug}/manage/invalid-token`]) {
      await page.goto(path);
      const footer = page.getByRole("contentinfo");
      await expect(footer).toContainText("This booking was brought to you by haabcalendar.com and developed by brilliant.dev");
      const attribution = footer.getByRole("link", { name: "haabcalendar.com", exact: true });
      await attribution.scrollIntoViewIfNeeded();
      await expectUsable(attribution, "Haab booking attribution");
      await expect(attribution).toHaveAttribute("href", "https://haabcalendar.com");
      await expectNoSidewaysScroll(page);
    }
  });

  test(`premium public footer uses saved branding at ${width.name} width`, async ({ page }) => {
    await page.setViewportSize({ width: width.width, height: width.height });
    const seed = providerFor("billingPremium");
    const admin = localAdminClient();
    const { error } = await admin.from("providers").update({
      public_footer_text: "Booked with Acme", public_footer_url: "https://acme.example/book",
    }).eq("id", seed.providerId);
    if (error) throw error;
    try {
      const { data: service, error: serviceError } = await admin.from("services")
        .select("slug").eq("provider_id", seed.providerId).single();
      if (serviceError) throw serviceError;
      for (const path of [`/doctors/${seed.slug}`, `/doctors/${seed.slug}/${service.slug}`, `/doctors/${seed.slug}/manage/invalid-token`]) {
        await page.goto(path);
        const footer = page.getByRole("contentinfo");
        await expect(footer).toContainText("Booked with Acme acme.example");
        await expect(footer).not.toContainText("and developed by brilliant.dev");
        const attribution = footer.getByRole("link", { name: "acme.example", exact: true });
        await attribution.scrollIntoViewIfNeeded();
        await expectUsable(attribution, "Premium booking attribution");
        await expect(attribution).toHaveAttribute("href", "https://acme.example/book");
        await expectNoSidewaysScroll(page);
      }
    } finally {
      const { error: resetError } = await admin.from("providers").update({ public_footer_text: null, public_footer_url: null }).eq("id", seed.providerId);
      if (resetError) throw resetError;
    }
  });

  test(`standalone footer follows hydrated settings at ${width.name} width`, async ({ page }) => {
    await page.setViewportSize({ width: width.width, height: width.height });
    await page.addInitScript(([key, value]) => window.localStorage.setItem(key, value), [DEFAULT_STORAGE_KEY, JSON.stringify({
      ...draft, provider: { ...draft.provider, publicFooterText: "Booked with Acme", publicFooterUrl: "https://acme.example/book" },
    })]);
    for (const path of ["/public/nav-draft-clinic", "/public/nav-draft-clinic/manage/invalid-token"]) {
      await page.goto(path);
      const footer = page.getByRole("contentinfo");
      await expect(footer).toContainText("Booked with Acme acme.example");
      const attribution = footer.getByRole("link", { name: "acme.example", exact: true });
      await attribution.scrollIntoViewIfNeeded();
      await expectUsable(attribution, "Standalone booking attribution");
      await expect(attribution).toHaveAttribute("href", "https://acme.example/book");
      await expectNoSidewaysScroll(page);
    }
  });
}
