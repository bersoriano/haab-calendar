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

/**
 * The event fields a sync reads. No summary, description, location, attendees,
 * organizer, or conference data: an unrelated event is inspected and discarded,
 * and it cannot leak what was never fetched.
 */
const LIST_EVENTS_FIELDS =
  "nextPageToken,nextSyncToken,items(id,etag,status,updated,start,end,transparency,eventType,recurringEventId,originalStartTime,extendedProperties/private)";

/**
 * Bumped when the query above changes shape. A stored sync token was issued for
 * a particular query; replaying it under a different one silently misses events.
 */
export const EVENTS_QUERY_VERSION = 1;

/** Google's own ceiling on calendars per FreeBusy request. */
export const FREEBUSY_MAX_CALENDARS = 50;

/** How many calendars a provider may point at their availability. */
export const MAX_BUSY_SOURCES = 10;

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
  /** `opaque` blocks time; `transparent` does not. */
  transparency?: string;
  /** `default`, `outOfOffice`, `focusTime`, `workingLocation`. */
  eventType?: string;
  /** Present when the event is an instance of a recurring series. */
  recurringEventId?: string;
  originalStartTime?: { dateTime?: string; date?: string; timeZone?: string };
  extendedProperties?: { private?: Record<string, string> };
};

export type FreeBusyRequest = {
  timeMin: string;
  timeMax: string;
  calendarIds: readonly string[];
};

export type FreeBusyResult = {
  /** Busy intervals per calendar, keyed by the id that was asked for. */
  busyByCalendar: Record<string, Array<{ start: string; end: string }>>;
  /** Calendars Google refused, with its reason code. Never dropped silently. */
  errorsByCalendar: Record<string, string>;
};

export type ListEventsRequest = {
  calendarId: string;
  /** Incremental when present; a full scan otherwise. */
  syncToken?: string;
  pageToken?: string;
};

export type ListEventsPage = {
  events: GoogleEvent[];
  nextPageToken?: string;
  /** Only ever present on the final page of a run. */
  nextSyncToken?: string;
};

export type GoogleCalendarClient = {
  listCalendars(): Promise<GoogleCalendarPage>;
  queryFreeBusy(request: FreeBusyRequest): Promise<FreeBusyResult>;
  listEvents(request: ListEventsRequest): Promise<ListEventsPage>;
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
  watchEvents(request: WatchRequest): Promise<WatchResponse>;
  stopChannel(request: { channelId: string; resourceId: string }): Promise<void>;
};

export type WatchRequest = {
  calendarId: string;
  channelId: string;
  /** Sent back on every notification; the only thing that authenticates one. */
  token: string;
  address: string;
  ttlSeconds: number;
};

export type WatchResponse = {
  resourceId: string;
  /** Google may shorten the requested TTL; the answer is what expires. */
  expiresAt: string | null;
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

  function calendarPath(calendarId: string) {
    return `/calendars/${encodeURIComponent(calendarId)}`;
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

    /**
     * Busy intervals only — no titles, no attendees, nothing about what fills
     * the time. That is the whole reason availability uses FreeBusy rather than
     * listing events: this endpoint cannot return content even by accident.
     */
    async queryFreeBusy({ timeMin, timeMax, calendarIds }) {
      if (calendarIds.length === 0) {
        return { busyByCalendar: {}, errorsByCalendar: {} };
      }

      // Google caps expansion at 50 calendars per request; the selection cap is
      // far below that, so one request always suffices.
      const response = await call("/freeBusy", {
        method: "POST",
        body: JSON.stringify({
          timeMin,
          timeMax,
          items: calendarIds.map((id) => ({ id })),
        }),
      });

      const payload = (await response.json()) as {
        calendars?: Record<
          string,
          {
            busy?: Array<{ start?: string; end?: string }>;
            errors?: Array<{ reason?: string }>;
          }
        >;
      };

      const busyByCalendar: FreeBusyResult["busyByCalendar"] = {};
      const errorsByCalendar: FreeBusyResult["errorsByCalendar"] = {};

      for (const [calendarId, entry] of Object.entries(payload.calendars ?? {})) {
        // A per-calendar failure is kept rather than folded into the busy list:
        // "no busy time" and "we could not ask" must not look alike, because one
        // of them means the slot is safe and the other means nobody knows.
        if (entry.errors?.length) {
          errorsByCalendar[calendarId] = entry.errors[0]?.reason ?? "unknown";
          continue;
        }

        busyByCalendar[calendarId] = (entry.busy ?? [])
          .filter((slot): slot is { start: string; end: string } =>
            Boolean(slot.start && slot.end),
          )
          .map((slot) => ({ start: slot.start, end: slot.end }));
      }

      return { busyByCalendar, errorsByCalendar };
    },

    /**
     * One page of changes.
     *
     * The query shape is fixed and versioned in code, because a sync token is
     * only valid for the query that produced it. Notably absent:
     * `privateExtendedProperty`, `timeMin`, and `timeMax` — Google rejects them
     * alongside a sync token, so ownership filtering happens after the fetch
     * rather than in it.
     *
     * `showDeleted` is on: a deleted event is precisely the change two-way sync
     * most needs to hear about.
     */
    async listEvents({ calendarId, syncToken, pageToken }) {
      const response = await call(
        `/calendars/${encodeURIComponent(calendarId)}/events`,
        {
          method: "GET",
          query: {
            fields: LIST_EVENTS_FIELDS,
            maxResults: "250",
            showDeleted: "true",
            singleEvents: "false",
            ...(syncToken ? { syncToken } : {}),
            ...(pageToken ? { pageToken } : {}),
          },
        },
      );

      const payload = (await response.json()) as {
        items?: GoogleEvent[];
        nextPageToken?: string;
        nextSyncToken?: string;
      };

      return {
        events: payload.items ?? [],
        nextPageToken: payload.nextPageToken,
        nextSyncToken: payload.nextSyncToken,
      };
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

    async watchEvents(request) {
      // The channel id and token are ours, generated per channel. Google echoes
      // both back on every notification, and the token is the only thing that
      // distinguishes a real notification from anyone who guessed the URL.
      const response = await call(`${calendarPath(request.calendarId)}/events/watch`, {
        method: "POST",
        body: JSON.stringify({
          id: request.channelId,
          type: "web_hook",
          address: request.address,
          token: request.token,
          params: { ttl: String(request.ttlSeconds) },
        }),
      });

      const payload = (await response.json()) as {
        resourceId?: string;
        expiration?: string;
      };

      if (!payload.resourceId) {
        // Without a resource id the channel cannot ever be stopped, which would
        // leave Google notifying an endpoint nobody can switch off.
        throw new GoogleApiError("watch_incomplete", 502, true);
      }

      return {
        resourceId: payload.resourceId,
        expiresAt: payload.expiration
          ? new Date(Number(payload.expiration)).toISOString()
          : null,
      };
    },

    async stopChannel(request) {
      try {
        await call("/channels/stop", {
          method: "POST",
          body: JSON.stringify({ id: request.channelId, resourceId: request.resourceId }),
        });
      } catch (error) {
        // A channel that is already gone is the outcome asked for. Failing here
        // would strand the row that records it as live.
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
