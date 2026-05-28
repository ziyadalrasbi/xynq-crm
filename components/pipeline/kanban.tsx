'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition, type DragEvent } from 'react';
import clsx from 'clsx';
import { Badge, StatusBadge } from '@/components/ui/badge';
import {
  STAGES,
  STAGE_LABELS,
  TRACK_LABELS,
  PRICING_TIER_LABELS,
  ENGINE_PIPE_LABELS,
  type Stage,
  type Track,
  type PricingTier,
  type EnginePipe,
} from '@/lib/design';
import { formatDate, formatGBP } from '@/lib/format';
import { updateDealStage } from '@/app/pipeline/actions';

type Deal = {
  id: string;
  deal_name: string;
  stage: Stage;
  status: string;
  deal_value: number | null;
  next_action: string | null;
  next_action_due: string | null;
  track: Track | null;
  pricing_tier: PricingTier | null;
  company: {
    id: string;
    name: string;
    industry: string;
    sub_type: string | null;
    tags: string[] | null;
    icp_score: number | null;
    engine_pipe: EnginePipe | null;
    mmf_member: boolean | null;
  };
};

type Filters = {
  industry: string;
  status: string;
  tag: string;
  track: string;
  q: string;
};

export function Kanban({ deals: initial }: { deals: Deal[] }) {
  const [deals, setDeals] = useState(initial);
  const [filters, setFilters] = useState<Filters>({ industry: '', status: '', tag: '', track: '', q: '' });
  const [pending, startTransition] = useTransition();
  const [dragId, setDragId] = useState<string | null>(null);

  const tagOptions = useMemo(() => {
    const set = new Set<string>();
    initial.forEach((d) => (d.company.tags ?? []).forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [initial]);

  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    return deals.filter((d) => {
      if (filters.industry && d.company.industry !== filters.industry) return false;
      if (filters.status && d.status !== filters.status) return false;
      if (filters.tag && !(d.company.tags ?? []).includes(filters.tag)) return false;
      if (filters.track && d.track !== filters.track) return false;
      if (q && !d.company.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [deals, filters]);

  function onDragStart(e: DragEvent<HTMLDivElement>, dealId: string) {
    setDragId(dealId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dealId);
  }

  function onDrop(stage: Stage) {
    if (!dragId) return;
    const deal = deals.find((d) => d.id === dragId);
    setDragId(null);
    if (!deal || deal.stage === stage) return;

    setDeals((prev) => prev.map((d) => (d.id === dragId ? { ...d, stage } : d)));
    startTransition(async () => {
      try {
        await updateDealStage(dragId, stage);
      } catch {
        setDeals((prev) => prev.map((d) => (d.id === dragId ? { ...d, stage: deal.stage } : d)));
      }
    });
  }

  return (
    <div className="space-y-4">
      <Filters filters={filters} setFilters={setFilters} tagOptions={tagOptions} />
      <div className="-mx-6 overflow-x-auto px-6 pb-4">
        <div className="flex min-w-max gap-3">
          {STAGES.map((stage) => {
            const stageDeals = filtered.filter((d) => d.stage === stage);
            return (
              <div
                key={stage}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(stage)}
                className="flex w-72 shrink-0 flex-col rounded border border-border bg-white"
              >
                <div className="flex items-baseline justify-between border-b border-border px-3 py-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
                    {STAGE_LABELS[stage]}
                  </h3>
                  <span className="text-xs text-muted">{stageDeals.length}</span>
                </div>
                <div className={clsx('flex-1 space-y-2 p-2', pending && 'opacity-90')}>
                  {stageDeals.length === 0 ? (
                    <p className="px-1 py-3 text-center text-xs text-muted">—</p>
                  ) : (
                    stageDeals.map((d) => (
                      <DealCard key={d.id} deal={d} onDragStart={(e) => onDragStart(e, d.id)} />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DealCard({
  deal,
  onDragStart,
}: {
  deal: Deal;
  onDragStart: (e: DragEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="cursor-grab rounded border border-border bg-white p-2.5 hover:border-accent active:cursor-grabbing"
    >
      <div className="flex items-baseline justify-between gap-2">
        <Link
          href={`/companies/${deal.company.id}`}
          className="truncate text-sm font-medium hover:text-accent"
          onClick={(e) => e.stopPropagation()}
        >
          {deal.company.name}
        </Link>
        {deal.company.icp_score != null && (
          <span className="shrink-0 text-[11px] font-mono text-muted">{deal.company.icp_score}/10</span>
        )}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1">
        {deal.track && <Badge variant="accent">{TRACK_LABELS[deal.track]}</Badge>}
        {deal.pricing_tier && <Badge variant="muted">{PRICING_TIER_LABELS[deal.pricing_tier]}</Badge>}
        {deal.company.engine_pipe && (
          <Badge variant="muted">{ENGINE_PIPE_LABELS[deal.company.engine_pipe]}</Badge>
        )}
        {deal.company.mmf_member && <Badge variant="muted">MMF</Badge>}
        <Badge variant="muted">{deal.company.industry}</Badge>
        {deal.company.sub_type && <Badge variant="muted">{deal.company.sub_type}</Badge>}
        <StatusBadge status={deal.status} />
      </div>
      {deal.next_action && (
        <p className="mt-2 line-clamp-2 text-xs text-muted">{deal.next_action}</p>
      )}
      <div className="mt-2 flex items-center justify-between text-[11px] text-muted">
        <span>{deal.next_action_due ? formatDate(deal.next_action_due) : '—'}</span>
        <span>{deal.deal_value != null ? formatGBP(deal.deal_value) : ''}</span>
      </div>
    </div>
  );
}

function Filters({
  filters,
  setFilters,
  tagOptions,
}: {
  filters: Filters;
  setFilters: (f: Filters) => void;
  tagOptions: string[];
}) {
  const fieldClass =
    'rounded border border-border bg-white px-2 py-1 text-xs focus:border-accent focus:outline-none';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="search"
        placeholder="Search company…"
        value={filters.q}
        onChange={(e) => setFilters({ ...filters, q: e.target.value })}
        className={clsx(fieldClass, 'w-48')}
      />
      <select
        value={filters.industry}
        onChange={(e) => setFilters({ ...filters, industry: e.target.value })}
        className={fieldClass}
      >
        <option value="">All industries</option>
        <option value="music">Music</option>
        <option value="film_vfx">Film/VFX</option>
        <option value="gaming">Gaming</option>
        <option value="publishing">Publishing</option>
        <option value="advertising">Advertising</option>
        <option value="cross_sector">Cross-sector</option>
      </select>
      <select
        value={filters.status}
        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
        className={fieldClass}
      >
        <option value="">All statuses</option>
        <option value="active">Active</option>
        <option value="stalled">Stalled</option>
        <option value="paused">Paused</option>
        <option value="won">Won</option>
        <option value="lost">Lost</option>
      </select>
      <select
        value={filters.track}
        onChange={(e) => setFilters({ ...filters, track: e.target.value })}
        className={fieldClass}
      >
        <option value="">All tracks</option>
        <option value="partnership">Partnership</option>
        <option value="consulting">Consulting</option>
        <option value="audit">Audit</option>
      </select>
      <select
        value={filters.tag}
        onChange={(e) => setFilters({ ...filters, tag: e.target.value })}
        className={fieldClass}
      >
        <option value="">All tags</option>
        {tagOptions.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      {(filters.industry || filters.status || filters.tag || filters.track || filters.q) && (
        <button
          type="button"
          onClick={() => setFilters({ industry: '', status: '', tag: '', track: '', q: '' })}
          className="text-xs text-muted hover:text-ink"
        >
          Clear
        </button>
      )}
    </div>
  );
}
