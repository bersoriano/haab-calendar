import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AdminHero } from "@/components/provider/AdminHero";

describe("AdminHero", () => {
  it("renders the English headline", () => {
    const html = renderToStaticMarkup(<AdminHero lang="en" />);
    expect(html).toContain("Haab Calendar — booking operations in one workspace");
  });

  it("renders the Spanish headline with no English left in it", () => {
    const html = renderToStaticMarkup(<AdminHero lang="es" />);
    expect(html).toContain("Haab Calendar — sus reservas en un solo lugar");
    expect(html).not.toContain("booking operations");
    expect(html).not.toContain("workspace");
  });
});
