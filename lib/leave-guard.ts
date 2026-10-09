/**
 * The dashboard asks before a reload or close would drop unsaved edits. A few
 * navigations are planned and carry those edits with them — the business-type
 * switch publishes a draft seeded from the live page — so they announce
 * themselves first and the question is skipped. Page-lifetime state: the next
 * document starts fresh.
 */
let leavingOnPurpose = false;

export function allowLeavingWithoutWarning() {
  leavingOnPurpose = true;
}

export function shouldWarnBeforeLeaving(hasUnsavedChanges: boolean) {
  return hasUnsavedChanges && !leavingOnPurpose;
}
