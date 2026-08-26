import Link from "next/link";

import { LoginHeader } from "@/components/auth/LoginHeader";
import { PasswordResetRequestForm } from "@/components/auth/PasswordResetRequestForm";
import { translations } from "@/components/landing/translations";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { getServerLanguage } from "@/lib/language/server";
import { PRIVATE_PAGE_METADATA } from "@/lib/site-metadata";

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
    <div lang={language} className="min-h-screen">
      <LoginHeader lang={language} />
      <main className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-[560px] items-center px-4 py-8 sm:px-6">
        <section className="rounded-[28px] bg-[rgba(248,249,250,0.94)] p-6 shadow-[0_28px_64px_rgba(25,28,29,0.08)] ring-1 ring-[rgba(255,255,255,0.68)] sm:p-8">
          <div className="flex justify-end">
            <LanguageSwitcher lang={language} hrefFor={(option) => `?lang=${option}`} />
          </div>
          <h1 className="mt-4 text-2xl font-semibold text-[var(--ink)]">{t.resetTitle}</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{t.resetBody}</p>
          <PasswordResetRequestForm lang={language} />
          <Link
            className="mt-6 inline-block text-sm font-semibold text-[var(--primary)] underline-offset-4 hover:underline"
            href={`/login?lang=${language}`}
          >
            {t.resetBackToSignIn}
          </Link>
        </section>
      </main>
    </div>
  );
}
