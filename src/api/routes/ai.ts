import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { eq, and, gte, desc, countDistinct, gt } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { Resend } from 'resend';
import { db } from '@/lib/db/client';
import { foodLogEntries, userCredits, aiTips, userProfiles } from '@/lib/db/schema';
import { clerkClient } from '@/lib/auth/server';
import { generateAIResponse, stripJsonFences } from '@/lib/ai/client';
import {
  PARSE_FOOD_SYSTEM,
  PARSE_FOOD_PROMPT,
  GENERATE_TIPS_SYSTEM,
  GENERATE_TIPS_PROMPT,
} from '@/lib/ai/prompts';
import { buildTipEmailHtml, buildTipEmailText } from '@/lib/email/templates';
import { sanitiseTextServer } from '../middleware/sanitise';
import { rateLimits } from '@/lib/redis/client';
import { ParseFoodRequestSchema, ParsedNutrientsSchema, type ParsedNutrients } from '@/types/api';
import { authMiddleware, type AuthVariables } from '../middleware/auth';

const aiRoutes = new Hono<{ Variables: AuthVariables }>();

// GET /generate-tips — registered before auth so mistaken browser visits don’t hit 401 first.
// HTML navigations redirect to the dashboard; non-browser clients (curl, API tools) get 405 JSON.
aiRoutes.get('/generate-tips', (c) => {
  const accept = c.req.header('Accept') ?? '';
  const secFetchDest = c.req.header('Sec-Fetch-Dest');
  const navigateLikeBrowser =
    accept.includes('text/html') || secFetchDest === 'document' || secFetchDest === 'iframe';
  if (navigateLikeBrowser) {
    return c.redirect('/dashboard', 302);
  }
  return c.json(
    {
      error: 'Method not allowed',
      message: 'Use POST /api/ai/generate-tips with Authorization: Bearer <Clerk session token>.',
    },
    405,
    { Allow: 'POST' },
  );
});

aiRoutes.use('*', authMiddleware);

// ─── POST /api/ai/parse-food ──────────────────────────────────────────────────
// Parses a food description into structured nutrients via AI.
// Deducts 1 credit (atomic) BEFORE calling AI.

aiRoutes.post('/parse-food', zValidator('json', ParseFoodRequestSchema), async (c) => {
  const user = c.get('user')!;

  // Rate limit: 10 requests/min per user
  const { success: withinLimit } = await rateLimits.aiFoodParse.limit(user.id);
  if (!withinLimit) {
    return c.json({ error: 'Rate limit exceeded — try again in a minute' }, 429);
  }

  // Deduct 1 credit atomically BEFORE AI call.
  // The WHERE clause ensures credits_remaining > 0 — if the update returns nothing,
  // the user has no credits.
  const [updated] = await db
    .update(userCredits)
    .set({
      creditsRemaining: sql`credits_remaining - 1`,
      creditsUsed: sql`credits_used + 1`,
    })
    .where(and(eq(userCredits.userId, user.id), gt(userCredits.creditsRemaining, 0)))
    .returning();

  if (updated === undefined) {
    return c.json({ error: 'Insufficient credits' }, 402);
  }

  const body = c.req.valid('json');
  const clean = sanitiseTextServer(body.description);
  const language = body.language;

  let nutrients: ParsedNutrients;
  try {
    const { text } = await generateAIResponse({
      prompt: PARSE_FOOD_PROMPT(clean),
      systemPrompt: PARSE_FOOD_SYSTEM(language),
      language,
    });

    const parsed: unknown = JSON.parse(stripJsonFences(text));
    nutrients = ParsedNutrientsSchema.parse(parsed);
  } catch (err) {
    console.error('[parse-food] AI response error:', err);
    // Refund the credit if AI fails — don't charge for a failed parse
    await db
      .update(userCredits)
      .set({
        creditsRemaining: sql`credits_remaining + 1`,
        creditsUsed: sql`credits_used - 1`,
      })
      .where(eq(userCredits.userId, user.id));

    return c.json({ error: 'Failed to parse food — please try again' }, 500);
  }

  // Save the entry with parsed nutrients
  const [entry] = await db
    .insert(foodLogEntries)
    .values({
      userId: user.id,
      description: clean,
      mealType: body.mealType,
      date: body.date,
      parsedNutrients: nutrients,
      confidence: nutrients.confidence,
      source: 'ai_parsed',
    })
    .returning();

  if (entry === undefined) {
    return c.json({ error: 'Failed to save entry' }, 500);
  }

  return c.json({ entryId: entry.id, nutrients, confidence: nutrients.confidence }, 201);
});

