import { describe, expect, it, vi } from "vitest";
import {
  scrollPublicBookingStepToTop,
  shouldCollapsePublicProgressIndicator,
} from "@/lib/public-booking-step-scroll";

describe("public booking step scroll", () => {
  it("smoothly scrolls to the page top only after the visible step changes", () => {
    const scrollTo = vi.fn();

    scrollPublicBookingStepToTop({ previousStep: null, nextStep: 2, scrollTo });
    scrollPublicBookingStepToTop({ previousStep: 2, nextStep: 2, scrollTo });
    expect(scrollTo).not.toHaveBeenCalled();

    scrollPublicBookingStepToTop({ previousStep: 2, nextStep: 3, scrollTo });
    scrollPublicBookingStepToTop({ previousStep: 3, nextStep: 2, scrollTo });

    expect(scrollTo).toHaveBeenNthCalledWith(1, { top: 0, behavior: "smooth" });
    expect(scrollTo).toHaveBeenNthCalledWith(2, { top: 0, behavior: "smooth" });
  });

  it("keeps the full progress indicator stable while returning for another booking", () => {
    expect(
      shouldCollapsePublicProgressIndicator({
        currentStep: 2,
        isStepTransitionActive: true,
        isStickyHeaderStuck: true,
      }),
    ).toBe(false);
    expect(
      shouldCollapsePublicProgressIndicator({
        currentStep: 2,
        isStepTransitionActive: false,
        isStickyHeaderStuck: true,
      }),
    ).toBe(true);
  });
});
