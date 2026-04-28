import { Hono } from 'hono';
import { db } from '@/lib/db/client';
import { userProfiles, userCredits } from '@/lib/db/schema';
import { authMiddleware, type AuthVariables } from '../middleware/auth';

const authRoutes = new Hono<{ Variables: AuthVariables }>();

// POST /api/auth/on-signup
// Called client-side after every successful sign-up + session activation.
// Idempotent — ON CONFLICT DO NOTHING means safe to call repeatedly.
authRoutes.post('/on-signup', authMiddleware, async (c) => {
  const user = c.get('user')!;

  await db
    .insert(userProfiles)
    .values({ id: user.id, language: 'en', theme: 'light' })
    .onConflictDoNothing();

  await db
    .insert(userCredits)
    .values({
      userId: user.id,
      creditsRemaining: 200,
      creditsUsed: 0,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    })
    .onConflictDoNothing();

  return c.json({ ok: true });
});

export { authRoutes };
