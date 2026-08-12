"use client";

import { Info } from "@phosphor-icons/react";
import { useEffect, useId, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Detail that is worth having but not worth reading every time.
 *
 * Hover alone would put the text out of reach of keyboards and touch, so the
 * trigger is a real button: pointer hover opens it, focus opens it, tapping
 * toggles it, and Escape or a click elsewhere closes it. The text is always in
 * the accessibility tree via `aria-describedby`, so a screen reader hears it
 * whether or not the tooltip is visibly open.
 */
export function InfoTooltip({
  label,
  text,
  className,
  align = "start",
}: {
  /** Names the button for assistive tech, e.g. "What this means". */
  label: string;
  text: string;
  className?: string;
  align?: "start" | "end";
}) {
  const tooltipId = useId();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  return (
    <span
      ref={containerRef}
      className={cn("relative inline-flex align-middle", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={label}
        aria-describedby={tooltipId}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-black/5 hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
      >
        <Info size={18} weight="regular" aria-hidden="true" />
      </button>

      <span
        role="tooltip"
        id={tooltipId}
        // Kept in the tree at all times so `aria-describedby` always resolves;
        // only its visibility follows the pointer.
        className={cn(
          // The trigger usually rides a label, so the tooltip has to opt out of
          // whatever that label's type is doing — uppercase, tracking, weight.
          "pointer-events-none absolute top-full z-30 mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-2xl bg-[var(--ink)] px-3.5 py-2.5 text-left text-sm font-normal normal-case leading-5 tracking-normal text-white shadow-[0_18px_42px_rgba(15,23,42,0.28)] transition-opacity duration-150",
          align === "end" ? "right-0" : "left-0",
          open ? "opacity-100" : "opacity-0",
        )}
        hidden={!open}
      >
        {text}
      </span>
    </span>
  );
}
