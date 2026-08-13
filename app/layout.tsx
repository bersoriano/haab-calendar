import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter } from "next/font/google";
import "./globals.css";
import { getServerLanguage } from "@/lib/language/server";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Haab Calendar",
  description:
    "Reusable appointment and booking management module for timed appointments and full-day reservations.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Server-resolved, so the language is known before the first byte and there
  // is no wrong-language flash on the surfaces this layout can actually see:
  // the visitor's own cookie, then Accept-Language, then English.
  //
  // KNOWN LIMITATION — public booking pages. `/[verticalSegment]/[providerSlug]`
  // and `/public/[slug]` render in the *owner's* saved `provider.language`,
  // which is per-business data this layout cannot read: it has no slug, no
  // params, and no database access, and the proxy deliberately keeps that
  // language out of the shared cookie (lib/language/public-routes.ts) so one
  // business's language cannot follow a client to the rest of the site. So a
  // Spanish-configured page viewed by an English browser with no `?lang` is
  // served inside <html lang="en">, and haab-booking-module corrects
  // document.documentElement.lang after hydration. Assistive tech and search
  // engines that read the served markup see the wrong claim until then.
  //
  // Fixing it properly means resolving the provider before the layout renders
  // (a route-group layout under the public segments, or a per-page <html>),
  // which is a larger change than this branch. Every cheaper workaround —
  // writing provider.language into the cookie, or letting the proxy honour
  // `?lang` there — reopens the cross-business leak. Tracked in
  // docs/manual-tests/language-consistency.md, row 21.
  const lang = await getServerLanguage();

  return (
    <html
      lang={lang}
      className={`${inter.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
