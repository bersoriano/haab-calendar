import Link from "next/link";

import { focusRing } from "@/components/app-ui";
import { AuthPageFrame } from "@/components/auth/AuthPageFrame";
import { LoginHeader } from "@/components/auth/LoginHeader";
import { PasswordResetRequestForm } from "@/components/auth/PasswordResetRequestForm";
import { translations } from "@/components/landing/translations";
import { getServerLanguage } from "@/lib/language/server";
import { PRIVATE_PAGE_METADATA } from "@/lib/site-metadata";
import { cn } from "@/lib/utils";

// Nothing to index: this page is a form, and its only useful state is reached
// through a mailed link.
export const metadata = PRIVATE_PAGE_METADATA;

export default async function PasswordResetRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const { lang } = await searchParams;
  const language = await getServerLanguage(lang);
  const t = translations[language].auth;

  return (
    <AuthPageFrame
      lang={language}
      header={<LoginHeader lang={language} />}
      title={t.resetTitle}
      body={t.resetBody}
      footer={
        <Link
          className={cn("rounded-md font-semibold text-app-accent hover:text-app-accent-hover", focusRing)}
          href={`/login?lang=${language}`}
        >
          {t.resetBackToSignIn}
        </Link>
      }
    >
      <PasswordResetRequestForm lang={language} />
    </AuthPageFrame>
  );
}
