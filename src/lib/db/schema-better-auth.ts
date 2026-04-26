/**
 * Better Auth + first-run profile/credits tables only.
 * Bundled with the dedicated auth serverless entry (`api/auth.js`) to keep cold starts small.
 * Full app schema lives in `schema.ts` (re-exports these).
 */
import { pgTable, pgEnum, text, timestamp, integer, boolean } from 'drizzle-orm/pg-core';

export const languageEnum = pgEnum('language', ['en', 'nl']);
export const themeEnum = pgEnum('theme', ['light', 'dark']);

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

// ─── App tables tied to sign-up ──────────────────────────────────────────────

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

export const userCredits = pgTable('user_credits', {
  userId: text('user_id')
    .primaryKey()
    .references(() => authUser.id, { onDelete: 'cascade' }),
  creditsRemaining: integer('credits_remaining').notNull().default(0),
  creditsUsed: integer('credits_used').notNull().default(0),
  expiresAt: timestamp('expires_at'),
  convertedToPaidAt: timestamp('converted_to_paid_at'),
});
