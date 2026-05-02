'use client';

import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { loadInputSchema, type LoadInput } from '@/lib/validators/load';
import type { RateConExtraction } from '@/lib/validators/rate-con';
import { calculateTax } from '@/lib/tax/canadian-tax';
import type { ProvinceCode } from '@/lib/tax/canadian-tax';
import { formatCurrency } from '@/lib/utils';

interface Props {
  extraction: RateConExtraction;
  rateConPath: string | null;
  onSubmitting: () => void;
  onComplete: (invoiceId: string) => void;
  onError: (message: string) => void;
}

// Convert nullable extracted strings into the typed Load shape. Anything
// missing falls back to an empty string so the user is forced to confirm.
function seedFromExtraction(e: RateConExtraction): Partial<LoadInput> {
  return {
    load_number: e.load_number ?? '',
    pickup_date: e.pickup_date ?? '',
    pickup_address_line1: e.pickup_address ?? '',
    pickup_city: e.pickup_city ?? '',
    pickup_province: (e.pickup_state_or_province ?? '').toUpperCase(),
    pickup_postal_code: e.pickup_postal_code ?? '',
    pickup_country: 'CA',
    delivery_date: e.delivery_date ?? '',
    delivery_address_line1: e.delivery_address ?? '',
    delivery_city: e.delivery_city ?? '',
    delivery_province: (e.delivery_state_or_province ?? '').toUpperCase(),
    delivery_postal_code: e.delivery_postal_code ?? '',
    delivery_country: 'CA',
    distance_miles: e.distance_miles ?? null,
    equipment_type: e.equipment_type ?? null,
    line_haul_rate: e.line_haul_rate ?? 0,
    fuel_surcharge: e.fuel_surcharge ?? 0,
    accessorials: e.accessorials,
    payment_terms_days: e.payment_terms_days ?? 30,
    currency: e.currency ?? 'CAD',
  };
}

export function InvoiceConfirmationForm({
  extraction,
  rateConPath,
  onSubmitting,
  onComplete,
  onError,
}: Props) {
  const t = useTranslations('app.invoices.new');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LoadInput>({
    resolver: zodResolver(loadInputSchema),
    defaultValues: { broker_id: null, ...seedFromExtraction(extraction) },
  });

  const lineHaul = Number(watch('line_haul_rate') || 0);
  const fuel = Number(watch('fuel_surcharge') || 0);
  const accessorialTotal = (extraction.accessorials ?? []).reduce(
    (acc, a) => acc + Number(a.amount || 0),
    0,
  );
  const subtotal = lineHaul + fuel + accessorialTotal;

  const pickup = (watch('pickup_province') || '').toUpperCase();
  const delivery = (watch('delivery_province') || '').toUpperCase();

  const tax = useMemo(
    () =>
      calculateTax({
        pickupProvince: (pickup || null) as ProvinceCode | null,
        deliveryProvince: (delivery || null) as ProvinceCode | null,
        isInternational: false,
        carrierIsGstRegistered: true,
      }),
    [pickup, delivery],
  );

  const taxAmount = subtotal * tax.rate;
  const total = subtotal + taxAmount;
  const currency = watch('currency') || 'CAD';

  async function onSubmit(values: LoadInput) {
    onSubmitting();
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          load: values,
          broker: {
            name: extraction.broker_name ?? 'Unknown broker',
            mc_number: extraction.broker_mc_number,
            ap_email: extraction.broker_ap_email,
            phone: extraction.broker_phone,
          },
          rateConPath,
        }),
      });
      const json = (await res.json()) as
        | { ok: true; invoiceId: string }
        | { ok: false; message: string };
      if (!json.ok) {
        onError(json.message);
        return;
      }

      // Magic moment: render PDF + email broker as one continuation step.
      const sendRes = await fetch('/api/send-invoice', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ invoiceId: json.invoiceId }),
      });
      const sendJson = (await sendRes.json()) as { ok: boolean; message?: string };
      if (!sendJson.ok) {
        // Invoice exists; send failed. Surface, but let the user retry from
        // the detail page rather than blocking forward progress.
        onError(sendJson.message ?? 'Email failed — invoice saved as draft.');
        return;
      }
      onComplete(json.invoiceId);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to create invoice.');
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <h2 className="text-lg font-semibold">{t('reviewTitle')}</h2>
      <p className="text-sm text-muted-foreground">{t('reviewSubtitle')}</p>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Load number" error={errors.load_number?.message}>
          <Input {...register('load_number')} />
        </Field>
        <Field label="Currency">
          <Input {...register('currency')} />
        </Field>

        <Field label="Pickup date" error={errors.pickup_date?.message}>
          <Input type="date" {...register('pickup_date')} />
        </Field>
        <Field label="Delivery date" error={errors.delivery_date?.message}>
          <Input type="date" {...register('delivery_date')} />
        </Field>

        <Field label="Pickup city" error={errors.pickup_city?.message}>
          <Input {...register('pickup_city')} />
        </Field>
        <Field label="Pickup province (2-letter)" error={errors.pickup_province?.message}>
          <Input {...register('pickup_province')} maxLength={2} />
        </Field>

        <Field label="Delivery city" error={errors.delivery_city?.message}>
          <Input {...register('delivery_city')} />
        </Field>
        <Field
          label="Delivery province (2-letter)"
          error={errors.delivery_province?.message}
        >
          <Input {...register('delivery_province')} maxLength={2} />
        </Field>

        <Field label="Line haul rate" error={errors.line_haul_rate?.message}>
          <Input type="number" step="0.01" {...register('line_haul_rate', { valueAsNumber: true })} />
        </Field>
        <Field label="Fuel surcharge" error={errors.fuel_surcharge?.message}>
          <Input type="number" step="0.01" {...register('fuel_surcharge', { valueAsNumber: true })} />
        </Field>

        <Field label="Payment terms (days)">
          <Input type="number" {...register('payment_terms_days', { valueAsNumber: true })} />
        </Field>
      </div>

      {tax.qstApplies && (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {t('qstWarning')}
        </p>
      )}

      <div className="rounded-md border bg-muted/30 p-4 text-sm">
        <Row label="Subtotal" value={formatCurrency(subtotal, currency as 'CAD' | 'USD')} />
        <Row
          label={`GST/HST (${(tax.rate * 100).toFixed(2)}%)`}
          value={formatCurrency(taxAmount, currency as 'CAD' | 'USD')}
        />
        <Row label="Total" value={formatCurrency(total, currency as 'CAD' | 'USD')} bold />
        <p className="mt-2 text-xs text-muted-foreground">{tax.explanation}</p>
      </div>

      <Button type="submit" size="lg" className="w-full">
        {t('send')}
      </Button>
    </form>
  );
}

function Field({
  label,
  children,
  error,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between py-1 ${bold ? 'font-semibold' : ''}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
