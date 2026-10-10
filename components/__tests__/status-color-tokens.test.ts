import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(import.meta.dirname, "..", "..");

/** The status palette's literal values; components use the tokens instead. */
const LITERALS = ["#fecdd3", "#fff1f2", "#be123c", "#bbf7d0", "#f0fdf4", "#15803d"];
// Super admin's violet signpost is the app-ui "admin" tone now; slate is
// replaced by tokens.
const PALETTE_CLASSES = /\b(?:bg|text|border|ring)-(?:rose|emerald|amber|red|green|violet|slate)-\d{2,3}\b/;

function sources(dir: string) {
  return readdirSync(join(root, dir))
    .filter((name) => /\.(ts|tsx)$/.test(name))
    .map((name) => ({ name: `${dir}/${name}`, text: readFileSync(join(root, dir, name), "utf8") }));
}

describe("status colors", () => {
  const files = [
    ...sources("components/provider"),
    ...sources("components/ui"),
    ...sources("components/super-admin"),
  ];

  it("come from the --success / --warning / --danger tokens", () => {
    const offenders = files.filter(
      (file) =>
        LITERALS.some((literal) => file.text.toLowerCase().includes(literal)) ||
        PALETTE_CLASSES.test(file.text),
    );

    expect(offenders.map((file) => file.name)).toEqual([]);
  });
});
