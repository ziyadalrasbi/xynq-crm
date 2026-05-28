import { NextResponse } from 'next/server';
import { requireCronAuth } from '@/lib/cron-auth';
import { createClient } from '@/lib/supabase/server';
import { addDaysISO, formatDate, formatGBP, todayISO } from '@/lib/format';
import { STAGE_LABELS, type Stage } from '@/lib/design';
import { digestSuggestion } from '@/lib/claude/features/digest-suggestion';
import { DIGEST_TO, FROM_EMAIL, getResend } from '@/lib/resend';

export const runtime = 'nodejs';
export const maxDuration = 120;
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const unauth = requireCronAuth(request);
  if (unauth) return unauth;

  const resend = getResend();
  if (!resend) {
    return NextResponse.json({ skipped: 'RESEND_API_KEY not configured' });
  }
  if (!DIGEST_TO) {
    return NextResponse.json({ skipped: 'DIGEST_TO_EMAIL not configured' });
  }

  const supabase = createClient();
  const today = todayISO();
  const weekAgo = addDaysISO(-7);
  const weekAhead = addDaysISO(7);

  const [progressedDeals, allActiveDeals, dueThisWeek, staleReferrals, recentInteractions] = await Promise.all([
    supabase
      .from('deals')
      .select('id, deal_name, stage, status, track, updated_at, deal_value, company:companies (id, name)')
      .gte('updated_at', weekAgo)
      .order('updated_at', { ascending: false })
      .limit(30),
    supabase
      .from('deals')
      .select('stage, deal_value')
      .eq('status', 'active'),
    supabase
      .from('deals')
      .select('id, deal_name, next_action, next_action_due, company:companies (id, name)')
      .eq('status', 'active')
      .gte('next_action_due', today)
      .lte('next_action_due', weekAhead)
      .order('next_action_due', { ascending: true }),
    supabase
      .from('referrals')
      .select(`
        id, to_company, status, date,
        from_contact:contacts (name, company:companies (name))
      `)
      .eq('status', 'offered')
      .lte('date', addDaysISO(-14)),
    supabase
      .from('interactions')
      .select('deal_id, date')
      .gte('date', weekAgo),
  ]);

  // Compute stalled deals: active, not interacted with in 7+ days
  const interactedDealIds = new Set(
    (recentInteractions.data ?? []).map((i: any) => i.deal_id).filter(Boolean),
  );
  const { data: allActiveDealsList } = await supabase
    .from('deals')
    .select('id, deal_name, stage, updated_at, company:companies (id, name)')
    .eq('status', 'active');
  const stalledDeals = (allActiveDealsList ?? []).filter((d: any) => !interactedDealIds.has(d.id)).slice(0, 10);

  // Pipeline value by stage
  const valueByStage = new Map<string, { count: number; total: number }>();
  for (const d of allActiveDeals.data ?? []) {
    const cur = valueByStage.get(d.stage) ?? { count: 0, total: 0 };
    cur.count += 1;
    cur.total += d.deal_value ?? 0;
    valueByStage.set(d.stage, cur);
  }

  // Build a compact text summary for Claude
  const summaryLines: string[] = [];
  summaryLines.push(`## Pipeline value by stage`);
  for (const stage of Object.keys(STAGE_LABELS)) {
    const v = valueByStage.get(stage);
    if (!v) continue;
    summaryLines.push(`- ${STAGE_LABELS[stage as Stage]}: ${v.count} deals · ${formatGBP(v.total)}`);
  }
  summaryLines.push('');
  summaryLines.push(`## Deals progressed in the last 7 days (${progressedDeals.data?.length ?? 0})`);
  for (const d of (progressedDeals.data ?? []).slice(0, 10)) {
    summaryLines.push(`- ${(d as any).company?.name ?? '—'}: ${d.deal_name} → ${d.stage}${d.track ? ` (${d.track})` : ''}`);
  }
  summaryLines.push('');
  summaryLines.push(`## Stalled deals (no interaction in 7+ days) (${stalledDeals.length})`);
  for (const d of stalledDeals) {
    summaryLines.push(`- ${(d as any).company?.name ?? '—'}: ${d.deal_name} (${d.stage})`);
  }
  summaryLines.push('');
  summaryLines.push(`## Follow-ups due this week (${dueThisWeek.data?.length ?? 0})`);
  for (const d of dueThisWeek.data ?? []) {
    summaryLines.push(`- ${(d as any).company?.name ?? '—'}: ${d.next_action} (due ${formatDate(d.next_action_due!)})`);
  }
  summaryLines.push('');
  summaryLines.push(`## Referrals offered 14+ days ago, no action (${staleReferrals.data?.length ?? 0})`);
  for (const r of staleReferrals.data ?? []) {
    const from = (r as any).from_contact?.name ?? 'unknown';
    summaryLines.push(`- ${from} → ${r.to_company}`);
  }

  const digestSummary = summaryLines.join('\n');

  // Ask Claude for the one suggestion
  let suggestion = '';
  try {
    suggestion = await digestSuggestion({ digestSummary });
  } catch (err) {
    suggestion = `(AI suggestion unavailable: ${err instanceof Error ? err.message : 'unknown error'})`;
  }

  // Render HTML email
  const html = renderDigestHtml({
    digestSummary,
    suggestion,
    weekStart: weekAgo,
    weekEnd: today,
  });

  const subject = `XYNQ weekly digest — ${formatDate(today)}`;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: DIGEST_TO,
      subject,
      html,
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'send failed', detail: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    );
  }

  return NextResponse.json({
    sent_to: DIGEST_TO,
    suggestion,
    deals_progressed: progressedDeals.data?.length ?? 0,
    deals_stalled: stalledDeals.length,
    due_this_week: dueThisWeek.data?.length ?? 0,
    stale_referrals: staleReferrals.data?.length ?? 0,
  });
}

