import { redirect } from "next/navigation";

import { AuthPageFrame } from "@/components/auth/AuthPageFrame";
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
    <AuthPageFrame
      lang={language}
      header={<LoginHeader lang={language} />}
      title={t.newPasswordTitle}
      body={t.newPasswordBody}
    >
      <NewPasswordForm lang={language} />
    </AuthPageFrame>
  );
}
