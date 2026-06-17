import { defineConfig } from "tsup";

export default defineConfig({
  entry: { "eudi-verify": "src/index.ts" },
  format: ["esm", "cjs", "iife"],
  outDir: "dist",
  dts: true,
  clean: true,
  sourcemap: true,
  minify: false,
  splitting: false,
  outExtension({ format }) {
    switch (format) {
      case "iife":
        return { js: ".iife.js" };
      case "cjs":
        return { js: ".cjs" };
      default:
        return { js: ".js" };
    }
  },
  globalName: "EudiVerify",
});
