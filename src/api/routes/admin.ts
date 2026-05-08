import { Hono } from 'hono';
import { z } from 'zod';
import { eq, sql, count } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import {
  userProfiles,
  userCredits,
  subscriptions,
  foodLogEntries,
  creditTransactions,
} from '@/lib/db/schema';
import { authMiddleware, type AuthVariables } from '../middleware/auth';
import { clerkClient } from '@/lib/auth/server';

const adminRoutes = new Hono<{ Variables: AuthVariables }>();

function requireAdmin(c: Parameters<Parameters<typeof adminRoutes.use>[0]>[0]): Response | null {
  const adminUserId = process.env['ADMIN_USER_ID'];
  if (!adminUserId) return c.json({ error: 'Admin not configured' }, 503) as Response;
  if (c.get('user')!.id !== adminUserId) return c.json({ error: 'Forbidden' }, 403) as Response;
  return null;
}

// ─── GET /api/admin/users ─────────────────────────────────────────────────────
// Returns all users with profile, credits, subscription status, and usage counts.
// Enriches with email + name from Clerk.

adminRoutes.get('/users', authMiddleware, async (c) => {
  const deny = requireAdmin(c);
  if (deny) return deny;

  const [profiles, credits, subs, logCounts, txCounts] = await Promise.all([
    db.select().from(userProfiles),
    db.select().from(userCredits),
    db.select().from(subscriptions),
    db
      .select({ userId: foodLogEntries.userId, count: count() })
      .from(foodLogEntries)
      .groupBy(foodLogEntries.userId),
    db
      .select({ userId: creditTransactions.userId, count: count() })
      .from(creditTransactions)
      .groupBy(creditTransactions.userId),
  ]);

  // Index non-profile tables by userId for O(1) lookup
  const creditsMap = new Map(credits.map((r) => [r.userId, r]));
  const subsMap = new Map(subs.map((r) => [r.userId, r]));
  const logCountMap = new Map(logCounts.map((r) => [r.userId, r.count]));
  const txCountMap = new Map(txCounts.map((r) => [r.userId, r.count]));

  // Batch fetch Clerk users (max 100 per call — enough for early-stage)
  const clerkUsers =
    profiles.length > 0
      ? await clerkClient.users.getUserList({ userId: profiles.map((p) => p.id), limit: 500 })
      : { data: [] };
  const clerkMap = new Map(clerkUsers.data.map((u) => [u.id, u]));

  const rows = profiles.map((p) => {
    const clerk = clerkMap.get(p.id);
    const cred = creditsMap.get(p.id);
    const sub = subsMap.get(p.id);
    return {
      id: p.id,
      email: clerk?.emailAddresses[0]?.emailAddress ?? null,
      name: [clerk?.firstName, clerk?.lastName].filter(Boolean).join(' ') || null,
      signedUpAt: p.createdAt.toISOString(),
      lastSignInAt: clerk?.lastSignInAt ? new Date(clerk.lastSignInAt).toISOString() : null,
      language: p.language,
      subscriptionStatus: sub?.status ?? 'trial',
      stripeCustomerId: sub?.stripeCustomerId ?? null,
      creditsRemaining: cred?.creditsRemaining ?? 0,
      creditsUsed: cred?.creditsUsed ?? 0,
      creditsExpiresAt: cred?.expiresAt?.toISOString() ?? null,
      foodLogEntries: logCountMap.get(p.id) ?? 0,
      apiCalls: txCountMap.get(p.id) ?? 0,
    };
  });

  // Sort newest signups first
  rows.sort((a, b) => (a.signedUpAt < b.signedUpAt ? 1 : -1));

  return c.json(rows);
});

// ─── POST /api/admin/credits ──────────────────────────────────────────────────
// Adjusts a user's creditsRemaining by `amount` (positive to add, negative to subtract).

const adjustCreditsSchema = z.object({
  userId: z.string().min(1),
  amount: z.number().int(),
});

adminRoutes.post('/credits', authMiddleware, async (c) => {
  const deny = requireAdmin(c);
  if (deny) return deny;

  const body = await c.req.json().catch(() => null);
  const parsed = adjustCreditsSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid request', details: parsed.error.flatten() }, 400);
  }

  const { userId, amount } = parsed.data;

  const rows = await db
    .update(userCredits)
    .set({
      creditsRemaining: sql`GREATEST(0, credits_remaining + ${amount})`,
    })
    .where(eq(userCredits.userId, userId))
    .returning({ creditsRemaining: userCredits.creditsRemaining });

  if (rows.length === 0) {
    return c.json({ error: 'User not found' }, 404);
  }

  return c.json({ ok: true, userId, creditsRemaining: rows[0].creditsRemaining });
});

export { adminRoutes };
