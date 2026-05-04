/**
 * Barcode product lookup chain:
 * 1. Upstash cache (7-day TTL)
 * 2. Open Food Facts API v2 (primary — excellent European coverage)
 * Returns null if not found — caller handles AI fallback.
 *
 * USDA removed: it only covers US branded foods and searching by barcode
 * as a text query rarely returns correct matches.
 */

import { redis, cacheKeys } from '@/lib/redis/client';

export type ProductLookupResult = {
  barcode: string;
  name: string;
  brand: string | null;
  nutritionalPer100g: NutritionalPer100g;
  servingSizeG: number | null;
  processingLevel: number | null;
  source: 'open_food_facts' | 'usda' | 'ai_estimated';
};

export type NutritionalPer100g = {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  sugar: number | null;
  sodium: number | null;
};

// ─── Cache ────────────────────────────────────────────────────────────────────

const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60;

async function getCached(barcode: string): Promise<ProductLookupResult | null> {
  if (redis === null) return null;
  const cached = await redis.get<ProductLookupResult>(cacheKeys.offProduct(barcode));
  return cached ?? null;
}

async function setCache(barcode: string, product: ProductLookupResult): Promise<void> {
  if (redis === null) return;
  await redis.set(cacheKeys.offProduct(barcode), product, { ex: CACHE_TTL_SECONDS });
}

// ─── Open Food Facts v2 ───────────────────────────────────────────────────────

type OFFProduct = {
  product_name?: string;
  product_name_en?: string;
  brands?: string;
  serving_size?: string;
  nova_group?: number;
  nutriments?: {
    'energy-kcal_100g'?: number;
    proteins_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
    fiber_100g?: number;
    sugars_100g?: number;
    sodium_100g?: number;
  };
};

type OFFResponse = {
  status: number;
  product?: OFFProduct;
};

async function lookupOpenFoodFacts(barcode: string): Promise<ProductLookupResult | null> {
  // Request only the fields we need — much smaller response, faster over the wire
  const fields = [
    'product_name',
    'product_name_en',
    'brands',
    'serving_size',
    'nova_group',
    'nutriments',
  ].join(',');
  const url = `https://world.openfoodfacts.org/api/v2/product/${barcode}?fields=${fields}`;

  let data: OFFResponse;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'NutriApp/1.0 (https://nutriapp.app)' },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    data = (await res.json()) as OFFResponse;
  } catch {
    return null;
  }

  if (data.status !== 1) return null;

  const p = data.product;
  if (!p) return null;

  // Use English name if available, otherwise fall back to the default product name
  const name = (p.product_name_en?.trim() || p.product_name?.trim()) ?? '';
  if (!name) return null;

  const n = p.nutriments ?? {};
  const servingG = p.serving_size ? parseFloat(p.serving_size.replace(/[^0-9.]/g, '')) : null;

  return {
    barcode,
    name,
    brand: p.brands?.split(',')[0]?.trim() ?? null,
    nutritionalPer100g: {
      calories: n['energy-kcal_100g'] ?? null,
      protein: n['proteins_100g'] ?? null,
      carbs: n['carbohydrates_100g'] ?? null,
      fat: n['fat_100g'] ?? null,
      fiber: n['fiber_100g'] ?? null,
      sugar: n['sugars_100g'] ?? null,
      sodium: n['sodium_100g'] != null ? n['sodium_100g'] * 1000 : null,
    },
    servingSizeG: servingG !== null && !isNaN(servingG) ? servingG : null,
    processingLevel: p.nova_group ?? null,
    source: 'open_food_facts',
  };
}

// ─── Public lookup entry point ────────────────────────────────────────────────

export async function lookupProduct(barcode: string): Promise<ProductLookupResult | null> {
  const cached = await getCached(barcode);
  if (cached !== null) return cached;

  const result = await lookupOpenFoodFacts(barcode);
  if (result !== null) await setCache(barcode, result);

  return result;
}
