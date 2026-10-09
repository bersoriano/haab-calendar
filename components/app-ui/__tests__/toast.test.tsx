import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  MAX_TOASTS,
  TOAST_DURATION_MS,
  ToastProvider,
  focusAfterDismiss,
  initialToastState,
  pauseTransition,
  toastReducer,
} from "@/components/app-ui";

function add(state = initialToastState, message = "Saved") {
  return toastReducer(state, { type: "add", tone: "success", message });
}

describe("toastReducer", () => {
  it("adds a toast with the full duration", () => {
    const state = add();
    expect(state.items).toEqual([
      { id: 0, tone: "success", message: "Saved", remainingMs: TOAST_DURATION_MS, paused: false },
    ]);
    expect(state.nextId).toBe(1);
  });

  it("keeps at most three, dropping the oldest", () => {
    let state = initialToastState;
    for (const message of ["a", "b", "c", "d"]) state = add(state, message);
    expect(state.items).toHaveLength(MAX_TOASTS);
    expect(state.items.map((item) => item.message)).toEqual(["b", "c", "d"]);
  });

  it("dismisses by id", () => {
    const state = toastReducer(add(add()), { type: "dismiss", id: 0 });
    expect(state.items.map((item) => item.id)).toEqual([1]);
  });

  it("pauses with the time already shown taken off, then resumes", () => {
    const paused = toastReducer(add(), { type: "pause", id: 0, elapsedMs: 1500 });
    expect(paused.items[0]).toMatchObject({ paused: true, remainingMs: TOAST_DURATION_MS - 1500 });

    const resumed = toastReducer(paused, { type: "resume", id: 0 });
    expect(resumed.items[0]).toMatchObject({ paused: false, remainingMs: TOAST_DURATION_MS - 1500 });
  });

  it("never lets remaining time go below zero", () => {
    const paused = toastReducer(add(), { type: "pause", id: 0, elapsedMs: 99_999 });
    expect(paused.items[0].remainingMs).toBe(0);
  });

  it("ignores pausing an already paused toast", () => {
    const once = toastReducer(add(), { type: "pause", id: 0, elapsedMs: 1000 });
    expect(toastReducer(once, { type: "pause", id: 0, elapsedMs: 1000 })).toBe(once);
  });
});

describe("pauseTransition", () => {
  const idle = { hovered: false, focused: false };

  it("pauses on the first of hover or focus", () => {
    expect(pauseTransition(idle, { hovered: true, focused: false })).toBe("pause");
    expect(pauseTransition(idle, { hovered: false, focused: true })).toBe("pause");
  });

  it("keeps waiting while the other source still holds it", () => {
    // Keyboard focus inside the toast, then the mouse passes over and leaves.
    const both = { hovered: true, focused: true };
    expect(pauseTransition({ hovered: false, focused: true }, both)).toBeNull();
    expect(pauseTransition(both, { hovered: false, focused: true })).toBeNull();
  });

  it("resumes only when neither holds it", () => {
    expect(pauseTransition({ hovered: false, focused: true }, idle)).toBe("resume");
    expect(pauseTransition({ hovered: true, focused: false }, idle)).toBe("resume");
  });
});

describe("focusAfterDismiss", () => {
  const live = { isConnected: true };
  const gone = { isConnected: false };

  it("returns focus to where the person came from", () => {
    expect(focusAfterDismiss({ returnTo: live, others: [{ isConnected: true }] })).toBe(live);
  });

  it("falls back to the next toast when that element is gone", () => {
    const next = { isConnected: true };
    expect(focusAfterDismiss({ returnTo: gone, others: [next] })).toBe(next);
    expect(focusAfterDismiss({ returnTo: null, others: [next] })).toBe(next);
  });

  it("gives up only when there is nothing to focus", () => {
    expect(focusAfterDismiss({ returnTo: null, others: [] })).toBeNull();
  });
});

describe("ToastProvider", () => {
  it("renders one polite live region", () => {
    const html = renderToStaticMarkup(
      <ToastProvider dismissLabel="Dismiss">
        <p>page</p>
      </ToastProvider>,
    );
    expect(html.match(/role="status"/g)).toHaveLength(1);
    expect(html).toContain('aria-live="polite"');
  });

  it("does not add a second region when nested", () => {
    const html = renderToStaticMarkup(
      <ToastProvider dismissLabel="Dismiss">
        <ToastProvider dismissLabel="Dismiss">
          <p>module</p>
        </ToastProvider>
      </ToastProvider>,
    );
    expect(html.match(/role="status"/g)).toHaveLength(1);
    expect(html).toContain("module");
  });
});
