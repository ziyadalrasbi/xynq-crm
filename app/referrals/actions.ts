'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

const VALID_STATUSES = ['offered', 'accepted', 'intro_made', 'converted', 'dead'] as const;
type ReferralStatus = (typeof VALID_STATUSES)[number];

export async function updateReferralStatus(referralId: string, formData: FormData) {
  const status = String(formData.get('status') ?? '');
  if (!VALID_STATUSES.includes(status as ReferralStatus)) {
    throw new Error('Invalid status');
  }
  const supabase = createClient();
  const { error } = await supabase
    .from('referrals')
    .update({ status })
    .eq('id', referralId);
  if (error) throw error;
  revalidatePath('/referrals');
  revalidatePath('/feed');
}

export async function updateReferralNotes(referralId: string, formData: FormData) {
  const notes = String(formData.get('notes') ?? '').trim() || null;
  const supabase = createClient();
  const { error } = await supabase
    .from('referrals')
    .update({ notes })
    .eq('id', referralId);
  if (error) throw error;
  revalidatePath('/referrals');
}
