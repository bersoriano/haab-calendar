import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
  getUser: vi.fn(),
  headers: new Map<string, string>(),
}));

vi.mock("server-only", () => ({}));

vi.mock("next/headers", () => ({
  headers: async () => ({ get: (key: string) => mocks.headers.get(key) ?? null }),
  cookies: async () => ({ get: () => undefined, set: () => undefined }),
}));

vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      resetPasswordForEmail: mocks.resetPasswordForEmail,
      updateUser: mocks.updateUser,
      getUser: mocks.getUser,
    },
  }),
}));

const { requestPasswordReset, updatePassword } = await import("@/app/login/actions");

function form(entries: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.append(key, value);
  return data;
}

beforeEach(() => {
  mocks.resetPasswordForEmail.mockReset().mockResolvedValue({ error: null });
  mocks.updateUser.mockReset().mockResolvedValue({ error: null });
  mocks.getUser.mockReset().mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
  mocks.headers = new Map([["origin", "https://haabcalendar.com"]]);
});

describe("requesting a password reset", () => {
  it("sends the visitor back to a page that can set a new password", async () => {
    await requestPasswordReset(undefined, form({ email: "owner@example.com", lang: "en" }));

    const [email, options] = mocks.resetPasswordForEmail.mock.calls[0];

    expect(email).toBe("owner@example.com");
    // Not /auth or /login: getSafeNextPath in the confirm route rejects both,
    // and a rejected next silently lands the visitor on the home page with a
    // recovery session and no way to set a password.
    expect(options.redirectTo).toContain("/auth/confirm");
    expect(options.redirectTo).toContain("next=%2Freset-password");
  });

  it("answers identically for an unknown address, so the form cannot enumerate accounts", async () => {
    const known = await requestPasswordReset(undefined, form({ email: "real@example.com", lang: "en" }));

    mocks.resetPasswordForEmail.mockResolvedValue({
      error: { message: "User not found", code: "user_not_found" },
    });
    const unknown = await requestPasswordReset(undefined, form({ email: "nobody@example.com", lang: "en" }));

    expect(unknown).toEqual(known);
    expect(unknown.status).toBe("success");
  });

  it("rejects a malformed address before mailing anything", async () => {
    const result = await requestPasswordReset(undefined, form({ email: "not-an-email", lang: "en" }));

    expect(result.status).toBe("error");
    expect(mocks.resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("asks in the visitor's language", async () => {
    const result = await requestPasswordReset(undefined, form({ email: "", lang: "es" }));

    expect(result.status).toBe("error");
    expect(result.message).toMatch(/correo|contraseña/i);
  });
});

describe("setting the new password", () => {
  it("requires the recovery session the emailed link established", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await updatePassword(undefined, form({ password: "newpassword", lang: "en" }));

    expect(result.status).toBe("error");
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });

  it("enforces the same minimum length signup does", async () => {
    const result = await updatePassword(undefined, form({ password: "short", lang: "en" }));

    expect(result.status).toBe("error");
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });

  it("updates the password once a recovery session is present", async () => {
    await updatePassword(undefined, form({ password: "a-good-password", lang: "en" }));

    expect(mocks.updateUser).toHaveBeenCalledWith({ password: "a-good-password" });
  });
});
