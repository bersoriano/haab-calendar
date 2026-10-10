import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ModuleHeader } from "@/components/provider/ModuleHeader";

const SECTIONS = [
  { value: "dashboard", label: "Overview" },
  { value: "bookings", label: "Bookings" },
  { value: "services", label: "Services" },
] as const;

function render(props: Partial<Parameters<typeof ModuleHeader>[0]> = {}) {
  return renderToStaticMarkup(
    <ModuleHeader
      lang="en"
      title="Riverside Clinic"
      publicUrl="https://haab.example/healthcare/riverside"
      copiedLink={false}
      onCopyLink={() => undefined}
      {...props}
    />,
  );
}

describe("ModuleHeader", () => {
  it("names the business and offers its booking link", () => {
    const html = render();

    expect(html).toMatch(/<h2[^>]*>Riverside Clinic<\/h2>/);
    expect(html).toContain("https://haab.example/healthcare/riverside");
    expect(html).toMatch(/<button[^>]*>Copy link<\/button>/);
    expect(html).toMatch(/<a[^>]*href="https:\/\/haab.example\/healthcare\/riverside"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/);
    expect(html).toContain("(opens in a new tab)");
  });

  it("says when the link was copied", () => {
    expect(render({ copiedLink: true })).toMatch(/<button[^>]*>Copied<\/button>/);
  });

  it("shows the account and a sign-out form when the host passes them", () => {
    const html = render({ userEmail: "owner@example.com", onSignOut: () => undefined });

    expect(html).toContain("owner@example.com");
    expect(html).toMatch(/<form[\s\S]*<button[^>]*type="submit"[^>]*>Sign out<\/button>/);
    expect(render()).not.toContain("Sign out");
  });

  it("lists every section and marks the current one", () => {
    const html = render({ sections: SECTIONS, currentSection: "bookings", onSelectSection: () => undefined });

    expect(html).toContain('aria-label="Dashboard"');
    for (const section of SECTIONS) expect(html).toContain(`>${section.label}</button>`);
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html).toMatch(/<button[^>]*aria-current="page"[^>]*>Bookings<\/button>/);
  });

  it("offers the way back to the workspace from the booking preview", () => {
    const html = render({ onBackToWorkspace: () => undefined });

    expect(html).toMatch(/<button[^>]*>[^<]*Back to workspace<\/button>/);
    expect(html).not.toContain("<nav");
  });
});
