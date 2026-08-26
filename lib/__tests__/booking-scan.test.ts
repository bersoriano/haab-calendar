import { describe, expect, it } from "vitest";

import {
  getAppointmentQrPayload,
  parseAppointmentQrCode,
} from "@/lib/booking-scan";

describe("appointment QR parsing", () => {
  it("uses private manage URL as active appointment QR payload", () => {
    expect(
      getAppointmentQrPayload(
        { status: "confirmed", manageToken: "private-token" },
        "https://haab.example/doctors/rivera-family/manage/private-token",
      ),
    ).toBe("https://haab.example/doctors/rivera-family/manage/private-token");

    expect(
      getAppointmentQrPayload(
        { status: "cancelled", manageToken: "private-token" },
        "https://haab.example/doctors/rivera-family/manage/private-token",
      ),
    ).toBeNull();
  });

  it("extracts provider identity and private token from a Haab manage URL", () => {
    expect(
      parseAppointmentQrCode(
        "https://haab.example/doctors/rivera-family/manage/private-token?lang=es",
        "https://haab.example",
      ),
    ).toEqual({
      verticalSegment: "doctors",
      providerSlug: "rivera-family",
      token: "private-token",
    });
  });

  it.each([
    ["calendar data", "BEGIN:VCALENDAR\nEND:VCALENDAR"],
    ["another origin", "https://attacker.example/doctors/rivera-family/manage/private-token"],
    ["raw token", "private-token"],
    ["non-manage URL", "https://haab.example/doctors/rivera-family"],
  ])("rejects %s instead of treating it as an appointment QR", (_label, code) => {
    expect(parseAppointmentQrCode(code, "https://haab.example")).toBeNull();
  });

  it("accepts a code minted on a retired origin that is still trusted", () => {
    expect(
      parseAppointmentQrCode(
        "https://haab-calendar.vercel.app/doctors/rivera-family/manage/private-token",
        ["https://haabcalendar.com", "https://haab-calendar.vercel.app"],
      ),
    ).toEqual({
      verticalSegment: "doctors",
      providerSlug: "rivera-family",
      token: "private-token",
    });
  });

  it("still rejects an untrusted origin when several are accepted", () => {
    expect(
      parseAppointmentQrCode(
        "https://attacker.example/doctors/rivera-family/manage/private-token",
        ["https://haabcalendar.com", "https://haab-calendar.vercel.app"],
      ),
    ).toBeNull();
  });

  it("trusts nothing when the accepted origin list is empty", () => {
    expect(
      parseAppointmentQrCode(
        "https://haabcalendar.com/doctors/rivera-family/manage/private-token",
        [],
      ),
    ).toBeNull();
  });
});
