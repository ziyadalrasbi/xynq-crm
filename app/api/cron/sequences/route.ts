import { NextResponse } from 'next/server';
import { requireCronAuth } from '@/lib/cron-auth';
import { createClient } from '@/lib/supabase/server';
import { addDaysISO } from '@/lib/format';
import { getTemplate } from '@/lib/sequences/templates';
import { draftSequenceEmail } from '@/lib/claude/features/draft-sequence-email';

export const runtime = 'nodejs';
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

/**
 * Daily cron. Finds draft sequence emails scheduled within the next 2 days
 * that don't have a body yet, and generates the draft via Claude.
 *
 * Two-day lookahead means Leo always has approve-ready drafts a day before
 * they're due to go out.
 */
export async function GET(request: Request) {
  const unauth = requireCronAuth(request);
  if (unauth) return unauth;

  const supabase = createClient();
  const horizon = addDaysISO(2);

  const { data: pending, error } = await supabase
    .from('sequence_emails')
    .select(`
      id, step_number, scheduled_date, body,
      sequence:email_sequences!inner (id, template_name, status, deal:deals!inner (id, company_id))
    `)
    .eq('status', 'draft')
    .is('body', null)
    .lte('scheduled_date', horizon);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results: { id: string; ok: boolean; error?: string }[] = [];

  for (const email of pending ?? []) {
    const seq = (email as any).sequence;
    if (!seq || seq.status !== 'active') {
      results.push({ id: email.id, ok: false, error: 'sequence not active' });
      continue;
    }
    const template = getTemplate(seq.template_name);
    if (!template) {
      results.push({ id: email.id, ok: false, error: `unknown template ${seq.template_name}` });
      continue;
    }
    const step = template.steps[email.step_number];
    if (!step) {
      results.push({ id: email.id, ok: false, error: `step ${email.step_number} out of range` });
      continue;
    }
    try {
      const draft = await draftSequenceEmail({
        companyId: seq.deal.company_id,
        templateName: seq.template_name,
        stepNumber: email.step_number,
        stepIntent: step.intent,
      });
      await supabase
        .from('sequence_emails')
        .update({ subject: draft.subject, body: draft.body })
        .eq('id', email.id);
      results.push({ id: email.id, ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown';
      console.error('sequence draft failed', email.id, message);
      results.push({ id: email.id, ok: false, error: message });
    }
  }

  return NextResponse.json({
    processed: results.length,
    succeeded: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  });
}
