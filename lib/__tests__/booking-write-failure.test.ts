import { describe, expect, it } from "vitest";

import { describeBookingWriteFailure } from "@/lib/booking-write-failure";

const copy = { signedOut: "signed out", fallback: "try again" };

describe("describeBookingWriteFailure", () => {
  it("says the session ended when the proxy answers 401", () => {
    expect(describeBookingWriteFailure(401, copy)).toBe("signed out");
  });

  it.each([400, 404, 409, 500, 503])("keeps the caller's own sentence for %s", (status) => {
    expect(describeBookingWriteFailure(status, copy)).toBe("try again");
  });
});
