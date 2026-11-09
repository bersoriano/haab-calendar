import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { InvitationPageShell } from "@/components/invitations/InvitationPageShell";
import { normalizeProvider } from "@/lib/store";

function render(publicTheme: string) {
  const provider = normalizeProvider({ businessName: "Ana & Luis", publicTheme: publicTheme as never });

  return renderToStaticMarkup(
    <InvitationPageShell provider={provider} vertical="events" lang="en" path="/ana-luis" timeZone="UTC">
      <p>Story</p>
    </InvitationPageShell>,
  );
}

describe("InvitationPageShell themes", () => {
  it("squares the corners of a Winter page, painting its ivory ground", () => {
    const html = render("winter");

    expect(html).toMatch(/^<div data-square-corners=""/);
    expect(html).toContain("background:#f7f3ec");
    expect(html).toContain("Story");
  });

  it("leaves corners alone on every other theme", () => {
    for (const theme of ["default", "dark", "pink", "summer", "miami"]) {
      expect(render(theme), theme).not.toContain("data-square-corners");
    }
  });
});
