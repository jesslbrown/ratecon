import { getStripe, PLAN_PRICE_IDS, type PlanId } from './client';
import { getServerEnv } from '@/lib/env';

export async function createCheckoutSession(args: {
  userId: string;
  email: string;
  plan: PlanId;
  customerId: string | null;
}): Promise<{ url: string }> {
  const stripe = getStripe();
  const { NEXT_PUBLIC_APP_URL } = getServerEnv();

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_collection: 'if_required',
    customer: args.customerId ?? undefined,
    customer_email: args.customerId ? undefined : args.email,
    client_reference_id: args.userId,
    line_items: [{ price: PLAN_PRICE_IDS[args.plan](), quantity: 1 }],
    subscription_data: {
      // 14-day trial, no card required upfront. Stripe will email the user
      // to add a payment method before the trial ends.
      trial_period_days: 14,
      trial_settings: {
        end_behavior: { missing_payment_method: 'cancel' },
      },
      metadata: { user_id: args.userId, plan: args.plan },
    },
    success_url: `${NEXT_PUBLIC_APP_URL}/dashboard?checkout=success`,
    cancel_url: `${NEXT_PUBLIC_APP_URL}/pricing?checkout=cancelled`,
    allow_promotion_codes: true,
  });

  if (!session.url) {
    throw new Error('Stripe did not return a checkout URL');
  }
  return { url: session.url };
}
