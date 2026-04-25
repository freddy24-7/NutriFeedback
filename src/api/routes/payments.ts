import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import Stripe from 'stripe';
import { and, eq, gt, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { subscriptions, discountCodes, userCredits, authUser } from '@/lib/db/schema';
import { rateLimits } from '@/lib/redis/client';
import { CheckoutRequestSchema, DiscountValidateSchema } from '@/types/api';
import { type AuthVariables } from '../middleware/auth';

const stripe = new Stripe(process.env['STRIPE_SECRET_KEY'] ?? '', {
  apiVersion: '2025-02-24.acacia',
});

const paymentsRoutes = new Hono<{ Variables: AuthVariables }>();

// ─── POST /api/payments/checkout ──────────────────────────────────────────────
// Creates a Stripe Checkout session and returns the hosted page URL.

paymentsRoutes.post('/checkout', zValidator('json', CheckoutRequestSchema), async (c) => {
  const user = c.get('user')!;

  const { success: withinLimit } = await rateLimits.paymentsCheckout.limit(user.id);
  if (!withinLimit) {
    return c.json({ error: 'Too many checkout attempts — try again later' }, 429);
  }

  const { priceId, successUrl, cancelUrl } = c.req.valid('json');

  // Fetch user email for Stripe prefill
  const [authUserRow] = await db
    .select({ email: authUser.email })
    .from(authUser)
    .where(eq(authUser.id, user.id));
  if (!authUserRow) return c.json({ error: 'User not found' }, 404);

  // Reuse existing Stripe customer if available
  const [existing] = await db
    .select({ stripeCustomerId: subscriptions.stripeCustomerId })
    .from(subscriptions)
    .where(eq(subscriptions.userId, user.id));

  const appUrl = process.env['VITE_APP_URL'] ?? 'http://localhost:5173';

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: existing?.stripeCustomerId ?? undefined,
    customer_email: existing?.stripeCustomerId ? undefined : authUserRow.email,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl ?? `${appUrl}/dashboard?checkout=success`,
    cancel_url: cancelUrl ?? `${appUrl}/pricing?checkout=cancelled`,
    metadata: { userId: user.id },
    subscription_data: { metadata: { userId: user.id } },
  });

  return c.json({ url: session.url });
});

// ─── POST /api/payments/webhook ───────────────────────────────────────────────
// Stripe sends events here. Verifies signature, updates DB accordingly.
// This route is intentionally PUBLIC — Stripe calls it directly.

paymentsRoutes.post('/webhook', async (c) => {
  const sig = c.req.header('stripe-signature');
  const webhookSecret = process.env['STRIPE_WEBHOOK_SECRET'];

  if (!sig || !webhookSecret) {
    return c.json({ error: 'Missing Stripe signature or webhook secret' }, 400);
  }

  const body = await c.req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch {
    return c.json({ error: 'Webhook signature verification failed' }, 400);
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      if (!userId || !session.customer || !session.subscription) break;

      await db
        .insert(subscriptions)
        .values({
          userId,
          status: 'active',
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: session.subscription as string,
          currentPeriodEnd: null,
        })
        .onConflictDoUpdate({
          target: subscriptions.userId,
          set: {
            status: 'active',
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string,
            updatedAt: new Date(),
          },
        });

      // Mark credits as converted (no longer trial-limited)
      await db
        .update(userCredits)
        .set({ convertedToPaidAt: new Date(), expiresAt: null })
        .where(eq(userCredits.userId, userId));
      break;
    }

    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice;
      const sub = invoice.subscription
        ? await stripe.subscriptions.retrieve(invoice.subscription as string)
        : null;
      const userId = sub?.metadata?.userId;
      if (!userId) break;

      const periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null;

      await db
        .update(subscriptions)
        .set({ status: 'active', currentPeriodEnd: periodEnd, updatedAt: new Date() })
        .where(eq(subscriptions.userId, userId));
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.userId;
      if (!userId) break;

      await db
        .update(subscriptions)
        .set({ status: 'cancelled', updatedAt: new Date() })
        .where(eq(subscriptions.userId, userId));
      break;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.userId;
      if (!userId) break;

      const periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null;
      const status =
        sub.status === 'active' ? 'active' : sub.status === 'canceled' ? 'cancelled' : 'expired';

      await db
        .update(subscriptions)
        .set({ status, currentPeriodEnd: periodEnd, updatedAt: new Date() })
        .where(eq(subscriptions.userId, userId));
      break;
    }
  }

  return c.json({ received: true });
});

