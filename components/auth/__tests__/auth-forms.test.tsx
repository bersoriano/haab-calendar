import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/login/actions", () => ({
  authenticate: async () => ({ message: "", status: "idle" }),
  requestPasswordReset: async () => ({ message: "", status: "idle" }),
  updatePassword: async () => ({ message: "", status: "idle" }),
}));

const { AuthForm } = await import("@/components/auth/AuthForm");
const { PasswordResetRequestForm } = await import("@/components/auth/PasswordResetRequestForm");
const { NewPasswordForm } = await import("@/components/auth/NewPasswordForm");

/** The control a label names, by the label's `for`. */
function labelledInput(html: string, labelText: string) {
  const forId = html.match(new RegExp(`<label[^>]*for="([^"]+)"[^>]*>${labelText}`))?.[1];
  return forId ? html.match(new RegExp(`<input[^>]*id="${forId}"[^>]*>`))?.[0] : undefined;
}

describe("auth forms", () => {
  it("labels the sign-in fields and keeps the ids the browser and tests rely on", () => {
    const html = renderToStaticMarkup(<AuthForm lang="en" nextPath="/" />);

    expect(labelledInput(html, "Email")).toMatch(/id="email"/);
    expect(labelledInput(html, "Password")).toMatch(/id="password"/);
    expect(labelledInput(html, "Email")).toMatch(/autocomplete="email"/i);
  });

  it("keeps an empty live region ready, so a later message is announced", () => {
    for (const html of [
      renderToStaticMarkup(<AuthForm lang="en" nextPath="/" />),
      renderToStaticMarkup(<PasswordResetRequestForm lang="en" />),
      renderToStaticMarkup(<NewPasswordForm lang="en" />),
    ]) {
      expect(html).toMatch(/<div aria-live="polite"[^>]*><\/div>/);
    }
  });

  it("gives each form one full-width primary submit", () => {
    for (const html of [
      renderToStaticMarkup(<AuthForm lang="en" nextPath="/" />),
      renderToStaticMarkup(<PasswordResetRequestForm lang="es" />),
      renderToStaticMarkup(<NewPasswordForm lang="es" />),
    ]) {
      const submits = html.match(/<button[^>]*type="submit"[^>]*>/g) ?? [];
      expect(submits).toHaveLength(1);
      expect(submits[0]).toContain("w-full");
      expect(submits[0]).toContain("bg-app-accent");
    }
  });

  it("labels the reset and new-password fields", () => {
    expect(labelledInput(renderToStaticMarkup(<PasswordResetRequestForm lang="en" />), "Email")).toBeTruthy();
    expect(renderToStaticMarkup(<NewPasswordForm lang="en" />)).toMatch(/<label[^>]*for="password"/);
  });
});
