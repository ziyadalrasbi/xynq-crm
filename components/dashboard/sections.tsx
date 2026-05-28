import Link from 'next/link';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Card, Section } from '@/components/ui/card';
import { formatDate, formatGBP, formatRelative } from '@/lib/format';
import { STAGE_LABELS, STAGES, type Stage } from '@/lib/design';
import type { DashboardDeal, Interaction } from '@/lib/queries';

function DealRow({ deal, accent }: { deal: DashboardDeal; accent: 'overdue' | 'due' | 'muted' }) {
  const daysOverdue = deal.next_action_due
    ? differenceInCalendarDays(new Date(), parseISO(deal.next_action_due))
    : 0;
  return (
    <Link
      href={`/companies/${deal.company.id}`}
      className="flex items-start gap-3 border-b border-border px-3 py-2.5 last:border-b-0 hover:bg-bg"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="truncate text-sm font-medium">{deal.company.name}</span>
          <Badge variant="muted">{STAGE_LABELS[deal.stage as Stage] ?? deal.stage}</Badge>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted">{deal.next_action ?? '—'}</p>
      </div>
      <div className="shrink-0 text-right">
        {accent === 'overdue' && daysOverdue > 0 && (
          <Badge variant="overdue">{daysOverdue}d overdue</Badge>
        )}
        {accent === 'due' && <Badge variant="due">today</Badge>}
        {accent === 'muted' && deal.next_action_due && (
          <span className="text-xs text-muted">{formatDate(deal.next_action_due)}</span>
        )}
      </div>
    </Link>
  );
}

export function ActionLists({
  overdue,
  dueToday,
  thisWeek,
}: {
  overdue: DashboardDeal[];
  dueToday: DashboardDeal[];
  thisWeek: DashboardDeal[];
}) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Section title={`Overdue (${overdue.length})`}>
        <Card>
          {overdue.length === 0 ? (
            <p className="px-3 py-2.5 text-sm text-muted">Nothing overdue.</p>
          ) : (
            overdue.map((d) => <DealRow key={d.id} deal={d} accent="overdue" />)
          )}
        </Card>
      </Section>
      <Section title={`Due today (${dueToday.length})`}>
        <Card>
          {dueToday.length === 0 ? (
            <p className="px-3 py-2.5 text-sm text-muted">Clear today.</p>
          ) : (
            dueToday.map((d) => <DealRow key={d.id} deal={d} accent="due" />)
          )}
        </Card>
      </Section>
      <Section title={`This week (${thisWeek.length})`}>
        <Card>
          {thisWeek.length === 0 ? (
            <p className="px-3 py-2.5 text-sm text-muted">Nothing scheduled.</p>
          ) : (
            thisWeek.map((d) => <DealRow key={d.id} deal={d} accent="muted" />)
          )}
        </Card>
      </Section>
    </div>
  );
}

export function PipelineSummary({
  pipeline,
}: {
  pipeline: { stage: string; status: string; deal_value: number | null }[];
}) {
  const byStage = STAGES.map((stage) => {
    const rows = pipeline.filter((p) => p.stage === stage && p.status === 'active');
    const total = rows.reduce((sum, r) => sum + (r.deal_value ?? 0), 0);
    return { stage, count: rows.length, total };
  });

  return (
    <Section title="Pipeline">
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
  );
}

const TYPE_ICONS: Record<string, string> = {
  call: '☎',
  email_sent: '↗',
  email_received: '↘',
  meeting: '◉',
  whatsapp: '✆',
  linkedin: 'in',
  note: '✎',
  intro_received: '←',
  intro_made: '→',
};

export function RecentInteractions({ interactions }: { interactions: Interaction[] }) {
  return (
    <Section title="Recent interactions">
      <Card>
        {interactions.length === 0 ? (
          <p className="px-3 py-2.5 text-sm text-muted">No interactions logged yet.</p>
        ) : (
          interactions.map((i) => (
            <Link
              key={i.id}
              href={`/companies/${i.company.id}`}
              className="flex items-start gap-3 border-b border-border px-3 py-2.5 last:border-b-0 hover:bg-bg"
            >
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded bg-bg text-[11px] text-muted">
                {TYPE_ICONS[i.type] ?? '·'}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium">{i.company.name}</span>
                  <span className="text-xs text-muted">{i.type.replace('_', ' ')}</span>
                </div>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted">{i.summary}</p>
              </div>
              <span className="shrink-0 text-xs text-muted">{formatRelative(i.date)}</span>
            </Link>
          ))
        )}
      </Card>
    </Section>
  );
}
