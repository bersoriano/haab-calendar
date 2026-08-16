import { SpanStatusCode, trace, type Span } from "@opentelemetry/api";

import type { SpanName } from "@/lib/observability/events";

/**
 * Thin wrapper over the OpenTelemetry API.
 *
 * The API package is a no-op until something registers a provider, so this is
 * safe to call whether or not an exporter is configured — an unconfigured
 * deployment simply produces no spans, rather than failing to start.
 */

const tracer = trace.getTracer("haab-calendar");

/**
 * Attributes are low-cardinality by design: statuses, outcomes, feature keys.
 * Identifiers stay in logs, where one more distinct value costs nothing; as a
 * span or metric dimension a provider id would multiply the series count by the
 * number of providers.
 */
export type SpanAttributes = Record<string, string | number | boolean | undefined>;

function applyAttributes(span: Span, attributes: SpanAttributes) {
  for (const [key, value] of Object.entries(attributes)) {
    if (value !== undefined) {
      span.setAttribute(key, value);
    }
  }
}

export async function withSpan<T>(
  name: SpanName,
  attributes: SpanAttributes,
  run: (span: Span) => Promise<T>,
): Promise<T> {
  return tracer.startActiveSpan(name, async (span) => {
    applyAttributes(span, attributes);

    try {
      const result = await run(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      // The code, not the message: a span leaves the process the same way a log
      // line does, and an exception message can carry a key or a row.
      span.setStatus({ code: SpanStatusCode.ERROR });
      span.setAttribute(
        "error.type",
        error instanceof Error ? error.name : "unknown",
      );
      throw error;
    } finally {
      span.end();
    }
  });
}

/** The active trace id, so a log line can be joined to its span. */
export function currentTraceId(): string | undefined {
  const context = trace.getActiveSpan()?.spanContext();
  return context?.traceId;
}
