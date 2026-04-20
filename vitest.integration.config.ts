import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import path from 'path';

export default defineConfig(({ mode }) => {
  // loadEnv reads .env, .env.local, .env.test, .env.test.local
  const env = loadEnv(mode ?? 'test', process.cwd(), '');

  return {
    test: {
      globals: true,
      environment: 'node',
      include: ['tests/integration/**/*.test.ts'],
      env: {
        DATABASE_URL: env['DATABASE_URL'] ?? '',
        UPSTASH_REDIS_REST_URL: env['UPSTASH_REDIS_REST_URL'] ?? '',
        UPSTASH_REDIS_REST_TOKEN: env['UPSTASH_REDIS_REST_TOKEN'] ?? '',
        BETTER_AUTH_SECRET: env['BETTER_AUTH_SECRET'] ?? '',
        BETTER_AUTH_URL: env['BETTER_AUTH_URL'] ?? 'http://localhost:5173',
        VITE_APP_URL: env['VITE_APP_URL'] ?? 'http://localhost:5173',
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
