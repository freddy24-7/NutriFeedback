import { Hono } from 'hono';
import { db } from '@/lib/db/client';
import { userProfiles, userCredits } from '@/lib/db/schema';
import { authMiddleware, type AuthVariables } from '../middleware/auth';

const authRoutes = new Hono<{ Variables: AuthVariables }>();

// POST /api/auth/on-signup
// Called client-side after every SIGNED_IN event. Fully idempotent —
// uses ON CONFLICT DO NOTHING so existing users are unaffected.
authRoutes.post('/on-signup', authMiddleware, async (c) => {
  const user = c.get('user');

  await db
    .insert(userProfiles)
    .values({ id: user.id, language: 'en', theme: 'light' })
    .onConflictDoNothing();

  await db
    .insert(userCredits)
    .values({
      userId: user.id,
      creditsRemaining: 50,
      creditsUsed: 0,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    })
    .onConflictDoNothing();

  return c.json({ ok: true });
});

export { authRoutes };
