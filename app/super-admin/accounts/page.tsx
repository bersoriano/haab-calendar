import { UserPublicationTable } from "@/components/super-admin/UserPublicationTable";
import { listManagedUsers } from "@/lib/supabase/publication";
import { loadOrNotFound } from "../load";

export const dynamic = "force-dynamic";

export default async function SuperAdminAccountsPage() {
  const users = await loadOrNotFound(listManagedUsers);

  return <UserPublicationTable initialUsers={users} />;
}
