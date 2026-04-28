/**
 * App-level profile and credits tables.
 * User IDs are Clerk user IDs (text, e.g. "user_2xxx").
 * No FK to an auth user table — Clerk owns auth.
 */
import { pgTable, pgEnum, text, timestamp, integer } from 'drizzle-orm/pg-core';

export const languageEnum = pgEnum('language', ['en', 'nl']);
export const themeEnum = pgEnum('theme', ['light', 'dark']);

export const userProfiles = pgTable('user_profiles', {
  id: text('id').primaryKey(),
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
  userId: text('user_id').primaryKey(),
  creditsRemaining: integer('credits_remaining').notNull().default(0),
  creditsUsed: integer('credits_used').notNull().default(0),
  expiresAt: timestamp('expires_at'),
  convertedToPaidAt: timestamp('converted_to_paid_at'),
});
