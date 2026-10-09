import { describe, expect, it } from "vitest";

import { allowLeavingWithoutWarning, shouldWarnBeforeLeaving } from "@/lib/leave-guard";

describe("leave guard", () => {
  it("warns about unsaved edits until a planned navigation is announced", () => {
    expect(shouldWarnBeforeLeaving(true)).toBe(true);
    expect(shouldWarnBeforeLeaving(false)).toBe(false);

    allowLeavingWithoutWarning();

    expect(shouldWarnBeforeLeaving(true)).toBe(false);
  });
});
