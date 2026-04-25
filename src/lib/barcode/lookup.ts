/**
 * Barcode product lookup chain:
 * 1. Upstash cache (7-day TTL)
 * 2. Open Food Facts API
 * 3. USDA FoodData Central API
 * Returns null if not found in either — caller handles AI fallback.
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
  const cached = await redis.get<ProductLookupResult>(cacheKeys.offProduct(barcode));
  return cached ?? null;
}

async function setCache(barcode: string, product: ProductLookupResult): Promise<void> {
  await redis.set(cacheKeys.offProduct(barcode), product, { ex: CACHE_TTL_SECONDS });
}

// ─── Open Food Facts ──────────────────────────────────────────────────────────

type OFFProduct = {
  product_name?: string;
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
  const url = `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`;

  let data: OFFResponse;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'NutriApp/1.0 (https://nutriapp.app)' },
    });
    data = (await res.json()) as OFFResponse;
  } catch {
    return null;
  }

  if (data.status !== 1 || !data.product?.product_name) return null;

  const p = data.product;
  const n = p.nutriments ?? {};

  const servingG = p.serving_size ? parseFloat(p.serving_size.replace(/[^0-9.]/g, '')) : null;

  return {
    barcode,
    name: p.product_name ?? '',
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
    servingSizeG: isNaN(servingG ?? NaN) ? null : servingG,
    processingLevel: p.nova_group ?? null,
    source: 'open_food_facts',
  };
}

// ─── USDA FoodData Central ────────────────────────────────────────────────────

type USDAFood = {
  description: string;
  brandName?: string;
  brandOwner?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  foodNutrients?: Array<{
    nutrientName: string;
    value: number;
    unitName: string;
  }>;
};

type USDAResponse = {
  foods?: USDAFood[];
};

function findNutrient(nutrients: USDAFood['foodNutrients'], name: string): number | null {
  return nutrients?.find((n) => n.nutrientName.toLowerCase().includes(name))?.value ?? null;
}

async function lookupUSDA(barcode: string): Promise<ProductLookupResult | null> {
  const apiKey = process.env['USDA_API_KEY'] ?? 'DEMO_KEY';
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${barcode}&api_key=${apiKey}&pageSize=1`;

  let data: USDAResponse;
  try {
    const res = await fetch(url);
    data = (await res.json()) as USDAResponse;
  } catch {
    return null;
  }

  const food = data.foods?.[0];
  if (!food) return null;

  const n = food.foodNutrients ?? [];
  const servingSizeG =
    food.servingSizeUnit?.toLowerCase() === 'g' ? (food.servingSize ?? null) : null;

  return {
    barcode,
    name: food.description,
    brand: food.brandOwner ?? food.brandName ?? null,
    nutritionalPer100g: {
      calories: findNutrient(n, 'energy'),
      protein: findNutrient(n, 'protein'),
      carbs: findNutrient(n, 'carbohydrate'),
      fat: findNutrient(n, 'total lipid'),
      fiber: findNutrient(n, 'fiber'),
      sugar: findNutrient(n, 'sugars'),
      sodium: findNutrient(n, 'sodium'),
    },
    servingSizeG,
    processingLevel: null,
    source: 'usda',
  };
}

// ─── Public lookup entry point ────────────────────────────────────────────────

export async function lookupProduct(barcode: string): Promise<ProductLookupResult | null> {
  const cached = await getCached(barcode);
  if (cached !== null) return cached;

  const result = (await lookupOpenFoodFacts(barcode)) ?? (await lookupUSDA(barcode));
  if (result !== null) await setCache(barcode, result);

  return result;
}
