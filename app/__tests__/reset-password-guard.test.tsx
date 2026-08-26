import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/language/server", () => ({ getServerLanguage: async () => "en" }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: mocks.getUser } }),
}));

const { default: ResetPasswordPage } = await import("@/app/reset-password/page");

beforeEach(() => {
  mocks.getUser.mockReset();
  mocks.redirect.mockClear();
});

describe("set-a-new-password page", () => {
  it("refuses to render the password field without a recovery session", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });

    // An expired link, or someone typing the URL. Showing a password field that
    // cannot possibly save is worse than sending them back for a fresh link.
    await expect(
      ResetPasswordPage({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow("REDIRECT:/login/reset?lang=en");
  });

  it("renders the form once the emailed link has established a session", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });

    await expect(
      ResetPasswordPage({ searchParams: Promise.resolve({}) }),
    ).resolves.toBeTruthy();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
