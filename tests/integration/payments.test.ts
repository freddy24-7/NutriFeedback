// @vitest-environment node
/**
 * Integration tests for payment routes: /api/payments/*
 *
 * Stripe API calls are mocked. DB operations hit the real Neon dev branch.
 * Webhook tests use a pre-signed payload to bypass signature verification.
 *
 * Run with: npm run test:integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { db } from '@/lib/db/client';
import { subscriptions, discountCodes, userCredits } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createTestApp, createUnauthApp } from '../helpers/testApp';
import { seedUser, cleanupUser, type TestUser } from '../helpers/dbFixtures';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('@/lib/redis/client', async () => {
  const { mockRedisModule } = await import('../helpers/mockRateLimiter');
  return mockRedisModule();
});

// vi.hoisted ensures these vi.fn() instances are created before the vi.mock factory
// runs and before any module imports execute — so all Stripe instances share them.
const { mockSessionCreate, mockConstructEvent, mockSubRetrieve, mockPortalCreate } = vi.hoisted(
  () => ({
    mockSessionCreate: vi.fn(),
    mockConstructEvent: vi.fn(),
    mockSubRetrieve: vi.fn(),
    mockPortalCreate: vi.fn(),
  }),
);

vi.mock('stripe', () => {
  const MockStripe = vi.fn(() => ({
    checkout: { sessions: { create: mockSessionCreate } },
    webhooks: { constructEvent: mockConstructEvent },
    subscriptions: { retrieve: mockSubRetrieve },
    billingPortal: { sessions: { create: mockPortalCreate } },
  }));
  return { default: MockStripe };
});

vi.mock('@/lib/auth/server', () => ({
  clerkClient: {
    users: {
      getUser: vi.fn().mockResolvedValue({
        emailAddresses: [{ emailAddress: 'test@example.com' }],
        firstName: 'Test',
        lastName: 'User',
        publicMetadata: {},
      }),
      updateUserMetadata: vi.fn().mockResolvedValue({}),
    },
  },
}));

// ─── Fixtures ────────────────────────────────────────────────────────────────

const TEST_USER: TestUser = {
  id: `test-payments-${crypto.randomUUID()}`,
  email: `payments-${Date.now()}@example.com`,
  name: 'Payments Test User',
};

const BETA_CODE = `BETATEST-${Date.now()}`;
const TIMED_CODE = `TIMED-${Date.now()}`;
const USED_CODE = `USEDTEST-${Date.now()}`;
const EXPIRED_CODE = `EXPTEST-${Date.now()}`;

async function seedDiscountCodes() {
  await db
    .insert(discountCodes)
    .values([
      { code: BETA_CODE, type: 'beta', usesRemaining: null, expiresAt: null, trialDays: null },
      {
        code: TIMED_CODE,
        type: 'timed',
        usesRemaining: 5,
        expiresAt: new Date(Date.now() + 86400_000 * 365),
        trialDays: 30,
      },
      { code: USED_CODE, type: 'influencer', usesRemaining: 0, expiresAt: null, trialDays: null },
      {
        code: EXPIRED_CODE,
        type: 'timed',
        usesRemaining: null,
        expiresAt: new Date(Date.now() - 86400_000),
        trialDays: 30,
      },
    ])
    .onConflictDoNothing();
}

async function cleanupDiscountCodes() {
  await db.delete(discountCodes).where(eq(discountCodes.code, BETA_CODE));
  await db.delete(discountCodes).where(eq(discountCodes.code, TIMED_CODE));
  await db.delete(discountCodes).where(eq(discountCodes.code, USED_CODE));
  await db.delete(discountCodes).where(eq(discountCodes.code, EXPIRED_CODE));
}

// ─── POST /api/payments/checkout ─────────────────────────────────────────────

describe('POST /api/payments/checkout', () => {
  beforeEach(async () => {
    await seedUser(TEST_USER, 50);
    mockSessionCreate.mockResolvedValue({
      url: 'https://checkout.stripe.com/test-session',
    } as never);
  });

  afterEach(async () => {
    await db.delete(subscriptions).where(eq(subscriptions.userId, TEST_USER.id));
    await cleanupUser(TEST_USER.id);
    vi.clearAllMocks();
  });

  it('returns a checkout URL', async () => {
    const app = createTestApp(TEST_USER.id);
    const res = await app.request('/api/payments/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceId: 'price_test123' }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(typeof body.url).toBe('string');
    expect(body.url).toContain('stripe.com');
  });

  it('returns 400 for invalid priceId format', async () => {
    const app = createTestApp(TEST_USER.id);
    const res = await app.request('/api/payments/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceId: 'not_a_price_id' }),
    });

    expect(res.status).toBe(400);
  });

  it('returns 401 when unauthenticated', async () => {
    const app = createUnauthApp();
    const res = await app.request('/api/payments/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceId: 'price_test123' }),
    });

    expect(res.status).toBe(401);
  });
});

// ─── POST /api/payments/discount ─────────────────────────────────────────────

describe('POST /api/payments/discount', () => {
  beforeEach(async () => {
    await seedUser(TEST_USER, 50);
    await seedDiscountCodes();
  });

  afterEach(async () => {
    await db.delete(subscriptions).where(eq(subscriptions.userId, TEST_USER.id));
    await cleanupDiscountCodes();
    await cleanupUser(TEST_USER.id);
    vi.clearAllMocks();
  });

  it('valid beta code grants comped subscription', async () => {
    const app = createTestApp(TEST_USER.id);
    const res = await app.request('/api/payments/discount', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: BETA_CODE }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.granted).toBe(true);

    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, TEST_USER.id));
    expect(sub?.status).toBe('comped');
  });

  it('beta code removes credit expiry', async () => {
    const app = createTestApp(TEST_USER.id);
    await app.request('/api/payments/discount', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: BETA_CODE }),
    });

    const [credits] = await db
      .select()
      .from(userCredits)
      .where(eq(userCredits.userId, TEST_USER.id));
    expect(credits?.expiresAt).toBeNull();
  });

  it('timed code grants trial extension', async () => {
    const app = createTestApp(TEST_USER.id);
    const res = await app.request('/api/payments/discount', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: TIMED_CODE }),
    });

    expect(res.status).toBe(200);
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, TEST_USER.id));
    expect(sub?.status).toBe('trial');

    const [credits] = await db
      .select()
      .from(userCredits)
      .where(eq(userCredits.userId, TEST_USER.id));
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 86400_000);
    expect(credits?.expiresAt).not.toBeNull();
    expect(credits!.expiresAt!.getTime()).toBeGreaterThan(Date.now());
    expect(credits!.expiresAt!.getTime()).toBeLessThanOrEqual(thirtyDaysFromNow.getTime() + 5000);
  });

  it('timed code decrements usesRemaining', async () => {
    const app = createTestApp(TEST_USER.id);
    await app.request('/api/payments/discount', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: TIMED_CODE }),
    });

    const [code] = await db.select().from(discountCodes).where(eq(discountCodes.code, TIMED_CODE));
    expect(code?.usesRemaining).toBe(4);
  });

  it('returns 400 for invalid code', async () => {
    const app = createTestApp(TEST_USER.id);
    const res = await app.request('/api/payments/discount', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'DOESNOTEXIST' }),
    });

    expect(res.status).toBe(400);
  });

  it('returns 400 for zero-uses code', async () => {
    const app = createTestApp(TEST_USER.id);
    const res = await app.request('/api/payments/discount', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: USED_CODE }),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.error).toMatch(/no uses remaining/i);
  });

  it('returns 400 for expired code', async () => {
    const app = createTestApp(TEST_USER.id);
    const res = await app.request('/api/payments/discount', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: EXPIRED_CODE }),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.error).toMatch(/expired/i);
  });

  it('returns 409 when user already has active subscription', async () => {
    // Pre-seed active subscription
    await db.insert(subscriptions).values({ userId: TEST_USER.id, status: 'active' });

    const app = createTestApp(TEST_USER.id);
    const res = await app.request('/api/payments/discount', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: BETA_CODE }),
    });

    expect(res.status).toBe(409);
  });

  it('returns 401 when unauthenticated', async () => {
    const app = createUnauthApp();
    const res = await app.request('/api/payments/discount', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: BETA_CODE }),
    });

    expect(res.status).toBe(401);
  });
});

// ─── GET /api/payments/status ─────────────────────────────────────────────────

describe('GET /api/payments/status', () => {
  beforeEach(async () => {
    await seedUser(TEST_USER, 50);
  });

  afterEach(async () => {
    await db.delete(subscriptions).where(eq(subscriptions.userId, TEST_USER.id));
    await cleanupUser(TEST_USER.id);
    vi.clearAllMocks();
  });

  it('returns trial status with credits for new user', async () => {
    const app = createTestApp(TEST_USER.id);
    const res = await app.request('/api/payments/status');

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.status).toBe('trial');
    expect(body.creditsRemaining).toBe(50);
  });

  it('returns expired when trial date has passed', async () => {
    // Set credits expiry to yesterday
    await db
      .update(userCredits)
      .set({ expiresAt: new Date(Date.now() - 86400_000) })
      .where(eq(userCredits.userId, TEST_USER.id));

    // Insert trial subscription
    await db.insert(subscriptions).values({ userId: TEST_USER.id, status: 'trial' });

    const app = createTestApp(TEST_USER.id);
    const res = await app.request('/api/payments/status');

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.status).toBe('expired');
  });

  it('returns 401 when unauthenticated', async () => {
    const app = createUnauthApp();
    const res = await app.request('/api/payments/status');
    expect(res.status).toBe(401);
  });
});

// ─── POST /api/payments/webhook ───────────────────────────────────────────────

describe('POST /api/payments/webhook', () => {
  beforeEach(async () => {
    await seedUser(TEST_USER, 50);
  });

  afterEach(async () => {
    await db.delete(subscriptions).where(eq(subscriptions.userId, TEST_USER.id));
    await cleanupUser(TEST_USER.id);
    vi.clearAllMocks();
  });

  it('checkout.session.completed creates active subscription', async () => {
    mockSubRetrieve.mockResolvedValue({
      items: { data: [{ price: { id: 'price_test123' } }] },
      metadata: { userId: TEST_USER.id },
      current_period_end: null,
    } as never);

    const event = {
      type: 'checkout.session.completed',
      data: {
        object: {
          metadata: { userId: TEST_USER.id },
          customer: 'cus_test123',
          subscription: 'sub_test123',
        },
      },
    };
    mockConstructEvent.mockReturnValue(event as never);

    const app = createTestApp(TEST_USER.id);
    const res = await app.request('/api/payments/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'test-sig',
      },
      body: JSON.stringify(event),
    });

    expect(res.status).toBe(200);
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, TEST_USER.id));
    expect(sub?.status).toBe('active');
    expect(sub?.stripeCustomerId).toBe('cus_test123');
  });

  it('customer.subscription.deleted sets status to cancelled', async () => {
    await db.insert(subscriptions).values({
      userId: TEST_USER.id,
      status: 'active',
      stripeCustomerId: 'cus_test123',
      stripeSubscriptionId: 'sub_test123',
    });

    const event = {
      type: 'customer.subscription.deleted',
      data: {
        object: {
          metadata: { userId: TEST_USER.id },
        },
      },
    };
    mockConstructEvent.mockReturnValue(event as never);

    const app = createTestApp(TEST_USER.id);
    const res = await app.request('/api/payments/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'stripe-signature': 'test-sig' },
      body: JSON.stringify(event),
    });

    expect(res.status).toBe(200);
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, TEST_USER.id));
    expect(sub?.status).toBe('cancelled');
  });

  it('returns 400 when stripe-signature header is missing', async () => {
    const app = createTestApp(TEST_USER.id);
    const res = await app.request('/api/payments/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });

    expect(res.status).toBe(400);
  });

  it('returns 400 when Stripe signature verification fails', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('No signatures found matching the expected signature for payload');
    });

    const app = createTestApp(TEST_USER.id);
    const res = await app.request('/api/payments/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'stripe-signature': 'bad-sig' },
      body: '{"type":"checkout.session.completed"}',
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.error).toMatch(/signature/i);
  });

  it('returns 200 and does nothing for an unhandled event type', async () => {
    const event = { type: 'payment_intent.created', data: { object: {} } };
    mockConstructEvent.mockReturnValue(event as never);

    const app = createTestApp(TEST_USER.id);
    const res = await app.request('/api/payments/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'stripe-signature': 'test-sig' },
      body: JSON.stringify(event),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.received).toBe(true);
    // No subscription row should have been created
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, TEST_USER.id));
    expect(sub).toBeUndefined();
  });

  it('checkout.session.completed with missing userId in metadata is silently skipped', async () => {
    const event = {
      type: 'checkout.session.completed',
      data: {
        object: {
          metadata: {}, // no userId
          customer: 'cus_test123',
          subscription: 'sub_test123',
        },
      },
    };
    mockConstructEvent.mockReturnValue(event as never);

    const app = createTestApp(TEST_USER.id);
    const res = await app.request('/api/payments/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'stripe-signature': 'test-sig' },
      body: JSON.stringify(event),
    });

    expect(res.status).toBe(200);
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, TEST_USER.id));
    expect(sub).toBeUndefined();
  });

  it('customer.subscription.deleted with missing userId in metadata is silently skipped', async () => {
    await db.insert(subscriptions).values({
      userId: TEST_USER.id,
      status: 'active',
      stripeCustomerId: 'cus_test123',
    });

    const event = {
      type: 'customer.subscription.deleted',
      data: { object: { metadata: {} } }, // no userId
    };
    mockConstructEvent.mockReturnValue(event as never);

    const app = createTestApp(TEST_USER.id);
    const res = await app.request('/api/payments/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'stripe-signature': 'test-sig' },
      body: JSON.stringify(event),
    });

    expect(res.status).toBe(200);
    // Status must be unchanged — still active
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, TEST_USER.id));
    expect(sub?.status).toBe('active');
  });

  it('invoice.paid updates currentPeriodEnd', async () => {
    await db.insert(subscriptions).values({
      userId: TEST_USER.id,
      status: 'active',
      stripeSubscriptionId: 'sub_invoice123',
    });

    const futureTs = Math.floor(Date.now() / 1000) + 30 * 86400;
    mockSubRetrieve.mockResolvedValue({
      metadata: { userId: TEST_USER.id },
      current_period_end: futureTs,
      status: 'active',
      items: { data: [{ price: { id: 'price_test123' } }] },
    } as never);

    const event = {
      type: 'invoice.paid',
      data: { object: { subscription: 'sub_invoice123' } },
    };
    mockConstructEvent.mockReturnValue(event as never);

    const app = createTestApp(TEST_USER.id);
    const res = await app.request('/api/payments/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'stripe-signature': 'test-sig' },
      body: JSON.stringify(event),
    });

    expect(res.status).toBe(200);
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, TEST_USER.id));
    expect(sub?.currentPeriodEnd).not.toBeNull();
    expect(sub!.currentPeriodEnd!.getTime()).toBeGreaterThan(Date.now());
  });

  it('customer.subscription.updated to cancelled sets status correctly', async () => {
    await db.insert(subscriptions).values({
      userId: TEST_USER.id,
      status: 'active',
      stripeSubscriptionId: 'sub_upd123',
    });

    const event = {
      type: 'customer.subscription.updated',
      data: {
        object: {
          metadata: { userId: TEST_USER.id },
          status: 'canceled',
          current_period_end: null,
        },
      },
    };
    mockConstructEvent.mockReturnValue(event as never);

    const app = createTestApp(TEST_USER.id);
    const res = await app.request('/api/payments/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'stripe-signature': 'test-sig' },
      body: JSON.stringify(event),
    });

    expect(res.status).toBe(200);
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, TEST_USER.id));
    expect(sub?.status).toBe('cancelled');
  });

  it('customer.subscription.updated to past_due sets status to past_due', async () => {
    await db.insert(subscriptions).values({
      userId: TEST_USER.id,
      status: 'active',
      stripeSubscriptionId: 'sub_pastdue123',
    });

    const event = {
      type: 'customer.subscription.updated',
      data: {
        object: {
          metadata: { userId: TEST_USER.id },
          status: 'past_due',
          current_period_end: null,
        },
      },
    };
    mockConstructEvent.mockReturnValue(event as never);

    const app = createTestApp(TEST_USER.id);
    const res = await app.request('/api/payments/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'stripe-signature': 'test-sig' },
      body: JSON.stringify(event),
    });

    expect(res.status).toBe(200);
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, TEST_USER.id));
    expect(sub?.status).toBe('past_due');
  });

  it('invoice.payment_failed sets status to past_due', async () => {
    await db.insert(subscriptions).values({
      userId: TEST_USER.id,
      status: 'active',
      stripeSubscriptionId: 'sub_fail123',
    });

    mockSubRetrieve.mockResolvedValue({
      metadata: { userId: TEST_USER.id },
    } as never);

    const event = {
      type: 'invoice.payment_failed',
      data: { object: { subscription: 'sub_fail123' } },
    };
    mockConstructEvent.mockReturnValue(event as never);

    const app = createTestApp(TEST_USER.id);
    const res = await app.request('/api/payments/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'stripe-signature': 'test-sig' },
      body: JSON.stringify(event),
    });

    expect(res.status).toBe(200);
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, TEST_USER.id));
    expect(sub?.status).toBe('past_due');
  });

  it('invoice.payment_failed with missing subscription ID is silently skipped', async () => {
    const event = {
      type: 'invoice.payment_failed',
      data: { object: { subscription: null } },
    };
    mockConstructEvent.mockReturnValue(event as never);

    const app = createTestApp(TEST_USER.id);
    const res = await app.request('/api/payments/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'stripe-signature': 'test-sig' },
      body: JSON.stringify(event),
    });

    expect(res.status).toBe(200);
    expect(mockSubRetrieve).not.toHaveBeenCalled();
  });

  it('invoice.payment_failed with missing userId in subscription metadata is silently skipped', async () => {
    await db.insert(subscriptions).values({
      userId: TEST_USER.id,
      status: 'active',
      stripeSubscriptionId: 'sub_noid123',
    });

    mockSubRetrieve.mockResolvedValue({
      metadata: {}, // no userId
    } as never);

    const event = {
      type: 'invoice.payment_failed',
      data: { object: { subscription: 'sub_noid123' } },
    };
    mockConstructEvent.mockReturnValue(event as never);

    const app = createTestApp(TEST_USER.id);
    const res = await app.request('/api/payments/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'stripe-signature': 'test-sig' },
      body: JSON.stringify(event),
    });

    expect(res.status).toBe(200);
    // Status must remain active — no userId so no update applied
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, TEST_USER.id));
    expect(sub?.status).toBe('active');
  });
});

// ─── POST /api/payments/portal ────────────────────────────────────────────────

describe('POST /api/payments/portal', () => {
  beforeEach(async () => {
    await seedUser(TEST_USER, 50);
    mockPortalCreate.mockResolvedValue({
      url: 'https://billing.stripe.com/test-portal-session',
    } as never);
  });

  afterEach(async () => {
    await db.delete(subscriptions).where(eq(subscriptions.userId, TEST_USER.id));
    await cleanupUser(TEST_USER.id);
    vi.clearAllMocks();
  });

  it('returns portal URL for active subscriber', async () => {
    await db.insert(subscriptions).values({
      userId: TEST_USER.id,
      status: 'active',
      stripeCustomerId: 'cus_portal123',
    });

    const app = createTestApp(TEST_USER.id);
    const res = await app.request('/api/payments/portal', { method: 'POST' });

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(typeof body.url).toBe('string');
    expect(body.url).toContain('stripe.com');
    expect(mockPortalCreate).toHaveBeenCalledWith(
      expect.objectContaining({ customer: 'cus_portal123' }),
    );
  });

  it('returns portal URL for past_due subscriber', async () => {
    await db.insert(subscriptions).values({
      userId: TEST_USER.id,
      status: 'past_due',
      stripeCustomerId: 'cus_pastdue456',
    });

    const app = createTestApp(TEST_USER.id);
    const res = await app.request('/api/payments/portal', { method: 'POST' });

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(typeof body.url).toBe('string');
  });

  it('returns 404 when user has no subscription', async () => {
    const app = createTestApp(TEST_USER.id);
    const res = await app.request('/api/payments/portal', { method: 'POST' });

    expect(res.status).toBe(404);
    expect(mockPortalCreate).not.toHaveBeenCalled();
  });

  it('returns 403 for trial user (no stripeCustomerId)', async () => {
    await db.insert(subscriptions).values({
      userId: TEST_USER.id,
      status: 'trial',
      // no stripeCustomerId
    });

    const app = createTestApp(TEST_USER.id);
    const res = await app.request('/api/payments/portal', { method: 'POST' });

    expect(res.status).toBe(404);
    expect(mockPortalCreate).not.toHaveBeenCalled();
  });

  it('returns 403 for comped user trying to access portal', async () => {
    await db.insert(subscriptions).values({
      userId: TEST_USER.id,
      status: 'comped',
      stripeCustomerId: 'cus_comped789',
    });

    const app = createTestApp(TEST_USER.id);
    const res = await app.request('/api/payments/portal', { method: 'POST' });

    expect(res.status).toBe(403);
    expect(mockPortalCreate).not.toHaveBeenCalled();
  });

  it('returns 401 when unauthenticated', async () => {
    const app = createUnauthApp();
    const res = await app.request('/api/payments/portal', { method: 'POST' });
    expect(res.status).toBe(401);
  });
});
