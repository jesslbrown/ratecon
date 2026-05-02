import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/lib/supabase/database.types';

// Statuses that grant access to subscription-gated features.
const ACTIVE_STATUSES = new Set(['trialing', 'active']);

// Returns a redirect response if the user lacks an active subscription, or
// null to indicate the request can proceed. We don't redirect unauthenticated
// users here — Supabase auth middleware handles that earlier.
export async function requireActiveSubscription(
  request: NextRequest,
): Promise<NextResponse | null> {
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: () => {},
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('user_id', user.id)
    .maybeSingle();

  if (sub?.status && ACTIVE_STATUSES.has(sub.status)) return null;

  const url = request.nextUrl.clone();
  url.pathname = '/pricing';
  url.searchParams.set('reason', 'subscription_required');
  return NextResponse.redirect(url);
}
