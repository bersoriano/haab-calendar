import { ToneBadge } from "@/components/ui";
import type { BookingCampaign, Lang } from "@/lib/types";

/**
 * "via instagram · fall-promo": where a client came from, in a form a provider
 * can match against the links they shared. Falls back to the referring site
 * when the link carried no campaign tags.
 */
export function formatBookingCampaign(campaign: BookingCampaign, lang: Lang): string | null {
  const tagged = [campaign.source, campaign.campaign ?? campaign.medium].filter(Boolean);
  const label = tagged.length > 0 ? tagged.join(" · ") : campaign.referrerHost;
  if (!label) {
    return null;
  }
  return `${lang === "es" ? "vía" : "via"} ${label}`;
}

export function BookingCampaignBadge({
  campaign,
  lang,
}: {
  campaign?: BookingCampaign;
  lang: Lang;
}) {
  const label = campaign ? formatBookingCampaign(campaign, lang) : null;
  if (!label || !campaign) {
    return null;
  }

  const detail = [
    campaign.source && `utm_source=${campaign.source}`,
    campaign.medium && `utm_medium=${campaign.medium}`,
    campaign.campaign && `utm_campaign=${campaign.campaign}`,
    campaign.referrerHost,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <span title={detail}>
      <ToneBadge tone="secondary">{label}</ToneBadge>
    </span>
  );
}
