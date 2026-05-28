'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { STAGES, type Stage } from '@/lib/design';

export async function updateDealStage(dealId: string, stage: Stage) {
  if (!STAGES.includes(stage)) throw new Error('Invalid stage');
  const supabase = createClient();
  const { error } = await supabase.from('deals').update({ stage }).eq('id', dealId);
  if (error) throw error;
  revalidatePath('/pipeline');
  revalidatePath('/');
}
