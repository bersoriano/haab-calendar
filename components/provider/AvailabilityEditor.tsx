"use client";

import { Plus, Trash } from "@phosphor-icons/react";

import { Button, Field, IconButton, Input, Switch } from "@/components/app-ui";
import { bookingTranslations } from "@/components/booking/i18n/translations";
import { dashboardCopy } from "@/components/provider/dashboard-copy";
import { WEEKDAY_KEYS } from "@/lib/constants";
import type { AvailabilityBlock, DayAvailability, Lang, WeekdayKey } from "@/lib/types";

const DEFAULT_BLOCK = { startTime: "14:00", endTime: "16:00" };

/**
 * Opening hours per weekday, with optional breaks. A closed day collapses to
 * one muted line; its hours are kept and come back when it is switched on.
 */
export function AvailabilityEditor({
  availability,
  onChange,
  disabled = false,
  lang = "en",
}: {
  availability: Record<WeekdayKey, DayAvailability>;
  onChange: (day: WeekdayKey, patch: Partial<DayAvailability>) => void;
  disabled?: boolean;
  lang?: Lang;
}) {
  const t = bookingTranslations[lang];
  const shell = dashboardCopy[lang];

  function addBlockedWindow(day: WeekdayKey) {
    onChange(day, {
      blockedWindows: [...(availability[day].blockedWindows ?? []), DEFAULT_BLOCK],
    });
  }

  function updateBlockedWindow(day: WeekdayKey, index: number, patch: Partial<AvailabilityBlock>) {
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
    <ul role="list" className="divide-y divide-app-border">
      {WEEKDAY_KEYS.map((day) => {
        const blockedWindows = availability[day].blockedWindows ?? [];
        const open = availability[day].enabled;
        const dayDisabled = disabled || !open;

        return (
          <li key={day} className="grid gap-4 py-4 first:pt-0 last:pb-0">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-[10rem_minmax(0,1fr)_minmax(0,1fr)] sm:items-end">
              <Field label={t.admin.weekdays[day]} inline className="col-span-2 sm:col-span-1 sm:pb-2">
                <Switch
                  disabled={disabled}
                  checked={open}
                  onChange={(event) => onChange(day, { enabled: event.target.checked })}
                />
              </Field>
              {open ? (
                <>
                  <Field label={t.admin.availabilityStart}>
                    <Input
                      disabled={dayDisabled}
                      value={availability[day].startTime}
                      onChange={(event) => onChange(day, { startTime: event.target.value })}
                      type="time"
                    />
                  </Field>
                  <Field label={t.admin.availabilityEnd}>
                    <Input
                      disabled={dayDisabled}
                      value={availability[day].endTime}
                      onChange={(event) => onChange(day, { endTime: event.target.value })}
                      type="time"
                    />
                  </Field>
                </>
              ) : (
                <p className="col-span-2 text-sm text-app-fg-muted sm:pb-2">{shell.closedDay}</p>
              )}
            </div>

            {open ? (
              <div className="grid gap-3 rounded-lg bg-app-subtle p-3 sm:p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-app-fg">{t.admin.blockedTimes}</p>
                    <p className="mt-0.5 text-sm text-app-fg-muted">{t.admin.blockedTimesHint}</p>
                  </div>
                  <Button
                    variant="soft"
                    size="sm"
                    disabled={dayDisabled}
                    leadingIcon={<Plus aria-hidden="true" size={16} />}
                    onClick={() => addBlockedWindow(day)}
                  >
                    {t.admin.addBlock}
                  </Button>
                </div>

                {blockedWindows.map((block, index) => (
                  <div
                    key={`${day}-blocked-window-${index}`}
                    className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-3"
                  >
                    <Field label={t.admin.blockedFrom}>
                      <Input
                        disabled={dayDisabled}
                        value={block.startTime}
                        onChange={(event) => updateBlockedWindow(day, index, { startTime: event.target.value })}
                        type="time"
                      />
                    </Field>
                    <Field label={t.admin.blockedTo}>
                      <Input
                        disabled={dayDisabled}
                        value={block.endTime}
                        onChange={(event) => updateBlockedWindow(day, index, { endTime: event.target.value })}
                        type="time"
                      />
                    </Field>
                    <IconButton
                      label={t.admin.removeBlock}
                      icon={<Trash aria-hidden="true" size={18} />}
                      variant="danger-plain"
                      disabled={dayDisabled}
                      onClick={() => removeBlockedWindow(day, index)}
                    />
                  </div>
                ))}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
