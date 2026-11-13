import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const rootDirectory = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(rootDirectory, 'src'),
      'server-only': path.resolve(rootDirectory, 'node_modules/next/dist/compiled/server-only/empty.js')
    }
  },
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    exclude: ['node_modules/**', '.next/**', 'e2e/**']
  }
});
