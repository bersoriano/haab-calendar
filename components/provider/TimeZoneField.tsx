"use client";

import { useEffect, useMemo, useState } from "react";

import { adminFieldClass } from "@/components/provider/adminGlass";
import { bookingTranslations } from "@/components/booking/i18n/translations";
import {
  detectTimeZone,
  formatTimeInZone,
  formatTimeZoneChoice,
  getTimeZoneOptionGroups,
  isUnsetTimeZone,
} from "@/lib/timezone";
import type { Lang } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Choosing a time zone is the one setting a provider is likely to get wrong
 * without noticing, and getting it wrong quietly moves every slot on their
 * public page. So the field never asks anyone to reason about offsets: it
 * offers to read the zone off their own device, names places rather than
 * GMT numbers, and prints the current local time as a check anyone can make.
 */
export function TimeZoneField({
  value,
  onChange,
  disabled = false,
  lang = "en",
}: {
  value: string;
  onChange: (zone: string) => void;
  disabled?: boolean;
  lang?: Lang;
}) {
  const t = bookingTranslations[lang].providerForm;
  const [detected, setDetected] = useState("");
  const [dismissedPrompt, setDismissedPrompt] = useState(false);

  // The browser's zone is only knowable on the client; reading it during
  // render would differ between server and client markup.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the device's zone is a browser-only value; reading it during render would mismatch the server's markup
    setDetected(detectTimeZone());
  }, []);

  // Re-rendered once a minute so the reassurance line stays honest, and so the
  // offsets in the list survive a daylight-saving change mid-session.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const groups = useMemo(
    () => getTimeZoneOptionGroups(lang, value, now),
    [lang, value, now],
  );

  const localTime = value ? formatTimeInZone(value, lang, now) : "";
  // Only worth prompting when we know something the provider's record does not.
  const showPrompt =
    !dismissedPrompt &&
    isUnsetTimeZone(value) &&
    Boolean(detected) &&
    !isUnsetTimeZone(detected);

  return (
    <div className="grid gap-2">
      <label className="grid gap-2 text-sm font-medium text-[var(--ink)]">
        {t.timeZone}
        <select
          disabled={disabled}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={cn("min-h-12", adminFieldClass, "disabled:opacity-45")}
        >
          <option value="">{t.timeZoneUnset}</option>
          {groups.map((group) => (
            <optgroup key={group.region} label={group.label}>
              {group.options.map((option) => (
                <option key={option.zone} value={option.zone}>
                  {option.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <button
          type="button"
          disabled={disabled || !detected}
          onClick={() => {
            onChange(detected);
            setDismissedPrompt(true);
          }}
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface-lowest)] px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--surface-highest)] disabled:cursor-not-allowed disabled:opacity-45"
        >
          {t.timeZoneDetect}
        </button>
        {localTime ? (
          <span className="text-xs leading-5 text-[var(--muted)]">
            {t.timeZoneCurrentTime.replace("{time}", localTime)}
          </span>
        ) : null}
      </div>

      <span className="text-xs leading-5 text-[var(--muted)]">{t.timeZoneHint}</span>

      {showPrompt ? (
        <div
          role="status"
          className="mt-1 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          <p className="font-medium">
            {t.timeZonePromptTitle.replace(
              "{zone}",
              formatTimeZoneChoice(detected, lang, now),
            )}
          </p>
          <p className="mt-1 leading-5">{t.timeZonePromptBody}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                onChange(detected);
                setDismissedPrompt(true);
              }}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-45"
            >
              {t.timeZonePromptAccept}
            </button>
            <button
              type="button"
              onClick={() => setDismissedPrompt(true)}
              className="text-sm font-semibold text-amber-900 hover:underline"
            >
              {t.timeZonePromptDismiss}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
