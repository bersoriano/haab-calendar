"use client";

import type { AvailabilityBlock, DayAvailability, WeekdayKey } from "@/lib/types";
import { WEEKDAY_KEYS, WEEKDAY_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { adminFieldClass, adminInsetClass } from "@/components/provider/adminGlass";

const DEFAULT_BLOCK = { startTime: "14:00", endTime: "16:00" };

export function AvailabilityEditor({
  availability,
  onChange,
  disabled = false,
}: {
  availability: Record<WeekdayKey, DayAvailability>;
  onChange: (day: WeekdayKey, patch: Partial<DayAvailability>) => void;
  disabled?: boolean;
}) {
  function addBlockedWindow(day: WeekdayKey) {
    onChange(day, {
      blockedWindows: [...(availability[day].blockedWindows ?? []), DEFAULT_BLOCK],
    });
  }

  function updateBlockedWindow(
    day: WeekdayKey,
    index: number,
    patch: Partial<AvailabilityBlock>,
  ) {
    const next = [...(availability[day].blockedWindows ?? [])];
    next[index] = { ...next[index], ...patch };
    onChange(day, { blockedWindows: next });
  }

  function removeBlockedWindow(day: WeekdayKey, index: number) {
    onChange(day, {
      blockedWindows: (availability[day].blockedWindows ?? []).filter(
        (_block, blockIndex) => blockIndex !== index,
      ),
    });
  }

  return (
    <div className="grid gap-3">
      {WEEKDAY_KEYS.map((day) => {
        const blockedWindows = availability[day].blockedWindows ?? [];
        const dayDisabled = disabled || !availability[day].enabled;

        return (
          <div
            key={day}
            className={cn(adminInsetClass, "grid gap-4 p-4")}
          >
            <div className="grid gap-3 sm:grid-cols-[1.1fr_0.8fr_0.8fr]">
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
                  disabled={dayDisabled}
                  value={availability[day].startTime}
                  onChange={(event) => onChange(day, { startTime: event.target.value })}
                  type="time"
                  className={cn("min-h-12", adminFieldClass, "disabled:opacity-45")}
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-[var(--muted)]">
                End
                <input
                  disabled={dayDisabled}
                  value={availability[day].endTime}
                  onChange={(event) => onChange(day, { endTime: event.target.value })}
                  type="time"
                  className={cn("min-h-12", adminFieldClass, "disabled:opacity-45")}
                />
              </label>
            </div>

            <div className="border-t border-[var(--line)] pt-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                    Blocked times
                  </p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Hide breaks or unavailable windows from booking.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={dayDisabled}
                  onClick={() => addBlockedWindow(day)}
                  className="inline-flex min-h-10 items-center justify-center rounded-xl bg-white px-3 text-sm font-semibold text-[var(--ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_14px_26px_rgba(25,28,29,0.05)] transition-colors hover:text-[var(--primary-container)] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Add block
                </button>
              </div>

              {blockedWindows.length > 0 ? (
                <div className="mt-4 grid gap-3">
                  {blockedWindows.map((block, index) => (
                    <div
                      key={`${day}-blocked-window-${index}`}
                      className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
                    >
                      <label className="grid gap-2 text-sm font-medium text-[var(--muted)]">
                        From
                        <input
                          disabled={dayDisabled}
                          value={block.startTime}
                          onChange={(event) =>
                            updateBlockedWindow(day, index, { startTime: event.target.value })
                          }
                          type="time"
                          className={cn("min-h-12", adminFieldClass, "disabled:opacity-45")}
                        />
                      </label>
                      <label className="grid gap-2 text-sm font-medium text-[var(--muted)]">
                        To
                        <input
                          disabled={dayDisabled}
                          value={block.endTime}
                          onChange={(event) =>
                            updateBlockedWindow(day, index, { endTime: event.target.value })
                          }
                          type="time"
                          className={cn("min-h-12", adminFieldClass, "disabled:opacity-45")}
                        />
                      </label>
                      <button
                        type="button"
                        disabled={dayDisabled}
                        onClick={() => removeBlockedWindow(day, index)}
                        className="inline-flex min-h-12 items-center justify-center self-end rounded-xl bg-transparent px-3 text-sm font-semibold text-[#be123c] transition-colors hover:bg-[#fff1f2] disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
