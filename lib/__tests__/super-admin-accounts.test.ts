import { describe, expect, it } from "vitest";
import {
  filterManagedUsers,
  parseAccountStatusFilter,
  summarizeAccounts,
} from "@/lib/super-admin-accounts";

type Row = {
  email: string;
  publishingEnabled: boolean;
  workflow?: { businessName: string };
};

const users: Row[] = [
  { email: "ana@clinic.com", publishingEnabled: true, workflow: { businessName: "Clínica Ana" } },
  { email: "bo@courts.io", publishingEnabled: false, workflow: { businessName: "Bo Courts" } },
  { email: "new@example.com", publishingEnabled: true },
];

describe("filterManagedUsers", () => {
  it("returns everyone for an empty query and every status", () => {
    expect(filterManagedUsers(users, "", "all")).toHaveLength(3);
    expect(filterManagedUsers(users, "   ", "all")).toHaveLength(3);
  });

  it("matches email or business name, ignoring case and accents", () => {
    expect(filterManagedUsers(users, "CLINICA", "all").map((u) => u.email)).toEqual([
      "ana@clinic.com",
    ]);
    expect(filterManagedUsers(users, "courts", "all").map((u) => u.email)).toEqual([
      "bo@courts.io",
    ]);
    expect(filterManagedUsers(users, "example", "all").map((u) => u.email)).toEqual([
      "new@example.com",
    ]);
  });

  it("filters by publishing state", () => {
    expect(filterManagedUsers(users, "", "disabled").map((u) => u.email)).toEqual([
      "bo@courts.io",
    ]);
    expect(filterManagedUsers(users, "", "enabled")).toHaveLength(2);
  });

  it("combines search and status", () => {
    expect(filterManagedUsers(users, "ana", "disabled")).toEqual([]);
  });
});

describe("parseAccountStatusFilter", () => {
  it("accepts known filters and reads anything else as all", () => {
    expect(parseAccountStatusFilter("enabled")).toBe("enabled");
    expect(parseAccountStatusFilter("disabled")).toBe("disabled");
    expect(parseAccountStatusFilter("x")).toBe("all");
    expect(parseAccountStatusFilter(undefined)).toBe("all");
  });
});

describe("summarizeAccounts", () => {
  it("counts accounts by publishing state", () => {
    expect(summarizeAccounts(users)).toEqual({ total: 3, enabled: 2, disabled: 1 });
  });
});
