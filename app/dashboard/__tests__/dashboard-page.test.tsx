import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ load: {} as Record<string, unknown> }));

vi.mock("@/lib/supabase/dashboard-loader", () => ({ loadDashboard: async () => state.load }));
vi.mock("@/lib/language/server", () => ({ getServerLanguage: async () => "en" }));
vi.mock("@/app/login/actions", () => ({ logout: async () => undefined }));
vi.mock("@/components/provider/DashboardApp", () => ({ DashboardApp: () => <p>dashboard</p> }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
  redirect: (to: string) => {
    throw new Error(`REDIRECT ${to}`);
  },
}));

const { default: DashboardPage } = await import("@/app/dashboard/[[...section]]/page");

function render(section?: string[]) {
  return DashboardPage({
    params: Promise.resolve({ section }),
    searchParams: Promise.resolve({}),
  });
}

describe("dashboard page when the owner's page cannot be read", () => {
  beforeEach(() => {
    state.load = { loggedIn: true, configured: false, storeLoadFailed: true, isSuperAdmin: false };
  });

  it("explains and offers a retry instead of sending the owner to setup", async () => {
    const html = renderToStaticMarkup(await render(["bookings"]));

    expect(html).toContain("load your dashboard");
    expect(html).toMatch(/<a[^>]*href="\/dashboard\/bookings"[^>]*>Try again<\/a>/);
    expect(html).toContain("Sign out");
  });

  it("still sends someone without a page to the landing page", async () => {
    state.load = { loggedIn: true, configured: false, storeLoadFailed: false, isSuperAdmin: false };

    await expect(render()).rejects.toThrow("REDIRECT /");
  });
});
