import { describe, expect, it } from "vitest";

import { moduleMountsOwnToasts } from "@/lib/module-toasts";

/**
 * Embedded hosts (chrome="module") have no dashboard shell to provide toasts,
 * so the module mounts its own region around everything it renders — header
 * and dialogs included. The dashboard shell provides one already, and a
 * public booking page must not change at all.
 */
describe("moduleMountsOwnToasts", () => {
  it("mounts a region for an embedded module that can manage the page", () => {
    expect(moduleMountsOwnToasts({ chrome: "module", surfaceMode: "adaptive" })).toBe(true);
  });

  it("leaves it to the dashboard shell", () => {
    expect(moduleMountsOwnToasts({ chrome: "shell", surfaceMode: "adaptive" })).toBe(false);
  });

  it("never adds one to a public booking page", () => {
    expect(moduleMountsOwnToasts({ chrome: "module", surfaceMode: "public-only" })).toBe(false);
    expect(moduleMountsOwnToasts({ chrome: "shell", surfaceMode: "public-only" })).toBe(false);
  });
});
