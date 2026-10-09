"use client";

import { useState } from "react";

import { bookingTranslations, fillTemplate } from "@/components/booking/i18n/translations";
import { adminFieldClass, adminInsetClass } from "@/components/provider/adminGlass";
import type { Lang } from "@/lib/types";
import { cn } from "@/lib/utils";

/** What a provider gets when they first switch the limit on. */
export const DEFAULT_DAILY_BOOKING_LIMIT = 5;
export const MAX_DAILY_BOOKING_LIMIT = 500;

/** A typed value as a limit, or null while it is not a usable one yet. */
export function parseDailyBookingLimit(text: string): number | null {
  if (!/^\d+$/.test(text.trim())) {
    return null;
  }
  const value = Number(text);
  return value >= 1 && value <= MAX_DAILY_BOOKING_LIMIT ? value : null;
}

/**
 * Off by default. While on, the number is kept as typed so a half-edited value
 * ("" on the way from 5 to 8) does not switch the limit off; only a usable
 * number reaches the provider settings.
 */
export function DailyBookingLimitField({
  value,
  onChange,
  disabled = false,
  lang = "en",
}: {
  value?: number;
  onChange: (value: number | undefined) => void;
  disabled?: boolean;
  lang?: Lang;
}) {
  const t = bookingTranslations[lang].admin;
  const enabled = typeof value === "number";
  const [draft, setDraft] = useState(String(value ?? DEFAULT_DAILY_BOOKING_LIMIT));
  const draftValid = parseDailyBookingLimit(draft) !== null;

  return (
    <div className={cn(adminInsetClass, "mt-6 p-5")}>
      <h4 className="text-base font-semibold text-[var(--ink)]">{t.dailyLimitTitle}</h4>
      <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{t.dailyLimitBody}</p>

      <label className="mt-4 flex items-center gap-3 text-sm font-medium text-[var(--ink)]">
        <input
          type="checkbox"
          className="size-5 accent-[var(--primary)]"
          checked={enabled}
          disabled={disabled}
          onChange={(event) => {
            if (!event.target.checked) {
              onChange(undefined);
              return;
            }
            const next = parseDailyBookingLimit(draft) ?? DEFAULT_DAILY_BOOKING_LIMIT;
            setDraft(String(next));
            onChange(next);
          }}
        />
        {t.dailyLimitToggle}
      </label>

      {enabled ? (
        <div className="mt-4">
          <label className="block text-sm font-medium text-[var(--ink)]">
            {t.dailyLimitLabel}
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_DAILY_BOOKING_LIMIT}
              step={1}
              className={cn(adminFieldClass, "mt-2 block w-32")}
              value={draft}
              disabled={disabled}
              aria-invalid={!draftValid}
              onChange={(event) => {
                setDraft(event.target.value);
                const next = parseDailyBookingLimit(event.target.value);
                if (next !== null) {
                  onChange(next);
                }
              }}
            />
          </label>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            {fillTemplate(t.dailyLimitHint, { count: String(value) })}
          </p>
        </div>
      ) : null}
    </div>
  );
}
