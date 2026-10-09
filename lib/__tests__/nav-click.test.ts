import { describe, expect, it } from "vitest";
import { shouldInterceptNavClick, type NavClickLike } from "@/lib/nav-click";

function click(overrides: Partial<NavClickLike> = {}): NavClickLike {
  return {
    button: 0,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    defaultPrevented: false,
    target: "",
    ...overrides,
  };
}

describe("shouldInterceptNavClick", () => {
  it("intercepts a plain primary click", () => {
    expect(shouldInterceptNavClick(click())).toBe(true);
    expect(shouldInterceptNavClick(click({ target: "_self" }))).toBe(true);
  });

  it("leaves new-tab gestures to the browser", () => {
    expect(shouldInterceptNavClick(click({ metaKey: true }))).toBe(false);
    expect(shouldInterceptNavClick(click({ ctrlKey: true }))).toBe(false);
    expect(shouldInterceptNavClick(click({ shiftKey: true }))).toBe(false);
    expect(shouldInterceptNavClick(click({ altKey: true }))).toBe(false);
    expect(shouldInterceptNavClick(click({ button: 1 }))).toBe(false);
    expect(shouldInterceptNavClick(click({ target: "_blank" }))).toBe(false);
  });

  it("respects a handler that already prevented default", () => {
    expect(shouldInterceptNavClick(click({ defaultPrevented: true }))).toBe(false);
  });
});
