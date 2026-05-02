import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { NewInvoiceFlow } from '@/components/forms/new-invoice-flow';

export default async function NewInvoicePage() {
  const t = await getTranslations('app.invoices.new');
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // Block invoice creation until onboarding is complete. The middleware also
  // gates this path on subscription status; this catch is for users whose
  // sub is fine but who skipped onboarding.
  if (!profile?.onboarding_completed) {
    redirect('/settings?onboarding=required');
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('uploadHint')}</p>
      </div>
      <NewInvoiceFlow />
    </div>
  );
}
