import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { optionalAuthMiddleware } from './middleware/auth';
import { foodLogRoutes } from './routes/foodLog';
import { aiRoutes } from './routes/ai';
import { barcodeRoutes } from './routes/barcode';
import { contactRoutes } from './routes/contact';
import { paymentsRoutes } from './routes/payments';
import { chatRoutes } from './routes/chat';
import { authRoutes } from './routes/auth';
import { corsAllowedOrigins } from './origins';

export function createApiApp() {
  const app = new Hono().basePath('/api');

  app.use('*', cors({ origin: corsAllowedOrigins(), credentials: true }));

  app.route('/auth', authRoutes);
  app.route('/contact', contactRoutes);
  app.route('/food-log', foodLogRoutes);
  app.route('/ai', aiRoutes);
  app.route('/barcode', barcodeRoutes);
  app.route('/payments', paymentsRoutes);

  app.use('/chat', optionalAuthMiddleware);
  app.route('/chat', chatRoutes);

  app.onError((err, c) => {
    console.error('[API Error]', err.message, err.stack);
    return c.json({ error: err.message }, 500);
  });

  return app;
}
