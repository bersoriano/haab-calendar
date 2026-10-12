import { prepareGuestPreviewStore } from "@/lib/guest-builder";
import { normalizeStore } from "@/lib/store";
import type { AdminTab, ModuleStore } from "@/lib/types";

/**
 * The workspace of a page that is not published yet: a draft kept in the
 * browser. Nobody can book it, nothing counts its visits and no page exists to
 * connect a calendar to, so the sections that read those would only show
 * empty screens. The draft offers the ones that build the page.
 *
 * Signing in does not publish a draft. An account can hold a finished draft
 * and no page: it made one signed out and came back by the ordinary log-in.
 */
const PUBLISHED_ONLY: readonly AdminTab[] = ["bookings", "analytics", "integrations"];

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

/**
 * The module is showing a draft: its page is in the browser and the host
 * means to publish it, for a guest (once they make an account) or for the
 * signed-in account setup saves to. A page the server already has is not one,
 * and neither is a standalone module that never publishes anywhere.
 */
export function isUnpublishedDraft(input: {
  integratedMode: boolean;
  isGuestDraft: boolean;
  persistSetup: boolean;
}): boolean {
  return !input.integratedMode && (input.isGuestDraft || input.persistSetup);
}

/**
 * What the draft's save control offers.
 * - "guest": an account, which is what keeps the draft and publishes it.
 * - "account": publishing, for a signed-in account with a finished draft.
 * - "setup": nothing to press. Setup's last step publishes, after its checks.
 */
export type DraftSaveMode = "guest" | "account" | "setup";

export function draftSaveMode(input: {
  loggedIn: boolean;
  configured: boolean;
  draftFinished: boolean;
}): DraftSaveMode | null {
  if (input.configured) return null;
  if (!input.loggedIn) return "guest";
  return input.draftFinished ? "account" : "setup";
}

export type PublishDraftResult =
  | { ok: true; store: ModuleStore }
  /** The server answered and said no; `message` is its reason, when it gave one. */
  | { ok: false; reason: "refused"; message?: string }
  | { ok: false; reason: "unreachable" };

/** Saves a signed-in account's draft as its published page. */
export async function publishDraft(
  draft: ModuleStore,
  fetcher: typeof fetch = fetch,
): Promise<PublishDraftResult> {
  try {
    const response = await fetcher("/api/provider/store", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ store: prepareGuestPreviewStore(draft) }),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      store?: ModuleStore;
      userMessage?: string;
    };

    if (!response.ok || !payload.store) {
      return payload.userMessage
        ? { ok: false, reason: "refused", message: payload.userMessage }
        : { ok: false, reason: "refused" };
    }

    return { ok: true, store: normalizeStore(payload.store) };
  } catch {
    return { ok: false, reason: "unreachable" };
  }
}
