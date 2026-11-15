import { describe, expect, it } from "vitest";

import {
  clampInvitationSeats,
  DEFAULT_INVITATION_SEATS,
  INVITATION_SEAT_LIMIT_MAX,
  isInvitationMode,
  parseRsvpMode,
  parseVocabulary,
} from "@/lib/rsvp-mode";

describe("parseRsvpMode", () => {
  it("keeps a known mode and treats anything else as open", () => {
    expect(parseRsvpMode("invitations")).toBe("invitations");
    expect(parseRsvpMode("open")).toBe("open");
    expect(parseRsvpMode("x")).toBe("open");
    expect(parseRsvpMode(null)).toBe("open");
    expect(parseRsvpMode(undefined)).toBe("open");
  });
});

describe("clampInvitationSeats", () => {
  it("reads whole numbers and strings, within 1 to 20", () => {
    expect(clampInvitationSeats("4")).toBe(4);
    expect(clampInvitationSeats(1)).toBe(1);
    expect(clampInvitationSeats(99)).toBe(INVITATION_SEAT_LIMIT_MAX);
    expect(INVITATION_SEAT_LIMIT_MAX).toBe(20);
  });

  it("falls back for nothing, zero, fractions and junk", () => {
    expect(clampInvitationSeats(0)).toBe(DEFAULT_INVITATION_SEATS);
    expect(clampInvitationSeats(undefined)).toBe(2);
    expect(clampInvitationSeats("2.5")).toBe(2);
    expect(clampInvitationSeats("abc", 3)).toBe(3);
  });
});

describe("isInvitationMode", () => {
  it("is on only for an events page set to invitations", () => {
    expect(isInvitationMode({ rsvpMode: "invitations" }, "events")).toBe(true);
    expect(isInvitationMode({ rsvpMode: "invitations" }, "healthcare")).toBe(false);
    expect(isInvitationMode({ rsvpMode: "open" }, "events")).toBe(false);
    expect(isInvitationMode({}, "events")).toBe(false);
    expect(isInvitationMode({ rsvpMode: "invitations" }, undefined)).toBe(false);
  });
});

describe("parseVocabulary", () => {
  it("keeps the known word sets only", () => {
    expect(parseVocabulary("tours")).toBe("tours");
    expect(parseVocabulary("weddings")).toBe("weddings");
    expect(parseVocabulary("pirates")).toBeUndefined();
    expect(parseVocabulary(null)).toBeUndefined();
  });
});
