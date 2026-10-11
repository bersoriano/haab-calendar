import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  headers: new Map<string, string>(),
}));

/** What `redirect` throws, so a test can see where the action sent the visitor. */
class Redirected extends Error {
  constructor(readonly path: string) {
    super(`redirected to ${path}`);
  }
}

vi.mock("server-only", () => ({}));

vi.mock("next/headers", () => ({
  headers: async () => ({ get: (key: string) => mocks.headers.get(key) ?? null }),
  cookies: async () => ({ get: () => undefined, set: () => undefined }),
}));

vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Redirected(path);
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      signUp: mocks.signUp,
      signInWithPassword: mocks.signInWithPassword,
    },
  }),
}));

const { signup } = await import("@/app/login/actions");

const PUBLISH_RETURN = "/?resumePublish=1&lang=en";

function form(entries: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.append(key, value);
  return data;
}

function credentials(email = "owner@example.com") {
  return form({ email, password: "a-good-password", lang: "en", next: PUBLISH_RETURN });
}

/** A first signup on a project that confirms email: a real user, no session yet. */
const NEW_ACCOUNT = {
  data: { user: { id: "u1", identities: [{ id: "i1" }] }, session: null },
  error: null,
};

/**
 * Supabase's answer when the address already holds a confirmed account: a
 * made-up user with no identities, no session, no error and no email sent.
 */
const EXISTING_ACCOUNT = {
  data: { user: { id: "made-up", identities: [] }, session: null },
  error: null,
};

beforeEach(() => {
  mocks.signUp.mockReset().mockResolvedValue(NEW_ACCOUNT);
  mocks.signInWithPassword.mockReset().mockResolvedValue({ error: null });
  mocks.headers = new Map([["origin", "https://haabcalendar.com"]]);
});

describe("creating an account", () => {
  it("signs the visitor in when the account already exists and the password is theirs", async () => {
    mocks.signUp.mockResolvedValue(EXISTING_ACCOUNT);

    // Confirmed on a phone, back on the desktop form that still says "Create
    // account": the same credentials must let them through, not send them to
    // wait for an email that will never arrive.
    await expect(signup(undefined, credentials())).rejects.toMatchObject({ path: PUBLISH_RETURN });

    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: "owner@example.com",
      password: "a-good-password",
    });
  });

  it("answers a wrong password on an existing account as it answers a new one, so the form cannot enumerate accounts", async () => {
    const created = await signup(undefined, credentials("new@example.com"));

    mocks.signUp.mockResolvedValue(EXISTING_ACCOUNT);
    mocks.signInWithPassword.mockResolvedValue({
      error: { message: "Invalid login credentials", code: "invalid_credentials" },
    });
    const existing = await signup(undefined, credentials("taken@example.com"));

    expect(mocks.signInWithPassword).toHaveBeenCalledTimes(1);
    expect(existing).toEqual(created);
    expect(existing.status).toBe("success");
  });

  it("does not attempt a sign-in for a new account that has yet to confirm", async () => {
    const result = await signup(undefined, credentials());

    expect(result.status).toBe("success");
    expect(mocks.signInWithPassword).not.toHaveBeenCalled();
  });
});
