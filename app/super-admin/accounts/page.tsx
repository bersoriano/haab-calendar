import { UserPublicationTable } from "@/components/super-admin/UserPublicationTable";
import { parseAccountStatusFilter } from "@/lib/super-admin-accounts";
import { listManagedUsers } from "@/lib/supabase/publication";
import { loadOrNotFound } from "../load";

export const dynamic = "force-dynamic";

type AccountsPageProps = {
  searchParams: Promise<{ q?: string; status?: string }>;
};

export default async function SuperAdminAccountsPage({ searchParams }: AccountsPageProps) {
  const [{ q, status }, users] = await Promise.all([
    searchParams,
    loadOrNotFound(listManagedUsers),
  ]);

  return (
    <UserPublicationTable
      initialUsers={users}
      initialQuery={q ?? ""}
      initialStatus={parseAccountStatusFilter(status)}
    />
  );
}
