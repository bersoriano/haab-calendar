import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LoginHeader } from "@/components/auth/LoginHeader";

describe("LoginHeader", () => {
  it("links the English login page back to the English landing page", () => {
    const html = renderToStaticMarkup(<LoginHeader lang="en" />);

    expect(html).toContain("Haab Calendar");
    expect(html).toContain("← Back to home");
    expect(html.match(/href="\/?\?lang=en"/g)).toHaveLength(2);
  });

  it("links the Spanish login page back to the Spanish landing page", () => {
    const html = renderToStaticMarkup(<LoginHeader lang="es" />);

    expect(html).toContain("← Volver al inicio");
    expect(html.match(/href="\/?\?lang=es"/g)).toHaveLength(2);
  });
});
