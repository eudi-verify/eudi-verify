import { defineConfig, devices } from "@playwright/test";

const E2E_PORT = Number(process.env.EUDI_E2E_PORT ?? 3333);
const MOCK_API_PORT = Number(process.env.EUDI_MOCK_API_PORT ?? 3456);
const baseURL = `http://localhost:${E2E_PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "Mobile Safari",
      use: { ...devices["iPhone 12"] },
    },
  ],
  webServer: [
    {
      command: `node e2e/mock-api-server.mjs`,
      url: `http://localhost:${MOCK_API_PORT}/api/eudi/sessions`,
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
      env: { EUDI_MOCK_API_PORT: String(MOCK_API_PORT) },
      stdout: "pipe",
    },
    {
      command: `pnpm run serve:e2e`,
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
      env: { EUDI_E2E_PORT: String(E2E_PORT) },
      stdout: "pipe",
    },
  ],
});
