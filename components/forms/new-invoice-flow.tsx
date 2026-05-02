'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/card';
import { RateConDropzone } from './rate-con-dropzone';
import { InvoiceConfirmationForm } from './invoice-confirmation-form';
import type { RateConExtraction } from '@/lib/validators/rate-con';

type Step = 'upload' | 'extracting' | 'review' | 'sending' | 'done';

export function NewInvoiceFlow() {
  const t = useTranslations('app.invoices.new');
  const [step, setStep] = useState<Step>('upload');
  const [extraction, setExtraction] = useState<RateConExtraction | null>(null);
  const [rateConPath, setRateConPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createdInvoiceId, setCreatedInvoiceId] = useState<string | null>(null);

  return (
    <Card className="p-6">
      <Stepper step={step} />

      {step === 'upload' && (
        <RateConDropzone
          onError={(msg) => setError(msg)}
          onStart={() => {
            setError(null);
            setStep('extracting');
          }}
          onSuccess={(data, path) => {
            setExtraction(data);
            setRateConPath(path);
            setStep('review');
          }}
          onFailure={(msg) => {
            setError(msg);
            setStep('upload');
          }}
        />
      )}

      {step === 'extracting' && (
        <div className="py-12 text-center">
          <p className="text-lg font-medium">{t('extracting')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('extractingHint')}</p>
        </div>
      )}

      {step === 'review' && extraction && (
        <InvoiceConfirmationForm
          extraction={extraction}
          rateConPath={rateConPath}
          onSubmitting={() => setStep('sending')}
          onError={(msg) => {
            setError(msg);
            setStep('review');
          }}
          onComplete={(invoiceId) => {
            setCreatedInvoiceId(invoiceId);
            setStep('done');
          }}
        />
      )}

      {step === 'sending' && (
        <div className="py-12 text-center">
          <p className="text-lg font-medium">Generating PDF and emailing broker…</p>
        </div>
      )}

      {step === 'done' && createdInvoiceId && (
        <div className="py-12 text-center">
          <p className="text-lg font-medium">Invoice sent.</p>
          <a
            href={`/invoices/${createdInvoiceId}`}
            className="mt-2 inline-block text-sm underline"
          >
            View invoice
          </a>
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}
    </Card>
  );
}

function Stepper({ step }: { step: Step }) {
  const t = useTranslations('app.invoices.new');
  const labels = [t('step1'), t('step2'), t('step3')];
  const activeIndex =
    step === 'upload' || step === 'extracting' ? 0 : step === 'review' ? 1 : 2;

  return (
    <ol className="mb-6 flex items-center gap-2 text-sm">
      {labels.map((label, i) => (
        <li
          key={label}
          className={
            i === activeIndex
              ? 'rounded-full bg-primary px-3 py-1 text-primary-foreground'
              : 'rounded-full bg-muted px-3 py-1 text-muted-foreground'
          }
        >
          {i + 1}. {label}
        </li>
      ))}
    </ol>
  );
}
