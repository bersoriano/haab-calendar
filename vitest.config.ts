import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    // Playwright owns e2e/. Vitest would try to run those files as unit tests
    // and fail on the first `test.describe` it does not recognise.
    // e2e/ belongs to Playwright; test/db/ needs a running local Supabase and
    // has its own config. Neither should be able to fail a run that claims to
    // be "unit tests".
    exclude: ["**/node_modules/**", "**/dist/**", "e2e/**", "test/db/**"],
    coverage: {
      provider: "v8",
      reportsDirectory: "coverage",
      reporter: ["text-summary", "json-summary", "lcov"],
      // Only the code this project actually tests. Measuring the whole
      // repository would report a number dominated by the monolith and tell
      // nobody anything about the premium paths.
      include: [
        "lib/billing/**/*.ts",
        "lib/entitlements/**/*.ts",
        "lib/integrations/outbox/**/*.ts",
        "lib/observability/**/*.ts",
        "lib/stripe/config.ts",
        "lib/public-url.ts",
        "lib/slug-management.ts",
        "app/api/webhooks/**/*.ts",
        "app/api/cron/**/*.ts",
      ],
      exclude: ["**/__tests__/**", "**/*.test.ts", "**/*.test.tsx"],
      // Set from a measured baseline rather than an aspiration, and never
      // lowered: a threshold that has to be relaxed to merge is not a check.
      // Measured at 89.6 / 92.6 / 83.7 / 89.8 when these were set; a couple of
      // points below that, so an honest refactor does not fail the build while
      // a real drop still does.
      thresholds: {
        lines: 88,
        functions: 90,
        branches: 82,
        statements: 88,
      },
    },
  },
});
