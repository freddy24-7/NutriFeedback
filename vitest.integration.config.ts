import { webcrypto } from 'node:crypto';
// Node.js < 19 doesn't expose globalThis.crypto — polyfill for Vite 5 compatibility
if (!globalThis.crypto) (globalThis as unknown as Record<string, unknown>).crypto = webcrypto;

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
        CLERK_SECRET_KEY: env['CLERK_SECRET_KEY'] ?? '',
        VITE_CLERK_PUBLISHABLE_KEY: env['VITE_CLERK_PUBLISHABLE_KEY'] ?? '',
        VITE_APP_URL: env['VITE_APP_URL'] ?? 'http://localhost:5173',
        // Stripe: real key loaded from .env.local; placeholder used in tests that mock Stripe.
        STRIPE_SECRET_KEY: env['STRIPE_SECRET_KEY'] ?? 'sk_test_placeholder',
        STRIPE_WEBHOOK_SECRET: env['STRIPE_WEBHOOK_SECRET'] ?? 'whsec_placeholder',
        STRIPE_PRICE_ID: env['STRIPE_PRICE_ID'] ?? 'price_placeholder',
        IP_HASH_SECRET: env['IP_HASH_SECRET'] ?? 'test-ip-hash-secret-32-bytes-xx',
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