// ─── POST /api/payments/discount ─────────────────────────────────────────────
// Validates a discount code and grants access atomically.

paymentsRoutes.post('/discount', zValidator('json', DiscountValidateSchema), async (c) => {
  const user = c.get('user')!;

  const { success: withinLimit } = await rateLimits.paymentsDiscount.limit(user.id);
  if (!withinLimit) {
    return c.json({ error: 'Too many attempts — try again later' }, 429);
  }

  const { code } = c.req.valid('json');

  // Check for an already-active subscription — don't let codes stack
  const [existingSub] = await db
    .select({ status: subscriptions.status })
    .from(subscriptions)
    .where(eq(subscriptions.userId, user.id));

  if (existingSub?.status === 'active' || existingSub?.status === 'comped') {
    return c.json({ error: 'You already have an active subscription' }, 409);
  }

  // Validate the code
  const [discountRow] = await db.select().from(discountCodes).where(eq(discountCodes.code, code));

  if (!discountRow) {
    return c.json({ error: 'Invalid discount code' }, 400);
  }
  if (discountRow.expiresAt && discountRow.expiresAt < new Date()) {
    return c.json({ error: 'This discount code has expired' }, 400);
  }
  if (discountRow.usesRemaining !== null && discountRow.usesRemaining <= 0) {
    return c.json({ error: 'This discount code has no uses remaining' }, 400);
  }

  // Atomically decrement usesRemaining — WHERE guard prevents double-redemption
  if (discountRow.usesRemaining !== null) {
    const decremented = await db
      .update(discountCodes)
      .set({ usesRemaining: sql`${discountCodes.usesRemaining} - 1` })
      .where(and(eq(discountCodes.code, code), gt(discountCodes.usesRemaining, 0)))
      .returning({ usesRemaining: discountCodes.usesRemaining });

    if (decremented.length === 0) {
      return c.json({ error: 'This discount code has no uses remaining' }, 400);
    }
  }

  // Grant access based on discount type
  if (discountRow.type === 'beta' || discountRow.type === 'influencer') {
    await db
      .insert(subscriptions)
      .values({ userId: user.id, status: 'comped' })
      .onConflictDoUpdate({
        target: subscriptions.userId,
        set: { status: 'comped', updatedAt: new Date() },
      });

    await db
      .update(userCredits)
      .set({ expiresAt: null, convertedToPaidAt: new Date() })
      .where(eq(userCredits.userId, user.id));
  } else {
    const days = discountRow.trialDays ?? 30;
    const newExpiry = new Date();
    newExpiry.setDate(newExpiry.getDate() + days);

    await db
      .insert(subscriptions)
      .values({ userId: user.id, status: 'trial' })
      .onConflictDoUpdate({
        target: subscriptions.userId,
        set: { status: 'trial', updatedAt: new Date() },
      });

    await db
      .update(userCredits)
      .set({ expiresAt: newExpiry })
      .where(eq(userCredits.userId, user.id));
  }

  return c.json({ granted: true, type: discountRow.type });
});

// ─── GET /api/payments/status ─────────────────────────────────────────────────
// Returns the user's current subscription status + credit info.

paymentsRoutes.get('/status', async (c) => {
  const user = c.get('user')!;

  const [[sub], [credits]] = await Promise.all([
    db.select().from(subscriptions).where(eq(subscriptions.userId, user.id)),
    db.select().from(userCredits).where(eq(userCredits.userId, user.id)),
  ]);

  // Auto-expire trial if credits have run out and expiry passed
  if (sub?.status === 'trial' && credits?.expiresAt && credits.expiresAt < new Date()) {
    await db
      .update(subscriptions)
      .set({ status: 'expired', updatedAt: new Date() })
      .where(eq(subscriptions.userId, user.id));

    return c.json({
      status: 'expired',
      currentPeriodEnd: null,
      creditsRemaining: credits.creditsRemaining,
      creditsExpiresAt: credits.expiresAt.toISOString(),
    });
  }

  return c.json({
    status: sub?.status ?? 'trial',
    currentPeriodEnd: sub?.currentPeriodEnd?.toISOString() ?? null,
    creditsRemaining: credits?.creditsRemaining ?? 0,
    creditsExpiresAt: credits?.expiresAt?.toISOString() ?? null,
  });
});

export { paymentsRoutes };
