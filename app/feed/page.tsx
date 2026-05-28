import Link from 'next/link';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { getIntelligenceFeed } from '@/lib/queries';
import { formatDate, formatRelative } from '@/lib/format';
import { STAGE_LABELS, type Stage } from '@/lib/design';

export const dynamic = 'force-dynamic';

export default async function FeedPage() {
  const feed = await getIntelligenceFeed();

  const totalItems =
    feed.newCompanies.length +
    feed.recentlyUpdatedDeals.length +
    feed.overdueActions.length +
    feed.staleActiveDeals.length +
    feed.staleReferrals.length +
    feed.newInteractions.length;

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-6 py-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Intelligence feed</h1>
        <p className="mt-1 text-sm text-muted">
          Morning briefing — what changed, what&rsquo;s slipping, what to chase.
        </p>
      </div>

      {totalItems === 0 && (
        <Card className="p-6 text-center text-sm text-muted">Nothing to surface today. Quiet pipeline.</Card>
      )}

      <FeedSection title="Overdue actions" count={feed.overdueActions.length} accent="overdue">
        {feed.overdueActions.map((d: any) => {
          const days = d.next_action_due ? differenceInCalendarDays(new Date(), parseISO(d.next_action_due)) : 0;
          return (
            <FeedItem key={d.id} href={`/companies/${d.company.id}`}>
              <div className="flex items-baseline gap-2">
                <span className="font-medium">{d.company.name}</span>
                <Badge variant="muted">{STAGE_LABELS[d.stage as Stage] ?? d.stage}</Badge>
                <Badge variant="overdue">{days}d overdue</Badge>
              </div>
              <p className="mt-0.5 text-xs text-muted">{d.next_action ?? '—'}</p>
            </FeedItem>
          );
        })}
      </FeedSection>

      <FeedSection title="Stale active deals" count={feed.staleActiveDeals.length} accent="due">
        <p className="px-3 py-1 text-xs text-muted">Active deals with no interaction in 7+ days.</p>
        {feed.staleActiveDeals.map((d: any) => (
          <FeedItem key={d.id} href={`/companies/${d.company.id}`}>
            <div className="flex items-baseline gap-2">
              <span className="font-medium">{d.company.name}</span>
              <Badge variant="muted">{STAGE_LABELS[d.stage as Stage] ?? d.stage}</Badge>
              <Badge variant="muted">{d.deal_name}</Badge>
            </div>
            <p className="mt-0.5 text-xs text-muted">
              {d.last_interaction
                ? `Last touch: ${formatRelative(d.last_interaction)}`
                : 'No interactions logged yet'}
            </p>
          </FeedItem>
        ))}
      </FeedSection>

      <FeedSection title="Stale referrals" count={feed.staleReferrals.length} accent="due">
        <p className="px-3 py-1 text-xs text-muted">Intros offered 14+ days ago, still in &lsquo;offered&rsquo;.</p>
        {feed.staleReferrals.map((r: any) => (
          <FeedItem
            key={r.id}
            href={r.from_contact?.company?.id ? `/companies/${r.from_contact.company.id}` : '/referrals'}
          >
            <div className="flex items-baseline gap-2">
              <span className="font-medium">
                {r.from_contact?.name ?? 'unknown'} → {r.to_company}
                {r.to_contact_name && ` (${r.to_contact_name})`}
              </span>
              <Badge variant="due">offered {formatRelative(r.date)}</Badge>
            </div>
            {r.context && <p className="mt-0.5 text-xs text-muted">{r.context}</p>}
          </FeedItem>
        ))}
      </FeedSection>

      <FeedSection title="Recently updated deals" count={feed.recentlyUpdatedDeals.length} accent="accent">
        <p className="px-3 py-1 text-xs text-muted">Deals touched in the last 7 days.</p>
        {feed.recentlyUpdatedDeals.map((d: any) => (
          <FeedItem key={d.id} href={`/companies/${d.company.id}`}>
            <div className="flex items-baseline gap-2">
              <span className="font-medium">{d.company.name}</span>
              <Badge variant="muted">{STAGE_LABELS[d.stage as Stage] ?? d.stage}</Badge>
              {d.track && <Badge variant="accent">{d.track}</Badge>}
            </div>
            <p className="mt-0.5 text-xs text-muted">
              {d.deal_name} · updated {formatRelative(d.updated_at)}
            </p>
          </FeedItem>
        ))}
      </FeedSection>

      <FeedSection title="New companies" count={feed.newCompanies.length} accent="accent">
        <p className="px-3 py-1 text-xs text-muted">Added in the last 7 days.</p>
        {feed.newCompanies.map((c: any) => (
          <FeedItem key={c.id} href={`/companies/${c.id}`}>
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-medium">{c.name}</span>
              <Badge variant="muted">{c.industry}</Badge>
              {c.engine_pipe && <Badge variant="muted">{c.engine_pipe}</Badge>}
              {c.icp_score != null && <Badge variant="accent">ICP {c.icp_score}/10</Badge>}
            </div>
            <p className="mt-0.5 text-xs text-muted">added {formatRelative(c.created_at)}</p>
          </FeedItem>
        ))}
      </FeedSection>

      <FeedSection title="Recent interactions" count={feed.newInteractions.length} accent="muted">
        <p className="px-3 py-1 text-xs text-muted">Last 7 days, newest first.</p>
        {feed.newInteractions.map((i: any) => (
          <FeedItem key={i.id} href={i.company ? `/companies/${i.company.id}` : '/'}>
            <div className="flex items-baseline gap-2 text-xs text-muted">
              <span className="font-medium text-ink">{i.company?.name ?? '—'}</span>
              <span>· {i.type.replace('_', ' ')}</span>
              {i.contact && <span>· {i.contact.name}</span>}
              <span>· {formatDate(i.date)}</span>
            </div>
            <p className="mt-0.5 line-clamp-2 text-xs text-muted">{i.summary}</p>
          </FeedItem>
        ))}
      </FeedSection>
    </main>
  );
}

function FeedSection({
  title,
  count,
  accent,
  children,
}: {
  title: string;
  count: number;
  accent: 'overdue' | 'due' | 'accent' | 'muted';
  children: React.ReactNode;
}) {
  if (count === 0) return null;

  const dotClass: Record<typeof accent, string> = {
    overdue: 'bg-overdue',
    due: 'bg-due',
    accent: 'bg-accent',
    muted: 'bg-muted',
  } as const;

  return (
    <section className="space-y-2">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted">
        <span className={`inline-block h-2 w-2 rounded-full ${dotClass[accent]}`} aria-hidden />
        {title}
        <span className="text-xs text-muted">({count})</span>
      </h2>
      <Card>{children}</Card>
    </section>
  );
}

function FeedItem({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="block border-b border-border px-3 py-2.5 last:border-b-0 hover:bg-bg"
    >
      {children}
    </Link>
  );
}
