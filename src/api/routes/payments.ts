import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { and, eq, gt, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { subscriptions, discountCodes, userCredits } from '@/lib/db/schema';
import { rateLimits } from '@/lib/redis/client';
import { CheckoutRequestSchema, DiscountValidateSchema } from '@/types/api';
import { authMiddleware, type AuthVariables } from '../middleware/auth';
import { clerkClient } from '@/lib/auth/server';
import { getStripe } from '@/lib/stripe-config';
import type Stripe from 'stripe';

const paymentsRoutes = new Hono<{ Variables: AuthVariables }>();

// ─── POST /api/payments/checkout ──────────────────────────────────────────────

paymentsRoutes.post(
  '/checkout',
  authMiddleware,
  zValidator('json', CheckoutRequestSchema),
  async (c) => {
    const user = c.get('user')!;

    const { success: withinLimit } = await rateLimits.paymentsCheckout.limit(user.id);
    if (!withinLimit) {
      return c.json({ error: 'Too many checkout attempts — try again later' }, 429);
    }

    const { priceId, successUrl, cancelUrl } = c.req.valid('json');

    const clerkUser = await clerkClient.users.getUser(user.id);
    const email = clerkUser.emailAddresses[0]?.emailAddress ?? '';
    const meta = clerkUser.publicMetadata as { stripeCustomerId?: string };

    const appUrl = process.env['VITE_APP_URL'] ?? 'http://localhost:5173';
    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: meta.stripeCustomerId ?? undefined,
      customer_email: meta.stripeCustomerId ? undefined : email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl ?? `${appUrl}/dashboard?checkout=success`,
      cancel_url: cancelUrl ?? `${appUrl}/pricing?checkout=cancelled`,
      metadata: { userId: user.id },
      subscription_data: { metadata: { userId: user.id } },
    });

    return c.json({ url: session.url });
  },
);

// ─── POST /api/payments/webhook ───────────────────────────────────────────────
// Public — Stripe calls it directly. Verifies signature before processing.

paymentsRoutes.post('/webhook', async (c) => {
  const sig = c.req.header('stripe-signature');
  const webhookSecret = process.env['STRIPE_WEBHOOK_SECRET'];

  if (!sig || !webhookSecret) {
    return c.json({ error: 'Missing Stripe signature or webhook secret' }, 400);
  }

  const body = await c.req.text();
  const stripe = getStripe();
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

      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;

      const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);
      const priceId = stripeSub.items.data[0]?.price.id ?? null;

      const plan =
        priceId === process.env['STRIPE_PRICE_ID_MONTHLY']
          ? 'pro-monthly'
          : priceId === process.env['STRIPE_PRICE_ID_YEARLY']
            ? 'pro-yearly'
            : 'pro-monthly';

      await db
        .insert(subscriptions)
        .values({
          userId,
          status: 'active',
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          stripePriceId: priceId,
          currentPeriodEnd: null,
        })
        .onConflictDoUpdate({
          target: subscriptions.userId,
          set: {
            status: 'active',
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            stripePriceId: priceId,
            updatedAt: new Date(),
          },
        });

      await db
        .update(userCredits)
        .set({ convertedToPaidAt: new Date(), expiresAt: null })
        .where(eq(userCredits.userId, userId));

      // Sync to Clerk metadata for fast client-side reads
      await clerkClient.users.updateUserMetadata(userId, {
        publicMetadata: {
          stripeCustomerId: customerId,
          subscription: { status: 'active', plan },
        },
      });
      break;
    }

    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice;
      const subId = invoice.subscription as string | null;
      if (!subId) break;
      const sub = await stripe.subscriptions.retrieve(subId);
      const userId = sub.metadata?.userId;
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

      await clerkClient.users.updateUserMetadata(userId, {
        publicMetadata: { subscription: { status: 'cancelled', plan: 'free' } },
      });
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

paymentsRoutes.post(
  '/discount',
  authMiddleware,
  zValidator('json', DiscountValidateSchema),
  async (c) => {
    const user = c.get('user')!;

    const { success: withinLimit } = await rateLimits.paymentsDiscount.limit(user.id);
    if (!withinLimit) {
      return c.json({ error: 'Too many attempts — try again later' }, 429);
    }

    const { code } = c.req.valid('json');

    const [existingSub] = await db
      .select({ status: subscriptions.status })
      .from(subscriptions)
      .where(eq(subscriptions.userId, user.id));

    if (existingSub?.status === 'active' || existingSub?.status === 'comped') {
      return c.json({ error: 'You already have an active subscription' }, 409);
    }

    const [discountRow] = await db.select().from(discountCodes).where(eq(discountCodes.code, code));

    if (!discountRow) return c.json({ error: 'Invalid discount code' }, 400);
    if (discountRow.expiresAt && discountRow.expiresAt < new Date())
      return c.json({ error: 'This discount code has expired' }, 400);
    if (discountRow.usesRemaining !== null && discountRow.usesRemaining <= 0)
      return c.json({ error: 'This discount code has no uses remaining' }, 400);

    if (discountRow.usesRemaining !== null) {
      const decremented = await db
        .update(discountCodes)
        .set({ usesRemaining: sql`${discountCodes.usesRemaining} - 1` })
        .where(and(eq(discountCodes.code, code), gt(discountCodes.usesRemaining, 0)))
        .returning({ usesRemaining: discountCodes.usesRemaining });

      if (decremented.length === 0)
        return c.json({ error: 'This discount code has no uses remaining' }, 400);
    }

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
  },
);

// ─── GET /api/payments/status ─────────────────────────────────────────────────

paymentsRoutes.get('/status', authMiddleware, async (c) => {
  const user = c.get('user')!;

  const [[sub], [credits]] = await Promise.all([
    db.select().from(subscriptions).where(eq(subscriptions.userId, user.id)),
    db.select().from(userCredits).where(eq(userCredits.userId, user.id)),
  ]);

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
