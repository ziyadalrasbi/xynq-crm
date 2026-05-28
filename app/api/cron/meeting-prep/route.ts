import { NextResponse } from 'next/server';
import { requireCronAuth } from '@/lib/cron-auth';
import { createClient } from '@/lib/supabase/server';
import { addDaysISO, todayISO } from '@/lib/format';
import { generateMeetingPrep } from '@/lib/claude/features/meeting-prep';

export const runtime = 'nodejs';
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

/**
 * Daily cron. Finds active deals where the next action mentions "call" or
 * "meeting" and is due in the next 1-2 days, then generates a prep brief
 * via Claude and stores it on the deal.
 *
 * Idempotent: skips deals that already have a fresh brief (generated within
 * the last 12 hours).
 */
export async function GET(request: Request) {
  const unauth = requireCronAuth(request);
  if (unauth) return unauth;

  const supabase = createClient();
  const tomorrow = addDaysISO(2);
  const today = todayISO();

  const { data: deals, error } = await supabase
    .from('deals')
    .select('id, deal_name, next_action, next_action_due, meeting_prep, company_id')
    .eq('status', 'active')
    .gte('next_action_due', today)
    .lte('next_action_due', tomorrow);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
  const candidates = (deals ?? []).filter((d: any) => {
    if (!d.next_action) return false;
    const lower = d.next_action.toLowerCase();
    if (!lower.includes('call') && !lower.includes('meeting')) return false;
    // Skip if a fresh brief already exists
    const existing = d.meeting_prep?.generated_at;
    if (existing && existing > twelveHoursAgo) return false;
    return true;
  });

  const results: { id: string; ok: boolean; error?: string }[] = [];
  for (const deal of candidates) {
    try {
      const brief = await generateMeetingPrep({
        companyId: deal.company_id,
        dealName: deal.deal_name,
        nextAction: deal.next_action,
        nextActionDue: deal.next_action_due,
      });
      await supabase
        .from('deals')
        .update({
          meeting_prep: { generated_at: new Date().toISOString(), brief },
        })
        .eq('id', deal.id);
      results.push({ id: deal.id, ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown';
      console.error('meeting prep failed', deal.id, message);
      results.push({ id: deal.id, ok: false, error: message });
    }
  }

  return NextResponse.json({
    candidates: candidates.length,
    succeeded: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  });
}
