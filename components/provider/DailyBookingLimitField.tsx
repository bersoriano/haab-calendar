"use client";

import { useState } from "react";

import { bookingTranslations, fillTemplate } from "@/components/booking/i18n/translations";
import { Field, Input, Switch } from "@/components/app-ui";
import type { Lang } from "@/lib/types";

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
    <div className="mt-6 grid gap-4 border-t border-app-border pt-6">
      <div>
        <h3 className="text-sm font-semibold text-app-fg">{t.dailyLimitTitle}</h3>
        <p className="mt-1 text-sm text-app-fg-muted">{t.dailyLimitBody}</p>
      </div>
      <Field label={t.dailyLimitToggle} inline>
        <Switch
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
      </Field>
      {enabled ? (
        <Field label={t.dailyLimitLabel} description={fillTemplate(t.dailyLimitHint, { count: String(value) })}>
          <Input
            type="number"
            name="maxBookingsPerDay"
            inputMode="numeric"
            min={1}
            max={MAX_DAILY_BOOKING_LIMIT}
            step={1}
            className="w-32"
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
        </Field>
      ) : null}
    </div>
  );
}
