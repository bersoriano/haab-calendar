import { describe, expect, it } from "vitest";
import {
  buildProviderPath,
  buildServicePath,
  generateSlug,
  generateUniqueSlug,
  parsePublicVerticalSegment,
  validateCustomProviderSlug,
  validateProviderSlug,
  validateServiceSlug,
} from "@/lib/public-url";
import {
  checkProviderSlugAvailability,
  checkServiceSlugAvailability,
} from "@/lib/slug-management";

type Row = Record<string, string>;

function createSlugClient(rowsByTable: Record<string, Row[]>) {
  return {
    from(table: string) {
      return {
        select(columns?: string) {
          void columns;
          const filters: Array<[string, string]> = [];
          const exclusions: Array<[string, string]> = [];
          const builder = {
            eq(column: string, value: string) {
              filters.push([column, value]);
              return builder;
            },
            neq(column: string, value: string) {
              exclusions.push([column, value]);
              return builder;
            },
            async maybeSingle() {
              const row = (rowsByTable[table] ?? []).find((candidate) => {
                const matchesFilters = filters.every(
                  ([column, value]) => candidate[column] === value,
                );
                const matchesExclusions = exclusions.every(
                  ([column, value]) => candidate[column] !== value,
                );
                return matchesFilters && matchesExclusions;
              });

              return { data: row ?? null, error: null };
            },
          };

          return builder;
        },
      };
    },
  };
}

describe("public URL slug helpers", () => {
  it("generates lowercase hyphen slugs without repeated separators", () => {
    expect(generateSlug("  Dr. Ahmad Khan!!!  ")).toBe("dr-ahmad-khan");
    expect(generateSlug("KLCC___Meeting   Room")).toBe("klcc-meeting-room");
  });

  it("keeps generated slugs concise by default", () => {
    expect(generateSlug("one two three four five six seven eight")).toBe(
      "one-two-three-four-five-six",
    );
  });

  it("appends numeric collision suffixes", async () => {
    const taken = new Set(["dr-ahmad-khan", "dr-ahmad-khan-2"]);
    const slug = await generateUniqueSlug({
      value: "Dr Ahmad Khan",
      exists: (candidate) => taken.has(candidate),
    });

    expect(slug).toBe("dr-ahmad-khan-3");
  });

  it("validates custom slug formatting", () => {
    expect(validateProviderSlug("dr-ahmad-khan").ok).toBe(true);
    expect(validateProviderSlug("Dr_Ahmad").ok).toBe(false);
    expect(validateProviderSlug("dr--ahmad").ok).toBe(false);
    expect(validateServiceSlug("manage").ok).toBe(false);
  });

  it("marks custom provider slugs as premium-only", () => {
    expect(validateCustomProviderSlug("dr-ahmad", "free").ok).toBe(false);
    expect(validateCustomProviderSlug("dr-ahmad", "premium").ok).toBe(true);
  });

  it("maps vertical ids and aliases to canonical paths", () => {
    expect(parsePublicVerticalSegment("venues")).toBe("spaces");
    expect(buildProviderPath("healthcare", "dr-ahmad-khan")).toBe(
      "/doctors/dr-ahmad-khan",
    );
    expect(buildServicePath("spaces", "klcc-meeting-room", "hourly-rental")).toBe(
      "/spaces/klcc-meeting-room/hourly-rental",
    );
  });
});

describe("slug availability checks", () => {
  it("allows the current provider to keep its own slug", async () => {
    const client = createSlugClient({
      providers: [{ id: "provider-1", vertical: "healthcare", slug: "dr-ahmad" }],
      provider_slug_redirects: [],
    });

    const result = await checkProviderSlugAvailability(client, {
      vertical: "healthcare",
      slug: "dr-ahmad",
      currentProviderId: "provider-1",
    });

    expect(result.available).toBe(true);
  });

  it("blocks provider slugs reserved by redirect history", async () => {
    const client = createSlugClient({
      providers: [],
      provider_slug_redirects: [
        { provider_id: "provider-2", vertical: "healthcare", slug: "dr-ahmad" },
      ],
    });

    const result = await checkProviderSlugAvailability(client, {
      vertical: "healthcare",
      slug: "dr-ahmad",
    });

    expect(result.available).toBe(false);
  });

  it("blocks service slugs already used by the same provider", async () => {
    const client = createSlugClient({
      services: [{ id: "service-1", provider_id: "provider-1", slug: "consultation" }],
      service_slug_redirects: [],
    });

    const result = await checkServiceSlugAvailability(client, {
      providerId: "provider-1",
      slug: "consultation",
    });

    expect(result.available).toBe(false);
  });
});
