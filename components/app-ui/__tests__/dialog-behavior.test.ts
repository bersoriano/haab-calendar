import { describe, expect, it } from "vitest";

import { createScrollLock } from "@/components/app-ui/scroll-lock";
import { reconcileNativeClose, shouldCloseFromBackdrop } from "@/components/app-ui/Dialog";

function page(overflow = "") {
  return { style: { overflow } };
}

describe("createScrollLock", () => {
  it("locks while any dialog is open and restores the page's own value last", () => {
    const target = page("auto");
    const lock = createScrollLock(() => target);

    const releaseA = lock.acquire();
    const releaseB = lock.acquire();
    expect(target.style.overflow).toBe("hidden");

    // React may clean up the first-opened dialog first.
    releaseA();
    expect(target.style.overflow).toBe("hidden");
    releaseB();
    expect(target.style.overflow).toBe("auto");
  });

  it("restores correctly when closed in opening order too", () => {
    const target = page();
    const lock = createScrollLock(() => target);
    const releaseA = lock.acquire();
    const releaseB = lock.acquire();
    releaseB();
    releaseA();
    expect(target.style.overflow).toBe("");
  });

  it("ignores a second release of the same lock", () => {
    const target = page();
    const lock = createScrollLock(() => target);
    const releaseA = lock.acquire();
    const releaseB = lock.acquire();
    releaseA();
    releaseA();
    expect(target.style.overflow).toBe("hidden");
    releaseB();
    expect(target.style.overflow).toBe("");
  });
});

describe("reconcileNativeClose", () => {
  function fakeDialog() {
    return {
      open: false,
      shown: 0,
      showModal() {
        this.open = true;
        this.shown += 1;
      },
    };
  }

  it("asks the owner to close when the browser closed the dialog", () => {
    const dialog = fakeDialog();
    let closes = 0;
    let open = true;
    reconcileNativeClose({
      dialog,
      isOpen: () => open,
      onClose: () => {
        closes += 1;
        open = false;
      },
      defer: (run) => run(),
    });
    expect(closes).toBe(1);
    expect(dialog.shown).toBe(0);
  });

  it("shows the dialog again when the owner keeps it open (e.g. pending)", () => {
    const dialog = fakeDialog();
    reconcileNativeClose({ dialog, isOpen: () => true, onClose: () => undefined, defer: (run) => run() });
    expect(dialog.shown).toBe(1);
  });

  it("does nothing for a close the owner asked for", () => {
    const dialog = fakeDialog();
    let closes = 0;
    reconcileNativeClose({
      dialog,
      isOpen: () => false,
      onClose: () => {
        closes += 1;
      },
      defer: (run) => run(),
    });
    expect(closes).toBe(0);
    expect(dialog.shown).toBe(0);
  });
});

describe("shouldCloseFromBackdrop", () => {
  it("closes only when the press both started and ended on the backdrop", () => {
    expect(shouldCloseFromBackdrop(true, true)).toBe(true);
    // A text selection dragged out of the panel must not close it.
    expect(shouldCloseFromBackdrop(false, true)).toBe(false);
    expect(shouldCloseFromBackdrop(true, false)).toBe(false);
  });
});
