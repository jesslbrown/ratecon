import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createCheckoutSession } from '@/lib/stripe/checkout';

export const runtime = 'nodejs';

const bodySchema = z.object({ plan: z.enum(['solo', 'plus']) });

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) {
    return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: 'Invalid plan' }, { status: 400 });
  }

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle();

  const session = await createCheckoutSession({
    userId: user.id,
    email: user.email,
    plan: parsed.data.plan,
    customerId: sub?.stripe_customer_id ?? null,
  });

  return NextResponse.json({ url: session.url });
}
