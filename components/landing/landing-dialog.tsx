"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";

// Shared modal shell for the landing page: backdrop, Escape, scroll lock, and
// focus handling. No dependencies — the landing page stays cheap to load.
export function LandingDialog({
  open,
  onClose,
  labelledBy,
  closeLabel,
  className = "",
  children,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  closeLabel: string;
  className?: string;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    const focusTarget = panelRef.current?.querySelector<HTMLElement>(
      "[data-autofocus], button, a[href], input, select, textarea",
    );
    focusTarget?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      restoreFocusRef.current?.focus();
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-6">
      <button
        type="button"
        aria-label={closeLabel}
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-[rgba(15,23,42,0.44)] backdrop-blur-sm"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={cn(
          "haab-dialog-panel relative flex max-h-[92vh] w-full flex-col overflow-hidden border border-white/80 bg-[var(--surface-lowest)] shadow-[0_40px_100px_rgba(15,23,42,0.28)]",
          "rounded-t-[28px] sm:rounded-[28px]",
          className,
        )}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full border border-[var(--line)] bg-white/90 text-[var(--muted)] transition hover:text-[var(--ink)]"
        >
          <span aria-hidden="true">✕</span>
        </button>
        {children}
      </div>
    </div>
  );
}
