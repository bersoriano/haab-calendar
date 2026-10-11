/**
 * Which sentence a failed booking write from the dashboard deserves.
 *
 * A 401 is the proxy saying the session is gone. "Try again" would be a lie
 * there: retrying cannot help until the provider signs in again, so that case
 * gets its own sentence and every other failure keeps the caller's.
 */
export function describeBookingWriteFailure(
  status: number,
  copy: { signedOut: string; fallback: string },
) {
  return status === 401 ? copy.signedOut : copy.fallback;
}
