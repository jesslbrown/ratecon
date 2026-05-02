import { NextResponse, type NextRequest } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe/client';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getServerEnv } from '@/lib/env';
import {
  handleCheckoutCompleted,
  handleSubscriptionUpsert,
} from '@/lib/stripe/webhook-handlers';

export const runtime = 'nodejs';
// Stripe requires the raw body for signature verification.
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature');
  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  const env = getServerEnv();
  const stripe = getStripe();
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return NextResponse.json(
      { error: `Invalid signature: ${err instanceof Error ? err.message : 'unknown'}` },
      { status: 400 },
    );
  }

  // Idempotency: insert the event id into a dedup table. If the row already
  // exists we acknowledge with 200 without re-processing.
  const db = createServiceRoleClient();
  const { error: dedupeError } = await db
    .from('stripe_events')
    .insert({ id: event.id });
  if (dedupeError && dedupeError.code !== '23505') {
    return NextResponse.json({ error: 'Dedupe insert failed' }, { status: 500 });
  }
  if (dedupeError?.code === '23505') {
    return NextResponse.json({ received: true, deduped: true });
  }

  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(db, event.data.object);
      break;
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await handleSubscriptionUpsert(db, event.data.object);
      break;
    default:
      // Unhandled event types still return 200 — keeps Stripe from retrying.
      break;
  }

  return NextResponse.json({ received: true });
}
