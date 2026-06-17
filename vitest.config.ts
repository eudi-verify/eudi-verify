import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "packages/server/src/**/*.test.ts",
      "packages/client/src/**/*.test.ts",
    ],
  },
});
