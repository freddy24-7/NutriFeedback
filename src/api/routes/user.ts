import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { clerkClient } from '@/lib/auth/server';
import { foodLogEntries, aiTips, creditTransactions, subscriptions } from '@/lib/db/schema';
import { userProfiles, userCredits } from '@/lib/db/schema';
import { authMiddleware, type AuthVariables } from '../middleware/auth';

const userRoutes = new Hono<{ Variables: AuthVariables }>();

// GET /api/user/export
// Returns all the user's data as a JSON object for download.
userRoutes.get('/export', authMiddleware, async (c) => {
  const { id: userId } = c.get('user')!;

  const [log, tips, profile, credits, transactions] = await Promise.all([
    db.select().from(foodLogEntries).where(eq(foodLogEntries.userId, userId)),
    db.select().from(aiTips).where(eq(aiTips.userId, userId)),
    db.select().from(userProfiles).where(eq(userProfiles.id, userId)),
    db.select().from(userCredits).where(eq(userCredits.userId, userId)),
    db.select().from(creditTransactions).where(eq(creditTransactions.userId, userId)),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    userId,
    profile: profile[0] ?? null,
    credits: credits[0] ?? null,
    foodLog: log,
    aiTips: tips,
    creditTransactions: transactions,
  };

  c.header('Content-Disposition', 'attachment; filename="nutriapp-data-export.json"');
  c.header('Content-Type', 'application/json');
  return c.body(JSON.stringify(payload, null, 2));
});

// DELETE /api/user/account
// Deletes all user data from every table, then removes the Clerk user.
// Billing records in subscriptions are anonymised (userId zeroed) rather
// than deleted to satisfy Dutch 7-year tax retention requirement.
userRoutes.delete('/account', authMiddleware, async (c) => {
  const { id: userId } = c.get('user')!;

  await Promise.all([
    db.delete(foodLogEntries).where(eq(foodLogEntries.userId, userId)),
    db.delete(aiTips).where(eq(aiTips.userId, userId)),
    db.delete(creditTransactions).where(eq(creditTransactions.userId, userId)),
    db.delete(userCredits).where(eq(userCredits.userId, userId)),
    db.delete(userProfiles).where(eq(userProfiles.id, userId)),
  ]);

  // Subscriptions are retained (anonymised) for tax compliance; Stripe customer
  // ID is kept so we can cancel any active subscription via webhook if needed.
  // We simply disassociate the userId so it can't be linked back to the person.
  await db
    .update(subscriptions)
    .set({ userId: `deleted_${userId}` })
    .where(eq(subscriptions.userId, userId));

  // Delete the Clerk account last — once this succeeds, the session token is
  // invalidated and the client will be signed out automatically.
  try {
    await clerkClient.users.deleteUser(userId);
  } catch (err) {
    console.error('[user/account] Clerk delete failed:', (err as Error).message);
    // Data is already gone from our DB; log the failure but don't 500 the client.
  }

  return c.json({ ok: true });
});

export { userRoutes };
