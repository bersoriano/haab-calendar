import { HaabBookingModule } from "@/components/haab-booking-module";
import { getPublicThemeStyle } from "@/lib/public-theme";
import type { CSSProperties } from "react";
import type { InjectedConfig, Lang } from "@/lib/types";

type PublicBookingPageShellProps = {
  injectedConfig?: Partial<InjectedConfig>;
  requestedPublicSlug: string;
  requestedServiceSlug?: string;
  manageBookingToken?: string;
  initialPublicLanguage?: Lang;
  providerTimeZone?: string;
};

export function PublicBookingPageShell({
  injectedConfig,
  requestedPublicSlug,
  requestedServiceSlug,
  manageBookingToken,
  initialPublicLanguage,
  providerTimeZone,
}: PublicBookingPageShellProps) {
  const theme = getPublicThemeStyle(injectedConfig?.provider?.publicTheme);

  return (
    <main
      className="relative isolate min-h-screen overflow-x-clip"
      // A theme is a set of custom-property overrides on this one element;
      // everything below styles itself from the same tokens either way, so
      // "default" is the page untouched.
      style={{ background: theme.base, ...theme.tokens } as CSSProperties}
    >
      {theme.layers.map((layer) => (
        <div key={layer} aria-hidden="true" className="absolute inset-0" style={{ background: layer }} />
      ))}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-48"
        style={{
          background: theme.dark
            ? "linear-gradient(180deg,rgba(255,255,255,0.06),rgba(8,11,22,0))"
            : "linear-gradient(180deg,rgba(255,255,255,0.42),rgba(248,249,250,0))",
        }}
      />
      <div className="relative mx-auto flex w-full max-w-[1680px] flex-1 px-4 pt-0 pb-2 sm:px-6 lg:px-10">
        <HaabBookingModule
          injectedConfig={injectedConfig}
          requestedPublicSlug={requestedPublicSlug}
          requestedServiceSlug={requestedServiceSlug}
          surfaceMode="public-only"
          manageBookingToken={manageBookingToken}
          initialPublicLanguage={initialPublicLanguage}
          providerTimeZone={providerTimeZone}
        />
      </div>
    </main>
  );
}
