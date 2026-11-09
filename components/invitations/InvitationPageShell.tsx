import type { CSSProperties, ReactNode } from "react";

import { LanguageLinks } from "@/components/app-ui/LanguageLinks";
import { PublicBookingFooter } from "@/components/booking/PublicBookingFooter";
import { PublicBookingHeader } from "@/components/booking/PublicBookingHeader";
import { withPublicLanguage } from "@/lib/public-language";
import { getPublicThemeStyle } from "@/lib/public-theme";
import type { Lang, ProviderInfo, VerticalId } from "@/lib/types";
import { getVerticalCopy } from "@/lib/vertical-copy";

/**
 * The frame of an invitation-only page and of a household's invitation: the
 * page's theme, its header with the language links, and its footer. Server
 * rendered; the language comes from `?lang=` or the page's own.
 */
export function InvitationPageShell({
  provider,
  vertical,
  lang,
  path,
  timeZone,
  children,
}: {
  provider: ProviderInfo;
  vertical: VerticalId;
  lang: Lang;
  /** This page's path, for the language links. */
  path: string;
  timeZone?: string;
  children: ReactNode;
}) {
  const theme = getPublicThemeStyle(provider.publicTheme);
  const copy = getVerticalCopy(vertical, lang, provider.vocabulary);

  return (
    <div
      lang={lang}
      className="relative isolate flex min-h-screen flex-col overflow-x-clip"
      style={{ background: theme.base, colorScheme: theme.dark ? "dark" : "light", ...theme.tokens } as CSSProperties}
    >
      {theme.layers.map((layer) => (
        <div key={layer} aria-hidden="true" className="absolute inset-0" style={{ background: layer }} />
      ))}
      <main className="relative mx-auto flex w-full max-w-[1100px] flex-1 flex-col gap-6 px-4 pb-8 pt-4 sm:px-6 sm:pt-6 lg:px-10">
        <PublicBookingHeader
          variant="enhanced"
          businessName={provider.businessName || provider.fullName}
          logoImageUrl={provider.logoImageUrl}
          copy={copy}
          providerTimeZone={timeZone || provider.timezone}
          isAdvancing={false}
          lang={lang}
          languageChooser={
            <LanguageLinks lang={lang} hrefFor={(option) => withPublicLanguage(path, option)} />
          }
        />
        {provider.headerImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote Blob URL
          <img
            src={provider.headerImageUrl}
            alt=""
            className="aspect-[21/9] max-h-[360px] w-full rounded-[28px] object-cover"
          />
        ) : null}
        {children}
      </main>
      <PublicBookingFooter text={provider.publicFooterText} url={provider.publicFooterUrl} />
    </div>
  );
}
