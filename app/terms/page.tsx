import type { Metadata } from "next";

import { LegalDocumentPage } from "@/components/legal/legal-document-page";
import { getServerLanguage } from "@/lib/language/server";
import { legalContent } from "@/lib/legal/content";
import { buildPublicPageMetadata } from "@/lib/site-metadata";

export const metadata: Metadata = {
  title: "Terms of Service",
  ...buildPublicPageMetadata("/terms"),
};

export default async function TermsPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const { lang } = await searchParams;
  const language = await getServerLanguage(lang);

  return (
    <LegalDocumentPage
      document={legalContent[language].terms}
      lang={language}
      sibling={{ href: "/privacy", id: "privacy" }}
    />
  );
}
