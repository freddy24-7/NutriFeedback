import { webcrypto } from 'node:crypto';
if (!globalThis.crypto) (globalThis as unknown as Record<string, unknown>).crypto = webcrypto;

import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode ?? 'test', process.cwd(), '');

  return {
    test: {
      globals: true,
      environment: 'node',
      include: ['tests/unit/**/*.test.ts'],
      env: {
        DATABASE_URL: env['DATABASE_URL'] ?? '',
        NODE_ENV: 'test',
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  };
});
