'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Database } from '@/lib/supabase/database.types';

type Subscription = Database['public']['Tables']['subscriptions']['Row'];

export function BillingPanel({ subscription }: { subscription: Subscription | null }) {
  const [busy, setBusy] = useState<'solo' | 'plus' | null>(null);

  async function start(plan: 'solo' | 'plus') {
    setBusy(plan);
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ plan }),
    });
    const json = (await res.json()) as { url?: string; message?: string };
    if (json.url) window.location.href = json.url;
    setBusy(null);
  }

  const status = subscription?.status ?? 'none';
  const plan = subscription?.plan ?? null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Status:</span>
        <Badge
          variant={
            status === 'active' || status === 'trialing'
              ? 'success'
              : status === 'past_due'
                ? 'warning'
                : 'secondary'
          }
        >
          {status}
        </Badge>
        {plan && <Badge variant="outline">{plan}</Badge>}
      </div>
      <div className="flex gap-3">
        <Button onClick={() => start('solo')} disabled={busy !== null}>
          {busy === 'solo' ? '…' : 'Subscribe to Solo · $29/mo'}
        </Button>
        <Button variant="outline" onClick={() => start('plus')} disabled={busy !== null}>
          {busy === 'plus' ? '…' : 'Subscribe to Plus · $49/mo'}
        </Button>
      </div>
    </div>
  );
}
