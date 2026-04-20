import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

const redisUrl = process.env['UPSTASH_REDIS_REST_URL'];
const redisToken = process.env['UPSTASH_REDIS_REST_TOKEN'];

if (!redisUrl || !redisToken) {
  throw new Error('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required');
}

export const redis = new Redis({ url: redisUrl, token: redisToken });

// ─── Rate limit configs ───────────────────────────────────────────────────────
// Sliding window rate limiters per endpoint.
// Identifier: userId for authenticated routes, ipHash for anonymous.

export const rateLimits = {
  contact: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, '1 h'),
    prefix: 'rl:contact',
  }),
  aiFoodParse: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    prefix: 'rl:ai:parse',
  }),
  aiGenerateTips: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 h'),
    prefix: 'rl:ai:tips',
  }),
  chatAnon: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 d'),
    prefix: 'rl:chat:anon',
  }),
  chatAuth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, '1 d'),
    prefix: 'rl:chat:auth',
  }),
  barcodeLookup: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '1 m'),
    prefix: 'rl:barcode',
  }),
  paymentsCheckout: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 h'),
    prefix: 'rl:payments:checkout',
  }),
  paymentsDiscount: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 h'),
    prefix: 'rl:payments:discount',
  }),
};

// ─── Cache key helpers ────────────────────────────────────────────────────────

export const cacheKeys = {
  offProduct: (barcode: string) => `off:barcode:${barcode}`,
  usdaFood: (fdcId: string) => `usda:id:${fdcId}`,
  aiParse: (hash: string) => `parse:${hash}`,
  credits: (userId: string) => `credits:${userId}`,
};
