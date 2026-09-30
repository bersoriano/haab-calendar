import { describe, expect, it } from "vitest";

import { formatWeekdayDate } from "../format";
import { getFirstName, getSuccessHeadline, shortenManageUrl } from "../success-copy";

const templates = {
  successTitle: "You're booked, {name}.",
  successTitleNoName: "You're booked.",
  successTitleEvents: "You're in, {name}.",
  successTitleEventsNoName: "You're in.",
  successTitleCancelled: "Your {booking} was cancelled.",
};
const headline = (over: Partial<Parameters<typeof getSuccessHeadline>[1]> = {}) =>
  getSuccessHeadline(templates, {
    status: "confirmed",
    clientName: "Jamie Rivera",
    isEvents: false,
    booking: "appointment",
    ...over,
  });

describe("getFirstName", () => {
  it("takes the first word", () => {
    expect(getFirstName("Jamie Rivera")).toBe("Jamie");
    expect(getFirstName("  Test   Patient ")).toBe("Test");
  });

  it("is empty with no name", () => {
    expect(getFirstName("")).toBe("");
    expect(getFirstName("   ")).toBe("");
    expect(getFirstName(undefined)).toBe("");
  });
});

describe("getSuccessHeadline", () => {
  it("greets by first name", () => {
    expect(headline()).toBe("You're booked, Jamie.");
  });

  it("drops the greeting when there is no name", () => {
    expect(headline({ clientName: "  " })).toBe("You're booked.");
  });

  it("says 'in' for events, named or not", () => {
    expect(headline({ isEvents: true })).toBe("You're in, Jamie.");
    expect(headline({ isEvents: true, clientName: "" })).toBe("You're in.");
  });

  it("treats an updated booking like a new one", () => {
    expect(headline({ status: "rescheduled" })).toBe("You're booked, Jamie.");
  });

  it("does not greet a cancelled booking and uses the vertical's noun", () => {
    expect(headline({ status: "cancelled" })).toBe("Your appointment was cancelled.");
    expect(headline({ status: "cancelled", isEvents: true, booking: "registration" })).toBe(
      "Your registration was cancelled.",
    );
  });
});

describe("shortenManageUrl", () => {
  const url = "https://haab-calendar.vercel.app/doctors/dr-maya-rivera/manage/CFjeaQWERTYUIOPBkV";

  it("drops the protocol and keeps the whole address when it fits", () => {
    expect(shortenManageUrl(url, 100)).toBe(
      "haab-calendar.vercel.app/doctors/dr-maya-rivera/manage/CFjeaQWERTYUIOPBkV",
    );
  });

  it("trims from the front and keeps the token whole when the path is enough", () => {
    expect(shortenManageUrl(url, 50)).toBe("…/doctors/dr-maya-rivera/manage/CFjeaQWERTYUIOPBkV");
  });

  it("keeps the path and cuts the token in the middle when it must", () => {
    expect(shortenManageUrl(url, 45)).toBe("…/doctors/dr-maya-rivera/manage/CFje…PBkV");
    expect(shortenManageUrl(url, 34)).toBe("…/dr-maya-rivera/manage/CFje…PBkV");
  });

  it("never returns a bare protocol and never drops the token's end", () => {
    for (const max of [10, 20, 30, 40, 60]) {
      const out = shortenManageUrl(url, max);

      expect(out).not.toMatch(/^https?:/);
      expect(out.endsWith("PBkV")).toBe(true);
    }
  });

  it("handles a url with no path", () => {
    expect(shortenManageUrl("https://example.test", 30)).toBe("example.test");
    expect(shortenManageUrl("https://a-very-long-host-name.example.test", 12)).toHaveLength(12);
  });
});

describe("formatWeekdayDate", () => {
  it("says the weekday, month and day, without the year", () => {
    expect(formatWeekdayDate("2026-10-01", "en")).toBe("Thursday, October 1");
    expect(formatWeekdayDate("2026-10-01", "es")).toBe("jueves, 1 de octubre");
  });
});
