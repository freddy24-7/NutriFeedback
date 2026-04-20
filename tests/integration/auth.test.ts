/**
 * Integration tests for POST /api/auth/on-signup
 *
 * These tests require a real Neon dev-branch database.
 * Run with: DATABASE_URL=$DATABASE_URL_DEV vitest run tests/integration
 *
 * Each test creates its own ephemeral user ID and cleans up after itself.
 */
import { describe, it, afterEach } from 'vitest';
import { db } from '@/lib/db/client';
import { userProfiles, userCredits } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const TEST_USER_ID = crypto.randomUUID();

async function cleanup(userId: string) {
  await db.delete(userCredits).where(eq(userCredits.userId, userId));
  await db.delete(userProfiles).where(eq(userProfiles.id, userId));
}

describe('POST /api/auth/on-signup (integration)', () => {
  afterEach(async () => {
    await cleanup(TEST_USER_ID);
  });

  it.todo('creates a user_profiles row on first call');

  it.todo('creates a user_credits row with 50 credits and 30-day expiry');

  it.todo('is idempotent — second call does not change the row or throw');

  it.todo('does not create rows for another user when called with a different token');
});
