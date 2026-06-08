import { HaabBookingModule } from "@/components/haab-booking-module";
import { logout } from "@/app/login/actions";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims) {
    redirect("/login");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email || claims.email;

  return (
    <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
      <HaabBookingModule userEmail={email} onSignOut={logout} />
    </main>
  );
}
