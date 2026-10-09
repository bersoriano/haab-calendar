/** The parts of a click a link handler needs to decide who owns it. */
export type NavClickLike = {
  button: number;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  defaultPrevented: boolean;
  /** The anchor's `target` attribute ("" when absent). */
  target: string;
};

/**
 * True when an in-app link click should be handled client-side. New-tab and
 * new-window gestures, non-primary buttons and explicit targets stay with the
 * browser so the real `href` keeps working.
 */
export function shouldInterceptNavClick(event: NavClickLike): boolean {
  if (event.defaultPrevented || event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  return !event.target || event.target === "_self";
}
