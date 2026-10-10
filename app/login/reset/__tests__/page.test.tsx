import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/language/server", () => ({ getServerLanguage: async () => "en" }));
vi.mock("@/app/login/actions", () => ({ requestPasswordReset: async () => ({ message: "", status: "idle" }) }));

const { default: PasswordResetRequestPage } = await import("@/app/login/reset/page");

describe("password reset request page", () => {
  it("gives the way back to sign in a full touch target on phones", async () => {
    const html = renderToStaticMarkup(
      await PasswordResetRequestPage({ searchParams: Promise.resolve({ lang: "en" }) }),
    );
    const back = html.match(/<a[^>]*href="\/login\?lang=en"[^>]*>/)?.[0] ?? "";

    expect(back).toContain("min-h-11");
    expect(back).toContain("sm:min-h-0");
  });
});
