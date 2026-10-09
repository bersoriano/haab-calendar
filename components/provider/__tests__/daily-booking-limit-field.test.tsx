import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  DailyBookingLimitField,
  parseDailyBookingLimit,
} from "@/components/provider/DailyBookingLimitField";

describe("parseDailyBookingLimit", () => {
  it("accepts 1 to 500", () => {
    expect(parseDailyBookingLimit("5")).toBe(5);
    expect(parseDailyBookingLimit(" 12 ")).toBe(12);
    expect(parseDailyBookingLimit("500")).toBe(500);
  });

  it("rejects anything else", () => {
    for (const text of ["", "0", "501", "2.5", "-3", "five"]) {
      expect(parseDailyBookingLimit(text)).toBeNull();
    }
  });
});

describe("DailyBookingLimitField", () => {
  it("is off by default, with no number to fill in", () => {
    const html = renderToStaticMarkup(<DailyBookingLimitField onChange={() => undefined} />);
    expect(html).toContain("Limit bookings per day");
    expect(html).not.toContain("checked");
    expect(html).not.toContain('type="number"');
  });

  it("shows the limit and what it does when on", () => {
    const html = renderToStaticMarkup(
      <DailyBookingLimitField value={5} onChange={() => undefined} lang="es" />,
    );
    expect(html).toContain("checked");
    expect(html).toContain('value="5"');
    expect(html).toContain("Después de 5 reservas en un día");
  });
});
