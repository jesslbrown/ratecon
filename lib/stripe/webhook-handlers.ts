import type Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, SubscriptionPlan, SubscriptionStatus } from '@/lib/supabase/database.types';

type Db = SupabaseClient<Database>;

// Resolve our internal plan ID from a Stripe price ID using env mapping.
function planFromPriceId(priceId: string | null): SubscriptionPlan | null {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_SOLO) return 'solo';
  if (priceId === process.env.STRIPE_PRICE_PLUS) return 'plus';
  return null;
}

function isoFromUnix(seconds: number | null | undefined): string | null {
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}

export async function handleSubscriptionUpsert(
  db: Db,
  subscription: Stripe.Subscription,
): Promise<void> {
  const userId =
    subscription.metadata?.user_id ??
    (typeof subscription.customer === 'string' ? null : null);
  if (!userId) {
    // Subscriptions created via the dashboard may not carry our metadata.
    // Skip rather than corrupting the table — webhook is idempotent.
    return;
  }

  const priceId = subscription.items.data[0]?.price.id ?? null;
  const plan = planFromPriceId(priceId);

  await db.from('subscriptions').upsert(
    {
      user_id: userId,
      stripe_customer_id:
        typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer.id,
      stripe_subscription_id: subscription.id,
      plan,
      status: subscription.status as SubscriptionStatus,
      trial_end: isoFromUnix(subscription.trial_end),
      current_period_end: isoFromUnix(subscription.current_period_end),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
}

export async function handleCheckoutCompleted(
  db: Db,
  session: Stripe.Checkout.Session,
): Promise<void> {
  const userId = session.client_reference_id;
  if (!userId) return;

  const customerId =
    typeof session.customer === 'string'
      ? session.customer
      : session.customer?.id ?? null;

  if (!customerId) return;

  await db
    .from('subscriptions')
    .upsert(
      {
        user_id: userId,
        stripe_customer_id: customerId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
}
