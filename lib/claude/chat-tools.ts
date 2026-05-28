import type Anthropic from '@anthropic-ai/sdk';
import { createServiceClient } from '@/lib/supabase/server';
import { addDaysISO, todayISO } from '@/lib/format';
import { buildCompanyContext } from './context';

/**
 * Tool definitions for the conversational chat agent. All tools are
 * read-only — they query the database and return JSON to Claude so it can
 * answer questions accurately.
 *
 * Schemas are kept strict so Claude can't hallucinate fields. Each tool
 * returns a structured object that we serialize into the tool_result.
 */
export const CHAT_TOOLS: Anthropic.Tool[] = [
  {
    name: 'search_companies',
    description:
      'Fuzzy-search companies by name. Returns up to 10 matches with their industry, ICP score, and active deal count.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Partial or full company name' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_company',
    description:
      'Fetch the full context for a company — all contacts, deals, recent interactions, referrals. Use this when the user asks about a specific company in depth, before answering.',
    input_schema: {
      type: 'object',
      properties: {
        company_id: { type: 'string', description: 'The company UUID' },
      },
      required: ['company_id'],
    },
  },
  {
    name: 'list_overdue_actions',
    description: 'Return all active deals where next_action_due is in the past.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'list_stale_deals',
    description:
      'Return active deals with no interaction in N days (default 7). Use to surface accounts being neglected.',
    input_schema: {
      type: 'object',
      properties: {
        days: { type: 'integer', minimum: 1, maximum: 90, default: 7 },
      },
    },
  },
  {
    name: 'pipeline_summary',
    description:
      'Return counts and total deal value broken down by stage, by track, and by industry. Use for "what does my pipeline look like" type questions.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'list_pending_drafts',
    description:
      'Return all auto-generated email drafts currently awaiting approval (status=pending in ai_drafts).',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'list_open_referrals',
    description:
      'Return all referrals with status offered or accepted — intros offered but not yet actioned.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'search_interactions',
    description:
      'Search interaction summaries for a substring. Returns up to 15 matches with company name and date.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
      },
      required: ['query'],
    },
  },
  {
    name: 'list_advisors',
    description:
      'List all contacts flagged is_advisor=true with their advisor_role text.',
    input_schema: { type: 'object', properties: {} },
  },
];

// ============================================================================
// Tool executors. Each function takes the tool input and returns a string
// payload (JSON) for Claude.
// ============================================================================

