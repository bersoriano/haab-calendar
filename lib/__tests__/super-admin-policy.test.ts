import { describe, expect, it } from "vitest";

import {
  isSuperAdminEmail,
  SUPER_ADMIN_EMAIL,
} from "@/lib/super-admin-policy";

describe("super admin policy", () => {
  it("allows only the configured super-admin email", () => {
    expect(SUPER_ADMIN_EMAIL).toBe("bsorianodev@gmail.com");
    expect(isSuperAdminEmail("bsorianodev@gmail.com")).toBe(true);
    expect(isSuperAdminEmail(" BSorianoDev@gmail.com ")).toBe(true);
  });

  it("rejects other and missing email addresses", () => {
    expect(isSuperAdminEmail("another@example.com")).toBe(false);
    expect(isSuperAdminEmail(undefined)).toBe(false);
    expect(isSuperAdminEmail(null)).toBe(false);
  });
});
