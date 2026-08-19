import { defineConfig, devices } from "@playwright/test";

const CI = Boolean(process.env.CI);
const BASE_URL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./e2e",
  // Serial: the suite seeds shared providers, and parallel workers editing one
  // provider's settings would fail in ways that depend on scheduling rather
  // than on the code.
  workers: 1,
  fullyParallel: false,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  // A broken navigation helper fails every test the same way, and twenty-two
  // sixty-second timeouts exceed the job's own limit — which cancels the run
  // and skips the report upload, so the one artifact that explains the failure
  // is the thing that never gets produced. Stopping early keeps the diagnosis.
  maxFailures: CI ? 3 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: CI ? [["html", { open: "never" }], ["list"]] : [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "setup",
      testMatch: /global\.setup\.ts/,
    },
    {
      name: "premium",
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: CI ? "npm run start" : "npm run dev",
    url: BASE_URL,
    // Locally, reuse whatever is already running. In CI, always start fresh so
    // a passing run never depends on a server someone left behind.
    reuseExistingServer: !CI,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
