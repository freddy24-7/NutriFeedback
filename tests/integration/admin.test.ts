// @vitest-environment node
/**
 * Integration tests for /api/admin/*
 *
 * Authorization is the primary concern: the admin check must reject non-admins
 * even with a valid session, and must handle missing configuration gracefully.
 * Credit adjustment edge cases are also covered.
 *
 * Run with: npm run test:integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Hono } from 'hono';
import { db } from '@/lib/db/client';
import { userCredits } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { adminRoutes } from '@/api/routes/admin';
import { type AuthVariables } from '@/api/middleware/auth';
import { seedUser, cleanupUser, type TestUser } from '../helpers/dbFixtures';

vi.mock('@/lib/redis/client', async () => {
  const { mockRedisModule } = await import('../helpers/mockRateLimiter');
  return mockRedisModule();
});

vi.mock('@/lib/auth/server', () => ({
  clerkClient: {
    users: {
      getUserList: vi.fn().mockResolvedValue({
        data: [
          {
            id: '',
            emailAddresses: [{ emailAddress: 'admin@example.com' }],
            firstName: 'Admin',
            lastName: 'User',
            lastSignInAt: Date.now(),
          },
        ],
      }),
    },
  },
}));

// ─── App factories ────────────────────────────────────────────────────────────

const ADMIN_ID = `test-admin-actor-${crypto.randomUUID()}`;
const NON_ADMIN_ID = `test-non-admin-${crypto.randomUUID()}`;

function createAdminApp(callerId: string) {
  const app = new Hono<{ Variables: AuthVariables }>().basePath('/api');
  app.use('*', async (c, next) => {
    c.set('user', { id: callerId });
    await next();
  });
  app.route('/admin', adminRoutes);
  return app;
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const TARGET_USER: TestUser = {
  id: `test-admin-target-${crypto.randomUUID()}`,
  email: `admin-target-${Date.now()}@example.com`,
  name: 'Target User',
};

// ─── GET /api/admin/users ─────────────────────────────────────────────────────

describe('GET /api/admin/users', () => {
  beforeEach(async () => {
    vi.stubEnv('ADMIN_USER_ID', ADMIN_ID);
    await seedUser(TARGET_USER, 15);
    // Patch Clerk mock so IDs match the seeded user
    const { clerkClient } = await import('@/lib/auth/server');
    vi.mocked(clerkClient.users.getUserList).mockResolvedValue({
      data: [
        {
          id: TARGET_USER.id,
          emailAddresses: [{ emailAddress: TARGET_USER.email }],
          firstName: 'Target',
          lastName: 'User',
          lastSignInAt: Date.now(),
        },
      ],
    } as never);
  });

  afterEach(async () => {
    await cleanupUser(TARGET_USER.id);
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('returns user list to admin', async () => {
    const app = createAdminApp(ADMIN_ID);
    const res = await app.request('/api/admin/users');

    expect(res.status).toBe(200);
    const body = (await res.json()) as unknown[];
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThanOrEqual(1);
  });

  it('returned rows include required fields', async () => {
    const app = createAdminApp(ADMIN_ID);
    const res = await app.request('/api/admin/users');
    const body = (await res.json()) as Record<string, unknown>[];

    const row = body.find((u) => u.id === TARGET_USER.id);
    expect(row).toBeDefined();
    expect(row).toHaveProperty('email');
    expect(row).toHaveProperty('subscriptionStatus');
    expect(row).toHaveProperty('creditsRemaining');
    expect(row).toHaveProperty('creditsUsed');
    expect(row).toHaveProperty('foodLogEntries');
    expect(row).toHaveProperty('apiCalls');
    expect(row).toHaveProperty('signedUpAt');
  });

  it('seeded user has correct credits in response', async () => {
    const app = createAdminApp(ADMIN_ID);
    const res = await app.request('/api/admin/users');
    const body = (await res.json()) as Record<string, unknown>[];

    const row = body.find((u) => u.id === TARGET_USER.id);
    expect(row?.creditsRemaining).toBe(15);
  });

  it('returns 403 for a non-admin authenticated user', async () => {
    const app = createAdminApp(NON_ADMIN_ID);
    const res = await app.request('/api/admin/users');

    expect(res.status).toBe(403);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.error).toMatch(/forbidden/i);
  });

  it('returns 503 when ADMIN_USER_ID env var is not configured', async () => {
    vi.stubEnv('ADMIN_USER_ID', '');
    const app = createAdminApp(ADMIN_ID);
    const res = await app.request('/api/admin/users');

    expect(res.status).toBe(503);
  });
});

// ─── POST /api/admin/credits ──────────────────────────────────────────────────

describe('POST /api/admin/credits', () => {
  beforeEach(async () => {
    vi.stubEnv('ADMIN_USER_ID', ADMIN_ID);
    await seedUser(TARGET_USER, 10);
  });

  afterEach(async () => {
    await cleanupUser(TARGET_USER.id);
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('adds credits to a user', async () => {
    const app = createAdminApp(ADMIN_ID);
    const res = await app.request('/api/admin/credits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: TARGET_USER.id, amount: 15 }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.ok).toBe(true);
    expect(body.creditsRemaining).toBe(25);
  });

  it('subtracts credits from a user', async () => {
    const app = createAdminApp(ADMIN_ID);
    const res = await app.request('/api/admin/credits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: TARGET_USER.id, amount: -5 }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.creditsRemaining).toBe(5);
  });

  it('floors credits at 0 — never goes negative', async () => {
    const app = createAdminApp(ADMIN_ID);
    const res = await app.request('/api/admin/credits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: TARGET_USER.id, amount: -999 }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.creditsRemaining).toBe(0);

    const [row] = await db
      .select({ creditsRemaining: userCredits.creditsRemaining })
      .from(userCredits)
      .where(eq(userCredits.userId, TARGET_USER.id));
    expect(row?.creditsRemaining).toBe(0);
  });

  it('persists the change to the database', async () => {
    const app = createAdminApp(ADMIN_ID);
    await app.request('/api/admin/credits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: TARGET_USER.id, amount: 20 }),
    });

    const [row] = await db
      .select({ creditsRemaining: userCredits.creditsRemaining })
      .from(userCredits)
      .where(eq(userCredits.userId, TARGET_USER.id));
    expect(row?.creditsRemaining).toBe(30);
  });

  it('returns 404 for a userId that does not exist', async () => {
    const app = createAdminApp(ADMIN_ID);
    const res = await app.request('/api/admin/credits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'user_does_not_exist', amount: 10 }),
    });

    expect(res.status).toBe(404);
  });

  it('returns 400 for missing userId', async () => {
    const app = createAdminApp(ADMIN_ID);
    const res = await app.request('/api/admin/credits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 10 }),
    });

    expect(res.status).toBe(400);
  });

  it('returns 400 for non-integer amount', async () => {
    const app = createAdminApp(ADMIN_ID);
    const res = await app.request('/api/admin/credits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: TARGET_USER.id, amount: 1.5 }),
    });

    expect(res.status).toBe(400);
  });

  it('returns 400 for malformed JSON body', async () => {
    const app = createAdminApp(ADMIN_ID);
    const res = await app.request('/api/admin/credits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json {{{',
    });

    expect(res.status).toBe(400);
  });

  it('returns 400 for empty string userId', async () => {
    const app = createAdminApp(ADMIN_ID);
    const res = await app.request('/api/admin/credits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: '', amount: 10 }),
    });

    expect(res.status).toBe(400);
  });

  it('returns 403 for non-admin caller', async () => {
    const app = createAdminApp(NON_ADMIN_ID);
    const res = await app.request('/api/admin/credits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: TARGET_USER.id, amount: 10 }),
    });

    expect(res.status).toBe(403);
  });

  it('returns 503 when ADMIN_USER_ID env var is not configured', async () => {
    vi.stubEnv('ADMIN_USER_ID', '');
    const app = createAdminApp(ADMIN_ID);
    const res = await app.request('/api/admin/credits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: TARGET_USER.id, amount: 10 }),
    });

    expect(res.status).toBe(503);
  });

  it('non-admin cannot adjust credits even with valid body', async () => {
    const app = createAdminApp(NON_ADMIN_ID);
    await app.request('/api/admin/credits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: TARGET_USER.id, amount: 999 }),
    });

    // Credits must be unchanged in the DB
    const [row] = await db
      .select({ creditsRemaining: userCredits.creditsRemaining })
      .from(userCredits)
      .where(eq(userCredits.userId, TARGET_USER.id));
    expect(row?.creditsRemaining).toBe(10);
  });
});
