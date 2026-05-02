'use client';

import { useTransition, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { profileSchema, type ProfileInput } from '@/lib/validators/profile';
import { saveProfile } from '@/app/(app)/settings/actions';
import type { Database } from '@/lib/supabase/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

export function ProfileForm({ initial }: { initial: Profile | null }) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      company_name: initial?.company_name ?? '',
      gst_hst_number: initial?.gst_hst_number ?? null,
      mc_number: initial?.mc_number ?? null,
      address_line1: initial?.address_line1 ?? '',
      address_line2: initial?.address_line2 ?? null,
      city: initial?.city ?? '',
      province: initial?.province ?? '',
      postal_code: initial?.postal_code ?? '',
      country: initial?.country ?? 'CA',
      phone: initial?.phone ?? '',
      language_preference: initial?.language_preference ?? 'en',
    },
  });

  function onSubmit(values: ProfileInput) {
    startTransition(async () => {
      const result = await saveProfile(values);
      setStatus(result.ok ? 'saved' : 'error');
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-3 md:grid-cols-2">
      <Field label="Company name" error={errors.company_name?.message}>
        <Input {...register('company_name')} />
      </Field>
      <Field label="Phone" error={errors.phone?.message}>
        <Input {...register('phone')} />
      </Field>
      <Field label="GST/HST number" error={errors.gst_hst_number?.message}>
        <Input {...register('gst_hst_number')} placeholder="123456789RT0001" />
      </Field>
      <Field label="MC number" error={errors.mc_number?.message}>
        <Input {...register('mc_number')} />
      </Field>
      <Field label="Address" error={errors.address_line1?.message}>
        <Input {...register('address_line1')} />
      </Field>
      <Field label="City" error={errors.city?.message}>
        <Input {...register('city')} />
      </Field>
      <Field label="Province (2-letter)" error={errors.province?.message}>
        <Input {...register('province')} maxLength={2} />
      </Field>
      <Field label="Postal code" error={errors.postal_code?.message}>
        <Input {...register('postal_code')} />
      </Field>

      <div className="md:col-span-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save'}
        </Button>
        {status === 'saved' && (
          <span className="ml-3 text-sm text-green-700">Saved.</span>
        )}
        {status === 'error' && (
          <span className="ml-3 text-sm text-destructive">Save failed.</span>
        )}
      </div>
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
