import { clerkClient } from '@/lib/auth/server';
import { getStripe } from '@/lib/stripe-config';

export type SubscriptionPlan = 'free' | 'pro-monthly' | 'pro-yearly';

export interface SubscriptionInfo {
  plan: SubscriptionPlan;
  status: string;
  stripeCustomerId?: string;
}

function planFromPriceId(priceId: string | null | undefined): SubscriptionPlan {
  if (!priceId) return 'free';
  if (priceId === process.env['STRIPE_PRICE_ID_MONTHLY']) return 'pro-monthly';
  if (priceId === process.env['STRIPE_PRICE_ID_YEARLY']) return 'pro-yearly';
  return 'free';
}

/**
 * Resolves the subscription plan for a Clerk user.
 * Priority:
 *   1. Clerk publicMetadata.subscription — fastest, no Stripe call
 *   2. Stripe subscriptions.list via stored stripeCustomerId — fallback
 *   3. "free" on any error
 */
export async function resolveSubscription(userId: string): Promise<SubscriptionInfo> {
  try {
    const user = await clerkClient.users.getUser(userId);
    const meta = user.publicMetadata as {
      stripeCustomerId?: string;
      subscription?: { status: string; plan: SubscriptionPlan };
    };

    if (meta.subscription?.status === 'active') {
      return {
        plan: meta.subscription.plan ?? 'free',
        status: 'active',
        stripeCustomerId: meta.stripeCustomerId,
      };
    }

    if (meta.stripeCustomerId) {
      const stripe = getStripe();
      const subs = await stripe.subscriptions.list({
        customer: meta.stripeCustomerId,
        status: 'active',
        limit: 1,
      });
      if (subs.data.length > 0) {
        const sub = subs.data[0]!;
        const priceId = sub.items.data[0]?.price.id;
        return {
          plan: planFromPriceId(priceId),
          status: 'active',
          stripeCustomerId: meta.stripeCustomerId,
        };
      }
    }
  } catch {
    // Fall through to free
  }

  return { plan: 'free', status: 'free' };
}

export function hasProSubscription(plan: SubscriptionPlan): boolean {
  return plan === 'pro-monthly' || plan === 'pro-yearly';
}
