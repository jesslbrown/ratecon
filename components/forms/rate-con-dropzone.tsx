'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useTranslations } from 'next-intl';
import { UploadCloud } from 'lucide-react';
import type { RateConExtraction } from '@/lib/validators/rate-con';

interface Props {
  onStart: () => void;
  onSuccess: (data: RateConExtraction, storagePath: string) => void;
  onFailure: (message: string) => void;
  onError: (message: string) => void;
}

export function RateConDropzone({ onStart, onSuccess, onFailure, onError }: Props) {
  const t = useTranslations('app.invoices.new');

  const onDrop = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) {
        onError('File exceeds the 10MB limit.');
        return;
      }

      onStart();
      const form = new FormData();
      form.append('file', file);

      try {
        const res = await fetch('/api/extract-ratecon', { method: 'POST', body: form });
        const json = (await res.json()) as
          | { ok: true; data: RateConExtraction; storagePath: string }
          | { ok: false; reason: string; message: string };
        if (!json.ok) {
          onFailure(json.message);
          return;
        }
        onSuccess(json.data, json.storagePath);
      } catch (err) {
        onFailure(err instanceof Error ? err.message : 'Upload failed.');
      }
    },
    [onStart, onSuccess, onFailure, onError],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
  });

  return (
    <div
      {...getRootProps()}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center transition-colors ${
        isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/30'
      }`}
    >
      <input {...getInputProps()} />
      <UploadCloud className="mb-3 h-10 w-10 text-muted-foreground" />
      <p className="text-base font-medium">{t('uploadHint')}</p>
      <p className="mt-1 text-xs text-muted-foreground">JPG, PNG, WebP, or PDF · max 10 MB</p>
    </div>
  );
}
