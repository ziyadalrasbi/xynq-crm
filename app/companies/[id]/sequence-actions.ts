'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { todayISO } from '@/lib/format';
import { getTemplate, shiftDate, TEMPLATE_NAMES, type TemplateName } from '@/lib/sequences/templates';
import { draftSequenceEmail } from '@/lib/claude/features/draft-sequence-email';

export async function assignSequence(companyId: string, formData: FormData) {
  const dealId = String(formData.get('deal_id') ?? '');
  const templateName = String(formData.get('template_name') ?? '');
  if (!dealId) throw new Error('deal_id required');
  if (!TEMPLATE_NAMES.includes(templateName as TemplateName)) {
    throw new Error('Invalid template');
  }
  const template = getTemplate(templateName);
  if (!template) throw new Error('Template missing');

  const supabase = createClient();
  const start = todayISO();

  // Create the email_sequences row
  const { data: seq, error: seqErr } = await supabase
    .from('email_sequences')
    .insert({
      deal_id: dealId,
      template_name: templateName,
      current_step: 0,
      next_send_date: start,
      status: 'active',
    })
    .select('id')
    .single();
  if (seqErr || !seq) throw seqErr ?? new Error('Failed to create sequence');

  // Create the placeholder sequence_emails rows (one per step)
  const emailRows = template.steps.map((step, idx) => ({
    sequence_id: seq.id,
    step_number: idx,
    scheduled_date: shiftDate(start, step.day_offset),
    status: 'draft' as const,
  }));
  const { error: emailErr } = await supabase.from('sequence_emails').insert(emailRows);
  if (emailErr) throw emailErr;

  // Generate the first draft immediately
  try {
    const draft = await draftSequenceEmail({
      companyId,
      templateName,
      stepNumber: 0,
      stepIntent: template.steps[0].intent,
    });
    await supabase
      .from('sequence_emails')
      .update({ subject: draft.subject, body: draft.body })
      .eq('sequence_id', seq.id)
      .eq('step_number', 0);
  } catch (err) {
    console.error('Failed to draft initial sequence email', err);
    // Don't throw — the cron will retry
  }

  revalidatePath(`/companies/${companyId}`);
}

export async function markSequenceEmailSent(companyId: string, emailId: string, formData: FormData) {
  const subject = String(formData.get('subject') ?? '').trim();
  const body = String(formData.get('body') ?? '').trim();

  const supabase = createClient();

  // Update the email itself
  const { data: email, error: emailErr } = await supabase
    .from('sequence_emails')
    .update({
      subject,
      body,
      status: 'sent',
      sent_date: new Date().toISOString(),
    })
    .eq('id', emailId)
    .select('sequence_id, step_number')
    .single();
  if (emailErr || !email) throw emailErr ?? new Error('Email not found');

  // Advance the sequence
  const { data: seq, error: seqFetchErr } = await supabase
    .from('email_sequences')
    .select('id, template_name, current_step')
    .eq('id', email.sequence_id)
    .single();
  if (seqFetchErr || !seq) throw seqFetchErr ?? new Error('Sequence not found');

  const template = getTemplate(seq.template_name);
  if (!template) throw new Error('Template missing');

  const nextStep = email.step_number + 1;
  if (nextStep >= template.steps.length) {
    // Sequence complete
    await supabase
      .from('email_sequences')
      .update({ status: 'completed', next_send_date: null })
      .eq('id', seq.id);
  } else {
    // Compute next_send_date as today + (next step day_offset - current step day_offset)
    const gap = template.steps[nextStep].day_offset - template.steps[email.step_number].day_offset;
    const nextSend = shiftDate(todayISO(), gap);
    await supabase
      .from('email_sequences')
      .update({ current_step: nextStep, next_send_date: nextSend })
      .eq('id', seq.id);
    // Reschedule the next email's scheduled_date based on actual send
    await supabase
      .from('sequence_emails')
      .update({ scheduled_date: nextSend })
      .eq('sequence_id', seq.id)
      .eq('step_number', nextStep);
  }

  revalidatePath(`/companies/${companyId}`);
}

export async function skipSequenceEmail(companyId: string, emailId: string, _formData?: FormData) {
  const supabase = createClient();
  const { data: email, error } = await supabase
    .from('sequence_emails')
    .update({ status: 'skipped' })
    .eq('id', emailId)
    .select('sequence_id, step_number')
    .single();
  if (error || !email) throw error ?? new Error('Email not found');

  // Advance sequence the same way as sent
  const { data: seq } = await supabase
    .from('email_sequences')
    .select('id, template_name, current_step')
    .eq('id', email.sequence_id)
    .single();
  if (!seq) return;
  const template = getTemplate(seq.template_name);
  if (!template) return;
  const nextStep = email.step_number + 1;
  if (nextStep >= template.steps.length) {
    await supabase.from('email_sequences').update({ status: 'completed' }).eq('id', seq.id);
  } else {
    const gap = template.steps[nextStep].day_offset - template.steps[email.step_number].day_offset;
    const nextSend = shiftDate(todayISO(), gap);
    await supabase
      .from('email_sequences')
      .update({ current_step: nextStep, next_send_date: nextSend })
      .eq('id', seq.id);
  }
  revalidatePath(`/companies/${companyId}`);
}

export async function pauseSequence(companyId: string, sequenceId: string) {
  const supabase = createClient();
  await supabase.from('email_sequences').update({ status: 'paused' }).eq('id', sequenceId);
  revalidatePath(`/companies/${companyId}`);
}

export async function resumeSequence(companyId: string, sequenceId: string) {
  const supabase = createClient();
  await supabase.from('email_sequences').update({ status: 'active' }).eq('id', sequenceId);
  revalidatePath(`/companies/${companyId}`);
}
