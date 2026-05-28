import Link from 'next/link';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Card, Section } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label, Select, Textarea } from '@/components/ui/field';
import { formatDate, formatGBP, formatRelative } from '@/lib/format';
import {
  ENGINE_PIPES,
  ENGINE_PIPE_LABELS,
  INDUSTRY_LABELS,
  MUSIC_SUB_TYPES,
  PRICING_TIERS,
  PRICING_TIER_ANCHORS,
  PRICING_TIER_LABELS,
  STAGES,
  STAGE_LABELS,
  STATUSES,
  TRACKS,
  TRACK_LABELS,
  type EnginePipe,
  type PricingTier,
  type Track,
} from '@/lib/design';
import {
  addContact,
  addDeal,
  addInteraction,
  generateMeetingPrepForDeal,
  updateCompany,
  updateDeal,
} from '@/app/companies/[id]/actions';
import { SummarizeButton } from '@/components/ai/summarize-button';

const INTERACTION_TYPES = [
  'call',
  'email_sent',
  'email_received',
  'meeting',
  'whatsapp',
  'linkedin',
  'note',
  'intro_received',
  'intro_made',
] as const;

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

// ============================================================================
// Header
// ============================================================================

export function CompanyHeader({ company }: { company: any }) {
  const updateAction = updateCompany.bind(null, company.id);
  return (
    <Card className="p-5">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{company.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
            <span>{INDUSTRY_LABELS[company.industry as keyof typeof INDUSTRY_LABELS] ?? company.industry}</span>
            {company.sub_type && <span>· {company.sub_type}</span>}
            {company.engine_pipe && (
              <Badge variant="muted">{ENGINE_PIPE_LABELS[company.engine_pipe as EnginePipe]}</Badge>
            )}
            {company.mmf_member && <Badge variant="muted">MMF member</Badge>}
            {company.icp_score != null && (
              <Badge variant="accent">ICP {company.icp_score}/10</Badge>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {(company.tags ?? []).map((t: string) => (
              <Badge key={t} variant="muted">{t}</Badge>
            ))}
          </div>
          {company.website && (
            <a href={company.website} target="_blank" rel="noopener noreferrer"
               className="mt-2 inline-block text-xs text-accent hover:underline">
              {company.website.replace(/^https?:\/\//, '')} ↗
            </a>
          )}
        </div>
      </div>

      {company.notes && (
        <p className="mt-3 whitespace-pre-wrap text-sm text-ink">{company.notes}</p>
      )}

      <details className="mt-3 text-xs">
        <summary className="cursor-pointer text-muted hover:text-ink">Edit details</summary>
        <form action={updateAction} className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="sub_type">Sub-type</Label>
            <Select id="sub_type" name="sub_type" defaultValue={company.sub_type ?? ''}>
              <option value="">—</option>
              {MUSIC_SUB_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="engine_pipe">Engine / Pipe</Label>
            <Select id="engine_pipe" name="engine_pipe" defaultValue={company.engine_pipe ?? ''}>
              <option value="">—</option>
              {ENGINE_PIPES.map((e) => <option key={e} value={e}>{ENGINE_PIPE_LABELS[e]}</option>)}
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="website">Website</Label>
            <Input id="website" name="website" type="url" defaultValue={company.website ?? ''} />
          </div>
          <div className="flex items-center gap-2 pt-5">
            <input
              id="mmf_member"
              name="mmf_member"
              type="checkbox"
              defaultChecked={!!company.mmf_member}
            />
            <label htmlFor="mmf_member" className="text-xs text-muted">MMF member (25% discount eligible)</label>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="tags">Tags</Label>
            <Input id="tags" name="tags" defaultValue={(company.tags ?? []).join(', ')} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" defaultValue={company.notes ?? ''} />
          </div>
          <div className="sm:col-span-2"><Button type="submit" variant="secondary">Save</Button></div>
        </form>
      </details>
    </Card>
  );
}

// ============================================================================
// Contacts
// ============================================================================

export function ContactsSection({ companyId, contacts }: { companyId: string; contacts: any[] }) {
  const action = addContact.bind(null, companyId);
  return (
    <Section
      title={`Contacts (${contacts.length})`}
      action={
        <details className="relative">
          <summary className="cursor-pointer text-xs text-accent hover:underline">+ Add contact</summary>
          <form action={action} className="absolute right-0 z-10 mt-2 w-80 space-y-2 rounded border border-border bg-white p-3 shadow-md">
            <Input name="name" placeholder="Name *" required />
            <Input name="role" placeholder="Role" />
            <Input name="email" type="email" placeholder="Email" />
            <Input name="linkedin" placeholder="LinkedIn URL" />
            <Select name="source" defaultValue="direct">
              <option value="direct">Direct</option>
              <option value="referral">Referral</option>
              <option value="inbound">Inbound</option>
              <option value="event">Event</option>
              <option value="cold_outreach">Cold outreach</option>
            </Select>
            <Input name="referred_by" placeholder="Referred by" />
            <label className="flex items-center gap-2 text-xs text-muted">
              <input type="checkbox" name="is_primary" /> Primary contact
            </label>
            <Button type="submit" className="w-full">Add</Button>
          </form>
        </details>
      }
    >
      <Card>
        {contacts.length === 0 ? (
          <p className="px-3 py-2.5 text-sm text-muted">No contacts yet.</p>
        ) : (
          contacts.map((c) => (
            <div key={c.id} className="border-b border-border px-3 py-2.5 last:border-b-0">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium">{c.name}</span>
                {c.is_primary && <Badge variant="accent">primary</Badge>}
                {c.role && <span className="text-xs text-muted">· {c.role}</span>}
              </div>
              <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted">
                {c.email && <span>{c.email}</span>}
                {c.linkedin && <a href={c.linkedin} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">LinkedIn ↗</a>}
                {c.source && <span>source: {c.source}</span>}
                {c.referred_by && <span>via {c.referred_by}</span>}
              </div>
            </div>
          ))
        )}
      </Card>
    </Section>
  );
}

// ============================================================================
// Deals
// ============================================================================

export function DealsSection({ companyId, deals }: { companyId: string; deals: any[] }) {
  const action = addDeal.bind(null, companyId);
  return (
    <Section
      title={`Deals (${deals.length})`}
      action={
        <details className="relative">
          <summary className="cursor-pointer text-xs text-accent hover:underline">+ Add deal</summary>
          <form action={action} className="absolute right-0 z-10 mt-2 w-80 space-y-2 rounded border border-border bg-white p-3 shadow-md">
            <Input name="deal_name" placeholder="Deal name" />
            <Select name="stage" defaultValue="exposure_scan">
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
            </Select>
            <Select name="status" defaultValue="active">
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
            <Select name="track" defaultValue="">
              <option value="">No track</option>
              {TRACKS.map((t) => <option key={t} value={t}>{TRACK_LABELS[t]}</option>)}
            </Select>
            <Select name="pricing_tier" defaultValue="">
              <option value="">No tier</option>
              {PRICING_TIERS.map((t) => (
                <option key={t} value={t}>{PRICING_TIER_LABELS[t]} ({PRICING_TIER_ANCHORS[t]})</option>
              ))}
            </Select>
            <Input name="deal_value" type="number" placeholder="Value (GBP)" />
            <Input name="probability" type="number" min="0" max="100" placeholder="Probability %" />
            <Input name="next_action" placeholder="Next action" />
            <Input name="next_action_due" type="date" />
            <Button type="submit" className="w-full">Add</Button>
          </form>
        </details>
      }
    >
      <Card>
        {deals.length === 0 ? (
          <p className="px-3 py-2.5 text-sm text-muted">No deals yet.</p>
        ) : (
          deals.map((d) => <DealRow key={d.id} deal={d} companyId={companyId} />)
        )}
      </Card>
    </Section>
  );
}

function DealRow({ deal, companyId }: { deal: any; companyId: string }) {
  const action = updateDeal.bind(null, deal.id, companyId);
  return (
    <div className="border-b border-border px-3 py-2.5 last:border-b-0">
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-sm font-medium">{deal.deal_name}</span>
            <Badge variant="muted">{STAGE_LABELS[deal.stage as keyof typeof STAGE_LABELS] ?? deal.stage}</Badge>
            <StatusBadge status={deal.status} />
            {deal.track && <Badge variant="accent">{TRACK_LABELS[deal.track as Track]}</Badge>}
            {deal.pricing_tier && (
              <Badge variant="muted">{PRICING_TIER_LABELS[deal.pricing_tier as PricingTier]}</Badge>
            )}
          </div>
          {deal.next_action && (
            <p className="mt-0.5 text-xs text-muted">
              Next: {deal.next_action}
              {deal.next_action_due && <span> · {formatDate(deal.next_action_due)}</span>}
            </p>
          )}
        </div>
        <div className="shrink-0 text-right">
          {deal.deal_value != null && (
            <div className="text-sm font-medium">{formatGBP(deal.deal_value)}</div>
          )}
          {deal.probability != null && (
            <div className="text-xs text-muted">{deal.probability}%</div>
          )}
        </div>
      </div>
      <details className="mt-2 text-xs">
        <summary className="cursor-pointer text-muted hover:text-ink">Edit</summary>
        <form action={action} className="mt-2 grid gap-2 sm:grid-cols-2">
          <Select name="stage" defaultValue={deal.stage}>
            {STAGES.map((s) => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
          </Select>
          <Select name="status" defaultValue={deal.status}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Select name="track" defaultValue={deal.track ?? ''}>
            <option value="">No track</option>
            {TRACKS.map((t) => <option key={t} value={t}>{TRACK_LABELS[t]}</option>)}
          </Select>
          <Select name="pricing_tier" defaultValue={deal.pricing_tier ?? ''}>
            <option value="">No tier</option>
            {PRICING_TIERS.map((t) => (
              <option key={t} value={t}>{PRICING_TIER_LABELS[t]} ({PRICING_TIER_ANCHORS[t]})</option>
            ))}
          </Select>
          <Input name="next_action" defaultValue={deal.next_action ?? ''} placeholder="Next action" className="sm:col-span-2" />
          <Input name="next_action_due" type="date" defaultValue={deal.next_action_due ?? ''} />
          <div><Button type="submit" variant="secondary">Save</Button></div>
        </form>
      </details>
      <MeetingPrepBlock deal={deal} companyId={companyId} />
    </div>
  );
}

function MeetingPrepBlock({ deal, companyId }: { deal: any; companyId: string }) {
  const isCallish =
    typeof deal.next_action === 'string' &&
    /\b(call|meeting)\b/i.test(deal.next_action);
  const hasPrep = !!deal.meeting_prep?.brief;
  if (!isCallish && !hasPrep) return null;

  const generateAction = generateMeetingPrepForDeal.bind(null, deal.id, companyId);

  return (
    <details className="mt-2 text-xs" open={hasPrep && isCallish}>
      <summary className="cursor-pointer text-accent hover:underline">
        📋 Meeting prep {hasPrep && deal.meeting_prep?.generated_at && (
          <span className="ml-1 text-muted">
            (generated {formatRelative(deal.meeting_prep.generated_at)})
          </span>
        )}
      </summary>
      <div className="mt-2 space-y-2">
        <form action={generateAction}>
          <Button type="submit" variant="secondary" className="text-xs">
            {hasPrep ? 'Regenerate' : 'Generate brief'}
          </Button>
        </form>
        {hasPrep && (
          <pre className="whitespace-pre-wrap rounded border border-border bg-bg p-3 font-sans text-[13px] leading-relaxed">
            {deal.meeting_prep.brief}
          </pre>
        )}
      </div>
    </details>
  );
}

// ============================================================================
// Interactions
// ============================================================================

export function InteractionsSection({
  companyId,
  companyName,
  interactions,
  contacts,
  deals,
}: {
  companyId: string;
  companyName: string;
  interactions: any[];
  contacts: any[];
  deals: any[];
}) {
  const action = addInteraction.bind(null, companyId);
  return (
    <Section
      title={`Interactions (${interactions.length})`}
      action={
        <details className="relative">
          <summary className="cursor-pointer text-xs text-accent hover:underline">+ Log interaction</summary>
          <form action={action} className="absolute right-0 z-10 mt-2 w-96 space-y-2 rounded border border-border bg-white p-3 shadow-md">
            <Select name="type" defaultValue="note">
              {INTERACTION_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
            </Select>
            <Input name="date" type="datetime-local" />
            <Select name="contact_id" defaultValue="">
              <option value="">No contact</option>
              {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
            <Select name="deal_id" defaultValue="">
              <option value="">No deal</option>
              {deals.map((d) => <option key={d.id} value={d.id}>{d.deal_name}</option>)}
            </Select>
            <Textarea
              id="interaction-summary"
              name="summary"
              placeholder="Paste raw notes or call transcript — click Summarize below to clean up, or write the summary directly."
              required
            />
            <SummarizeButton
              textareaId="interaction-summary"
              followUpDateId="interaction-followup"
              companyName={companyName}
            />
            <div className="space-y-1">
              <Label htmlFor="interaction-followup">Follow up by (optional)</Label>
              <Input id="interaction-followup" name="follow_up_date" type="date" />
            </div>
            <Button type="submit" className="w-full">Log</Button>
          </form>
        </details>
      }
    >
      <Card>
        {interactions.length === 0 ? (
          <p className="px-3 py-2.5 text-sm text-muted">No interactions yet.</p>
        ) : (
          interactions.map((i) => (
            <div key={i.id} className="flex items-start gap-3 border-b border-border px-3 py-2.5 last:border-b-0">
              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded bg-bg text-[11px] text-muted">
                {TYPE_ICONS[i.type] ?? '·'}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2 text-xs text-muted">
                  <span>{i.type.replace('_', ' ')}</span>
                  {i.contact && <span>· {i.contact.name}</span>}
                  <span>· {formatDate(i.date)}</span>
                  <span>· {formatRelative(i.date)}</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm">{i.summary}</p>
                {i.follow_up_needed && i.follow_up_date && (
                  <Badge variant="due" className="mt-1">follow up by {formatDate(i.follow_up_date)}</Badge>
                )}
              </div>
            </div>
          ))
        )}
      </Card>
    </Section>
  );
}

// ============================================================================
// Referrals
// ============================================================================

export function ReferralsSection({
  outbound,
  inbound,
}: {
  outbound: any[];
  inbound: any[];
}) {
  return (
    <Section title={`Referrals (${outbound.length + inbound.length})`}>
      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <div className="border-b border-border px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted">
            Offered by this company ({outbound.length})
          </div>
          {outbound.length === 0 ? (
            <p className="px-3 py-2.5 text-sm text-muted">None.</p>
          ) : (
            outbound.map((r) => (
              <div key={r.id} className="border-b border-border px-3 py-2.5 last:border-b-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium">→ {r.to_company}</span>
                  <Badge variant={r.status === 'converted' ? 'won' : r.status === 'dead' ? 'muted' : 'accent'}>
                    {r.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted">
                  by {r.from_contact?.name ?? '—'}
                  {r.to_contact_name && ` → ${r.to_contact_name}`}
                </p>
                {r.context && <p className="mt-0.5 text-xs text-muted">{r.context}</p>}
              </div>
            ))
          )}
        </Card>

        <Card>
          <div className="border-b border-border px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted">
            Intros to this company ({inbound.length})
          </div>
          {inbound.length === 0 ? (
            <p className="px-3 py-2.5 text-sm text-muted">None.</p>
          ) : (
            inbound.map((r) => (
              <div key={r.id} className="border-b border-border px-3 py-2.5 last:border-b-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium">
                    via {r.from_contact?.name ?? '—'}
                    {r.from_contact?.company && (
                      <Link href={`/companies/${r.from_contact.company.id}`} className="ml-1 text-xs text-muted hover:text-accent">
                        ({r.from_contact.company.name})
                      </Link>
                    )}
                  </span>
                  <Badge variant={r.status === 'converted' ? 'won' : 'accent'}>{r.status}</Badge>
                </div>
                {r.context && <p className="mt-0.5 text-xs text-muted">{r.context}</p>}
              </div>
            ))
          )}
        </Card>
      </div>
    </Section>
  );
}

// AISection now lives in components/ai/ai-panel.tsx and is rendered directly
// by the company page; nothing exported here.
