import type { ProviderInfo } from "@/lib/types";

export const DEFAULT_BOOKING_FOOTER_TEXT = "This booking was brought to you by";
export const DEFAULT_BOOKING_FOOTER_URL = "https://haabcalendar.com";

export function isBookingFooterUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return value.length <= 2048 && ["https:", "http:"].includes(url.protocol) && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function normalizeBookingFooter(provider?: Pick<ProviderInfo, "publicFooterText" | "publicFooterUrl">) {
  const candidate = provider?.publicFooterUrl?.trim() ?? "";
  const url = isBookingFooterUrl(candidate) ? candidate : DEFAULT_BOOKING_FOOTER_URL;
  const text = provider?.publicFooterText?.trim().slice(0, 200) || DEFAULT_BOOKING_FOOTER_TEXT;
  const isDefault = text === DEFAULT_BOOKING_FOOTER_TEXT && new URL(url).href === new URL(DEFAULT_BOOKING_FOOTER_URL).href;
  return {
    text,
    url,
    label: new URL(url).hostname,
    developerCredit: isDefault ? "and developed by brilliant.dev" : undefined,
  };
}
