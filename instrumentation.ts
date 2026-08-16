/**
 * Server instrumentation, run once when a Next.js server instance starts.
 *
 * Registration is deliberately unconditional and dependency-free at the export
 * boundary: `registerOTel` installs a provider, and if no OTLP exporter is
 * configured the SDK simply drops spans. An unconfigured deployment must start
 * exactly as it did before — telemetry is never a startup requirement.
 */
export async function register() {
  // Only the Node.js runtime. The Edge runtime has a different module surface,
  // and importing the Node SDK there would fail at build time.
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const { registerOTel } = await import("@vercel/otel");

  registerOTel({ serviceName: "haab-calendar" });
}
