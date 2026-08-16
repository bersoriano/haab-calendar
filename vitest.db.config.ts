import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * Database integration tests.
 *
 * Separate from the unit config because these need a running local Supabase and
 * are far slower. They are never part of `test:unit`, so a developer without a
 * container runtime still gets a green suite — and never silently "passes" a
 * check that did not run.
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["test/db/**/*.test.ts"],
    // A local Postgres is fast, but migrations and seeding are not instant.
    testTimeout: 30_000,
    hookTimeout: 60_000,
    // One database, one connection story: parallel files would fight over the
    // same rows and produce failures that depend on scheduling.
    fileParallelism: false,
  },
});
