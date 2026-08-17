import "server-only";

/**
 * The slice of the Google Calendar API this feature uses.
 *
 * Each method is one documented REST call and says what it actually does.
 * There is deliberately no "upsert": Google has no such operation, and pretending
 * otherwise was how an earlier version of this file ended up overwriting events
 * it did not own. The create-or-update decision belongs a layer up, in
 * `project-event.ts`, where ownership can be verified between the read and the
 * write.
 *
 * Partial-response `fields` are requested explicitly on every call — the less
 * Google sends, the less there is to accidentally store or log.
 */

const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

/** Only what the projection needs. Never summary, description, or attendees. */
const EVENT_FIELDS =
  "id,etag,status,updated,start,end,extendedProperties/private";

const CALENDAR_LIST_FIELDS =
  "nextPageToken,items(id,summary,timeZone,accessRole,primary)";

/** Google's own reason codes for "you are going too fast", not "you may not". */
const USAGE_LIMIT_REASONS = new Set([
  "rateLimitExceeded",
  "userRateLimitExceeded",
  "quotaExceeded",
  "backendError",
]);

export class GoogleApiError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    readonly retryable: boolean,
    /** Google's machine-readable reason, when one was present. */
    readonly reason?: string,
  ) {
    // Code and reason only. A Google error body can carry the calendar id,
    // which is usually somebody's email address.
    super(`Google Calendar API failed: ${code}`);
    this.name = "GoogleApiError";
  }
}

export type GoogleCalendarSummary = {
  id: string;
  summary: string;
  timeZone?: string;
  accessRole: string;
  primary: boolean;
};

export type GoogleCalendarPage = {
  calendars: GoogleCalendarSummary[];
  /** True when Google had more pages than this client was willing to read. */
  truncated: boolean;
};

/** A timed event in a named zone, or an all-day event over exclusive dates. */
export type GoogleEventTime =
  | { dateTime: string; timeZone: string }
  | { date: string };

export type ManagedEventBody = {
  summary: string;
  start: GoogleEventTime;
  end: GoogleEventTime;
  privateProperties: Record<string, string>;
};

export type GoogleEvent = {
  id: string;
  etag?: string;
  status?: string;
  updated?: string;
  start?: { dateTime?: string; date?: string; timeZone?: string };
  end?: { dateTime?: string; date?: string; timeZone?: string };
  extendedProperties?: { private?: Record<string, string> };
};

export type GoogleCalendarClient = {
  listCalendars(): Promise<GoogleCalendarPage>;
  getEvent(calendarId: string, eventId: string): Promise<GoogleEvent | null>;
  insertEvent(
    calendarId: string,
    eventId: string,
    body: ManagedEventBody,
  ): Promise<GoogleEvent>;
  patchEvent(
    calendarId: string,
    eventId: string,
    body: Partial<ManagedEventBody>,
    etag?: string,
  ): Promise<GoogleEvent>;
  deleteEvent(calendarId: string, eventId: string, etag?: string): Promise<void>;
};

type GoogleErrorBody = {
  error?: {
    errors?: Array<{ reason?: string }>;
    status?: string;
  };
};

/**
 * Classifies a failure without letting Google's prose escape.
 *
 * The reason code matters: a 403 is "slow down" when the reason is a usage
 * limit and "you may not" otherwise, and the two need opposite handling —
 * retrying a permission error forever burns quota and never succeeds.
 */
export function classifyGoogleFailure(
  status: number,
  reason?: string,
): { code: string; retryable: boolean } {
  if (status === 401) {
    return { code: "unauthorized", retryable: false };
  }

  if (status === 403) {
    return USAGE_LIMIT_REASONS.has(reason ?? "")
      ? { code: "rate_limited", retryable: true }
      : { code: "forbidden", retryable: false };
  }

  if (status === 404) return { code: "not_found", retryable: false };
  if (status === 409) return { code: "already_exists", retryable: false };
  if (status === 410) return { code: "gone", retryable: false };
  if (status === 412) return { code: "precondition_failed", retryable: false };
  if (status === 429) return { code: "rate_limited", retryable: true };
  if (status >= 500) return { code: "google_unavailable", retryable: true };
  if (status === 400) return { code: "invalid_request", retryable: false };

  return { code: "request_rejected", retryable: false };
}

async function readReason(response: Response): Promise<string | undefined> {
  try {
    const body = (await response.clone().json()) as GoogleErrorBody;
    return body.error?.errors?.[0]?.reason;
  } catch {
    // A non-JSON error body tells us nothing, and is not worth keeping.
    return undefined;
  }
}

