import type { BookingStep } from "@/lib/types";

type PublicBookingStepScrollInput = {
  previousStep: BookingStep | null;
  nextStep: BookingStep;
  scrollTo: (options: ScrollToOptions) => void;
};

type PublicProgressIndicatorCollapseInput = {
  currentStep: BookingStep;
  isStepTransitionActive: boolean;
  isStickyHeaderStuck: boolean;
};

export function scrollPublicBookingStepToTop({
  previousStep,
  nextStep,
  scrollTo,
}: PublicBookingStepScrollInput) {
  if (previousStep === null || previousStep === nextStep) {
    return;
  }

  scrollTo({ top: 0, behavior: "smooth" });
}

export function shouldCollapsePublicProgressIndicator({
  currentStep,
  isStepTransitionActive,
  isStickyHeaderStuck,
}: PublicProgressIndicatorCollapseInput) {
  return currentStep === 2 && isStickyHeaderStuck && !isStepTransitionActive;
}
