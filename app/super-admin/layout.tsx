import type { Metadata } from "next";
import type { ReactNode } from "react";

import { SuperAdminShell } from "@/components/super-admin/SuperAdminShell";
import { listAccountDeletionCleanupJobs } from "@/lib/supabase/account-deletion";
import { requireSuperAdmin } from "@/lib/supabase/publication";
import { loadOrNotFound } from "./load";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Super admin · Haab Calendar",
  robots: { index: false, follow: false },
};

/**
 * Gate and shell for every super-admin page. Anyone else gets the ordinary
 * not-found page, exactly as before the area had sub-pages; each page still
 * re-checks through the data functions it calls.
 */
export default async function SuperAdminLayout({ children }: { children: ReactNode }) {
  const { email, pendingCleanups } = await loadOrNotFound(async () => {
    const user = await requireSuperAdmin();
    const jobs = await listAccountDeletionCleanupJobs();
    return { email: user.email, pendingCleanups: jobs.length };
  });

  return (
    <SuperAdminShell email={email} pendingCleanups={pendingCleanups}>
      {children}
    </SuperAdminShell>
  );
}
