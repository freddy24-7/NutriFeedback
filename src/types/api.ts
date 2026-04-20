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

// ─── API response shape ───────────────────────────────────────────────────────

export type ApiError = { error: string };
export type ApiSuccess<T> = T;
