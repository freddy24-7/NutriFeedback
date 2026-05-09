// @vitest-environment node
/**
 * Unit tests for the paywall middleware.
 *
 * Verifies that active/comped subscriptions always pass through, trial users
 * with credits are allowed, and the two blocked states (expired trial, zero
 * credits) are rejected with the correct 402 codes.
 *
 * DB operations hit the real Neon dev-branch database.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { Hono } from 'hono';
import { db } from '@/lib/db/client';
import { userCredits, subscriptions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { paywallMiddleware } from '@/api/middleware/paywall';
import { type AuthVariables } from '@/api/middleware/auth';
import { seedUser, cleanupUser } from '../helpers/dbFixtures';

// Minimal app that applies paywallMiddleware then returns 200 if it passes.
function createPaywallApp(userId: string) {
  const app = new Hono<{ Variables: AuthVariables }>().basePath('/api');
  app.use('*', async (c, next) => {
    c.set('user', { id: userId });
    await next();
  });
  app.use('/guarded', paywallMiddleware);
  app.get('/guarded', (c) => c.json({ ok: true }));
  return app;
}

const USER_ID = `test-paywall-${crypto.randomUUID()}`;

describe('paywallMiddleware', () => {
  afterEach(async () => {
    await db.delete(subscriptions).where(eq(subscriptions.userId, USER_ID));
    await cleanupUser(USER_ID);
  });

  it('allows a trial user with credits remaining', async () => {
    await seedUser({ id: USER_ID, email: 'pw@example.com', name: 'PW' }, 10);

    const res = await createPaywallApp(USER_ID).request('/api/guarded');
    expect(res.status).toBe(200);
  });

  it('allows an active subscriber regardless of credits', async () => {
    await seedUser({ id: USER_ID, email: 'pw@example.com', name: 'PW' }, 0);
    await db.insert(subscriptions).values({ userId: USER_ID, status: 'active' });

    const res = await createPaywallApp(USER_ID).request('/api/guarded');
    expect(res.status).toBe(200);
  });

  it('allows a comped user regardless of credits', async () => {
    await seedUser({ id: USER_ID, email: 'pw@example.com', name: 'PW' }, 0);
    await db.insert(subscriptions).values({ userId: USER_ID, status: 'comped' });

    const res = await createPaywallApp(USER_ID).request('/api/guarded');
    expect(res.status).toBe(200);
  });

  it('blocks a trial user with zero credits', async () => {
    await seedUser({ id: USER_ID, email: 'pw@example.com', name: 'PW' }, 0);

    const res = await createPaywallApp(USER_ID).request('/api/guarded');
    expect(res.status).toBe(402);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.code).toBe('NO_CREDITS');
  });

  it('blocks a trial user whose expiry date has passed', async () => {
    await seedUser({ id: USER_ID, email: 'pw@example.com', name: 'PW' }, 10);
    // Override expiresAt to yesterday
    await db
      .update(userCredits)
      .set({ expiresAt: new Date(Date.now() - 86_400_000) })
      .where(eq(userCredits.userId, USER_ID));

    const res = await createPaywallApp(USER_ID).request('/api/guarded');
    expect(res.status).toBe(402);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.code).toBe('TRIAL_EXPIRED');
  });

  it('allows a user whose expiry is in the future with credits', async () => {
    await seedUser({ id: USER_ID, email: 'pw@example.com', name: 'PW' }, 5);
    await db
      .update(userCredits)
      .set({ expiresAt: new Date(Date.now() + 86_400_000 * 7) })
      .where(eq(userCredits.userId, USER_ID));

    const res = await createPaywallApp(USER_ID).request('/api/guarded');
    expect(res.status).toBe(200);
  });

  it('trial expired takes precedence over zero credits in the response code', async () => {
    // Both expired AND zero credits — should report TRIAL_EXPIRED (checked first)
    await seedUser({ id: USER_ID, email: 'pw@example.com', name: 'PW' }, 0);
    await db
      .update(userCredits)
      .set({ expiresAt: new Date(Date.now() - 86_400_000) })
      .where(eq(userCredits.userId, USER_ID));

    const res = await createPaywallApp(USER_ID).request('/api/guarded');
    expect(res.status).toBe(402);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.code).toBe('TRIAL_EXPIRED');
  });

  it('active subscription overrides an expired trial date', async () => {
    await seedUser({ id: USER_ID, email: 'pw@example.com', name: 'PW' }, 0);
    await db
      .update(userCredits)
      .set({ expiresAt: new Date(Date.now() - 86_400_000) })
      .where(eq(userCredits.userId, USER_ID));
    await db.insert(subscriptions).values({ userId: USER_ID, status: 'active' });

    const res = await createPaywallApp(USER_ID).request('/api/guarded');
    expect(res.status).toBe(200);
  });

  it('allows access when no credits row exists (fresh user edge case)', async () => {
    // Only create the profile, not credits — simulates a race condition on first login
    await db
      .insert((await import('@/lib/db/schema')).userProfiles)
      .values({
        id: USER_ID,
        language: 'en',
        theme: 'light',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

    const res = await createPaywallApp(USER_ID).request('/api/guarded');
    // No credits row → credits is undefined → paywall passes through (on-signup will create it)
    expect(res.status).toBe(200);
  });
});
