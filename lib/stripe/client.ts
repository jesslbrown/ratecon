import Stripe from 'stripe';
import { getServerEnv } from '@/lib/env';

let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (cached) return cached;
  const env = getServerEnv();
  cached = new Stripe(env.STRIPE_SECRET_KEY, {
    // Pin the API version explicitly so a Stripe library upgrade doesn't
    // silently shift webhook payload shapes under us.
    apiVersion: '2024-12-18.acacia',
    typescript: true,
  });
  return cached;
}

export const PLAN_PRICE_IDS = {
  solo: () => getServerEnv().STRIPE_PRICE_SOLO,
  plus: () => getServerEnv().STRIPE_PRICE_PLUS,
} as const;

export type PlanId = keyof typeof PLAN_PRICE_IDS;
