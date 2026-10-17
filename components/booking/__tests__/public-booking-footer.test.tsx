import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PublicBookingFooter } from "@/components/booking/PublicBookingFooter";
import { normalizeBookingFooter } from "@/lib/booking-footer";
import { normalizeProvider } from "@/lib/store";

describe("public booking footer", () => {
  it("always links default booking attribution to Haab", () => {
    const html = renderToStaticMarkup(<PublicBookingFooter />);
    expect(html).toContain("This booking was brought to you by");
    expect(html).toContain('href="https://haabcalendar.com"');
    expect(html).toContain(">haabcalendar.com</a>");
    expect(html).toContain("and developed by brilliant.dev");
    expect(html).toContain("<footer");
  });

  it("renders saved customization as text and an accessible link", () => {
    const html = renderToStaticMarkup(<PublicBookingFooter text="Booked with Acme" url="https://acme.example/book" />);
    expect(html).toContain("Booked with Acme");
    expect(html).toContain('href="https://acme.example/book"');
    expect(html).toContain(">acme.example</a>");
    expect(html).not.toContain("and developed by brilliant.dev");
  });

  it.each(["javascript:alert(1)", "data:text/html,test", "//example.com", "https://user:pass@example.com"])("rejects unsafe custom URL %s", (url) => {
    expect(normalizeBookingFooter({ publicFooterUrl: url }).url).toBe("https://haabcalendar.com");
  });

  it("defaults blank values and bounds custom text", () => {
    expect(normalizeBookingFooter({ publicFooterText: " " }).text).toBe("This booking was brought to you by");
    expect(normalizeBookingFooter({ publicFooterText: "x".repeat(400) }).text).toHaveLength(200);
  });

  it("preserves spaces and blank drafts while editing footer fields", () => {
    expect(normalizeProvider({ publicFooterText: "Booked with " }).publicFooterText).toBe("Booked with ");
    expect(normalizeProvider({ publicFooterText: "", publicFooterUrl: "" })).toMatchObject({ publicFooterText: "", publicFooterUrl: "" });
  });
});
