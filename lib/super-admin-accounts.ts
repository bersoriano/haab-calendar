/** Super admin's accounts list: which slice of accounts is on screen. */
export type AccountStatusFilter = "all" | "enabled" | "disabled";

type FilterableAccount = {
  email: string;
  publishingEnabled: boolean;
  workflow?: { businessName: string };
};

export function parseAccountStatusFilter(value?: string): AccountStatusFilter {
  return value === "enabled" || value === "disabled" ? value : "all";
}

/** Lower-case and accent-free, so "clinica" finds "Clínica". */
function fold(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

export function filterManagedUsers<T extends FilterableAccount>(
  users: T[],
  query: string,
  status: AccountStatusFilter,
): T[] {
  const needle = fold(query.trim());

  return users.filter((user) => {
    if (status === "enabled" && !user.publishingEnabled) return false;
    if (status === "disabled" && user.publishingEnabled) return false;
    if (!needle) return true;

    return fold(`${user.email} ${user.workflow?.businessName ?? ""}`).includes(needle);
  });
}

export function summarizeAccounts(users: FilterableAccount[]) {
  const enabled = users.filter((user) => user.publishingEnabled).length;
  return { total: users.length, enabled, disabled: users.length - enabled };
}
