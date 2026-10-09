import { DemoPagesPanel } from "@/components/super-admin/DemoPagesPanel";
import { listDemoPageSummaries } from "@/lib/supabase/demo-edit";
import { requireSuperAdmin } from "@/lib/supabase/publication";
import { loadOrNotFound } from "../load";

export const dynamic = "force-dynamic";

export default async function SuperAdminDemoPagesPage() {
  const demoPages = await loadOrNotFound(async () => {
    // The summaries use the service role and do not check the caller.
    await requireSuperAdmin();
    return listDemoPageSummaries();
  });

  return <DemoPagesPanel demoPages={demoPages} />;
}
