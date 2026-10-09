import { Badge } from "@/components/app-ui";
import { formatBookingCampaign } from "@/components/booking/BookingCampaignBadge";
import type { BookingCampaign, Lang } from "@/lib/types";

/**
 * Where a client came from ("via instagram · fall-promo"), with the raw tags
 * on hover. The dashboard's twin of the public BookingCampaignBadge.
 */
export function CampaignBadge({ campaign, lang }: { campaign?: BookingCampaign; lang: Lang }) {
  const label = campaign ? formatBookingCampaign(campaign, lang) : null;

  if (!campaign || !label) {
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
      <Badge tone="info">{label}</Badge>
    </span>
  );
}
