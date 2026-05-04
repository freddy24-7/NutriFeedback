import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const databaseUrl = process.env['DATABASE_URL'];
if (!databaseUrl) {
  console.error('[db] DATABASE_URL is not set — all database queries will fail');
}

const sql = neon(databaseUrl ?? 'postgresql://missing');
export const db = drizzle(sql, { schema });
