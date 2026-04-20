import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  integer,
  real,
  jsonb,
  boolean,
} from 'drizzle-orm/pg-core';
import { createSelectSchema, createInsertSchema } from 'drizzle-zod';
import { sql } from 'drizzle-orm';

// ─── Enums ───────────────────────────────────────────────────────────────────

export const languageEnum = pgEnum('language', ['en', 'nl']);
export const themeEnum = pgEnum('theme', ['light', 'dark']);
export const mealTypeEnum = pgEnum('meal_type', ['breakfast', 'lunch', 'dinner', 'snack', 'drink']);
export const sourceEnum = pgEnum('source', ['manual', 'barcode', 'ai_parsed', 'imported']);
export const productSourceEnum = pgEnum('product_source', [
  'open_food_facts',
  'usda',
  'user',
  'ai_estimated',
]);
export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'trial',
  'active',
  'comped',
  'expired',
  'cancelled',
]);
export const discountTypeEnum = pgEnum('discount_type', ['beta', 'influencer', 'timed']);
export const severityEnum = pgEnum('severity', ['info', 'suggestion', 'important']);

// ─── Better Auth tables ───────────────────────────────────────────────────────
// These are managed by Better Auth. Field names must match Better Auth's schema.
// Do not rename columns — Better Auth maps to them by camelCase convention.

export const authUser = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

export const authSession = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => authUser.id, { onDelete: 'cascade' }),
});

export const authAccount = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => authUser.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

export const authVerification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at'),
});

// ─── App tables ──────────────────────────────────────────────────────────────
// userId fields reference authUser.id (text) — not uuid — to match Better Auth.

export const userProfiles = pgTable('user_profiles', {
  id: text('id')
    .primaryKey()
    .references(() => authUser.id, { onDelete: 'cascade' }),
  language: languageEnum('language').notNull().default('en'),
  theme: themeEnum('theme').notNull().default('light'),
  dateOfBirth: text('date_of_birth'),
  sex: text('sex'),
  acceptedTermsAt: timestamp('accepted_terms_at'),
  acceptedPrivacyAt: timestamp('accepted_privacy_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const foodLogEntries = pgTable('food_log_entries', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: text('user_id')
    .notNull()
    .references(() => authUser.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  mealType: mealTypeEnum('meal_type'),
  date: text('date').notNull(),
  parsedNutrients: jsonb('parsed_nutrients'),
  confidence: real('confidence'),
  source: sourceEnum('source').notNull().default('manual'),
  productId: uuid('product_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const products = pgTable('products', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  barcode: text('barcode').unique(),
  name: text('name').notNull(),
  brand: text('brand'),
  nutritionalPer100g: jsonb('nutritional_per_100g').notNull(),
  servingSizeG: real('serving_size_g'),
  processingLevel: integer('processing_level'),
  source: productSourceEnum('source').notNull(),
  verified: boolean('verified').notNull().default(false),
  createdBy: text('created_by').references(() => authUser.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const userCredits = pgTable('user_credits', {
  userId: text('user_id')
    .primaryKey()
    .references(() => authUser.id, { onDelete: 'cascade' }),
  creditsRemaining: integer('credits_remaining').notNull().default(0),
  creditsUsed: integer('credits_used').notNull().default(0),
  expiresAt: timestamp('expires_at'),
  convertedToPaidAt: timestamp('converted_to_paid_at'),
});

export const creditTransactions = pgTable('credit_transactions', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: text('user_id')
    .notNull()
    .references(() => authUser.id, { onDelete: 'cascade' }),
  amount: integer('amount').notNull(),
  action: text('action').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const subscriptions = pgTable('subscriptions', {
  userId: text('user_id')
    .primaryKey()
    .references(() => authUser.id, { onDelete: 'cascade' }),
  status: subscriptionStatusEnum('status').notNull(),
  stripeCustomerId: text('stripe_customer_id').unique(),
  stripeSubscriptionId: text('stripe_subscription_id').unique(),
  currentPeriodEnd: timestamp('current_period_end'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const discountCodes = pgTable('discount_codes', {
  code: text('code').primaryKey(),
  type: discountTypeEnum('type').notNull(),
  usesRemaining: integer('uses_remaining'),
  expiresAt: timestamp('expires_at'),
  trialDays: integer('trial_days'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const aiTips = pgTable('ai_tips', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: text('user_id')
    .notNull()
    .references(() => authUser.id, { onDelete: 'cascade' }),
  generatedAt: timestamp('generated_at').notNull().defaultNow(),
  timeframeDays: integer('timeframe_days').notNull(),
  nutrientsFlagged: text('nutrients_flagged').array(),
  tipTextEn: text('tip_text_en').notNull(),
  tipTextNl: text('tip_text_nl').notNull(),
  severity: severityEnum('severity').notNull().default('suggestion'),
  dismissedAt: timestamp('dismissed_at'),
});

export const chatbotSessions = pgTable('chatbot_sessions', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  ipHash: text('ip_hash').notNull(),
  userId: text('user_id').references(() => authUser.id, { onDelete: 'set null' }),
  messagesToday: integer('messages_today').notNull().default(0),
  date: text('date').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const unansweredQuestions = pgTable('unanswered_questions', {
  id: uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  question: text('question').notNull(),
  language: languageEnum('language').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// ─── Zod schemas derived from Drizzle (used in API validation) ───────────────

export const selectFoodLogSchema = createSelectSchema(foodLogEntries);
export const insertFoodLogSchema = createInsertSchema(foodLogEntries);
export const selectUserProfile = createSelectSchema(userProfiles);
export const insertUserProfile = createInsertSchema(userProfiles);
export const selectUserCredits = createSelectSchema(userCredits);

// ─── TypeScript types derived from schema (never hand-write these) ───────────

export type FoodLogEntry = typeof foodLogEntries.$inferSelect;
export type NewFoodLogEntry = typeof foodLogEntries.$inferInsert;
export type UserProfile = typeof userProfiles.$inferSelect;
export type NewUserProfile = typeof userProfiles.$inferInsert;
export type UserCredits = typeof userCredits.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type DiscountCode = typeof discountCodes.$inferSelect;
export type AiTip = typeof aiTips.$inferSelect;
export type CreditTransaction = typeof creditTransactions.$inferSelect;
