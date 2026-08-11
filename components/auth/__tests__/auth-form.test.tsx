import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AuthForm } from "@/components/auth/AuthForm";

describe("AuthForm intent hierarchy", () => {
  it("makes account creation the only primary submit in publish mode", () => {
    const html = renderToStaticMarkup(
      <AuthForm
        initialIntent="signup"
        lang="en"
        nextPath="/?resumePublish=1&lang=en"
      />,
    );

    expect(html).toContain('name="intent" value="signup"');
    expect(html).toContain("Create account to publish");
    expect(html).toContain("Already have an account? Sign in");
    expect(html.match(/type="submit"/g)).toHaveLength(1);
  });

  it("keeps sign in primary on the returning-user login route", () => {
    const html = renderToStaticMarkup(
      <AuthForm initialIntent="login" lang="en" nextPath="/?lang=en" />,
    );

    expect(html).toContain('name="intent" value="login"');
    expect(html).toContain(">Sign in<");
    expect(html).toContain("New here? Create account");
    expect(html.match(/type="submit"/g)).toHaveLength(1);
  });
});
