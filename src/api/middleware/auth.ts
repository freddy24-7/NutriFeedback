import { createMiddleware } from 'hono/factory';
import { auth } from '@/lib/auth/server';

export type AuthVariables = { user: { id: string } };

export const authMiddleware = createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  c.set('user', { id: session.user.id });
  await next();
});
