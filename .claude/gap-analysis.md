# NutriApp — Gap Analysis & Clarifications

> This file resolves every ambiguity Claude Code raised before Phase 1.
> Read this alongside `CLAUDE.md`. It is authoritative for the five issues
> listed below.

---

## Gap 1 — Hono ↔ Vercel Edge Functions Wiring

### Decision: Single composed Hono app, one Vercel Edge Function entry point.

**Not** individual per-route edge function files. One root entry point
that Vercel treats as a catch-all edge function, and Hono handles routing
internally.

### File: `src/api/index.ts` (the only Vercel Edge Function)

```ts
import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import { cors } from 'hono/cors';
import { authMiddleware } from './middleware/auth';
import { rateLimitMiddleware } from './middleware/rateLimit';
import { foodLogRoutes } from './routes/foodLog';
import { aiRoutes } from './routes/ai';
import { productsRoutes } from './routes/products';
import { stripeRoutes } from './routes/stripe';
import { discountRoutes } from './routes/discount';
import { chatRoutes } from './routes/chat';
import { contactRoutes } from './routes/contact';
import { authRoutes } from './routes/auth';

export const runtime = 'edge';  // ← tells Vercel this is an Edge Function

const app = new Hono().basePath('/api');

// Global middleware — runs on every request in this order:
app.use('*', cors({ origin: process.env.VITE_APP_URL! }));
app.use('*', rateLimitMiddleware);   // Upstash global rate limit
// Auth middleware applied per-route-group, not globally
// (contact form and chatbot are partially unauthenticated)

// Route groups
app.route('/auth',     authRoutes);      // POST /api/auth/on-signup
app.route('/food-log', authMiddleware, foodLogRoutes);
app.route('/ai',       authMiddleware, aiRoutes);
app.route('/products', authMiddleware, productsRoutes);
app.route('/stripe',   stripeRoutes);    // webhook is unauthenticated (Stripe sig)
app.route('/discount', authMiddleware, discountRoutes);
app.route('/chat',     chatRoutes);      // partially unauthenticated
app.route('/contact',  contactRoutes);   // unauthenticated

export default handle(app);
```

### File: `vercel.json` — route all `/api/*` to the single entry point

```json
{
  "functions": {
    "src/api/index.ts": {
      "runtime": "@vercel/edge"
    }
  },
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/src/api/index.ts" }
  ]
}
```

### Route file shape (all follow this pattern):

```ts
// src/api/routes/foodLog.ts
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { db } from '@/lib/db/client';
import { foodLogEntries } from '@/lib/db/schema';
import { sanitiseTextServer } from '../middleware/sanitise';
import { NewFoodEntrySchema } from '@/types/api';

const foodLogRoutes = new Hono();

foodLogRoutes.get('/', async (c) => {
  const user = c.get('user');
  const { date } = c.req.query();
  const entries = await db
    .select()
    .from(foodLogEntries)
    .where(and(eq(foodLogEntries.userId, user.id), eq(foodLogEntries.date, date)));
  return c.json(entries);
});

foodLogRoutes.post('/', zValidator('json', NewFoodEntrySchema), async (c) => {
  const user = c.get('user');
  const body = c.req.valid('json');
  const [entry] = await db
    .insert(foodLogEntries)
    .values({ ...body, description: sanitiseTextServer(body.description), userId: user.id })
    .returning();
  return c.json(entry, 201);
});

export { foodLogRoutes };
```

### Middleware shape:

```ts
// src/api/middleware/auth.ts
import { createMiddleware } from 'hono/factory';
import { createClient } from '@supabase/supabase-js';

export const authMiddleware = createMiddleware(async (c, next) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return c.json({ error: 'Unauthorized' }, 401);

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return c.json({ error: 'Unauthorized' }, 401);

  c.set('user', user);  // available as c.get('user') in all downstream handlers
  await next();
});
```

### Summary

| Question | Answer |
|----------|--------|
| One file or many? | One `src/api/index.ts` entry point |
| Router | Hono, `basePath('/api')` |
| Vercel runtime | `export const runtime = 'edge'` |
| Auth | `hono/factory` middleware, sets `c.get('user')` |
| Per-feature routes | Separate files in `src/api/routes/`, composed in `index.ts` |

---

## Gap 2 — Signup Flow: Who Creates `user_profiles` and Grants Credits?

### Decision: A dedicated Hono endpoint, called client-side after Supabase Auth signup.

Neon has no database triggers. The signup flow works as follows:

### Step 1 — Supabase Auth signup (client)

```ts
// src/lib/auth/signup.ts
import { supabase } from './client';

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}
```

### Step 2 — Supabase fires `onAuthStateChange` after email confirmation

```ts
// src/lib/auth/client.ts
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN' && session?.user) {
    // Call on-signup endpoint to provision Neon rows
    // This is idempotent — safe to call on every sign-in
    await fetch('/api/auth/on-signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
    });
  }
});
```

### Step 3 — Hono endpoint provisions Neon rows (idempotent)

```ts
// src/api/routes/auth.ts
import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { db } from '@/lib/db/client';
import { userProfiles, userCredits } from '@/lib/db/schema';

const authRoutes = new Hono();

authRoutes.post('/on-signup', authMiddleware, async (c) => {
  const user = c.get('user');

  // INSERT ... ON CONFLICT DO NOTHING — fully idempotent
  await db.insert(userProfiles)
    .values({
      id:       user.id,
      language: 'en',
      theme:    'light',
    })
    .onConflictDoNothing();

  await db.insert(userCredits)
    .values({
      userId:           user.id,
      creditsRemaining: 50,
      creditsUsed:      0,
      expiresAt:        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    })
    .onConflictDoNothing();

  return c.json({ ok: true });
});

export { authRoutes };
```

