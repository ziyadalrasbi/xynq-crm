import { Resend } from 'resend';

export function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'leo@xynq.io';
export const DIGEST_TO = process.env.DIGEST_TO_EMAIL ?? process.env.RESEND_FROM_EMAIL ?? null;
