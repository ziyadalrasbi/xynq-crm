'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

/**
 * Approve an auto-generated draft. Creates an interaction record of type
 * 'email_sent' with the (possibly edited) body as the summary, and marks the
 * draft approved.
 */
export async function approveDraft(draftId: string, formData: FormData) {
  const subject = String(formData.get('subject') ?? '').trim();
  const body = String(formData.get('body') ?? '').trim();
  if (!subject || !body) throw new Error('Subject and body required');

  const supabase = createClient();
  const { data: draft, error } = await supabase
    .from('ai_drafts')
    .select('id, deal_id, company_id, status')
    .eq('id', draftId)
    .single();
  if (error || !draft) throw error ?? new Error('Draft not found');
  if (draft.status !== 'pending') throw new Error('Draft is not pending');

  // Create the interaction
  const summary = `Subject: ${subject}\n\n${body}`;
  await supabase.from('interactions').insert({
    company_id: draft.company_id,
    deal_id: draft.deal_id,
    type: 'email_sent',
    summary,
    date: new Date().toISOString(),
  });

  // Mark draft approved
  await supabase
    .from('ai_drafts')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
      subject,
      body,
    })
    .eq('id', draftId);

  revalidatePath('/inbox');
  revalidatePath('/');
  revalidatePath(`/companies/${draft.company_id}`);
}

export async function dismissDraft(draftId: string, _formData?: FormData) {
  const supabase = createClient();
  await supabase
    .from('ai_drafts')
    .update({ status: 'dismissed', dismissed_at: new Date().toISOString() })
    .eq('id', draftId);
  revalidatePath('/inbox');
  revalidatePath('/');
}

export async function regenerateDraft(draftId: string) {
  const supabase = createClient();
  // Mark current draft dismissed; the next cron run will create a new one.
  await supabase
    .from('ai_drafts')
    .update({ status: 'dismissed', dismissed_at: new Date().toISOString() })
    .eq('id', draftId);
  revalidatePath('/inbox');
}
