'use server';

import { revalidatePath } from 'next/cache';
import { randomBytes } from 'crypto';
import { createClient } from '@/lib/supabase/server';

function generateToken(): string {
  // URL-safe random — 24 bytes → 32 base64url chars
  return randomBytes(24).toString('base64url');
}

export async function createShareToken(formData: FormData) {
  const label = String(formData.get('label') ?? '').trim();
  if (!label) throw new Error('Label required');

  const supabase = createClient();
  const token = generateToken();
  const { error } = await supabase
    .from('share_tokens')
    .insert({ label, token });
  if (error) throw error;
  revalidatePath('/settings/share');
}

export async function revokeShareToken(tokenId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from('share_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', tokenId);
  if (error) throw error;
  revalidatePath('/settings/share');
}
