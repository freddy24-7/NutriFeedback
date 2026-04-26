/**
 * Minimal serverless entry for Better Auth only (`/api/auth/**`).
 * Keeps cold starts fast on Vercel — the main `api/index.js` bundle is large (AI, Stripe, etc.).
 */
import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import { cors } from 'hono/cors';
import { auth } from '@/lib/auth/server';
import { corsAllowedOrigins } from './origins';

const app = new Hono().basePath('/api');

app.use('*', cors({ origin: corsAllowedOrigins(), credentials: true }));

app.on(['GET', 'POST'], '/auth/**', (c) => auth.handler(c.req.raw));

export default handle(app);
