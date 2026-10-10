import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/super-admin/actions", () => ({ startDemoEdit: async () => undefined }));

const { DemoPagesPanel } = await import("@/components/super-admin/DemoPagesPanel");

function render(status: "ready" | "missing" | "unowned") {
  return renderToStaticMarkup(
    <DemoPagesPanel
      demoPages={[
        {
          key: "doctors",
          label: "Doctors",
          vertical: "healthcare",
          publicPath: "/healthcare/example-clinic",
          businessName: "Example Clinic",
          serviceCount: 3,
          status,
        },
      ]}
    />,
  );
}

describe("DemoPagesPanel", () => {
  it("shows each demo as a card with its type, path and services", () => {
    const html = render("ready");

    expect(html).toContain("<article");
    expect(html).toContain("Example Clinic");
    expect(html).toMatch(/<span[^>]*ring-inset[^>]*>healthcare<\/span>/);
    expect(html).toContain("/healthcare/example-clinic");
    expect(html).toContain("3 services");
  });

  it("starts demo editing for that demo", () => {
    const html = render("ready");

    expect(html).toContain('name="demoKey" value="doctors"');
    expect(html).toMatch(/<button[^>]*type="submit"[^>]*>Edit demo<\/button>/);
    expect(html).not.toMatch(/<button[^>]*disabled=""[^>]*>Edit demo/);
  });

  it("opens the live page in a new tab and says so", () => {
    const html = render("ready");

    expect(html).toMatch(/<a[^>]*href="\/healthcare\/example-clinic"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/);
    expect(html).toContain("(opens in a new tab)");
  });

  it("locks editing and says how to fix a demo that is not seeded", () => {
    const missing = render("missing");
    const unowned = render("unowned");

    expect(missing).toMatch(/<button[^>]*disabled=""[^>]*>Edit demo<\/button>/);
    expect(missing).toContain("Not seeded — run npm run seed:examples");
    expect(unowned).toContain("re-run npm run seed:examples");
  });
});