// ─── POST /api/ai/generate-tips ───────────────────────────────────────────────
// Generates a personalised nutrition tip from the user's recent food log.
// Requires enough distinct log days. Deducts 2 credits (atomic) BEFORE calling AI.

aiRoutes.post('/generate-tips', async (c) => {
  const user = c.get('user')!;

  // Rate limit: 5 requests/hour per user
  const { success: withinLimit } = await rateLimits.aiGenerateTips.limit(user.id);
  if (!withinLimit) {
    return c.json({ error: 'Rate limit exceeded — try again later' }, 429);
  }

  // Check 3+ distinct log days exist
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const countResult = await db
    .select({ distinctDays: countDistinct(foodLogEntries.date) })
    .from(foodLogEntries)
    .where(and(eq(foodLogEntries.userId, user.id), gte(foodLogEntries.date, thirtyDaysAgo)));

  const distinctDays = countResult[0]?.distinctDays ?? 0;

  if (distinctDays < 1) {
    return c.json({ error: 'Log at least one meal before generating a tip' }, 422);
  }

  // Deduct 2 credits atomically BEFORE AI call
  const [updated] = await db
    .update(userCredits)
    .set({
      creditsRemaining: sql`credits_remaining - 2`,
      creditsUsed: sql`credits_used + 2`,
    })
    .where(and(eq(userCredits.userId, user.id), gt(userCredits.creditsRemaining, 1)))
    .returning();

  if (updated === undefined) {
    return c.json({ error: 'Insufficient credits' }, 402);
  }

  // Fetch recent entries to build the food summary
  const recentEntries = await db
    .select({
      description: foodLogEntries.description,
      mealType: foodLogEntries.mealType,
      date: foodLogEntries.date,
    })
    .from(foodLogEntries)
    .where(and(eq(foodLogEntries.userId, user.id), gte(foodLogEntries.date, thirtyDaysAgo)))
    .orderBy(desc(foodLogEntries.date))
    .limit(50);

  const foodSummary = recentEntries
    .map((e) => `${e.date} [${e.mealType ?? 'meal'}]: ${e.description}`)
    .join('\n');

  type TipJson = {
    tipTextEn: string;
    tipTextNl: string;
    nutrientsFlagged: string[];
    severity: 'info' | 'suggestion' | 'important';
    analysisData?: unknown;
  };

  let tipJson: TipJson;
  try {
    const { text } = await generateAIResponse({
      prompt: GENERATE_TIPS_PROMPT({ foodSummary, timeframeDays: 30, distinctDays }),
      systemPrompt: GENERATE_TIPS_SYSTEM,
      language: 'en',
    });

    tipJson = JSON.parse(stripJsonFences(text)) as TipJson;
  } catch (err) {
    console.error('[generate-tips] AI response error:', err);
    // Refund credits if AI fails
    await db
      .update(userCredits)
      .set({
        creditsRemaining: sql`credits_remaining + 2`,
        creditsUsed: sql`credits_used - 2`,
      })
      .where(eq(userCredits.userId, user.id));

    return c.json({ error: 'Failed to generate tip — please try again' }, 500);
  }

  const [tip] = await db
    .insert(aiTips)
    .values({
      userId: user.id,
      timeframeDays: 30,
      tipTextEn: tipJson.tipTextEn,
      tipTextNl: tipJson.tipTextNl,
      nutrientsFlagged: tipJson.nutrientsFlagged,
      severity: tipJson.severity,
      analysisData: tipJson.analysisData ?? null,
    })
    .returning();

  if (tip === undefined) {
    return c.json({ error: 'Failed to save tip' }, 500);
  }

  return c.json({
    id: tip.id,
    tipTextEn: tip.tipTextEn,
    tipTextNl: tip.tipTextNl,
    nutrientsFlagged: tip.nutrientsFlagged,
    severity: tip.severity,
    generatedAt: tip.generatedAt.toISOString(),
    dismissedAt: null,
    analysisData: tip.analysisData ?? null,
  });
});

