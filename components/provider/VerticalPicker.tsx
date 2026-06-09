"use client";

import type { Vertical } from "@/config/verticals";
import type { VerticalId } from "@/lib/types";
import { cn } from "@/lib/utils";

const ICON_PATHS: Record<VerticalId, string> = {
  healthcare:
    "M12 21s-7-4.35-7-10a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 5.65-7 10-7 10z M10 11h1.5V8h1V11H14v1H12.5v3h-1v-3H10z",
  spaces:
    "M3 10.5 12 4l9 6.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z",
  professional:
    "M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2h4a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2zm2 0h2V5h-2z",
  events:
    "M7 4v2H5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-2V4h-2v2H9V4zM5 11h14v8H5z",
};

const ACCENT_GRADIENTS: Record<VerticalId, string> = {
  healthcare: "from-[#1a73e8] to-[#00bfa5]",
  spaces: "from-[#1f658f] to-[#1a73e8]",
  professional: "from-[#005bbf] to-[#1f658f]",
  events: "from-[#00bfa5] to-[#1a73e8]",
};

export function VerticalPicker({
  verticals,
  onSelect,
}: {
  verticals: Vertical[];
  onSelect: (id: VerticalId) => void;
}) {
  return (
    <div className="grid w-full gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {verticals.map((vertical) => {
        const iconPath = ICON_PATHS[vertical.id];
        const gradient = ACCENT_GRADIENTS[vertical.id] ?? "from-[#1a73e8] to-[#00bfa5]";
        return (
          <button
            key={vertical.id}
            type="button"
            onClick={() => onSelect(vertical.id)}
            className={cn(
              "group relative flex flex-col items-start gap-4 overflow-hidden rounded-[28px] p-6 text-left",
              "bg-[rgba(255,255,255,0.78)] ring-1 ring-[rgba(255,255,255,0.9)]",
              "shadow-[0_18px_48px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.9)]",
              "backdrop-blur-[18px] transition-all duration-300 ease-out",
              "hover:-translate-y-1 hover:bg-white hover:shadow-[0_28px_70px_rgba(15,23,42,0.14)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br opacity-25 blur-2xl transition-opacity duration-300 group-hover:opacity-60",
                gradient,
              )}
            />
            <span
              className={cn(
                "relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-[0_10px_24px_rgba(26,115,232,0.28)]",
                gradient,
              )}
            >
              {iconPath ? (
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-6 w-6"
                  aria-hidden
                >
                  <path d={iconPath} />
                </svg>
              ) : null}
            </span>
            <div className="relative flex flex-col gap-1">
              <span className="text-lg font-semibold tracking-[-0.01em] text-[var(--ink)]">
                {vertical.label}
              </span>
              <span className="text-sm font-medium text-[var(--accent)]">
                {vertical.tagline}
              </span>
              <span className="mt-1 text-sm leading-6 text-[var(--muted)]">
                {vertical.description}
              </span>
            </div>
            <span className="relative mt-auto flex items-center gap-1.5 pt-1 text-sm font-semibold text-[var(--ink)] transition-transform duration-300 group-hover:translate-x-1">
              Get started
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                <path
                  d="M5 12h14M13 6l6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
            </span>
          </button>
        );
      })}
    </div>
  );
}
