import "server-only";

import { createHash } from "node:crypto";

import { getSupabaseServiceKey } from "@/lib/supabase/admin";

export type DeviceClass = "mobile" | "tablet" | "desktop";

/**
 * Crawlers, link unfurlers and uptime checks. A link shared in WhatsApp or
 * Slack is fetched by a preview bot before any person opens it, and counting
 * that fetch would credit the campaign with a visit nobody made.
 */
const BOT_PATTERN =
  /bot|crawl|spider|slurp|preview|facebookexternalhit|embedly|whatsapp|telegram|discord|headless|lighthouse|pingdom|uptime|monitor|curl|wget|python-requests|axios|node-fetch/i;

export function isLikelyBot(userAgent: string | null): boolean {
  return !userAgent || BOT_PATTERN.test(userAgent);
}

export function classifyDevice(userAgent: string | null): DeviceClass {
  const ua = userAgent ?? "";
  if (/ipad|tablet|kindle|silk|(android(?!.*mobile))/i.test(ua)) {
    return "tablet";
  }
  if (/mobi|iphone|ipod|android|windows phone/i.test(ua)) {
    return "mobile";
  }
  return "desktop";
}

/** First hop in `x-forwarded-for` is the client; Vercel sets it. */
export function readClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "";
  }
  return headers.get("x-real-ip")?.trim() ?? "";
}

/**
 * A dedicated secret when one is configured. Otherwise the service role key,
 * which is already a server-only secret every deployment has, so analytics
 * works without one more variable to forget. Rotating either one only resets
 * today's visitor counts.
 */
export function getAnalyticsSecret(): string | undefined {
  return process.env.ANALYTICS_HASH_SECRET || getSupabaseServiceKey() || undefined;
}

/**
 * A daily, per-provider pseudonym for one network (the IP alone). Shared by
 * everyone behind the same router or carrier NAT, so it only ever caps writes;
 * it never counts people. Prefixed so it can never equal a visitor hash.
 */
export function computeNetworkHash(input: {
  secret: string;
  providerId: string;
  ip: string;
  now: Date;
}): string {
  const day = input.now.toISOString().slice(0, 10);
  return createHash("sha256")
    .update(["network", input.secret, day, input.providerId, input.ip].join("\n"))
    .digest("hex");
}

/**
 * A daily, per-provider pseudonym for one visitor.
 *
 * The UTC day is part of the input, so the value changes at midnight and two
 * days of visits cannot be linked. The provider is part of it too, so the same
 * person on two booking pages looks like two unrelated visitors. The secret
 * keeps anyone holding the table from brute-forcing the IP space back out.
 */
export function computeVisitorHash(input: {
  secret: string;
  providerId: string;
  ip: string;
  userAgent: string;
  now: Date;
}): string {
  const day = input.now.toISOString().slice(0, 10);
  return createHash("sha256")
    .update([input.secret, day, input.providerId, input.ip, input.userAgent].join("\n"))
    .digest("hex");
}
