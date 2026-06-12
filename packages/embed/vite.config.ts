import { defineConfig } from 'vite';
import { resolve } from 'path';

const E2E_PORT = Number(process.env.EUDI_E2E_PORT ?? 3333);
const MOCK_API_PORT = Number(process.env.EUDI_MOCK_API_PORT ?? 3456);

export default defineConfig({
  root: resolve(__dirname, 'e2e'),
  server: {
    port: E2E_PORT,
    strictPort: true,
    proxy: {
      '/api/eudi': {
        target: `http://localhost:${MOCK_API_PORT}`,
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@eudi-verify/client': resolve(__dirname, '../client/src/index.ts'),
    },
  },
});
