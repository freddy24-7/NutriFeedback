import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env['STRIPE_SECRET_KEY'] ?? '', {
      apiVersion: '2025-02-24.acacia',
    });
  }
  return _stripe;
}

export const STRIPE_PRICE_MONTHLY = process.env['STRIPE_PRICE_ID_MONTHLY'] ?? '';
export const STRIPE_PRICE_YEARLY = process.env['STRIPE_PRICE_ID_YEARLY'] ?? '';
