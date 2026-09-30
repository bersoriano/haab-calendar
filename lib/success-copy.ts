import type { BookingStatus } from "@/lib/types";

/**
 * The words on the confirmation panel, kept apart from the markup so the
 * variants (named, anonymous, events, cancelled) can be tested on their own.
 */

/** "Jamie Rivera" → "Jamie". Empty when there is no name to greet. */
export function getFirstName(clientName: string | undefined): string {
  return (clientName ?? "").trim().split(/\s+/)[0] ?? "";
}

type HeadlineTemplates = {
  successTitle: string;
  successTitleNoName: string;
  successTitleEvents: string;
  successTitleEventsNoName: string;
  successTitleCancelled: string;
};

const fill = (template: string, values: Record<string, string>) =>
  template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);

/**
 * What the panel says. A cancelled booking is not greeted, and an updated one
 * is greeted like a new one: the visitor just did something and is being told
 * it worked.
 */
export function getSuccessHeadline(
  templates: HeadlineTemplates,
  {
    status,
    clientName,
    isEvents,
    booking,
  }: {
    status: BookingStatus;
    clientName: string | undefined;
    isEvents: boolean;
    /** The vertical's noun for the thing booked: "appointment", "table". */
    booking: string;
  },
): string {
  if (status === "cancelled") {
    return fill(templates.successTitleCancelled, { booking });
  }

  const name = getFirstName(clientName);

  if (isEvents) {
    return name
      ? fill(templates.successTitleEvents, { name })
      : templates.successTitleEventsNoName;
  }

  return name ? fill(templates.successTitle, { name }) : templates.successTitleNoName;
}

/**
 * The private link, shortened to fit: the start of the address is what a
 * narrow field can lose, because the end is the part that is the key. So the
 * path is trimmed from the front ("…/dr-maya-rivera/manage/…") and, only when
 * that is still too long, the token is cut in the middle ("CFje…PBkV"). Never
 * yields a bare protocol.
 */
export function shortenManageUrl(url: string, maxChars: number): string {
  const bare = url.trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");

  if (bare.length <= maxChars) {
    return bare;
  }

  const slash = bare.indexOf("/");
  const segments = (slash >= 0 ? bare.slice(slash + 1) : "").split("/").filter(Boolean);

  if (segments.length === 0) {
    return `${bare.slice(0, Math.max(1, maxChars - 1))}…`;
  }

  const token = segments[segments.length - 1];
  const abbreviated = token.length > 9 ? `${token.slice(0, 4)}…${token.slice(-4)}` : token;
  const build = (count: number, last: string) =>
    `…/${[...segments.slice(-count, -1), last].join("/")}`;

  for (let count = segments.length; count >= 1; count -= 1) {
    for (const last of [token, abbreviated]) {
      const candidate = build(count, last);

      if (candidate.length <= maxChars) {
        return candidate;
      }
    }
  }

  return build(1, abbreviated);
}
