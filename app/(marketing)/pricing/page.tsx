import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type PlanKey = 'solo' | 'plus';

export default function PricingPage() {
  const t = useTranslations('marketing.pricing');

  return (
    <section className="container py-20">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">{t('title')}</h1>
        <p className="mt-3 text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
        <PlanCard plan="solo" />
        <PlanCard plan="plus" highlighted />
      </div>
    </section>
  );
}

function PlanCard({ plan, highlighted }: { plan: PlanKey; highlighted?: boolean }) {
  const t = useTranslations(`marketing.pricing.${plan}`);
  const tCta = useTranslations('marketing.pricing');
  const features = t.raw('features') as string[];

  return (
    <Card className={highlighted ? 'border-primary shadow-lg' : undefined}>
      <CardHeader>
        <CardTitle>{t('name')}</CardTitle>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-4xl font-bold">{t('price')}</span>
          <span className="text-muted-foreground">{t('period')}</span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{t('description')}</p>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {features.map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
        <Button asChild className="mt-6 w-full" variant={highlighted ? 'default' : 'outline'}>
          <Link href={`/sign-in?plan=${plan}`}>{tCta('cta')}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
