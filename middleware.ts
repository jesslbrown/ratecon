import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { requireActiveSubscription } from '@/lib/stripe/gate';

// Routes under /(app) that require an active or trialing subscription.
// We intentionally gate the magic-moment flow at /invoices/new — viewing
// existing data (read-only) stays accessible if a sub lapses.
const SUBSCRIPTION_REQUIRED_PATHS = [/^\/invoices\/new(?:\/|$)/];

export async function middleware(request: NextRequest) {
  // 1. Subscription gate for the protected app surface.
  const path = request.nextUrl.pathname;
  if (SUBSCRIPTION_REQUIRED_PATHS.some((re) => re.test(path))) {
    const gated = await requireActiveSubscription(request);
    if (gated) return gated;
  }

  // 2. Refresh Supabase auth cookies so server components see a fresh session.
  // Locale is read from a cookie inside i18n/request.ts — no rewrite needed.
  return updateSession(request);
}

export const config = {
  matcher: [
    // Skip Next internals, static files, and API routes.
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\..*).*)',
  ],
};
