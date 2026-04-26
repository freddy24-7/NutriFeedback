/* Preload for local API: .env.local then .env (used by NODE_OPTIONS --require). */
const { resolve } = require('node:path');
const dotenv = require('dotenv');

dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config();
