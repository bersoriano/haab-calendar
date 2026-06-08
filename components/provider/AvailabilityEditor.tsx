"use client";

import type { DayAvailability, WeekdayKey } from "@/lib/types";
import { WEEKDAY_KEYS, WEEKDAY_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { adminFieldClass, adminInsetClass } from "@/components/provider/adminGlass";

export function AvailabilityEditor({
  availability,
  onChange,
  disabled = false,
}: {
  availability: Record<WeekdayKey, DayAvailability>;
  onChange: (day: WeekdayKey, patch: Partial<DayAvailability>) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-3">
      {WEEKDAY_KEYS.map((day) => (
        <div
          key={day}
          className={cn(adminInsetClass, "grid gap-3 p-4 sm:grid-cols-[1.1fr_0.8fr_0.8fr]")}
        >
          <label className="flex items-center gap-3 text-sm font-semibold text-[var(--ink)]">
            <input
              disabled={disabled}
              checked={availability[day].enabled}
              onChange={(event) => onChange(day, { enabled: event.target.checked })}
              type="checkbox"
              className="h-5 w-5 rounded border-[var(--line)] text-[var(--accent)] disabled:opacity-45"
            />
            {WEEKDAY_LABELS[day]}
          </label>
          <label className="grid gap-2 text-sm font-medium text-[var(--muted)]">
            Start
            <input
              disabled={disabled || !availability[day].enabled}
              value={availability[day].startTime}
              onChange={(event) => onChange(day, { startTime: event.target.value })}
              type="time"
              className={cn("min-h-12", adminFieldClass, "disabled:opacity-45")}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-[var(--muted)]">
            End
            <input
              disabled={disabled || !availability[day].enabled}
              value={availability[day].endTime}
              onChange={(event) => onChange(day, { endTime: event.target.value })}
              type="time"
              className={cn("min-h-12", adminFieldClass, "disabled:opacity-45")}
            />
          </label>
        </div>
      ))}
    </div>
  );
}
