import type { Lang, Surface } from "@/lib/types";

/**
 * The one place that decides which language a render uses. The public surface
 * always shows the client-facing choice (`publicLanguage`); every other
 * surface is the owner's own workspace, which is `providerDashboardLanguage`
 * when pinned, or the server-resolved `viewerLanguage` otherwise. It must
 * never fall back to the client-facing setting — that coupling is the exact
 * bug this function exists to prevent from coming back.
 */
export function resolveSurfaceLanguage({
  surface,
  publicLanguage,
  providerDashboardLanguage,
  viewerLanguage,
}: {
  surface: Surface;
  publicLanguage: Lang;
  providerDashboardLanguage?: Lang;
  viewerLanguage: Lang;
}): Lang {
  if (surface === "public") return publicLanguage;
  return providerDashboardLanguage ?? viewerLanguage;
}
