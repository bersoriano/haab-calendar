export type LandingAccountEntry = "login" | "dashboard" | "setup" | "none";

/**
 * What the landing chrome offers a visitor: a way in, a way back in, or the
 * way to make the page they do not have yet.
 *
 * The rule that matters is that a signed-in visitor is never offered nothing,
 * and never offered somewhere that sends them straight back. Both have
 * happened. Hiding the entry from anyone without a finished page left a
 * signed-in owner with no control at all; offering the workspace to everyone
 * signed in gave a new account a "Your dashboard" link that the workspace
 * answered by redirecting to this same page.
 *
 * So the entry follows where the visitor can actually land: the workspace
 * once there is a finished page, setup until then. An owner whose page could
 * not be read never reaches this function: the home page sends them to the
 * workspace, which explains and retries.
 */
export function resolveLandingAccountEntry({
  loggedIn,
  hasPage,
  canOpenDashboard,
  hasLoginHref,
}: {
  loggedIn: boolean;
  /** The visitor has a finished booking page. */
  hasPage: boolean;
  /** Whether the host gave us a way into the workspace. */
  canOpenDashboard: boolean;
  hasLoginHref: boolean;
}): LandingAccountEntry {
  if (!loggedIn) {
    return hasLoginHref ? "login" : "none";
  }

  // A host with no way into the workspace does not know whether there is a
  // page either, so it has nothing truthful to offer.
  if (!canOpenDashboard) {
    return "none";
  }

  return hasPage ? "dashboard" : "setup";
}
