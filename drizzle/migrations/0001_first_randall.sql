ALTER TABLE "account" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "session" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "verification" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "account" CASCADE;--> statement-breakpoint
DROP TABLE "session" CASCADE;--> statement-breakpoint
DROP TABLE "user" CASCADE;--> statement-breakpoint
DROP TABLE "verification" CASCADE;--> statement-breakpoint
ALTER TABLE "ai_tips" DROP CONSTRAINT "ai_tips_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "chatbot_sessions" DROP CONSTRAINT "chatbot_sessions_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "credit_transactions" DROP CONSTRAINT "credit_transactions_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "food_log_entries" DROP CONSTRAINT "food_log_entries_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "products" DROP CONSTRAINT "products_created_by_user_id_fk";
--> statement-breakpoint
ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "user_credits" DROP CONSTRAINT "user_credits_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "user_profiles" DROP CONSTRAINT "user_profiles_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "unanswered_questions" ALTER COLUMN "language" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "stripe_price_id" text;