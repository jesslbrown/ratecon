import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';

export default async function BrokersPage() {
  const supabase = await createClient();
  const { data: brokers } = await supabase
    .from('brokers')
    .select('id, name, ap_email, phone, payment_terms_days')
    .order('name');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Brokers</h1>
      <Card className="divide-y">
        {(brokers ?? []).map((b) => (
          <div key={b.id} className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium">{b.name}</p>
              <p className="text-sm text-muted-foreground">
                {b.ap_email ?? '—'} · {b.phone ?? '—'}
              </p>
            </div>
            <span className="text-sm text-muted-foreground">
              {b.payment_terms_days}-day terms
            </span>
          </div>
        ))}
        {!brokers?.length && (
          <p className="p-8 text-center text-sm text-muted-foreground">
            No brokers yet. They&apos;ll appear here automatically when you create your first invoice.
          </p>
        )}
      </Card>
    </div>
  );
}
