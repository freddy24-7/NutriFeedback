import type { Config } from 'drizzle-kit';

export default {
  schema: './src/lib/db/schema.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url:
      process.env['DATABASE_URL_UNPOOLED'] ??
      (() => {
        throw new Error('DATABASE_URL_UNPOOLED is required');
      })(),
  },
} satisfies Config;
