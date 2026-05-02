import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  locales: ['en', 'pa', 'hi', 'ur'] as const,
  defaultLocale: 'en',
  // Locale stays in a cookie + query param so the marketing URL doesn't have
  // /en/ prefixes — easier on SEO and shareability for the canonical site.
  localePrefix: 'as-needed',
});

export type Locale = (typeof routing.locales)[number];

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