// ─── GET /api/ai/tips ─────────────────────────────────────────────────────────
// Returns the user's active (non-dismissed) tips.

aiRoutes.get('/tips', async (c) => {
  const user = c.get('user')!;

  const tips = await db
    .select()
    .from(aiTips)
    .where(and(eq(aiTips.userId, user.id), sql`${aiTips.dismissedAt} IS NULL`))
    .orderBy(desc(aiTips.generatedAt))
    .limit(5);

  return c.json(
    tips.map((t) => ({
      id: t.id,
      tipTextEn: t.tipTextEn,
      tipTextNl: t.tipTextNl,
      nutrientsFlagged: t.nutrientsFlagged,
      severity: t.severity,
      generatedAt: t.generatedAt.toISOString(),
      dismissedAt: t.dismissedAt?.toISOString() ?? null,
      analysisData: t.analysisData ?? null,
    })),
  );
});

// ─── POST /api/ai/tips/:id/dismiss ───────────────────────────────────────────
// Dismisses a tip. Scoped to the authenticated user.

aiRoutes.post('/tips/:id/dismiss', async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id');

  const [dismissed] = await db
    .update(aiTips)
    .set({ dismissedAt: new Date() })
    .where(and(eq(aiTips.id, id), eq(aiTips.userId, user.id)))
    .returning();

  if (dismissed === undefined) {
    return c.json({ error: 'Tip not found' }, 404);
  }

  return c.json({ ok: true });
});

// ─── POST /api/ai/email-tips ──────────────────────────────────────────────────
// Emails the user's latest active tip. Rate-limited to 1/day per user.

aiRoutes.post('/email-tips', async (c) => {
  const user = c.get('user')!;

  const { success: withinLimit } = await rateLimits.tipEmail.limit(user.id);
  if (!withinLimit) {
    return c.json({ error: 'You have already requested a tip email today' }, 429);
  }

  // Fetch the most recent non-dismissed tip
  const [tip] = await db
    .select()
    .from(aiTips)
    .where(and(eq(aiTips.userId, user.id), sql`${aiTips.dismissedAt} IS NULL`))
    .orderBy(desc(aiTips.generatedAt))
    .limit(1);

  if (tip === undefined) {
    return c.json({ error: 'No active tips to send' }, 404);
  }

  const clerkUser = await clerkClient.users.getUser(user.id).catch(() => null);
  if (!clerkUser) return c.json({ error: 'User not found' }, 404);

  const userEmail = clerkUser.emailAddresses[0]?.emailAddress ?? '';
  const userName = `${clerkUser.firstName ?? ''} ${clerkUser.lastName ?? ''}`.trim() || userEmail;

  const resendKey = process.env['RESEND_API_KEY'];
  const fromEmail = process.env['RESEND_FROM_EMAIL'];
  const appUrl = process.env['VITE_APP_URL'] ?? 'https://nutriapp.app';

  if (!resendKey || !fromEmail) {
    return c.json({ error: 'Email service not configured' }, 500);
  }

  const [profileRow] = await db
    .select({ language: userProfiles.language })
    .from(userProfiles)
    .where(eq(userProfiles.id, user.id))
    .limit(1);

  const language: 'en' | 'nl' = profileRow?.language ?? 'en';

  const emailData = {
    userName,
    tipTextEn: tip.tipTextEn,
    tipTextNl: tip.tipTextNl,
    nutrientsFlagged: tip.nutrientsFlagged ?? null,
    severity: tip.severity,
    language,
    appUrl,
  };

  const resend = new Resend(resendKey);
  const subject = language === 'nl' ? 'Jouw wekelijkse voedingstip' : 'Your weekly nutrition tip';

  const { error } = await resend.emails.send({
    from: fromEmail,
    to: userEmail,
    subject,
    text: buildTipEmailText(emailData),
    html: buildTipEmailHtml(emailData),
  });

  if (error !== null) {
    return c.json({ error: 'Failed to send email' }, 500);
  }

  return c.json({ ok: true });
});

export { aiRoutes };
