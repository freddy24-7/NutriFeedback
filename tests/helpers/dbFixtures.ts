/**
 * DB fixture helpers for integration tests.
 *
 * Each helper inserts the minimum rows needed for a test scenario.
 * Always call the matching cleanup function in afterEach.
 *
 * With Clerk auth, there is no user row in the DB — Clerk owns that.
 * seedUser only creates the app-level profile and credit rows.
 */

import { db } from '@/lib/db/client';
import { userProfiles, userCredits, foodLogEntries, aiTips } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export type TestUser = {
  id: string;
  email: string;
  name: string;
};

/** Insert the minimum rows needed for an authenticated user. */
export async function seedUser(user: TestUser, credits = 50): Promise<void> {
  await db.insert(userProfiles).values({
    id: user.id,
    language: 'en',
    theme: 'light',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await db.insert(userCredits).values({
    userId: user.id,
    creditsRemaining: credits,
    creditsUsed: 0,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });
}

/** Insert food log entries across distinct dates. */
export async function seedFoodLog(userId: string, dates: string[]): Promise<void> {
  if (dates.length === 0) return;
  await db.insert(foodLogEntries).values(
    dates.map((date) => ({
      userId,
      description: 'Test entry',
      date,
      source: 'manual' as const,
    })),
  );
}

/** Insert an active (non-dismissed) tip for the user. */
export async function seedTip(
  userId: string,
  overrides?: Partial<typeof aiTips.$inferInsert>,
): Promise<string> {
  const [tip] = await db
    .insert(aiTips)
    .values({
      userId,
      timeframeDays: 30,
      tipTextEn: 'Eat more vegetables.',
      tipTextNl: 'Eet meer groenten.',
      nutrientsFlagged: ['fibre'],
      severity: 'suggestion',
      ...overrides,
    })
    .returning({ id: aiTips.id });

  return tip!.id;
}

/** Remove all test rows for the given userId. Call in afterEach. */
export async function cleanupUser(userId: string): Promise<void> {
  await db.delete(aiTips).where(eq(aiTips.userId, userId));
  await db.delete(foodLogEntries).where(eq(foodLogEntries.userId, userId));
  await db.delete(userCredits).where(eq(userCredits.userId, userId));
  await db.delete(userProfiles).where(eq(userProfiles.id, userId));
}
