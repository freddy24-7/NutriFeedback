/**
 * Test app factory helpers.
 *
 * createTestApp(userId) — auth stubbed, injects userId directly.
 *   Use this for testing route logic (happy paths, credit checks, DB writes, etc.)
 *
 * createUnauthApp() — real authMiddleware mounted, no session cookie provided.
 *   Use this to verify 401 responses.
 */

import { Hono } from 'hono';
import { aiRoutes } from '@/api/routes/ai';
import { foodLogRoutes } from '@/api/routes/foodLog';
import { barcodeRoutes } from '@/api/routes/barcode';
import { authMiddleware, type AuthVariables } from '@/api/middleware/auth';

export function createTestApp(userId: string) {
  const app = new Hono<{ Variables: AuthVariables }>().basePath('/api');

  // Stub auth: bypass Better Auth session lookup, inject userId directly.
  app.use('*', async (c, next) => {
    c.set('user', { id: userId });
    await next();
  });

  app.route('/ai', aiRoutes);
  app.route('/food-log', foodLogRoutes);
  app.route('/barcode', barcodeRoutes);

  return app;
}

export function createUnauthApp() {
  const app = new Hono<{ Variables: AuthVariables }>().basePath('/api');

  // Real auth middleware — rejects requests without a valid session cookie.
  app.use('/ai/*', authMiddleware);
  app.route('/ai', aiRoutes);

  app.use('/food-log/*', authMiddleware);
  app.route('/food-log', foodLogRoutes);

  app.use('/barcode/*', authMiddleware);
  app.route('/barcode', barcodeRoutes);

  return app;
}
