import { defineConfig } from "tsup";

export default defineConfig({
  entry: { "eudi-verify": "src/index.ts" },
  format: ["esm", "cjs", "iife"],
  outDir: "dist",
  dts: true,
  clean: true,
  sourcemap: true,
  minify: false,
  noExternal: ["@eudi-verify/client", "qrcode"],
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
  esbuildOptions(options, context) {
    if (context.format === "iife") {
      options.platform = "browser";
      options.mainFields = ["browser", "module", "main"];
    }
  },
});
