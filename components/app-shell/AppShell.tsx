"use client";

import { List, X } from "@phosphor-icons/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export type AppShellCopy = {
  skipToContent: string;
  openMenu: string;
  closeMenu: string;
  /** Names the mobile navigation drawer for assistive tech. */
  menu?: string;
};

/**
 * The signed-in layout shared by the provider dashboard and super admin: a
 * sidebar (a drawer on small screens), a sticky top bar that names the page,
 * a banners slot, the page content and a footer.
 */
export function AppShell({
  sidebar,
  title,
  description,
  topBarActions,
  banners,
  footer,
  children,
  copy,
  navigationKey,
}: {
  sidebar: ReactNode;
  title: string;
  description?: string;
  topBarActions?: ReactNode;
  banners?: ReactNode;
  footer: ReactNode;
  children: ReactNode;
  copy: AppShellCopy;
  /**
   * Changes whenever the page changes. The drawer belongs to the page it was
   * opened on, so navigating closes it without an effect.
   */
  navigationKey: string;
}) {
  const [openFor, setOpenFor] = useState<string | null>(null);
  const open = openFor === navigationKey;
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const drawer = drawerRef.current;
    const menuButton = menuButtonRef.current;
    const previousOverflow = document.body.style.overflow;
    const focusables = () =>
      Array.from(drawer?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);

    document.body.style.overflow = "hidden";
    focusables()[0]?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpenFor(null);
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      // Keep focus inside the drawer while it is modal.
      const items = focusables();
      if (items.length === 0) {
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      menuButton?.focus();
    };
  }, [open]);

  return (
    <div className="min-h-screen bg-app-canvas [--app-sticky-top:4rem] lg:grid lg:grid-cols-[272px_minmax(0,1fr)]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-app-fg focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-app-surface"
      >
        {copy.skipToContent}
      </a>

      <aside
        data-shell-sidebar=""
        className="hidden border-r border-app-border bg-app-surface lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:overflow-y-auto"
      >
        {sidebar}
      </aside>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            tabIndex={-1}
            aria-label={copy.closeMenu}
            onClick={() => setOpenFor(null)}
            className="absolute inset-0 bg-app-overlay"
          />
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label={copy.menu ?? copy.openMenu}
            className="relative flex h-full w-[calc(100%-4rem)] max-w-[288px] animate-app-drawer-in"
          >
            <div className="absolute left-full top-0 flex w-16 justify-center pt-3">
              <button
                type="button"
                aria-label={copy.closeMenu}
                onClick={() => setOpenFor(null)}
                className="inline-flex size-11 items-center justify-center rounded-full bg-app-surface text-app-fg shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent"
              >
                <X aria-hidden="true" size={20} />
              </button>
            </div>
            <div className="flex w-full flex-col overflow-y-auto bg-app-surface shadow-xl">{sidebar}</div>
          </div>
        </div>
      ) : null}

      <div className="flex min-h-screen min-w-0 flex-col">
        <header className="sticky top-0 z-40 border-b border-app-border bg-app-surface">
          <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
            <button
              ref={menuButtonRef}
              type="button"
              aria-label={copy.openMenu}
              aria-expanded={open}
              onClick={() => setOpenFor(navigationKey)}
              className="-ml-2 inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-app-fg-secondary hover:bg-app-subtle focus-visible:outline-2 focus-visible:outline-app-accent lg:hidden"
            >
              <List aria-hidden="true" size={22} />
            </button>
            <div className="min-w-0 flex-1">
              <h1
                id="shell-title"
                tabIndex={-1}
                className="truncate text-lg font-semibold text-app-fg focus:outline-none sm:text-xl"
              >
                {title}
              </h1>
              {description ? (
                <p className="hidden truncate text-sm text-app-fg-muted lg:block">{description}</p>
              ) : null}
            </div>
            {topBarActions ? <div className="flex shrink-0 items-center gap-2">{topBarActions}</div> : null}
          </div>
        </header>

        {banners ? (
          <div className="mx-auto w-full max-w-7xl space-y-3 px-4 pt-6 sm:px-6 lg:px-8">{banners}</div>
        ) : null}

        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 focus:outline-none sm:px-6 lg:px-8"
        >
          {children}
        </main>

        {footer}
      </div>
    </div>
  );
}
