import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: invoice } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', id)
    .single();

  if (!invoice) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{invoice.invoice_number}</h1>
        <Badge variant={invoice.status === 'paid' ? 'success' : 'secondary'}>
          {invoice.status}
        </Badge>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2">
          <Row label="Issue date" value={formatDate(invoice.issue_date)} />
          <Row label="Due date" value={formatDate(invoice.due_date)} />
          <Row label="Subtotal" value={formatCurrency(Number(invoice.subtotal), invoice.currency)} />
          <Row
            label={`GST/HST (${(Number(invoice.gst_hst_rate) * 100).toFixed(2)}%)`}
            value={formatCurrency(Number(invoice.gst_hst_amount), invoice.currency)}
          />
          <Row label="Total" value={formatCurrency(Number(invoice.total), invoice.currency)} />
          <Row label="Sent to" value={invoice.sent_to_email ?? '—'} />
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b py-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
