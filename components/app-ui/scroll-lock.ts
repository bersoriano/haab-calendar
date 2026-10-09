type ScrollTarget = { style: { overflow: string } };

/**
 * A reference-counted page scroll lock. Dialogs can stack and React does not
 * clean them up in reverse opening order, so each dialog saving and restoring
 * the overflow value itself can leave the page locked. The first lock saves
 * the page's own value; only the last release puts it back.
 */
export function createScrollLock(getTarget: () => ScrollTarget) {
  let count = 0;
  let saved = "";

  return {
    acquire() {
      const target = getTarget();
      if (count === 0) {
        saved = target.style.overflow;
        target.style.overflow = "hidden";
      }
      count += 1;

      let released = false;
      return () => {
        if (released) return;
        released = true;
        count -= 1;
        if (count === 0) getTarget().style.overflow = saved;
      };
    },
  };
}

/** The page-wide lock every Dialog shares. */
export const pageScrollLock = createScrollLock(() => document.documentElement);
