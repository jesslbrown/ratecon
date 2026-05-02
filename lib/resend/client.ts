import { Resend } from 'resend';
import { getServerEnv } from '@/lib/env';

let cached: Resend | null = null;

export function getResend(): Resend {
  if (cached) return cached;
  cached = new Resend(getServerEnv().RESEND_API_KEY);
  return cached;
}

export function getFromAddress(): string {
  return getServerEnv().RESEND_FROM_EMAIL;
}
