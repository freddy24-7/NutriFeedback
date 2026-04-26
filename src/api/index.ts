import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import { cors } from 'hono/cors';
import { auth } from '@/lib/auth/server';
import { authMiddleware, optionalAuthMiddleware } from './middleware/auth';
import { foodLogRoutes } from './routes/foodLog';
import { aiRoutes } from './routes/ai';
import { barcodeRoutes } from './routes/barcode';
import { contactRoutes } from './routes/contact';
import { paymentsRoutes } from './routes/payments';
import { chatRoutes } from './routes/chat';

const appUrl = process.env['VITE_APP_URL'] ?? 'http://localhost:5173';

const app = new Hono().basePath('/api');

app.use('*', cors({ origin: appUrl, credentials: true }));

// Better Auth handles all /api/auth/** routes (sign-in, sign-up, session, etc.)
app.on(['GET', 'POST'], '/auth/**', (c) => auth.handler(c.req.raw));

// Public routes
app.route('/contact', contactRoutes);

// Protected routes
app.use('/food-log/*', authMiddleware);
app.route('/food-log', foodLogRoutes);

app.use('/ai/*', authMiddleware);
app.route('/ai', aiRoutes);

app.use('/barcode/*', authMiddleware);
app.route('/barcode', barcodeRoutes);

// Payment routes — webhook is public (Stripe calls it directly, signature-verified internally).
// All other /payments/* sub-paths require auth.
app.use('/payments/checkout', authMiddleware);
app.use('/payments/discount', authMiddleware);
app.use('/payments/status', authMiddleware);
app.route('/payments', paymentsRoutes);

// Chat is semi-public — optional auth injected by middleware, rate limited per IP for anon
app.use('/chat', optionalAuthMiddleware);
app.route('/chat', chatRoutes);

export default handle(app);
