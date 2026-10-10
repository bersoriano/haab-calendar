import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const { GuestDraftBar } = await import("@/components/provider/GuestDraftBar");
const { AccountStatusBar } = await import("@/components/provider/AccountStatusBar");

describe("GuestDraftBar", () => {
  it("says the page is a preview and offers to publish it", () => {
    const html = renderToStaticMarkup(<GuestDraftBar lang="es" onPublish={() => undefined} />);

    expect(html).toContain("Modo de vista previa");
    expect(html).toMatch(/<button[^>]*>Publicar mi página<\/button>/);
    expect(html).toContain("bg-app-accent");
  });
});

describe("AccountStatusBar", () => {
  it("renders nothing when there is nothing to say", () => {
    expect(renderToStaticMarkup(<AccountStatusBar />)).toBe("");
    expect(renderToStaticMarkup(<AccountStatusBar publicationStatus={{ publishingEnabled: true }} />)).toBe("");
  });

  it("raises a disabled page as an alert and a restored one as a status", () => {
    const off = renderToStaticMarkup(
      <AccountStatusBar publicationStatus={{ publishingEnabled: false, dashboardMessage: "Your page is offline." }} />,
    );
    const on = renderToStaticMarkup(
      <AccountStatusBar publicationStatus={{ publishingEnabled: true, dashboardMessage: "Your page is back." }} />,
    );

    expect(off).toMatch(/role="alert"[\s\S]*Your page is offline\./);
    expect(off).toContain("text-app-danger-fg");
    expect(on).toMatch(/role="status"[\s\S]*Your page is back\./);
  });

  it("links a super admin to super admin", () => {
    const html = renderToStaticMarkup(<AccountStatusBar isSuperAdmin />);

    expect(html).toMatch(/<a[^>]*href="\/super-admin"[^>]*>[\s\S]*Open super admin/);
  });
});
