import { PendingDeletionCleanups } from "@/components/super-admin/PendingDeletionCleanups";
import { listAccountDeletionCleanupJobs } from "@/lib/supabase/account-deletion";
import { loadOrNotFound } from "../load";

export const dynamic = "force-dynamic";

export default async function SuperAdminCleanupsPage() {
  const jobs = await loadOrNotFound(listAccountDeletionCleanupJobs);

  return <PendingDeletionCleanups initialJobs={jobs} />;
}