export async function executeTool(name: string, input: any): Promise<string> {
  switch (name) {
    case 'search_companies':
      return JSON.stringify(await searchCompanies(input.query));
    case 'get_company':
      return JSON.stringify(await getCompanyForChat(input.company_id));
    case 'list_overdue_actions':
      return JSON.stringify(await listOverdueActions());
    case 'list_stale_deals':
      return JSON.stringify(await listStaleDeals(input.days ?? 7));
    case 'pipeline_summary':
      return JSON.stringify(await pipelineSummary());
    case 'list_pending_drafts':
      return JSON.stringify(await listPendingDrafts());
    case 'list_open_referrals':
      return JSON.stringify(await listOpenReferrals());
    case 'search_interactions':
      return JSON.stringify(await searchInteractions(input.query));
    case 'list_advisors':
      return JSON.stringify(await listAdvisors());
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

async function searchCompanies(query: string) {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('companies')
    .select('id, name, industry, sub_type, engine_pipe, icp_score, tags')
    .ilike('name', `%${query}%`)
    .limit(10);
  if (!data) return { results: [] };

  // Augment with active deal count
  const ids = data.map((c: any) => c.id);
  const { data: deals } = await supabase
    .from('deals')
    .select('company_id')
    .in('company_id', ids)
    .eq('status', 'active');
  const dealCounts = new Map<string, number>();
  for (const d of deals ?? []) {
    dealCounts.set(d.company_id, (dealCounts.get(d.company_id) ?? 0) + 1);
  }
  return {
    results: data.map((c: any) => ({
      ...c,
      active_deals: dealCounts.get(c.id) ?? 0,
    })),
  };
}

async function getCompanyForChat(companyId: string) {
  const context = await buildCompanyContext(companyId);
  if (!context) return { error: 'Company not found' };
  return { context };
}

async function listOverdueActions() {
  const supabase = createServiceClient();
  const today = todayISO();
  const { data } = await supabase
    .from('deals')
    .select('id, deal_name, stage, next_action, next_action_due, company:companies (id, name)')
    .eq('status', 'active')
    .lt('next_action_due', today)
    .order('next_action_due', { ascending: true });
  return { overdue: data ?? [] };
}

async function listStaleDeals(days: number) {
  const supabase = createServiceClient();
  const threshold = addDaysISO(-days);
  const [{ data: deals }, { data: interactions }] = await Promise.all([
    supabase
      .from('deals')
      .select('id, deal_name, stage, company:companies (id, name)')
      .eq('status', 'active'),
    supabase
      .from('interactions')
      .select('deal_id, date')
      .not('deal_id', 'is', null)
      .order('date', { ascending: false }),
  ]);
  const latest = new Map<string, string>();
  for (const i of interactions ?? []) {
    if (i.deal_id && !latest.has(i.deal_id)) latest.set(i.deal_id, i.date);
  }
  const stale = (deals ?? [])
    .filter((d: any) => {
      const last = latest.get(d.id);
      return !last || last < `${threshold}T23:59:59Z`;
    })
    .map((d: any) => ({ ...d, last_interaction: latest.get(d.id) ?? null }));
  return { stale, threshold_days: days };
}

async function pipelineSummary() {
  const supabase = createServiceClient();
  const { data: deals } = await supabase
    .from('deals')
    .select('stage, status, track, deal_value, company:companies (industry)');
  const summary = {
    by_stage: {} as Record<string, { count: number; value: number }>,
    by_track: {} as Record<string, { count: number; value: number }>,
    by_industry: {} as Record<string, { count: number; value: number }>,
    by_status: {} as Record<string, number>,
  };
  for (const d of deals ?? []) {
    summary.by_status[d.status] = (summary.by_status[d.status] ?? 0) + 1;
    if (d.status !== 'active') continue;
    summary.by_stage[d.stage] = summary.by_stage[d.stage] ?? { count: 0, value: 0 };
    summary.by_stage[d.stage].count += 1;
    summary.by_stage[d.stage].value += d.deal_value ?? 0;
    const track = d.track ?? 'unassigned';
    summary.by_track[track] = summary.by_track[track] ?? { count: 0, value: 0 };
    summary.by_track[track].count += 1;
    summary.by_track[track].value += d.deal_value ?? 0;
    const industry = (d as any).company?.industry ?? 'unknown';
    summary.by_industry[industry] = summary.by_industry[industry] ?? { count: 0, value: 0 };
    summary.by_industry[industry].count += 1;
    summary.by_industry[industry].value += d.deal_value ?? 0;
  }
  return summary;
}

async function listPendingDrafts() {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('ai_drafts')
    .select('id, subject, generated_at, notes, company:companies (name), deal:deals (deal_name)')
    .eq('status', 'pending')
    .order('generated_at', { ascending: false });
  return { drafts: data ?? [] };
}

async function listOpenReferrals() {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('referrals')
    .select('id, to_company, to_contact_name, context, status, date, from_contact:contacts (name)')
    .in('status', ['offered', 'accepted', 'intro_made'])
    .order('date', { ascending: true });
  return { referrals: data ?? [] };
}

async function searchInteractions(query: string) {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('interactions')
    .select('id, type, summary, date, company:companies (id, name)')
    .ilike('summary', `%${query}%`)
    .order('date', { ascending: false })
    .limit(15);
  return { matches: data ?? [] };
}

async function listAdvisors() {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('contacts')
    .select('name, role, advisor_role, email')
    .eq('is_advisor', true)
    .order('name');
  return { advisors: data ?? [] };
}
