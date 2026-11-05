import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOTS = ["app", "components", "lib"];

const USE_CLIENT = /^(?:\s|\/\/.*\n|\/\*[\s\S]*?\*\/)*["']use client["']/;
const MAIN_ENTRY = /import\s+(?!type\b)[^;]*?from\s+["']@phosphor-icons\/react["']/;

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "__tests__" ? [] : sourceFiles(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

/**
 * Phosphor's main entry calls createContext as it loads, and React's server
 * build has no createContext. A file without "use client" can end up in a
 * server component's graph, where that import is a 500 under `next dev`.
 * Production builds tree-shake an unused import away, so neither CI's build nor
 * its E2E run (`npm run start`) can catch this. That is how /blog shipped
 * working in production and broken in development.
 */
describe("Phosphor icon imports", () => {
  it("uses the server-safe entry in every file without use client", () => {
    const offenders = ROOTS.flatMap(sourceFiles).filter((file) => {
      const source = fs.readFileSync(file, "utf8");
      return !USE_CLIENT.test(source) && MAIN_ENTRY.test(source);
    });

    expect(offenders).toEqual([]);
  });
});
