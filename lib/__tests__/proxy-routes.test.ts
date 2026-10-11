import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getClaims: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({ auth: { getClaims: mocks.getClaims } }),
}));

vi.mock("@/lib/supabase/config", () => ({
  getSupabaseConfig: () => ({
    supabaseUrl: "https://supabase.haab.example",
    supabasePublishableKey: "publishable-key",
  }),
}));

import { isProtectedRoute, updateSession } from "@/lib/supabase/proxy";

function request(method: string, pathname: string) {
  return new NextRequest(`https://haab.example${pathname}`, { method });
}

describe("Supabase proxy route classification", () => {
  it.each([
    "/super-admin",
    "/api/blob/upload",
    "/api/provider/store",
    "/api/provider/bookings/booking-id",
    "/api/super-admin/users/user-id",
    "/api/super-admin/users/user-id/publication",
    "/api/super-admin/account-deletion-cleanups/job-id/retry",
  ])("protects a real private route: %s", (pathname) => {
    expect(isProtectedRoute(pathname)).toBe(true);
  });

  it.each([
    "/",
    "/login",
    "/auth/confirm",
    "/doctors/dr-maya-rivera",
    "/api/public/doctors/dr-maya-rivera/holds",
    "/removed-page",
    "/anything-unknown",
  ])("allows public and nonexistent routes to reach Next routing: %s", (pathname) => {
    expect(isProtectedRoute(pathname)).toBe(false);
  });

  it("protects the dashboard and every section under it", () => {
    expect(isProtectedRoute("/dashboard")).toBe(true);
    expect(isProtectedRoute("/dashboard/bookings")).toBe(true);
    expect(isProtectedRoute("/dashboards")).toBe(false);
  });

  it("does not protect unrelated paths that merely share a prefix", () => {
    expect(isProtectedRoute("/super-administrator")).toBe(false);
    expect(isProtectedRoute("/api/provider-example")).toBe(false);
  });
});

describe("Supabase proxy without a session", () => {
  beforeEach(() => {
    mocks.getClaims.mockReset();
    mocks.getClaims.mockResolvedValue({ data: null, error: null });
  });

  it.each([
    ["PATCH", "/api/provider/bookings/booking-id"],
    ["GET", "/api/provider/store"],
    ["POST", "/api/blob/upload"],
    ["PATCH", "/api/super-admin/users/user-id/publication"],
  ])("answers a private API call in JSON, not with the login page: %s %s", async (method, pathname) => {
    const response = await updateSession(request(method, pathname));

    expect(response.status).toBe(401);
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("content-type")).toContain("application/json");
    await expect(response.json()).resolves.toEqual({ userMessage: "Sign in to continue." });
  });

  it.each(["/dashboard", "/dashboard/bookings", "/super-admin"])(
    "still sends a private page to the login page: %s",
    async (pathname) => {
      const response = await updateSession(request("GET", pathname));

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(
        `https://haab.example/login?next=${encodeURIComponent(pathname)}`,
      );
    },
  );

  it("leaves a public API call alone", async () => {
    const response = await updateSession(
      request("POST", "/api/public/doctors/dr-maya-rivera/holds"),
    );

    expect(response.status).toBe(200);
  });

  it("lets a signed-in private API call through", async () => {
    mocks.getClaims.mockResolvedValue({ data: { claims: { sub: "owner-1" } }, error: null });

    const response = await updateSession(request("PATCH", "/api/provider/bookings/booking-id"));

    expect(response.status).toBe(200);
  });
});
