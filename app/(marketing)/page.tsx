import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Camera, Calculator, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function HomePage() {
  const t = useTranslations('marketing');

  return (
    <>
      <section className="container py-24 text-center">
        <h1 className="mx-auto max-w-3xl text-5xl font-bold tracking-tight sm:text-6xl">
          {t('hero.title')}
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          {t('hero.subtitle')}
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/sign-in">{t('hero.cta')}</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="#features">{t('hero.secondary')}</Link>
          </Button>
        </div>
      </section>

      <section id="features" className="container grid gap-6 py-16 md:grid-cols-3">
        <ValueProp
          icon={<Camera className="h-6 w-6" />}
          title={t('valueProps.extract.title')}
          body={t('valueProps.extract.body')}
        />
        <ValueProp
          icon={<Calculator className="h-6 w-6" />}
          title={t('valueProps.tax.title')}
          body={t('valueProps.tax.body')}
        />
        <ValueProp
          icon={<Clock className="h-6 w-6" />}
          title={t('valueProps.tracking.title')}
          body={t('valueProps.tracking.body')}
        />
      </section>

      <section className="border-t bg-muted/30 py-16">
        <div className="container">
          <h2 className="text-3xl font-bold">{t('faq.title')}</h2>
          <FaqList />
        </div>
      </section>
    </>
  );
}

function ValueProp({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
          {icon}
        </div>
        <CardTitle className="mt-4 text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">{body}</p>
      </CardContent>
    </Card>
  );
}

function FaqList() {
  const t = useTranslations('marketing.faq');
  // The list shape is defined in messages/en.json. We render a static count
  // to stay simple — when translations come back from native speakers we'll
  // convert this to a typed array via t.raw().
  const items = (t.raw('items') as { q: string; a: string }[]) ?? [];
  return (
    <dl className="mt-8 grid gap-6 md:grid-cols-2">
      {items.map((item, i) => (
        <div key={i}>
          <dt className="font-semibold">{item.q}</dt>
          <dd className="mt-1 text-muted-foreground">{item.a}</dd>
        </div>
      ))}
    </dl>
  );
}
