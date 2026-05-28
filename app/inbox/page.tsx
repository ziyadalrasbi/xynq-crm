import Link from 'next/link';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Card, Section } from '@/components/ui/card';
import { getInboxNotifications, getDashboardData } from '@/lib/queries';
import { formatDate, formatGBP, formatRelative } from '@/lib/format';
import { STAGE_LABELS, STAGES, type Stage } from '@/lib/design';
import { DraftCard } from '@/components/inbox/draft-card';

export const dynamic = 'force-dynamic';

export default async function InboxPage() {
  const [inbox, dashboard] = await Promise.all([
    getInboxNotifications(),
    getDashboardData(),
  ]);

  const totalNotifications =
    inbox.aiDrafts.length +
    inbox.draftSequenceEmails.length +
    inbox.overdueDeals.length +
    inbox.staleReferrals.length +
    inbox.pendingMeetingPrep.length +
    inbox.unscored.length;

  // Pipeline summary (compact, lives at the bottom)
  const byStage = STAGES.map((stage) => {
    const rows = dashboard.pipeline.filter(
      (p: any) => p.stage === stage && p.status === 'active',
    );
    const total = rows.reduce((sum: number, r: any) => sum + (r.deal_value ?? 0), 0);
    return { stage, count: rows.length, total };
  });

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-6">
      <header>
        <div className="flex items-baseline justify-between">
          <h1 className="text-lg font-semibold tracking-tight">Inbox</h1>
          <Badge variant="muted">{totalNotifications} items</Badge>
        </div>
        <p className="mt-1 text-sm text-muted">
          Action queue. Approve, act, or dismiss each card.
        </p>
      </header>

      {totalNotifications === 0 && (
        <Card className="p-8 text-center">
          <p className="text-sm text-muted">Inbox zero. Nothing needs you right now.</p>
        </Card>
      )}

      {/* Auto-drafts ready */}
      {inbox.aiDrafts.length > 0 && (
        <Section title={`Drafts ready to approve (${inbox.aiDrafts.length})`}>
          <div className="space-y-2">
            {inbox.aiDrafts.map((d: any) => (
              <DraftCard key={d.id} draft={d} />
            ))}
          </div>
        </Section>
      )}

      {/* Sequence drafts */}
      {inbox.draftSequenceEmails.length > 0 && (
        <Section title={`Sequence drafts ready (${inbox.draftSequenceEmails.length})`}>
          <Card>
            {inbox.draftSequenceEmails.map((e: any) => {
              const seq = e.sequence;
              const deal = seq?.deal;
              const company = deal?.company;
              if (!company || !deal) return null;
              return (
                <Link
                  key={e.id}
                  href={`/companies/${company.id}`}
                  className="block border-b border-border px-3 py-2.5 last:border-b-0 hover:bg-bg"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-medium">{company.name}</span>
                        <Badge variant="due">{seq.template_name} · step {e.step_number + 1}</Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-muted">{e.subject ?? '—'}</p>
                    </div>
                    {e.scheduled_date && (
                      <span className="text-xs text-muted">{formatDate(e.scheduled_date)}</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </Card>
        </Section>
      )}

      {/* Meeting prep ready */}
      {inbox.pendingMeetingPrep.length > 0 && (
        <Section title={`Meeting prep ready (${inbox.pendingMeetingPrep.length})`}>
          <Card>
            {inbox.pendingMeetingPrep.map((d: any) => (
              <Link
                key={d.id}
                href={`/companies/${d.company.id}`}
                className="block border-b border-border px-3 py-2.5 last:border-b-0 hover:bg-bg"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <div>
                    <span className="text-sm font-medium">{d.company.name}</span>
                    <p className="mt-0.5 text-xs text-muted">{d.next_action}</p>
                  </div>
                  <Badge variant="accent">📋 brief ready</Badge>
                </div>
              </Link>
            ))}
          </Card>
        </Section>
      )}

      {/* Overdue actions */}
      {inbox.overdueDeals.length > 0 && (
        <Section title={`Overdue (${inbox.overdueDeals.length})`}>
          <Card>
            {inbox.overdueDeals.map((d: any) => {
              const days = d.next_action_due
                ? differenceInCalendarDays(new Date(), parseISO(d.next_action_due))
                : 0;
              return (
                <Link
                  key={d.id}
                  href={`/companies/${d.company.id}`}
                  className="block border-b border-border px-3 py-2.5 last:border-b-0 hover:bg-bg"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-medium">{d.company.name}</span>
                        <Badge variant="muted">{STAGE_LABELS[d.stage as Stage] ?? d.stage}</Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-muted">{d.next_action ?? '—'}</p>
                    </div>
                    <Badge variant="overdue">{days}d overdue</Badge>
                  </div>
                </Link>
              );
            })}
          </Card>
        </Section>
      )}

      {/* Stale referrals */}
      {inbox.staleReferrals.length > 0 && (
        <Section title={`Stale referrals (${inbox.staleReferrals.length})`}>
          <Card>
            {inbox.staleReferrals.map((r: any) => (
              <Link
                key={r.id}
                href="/referrals"
                className="block border-b border-border px-3 py-2.5 last:border-b-0 hover:bg-bg"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <div>
                    <span className="text-sm font-medium">
                      {r.from_contact?.name ?? '—'} → {r.to_company}
                    </span>
                    <p className="mt-0.5 text-xs text-muted">offered {formatRelative(r.date)}</p>
                  </div>
                  <Badge variant="due">{r.status}</Badge>
                </div>
              </Link>
            ))}
          </Card>
        </Section>
      )}

      {/* Unscored companies */}
      {inbox.unscored.length > 0 && (
        <Section title={`Unscored ICP (${inbox.unscored.length})`}>
          <Card>
            {inbox.unscored.map((c: any) => (
              <Link
                key={c.id}
                href={`/companies/${c.id}`}
                className="block border-b border-border px-3 py-2.5 last:border-b-0 hover:bg-bg"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <div>
                    <span className="text-sm font-medium">{c.name}</span>
                    <p className="mt-0.5 text-xs text-muted">added {formatRelative(c.created_at)}</p>
                  </div>
                  <Badge variant="accent">click → Score ICP</Badge>
                </div>
              </Link>
            ))}
          </Card>
        </Section>
      )}

      {/* Compact pipeline summary at the bottom */}
      <Section title="Pipeline at a glance">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-6">
          {byStage.map(({ stage, count, total }) => (
            <Card key={stage} className="px-3 py-2.5">
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted">
                {STAGE_LABELS[stage]}
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-lg font-semibold">{count}</span>
                <span className="text-xs text-muted">{total > 0 ? formatGBP(total) : '—'}</span>
              </div>
            </Card>
          ))}
        </div>
      </Section>
    </main>
  );
}
