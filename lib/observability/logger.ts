import type { OperationalEvent } from "@/lib/observability/events";

/**
 * One-line JSON logging for the premium paths.
 *
 * Vendor-neutral on purpose: records go to stdout as single-line JSON, which
 * every log platform can ingest and a human can read with `jq` when there is no
 * platform at all. The clock and the sink are injected so tests assert exact
 * records rather than scraping console output.
 */

export type LogLevel = "info" | "warn" | "error";

const SCHEMA_VERSION = 1;
const SERVICE = "haab-calendar";
const REDACTED = "[REDACTED]";
const MAX_DEPTH = 6;

/**
 * Key *concepts* rather than exact names, because the same secret arrives under
 * a dozen spellings — `token`, `accessToken`, `manageTokenHash`. Matching on the
 * concept means a new spelling is redacted by default rather than leaked until
 * someone notices.
 */
const SENSITIVE_PATTERNS = [
  "authorization",
  "cookie",
  "secret",
  "token",
  "password",
  "email",
  "phone",
  "payload",
  "rawbody",
  "clientname",
  "signature",
  "apikey",
  "credential",
];

function isSensitiveKey(key: string) {
  const lower = key.toLowerCase();
  return SENSITIVE_PATTERNS.some((pattern) => lower.includes(pattern));
}

/**
 * Defence in depth. The logger takes allowlisted fields, so this should rarely
 * have anything to do — it exists for the day someone passes a whole object.
 */
export function redact(value: unknown, depth = 0, seen = new WeakSet<object>()): unknown {
  if (depth > MAX_DEPTH) {
    return REDACTED;
  }

  if (value === null || typeof value !== "object") {
    return value;
  }

  if (seen.has(value)) {
    return REDACTED;
  }

  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((entry) => redact(entry, depth + 1, seen));
  }

  const result: Record<string, unknown> = {};

  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    result[key] = isSensitiveKey(key) ? REDACTED : redact(entry, depth + 1, seen);
  }

  return result;
}

/** Operational identifiers that may appear on a record. */
export type LogFields = {
  requestId?: string;
  traceId?: string;
  durationMs?: number;
  outcome?: string;
  errorCode?: string;
  errorName?: string;
  stripeEventId?: string;
  stripeEventType?: string;
  outboxEventId?: string;
  bookingId?: string;
  providerId?: string;
  aggregateVersion?: number;
  attemptCount?: number;
  featureKey?: string;
  planTier?: string;
  entitlementSource?: string;
  retryable?: boolean;
  claimed?: number;
  [key: string]: unknown;
};

export type Logger = {
  info(event: OperationalEvent, fields?: LogFields): void;
  warn(event: OperationalEvent, fields?: LogFields): void;
  error(event: OperationalEvent, fields?: LogFields): void;
  /** Binds correlation identifiers so callers stop repeating them. */
  child(fields: LogFields): Logger;
};

export type LoggerOptions = {
  sink?: (line: string) => void;
  now?: () => Date;
  environment?: string;
  base?: LogFields;
};

function normalizeError(value: unknown): LogFields {
  if (!(value instanceof Error)) {
    return {};
  }

  // The name only. A message can carry a key or a URL, and a stack is a map of
  // the filesystem — neither belongs in a log line that leaves the process.
  return { errorName: value.name };
}

export function createLogger(options: LoggerOptions = {}): Logger {
  const sink = options.sink ?? ((line: string) => process.stdout.write(`${line}\n`));
  const now = options.now ?? (() => new Date());
  const environment =
    options.environment ?? process.env.NODE_ENV ?? "development";
  const base = options.base ?? {};

  function write(level: LogLevel, event: OperationalEvent, fields: LogFields = {}) {
    try {
      const { error, ...rest } = fields;
      const merged: Record<string, unknown> = {
        schemaVersion: SCHEMA_VERSION,
        timestamp: now().toISOString(),
        level,
        event,
        service: SERVICE,
        environment,
        ...base,
        ...rest,
        ...normalizeError(error),
      };

      for (const [key, value] of Object.entries(merged)) {
        if (value === undefined) {
          delete merged[key];
        }
      }

      sink(JSON.stringify(redact(merged)));
    } catch {
      // Logging is never the reason a booking fails, a webhook 500s, or an
      // outbox event is retried. A record that cannot be written is lost, and
      // that is the correct trade.
    }
  }

  return {
    info: (event, fields) => write("info", event, fields),
    warn: (event, fields) => write("warn", event, fields),
    error: (event, fields) => write("error", event, fields),
    child: (fields) =>
      createLogger({ ...options, base: { ...base, ...fields } }),
  };
}

/** The process-wide logger. Callers normally `.child()` it with correlation ids. */
export const logger = createLogger();
