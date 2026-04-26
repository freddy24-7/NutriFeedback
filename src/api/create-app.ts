import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { auth } from '@/lib/auth/server';
import { authMiddleware, optionalAuthMiddleware } from './middleware/auth';
import { foodLogRoutes } from './routes/foodLog';
import { aiRoutes } from './routes/ai';
import { barcodeRoutes } from './routes/barcode';
import { contactRoutes } from './routes/contact';
import { paymentsRoutes } from './routes/payments';
import { chatRoutes } from './routes/chat';
import { corsAllowedOrigins } from './origins';

export function createApiApp() {
  const app = new Hono().basePath('/api');

  app.use('*', cors({ origin: corsAllowedOrigins(), credentials: true }));

  app.on(['GET', 'POST', 'PUT', 'DELETE'], '/auth/**', async (c) => {
    const path = c.req.path;
    const method = c.req.method;
    console.log(`[auth] ${method} ${path}`);
    try {
      const result = await auth.handler(c.req.raw);
      console.log(`[auth] ${method} ${path} -> ${result.status}`);
      return result;
    } catch (e) {
      console.error('[auth] Handler error:', e);
      return c.json({ error: 'Auth service unavailable' }, 500);
    }
  });

  app.route('/contact', contactRoutes);

  app.use('/food-log/*', authMiddleware);
  app.route('/food-log', foodLogRoutes);

  app.use('/ai/*', authMiddleware);
  app.route('/ai', aiRoutes);

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
