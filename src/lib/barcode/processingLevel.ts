/**
 * NOVA processing level assessment (1–4).
 * Used when the product source doesn't provide a NOVA group.
 *
 * 1 — Unprocessed / minimally processed (fresh fruit, plain meat, eggs)
 * 2 — Processed culinary ingredients (oil, flour, sugar, salt)
 * 3 — Processed foods (canned veg, cheese, cured meat)
 * 4 — Ultra-processed (soft drinks, packaged snacks, instant noodles)
 */

const LEVEL_4_PATTERNS = [
  /chip|crisp|nugget|instant|energy drink|soda|cola|fizzy|flavou?r|artificial|preservative|emulsifier|stabiliser|stabilizer|modified starch/i,
];

const LEVEL_1_PATTERNS = [
  /^(fresh|raw|plain|whole)\s/i,
  /^(apple|banana|orange|strawberr|cherry|grape|mango|melon|peach|pear|plum)/i,
  /^(chicken breast|beef|pork loin|salmon|tuna|egg|milk|yoghurt|yogurt)/i,
];

const LEVEL_2_PATTERNS = [
  /^(olive oil|sunflower oil|rapeseed oil|coconut oil|vegetable oil)\b/i,
  /^(flour|sugar|salt|honey|butter|cream|vinegar|baking soda)\b/i,
];

export function assessProcessingLevel(productName: string): number {
  if (LEVEL_1_PATTERNS.some((re) => re.test(productName))) return 1;
  if (LEVEL_2_PATTERNS.some((re) => re.test(productName))) return 2;
  if (LEVEL_4_PATTERNS.some((re) => re.test(productName))) return 4;
  return 3;
}
