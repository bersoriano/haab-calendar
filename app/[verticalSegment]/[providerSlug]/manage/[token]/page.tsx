import { permanentRedirect } from "next/navigation";
import { PublicBookingPageShell } from "@/components/public-booking-page-shell";
import {
  isPublicUrlBackendUnavailable,
  resolvePublicBookingUrl,
} from "@/lib/public-booking-resolver";
import { normalizeUrlSlugSegment } from "@/lib/public-url";

export const dynamic = "force-dynamic";

export default async function PublicManageBookingPage({
  params,
}: {
  params: Promise<{
    verticalSegment: string;
    providerSlug: string;
    token: string;
  }>;
}) {
  const { verticalSegment, providerSlug, token } = await params;
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
        manageBookingToken={token}
      />
    );
  }

  if (!resolution) {
    return (
      <PublicBookingPageShell
        requestedPublicSlug={normalizeUrlSlugSegment(providerSlug)}
        manageBookingToken={token}
      />
    );
  }

  if (resolution.status === "redirect") {
    permanentRedirect(`${resolution.location}/manage/${encodeURIComponent(token)}`);
  }

  return (
    <PublicBookingPageShell
      injectedConfig={resolution.store}
      requestedPublicSlug={resolution.store.provider.publicSlug}
      manageBookingToken={token}
    />
  );
}
