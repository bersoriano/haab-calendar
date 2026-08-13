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

/**
 * The same decision for the chrome *around* the module, in the one case where
 * the server cannot make it: a signed-out guest whose draft lives in this
 * browser's localStorage. The server has no store to read, so it resolves the
 * visitor's own language and the chrome starts there — while the module reads
 * the draft and honours the workspace language pinned inside it. Running both
 * halves through this, once the draft is in hand, is what keeps one screen in
 * one language across a reload.
 *
 * A signed-in owner's pin comes from the database and is already on the first
 * render, so their language is never taken from a browser-owned draft.
 */
export function resolveGuestChromeLanguage({
  loggedIn,
  draftDashboardLanguage,
  viewerLanguage,
}: {
  loggedIn: boolean;
  draftDashboardLanguage?: Lang;
  viewerLanguage: Lang;
}): Lang {
  if (loggedIn) return viewerLanguage;
  return draftDashboardLanguage ?? viewerLanguage;
}
