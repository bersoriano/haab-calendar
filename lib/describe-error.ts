/**
 * A loggable description of anything thrown. supabase-js rejects with plain
 * objects ({ code, message, details, hint }), which `String(error)` turns into
 * "[object Object]": the log said nothing while a missing column hid every
 * owner's dashboard.
 */
export function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;

  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    const { code, details, hint } = error as { code?: unknown; details?: unknown; hint?: unknown };
    const head = typeof code === "string" && code ? `${code}: ${error.message}` : error.message;
    return [head, details, hint].filter((part) => typeof part === "string" && part).join(" — ");
  }

  if (error && typeof error === "object") {
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }

  return String(error);
}
