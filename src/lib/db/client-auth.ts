import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema-better-auth';

const databaseUrl = process.env['DATABASE_URL'];
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

const sql = neon(databaseUrl);
/** Narrow schema for Better Auth + sign-up hooks only (smaller serverless bundle than `client.ts`). */
export const db = drizzle(sql, { schema });
