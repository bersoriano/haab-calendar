import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  createAdminClient: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("next/headers", () => ({
  cookies: mocks.cookies,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mocks.createAdminClient,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

import { DEMO_EDIT_COOKIE } from "@/lib/demo-pages";
import { resolveDemoEditTarget } from "@/lib/supabase/demo-edit";

const SUPER_ADMIN_EMAIL = "bsorianodev@gmail.com";
const DEMO_OWNER_ID = "owner-doctors";

function cookieStore(value?: string) {
  return {
    get: vi.fn((name: string) =>
      name === DEMO_EDIT_COOKIE && value ? { name, value } : undefined,
    ),
  };
}

function authClient(email?: string) {
  return {
    auth: {
      getUser: vi.fn(() =>
        Promise.resolve({
          data: { user: email ? { id: "caller", email } : null },
          error: null,
        }),
      ),
    },
  };
}

function adminClient(options: {
  provider?: { id: string; owner_user_id: string } | null;
  ownerEmail?: string;
}) {
  const query: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const method of ["select", "eq"]) {
    query[method] = vi.fn(() => query);
  }
  query.maybeSingle = vi.fn(() =>
    Promise.resolve({ data: options.provider ?? null, error: null }),
  );

  return {
    from: vi.fn(() => query),
    auth: {
      admin: {
        getUserById: vi.fn(() =>
          Promise.resolve({
            data: options.ownerEmail ? { user: { email: options.ownerEmail } } : { user: null },
            error: null,
          }),
        ),
      },
    },
  };
}

const seededDemo = {
  provider: { id: "provider-doctors", owner_user_id: DEMO_OWNER_ID },
  ownerEmail: "public-examples+doctors@haab-calendar.invalid",
};

describe("resolveDemoEditTarget", () => {
  beforeEach(() => {
    mocks.cookies.mockReset();
    mocks.createAdminClient.mockReset();
    mocks.createClient.mockReset();
  });

  it("resolves the demo owner for the super admin", async () => {
    mocks.cookies.mockResolvedValue(cookieStore("doctors"));
    mocks.createClient.mockResolvedValue(authClient(SUPER_ADMIN_EMAIL));
    mocks.createAdminClient.mockReturnValue(adminClient(seededDemo));

    const target = await resolveDemoEditTarget();

    expect(target?.ownerUserId).toBe(DEMO_OWNER_ID);
    expect(target?.providerId).toBe("provider-doctors");
    expect(target?.publicPath).toBe("/doctors/dr-maya-rivera");
  });

  it("ignores the cookie for a non-super-admin caller", async () => {
    mocks.cookies.mockResolvedValue(cookieStore("doctors"));
    mocks.createClient.mockResolvedValue(authClient("someone-else@example.com"));
    mocks.createAdminClient.mockReturnValue(adminClient(seededDemo));

    expect(await resolveDemoEditTarget()).toBeNull();
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it("ignores the cookie for a signed-out caller", async () => {
    mocks.cookies.mockResolvedValue(cookieStore("doctors"));
    mocks.createClient.mockResolvedValue(authClient(undefined));

    expect(await resolveDemoEditTarget()).toBeNull();
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it("returns null without a cookie", async () => {
    mocks.cookies.mockResolvedValue(cookieStore());

    expect(await resolveDemoEditTarget()).toBeNull();
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("rejects a cookie naming an unknown demo", async () => {
    mocks.cookies.mockResolvedValue(cookieStore("../admin"));

    expect(await resolveDemoEditTarget()).toBeNull();
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("refuses a demo slug now owned by a real account", async () => {
    mocks.cookies.mockResolvedValue(cookieStore("doctors"));
    mocks.createClient.mockResolvedValue(authClient(SUPER_ADMIN_EMAIL));
    mocks.createAdminClient.mockReturnValue(
      adminClient({
        provider: { id: "provider-doctors", owner_user_id: "real-user" },
        ownerEmail: "real-provider@example.com",
      }),
    );

    expect(await resolveDemoEditTarget()).toBeNull();
  });

  it("returns null when the demo has not been seeded", async () => {
    mocks.cookies.mockResolvedValue(cookieStore("doctors"));
    mocks.createClient.mockResolvedValue(authClient(SUPER_ADMIN_EMAIL));
    mocks.createAdminClient.mockReturnValue(adminClient({ provider: null }));

    expect(await resolveDemoEditTarget()).toBeNull();
  });
});
