import { HaabBookingModule } from "@/components/haab-booking-module";

export default async function ManageBookingPage({
  params,
}: {
  params: Promise<{ slug: string; token: string }>;
}) {
  const { slug, token } = await params;

  return (
    <main className="relative isolate min-h-screen overflow-x-clip bg-[#eef2f5]">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[url('/bkg2.jpg')] bg-cover bg-center bg-no-repeat"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(160deg,rgba(248,249,250,0.28),rgba(248,249,250,0.54)_34%,rgba(243,244,245,0.74)_100%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-48 bg-[linear-gradient(180deg,rgba(255,255,255,0.42),rgba(248,249,250,0))]"
      />
      <div className="relative mx-auto flex w-full max-w-[1680px] flex-1 px-4 py-6 sm:px-6 lg:px-10">
        <HaabBookingModule
          requestedPublicSlug={slug}
          surfaceMode="public-only"
          manageBookingToken={token}
        />
      </div>
    </main>
  );
}
