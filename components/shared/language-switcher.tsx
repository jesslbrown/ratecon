'use client';

import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Locale } from '@/i18n/routing';

const labels: Record<Locale, string> = {
  en: 'English',
  pa: 'ਪੰਜਾਬੀ',
  hi: 'हिन्दी',
  ur: 'اردو',
};

export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();

  function setLocale(next: Locale) {
    document.cookie = `NEXT_LOCALE=${next};path=/;max-age=31536000;samesite=lax`;
    router.refresh();
  }

  return (
    <Select value={locale} onValueChange={(v) => setLocale(v as Locale)}>
      <SelectTrigger className="w-[140px]" aria-label="Select language">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(labels) as Locale[]).map((code) => (
          <SelectItem key={code} value={code}>
            {labels[code]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
