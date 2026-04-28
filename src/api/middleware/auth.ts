import { createMiddleware } from 'hono/factory';
import { clerkClient } from '@/lib/auth/server';

export type AuthVariables = { user: { id: string } | undefined };

export const authMiddleware = createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
  // Short-circuit if a higher-level middleware already resolved auth (e.g. test stubs).
  if (c.get('user') !== undefined) {
    await next();
    return;
  }

  const requestState = await clerkClient.authenticateRequest(c.req.raw, {
    publishableKey: process.env['VITE_CLERK_PUBLISHABLE_KEY'],
  });

  if (!requestState.isSignedIn) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  c.set('user', { id: requestState.toAuth().userId });
  await next();
});

// Sets user if session exists, continues regardless — for routes accessible to anon users
export const optionalAuthMiddleware = createMiddleware<{ Variables: AuthVariables }>(
  async (c, next) => {
    const requestState = await clerkClient.authenticateRequest(c.req.raw, {
      publishableKey: process.env['VITE_CLERK_PUBLISHABLE_KEY'],
    });
    c.set('user', requestState.isSignedIn ? { id: requestState.toAuth().userId } : undefined);
    await next();
  },
);
