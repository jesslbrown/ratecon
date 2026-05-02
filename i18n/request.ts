import { cookies } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

const LOCALE_COOKIE = 'NEXT_LOCALE';

export default getRequestConfig(async () => {
  // Without a [locale] URL segment we read the locale from a cookie set by
  // the language switcher. Fall back to the default for fresh visitors.
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = routing.locales.includes(fromCookie as 'en' | 'pa' | 'hi' | 'ur')
    ? (fromCookie as 'en' | 'pa' | 'hi' | 'ur')
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
