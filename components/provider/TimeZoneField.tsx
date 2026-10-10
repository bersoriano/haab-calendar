"use client";

import { useEffect, useMemo, useState } from "react";

import { Alert, Button, Field, Select } from "@/components/app-ui";
import { bookingTranslations } from "@/components/booking/i18n/translations";
import {
  detectTimeZone,
  formatTimeInZone,
  formatTimeZoneChoice,
  getTimeZoneOptionGroups,
  isUnsetTimeZone,
} from "@/lib/timezone";
import type { Lang } from "@/lib/types";

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
    <div className="grid gap-3">
      <Field label={t.timeZone} description={t.timeZoneHint}>
        <Select disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)}>
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
        </Select>
      </Field>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={disabled || !detected}
          onClick={() => {
            onChange(detected);
            setDismissedPrompt(true);
          }}
        >
          {t.timeZoneDetect}
        </Button>
        {localTime ? (
          <span className="text-sm text-app-fg-muted">
            {t.timeZoneCurrentTime.replace("{time}", localTime)}
          </span>
        ) : null}
      </div>

      {showPrompt ? (
        <Alert
          tone="warning"
          role="status"
          title={t.timeZonePromptTitle.replace("{zone}", formatTimeZoneChoice(detected, lang, now))}
          actions={
            <>
              <Button
                size="sm"
                disabled={disabled}
                onClick={() => {
                  onChange(detected);
                  setDismissedPrompt(true);
                }}
              >
                {t.timeZonePromptAccept}
              </Button>
              <Button variant="plain" size="sm" onClick={() => setDismissedPrompt(true)}>
                {t.timeZonePromptDismiss}
              </Button>
            </>
          }
        >
          {t.timeZonePromptBody}
        </Alert>
      ) : null}
    </div>
  );
}
