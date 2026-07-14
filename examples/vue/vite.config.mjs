import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

const sharedDir = join(
  fileURLToPath(new URL(".", import.meta.url)),
  "../shared",
);

function sharedDemoScripts() {
  return {
    name: "shared-demo-scripts",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const name = req.url?.split("?")[0]?.slice(1);
        if (name?.startsWith("demo-") && name.endsWith(".js")) {
          try {
            res.setHeader("Content-Type", "application/javascript");
            res.end(readFileSync(join(sharedDir, name)));
            return;
          } catch {
            /* fall through */
          }
        }
        next();
      });
    },
  };
}

export default defineConfig({
  optimizeDeps: {
    esbuildOptions: {
      target: "es2022",
    },
  },
  plugins: [
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag === "eudi-verify",
        },
      },
    }),
    sharedDemoScripts(),
  ],
  build: {
    target: "es2022",
  },
  server: {
    port: 3001,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
