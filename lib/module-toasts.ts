import type { SurfaceMode } from "@/lib/types";

/**
 * Whether the booking module mounts its own toast region. Embedded hosts
 * (chrome="module") have no dashboard shell to provide one; the shell does;
 * and a public booking page (surfaceMode="public-only") must not change.
 */
export function moduleMountsOwnToasts({
  chrome,
  surfaceMode,
}: {
  chrome: "module" | "shell";
  surfaceMode: SurfaceMode;
}) {
  return chrome === "module" && surfaceMode === "adaptive";
}
