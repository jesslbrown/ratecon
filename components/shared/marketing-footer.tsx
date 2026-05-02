import { useTranslations } from 'next-intl';

export function MarketingFooter() {
  const t = useTranslations('marketing.footer');
  const year = new Date().getFullYear();

  return (
    <footer className="border-t">
      <div className="container flex h-16 items-center justify-between text-sm text-muted-foreground">
        <span>{t('tagline')}</span>
        <span>
          {t('copyright')} {year}
        </span>
      </div>
    </footer>
  );
}
