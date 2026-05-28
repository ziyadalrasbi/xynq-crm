import { NextResponse } from 'next/server';
import { requireCronAuth } from '@/lib/cron-auth';
import { createClient } from '@/lib/supabase/server';
import { addDaysISO } from '@/lib/format';
import { draftFollowUpEmail } from '@/lib/claude/features/draft-email';

export const runtime = 'nodejs';
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

/**
 * Daily cron. For every active deal where the last interaction is 5+ days old
 * (or no interaction at all and the deal is 5+ days old), draft a follow-up
 * email and save it to ai_drafts as pending. Leo sees it in /inbox and either
 * approves (creates an email_sent interaction) or dismisses.
 *
 * Skips:
 * - deals on the partnership track stage 'partnership' if Leo already has a
 *   sequence assigned (sequences handle their own drafts)
 * - companies that already have a pending draft (don't pile up)
 * - companies tagged 'internal' (we don't auto-draft to ourselves)
 */
export async function GET(request: Request) {
  const unauth = requireCronAuth(request);
  if (unauth) return unauth;

  const supabase = createClient();
  const staleThreshold = addDaysISO(-5);

  // Active deals + their companies (filtering internal tag)
  const { data: deals, error } = await supabase
    .from('deals')
    .select(`
      id, deal_name, stage, created_at,
      company:companies (id, name, tags)
    `)
    .eq('status', 'active');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Filter out internal-tagged companies. Cast to any[] because Supabase's
  // joined-table inference treats company as an array even when it's a single
  // FK relation, which doesn't match the runtime shape.
  const candidateDeals = ((deals ?? []) as any[]).filter((d) => {
    const tags: string[] = d.company?.tags ?? [];
    return !tags.includes('internal');
  });

  if (candidateDeals.length === 0) {
    return NextResponse.json({ candidates: 0, generated: 0 });
  }

  const dealIds = candidateDeals.map((d: any) => d.id);
  const companyIds = candidateDeals.map((d: any) => d.company?.id).filter(Boolean);

  // Get most-recent interaction per deal
  const { data: interactions } = await supabase
    .from('interactions')
    .select('deal_id, date')
    .in('deal_id', dealIds)
    .order('date', { ascending: false });
  const latestByDeal = new Map<string, string>();
  for (const i of interactions ?? []) {
    if (i.deal_id && !latestByDeal.has(i.deal_id)) {
      latestByDeal.set(i.deal_id, i.date);
    }
  }

  // Get existing pending drafts per deal (skip if any exist)
  const { data: existingDrafts } = await supabase
    .from('ai_drafts')
    .select('deal_id')
    .in('deal_id', dealIds)
    .eq('status', 'pending');
  const dealsWithDraft = new Set((existingDrafts ?? []).map((d: any) => d.deal_id));

  // Get active sequences (skip if a sequence is active for this deal)
  const { data: activeSequences } = await supabase
    .from('email_sequences')
    .select('deal_id')
    .in('deal_id', dealIds)
    .eq('status', 'active');
  const dealsWithSequence = new Set((activeSequences ?? []).map((s: any) => s.deal_id));

  // Determine which deals need a draft
  const dealsToProcess = candidateDeals.filter((d: any) => {
    if (dealsWithDraft.has(d.id)) return false;
    if (dealsWithSequence.has(d.id)) return false;
    const lastInteraction = latestByDeal.get(d.id);
    const referenceDate = lastInteraction ?? d.created_at;
    return referenceDate <= `${staleThreshold}T23:59:59Z`;
  });

  const results: { id: string; ok: boolean; error?: string }[] = [];
  for (const deal of dealsToProcess) {
    if (!deal.company?.id) continue;
    try {
      const draft = await draftFollowUpEmail({
        companyId: deal.company.id,
        intent: 'Re-engage after a quiet period. Reference the most recent interaction or context naturally.',
      });
      await supabase.from('ai_drafts').insert({
        deal_id: deal.id,
        company_id: deal.company.id,
        subject: draft.subject,
        body: draft.body,
        status: 'pending',
        notes: `Auto-generated because last interaction was on ${latestByDeal.get(deal.id) ?? 'never'}.`,
      });
      results.push({ id: deal.id, ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown';
      console.error('auto-draft failed', deal.id, message);
      results.push({ id: deal.id, ok: false, error: message });
    }
  }

  return NextResponse.json({
    candidates: candidateDeals.length,
    eligible: dealsToProcess.length,
    succeeded: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  });
}
