import { config } from 'dotenv';
config({ path: '.env.local' }); config();
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env['DATABASE_URL'] as string);
const profiles = await sql`SELECT id FROM user_profiles LIMIT 10`;
const credits = await sql`SELECT user_id, credits_remaining FROM user_credits LIMIT 10`;
console.log('user_profiles:', profiles);
console.log('user_credits:', credits);