function renderDigestHtml(opts: {
  digestSummary: string;
  suggestion: string;
  weekStart: string;
  weekEnd: string;
}): string {
  // Convert the markdown-ish summary to simple HTML
  const summaryHtml = opts.digestSummary
    .split('\n')
    .map((line) => {
      if (line.startsWith('## ')) {
        return `<h3 style="margin:24px 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:0.04em;color:#6B6B6B;">${escape(line.slice(3))}</h3>`;
      }
      if (line.startsWith('- ')) {
        return `<div style="margin:2px 0;color:#1A1A1A;">• ${escape(line.slice(2))}</div>`;
      }
      if (!line.trim()) return '';
      return `<div>${escape(line)}</div>`;
    })
    .join('\n');

  return `<!doctype html>
<html>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#FAFAF8;color:#1A1A1A;margin:0;padding:24px;">
  <div style="max-width:640px;margin:0 auto;background:#FFFFFF;border:1px solid #E5E5E0;border-radius:8px;padding:24px;">
    <div style="font-size:12px;color:#6B6B6B;letter-spacing:0.08em;text-transform:uppercase;">XYNQ CRM weekly digest</div>
    <div style="font-size:13px;color:#6B6B6B;margin-top:4px;">${opts.weekStart} → ${opts.weekEnd}</div>

    <div style="margin:24px 0;padding:16px;background:#2D5BFF;color:#FFFFFF;border-radius:6px;">
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;opacity:0.8;">This week&rsquo;s highest-leverage action</div>
      <div style="margin-top:6px;font-size:15px;line-height:1.5;">${escape(opts.suggestion).replace(/\n/g, '<br/>')}</div>
    </div>

    ${summaryHtml}

    <div style="margin-top:32px;padding-top:16px;border-top:1px solid #E5E5E0;font-size:11px;color:#6B6B6B;">
      Auto-generated. Open the CRM to act on anything above.
    </div>
  </div>
</body>
</html>`;
}

function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
