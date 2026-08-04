import { describe, expect, it } from "vitest";

import { isProtectedRoute } from "@/lib/supabase/proxy";

describe("Supabase proxy route classification", () => {
  it.each([
    "/super-admin",
    "/api/blob/upload",
    "/api/provider/store",
    "/api/provider/bookings/booking-id",
    "/api/super-admin/users/user-id/publication",
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

  it("does not protect unrelated paths that merely share a prefix", () => {
    expect(isProtectedRoute("/super-administrator")).toBe(false);
    expect(isProtectedRoute("/api/provider-example")).toBe(false);
  });
});
