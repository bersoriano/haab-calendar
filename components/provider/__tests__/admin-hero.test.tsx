import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AdminHero } from "@/components/provider/AdminHero";

describe("AdminHero", () => {
  it("shows the admin booking-system hero text", () => {
    const html = renderToStaticMarkup(<AdminHero />);

    expect(html).toContain("Haab Calendar - The most powerful booking system");
    expect(html).toContain("<h1");
  });
});
