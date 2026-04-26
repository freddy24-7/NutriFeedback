import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '@/lib/db/client-auth';
import {
  authUser,
  authSession,
  authAccount,
  authVerification,
  userProfiles,
  userCredits,
} from '@/lib/db/schema-better-auth';
import { corsAllowedOrigins } from '@/api/origins';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: authUser,
      session: authSession,
      account: authAccount,
      verification: authVerification,
    },
  }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      if (process.env['NODE_ENV'] !== 'production') {
        console.log(`[DEV] Password reset for ${user.email}: ${url}`);
        return;
      }
      // TODO Phase 1 wrap-up: send via Resend when RESEND_API_KEY is configured
    },
  },

  // Provision app rows immediately after Better Auth creates the user.
  // onConflictDoNothing makes this safe to call even if rows already exist.
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await db
            .insert(userProfiles)
            .values({
              id: user.id,
              language: 'en',
              theme: 'light',
            })
            .onConflictDoNothing();

          await db
            .insert(userCredits)
            .values({
              userId: user.id,
              creditsRemaining: 50,
              creditsUsed: 0,
              expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            })
            .onConflictDoNothing();
        },
      },
    },
  },

  trustedOrigins: corsAllowedOrigins(),
});
