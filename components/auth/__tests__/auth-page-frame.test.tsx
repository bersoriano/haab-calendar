import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AuthPageFrame } from "@/components/auth/AuthPageFrame";

describe("AuthPageFrame", () => {
  it("centres the page heading above a single card holding the form", () => {
    const html = renderToStaticMarkup(
      <AuthPageFrame lang="es" header={<header>bar</header>} title="Inicia sesión" body="Tu página te espera.">
        <form>fields</form>
      </AuthPageFrame>,
    );

    expect(html).toMatch(/^<div lang="es"/);
    expect(html.indexOf("<header>bar</header>")).toBeLessThan(html.indexOf("<main"));
    expect(html).toMatch(/<h1[^>]*>Inicia sesión<\/h1>/);
    expect(html).toContain("Tu página te espera.");
    expect(html.indexOf("<h1")).toBeLessThan(html.indexOf("<form>fields</form>"));
    expect(html.match(/<main/g)).toHaveLength(1);
  });

  it("puts what follows the card below it", () => {
    const html = renderToStaticMarkup(
      <AuthPageFrame lang="en" header={null} title="Reset" footer={<span data-footer="">Back</span>}>
        <form />
      </AuthPageFrame>,
    );

    expect(html.indexOf("<form>")).toBeLessThan(html.indexOf("data-footer"));
  });
});
