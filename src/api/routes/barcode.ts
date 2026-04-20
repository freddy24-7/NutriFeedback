import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { products } from '@/lib/db/schema';
import { lookupProduct } from '@/lib/barcode/lookup';
import { assessProcessingLevel } from '@/lib/barcode/processingLevel';
import { generateAIResponse } from '@/lib/ai/client';
import { BARCODE_ESTIMATE_SYSTEM, BARCODE_ESTIMATE_PROMPT } from '@/lib/ai/prompts';
import { rateLimits } from '@/lib/redis/client';
import { RegisterProductSchema, NutritionalPer100gSchema } from '@/types/api';
import { type AuthVariables } from '../middleware/auth';
import { sanitiseTextServer } from '../middleware/sanitise';

const barcodeRoutes = new Hono<{ Variables: AuthVariables }>();

// ─── GET /api/barcode/:barcode ────────────────────────────────────────────────
// Lookup chain: DB cache → Open Food Facts → USDA → AI estimate.

barcodeRoutes.get('/:barcode', async (c) => {
  const user = c.get('user');
  const barcode = c.req.param('barcode');

  const { success: withinLimit } = await rateLimits.barcodeLookup.limit(user.id);
  if (!withinLimit) {
    return c.json({ error: 'Rate limit exceeded — try again in a minute' }, 429);
  }

  // Check local products DB first (covers user-registered products too)
  const [existing] = await db.select().from(products).where(eq(products.barcode, barcode)).limit(1);

  if (existing !== undefined) {
    return c.json({
      id: existing.id,
      barcode: existing.barcode,
      name: existing.name,
      brand: existing.brand,
      nutritionalPer100g: existing.nutritionalPer100g,
      servingSizeG: existing.servingSizeG,
      processingLevel: existing.processingLevel,
      source: existing.source,
      confidence: existing.source === 'ai_estimated' ? 0.4 : 0.9,
    });
  }

  // External lookup: OFF → USDA
  const external = await lookupProduct(barcode);

  if (external !== null) {
    const processingLevel = external.processingLevel ?? assessProcessingLevel(external.name);

    // Persist to local DB so future lookups are instant
    const [saved] = await db
      .insert(products)
      .values({
        barcode,
        name: external.name,
        brand: external.brand,
        nutritionalPer100g: external.nutritionalPer100g,
        servingSizeG: external.servingSizeG,
        processingLevel,
        source: external.source,
        verified: false,
      })
      .onConflictDoNothing()
      .returning();

    return c.json({
      id: saved?.id,
      barcode,
      name: external.name,
      brand: external.brand,
      nutritionalPer100g: external.nutritionalPer100g,
      servingSizeG: external.servingSizeG,
      processingLevel,
      source: external.source,
      confidence: 0.9,
    });
  }

  // AI fallback: return an estimate with low confidence.
  // Uses the barcode as the query — AI may know well-known products.
  type AIProductEstimate = {
    name: string;
    brand: string | null;
    nutritionalPer100g: Record<string, number | null>;
    servingSizeG: number | null;
    processingLevel: number | null;
  };

  let aiEstimate: AIProductEstimate | null = null;
  try {
    const { text } = await generateAIResponse({
      prompt: BARCODE_ESTIMATE_PROMPT(barcode),
      systemPrompt: BARCODE_ESTIMATE_SYSTEM,
      language: 'en',
    });

    const parsed = JSON.parse(text) as AIProductEstimate;
    const nutrients = NutritionalPer100gSchema.safeParse(parsed.nutritionalPer100g);
    if (nutrients.success) {
      aiEstimate = { ...parsed, nutritionalPer100g: nutrients.data };
    }
  } catch {
    // AI failed — return not found
  }

  if (aiEstimate === null) {
    return c.json({ error: 'Product not found' }, 404);
  }

  const processingLevel =
    typeof aiEstimate.processingLevel === 'number'
      ? aiEstimate.processingLevel
      : assessProcessingLevel(aiEstimate.name ?? '');

  const [saved] = await db
    .insert(products)
    .values({
      barcode,
      name: aiEstimate.name ?? `Unknown (${barcode})`,
      brand: aiEstimate.brand,
      nutritionalPer100g: aiEstimate.nutritionalPer100g,
      servingSizeG: aiEstimate.servingSizeG,
      processingLevel,
      source: 'ai_estimated',
      verified: false,
    })
    .onConflictDoNothing()
    .returning();

  return c.json({
    id: saved?.id,
    barcode,
    name: aiEstimate.name,
    brand: aiEstimate.brand,
    nutritionalPer100g: aiEstimate.nutritionalPer100g,
    servingSizeG: aiEstimate.servingSizeG,
    processingLevel,
    source: 'ai_estimated',
    confidence: 0.4,
  });
});

// ─── POST /api/barcode/products ───────────────────────────────────────────────
// User registers a product manually.

barcodeRoutes.post('/products', zValidator('json', RegisterProductSchema), async (c) => {
  const user = c.get('user');
  const body = c.req.valid('json');

  const name = sanitiseTextServer(body.name);
  const brand = body.brand ? sanitiseTextServer(body.brand) : null;

  const processingLevel = assessProcessingLevel(name);

  const [product] = await db
    .insert(products)
    .values({
      barcode: body.barcode ?? null,
      name,
      brand,
      nutritionalPer100g: body.nutritionalPer100g,
      servingSizeG: body.servingSizeG ?? null,
      processingLevel,
      source: 'user',
      verified: false,
      createdBy: user.id,
    })
    .returning();

  if (product === undefined) {
    return c.json({ error: 'Failed to save product' }, 500);
  }

  return c.json(
    {
      id: product.id,
      barcode: product.barcode,
      name: product.name,
      brand: product.brand,
      nutritionalPer100g: product.nutritionalPer100g,
      servingSizeG: product.servingSizeG,
      processingLevel: product.processingLevel,
      source: product.source,
      confidence: 1.0,
    },
    201,
  );
});

export { barcodeRoutes };
