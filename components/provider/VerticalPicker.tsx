"use client";

import type { Vertical } from "@/config/verticals";
import type { VerticalId } from "@/lib/types";
import { cn } from "@/lib/utils";
import { adminInsetClass } from "@/components/provider/adminGlass";

export function VerticalPicker({
  verticals,
  onSelect,
}: {
  verticals: Vertical[];
  onSelect: (id: VerticalId) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {verticals.map((vertical) => (
        <button
          key={vertical.id}
          type="button"
          onClick={() => onSelect(vertical.id)}
          className={cn(
            adminInsetClass,
            "flex flex-col gap-2 p-6 text-left transition hover:shadow-[0_18px_48px_rgba(15,23,42,0.10)]",
          )}
        >
          <span className="text-lg font-semibold text-[var(--ink)]">{vertical.label}</span>
          <span className="text-sm font-medium text-[var(--accent)]">{vertical.tagline}</span>
          <span className="mt-1 text-sm leading-6 text-[var(--muted)]">{vertical.description}</span>
        </button>
      ))}
    </div>
  );
}
