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

/** When Upstash is configured but unreachable (bad URL/token, network), avoid 500s on every route. */
function resilientRatelimit(inner: Ratelimit, name: string): Ratelimit {
  return {
    limit: async (...args: Parameters<Ratelimit['limit']>) => {
      try {
        return await inner.limit(...args);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(
          `[NutriApp] Rate limit "${name}" failed (${msg}) — allowing request. Check UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN and network.`,
        );
        return {
          success: true,
          limit: 999,
          remaining: 999,
          reset: Date.now() + 3_600_000,
          pending: Promise.resolve(),
        } as Awaited<ReturnType<Ratelimit['limit']>>;
      }
    },
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
    contact: resilientRatelimit(
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(3, '1 h'),
        prefix: 'rl:contact',
      }),
      'contact',
    ),
    aiFoodParse: resilientRatelimit(
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, '1 m'),
        prefix: 'rl:ai:parse',
      }),
      'aiFoodParse',
    ),
    aiGenerateTips: resilientRatelimit(
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, '1 h'),
        prefix: 'rl:ai:tips',
      }),
      'aiGenerateTips',
    ),
    chatAnon: resilientRatelimit(
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, '1 d'),
        prefix: 'rl:chat:anon',
      }),
      'chatAnon',
    ),
    chatAuth: resilientRatelimit(
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(20, '1 d'),
        prefix: 'rl:chat:auth',
      }),
      'chatAuth',
    ),
    barcodeLookup: resilientRatelimit(
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(30, '1 m'),
        prefix: 'rl:barcode',
      }),
      'barcodeLookup',
    ),
    paymentsCheckout: resilientRatelimit(
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, '1 h'),
        prefix: 'rl:payments:checkout',
      }),
      'paymentsCheckout',
    ),
    paymentsDiscount: resilientRatelimit(
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, '1 h'),
        prefix: 'rl:payments:discount',
      }),
      'paymentsDiscount',
    ),
    tipEmail: resilientRatelimit(
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(1, '1 d'),
        prefix: 'rl:tip:email',
      }),
      'tipEmail',
    ),
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
