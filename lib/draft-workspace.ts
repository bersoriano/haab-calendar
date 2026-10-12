import type { AdminTab } from "@/lib/types";

/**
 * The workspace of a page that is not published yet: a draft kept in the
 * visitor's browser, before any account exists. Nobody can book it, nothing
 * counts its visits and there is no account to connect a calendar to, so the
 * sections that read those would only show empty screens. The draft offers
 * the ones that build the page.
 */
const PUBLISHED_ONLY: readonly AdminTab[] = ["bookings", "calendar", "analytics", "integrations"];

export function draftWorkspaceSections<T extends { value: AdminTab }>(
  sections: readonly T[],
  isDraft: boolean,
): readonly T[] {
  return isDraft ? sections.filter((section) => !PUBLISHED_ONLY.includes(section.value)) : sections;
}

/** The section to show: the overview stands in for one a draft does not offer. */
export function draftWorkspaceSection(section: AdminTab, isDraft: boolean): AdminTab {
  return isDraft && PUBLISHED_ONLY.includes(section) ? "dashboard" : section;
}
