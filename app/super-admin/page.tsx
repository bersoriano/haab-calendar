import { SuperAdminOverview } from "@/components/super-admin/SuperAdminOverview";
import { summarizeAccounts } from "@/lib/super-admin-accounts";
import { listAccountDeletionCleanupJobs } from "@/lib/supabase/account-deletion";
import { listDemoPageSummaries } from "@/lib/supabase/demo-edit";
import { listManagedUsers, requireSuperAdmin } from "@/lib/supabase/publication";
import { loadOrNotFound } from "./load";

export const dynamic = "force-dynamic";

export default async function SuperAdminPage() {
  const [users, cleanupJobs, demoPages] = await loadOrNotFound(async () => {
    // Before any read: the demo summaries use the service role and do not
    // check the caller themselves.
    await requireSuperAdmin();
    return Promise.all([
      listManagedUsers(),
      listAccountDeletionCleanupJobs(),
      listDemoPageSummaries(),
    ]);
  });

  return (
    <SuperAdminOverview
      accounts={summarizeAccounts(users)}
      pendingCleanups={cleanupJobs.length}
      demoPagesNeedingSeed={demoPages.filter((page) => page.status !== "ready").length}
    />
  );
}
