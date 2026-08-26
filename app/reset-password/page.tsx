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
      <main className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-[560px] items-center px-4 py-8 sm:px-6">
        <section className="rounded-[28px] bg-[rgba(248,249,250,0.94)] p-6 shadow-[0_28px_64px_rgba(25,28,29,0.08)] ring-1 ring-[rgba(255,255,255,0.68)] sm:p-8">
          <h1 className="text-2xl font-semibold text-[var(--ink)]">{t.newPasswordTitle}</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{t.newPasswordBody}</p>
          <NewPasswordForm lang={language} />
        </section>
      </main>
    </div>
  );
}
