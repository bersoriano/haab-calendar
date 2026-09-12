import { redirect } from "next/navigation";

import { LoginHeader } from "@/components/auth/LoginHeader";
import { NewPasswordForm } from "@/components/auth/NewPasswordForm";
import { translations } from "@/components/landing/translations";
import { getServerLanguage } from "@/lib/language/server";
import { PRIVATE_PAGE_METADATA } from "@/lib/site-metadata";
import { createClient } from "@/lib/supabase/server";

export const metadata = PRIVATE_PAGE_METADATA;

// The recovery session is established by /auth/confirm moments earlier, so
// there is nothing here worth caching or prerendering.
export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const { lang } = await searchParams;
  const language = await getServerLanguage(lang);
  const t = translations[language].auth;

  // Reaching this page means /auth/confirm already verified the recovery token
  // and exchanged it for a session. Someone arriving without one followed an
  // expired link, or typed the URL: send them to ask for a fresh link rather
  // than showing a password field that cannot work.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login/reset?lang=${language}`);
  }

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
              {t.newPasswordTitle}
            </h1>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{t.newPasswordBody}</p>
            <NewPasswordForm lang={language} />
          </section>
        </div>
      </main>
    </div>
  );
}
