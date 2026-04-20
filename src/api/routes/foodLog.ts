import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { foodLogEntries } from '@/lib/db/schema';
import { NewFoodEntryWithProductSchema, GetFoodLogQuerySchema } from '@/types/api';
import { sanitiseTextServer } from '../middleware/sanitise';
import { type AuthVariables } from '../middleware/auth';
import { todayISO } from '@/utils/date';

const foodLogRoutes = new Hono<{ Variables: AuthVariables }>();

// GET /api/food-log?date=YYYY-MM-DD
// Returns the authenticated user's entries for the given date (defaults to today).
foodLogRoutes.get('/', zValidator('query', GetFoodLogQuerySchema), async (c) => {
  const user = c.get('user');
  const { date } = c.req.valid('query');
  const targetDate = date ?? todayISO();

  const entries = await db
    .select()
    .from(foodLogEntries)
    .where(and(eq(foodLogEntries.userId, user.id), eq(foodLogEntries.date, targetDate)))
    .orderBy(desc(foodLogEntries.createdAt));

  return c.json(entries);
});

// POST /api/food-log
foodLogRoutes.post('/', zValidator('json', NewFoodEntryWithProductSchema), async (c) => {
  const user = c.get('user');
  const body = c.req.valid('json');

  const [entry] = await db
    .insert(foodLogEntries)
    .values({
      userId: user.id,
      description: sanitiseTextServer(body.description),
      mealType: body.mealType,
      date: body.date,
      productId: body.productId ?? null,
      source: body.productId != null ? 'barcode' : 'manual',
    })
    .returning();

  if (entry === undefined) {
    return c.json({ error: 'Failed to create entry' }, 500);
  }

  return c.json(entry, 201);
});

// DELETE /api/food-log/:id
foodLogRoutes.delete('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  // Scope delete to the authenticated user — prevents horizontal privilege escalation
  const [deleted] = await db
    .delete(foodLogEntries)
    .where(and(eq(foodLogEntries.id, id), eq(foodLogEntries.userId, user.id)))
    .returning();

  if (deleted === undefined) {
    return c.json({ error: 'Entry not found' }, 404);
  }

  return c.json({ ok: true });
});

export { foodLogRoutes };
