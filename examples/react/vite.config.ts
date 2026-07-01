import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const sharedDir = join(
  fileURLToPath(new URL(".", import.meta.url)),
  "../shared",
);

function sharedDemoScripts(): Plugin {
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
  plugins: [react(), sharedDemoScripts()],
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
