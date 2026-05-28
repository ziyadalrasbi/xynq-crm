import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Card, Section } from '@/components/ui/card';
import { getAdvisorDashboardData, getShareToken } from '@/lib/queries';
import { formatDate, formatGBP } from '@/lib/format';
import { STAGE_LABELS, STAGES, TRACK_LABELS, TRACKS, type Stage, type Track } from '@/lib/design';

export const dynamic = 'force-dynamic';

export default async function SharePage({ params }: { params: { token: string } }) {
  const token = await getShareToken(params.token);
  if (!token) notFound();

  const data = await getAdvisorDashboardData();

  // Pipeline by stage
  const byStage = STAGES.map((stage) => {
    const rows = data.allActive.filter((d: any) => d.stage === stage);
    const total = rows.reduce((sum: number, r: any) => sum + (r.deal_value ?? 0), 0);
    return { stage, count: rows.length, total };
  }).filter((s) => s.count > 0);

  // Pipeline by track
  const byTrack = TRACKS.map((track) => {
    const rows = data.allActive.filter((d: any) => d.track === track);
    const total = rows.reduce((sum: number, r: any) => sum + (r.deal_value ?? 0), 0);
    return { track, count: rows.length, total };
  }).filter((t) => t.count > 0);

  // By industry
  const industryCounts = new Map<string, number>();
  for (const c of data.byIndustry) {
    industryCounts.set(c.industry, (industryCounts.get(c.industry) ?? 0) + 1);
  }

  const totalPipelineValue = data.allActive.reduce(
    (s: number, d: any) => s + (d.deal_value ?? 0),
    0,
  );

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
      <header className="border-b border-border pb-4">
        <div className="flex items-baseline justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">XYNQ pipeline</h1>
          <Badge variant="muted">read-only · for {token.label}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted">
          Snapshot as of {formatDate(data.asOf)}. {data.allActive.length} active deals,{' '}
          {data.wonCount} won. Total active pipeline: {formatGBP(totalPipelineValue)}.
        </p>
      </header>

      <Section title="Pipeline by stage">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {byStage.map(({ stage, count, total }) => (
            <Card key={stage} className="p-3">
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted">
                {STAGE_LABELS[stage as Stage]}
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-semibold">{count}</span>
                <span className="text-xs text-muted">{total > 0 ? formatGBP(total) : '—'}</span>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      {byTrack.length > 0 && (
        <Section title="By track">
          <div className="grid grid-cols-3 gap-2">
            {byTrack.map(({ track, count, total }) => (
              <Card key={track} className="p-3">
                <div className="text-[11px] font-medium uppercase tracking-wide text-muted">
                  {TRACK_LABELS[track as Track]}
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-xl font-semibold">{count}</span>
                  <span className="text-xs text-muted">{total > 0 ? formatGBP(total) : '—'}</span>
                </div>
              </Card>
            ))}
          </div>
        </Section>
      )}

      <Section title="Top active deals by value">
        <Card>
          {data.topActive.length === 0 ? (
            <p className="px-3 py-2.5 text-sm text-muted">No active deals.</p>
          ) : (
            data.topActive.map((d: any) => (
              <div key={d.id} className="border-b border-border px-3 py-2.5 last:border-b-0">
                <div className="flex items-baseline justify-between gap-3">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-medium">{d.company?.name ?? 'unknown'}</span>
                      <Badge variant="muted">{STAGE_LABELS[d.stage as Stage] ?? d.stage}</Badge>
                      {d.track && <Badge variant="accent">{d.track}</Badge>}
                      {d.company?.engine_pipe && (
                        <Badge variant="muted">{d.company.engine_pipe}</Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted">{d.deal_name}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    {d.deal_value != null && (
                      <div className="text-sm font-medium">{formatGBP(d.deal_value)}</div>
                    )}
                    {d.company?.icp_score != null && (
                      <div className="text-xs text-muted">ICP {d.company.icp_score}/10</div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </Card>
      </Section>

      {data.recentWins.length > 0 && (
        <Section title="Recent wins">
          <Card>
            {data.recentWins.map((d: any) => (
              <div
                key={d.deal_name + d.updated_at}
                className="flex items-baseline justify-between border-b border-border px-3 py-2.5 last:border-b-0"
              >
                <div>
                  <div className="font-medium">{d.company?.name ?? '—'}</div>
                  <p className="text-xs text-muted">{d.deal_name} · {formatDate(d.updated_at)}</p>
                </div>
                {d.deal_value != null && (
                  <span className="text-sm font-medium text-won">{formatGBP(d.deal_value)}</span>
                )}
              </div>
            ))}
          </Card>
        </Section>
      )}

      <Section title="Companies by industry">
        <div className="flex flex-wrap gap-2">
          {Array.from(industryCounts.entries()).map(([industry, count]) => (
            <Card key={industry} className="px-3 py-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted">
                {industry.replace('_', ' / ')}
              </span>
              <span className="ml-2 text-sm font-semibold">{count}</span>
            </Card>
          ))}
        </div>
      </Section>

      <footer className="pt-6 text-center text-xs text-muted">
        XYNQ CRM · read-only advisor view · this link can be revoked at any time
      </footer>
    </main>
  );
}
