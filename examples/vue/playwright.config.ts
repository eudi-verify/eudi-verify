import { defineConfig, devices } from "@playwright/test";

const VUE_PORT = Number(process.env.EUDI_VUE_E2E_PORT ?? 3011);
const MOCK_API_PORT = Number(process.env.EUDI_MOCK_API_PORT ?? 3457);
const baseURL = `http://localhost:${VUE_PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
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
  ],
  webServer: [
    {
      command: "node ../../packages/embed/e2e/mock-api-server.mjs",
      url: `http://localhost:${MOCK_API_PORT}/api/eudi/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
      env: { EUDI_MOCK_API_PORT: String(MOCK_API_PORT) },
      stdout: "pipe",
    },
    {
      command: "pnpm run dev",
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 60000,
      env: {
        EUDI_VUE_E2E_PORT: String(VUE_PORT),
        EUDI_MOCK_API_PORT: String(MOCK_API_PORT),
      },
      stdout: "pipe",
    },
  ],
});
