import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const sharedDir = join(
  fileURLToPath(new URL(".", import.meta.url)),
  "../shared",
);

const devPort = Number(process.env.EUDI_REACT_E2E_PORT ?? 3001);
const apiPort = Number(process.env.EUDI_MOCK_API_PORT ?? 3000);

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
  optimizeDeps: {
    esbuildOptions: {
      target: "es2022",
    },
  },
  build: {
    target: "es2022",
  },
  server: {
    port: devPort,
    strictPort: Boolean(process.env.CI || process.env.EUDI_REACT_E2E_PORT),
    proxy: {
      "/api": {
        target: `http://localhost:${apiPort}`,
        changeOrigin: true,
      },
    },
  },
});
