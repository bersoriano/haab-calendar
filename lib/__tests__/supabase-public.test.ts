import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSupabaseClient: vi.fn(),
  readRequestCookies: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: mocks.createSupabaseClient,
}));

vi.mock("next/headers", () => ({
  cookies: mocks.readRequestCookies,
}));

import { createPublicClient } from "@/lib/supabase/public";

describe("anonymous Supabase public client", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    mocks.createSupabaseClient.mockReset();
    mocks.readRequestCookies.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses the publishable key without reading an active request session", () => {
    const client = { from: vi.fn() };
    mocks.createSupabaseClient.mockReturnValue(client);

    expect(createPublicClient()).toBe(client);
    expect(mocks.readRequestCookies).not.toHaveBeenCalled();
    expect(mocks.createSupabaseClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "sb_publishable_test",
      {
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: false,
        },
      },
    );
  });
});
