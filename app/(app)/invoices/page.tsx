import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/utils';

export default async function InvoicesPage() {
  const t = await getTranslations('app.invoices');
  const supabase = await createClient();
  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, invoice_number, issue_date, total, currency, status, sent_to_email')
    .order('issue_date', { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <Button asChild>
          <Link href="/invoices/new">
            <Plus className="h-4 w-4" />
            {t('new.title')}
          </Link>
        </Button>
      </div>

      <Card className="divide-y">
        {(invoices ?? []).map((inv) => (
          <Link
            key={inv.id}
            href={`/invoices/${inv.id}`}
            className="flex items-center justify-between p-4 hover:bg-muted/40"
          >
            <div>
              <p className="font-medium">{inv.invoice_number}</p>
              <p className="text-sm text-muted-foreground">
                {formatDate(inv.issue_date)} · {inv.sent_to_email ?? '—'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant={inv.status === 'paid' ? 'success' : inv.status === 'overdue' ? 'destructive' : 'secondary'}>
                {inv.status}
              </Badge>
              <span className="font-semibold">
                {formatCurrency(Number(inv.total), inv.currency)}
              </span>
            </div>
          </Link>
        ))}
        {!invoices?.length && (
          <p className="p-8 text-center text-sm text-muted-foreground">No invoices yet.</p>
        )}
      </Card>
    </div>
  );
}
