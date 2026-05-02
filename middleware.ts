import { type NextRequest, NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { updateSession } from '@/lib/supabase/middleware';
import { routing } from '@/i18n/routing';
import { requireActiveSubscription } from '@/lib/stripe/gate';

const intlMiddleware = createIntlMiddleware(routing);

// Routes under /(app) that require an active or trialing subscription.
// We intentionally gate the magic-moment flow at /invoices/new — viewing
// existing data (read-only) stays accessible if a sub lapses.
const SUBSCRIPTION_REQUIRED_PATHS = [/^\/invoices\/new(?:\/|$)/];

export async function middleware(request: NextRequest) {
  // 1. Refresh Supabase auth cookies so server components see a fresh session.
  const authResponse = await updateSession(request);

  // 2. Run next-intl locale negotiation.
  const intlResponse = intlMiddleware(request);

  // 3. Subscription gate for the protected app surface.
  const path = request.nextUrl.pathname;
  if (SUBSCRIPTION_REQUIRED_PATHS.some((re) => re.test(path))) {
    const gated = await requireActiveSubscription(request);
    if (gated) return gated;
  }

  // Merge cookies set by Supabase into the intl response.
  authResponse.cookies.getAll().forEach((cookie) => {
    intlResponse.cookies.set(cookie.name, cookie.value);
  });

  return intlResponse ?? NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next internals, static files, and API routes.
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\..*).*)',
  ],
};
