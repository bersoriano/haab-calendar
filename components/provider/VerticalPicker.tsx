"use client";

import {
  ArrowRight,
  Briefcase,
  BuildingOffice,
  CalendarStar,
  ForkKnife,
  Stethoscope,
  type Icon,
} from "@phosphor-icons/react";

import type { Vertical } from "@/config/verticals";
import type { VerticalId } from "@/lib/types";

const ICONS: Record<VerticalId, Icon> = {
  healthcare: Stethoscope,
  spaces: BuildingOffice,
  professional: Briefcase,
  events: CalendarStar,
  restaurant: ForkKnife,
};

/** One card per business type; choosing one starts that type's setup. */
export function VerticalPicker({
  verticals,
  onSelect,
  actionLabel,
}: {
  verticals: Vertical[];
  onSelect: (id: VerticalId) => void;
  actionLabel: string;
}) {
  return (
    <div className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {verticals.map((vertical) => {
        const Icon = ICONS[vertical.id];

        return (
          <button
            key={vertical.id}
            type="button"
            onClick={() => onSelect(vertical.id)}
            className="group flex flex-col items-start gap-4 rounded-xl bg-app-surface p-6 text-left shadow-xs ring-1 ring-app-border transition hover:shadow-md hover:ring-app-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-accent"
          >
            <span className="grid size-12 place-items-center rounded-lg bg-app-accent-soft text-app-accent">
              {Icon ? <Icon aria-hidden="true" size={24} weight="duotone" /> : null}
            </span>
            <span className="flex flex-col gap-1">
              <span className="text-base font-semibold text-app-fg">{vertical.label}</span>
              <span className="text-sm font-medium text-app-accent-on-soft">{vertical.tagline}</span>
              <span className="mt-1 text-sm text-app-fg-muted">{vertical.description}</span>
            </span>
            <span className="mt-auto flex items-center gap-1.5 pt-1 text-sm font-semibold text-app-accent transition-transform group-hover:translate-x-0.5">
              {actionLabel}
              <ArrowRight aria-hidden="true" size={16} />
            </span>
          </button>
        );
      })}
    </div>
  );
}
