// @vitest-environment node
/**
 * Integration tests for AI routes: /api/ai/*
 *
 * Uses app.request() — no HTTP server required.
 * generateAIResponse and Resend are mocked — no real API calls.
 * All DB operations hit a real Neon dev-branch database.
 *
 * Run with: DATABASE_URL=$DATABASE_URL_DEV npm run test:integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { db } from '@/lib/db/client';
import { userCredits, aiTips } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createTestApp, createUnauthApp } from '../helpers/testApp';
import { seedUser, seedFoodLog, seedTip, cleanupUser, type TestUser } from '../helpers/dbFixtures';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('@/lib/ai/client', () => ({
  generateAIResponse: vi.fn(),
}));

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: vi.fn().mockResolvedValue({ error: null }),
    },
  })),
}));

import { generateAIResponse } from '@/lib/ai/client';

const mockGenerateAIResponse = vi.mocked(generateAIResponse);

// ─── Fixtures ────────────────────────────────────────────────────────────────

const TEST_USER: TestUser = {
  id: `test-ai-${crypto.randomUUID()}`,
  email: `test-ai-${Date.now()}@example.com`,
  name: 'Test User',
};

// Dates spanning 3 distinct days for the tip generation gate
const THREE_DAYS = [
  new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10),
  new Date(Date.now() - 1 * 86400000).toISOString().slice(0, 10),
  new Date().toISOString().slice(0, 10),
];

const VALID_NUTRIENTS_JSON = JSON.stringify({
  calories: 320,
  protein: 12,
  carbs: 45,
  fat: 8,
  fiber: 4,
  sugar: 10,
  sodium: 150,
  servingDescription: '1 bowl',
  confidence: 0.85,
});

const VALID_TIP_JSON = JSON.stringify({
  tipTextEn: 'Eat more vegetables.',
  tipTextNl: 'Eet meer groenten.',
  nutrientsFlagged: ['fibre'],
  severity: 'suggestion',
});

// ─── POST /api/ai/parse-food ─────────────────────────────────────────────────

describe('POST /api/ai/parse-food', () => {
  beforeEach(async () => {
    await seedUser(TEST_USER, 50);
    mockGenerateAIResponse.mockResolvedValue({ text: VALID_NUTRIENTS_JSON });
  });

  afterEach(async () => {
    await cleanupUser(TEST_USER.id);
    vi.clearAllMocks();
  });

  it('returns 201 and saves entry with parsed nutrients', async () => {
    const app = createTestApp(TEST_USER.id);
    const res = await app.request('/api/ai/parse-food', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: 'Bowl of oatmeal with banana',
        date: THREE_DAYS[2],
        language: 'en',
      }),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.entryId).toBeDefined();
    expect(body.nutrients).toMatchObject({ calories: 320, protein: 12 });
    expect(body.confidence).toBe(0.85);
  });

  it('deducts 1 credit before calling AI', async () => {
    const app = createTestApp(TEST_USER.id);
    await app.request('/api/ai/parse-food', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: 'Apple',
        date: THREE_DAYS[2],
        language: 'en',
      }),
    });

    const [credits] = await db
      .select()
      .from(userCredits)
      .where(eq(userCredits.userId, TEST_USER.id));

    expect(credits?.creditsRemaining).toBe(49);
    expect(credits?.creditsUsed).toBe(1);
  });

  it('refunds 1 credit when AI returns unparseable JSON', async () => {
    mockGenerateAIResponse.mockResolvedValue({ text: 'not valid json' });

    const app = createTestApp(TEST_USER.id);
    const res = await app.request('/api/ai/parse-food', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: 'Mystery food',
        date: THREE_DAYS[2],
        language: 'en',
      }),
    });

    expect(res.status).toBe(500);

    const [credits] = await db
      .select()
      .from(userCredits)
      .where(eq(userCredits.userId, TEST_USER.id));

    // Credits restored to original 50
    expect(credits?.creditsRemaining).toBe(50);
    expect(credits?.creditsUsed).toBe(0);
  });

  it('returns 402 when user has 0 credits', async () => {
    await db
      .update(userCredits)
      .set({ creditsRemaining: 0 })
      .where(eq(userCredits.userId, TEST_USER.id));

    const app = createTestApp(TEST_USER.id);
    const res = await app.request('/api/ai/parse-food', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: 'Salad',
        date: THREE_DAYS[2],
        language: 'en',
      }),
    });

    expect(res.status).toBe(402);
    expect(mockGenerateAIResponse).not.toHaveBeenCalled();
  });

  it('returns 400 for missing description', async () => {
    const app = createTestApp(TEST_USER.id);
    const res = await app.request('/api/ai/parse-food', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: THREE_DAYS[2], language: 'en' }),
    });

    expect(res.status).toBe(400);
    expect(mockGenerateAIResponse).not.toHaveBeenCalled();
  });

  it('returns 401 when unauthenticated', async () => {
    const app = createUnauthApp();
    const res = await app.request('/api/ai/parse-food', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: 'Salad',
        date: THREE_DAYS[2],
        language: 'en',
      }),
    });

    expect(res.status).toBe(401);
  });
});

// ─── POST /api/ai/generate-tips ──────────────────────────────────────────────

describe('POST /api/ai/generate-tips', () => {
  beforeEach(async () => {
    await seedUser(TEST_USER, 50);
    mockGenerateAIResponse.mockResolvedValue({ text: VALID_TIP_JSON });
  });

  afterEach(async () => {
    await cleanupUser(TEST_USER.id);
    vi.clearAllMocks();
  });

  it('returns 200 and saves bilingual tip to DB', async () => {
    await seedFoodLog(TEST_USER.id, THREE_DAYS);

    const app = createTestApp(TEST_USER.id);
    const res = await app.request('/api/ai/generate-tips', {
      method: 'POST',
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.tipTextEn).toBe('Eat more vegetables.');
    expect(body.tipTextNl).toBe('Eet meer groenten.');
    expect(body.id).toBeDefined();
  });

  it('deducts 2 credits before calling AI', async () => {
    await seedFoodLog(TEST_USER.id, THREE_DAYS);

    const app = createTestApp(TEST_USER.id);
    await app.request('/api/ai/generate-tips', { method: 'POST' });

    const [credits] = await db
      .select()
      .from(userCredits)
      .where(eq(userCredits.userId, TEST_USER.id));

    expect(credits?.creditsRemaining).toBe(48);
    expect(credits?.creditsUsed).toBe(2);
  });

  it('refunds 2 credits when AI fails', async () => {
    await seedFoodLog(TEST_USER.id, THREE_DAYS);
    mockGenerateAIResponse.mockRejectedValue(new Error('AI unavailable'));

    const app = createTestApp(TEST_USER.id);
    const res = await app.request('/api/ai/generate-tips', { method: 'POST' });

    expect(res.status).toBe(500);

    const [credits] = await db
      .select()
      .from(userCredits)
      .where(eq(userCredits.userId, TEST_USER.id));

    expect(credits?.creditsRemaining).toBe(50);
  });

  it('returns 422 when fewer than 3 distinct log days exist', async () => {
    await seedFoodLog(TEST_USER.id, [THREE_DAYS[0], THREE_DAYS[1]]);

    const app = createTestApp(TEST_USER.id);
    const res = await app.request('/api/ai/generate-tips', { method: 'POST' });

    expect(res.status).toBe(422);
    expect(mockGenerateAIResponse).not.toHaveBeenCalled();
  });

  it('returns 402 when user has fewer than 2 credits', async () => {
    await seedFoodLog(TEST_USER.id, THREE_DAYS);
    await db
      .update(userCredits)
      .set({ creditsRemaining: 1 })
      .where(eq(userCredits.userId, TEST_USER.id));

    const app = createTestApp(TEST_USER.id);
    const res = await app.request('/api/ai/generate-tips', { method: 'POST' });

    expect(res.status).toBe(402);
    expect(mockGenerateAIResponse).not.toHaveBeenCalled();
  });

  it('returns 401 when unauthenticated', async () => {
    const app = createUnauthApp();
    const res = await app.request('/api/ai/generate-tips', { method: 'POST' });
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/ai/tips ────────────────────────────────────────────────────────

describe('GET /api/ai/tips', () => {
  beforeEach(async () => {
    await seedUser(TEST_USER, 50);
  });

  afterEach(async () => {
    await cleanupUser(TEST_USER.id);
  });

  it('returns active tips, newest first', async () => {
    await seedTip(TEST_USER.id, { tipTextEn: 'First tip' });
    await seedTip(TEST_USER.id, { tipTextEn: 'Second tip' });

    const app = createTestApp(TEST_USER.id);
    const res = await app.request('/api/ai/tips');

    expect(res.status).toBe(200);
    const body = (await res.json()) as Array<{ tipTextEn: string }>;
    expect(body).toHaveLength(2);
    expect(body[0]!.tipTextEn).toBe('Second tip');
  });

  it('excludes dismissed tips', async () => {
    await seedTip(TEST_USER.id, { tipTextEn: 'Active tip' });
    await seedTip(TEST_USER.id, {
      tipTextEn: 'Dismissed tip',
      dismissedAt: new Date(),
    });

    const app = createTestApp(TEST_USER.id);
    const res = await app.request('/api/ai/tips');
    const body = (await res.json()) as Array<{ tipTextEn: string }>;

    expect(body).toHaveLength(1);
    expect(body[0]!.tipTextEn).toBe('Active tip');
  });

  it('returns empty array when no active tips exist', async () => {
    const app = createTestApp(TEST_USER.id);
    const res = await app.request('/api/ai/tips');
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it('does not return tips belonging to another user', async () => {
    const otherUser: TestUser = {
      id: `test-other-${crypto.randomUUID()}`,
      email: `other-${Date.now()}@example.com`,
      name: 'Other User',
    };
    await seedUser(otherUser, 0);
    await seedTip(otherUser.id, { tipTextEn: 'Other user tip' });

    const app = createTestApp(TEST_USER.id);
    const res = await app.request('/api/ai/tips');
    const body = (await res.json()) as unknown[];

    expect(body).toHaveLength(0);

    await cleanupUser(otherUser.id);
  });

  it('returns 401 when unauthenticated', async () => {
    const app = createUnauthApp();
    const res = await app.request('/api/ai/tips');
    expect(res.status).toBe(401);
  });
});

// ─── POST /api/ai/tips/:id/dismiss ───────────────────────────────────────────

describe('POST /api/ai/tips/:id/dismiss', () => {
  beforeEach(async () => {
    await seedUser(TEST_USER, 50);
  });

  afterEach(async () => {
    await cleanupUser(TEST_USER.id);
  });

  it('sets dismissedAt and returns { ok: true }', async () => {
    const tipId = await seedTip(TEST_USER.id);

    const app = createTestApp(TEST_USER.id);
    const res = await app.request(`/api/ai/tips/${tipId}/dismiss`, {
      method: 'POST',
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });

    const [tip] = await db
      .select({ dismissedAt: aiTips.dismissedAt })
      .from(aiTips)
      .where(eq(aiTips.id, tipId));

    expect(tip?.dismissedAt).not.toBeNull();
  });

  it('returns 404 when tip belongs to a different user', async () => {
    const otherUser: TestUser = {
      id: `test-other-${crypto.randomUUID()}`,
      email: `other-${Date.now()}@example.com`,
      name: 'Other User',
    };
    await seedUser(otherUser, 0);
    const otherTipId = await seedTip(otherUser.id);

    const app = createTestApp(TEST_USER.id);
    const res = await app.request(`/api/ai/tips/${otherTipId}/dismiss`, {
      method: 'POST',
    });

    expect(res.status).toBe(404);

    await cleanupUser(otherUser.id);
  });

  it('returns 404 for a non-existent tip ID', async () => {
    const app = createTestApp(TEST_USER.id);
    const res = await app.request(`/api/ai/tips/${crypto.randomUUID()}/dismiss`, {
      method: 'POST',
    });
    expect(res.status).toBe(404);
  });

  it('returns 401 when unauthenticated', async () => {
    const tipId = await seedTip(TEST_USER.id);
    const app = createUnauthApp();
    const res = await app.request(`/api/ai/tips/${tipId}/dismiss`, {
      method: 'POST',
    });
    expect(res.status).toBe(401);
  });
});

// ─── POST /api/ai/email-tips ─────────────────────────────────────────────────
// Each test gets its own fresh user so the 1/day Upstash rate limit
// doesn't bleed between tests.

describe('POST /api/ai/email-tips', () => {
  let emailUser: TestUser;

  beforeEach(async () => {
    emailUser = {
      id: `test-email-${crypto.randomUUID()}`,
      email: `email-${Date.now()}-${Math.random()}@example.com`,
      name: 'Email Test User',
    };
    await seedUser(emailUser, 50);
    process.env['RESEND_API_KEY'] = 'test-key';
    process.env['RESEND_FROM_EMAIL'] = 'test@example.com';
  });

  afterEach(async () => {
    await cleanupUser(emailUser.id);
    vi.clearAllMocks();
  });

  it('sends email for latest active tip and returns { ok: true }', async () => {
    await seedTip(emailUser.id);

    const app = createTestApp(emailUser.id);
    const res = await app.request('/api/ai/email-tips', { method: 'POST' });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
  });

  it('returns 404 when user has no active tips', async () => {
    const app = createTestApp(emailUser.id);
    const res = await app.request('/api/ai/email-tips', { method: 'POST' });
    expect(res.status).toBe(404);
  });

  it('returns 401 when unauthenticated', async () => {
    await seedTip(emailUser.id);
    const app = createUnauthApp();
    const res = await app.request('/api/ai/email-tips', { method: 'POST' });
    expect(res.status).toBe(401);
  });
});
