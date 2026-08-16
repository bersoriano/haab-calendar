/**
 * Turning any thrown value into something safe to log.
 *
 * The rule is the same everywhere: a stable code identifies what went wrong, and
 * nothing derived from the error's own text leaves the process. A Stripe error
 * message can contain a key prefix, a Postgres message can contain a row, and a
 * stack is a map of the filesystem.
 */

export type SafeError = {
  name: string;
  code: string;
  retryable?: boolean;
};

const DEFAULT_CODE = "unknown_error";

type CodedError = {
  name?: unknown;
  code?: unknown;
  retryable?: unknown;
};

function readCode(error: CodedError): string {
  if (typeof error.code === "string" && error.code.trim()) {
    return error.code.trim().slice(0, 64);
  }

  return DEFAULT_CODE;
}

export function toSafeError(value: unknown): SafeError {
  if (value instanceof Error) {
    const coded = value as unknown as CodedError;

    return {
      name: value.name,
      code: readCode(coded),
      ...(typeof coded.retryable === "boolean" ? { retryable: coded.retryable } : {}),
    };
  }

  if (value && typeof value === "object") {
    const coded = value as CodedError;
    return {
      name: typeof coded.name === "string" ? coded.name.slice(0, 64) : "Error",
      code: readCode(coded),
    };
  }

  return { name: "Error", code: DEFAULT_CODE };
}

/**
 * Development keeps the stack, production does not.
 *
 * Useful while debugging locally, and never shipped: a structured production
 * sink is read by people and tools that have no business seeing internal paths.
 */
export function debugDetail(value: unknown): string | undefined {
  if (process.env.NODE_ENV === "production") {
    return undefined;
  }

  return value instanceof Error ? value.stack?.slice(0, 2000) : undefined;
}
