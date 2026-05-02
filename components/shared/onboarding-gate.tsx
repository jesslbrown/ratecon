'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Database } from '@/lib/supabase/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

// Three-step onboarding modal. Skippable, but the magic-moment flow is
// blocked separately by middleware until onboarding_completed is true.
export function OnboardingGate({ profile }: { profile: Profile | null }) {
  const t = useTranslations('app.onboarding');
  const [open, setOpen] = useState(profile ? !profile.onboarding_completed : false);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('subtitle')}</DialogDescription>
        </DialogHeader>
        <ol className="text-sm">
          <li className={step === 1 ? 'font-semibold' : 'text-muted-foreground'}>
            1. {t('step1')}
          </li>
          <li className={step === 2 ? 'font-semibold' : 'text-muted-foreground'}>
            2. {t('step2')}
          </li>
          <li className={step === 3 ? 'font-semibold' : 'text-muted-foreground'}>
            3. {t('step3')}
          </li>
        </ol>
        <p className="text-sm text-muted-foreground">
          {/* TODO(onboarding): wire up real form fields and persistence here. */}
          The full onboarding form lives in /settings — we'll embed it inline
          here after the MVP launches.
        </p>
        <div className="flex justify-between gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {t('skip')}
          </Button>
          {step < 3 ? (
            <Button onClick={() => setStep((s) => (s < 3 ? ((s + 1) as 2 | 3) : s))}>
              {t('continue')}
            </Button>
          ) : (
            <Button onClick={() => setOpen(false)}>{t('finish')}</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
