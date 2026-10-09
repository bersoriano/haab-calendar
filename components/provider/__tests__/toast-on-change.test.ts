import { describe, expect, it } from "vitest";

import { shouldAnnounceNotice } from "@/components/provider/ToastOnChange";

describe("shouldAnnounceNotice", () => {
  it("announces a notice that arrives after mount", () => {
    expect(shouldAnnounceNotice(3, undefined)).toBe(true);
    expect(shouldAnnounceNotice(4, 3)).toBe(true);
  });

  it("does not replay the notice that was already there when it mounted", () => {
    // The module unmounts and remounts its dialogs around the setup wizard.
    expect(shouldAnnounceNotice(3, 3)).toBe(false);
  });

  it("stays quiet without a notice", () => {
    expect(shouldAnnounceNotice(undefined, undefined)).toBe(false);
  });
});
