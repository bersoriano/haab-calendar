export type LandingAccountEntry = "login" | "dashboard" | "none";

/**
 * What the landing chrome offers a visitor: a way in, or a way back in.
 *
 * The rule that matters is that a signed-in visitor is never offered nothing.
 * Tying this to "has a finished page" produced a dead end: an owner whose
 * dashboard store failed to load, or whose session no longer resolves to a
 * user, counted as signed in with no page — so the log-in link was hidden
 * (they are signed in) and the dashboard link was hidden too (no page), and
 * the only remaining control offered to start a page they already had.
 *
 * Setup state decides what the workspace shows once they arrive, not whether
 * they are allowed to reach it.
 */
export function resolveLandingAccountEntry({
  loggedIn,
  canOpenDashboard,
  hasLoginHref,
}: {
  loggedIn: boolean;
  /** Whether the host gave us a way into the workspace. */
  canOpenDashboard: boolean;
  hasLoginHref: boolean;
}): LandingAccountEntry {
  if (!loggedIn) {
    return hasLoginHref ? "login" : "none";
  }

  return canOpenDashboard ? "dashboard" : "none";
}
