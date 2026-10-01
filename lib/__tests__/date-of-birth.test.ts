import { describe, expect, it } from "vitest";

import { collectsDateOfBirth, parseDateOfBirth } from "@/lib/date-of-birth";
import { VERTICAL_IDS } from "@/lib/types";

const today = "2026-09-30";

describe("parseDateOfBirth", () => {
  it("accepts nothing, since the field is optional", () => {
    expect(parseDateOfBirth(undefined, today)).toEqual({ ok: true, value: undefined });
    expect(parseDateOfBirth("  ", today)).toEqual({ ok: true, value: undefined });
  });

  it("accepts a real past date as the date input sends it", () => {
    expect(parseDateOfBirth("1989-04-12", today)).toEqual({ ok: true, value: "1989-04-12" });
    expect(parseDateOfBirth(today, today)).toEqual({ ok: true, value: today });
  });

  it("refuses other formats, impossible dates, the future and before 1900", () => {
    for (const raw of ["12/04/1989", "1989-4-12", "1989-02-30", "2026-10-01", "1899-12-31", 19890412]) {
      expect(parseDateOfBirth(raw, today), String(raw)).toEqual({ ok: false });
    }
  });
});

describe("collectsDateOfBirth", () => {
  it("is asked only by healthcare", () => {
    expect(collectsDateOfBirth("healthcare")).toBe(true);
    for (const vertical of VERTICAL_IDS.filter((id) => id !== "healthcare")) {
      expect(collectsDateOfBirth(vertical), vertical).toBe(false);
    }
    expect(collectsDateOfBirth(undefined)).toBe(false);
  });
});
