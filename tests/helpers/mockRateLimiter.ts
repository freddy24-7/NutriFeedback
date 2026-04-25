/**
 * Mocks @/lib/redis/client for integration tests.
 *
 * Integration tests should not depend on Upstash being reachable.
 * Rate limiting is a cross-cutting concern tested separately.
 * Import this at the top of each integration test file (before other imports).
 *
 * Usage:
 *   vi.mock('@/lib/redis/client', () => import('../helpers/mockRateLimiter').then(m => m.mockRedisModule()))
 *
 * Or use the simpler inline factory below — see individual test files.
 */

import { vi } from 'vitest';

const allowAll = {
  limit: vi
    .fn()
    .mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: 0,
      pending: Promise.resolve(),
    }),
};

export const mockRedisModule = () => ({
  redis: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
  },
  rateLimits: {
    contact: allowAll,
    aiFoodParse: allowAll,
    aiGenerateTips: allowAll,
    chatAnon: allowAll,
    chatAuth: allowAll,
    barcodeLookup: allowAll,
    paymentsCheckout: allowAll,
    paymentsDiscount: allowAll,
    tipEmail: allowAll,
  },
  cacheKeys: {
    offProduct: (barcode: string) => `off:barcode:${barcode}`,
    usdaFood: (fdcId: string) => `usda:id:${fdcId}`,
    aiParse: (hash: string) => `parse:${hash}`,
    credits: (userId: string) => `credits:${userId}`,
  },
});
