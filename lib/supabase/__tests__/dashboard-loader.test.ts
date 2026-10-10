import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getProviderDashboardContext: vi.fn(),
  getPublicationStatus: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getClaims: async () => ({ data: { claims: { email: "owner@example.com" } } }),
      getUser: async () => ({ data: { user: { id: "owner-1", email: "owner@example.com" } } }),
    },
  }),
}));
vi.mock("@/lib/supabase/bookings", () => ({
  getProviderDashboardContext: mocks.getProviderDashboardContext,
}));
vi.mock("@/lib/supabase/publication", () => ({
  getPublicationStatus: mocks.getPublicationStatus,
}));
vi.mock("@/lib/entitlements/server", () => ({ getProviderEntitlements: vi.fn() }));
vi.mock("@/lib/supabase/demo-edit", () => ({ resolveDemoEditTarget: async () => null }));

const { loadDashboard } = await import("@/lib/supabase/dashboard-loader");

describe("loadDashboard when the owner's page cannot be read", () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.getPublicationStatus.mockResolvedValue({ publishingEnabled: true });
    // supabase-js rejects with a plain object, not an Error.
    mocks.getProviderDashboardContext.mockRejectedValue({
      code: "42703",
      message: "column providers.keep_booking_history_one_year does not exist",
    });
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it("says the read failed instead of passing the owner off as new", async () => {
    const load = await loadDashboard();

    expect(load.loggedIn).toBe(true);
    expect(load.storeLoadFailed).toBe(true);
    expect(load.configured).toBe(false);
  });

  it("logs what the database said", async () => {
    await loadDashboard();

    expect(consoleError).toHaveBeenCalledWith("provider_dashboard_store_load_failed", {
      error: "42703: column providers.keep_booking_history_one_year does not exist",
    });
  });

  it("reports no failure when the page loads", async () => {
    mocks.getProviderDashboardContext.mockResolvedValue(null);

    expect((await loadDashboard()).storeLoadFailed).toBe(false);
  });
});
