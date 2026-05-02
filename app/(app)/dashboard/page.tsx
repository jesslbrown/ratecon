import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';

export default async function DashboardPage() {
  const t = await getTranslations('app.dashboard');
  const supabase = await createClient();

  // Three KPI queries in parallel. Each uses RLS so we don't need to filter
  // by user_id explicitly — the policy enforces it.
  const [{ data: unpaid }, { data: thisMonth }, { data: overdue }] = await Promise.all([
    supabase.from('invoices').select('total').neq('status', 'paid'),
    supabase
      .from('invoices')
      .select('total')
      .gte('issue_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
    supabase.from('invoices').select('total').eq('status', 'overdue'),
  ]);

  const sum = (rows: { total: number }[] | null) =>
    (rows ?? []).reduce((acc, r) => acc + Number(r.total), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <Button asChild>
          <Link href="/invoices/new">
            <Plus className="h-4 w-4" />
            {t('newInvoice')}
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Kpi label={t('kpi.unpaid')} value={formatCurrency(sum(unpaid))} />
        <Kpi label={t('kpi.thisMonth')} value={formatCurrency(sum(thisMonth))} />
        <Kpi label={t('kpi.overdue')} value={formatCurrency(sum(overdue))} />
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
