import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

const redisUrl = process.env['UPSTASH_REDIS_REST_URL'];
const redisToken = process.env['UPSTASH_REDIS_REST_TOKEN'];
const hasRedis = Boolean(redisUrl && redisToken);

let warnedMissingRedis = false;
function warnMissingRedis(): void {
  if (warnedMissingRedis) return;
  warnedMissingRedis = true;
  console.warn(
    '[NutriApp] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not set — rate limits and barcode cache are disabled until configured.',
  );
}

/** `null` when Upstash is not configured (auth and other paths still load). */
export const redis: Redis | null = hasRedis
  ? new Redis({ url: redisUrl as string, token: redisToken as string })
  : null;

function noopRatelimit(): Ratelimit {
  return {
    limit: async () => ({
      success: true,
      limit: 999,
      remaining: 999,
      reset: Date.now() + 3_600_000,
    }),
  } as unknown as Ratelimit;
}

function buildRateLimits(): {
  contact: Ratelimit;
  aiFoodParse: Ratelimit;
  aiGenerateTips: Ratelimit;
  chatAnon: Ratelimit;
  chatAuth: Ratelimit;
  barcodeLookup: Ratelimit;
  paymentsCheckout: Ratelimit;
  paymentsDiscount: Ratelimit;
  tipEmail: Ratelimit;
} {
  if (!hasRedis || redis === null) {
    warnMissingRedis();
    return {
      contact: noopRatelimit(),
      aiFoodParse: noopRatelimit(),
      aiGenerateTips: noopRatelimit(),
      chatAnon: noopRatelimit(),
      chatAuth: noopRatelimit(),
      barcodeLookup: noopRatelimit(),
      paymentsCheckout: noopRatelimit(),
      paymentsDiscount: noopRatelimit(),
      tipEmail: noopRatelimit(),
    };
  }

  return {
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
    tipEmail: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(1, '1 d'),
      prefix: 'rl:tip:email',
    }),
  };
}

export const rateLimits = buildRateLimits();

// ─── Cache key helpers ────────────────────────────────────────────────────────

export const cacheKeys = {
  offProduct: (barcode: string) => `off:barcode:${barcode}`,
  usdaFood: (fdcId: string) => `usda:id:${fdcId}`,
  aiParse: (hash: string) => `parse:${hash}`,
  credits: (userId: string) => `credits:${userId}`,
};
