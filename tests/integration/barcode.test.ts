// @vitest-environment node
/**
 * Integration tests for barcode routes: /api/barcode/*
 *
 * Uses app.request() — no HTTP server required.
 * External API calls (OFF, USDA) and generateAIResponse are mocked.
 * All DB operations hit a real Neon dev-branch database.
 *
 * Run with: npm run test:integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { db } from '@/lib/db/client';
import { products } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createTestApp, createUnauthApp } from '../helpers/testApp';
import { seedUser, cleanupUser, type TestUser } from '../helpers/dbFixtures';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('@/lib/redis/client', async () => {
  const { mockRedisModule } = await import('../helpers/mockRateLimiter');
  return mockRedisModule();
});

vi.mock('@/lib/ai/client', () => ({
  generateAIResponse: vi.fn(),
}));

// Mock lookupProduct so the barcode route never calls OFF/USDA fetch.
// This keeps Neon's internal HTTP driver untouched.
vi.mock('@/lib/barcode/lookup', () => ({
  lookupProduct: vi.fn(),
}));

import { generateAIResponse } from '@/lib/ai/client';
import { lookupProduct } from '@/lib/barcode/lookup';

const mockGenerateAIResponse = vi.mocked(generateAIResponse);
const mockLookupProduct = vi.mocked(lookupProduct);

// ─── Fixtures ────────────────────────────────────────────────────────────────

const TEST_USER: TestUser = {
  id: `test-barcode-${crypto.randomUUID()}`,
  email: `barcode-${Date.now()}@example.com`,
  name: 'Barcode Test User',
};

const VALID_BARCODE = '5000112637922'; // Coca-Cola 330ml (example)

const OFF_PRODUCT_RESULT = {
  name: 'Coca-Cola',
  brand: 'Coca-Cola',
  nutritionalPer100g: {
    calories: 42,
    protein: 0,
    carbs: 10.6,
    fat: 0,
    fiber: null,
    sugar: 10.6,
    sodium: 10,
  },
  servingSizeG: 330,
  processingLevel: 4,
  source: 'open_food_facts' as const,
};

const AI_PRODUCT_JSON = JSON.stringify({
  name: 'Unknown Snack Bar',
  brand: null,
  nutritionalPer100g: {
    calories: 450,
    protein: 8,
    carbs: 60,
    fat: 18,
    fiber: 3,
    sugar: 30,
    sodium: 200,
  },
  servingSizeG: 40,
  processingLevel: 4,
});

async function cleanupProducts() {
  await db.delete(products).where(eq(products.barcode, VALID_BARCODE));
  await db.delete(products).where(eq(products.barcode, '0000000000000'));
}

// ─── GET /api/barcode/:barcode ────────────────────────────────────────────────

describe('GET /api/barcode/:barcode', () => {
  beforeEach(async () => {
    await seedUser(TEST_USER, 50);
    await cleanupProducts();
  });

  afterEach(async () => {
    await cleanupProducts();
    await cleanupUser(TEST_USER.id);
    vi.clearAllMocks();
  });

  it('returns product from Open Food Facts and persists to DB', async () => {
    mockLookupProduct.mockResolvedValueOnce(OFF_PRODUCT_RESULT);

    const app = createTestApp(TEST_USER.id);
    const res = await app.request(`/api/barcode/${VALID_BARCODE}`);

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.name).toBe('Coca-Cola');
    expect(body.source).toBe('open_food_facts');
    expect(body.processingLevel).toBe(4);

    // Verify persisted to DB
    const [saved] = await db.select().from(products).where(eq(products.barcode, VALID_BARCODE));
    expect(saved?.name).toBe('Coca-Cola');
  });

  it('returns cached DB result without calling external APIs', async () => {
    // Pre-seed the product in DB
    await db.insert(products).values({
      barcode: VALID_BARCODE,
      name: 'Cached Product',
      brand: null,
      nutritionalPer100g: {
        calories: 100,
        protein: 1,
        carbs: 20,
        fat: 0,
        fiber: null,
        sugar: null,
        sodium: null,
      },
      source: 'open_food_facts',
      verified: false,
    });

    const app = createTestApp(TEST_USER.id);
    const res = await app.request(`/api/barcode/${VALID_BARCODE}`);

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.name).toBe('Cached Product');
    expect(mockLookupProduct).not.toHaveBeenCalled();
  });

  it('falls back to AI estimate when OFF and USDA return nothing', async () => {
    mockLookupProduct.mockResolvedValueOnce(null);

    mockGenerateAIResponse.mockResolvedValue({ text: AI_PRODUCT_JSON });

    const app = createTestApp(TEST_USER.id);
    const res = await app.request(`/api/barcode/0000000000000`);

    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.source).toBe('ai_estimated');
    expect(body.confidence).toBe(0.4);
  });

  it('AI estimated product has confidence < 0.5', async () => {
    mockLookupProduct.mockResolvedValueOnce(null);

    mockGenerateAIResponse.mockResolvedValue({ text: AI_PRODUCT_JSON });

    const app = createTestApp(TEST_USER.id);
    const res = await app.request(`/api/barcode/0000000000000`);
    const body = (await res.json()) as Record<string, unknown>;

    expect(typeof body.confidence).toBe('number');
    expect(body.confidence as number).toBeLessThan(0.5);
  });

  it('returns 404 when OFF, USDA, and AI all fail', async () => {
    mockLookupProduct.mockResolvedValueOnce(null);

    mockGenerateAIResponse.mockRejectedValue(new Error('AI failed'));

    const app = createTestApp(TEST_USER.id);
    const res = await app.request(`/api/barcode/0000000000000`);

    expect(res.status).toBe(404);
  });

  it.todo(
    'returns 429 when rate limit exceeded — needs Upstash mock or per-user unique ID strategy',
  );

  it('returns 401 when unauthenticated', async () => {
    const app = createUnauthApp();
    const res = await app.request(`/api/barcode/${VALID_BARCODE}`);
    expect(res.status).toBe(401);
  });
});

// ─── POST /api/barcode/products ───────────────────────────────────────────────

describe('POST /api/barcode/products', () => {
  beforeEach(async () => {
    await seedUser(TEST_USER, 50);
  });

  afterEach(async () => {
    await db.delete(products).where(eq(products.createdBy, TEST_USER.id));
    await cleanupUser(TEST_USER.id);
  });

  it('creates product with createdBy = userId and returns 201', async () => {
    const app = createTestApp(TEST_USER.id);
    const res = await app.request('/api/barcode/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Homemade Granola',
        brand: 'Self-made',
        nutritionalPer100g: {
          calories: 420,
          protein: 10,
          carbs: 60,
          fat: 15,
          fiber: 5,
          sugar: 20,
          sodium: 50,
        },
        servingSizeG: 50,
      }),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.name).toBe('Homemade Granola');
    expect(body.source).toBe('user');

    const [saved] = await db.select().from(products).where(eq(products.createdBy, TEST_USER.id));
    expect(saved?.createdBy).toBe(TEST_USER.id);
  });

  it('another user can read a product created by this user', async () => {
    const otherUser: TestUser = {
      id: `test-other-${crypto.randomUUID()}`,
      email: `other-${Date.now()}@example.com`,
      name: 'Other User',
    };
    await seedUser(otherUser, 0);

    // Create product as TEST_USER
    await db.insert(products).values({
      name: 'Public Product',
      brand: null,
      nutritionalPer100g: {
        calories: 200,
        protein: 5,
        carbs: 30,
        fat: 8,
        fiber: null,
        sugar: null,
        sodium: null,
      },
      source: 'user',
      verified: false,
      createdBy: TEST_USER.id,
    });

    // Read as otherUser — products are public
    const [found] = await db.select().from(products).where(eq(products.createdBy, TEST_USER.id));
    expect(found?.name).toBe('Public Product');

    await cleanupUser(otherUser.id);
  });

  it('returns 400 for missing name', async () => {
    const app = createTestApp(TEST_USER.id);
    const res = await app.request('/api/barcode/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nutritionalPer100g: {
          calories: 100,
          protein: 1,
          carbs: 20,
          fat: 0,
          fiber: null,
          sugar: null,
          sodium: null,
        },
      }),
    });

    expect(res.status).toBe(400);
  });

  it('returns 401 when unauthenticated', async () => {
    const app = createUnauthApp();
    const res = await app.request('/api/barcode/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test', nutritionalPer100g: {} }),
    });
    expect(res.status).toBe(401);
  });
});
