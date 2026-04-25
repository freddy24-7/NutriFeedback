import { z } from 'zod';

// ─── Food Log ─────────────────────────────────────────────────────────────────

export const MealTypeSchema = z.enum(['breakfast', 'lunch', 'dinner', 'snack', 'drink']);
export type MealType = z.infer<typeof MealTypeSchema>;

export const NewFoodEntrySchema = z.object({
  description: z.string().min(1, 'Required').max(500, 'Too long'),
  mealType: MealTypeSchema.optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date — use YYYY-MM-DD'),
});
export type NewFoodEntryInput = z.infer<typeof NewFoodEntrySchema>;

export const GetFoodLogQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date')
    .optional(),
});

// ─── Contact ──────────────────────────────────────────────────────────────────

export const ContactFormSchema = z.object({
  name: z.string().min(1, 'Required').max(100, 'Too long'),
  email: z.string().email('Invalid email'),
  message: z.string().min(10, 'Too short').max(2000, 'Too long'),
});
export type ContactFormInput = z.infer<typeof ContactFormSchema>;

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const SignUpFormSchema = z
  .object({
    email: z.string().email('Invalid email'),
    password: z.string().min(8, 'At least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
export type SignUpFormInput = z.infer<typeof SignUpFormSchema>;

export const SignInFormSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Required'),
});
export type SignInFormInput = z.infer<typeof SignInFormSchema>;

export const ForgotPasswordFormSchema = z.object({
  email: z.string().email('Invalid email'),
});
export type ForgotPasswordFormInput = z.infer<typeof ForgotPasswordFormSchema>;

// ─── AI ───────────────────────────────────────────────────────────────────────

export const ParsedNutrientsSchema = z.object({
  calories: z.number().nullable(),
  protein: z.number().nullable(),
  carbs: z.number().nullable(),
  fat: z.number().nullable(),
  fiber: z.number().nullable(),
  sugar: z.number().nullable(),
  sodium: z.number().nullable(),
  servingDescription: z.string().nullable(),
  confidence: z.number().min(0).max(1),
});
export type ParsedNutrients = z.infer<typeof ParsedNutrientsSchema>;

export const ParseFoodRequestSchema = z.object({
  description: z.string().min(1).max(500),
  mealType: MealTypeSchema.optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  language: z.enum(['en', 'nl']).default('en'),
});
export type ParseFoodRequest = z.infer<typeof ParseFoodRequestSchema>;

export const ParseFoodResponseSchema = z.object({
  entryId: z.string().uuid(),
  nutrients: ParsedNutrientsSchema,
  confidence: z.number().min(0).max(1),
});
export type ParseFoodResponse = z.infer<typeof ParseFoodResponseSchema>;

export const AiTipResponseSchema = z.object({
  id: z.string().uuid(),
  tipTextEn: z.string(),
  tipTextNl: z.string(),
  nutrientsFlagged: z.array(z.string()).nullable(),
  severity: z.enum(['info', 'suggestion', 'important']),
  generatedAt: z.string(),
  dismissedAt: z.string().nullable(),
});
export type AiTipResponse = z.infer<typeof AiTipResponseSchema>;

// ─── Barcode / Products ───────────────────────────────────────────────────────

export const NutritionalPer100gSchema = z.object({
  calories: z.number().nullable(),
  protein: z.number().nullable(),
  carbs: z.number().nullable(),
  fat: z.number().nullable(),
  fiber: z.number().nullable(),
  sugar: z.number().nullable(),
  sodium: z.number().nullable(),
});

export const ProductResponseSchema = z.object({
  id: z.string().uuid().optional(),
  barcode: z.string().nullable(),
  name: z.string(),
  brand: z.string().nullable(),
  nutritionalPer100g: NutritionalPer100gSchema,
  servingSizeG: z.number().nullable(),
  processingLevel: z.number().int().min(1).max(4).nullable(),
  source: z.enum(['open_food_facts', 'usda', 'ai_estimated', 'user']),
  confidence: z.number().min(0).max(1).optional(),
});
export type ProductResponse = z.infer<typeof ProductResponseSchema>;

export const RegisterProductSchema = z.object({
  barcode: z.string().optional(),
  name: z.string().min(1).max(200),
  brand: z.string().max(100).optional(),
  nutritionalPer100g: NutritionalPer100gSchema,
  servingSizeG: z.number().positive().optional(),
});

// ─── Food log (updated to allow product linking) ──────────────────────────────

export const NewFoodEntryWithProductSchema = z.object({
  description: z.string().min(1, 'Required').max(500, 'Too long'),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack', 'drink']).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date — use YYYY-MM-DD'),
  productId: z.string().uuid().optional(),
});

// ─── Payments ─────────────────────────────────────────────────────────────────

export const CheckoutRequestSchema = z.object({
  priceId: z.string().startsWith('price_'),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});
export type CheckoutRequest = z.infer<typeof CheckoutRequestSchema>;

export const DiscountValidateSchema = z.object({
  code: z.string().min(1).max(50).toUpperCase(),
});
export type DiscountValidateInput = z.infer<typeof DiscountValidateSchema>;

export const SubscriptionStatusSchema = z.enum([
  'trial',
  'active',
  'comped',
  'expired',
  'cancelled',
]);
export type SubscriptionStatus = z.infer<typeof SubscriptionStatusSchema>;

export const SubscriptionResponseSchema = z.object({
  status: SubscriptionStatusSchema,
  currentPeriodEnd: z.string().nullable(),
  creditsRemaining: z.number().int(),
  creditsExpiresAt: z.string().nullable(),
});
export type SubscriptionResponse = z.infer<typeof SubscriptionResponseSchema>;

// ─── API response shape ───────────────────────────────────────────────────────

export type ApiError = { error: string };
export type ApiSuccess<T> = T;
