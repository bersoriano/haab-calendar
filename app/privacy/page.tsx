import type { Metadata } from "next";

import { LegalDocumentPage } from "@/components/legal/legal-document-page";
import { getServerLanguage } from "@/lib/language/server";
import { legalContent } from "@/lib/legal/content";
import { buildPublicPageMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = {
  title: "Privacy Notice",
  ...buildPublicPageMetadata("/privacy"),
};

export default async function PrivacyPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const { lang } = await searchParams;
  const language = await getServerLanguage(lang);

  return (
    <LegalDocumentPage
      document={legalContent[language].privacy}
      lang={language}
      sibling={{ href: "/terms", id: "terms" }}
    />
  );
}
