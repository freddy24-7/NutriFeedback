import { createMiddleware } from 'hono/factory';
import type { Ratelimit } from '@upstash/ratelimit';
import { createHmac } from 'crypto';

export function hashIp(ip: string): string {
  const secret = process.env['IP_HASH_SECRET'];
  if (!secret) throw new Error('IP_HASH_SECRET is required');
  return createHmac('sha256', secret).update(ip).digest('hex');
}

export function rateLimitMiddleware(
  limiter: Ratelimit,
  getIdentifier: (c: { req: { header: (name: string) => string | undefined } }) => string,
) {
  return createMiddleware(async (c, next) => {
    const identifier = getIdentifier(c);
    const { success, limit, remaining, reset } = await limiter.limit(identifier);

    c.header('X-RateLimit-Limit', String(limit));
    c.header('X-RateLimit-Remaining', String(remaining));
    c.header('X-RateLimit-Reset', String(reset));

    if (!success) {
      return c.json({ error: 'Rate limit exceeded. Please try again later.' }, 429);
    }

    await next();
  });
}

export function ipHashIdentifier(c: {
  req: { header: (name: string) => string | undefined };
}): string {
  const ip =
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
    c.req.header('x-real-ip') ??
    'unknown';
  return hashIp(ip);
}
