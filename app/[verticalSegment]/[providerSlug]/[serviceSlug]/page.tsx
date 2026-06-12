import { permanentRedirect } from "next/navigation";
import { PublicBookingPageShell } from "@/components/public-booking-page-shell";
import {
  isPublicUrlBackendUnavailable,
  resolvePublicBookingUrl,
} from "@/lib/public-booking-resolver";
import { normalizeUrlSlugSegment } from "@/lib/public-url";

export const dynamic = "force-dynamic";

export default async function PublicServiceBookingPage({
  params,
}: {
  params: Promise<{
    verticalSegment: string;
    providerSlug: string;
    serviceSlug: string;
  }>;
}) {
  const { verticalSegment, providerSlug, serviceSlug } = await params;
  let resolution: Awaited<ReturnType<typeof resolvePublicBookingUrl>>;

  try {
    resolution = await resolvePublicBookingUrl({
      verticalSegment,
      providerSlug,
      serviceSlug,
    });
  } catch (error) {
    if (!isPublicUrlBackendUnavailable(error)) {
      throw error;
    }

    return (
      <PublicBookingPageShell
        requestedPublicSlug={normalizeUrlSlugSegment(providerSlug)}
        requestedServiceSlug={normalizeUrlSlugSegment(serviceSlug)}
      />
    );
  }

  if (!resolution) {
    return (
      <PublicBookingPageShell
        requestedPublicSlug={normalizeUrlSlugSegment(providerSlug)}
        requestedServiceSlug={normalizeUrlSlugSegment(serviceSlug)}
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
      requestedServiceSlug={resolution.meta.selectedServiceSlug}
    />
  );
}
