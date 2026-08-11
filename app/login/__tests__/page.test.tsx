import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import LoginPage from "@/app/login/page";

describe("login page intent", () => {
  it("uses signup-first draft-safe copy for a guest publish return", async () => {
    const page = await LoginPage({
      searchParams: Promise.resolve({
        lang: "en",
        mode: "signup",
        next: "/?resumePublish=1&lang=en",
      }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("Create your account to publish your page.");
    expect(html).toContain("Your draft is safe in this browser.");
    expect(html).toContain("Create account to publish");
    expect(html).toContain("mode=signup");
  });
});
