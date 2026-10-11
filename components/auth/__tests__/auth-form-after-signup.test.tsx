import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthFormState } from "@/app/login/actions";
import { translations } from "@/components/landing/translations";

const mocks = vi.hoisted(() => ({
  state: { message: "", status: "idle" } as { message: string; status: "idle" | "error" | "success" },
}));

vi.mock("@/app/login/actions", () => ({
  authenticate: async () => ({ message: "", status: "idle" }),
}));

// A static render never runs the action, so the answer it would have returned
// is handed to the form the way `useActionState` hands it over.
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useActionState: () => [mocks.state, () => undefined, false],
  };
});

const { AuthForm } = await import("@/components/auth/AuthForm");

const t = translations.en.auth;

function renderPublishSignup(state: AuthFormState) {
  mocks.state = state;
  return renderToStaticMarkup(
    <AuthForm initialIntent="signup" lang="en" nextPath="/?resumePublish=1&lang=en" />,
  );
}

beforeEach(() => {
  mocks.state = { message: "", status: "idle" };
});

describe("AuthForm after an account is created", () => {
  it("turns into the sign-in form its own message points at", () => {
    const html = renderPublishSignup({ message: t.accountCreated, status: "success" });

    // "Confirm it, then sign in here": pressing the button again must sign in,
    // not ask for a second account on the same address.
    expect(html).toContain("Confirm it, then sign in here.");
    expect(html).toContain('name="intent" value="login"');
    expect(html).toContain(">Sign in<");
    expect(html).not.toContain("Create account to publish");
    expect(html).toContain('autoComplete="current-password"');
  });

  it("stays on account creation when the attempt was refused", () => {
    const html = renderPublishSignup({ message: t.createFailed, status: "error" });

    expect(html).toContain('name="intent" value="signup"');
    expect(html).toContain("Create account to publish");
  });
});
