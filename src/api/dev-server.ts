import { serve } from '@hono/node-server';
import { createApiApp } from './create-app';

const port = Number(process.env['DEV_API_PORT'] ?? 8787);
const app = createApiApp();

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`[NutriApp API] http://127.0.0.1:${info.port} (Vite proxies /api here in dev)`);
});
