"use client";

import { useEffect, useId, useRef } from "react";

import { bookingTranslations, fillTemplate } from "@/components/booking/i18n/translations";
import { buttonClasses } from "@/components/ui/buttonClasses";
import type { Lang } from "@/lib/types";

export function ServiceSwitchDialog({
  serviceName,
  lang,
  onConfirm,
  onCancel,
}: {
  serviceName: string;
  lang: Lang;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const copy = bookingTranslations[lang].publicFlow;
  const id = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    cancelRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
      } else if (event.key === "Tab") {
        if (event.shiftKey && document.activeElement === cancelRef.current) {
          event.preventDefault();
          confirmRef.current?.focus();
        } else if (!event.shiftKey && document.activeElement === confirmRef.current) {
          event.preventDefault();
          cancelRef.current?.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-body`}
        className="w-full max-w-md rounded-[30px] bg-[var(--surface-lowest)] p-6 shadow-[0_30px_90px_rgba(15,23,42,0.3)] ring-1 ring-[var(--line)] sm:p-7"
      >
        <h2 id={`${id}-title`} className="text-xl font-semibold text-[var(--ink)]">
          {fillTemplate(copy.serviceSwitchDialogTitle, { service: serviceName })}
        </h2>
        <p id={`${id}-body`} className="mt-3 text-sm leading-6 text-[var(--muted)]">
          {copy.serviceSwitchDialogBody}
        </p>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className={buttonClasses("ghost")}
          >
            {copy.serviceSwitchDialogCancel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className={buttonClasses("primary")}
          >
            {copy.serviceSwitchDialogAccept}
          </button>
        </div>
      </div>
    </div>
  );
}
