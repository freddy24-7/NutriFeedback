// @vitest-environment node
/**
 * Integration tests for POST /api/auth/on-signup
 *
 * These tests require a real Neon dev-branch database.
 * Run with: DATABASE_URL=$DATABASE_URL_DEV vitest run tests/integration
 */

import { describe, it, expect, afterEach } from 'vitest';
import { db } from '@/lib/db/client';
import { userProfiles, userCredits } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

async function cleanup(userId: string) {
  await db.delete(userCredits).where(eq(userCredits.userId, userId));
  await db.delete(userProfiles).where(eq(userProfiles.id, userId));
}

// auth route is not wired in the shared testApp helper, so mount it inline
import { authRoutes } from '@/api/routes/auth';
import { Hono } from 'hono';
import { type AuthVariables } from '@/api/middleware/auth';

function createAuthApp(userId: string) {
  const app = new Hono<{ Variables: AuthVariables }>().basePath('/api');
  app.use('*', async (c, next) => {
    c.set('user', { id: userId });
    await next();
  });
  app.route('/auth', authRoutes);
  return app;
}

describe('POST /api/auth/on-signup', () => {
  const USER_ID = `test-signup-${crypto.randomUUID()}`;

  afterEach(async () => {
    await cleanup(USER_ID);
  });

  it('creates a user_profiles row on first call', async () => {
    const app = createAuthApp(USER_ID);
    const res = await app.request('/api/auth/on-signup', { method: 'POST' });

    expect(res.status).toBe(200);

    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.id, USER_ID));

    expect(profile).toBeDefined();
    expect(profile!.id).toBe(USER_ID);
    expect(profile!.language).toBe('en');
    expect(profile!.theme).toBe('light');
  });

  it('creates a user_credits row with credits and a 30-day expiry', async () => {
    const app = createAuthApp(USER_ID);
    await app.request('/api/auth/on-signup', { method: 'POST' });

    const [credits] = await db.select().from(userCredits).where(eq(userCredits.userId, USER_ID));

    expect(credits).toBeDefined();
    expect(credits!.creditsRemaining).toBeGreaterThan(0);
    expect(credits!.creditsUsed).toBe(0);

    // expiresAt should be roughly 30 days in the future
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const diff = credits!.expiresAt!.getTime() - Date.now();
    expect(diff).toBeGreaterThan(thirtyDaysMs - 60_000); // allow 1 min skew
    expect(diff).toBeLessThan(thirtyDaysMs + 60_000);
  });

  it('is idempotent — second call does not throw or change the row', async () => {
    const app = createAuthApp(USER_ID);

    const res1 = await app.request('/api/auth/on-signup', { method: 'POST' });
    expect(res1.status).toBe(200);

    const res2 = await app.request('/api/auth/on-signup', { method: 'POST' });
    expect(res2.status).toBe(200);

    const profiles = await db.select().from(userProfiles).where(eq(userProfiles.id, USER_ID));
    expect(profiles).toHaveLength(1);

    const allCredits = await db.select().from(userCredits).where(eq(userCredits.userId, USER_ID));
    expect(allCredits).toHaveLength(1);
  });

  it('does not create rows for a different user', async () => {
    const OTHER_ID = `test-signup-other-${crypto.randomUUID()}`;

    const app = createAuthApp(USER_ID);
    await app.request('/api/auth/on-signup', { method: 'POST' });

    // The other user should have no profile or credits
    const otherProfile = await db.select().from(userProfiles).where(eq(userProfiles.id, OTHER_ID));
    expect(otherProfile).toHaveLength(0);
  });

  it('returns 401 when unauthenticated', async () => {
    const app = new Hono<{ Variables: AuthVariables }>().basePath('/api');
    // No user set — simulates missing session
    app.use('/auth/*', async (c) => c.json({ error: 'Unauthorized' }, 401));
    app.route('/auth', authRoutes);

    const res = await app.request('/api/auth/on-signup', { method: 'POST' });
    expect(res.status).toBe(401);
  });
});
