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
    <div className="min-h-screen bg-[var(--background)] lg:grid lg:grid-cols-[272px_minmax(0,1fr)]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-full focus:bg-[var(--ink)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        {copy.skipToContent}
      </a>

      <aside data-shell-sidebar="" className="hidden border-r border-[var(--line)]/60 bg-[var(--surface-lowest)] lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:overflow-y-auto">
        {sidebar}
      </aside>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            tabIndex={-1}
            aria-label={copy.closeMenu}
            onClick={() => setOpenFor(null)}
            className="absolute inset-0 bg-[rgba(15,23,32,0.42)] backdrop-blur-[2px]"
          />
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label={copy.menu ?? copy.openMenu}
            className="absolute inset-y-0 left-0 flex w-[288px] max-w-[86vw] flex-col overflow-y-auto bg-[var(--surface-lowest)] shadow-[0_24px_64px_rgba(15,23,42,0.24)]"
          >
            <div className="flex justify-end px-3 pt-3">
              <button
                type="button"
                aria-label={copy.closeMenu}
                onClick={() => setOpenFor(null)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl text-[var(--muted)] transition hover:bg-[var(--surface-soft)] hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              >
                <X aria-hidden="true" size={20} />
              </button>
            </div>
            {sidebar}
          </div>
        </div>
      ) : null}

      <div className="flex min-h-screen min-w-0 flex-col">
        <header className="sticky top-0 z-40 border-b border-[var(--line)]/60 bg-[var(--background)]/90 backdrop-blur">
          <div className="mx-auto flex w-full max-w-[1400px] items-center gap-3 px-4 py-3 sm:px-6 lg:px-8 lg:py-4">
            <button
              ref={menuButtonRef}
              type="button"
              aria-label={copy.openMenu}
              aria-expanded={open}
              onClick={() => setOpenFor(navigationKey)}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--surface-lowest)] text-[var(--ink)] transition hover:bg-[var(--surface-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] lg:hidden"
            >
              <List aria-hidden="true" size={20} />
            </button>
            <div className="min-w-0 flex-1">
              <h1
                id="shell-title"
                tabIndex={-1}
                className="truncate text-lg font-semibold tracking-[-0.03em] text-[var(--ink)] focus:outline-none sm:text-2xl"
              >
                {title}
              </h1>
              {description ? (
                <p className="mt-0.5 hidden truncate text-sm text-[var(--muted)] sm:block">
                  {description}
                </p>
              ) : null}
            </div>
            {topBarActions ? (
              <div className="flex shrink-0 items-center gap-2">{topBarActions}</div>
            ) : null}
          </div>
        </header>

        {banners ? (
          <div className="mx-auto w-full max-w-[1400px] space-y-3 px-4 pt-4 sm:px-6 lg:px-8">
            {banners}
          </div>
        ) : null}

        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 focus:outline-none sm:px-6 lg:px-8 lg:py-8"
        >
          {children}
        </main>

        {footer}
      </div>
    </div>
  );
}