export function createGoogleCalendarClient(input: {
  accessToken: string;
  fetchImpl?: typeof fetch;
  /** Bounds how many CalendarList pages one listing will read. */
  maxCalendarPages?: number;
}): GoogleCalendarClient {
  const fetchImpl = input.fetchImpl ?? fetch;
  const maxCalendarPages = input.maxCalendarPages ?? 5;

  async function call(
    path: string,
    init: RequestInit & { query?: Record<string, string> } = {},
  ): Promise<Response> {
    const url = new URL(`${CALENDAR_API}${path}`);
    for (const [key, value] of Object.entries(init.query ?? {})) {
      url.searchParams.set(key, value);
    }

    let response: Response;

    try {
      response = await fetchImpl(url.toString(), {
        ...init,
        headers: {
          authorization: `Bearer ${input.accessToken}`,
          "content-type": "application/json",
          ...(init.headers ?? {}),
        },
      });
    } catch {
      throw new GoogleApiError("network_failed", 0, true);
    }

    if (!response.ok) {
      const reason = await readReason(response);
      const { code, retryable } = classifyGoogleFailure(response.status, reason);
      throw new GoogleApiError(code, response.status, retryable, reason);
    }

    return response;
  }

  function eventPath(calendarId: string, eventId: string) {
    return `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`;
  }

  return {
    async listCalendars() {
      const calendars: GoogleCalendarSummary[] = [];
      let pageToken: string | undefined;
      let pages = 0;
      let truncated = false;

      do {
        const response = await call("/users/me/calendarList", {
          method: "GET",
          query: {
            minAccessRole: "writer",
            fields: CALENDAR_LIST_FIELDS,
            maxResults: "250",
            ...(pageToken ? { pageToken } : {}),
          },
        });

        const payload = (await response.json()) as {
          nextPageToken?: string;
          items?: Array<{
            id: string;
            summary?: string;
            timeZone?: string;
            accessRole?: string;
            primary?: boolean;
          }>;
        };

        for (const item of payload.items ?? []) {
          calendars.push({
            id: item.id,
            summary: item.summary ?? "Calendar",
            timeZone: item.timeZone,
            accessRole: item.accessRole ?? "reader",
            primary: Boolean(item.primary),
          });
        }

        pageToken = payload.nextPageToken;
        pages += 1;

        // An account with thousands of calendars must not turn one request into
        // an unbounded crawl; the caller is told the list was cut short.
        if (pageToken && pages >= maxCalendarPages) {
          truncated = true;
          break;
        }
      } while (pageToken);

      return { calendars, truncated };
    },

    async getEvent(calendarId, eventId) {
      try {
        const response = await call(eventPath(calendarId, eventId), {
          method: "GET",
          query: { fields: EVENT_FIELDS },
        });

        return (await response.json()) as GoogleEvent;
      } catch (error) {
        if (
          error instanceof GoogleApiError &&
          (error.status === 404 || error.status === 410)
        ) {
          return null;
        }

        throw error;
      }
    },

    async insertEvent(calendarId, eventId, body) {
      const response = await call(
        `/calendars/${encodeURIComponent(calendarId)}/events`,
        {
          method: "POST",
          query: { fields: EVENT_FIELDS, sendUpdates: "none" },
          body: JSON.stringify({
            id: eventId,
            summary: body.summary,
            start: body.start,
            end: body.end,
            extendedProperties: { private: body.privateProperties },
          }),
        },
      );

      return (await response.json()) as GoogleEvent;
    },

    /**
     * Updates only the fields named.
     *
     * PATCH leaves everything else alone, which is the whole point: a provider's
     * attendees, reminders, colour, and conferencing on a Haab event are theirs,
     * and a projection has no business discarding them.
     */
    async patchEvent(calendarId, eventId, body, etag) {
      const payload: Record<string, unknown> = {};

      if (body.summary !== undefined) payload.summary = body.summary;
      if (body.start !== undefined) payload.start = body.start;
      if (body.end !== undefined) payload.end = body.end;
      if (body.privateProperties !== undefined) {
        payload.extendedProperties = { private: body.privateProperties };
      }

      const response = await call(eventPath(calendarId, eventId), {
        method: "PATCH",
        query: { fields: EVENT_FIELDS, sendUpdates: "none" },
        // If-Match makes this a compare-and-set: if the event moved under us,
        // Google refuses rather than silently discarding the other change.
        headers: etag ? { "if-match": etag } : {},
        body: JSON.stringify(payload),
      });

      return (await response.json()) as GoogleEvent;
    },

    async deleteEvent(calendarId, eventId, etag) {
      try {
        await call(eventPath(calendarId, eventId), {
          method: "DELETE",
          query: { sendUpdates: "none" },
          headers: etag ? { "if-match": etag } : {},
        });
      } catch (error) {
        // Already gone is the state we wanted. A replayed cancellation has to
        // succeed, or it would fail forever.
        if (
          error instanceof GoogleApiError &&
          (error.status === 404 || error.status === 410)
        ) {
          return;
        }

        throw error;
      }
    },
  };
}