### Why `onAuthStateChange` and not a webhook?

Supabase Auth webhooks require a publicly reachable URL, which is unavailable
in local development without a tunnel (ngrok). `onAuthStateChange` works
locally with zero config and behaves identically in production.

The `onConflictDoNothing()` makes the endpoint safe to call on every login —
existing users simply get no rows inserted.

### Data flow summary:

```
User submits signup form
→ supabase.auth.signUp()           [Supabase Auth — creates auth.users row]
→ User confirms email
→ onAuthStateChange('SIGNED_IN')   [client — fires on confirmed login]
→ POST /api/auth/on-signup         [Hono route — authenticated]
→ INSERT user_profiles             [Neon — idempotent]
→ INSERT user_credits (50 credits) [Neon — idempotent]
→ Redirect to dashboard
```

---

## Gap 3 — Stripe Plan Structure

### Definitive product and pricing structure:

**Product:** "NutriApp Pro"
**Billing:** Monthly subscription
**Trial:** 50 free credits (30-day expiry, no card required)

### ⚠️ HUMAN ACTION REQUIRED — Stripe Setup

```
1. Go to https://dashboard.stripe.com/products
2. Create product:
   Name:        "NutriApp Pro"
   Description: "Full access to NutriApp nutrition tracking and AI tips"

3. Add price to the product:
   Model:    Recurring
   Amount:   €7.99 / month  (adjust as desired)
   Currency: EUR
   Interval: Monthly

4. Copy the Price ID (format: price_xxxxxxxxxxxxxxxxxxxxxxxx)
5. Add to .env.local:
   STRIPE_PRICE_ID=price_xxxxxxxxxxxxxxxxxxxxxxxx

6. Repeat steps 2-5 for Stripe TEST mode (separate price ID for dev)
   STRIPE_PRICE_ID_TEST=price_xxxxxxxxxxxxxxxxxxxxxxxx
```

### Checkout route using the price ID:

```ts
// src/api/routes/stripe.ts
stripeRoutes.post('/checkout', authMiddleware, async (c) => {
  const user = c.get('user');
  const priceId = process.env.NODE_ENV === 'production'
    ? process.env.STRIPE_PRICE_ID!
    : process.env.STRIPE_PRICE_ID_TEST!;

  const session = await stripe.checkout.sessions.create({
    mode:               'subscription',
    payment_method_types: ['card'],
    line_items:         [{ price: priceId, quantity: 1 }],
    success_url:        `${process.env.VITE_APP_URL}/dashboard?upgraded=true`,
    cancel_url:         `${process.env.VITE_APP_URL}/pricing`,
    customer_email:     user.email,
    metadata:           { userId: user.id },
    // EU SCA-compliant — Stripe handles 3DS automatically
  });

  return c.json({ url: session.url });
});
```

### Webhook handler — subscription events:

```ts
stripeRoutes.post('/webhook', async (c) => {
  const sig = c.req.header('stripe-signature')!;
  const body = await c.req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return c.json({ error: 'Invalid signature' }, 400);
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.CheckoutSession;
      const userId = session.metadata?.userId;
      if (!userId) break;
      await db.insert(subscriptions)
        .values({
          userId,
          status:               'active',
          stripeCustomerId:     session.customer as string,
          stripeSubscriptionId: session.subscription as string,
          currentPeriodEnd:     new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        })
        .onConflictDoUpdate({
          target: subscriptions.userId,
          set:    { status: 'active', stripeCustomerId: session.customer as string },
        });
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      await db.update(subscriptions)
        .set({ status: 'cancelled', currentPeriodEnd: new Date(sub.current_period_end * 1000) })
        .where(eq(subscriptions.stripeSubscriptionId, sub.id));
      break;
    }
  }

  return c.json({ received: true });
});
```

---

## Gap 4 — `src/store/` vs `src/stores/`

### Decision: `src/store/` (singular).

This matches the `src/api/` pattern (singular directory for the thing).
CLAUDE.md had a typo — `stores/` appears in one place. The correct
directory is singular: `src/store/`.

```
src/store/
├── uiStore.ts     ← theme, language
├── authStore.ts   ← current session, user object
└── index.ts       ← re-exports all stores
```

All references to `stores/` in any other file are typos. Use `store/`.

---

## Gap 5 — env.local additions needed

Add these two variables that were missing from `.env.example`:

```env
# === STRIPE PRICE IDs ===
# ACTION: Create in Stripe dashboard → Products → Add price → copy ID
STRIPE_PRICE_ID=price_live_xxx          # live mode (prod)
STRIPE_PRICE_ID_TEST=price_test_xxx     # test mode (dev)
```

---

## Summary of Decisions

| Gap | Decision |
|-----|----------|
| Hono wiring | Single `src/api/index.ts` + `vercel.json` rewrite, Hono handles routing internally |
| Signup provisioning | `onAuthStateChange` → `POST /api/auth/on-signup` → idempotent Neon inserts |
| Stripe plan | €7.99/mo "NutriApp Pro", `STRIPE_PRICE_ID` in env, human must create in dashboard |
| Directory name | `src/store/` (singular) — CLAUDE.md had a typo |
| env.example | Add `STRIPE_PRICE_ID` + `STRIPE_PRICE_ID_TEST` |
