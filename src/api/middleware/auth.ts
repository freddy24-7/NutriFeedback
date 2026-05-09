import { createMiddleware } from 'hono/factory';
import { verifyToken } from '@clerk/backend';

export type AuthVariables = { user: { id: string } | undefined };

// Uses secretKey-only verification — no hardcoded public key.
// verifyToken fetches Clerk's JWKS on first call and caches it, so there is
// minimal latency overhead and zero key-rotation maintenance burden.
async function verifyBearer(authHeader: string | undefined): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  if (!token) return null;

  try {
    const payload = await verifyToken(token, {
      secretKey: process.env['CLERK_SECRET_KEY'],
    });
    return payload.sub ?? null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[auth] token verification failed: ${msg}`);
    return null;
  }
}

export const authMiddleware = createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
  if (c.get('user') !== undefined) {
    await next();
    return;
  }

  const userId = await verifyBearer(c.req.header('Authorization'));
  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  c.set('user', { id: userId });
  await next();
});

export const optionalAuthMiddleware = createMiddleware<{ Variables: AuthVariables }>(
  async (c, next) => {
    const userId = await verifyBearer(c.req.header('Authorization'));
    c.set('user', userId ? { id: userId } : undefined);
    await next();
  },
);
