import "server-only";

/**
 * The slice of the Google Calendar API this feature uses.
 *
 * An interface rather than a wrapped SDK, so tests inject a fake and CI never
 * needs a Google account. Every method here is one documented REST call, with
 * partial-response fields requested explicitly — the less Google sends, the
 * less there is to accidentally store.
 */

const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

/** Only what the projection needs. Deliberately not summary or description. */
const EVENT_FIELDS = "id,etag,status,updated,start,end,extendedProperties/private";

export class GoogleApiError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    readonly retryable: boolean,
  ) {
    // Never Google's body: an error payload can echo calendar ids, which are
    // often email addresses.
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

export type ManagedEventInput = {
  eventId: string;
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
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
  listCalendars(): Promise<GoogleCalendarSummary[]>;
  upsertEvent(calendarId: string, event: ManagedEventInput): Promise<GoogleEvent>;
  cancelEvent(calendarId: string, eventId: string): Promise<void>;
  getEvent(calendarId: string, eventId: string): Promise<GoogleEvent | null>;
};

function classify(status: number): { code: string; retryable: boolean } {
  if (status === 401) return { code: "unauthorized", retryable: false };
  if (status === 403) return { code: "forbidden", retryable: false };
  if (status === 404) return { code: "not_found", retryable: false };
  if (status === 409) return { code: "conflict", retryable: false };
  // Rate limits and Google's own outages are worth trying again; a rejection
  // of the request itself never becomes valid on a retry.
  if (status === 429) return { code: "rate_limited", retryable: true };
  if (status >= 500) return { code: "google_unavailable", retryable: true };

  return { code: "request_rejected", retryable: false };
}

export function createGoogleCalendarClient(input: {
  accessToken: string;
  fetchImpl?: typeof fetch;
}): GoogleCalendarClient {
  const fetchImpl = input.fetchImpl ?? fetch;

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
      const { code, retryable } = classify(response.status);
      throw new GoogleApiError(code, response.status, retryable);
    }

    return response;
  }

  return {
    async listCalendars() {
      const response = await call("/users/me/calendarList", {
        method: "GET",
        query: {
          minAccessRole: "writer",
          fields: "items(id,summary,timeZone,accessRole,primary)",
          maxResults: "250",
        },
      });

      const payload = (await response.json()) as {
        items?: Array<{
          id: string;
          summary?: string;
          timeZone?: string;
          accessRole?: string;
          primary?: boolean;
        }>;
      };

      return (payload.items ?? []).map((item) => ({
        id: item.id,
        summary: item.summary ?? "Calendar",
        timeZone: item.timeZone,
        accessRole: item.accessRole ?? "reader",
        primary: Boolean(item.primary),
      }));
    },

    /**
     * Create or update in one call.
     *
     * PUT with a client-chosen id is idempotent by construction: a replayed
     * delivery writes the same event rather than a duplicate, which is exactly
     * what at-least-once delivery requires of this handler.
     */
    async upsertEvent(calendarId, event) {
      const response = await call(
        `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(event.eventId)}`,
        {
          method: "PUT",
          query: { fields: EVENT_FIELDS, sendUpdates: "none" },
          body: JSON.stringify({
            id: event.eventId,
            summary: event.summary,
            description: event.description,
            start: event.start,
            end: event.end,
            extendedProperties: { private: event.privateProperties },
          }),
        },
      );

      return (await response.json()) as GoogleEvent;
    },

    async cancelEvent(calendarId, eventId) {
      try {
        await call(
          `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
          { method: "DELETE", query: { sendUpdates: "none" } },
        );
      } catch (error) {
        // Already gone is the state we wanted. Deleting twice must succeed, or
        // a replayed cancellation would fail forever.
        if (error instanceof GoogleApiError && (error.status === 404 || error.status === 410)) {
          return;
        }

        throw error;
      }
    },

    async getEvent(calendarId, eventId) {
      try {
        const response = await call(
          `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
          { method: "GET", query: { fields: EVENT_FIELDS } },
        );

        return (await response.json()) as GoogleEvent;
      } catch (error) {
        if (error instanceof GoogleApiError && error.status === 404) {
          return null;
        }

        throw error;
      }
    },
  };
}
