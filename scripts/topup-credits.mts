import { config } from 'dotenv';
config({ path: '.env.local' }); config();
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env['DATABASE_URL'] as string);

// Upsert profile + credits for all Clerk users found in user_profiles,
// or for a specific userId passed as CLI arg: npx tsx scripts/topup-credits.mts user_xxx
const targetId = process.argv[2];

if (targetId) {
  await sql`
    INSERT INTO user_profiles (id, language, theme)
    VALUES (${targetId}, 'en', 'light')
    ON CONFLICT (id) DO NOTHING
  `;
  await sql`
    INSERT INTO user_credits (user_id, credits_remaining, credits_used, expires_at)
    VALUES (${targetId}, 9999, 0, NOW() + INTERVAL '365 days')
    ON CONFLICT (user_id) DO UPDATE SET credits_remaining = 9999, credits_used = 0
  `;
  console.log(`Done. Set 9999 credits for ${targetId}`);
} else {
  const rows = await sql`
    UPDATE user_credits SET credits_remaining = 9999, credits_used = 0
    RETURNING user_id, credits_remaining
  `;
  if (rows.length === 0) {
    console.log('No rows in user_credits. Pass your Clerk user ID:');
    console.log('  npx tsx --tsconfig tsconfig.app.json scripts/topup-credits.mts user_xxx');
  } else {
    rows.forEach((r) => console.log(`${r.user_id}: ${r.credits_remaining} credits`));
  }
}
