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
import { paymentsRoutes } from '@/api/routes/payments';
import { chatRoutes } from '@/api/routes/chat';
import { authMiddleware, optionalAuthMiddleware, type AuthVariables } from '@/api/middleware/auth';

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
  app.route('/payments', paymentsRoutes);
  app.use('/chat', optionalAuthMiddleware);
  app.route('/chat', chatRoutes);

  return app;
}

// Chat-specific test app: optionally inject a userId (simulates auth), or leave undefined (anon)
export function createChatApp(userId?: string) {
  const app = new Hono<{ Variables: AuthVariables }>().basePath('/api');

  app.use('*', async (c, next) => {
    c.set('user', userId ? { id: userId } : undefined);
    await next();
  });

  app.route('/chat', chatRoutes);
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

  app.use('/payments/checkout', authMiddleware);
  app.use('/payments/discount', authMiddleware);
  app.use('/payments/status', authMiddleware);
  app.route('/payments', paymentsRoutes);

  app.use('/chat', optionalAuthMiddleware);
  app.route('/chat', chatRoutes);

  return app;
}
