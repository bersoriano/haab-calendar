import Link from "next/link";

import { LoginHeader } from "@/components/auth/LoginHeader";
import { PasswordResetRequestForm } from "@/components/auth/PasswordResetRequestForm";
import { translations } from "@/components/landing/translations";
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
      <main className="relative isolate overflow-hidden border-b border-[var(--line)] bg-[linear-gradient(145deg,#f5f7fb_0%,#edf4ff_54%,#e9f8f5_100%)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-32 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(26,115,232,0.16),transparent_68%)]"
        />
        <div className="relative mx-auto grid w-full max-w-[560px] items-center px-5 py-12 sm:px-8 sm:py-16 lg:min-h-[calc(100vh-80px)]">
          <section className="overflow-hidden rounded-[30px] border border-white/90 bg-white/88 p-6 shadow-[0_30px_80px_rgba(15,23,42,0.14)] backdrop-blur-xl sm:p-8">
            <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[var(--ink)]">
              {t.resetTitle}
            </h1>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{t.resetBody}</p>
            <PasswordResetRequestForm lang={language} />
            <Link
              className="mt-6 inline-block text-sm font-semibold text-[var(--primary)] underline-offset-4 hover:underline"
              href={`/login?lang=${language}`}
            >
              {t.resetBackToSignIn}
            </Link>
          </section>
        </div>
      </main>
    </div>
  );
}
