/**
 * Test app factory helpers.
 *
 * createTestApp(userId) — auth stubbed, injects userId directly.
 *   Use this for testing route logic (happy paths, credit checks, DB writes, etc.)
 *
 * createUnauthApp() — returns 401 for all protected routes without calling Clerk.
 *   Use this to verify 401 responses.
 *
 * createChatApp(userId?) — optional auth stub for chat-specific tests.
 */

import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';
import { aiRoutes } from '@/api/routes/ai';
import { foodLogRoutes } from '@/api/routes/foodLog';
import { barcodeRoutes } from '@/api/routes/barcode';
import { paymentsRoutes } from '@/api/routes/payments';
import { chatRoutes } from '@/api/routes/chat';
import { type AuthVariables } from '@/api/middleware/auth';

// Reusable middleware that always rejects with 401 — used by createUnauthApp.
const reject401 = createMiddleware<{ Variables: AuthVariables }>(async (c) => {
  return c.json({ error: 'Unauthorized' }, 401);
});

export function createTestApp(userId: string) {
  const app = new Hono<{ Variables: AuthVariables }>().basePath('/api');

  // Stub auth: bypass Clerk session lookup, inject userId directly.
  // authMiddleware short-circuits when user is already set, so route-level
  // middleware does not call Clerk.
  app.use('*', async (c, next) => {
    c.set('user', { id: userId });
    await next();
  });

  app.route('/ai', aiRoutes);
  app.route('/food-log', foodLogRoutes);
  app.route('/barcode', barcodeRoutes);
  app.route('/payments', paymentsRoutes);
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

  // Protected routes: always reject without calling Clerk.
  app.use('/ai/*', reject401);
  app.route('/ai', aiRoutes);

  app.use('/food-log/*', reject401);
  app.route('/food-log', foodLogRoutes);

  app.use('/barcode/*', reject401);
  app.route('/barcode', barcodeRoutes);

  app.use('/payments/checkout', reject401);
  app.use('/payments/discount', reject401);
  app.use('/payments/status', reject401);
  app.route('/payments', paymentsRoutes);

  // Chat is public — set user to undefined (anonymous) without calling Clerk.
  app.use('/chat', async (c, next) => {
    c.set('user', undefined);
    await next();
  });
  app.route('/chat', chatRoutes);

  return app;
}
