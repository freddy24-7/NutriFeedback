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

import { authUser, languageEnum, userProfiles, userCredits } from './schema-better-auth';

export {
  languageEnum,
  themeEnum,
  authUser,
  authSession,
  authAccount,
  authVerification,
  userProfiles,
  userCredits,
} from './schema-better-auth';

// ─── Enums ───────────────────────────────────────────────────────────────────

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

// ─── App tables ──────────────────────────────────────────────────────────────
// userId fields reference authUser.id (text) — not uuid — to match Better Auth.

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
