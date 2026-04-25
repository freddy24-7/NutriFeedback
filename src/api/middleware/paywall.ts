import { createMiddleware } from 'hono/factory';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { subscriptions, userCredits } from '@/lib/db/schema';
import { type AuthVariables } from './auth';

// Blocks access when the user's trial has expired AND they have no credits.
// Active or comped subscriptions always pass through.
// Place after authMiddleware on routes that require a paid/trial account.

export const paywallMiddleware = createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
  const user = c.get('user')!;

  const [[sub], [credits]] = await Promise.all([
    db.select().from(subscriptions).where(eq(subscriptions.userId, user.id)),
    db.select().from(userCredits).where(eq(userCredits.userId, user.id)),
  ]);

  // Active or comped subscriptions: always allow
  if (sub?.status === 'active' || sub?.status === 'comped') {
    await next();
    return;
  }

  // Trial expired by date
  if (credits?.expiresAt && credits.expiresAt < new Date()) {
    return c.json(
      { error: 'Your trial has expired — upgrade to continue', code: 'TRIAL_EXPIRED' },
      402,
    );
  }

  // Credits exhausted (and no active subscription)
  if (credits && credits.creditsRemaining <= 0) {
    return c.json({ error: 'No credits remaining — upgrade to continue', code: 'NO_CREDITS' }, 402);
  }

  await next();
});
