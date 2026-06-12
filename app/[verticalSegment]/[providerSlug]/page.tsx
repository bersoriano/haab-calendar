import { permanentRedirect } from "next/navigation";
import { PublicBookingPageShell } from "@/components/public-booking-page-shell";
import {
  isPublicUrlBackendUnavailable,
  resolvePublicBookingUrl,
} from "@/lib/public-booking-resolver";
import { normalizeUrlSlugSegment } from "@/lib/public-url";

export const dynamic = "force-dynamic";

export default async function PublicProviderBookingPage({
  params,
}: {
  params: Promise<{ verticalSegment: string; providerSlug: string }>;
}) {
  const { verticalSegment, providerSlug } = await params;
  let resolution: Awaited<ReturnType<typeof resolvePublicBookingUrl>>;

  try {
    resolution = await resolvePublicBookingUrl({ verticalSegment, providerSlug });
  } catch (error) {
    if (!isPublicUrlBackendUnavailable(error)) {
      throw error;
    }

    return (
      <PublicBookingPageShell
        requestedPublicSlug={normalizeUrlSlugSegment(providerSlug)}
      />
    );
  }

  if (!resolution) {
    return (
      <PublicBookingPageShell
        requestedPublicSlug={normalizeUrlSlugSegment(providerSlug)}
      />
    );
  }

  if (resolution.status === "redirect") {
    permanentRedirect(resolution.location);
  }

  return (
    <PublicBookingPageShell
      injectedConfig={resolution.store}
      requestedPublicSlug={resolution.store.provider.publicSlug}
    />
  );
}
