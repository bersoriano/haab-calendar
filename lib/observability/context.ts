import { randomUUID } from "node:crypto";

/**
 * Request correlation.
 *
 * A request id ties a log line to the request that produced it, and nothing
 * else. It is never an authorization token and never an idempotency key: it
 * arrives from the caller, so treating it as either would let the caller choose
 * its own identity or replay someone else's write.
 */

/** Conservative on purpose — an id ends up in logs, so it must not carry markup. */
const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]{8,128}$/;

export const REQUEST_ID_HEADER = "x-request-id";

export function resolveRequestId(headers: Headers | undefined): string {
  const supplied = headers?.get(REQUEST_ID_HEADER)?.trim();

  if (supplied && SAFE_REQUEST_ID.test(supplied)) {
    return supplied;
  }

  return randomUUID();
}

/** Echoes the id back so a caller can quote it in a bug report. */
export function withRequestId<T extends Response>(response: T, requestId: string): T {
  response.headers.set(REQUEST_ID_HEADER, requestId);
  return response;
}
