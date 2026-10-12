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
  // The draft's one save control: where the draft is kept, and the only way to
  // keep it anywhere else. A signed-out draft has no "Save changes".
  it("says where the draft is saved and offers the account that publishes it", () => {
    const html = renderToStaticMarkup(<GuestDraftBar lang="es" onPublish={() => undefined} />);

    expect(html).toMatch(/role="region"[^>]*aria-label="Borrador guardado en este dispositivo"/);
    expect(html).toContain("Aún no hay nada en línea");
    expect(html).toMatch(/<button[^>]*>Crear cuenta y publicar<\/button>/);
    expect(html).toContain("bg-app-accent");
  });

  it("stays in reach at the bottom of the screen, like the dashboard's save bar", () => {
    const html = renderToStaticMarkup(<GuestDraftBar lang="en" onPublish={() => undefined} />);

    expect(html).toMatch(/class="[^"]*sticky bottom-0/);
    expect(html).toContain("Draft saved on this device");
    expect(html).toMatch(/<button[^>]*>Create account to publish<\/button>/);
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
