/**
 * Integration tests for /api/food-log
 *
 * These tests hit a real Neon dev-branch database and a running Hono server.
 * Run with: DATABASE_URL=$DATABASE_URL_DEV vitest run tests/integration
 */
import { describe, it, afterEach } from 'vitest';
import { db } from '@/lib/db/client';
import { foodLogEntries } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const TEST_USER_ID = crypto.randomUUID();

async function cleanup() {
  await db.delete(foodLogEntries).where(eq(foodLogEntries.userId, TEST_USER_ID));
}

describe('GET /api/food-log (integration)', () => {
  afterEach(cleanup);

  it.todo('returns entries for the authenticated user on the given date');

  it.todo('returns an empty array when no entries exist for the date');

  it.todo('returns 401 when no Authorization header is provided');
});

describe('POST /api/food-log (integration)', () => {
  afterEach(cleanup);

  it.todo('creates a food log entry and returns 201 with the entry');

  it.todo('sanitises HTML in description before persisting');

  it.todo('returns 400 for a missing description');

  it.todo('returns 401 when unauthenticated');
});

describe('DELETE /api/food-log/:id (integration)', () => {
  afterEach(cleanup);

  it.todo('deletes the entry owned by the authenticated user');

  it.todo('returns 404 when the entry belongs to a different user (horizontal privilege check)');

  it.todo('returns 404 for a non-existent entry ID');
});
