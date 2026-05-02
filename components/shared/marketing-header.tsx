import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

export function MarketingHeader() {
  const t = useTranslations('marketing.nav');

  return (
    <header className="border-b">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          RateCon
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/#features" className="text-muted-foreground hover:text-foreground">
            {t('features')}
          </Link>
          <Link href="/pricing" className="text-muted-foreground hover:text-foreground">
            {t('pricing')}
          </Link>
          <Link href="/sign-in" className="text-muted-foreground hover:text-foreground">
            {t('signIn')}
          </Link>
          <Button asChild size="sm">
            <Link href="/sign-in">{t('getStarted')}</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
