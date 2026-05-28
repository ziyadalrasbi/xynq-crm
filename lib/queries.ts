import { createClient, createServiceClient } from '@/lib/supabase/server';
import { addDaysISO, todayISO } from '@/lib/format';

export type DashboardDeal = {
  id: string;
  deal_name: string;
  stage: string;
  status: string;
  next_action: string | null;
  next_action_due: string | null;
  company: { id: string; name: string; industry: string; sub_type: string | null };
};

export type Interaction = {
  id: string;
  type: string;
  summary: string;
  date: string;
  company: { id: string; name: string };
};

const DEAL_WITH_COMPANY = `
  id, deal_name, stage, status, deal_value, next_action, next_action_due,
  company:companies (id, name, industry, sub_type)
`;

export async function getDashboardData() {
  const supabase = createClient();
  const today = todayISO();
  const weekFromNow = addDaysISO(7);

  const [overdue, dueToday, thisWeek, pipeline, recent] = await Promise.all([
    supabase
      .from('deals')
      .select(DEAL_WITH_COMPANY)
      .eq('status', 'active')
      .lt('next_action_due', today)
      .order('next_action_due', { ascending: true }),
    supabase
      .from('deals')
      .select(DEAL_WITH_COMPANY)
      .eq('status', 'active')
      .eq('next_action_due', today),
    supabase
      .from('deals')
      .select(DEAL_WITH_COMPANY)
      .eq('status', 'active')
      .gt('next_action_due', today)
      .lte('next_action_due', weekFromNow)
      .order('next_action_due', { ascending: true }),
    supabase
      .from('deals')
      .select('stage, status, deal_value'),
    supabase
      .from('interactions')
      .select('id, type, summary, date, company:companies (id, name)')
      .order('date', { ascending: false })
      .limit(10),
  ]);

  return {
    overdue: (overdue.data ?? []) as unknown as DashboardDeal[],
    dueToday: (dueToday.data ?? []) as unknown as DashboardDeal[],
    thisWeek: (thisWeek.data ?? []) as unknown as DashboardDeal[],
    pipeline: pipeline.data ?? [],
    recent: (recent.data ?? []) as unknown as Interaction[],
  };
}

export async function getPipelineDeals() {
  const supabase = createClient();
  const { data } = await supabase
    .from('deals')
    .select(`
      id, deal_name, stage, status, deal_value, next_action, next_action_due,
      track, pricing_tier,
      company:companies (id, name, industry, sub_type, tags, icp_score, engine_pipe, mmf_member)
    `)
    .order('next_action_due', { ascending: true, nullsFirst: false });
  return (data ?? []) as any[];
}

export async function getCompanyDetail(id: string) {
  const supabase = createClient();
  const [company, contacts, deals, interactions, outboundReferrals, inboundReferrals, sequences] = await Promise.all([
    supabase.from('companies').select('*').eq('id', id).single(),
    supabase.from('contacts').select('*').eq('company_id', id).order('is_primary', { ascending: false }),
    supabase.from('deals').select('*').eq('company_id', id).order('created_at', { ascending: false }),
    supabase
      .from('interactions')
      .select('*, contact:contacts (id, name)')
      .eq('company_id', id)
      .order('date', { ascending: false }),
    // Referrals offered by contacts at this company
    supabase
      .from('referrals')
      .select('*, from_contact:contacts!inner (id, name, company_id)')
      .eq('from_contact.company_id', id)
      .order('date', { ascending: false }),
    // Referrals offered TO this company (by name match)
    supabase
      .from('companies')
      .select('name')
      .eq('id', id)
      .single()
      .then(async ({ data }) => {
        if (!data) return { data: [] };
        return supabase
          .from('referrals')
          .select('*, from_contact:contacts (id, name, company:companies (id, name))')
          .eq('to_company', data.name)
          .order('date', { ascending: false });
      }),
    // Sequences for deals at this company (via inner join filter)
    supabase
      .from('email_sequences')
      .select(`
        id, template_name, current_step, next_send_date, status,
        deal:deals!inner (id, deal_name, company_id),
        emails:sequence_emails (id, step_number, subject, body, status, scheduled_date, sent_date)
      `)
      .eq('deal.company_id', id)
      .order('created_at', { ascending: false }),
  ]);

  // Sort sequence emails by step_number
  const seqRows = (sequences.data ?? []).map((s: any) => ({
    ...s,
    emails: (s.emails ?? []).sort((a: any, b: any) => a.step_number - b.step_number),
  }));

  return {
    company: company.data,
    contacts: contacts.data ?? [],
    deals: deals.data ?? [],
    interactions: interactions.data ?? [],
    outboundReferrals: outboundReferrals.data ?? [],
    inboundReferrals: inboundReferrals.data ?? [],
    sequences: seqRows,
  };
}

// ============================================================================
// Sanitized advisor view — no PII, no internal notes, no email drafts
// ============================================================================
export async function getAdvisorDashboardData() {
  // Token validation already happened; use service role to bypass RLS for the
  // sanitized data fetch (anon role has no policies on companies/deals).
  const supabase = createServiceClient();
  const today = todayISO();

  const [allActive, won, byIndustry, recentWins, topActive] = await Promise.all([
    supabase
      .from('deals')
      .select('stage, status, track, deal_value, company_id')
      .eq('status', 'active'),
    supabase.from('deals').select('id').eq('status', 'won'),
    supabase.from('companies').select('industry, id'),
    supabase
      .from('deals')
      .select('deal_name, deal_value, updated_at, company:companies (id, name, industry)')
      .eq('status', 'won')
      .order('updated_at', { ascending: false })
      .limit(5),
    supabase
      .from('deals')
      .select(`
        id, deal_name, stage, status, track, pricing_tier, deal_value, next_action_due,
        company:companies (id, name, industry, sub_type, engine_pipe, icp_score)
      `)
      .eq('status', 'active')
      .order('deal_value', { ascending: false, nullsFirst: false })
      .limit(15),
  ]);

  return {
    allActive: allActive.data ?? [],
    wonCount: won.data?.length ?? 0,
    byIndustry: byIndustry.data ?? [],
    recentWins: recentWins.data ?? [],
    topActive: topActive.data ?? [],
    asOf: today,
  };
}

export async function getShareToken(token: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('share_tokens')
    .select('id, label, revoked_at')
    .eq('token', token)
    .is('revoked_at', null)
    .single();
  if (error || !data) return null;
  // Touch last_accessed_at (best effort)
  await supabase
    .from('share_tokens')
    .update({ last_accessed_at: new Date().toISOString() })
    .eq('id', data.id);
  return data;
}

export async function listShareTokens() {
  const supabase = createClient();
  const { data } = await supabase
    .from('share_tokens')
    .select('*')
    .order('created_at', { ascending: false });
  return data ?? [];
}

// ============================================================================
// AI drafts (auto-generated follow-ups)
// ============================================================================
export async function listPendingDrafts() {
  const supabase = createClient();
  const { data } = await supabase
    .from('ai_drafts')
    .select(`
      id, subject, body, generated_at, notes,
      company:companies (id, name),
      deal:deals (id, deal_name, stage)
    `)
    .eq('status', 'pending')
    .order('generated_at', { ascending: false });
  return data ?? [];
}

// ============================================================================
// Inbox notifications — aggregated action queue
// ============================================================================
export async function getInboxNotifications() {
  const supabase = createClient();
  const today = todayISO();
  const sevenDaysAgo = addDaysISO(-7);
  const fourteenDaysAgo = addDaysISO(-14);

  const [
    overdueDeals,
    draftSequenceEmails,
    aiDrafts,
    staleReferrals,
    pendingMeetingPrep,
    unscored,
  ] = await Promise.all([
    supabase
      .from('deals')
      .select(DEAL_WITH_COMPANY)
      .eq('status', 'active')
      .lt('next_action_due', today)
      .order('next_action_due', { ascending: true }),
    supabase
      .from('sequence_emails')
      .select(`
        id, step_number, subject, scheduled_date,
        sequence:email_sequences!inner (
          id, template_name,
          deal:deals!inner (id, deal_name, company:companies (id, name))
        )
      `)
      .eq('status', 'draft')
      .not('body', 'is', null),
    supabase
      .from('ai_drafts')
      .select(`
        id, subject, generated_at,
        company:companies (id, name),
        deal:deals (id, deal_name)
      `)
      .eq('status', 'pending')
      .order('generated_at', { ascending: false }),
    supabase
      .from('referrals')
      .select(`
        id, to_company, status, date,
        from_contact:contacts (name, company:companies (id, name))
      `)
      .eq('status', 'offered')
      .lte('date', fourteenDaysAgo),
    supabase
      .from('deals')
      .select('id, deal_name, next_action, next_action_due, meeting_prep, company:companies (id, name)')
      .eq('status', 'active')
      .gte('next_action_due', today)
      .lte('next_action_due', addDaysISO(2))
      .not('meeting_prep', 'is', null),
    supabase
      .from('companies')
      .select('id, name, created_at')
      .is('icp_score', null)
      .gte('created_at', sevenDaysAgo)
      .order('created_at', { ascending: false }),
  ]);

  return {
    overdueDeals: overdueDeals.data ?? [],
    draftSequenceEmails: draftSequenceEmails.data ?? [],
    aiDrafts: aiDrafts.data ?? [],
    staleReferrals: staleReferrals.data ?? [],
    pendingMeetingPrep: (pendingMeetingPrep.data ?? []).filter((d: any) =>
      typeof d.next_action === 'string' && /\b(call|meeting)\b/i.test(d.next_action),
    ),
    unscored: unscored.data ?? [],
  };
}

// ============================================================================
// Chat conversations
// ============================================================================
export async function listChatConversations() {
  const supabase = createClient();
  const { data } = await supabase
    .from('chat_conversations')
    .select('id, title, created_at, updated_at')
    .order('updated_at', { ascending: false });
  return data ?? [];
}

export async function getConversation(id: string) {
  const supabase = createClient();
  const [conv, messages] = await Promise.all([
    supabase.from('chat_conversations').select('*').eq('id', id).single(),
    supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true }),
  ]);
  if (!conv.data) return null;
  return { conversation: conv.data, messages: messages.data ?? [] };
}

export async function listCompanies() {
  const supabase = createClient();
  const { data } = await supabase
    .from('companies')
    .select('id, name, industry, sub_type, tags')
    .order('name');
  return data ?? [];
}

// ============================================================================
// Contacts directory
// ============================================================================

export async function listAllContacts() {
  const supabase = createClient();
  // Get all contacts with their company, plus the most-recent interaction date
  // for each. Doing this as one query with a left-join + max would need a SQL
  // view; for v1 we do contacts + a separate interactions roll-up and merge
  // client-side. Scales fine to a few thousand contacts.
  const [{ data: contacts }, { data: interactions }] = await Promise.all([
    supabase
      .from('contacts')
      .select('id, name, role, email, source, referred_by, is_primary, is_advisor, company:companies (id, name, industry)')
      .order('name'),
    supabase
      .from('interactions')
      .select('contact_id, date')
      .not('contact_id', 'is', null)
      .order('date', { ascending: false }),
  ]);

  const lastByContact = new Map<string, string>();
  for (const row of interactions ?? []) {
    if (row.contact_id && !lastByContact.has(row.contact_id)) {
      lastByContact.set(row.contact_id, row.date);
    }
  }

  return (contacts ?? []).map((c: any) => ({
    ...c,
    last_interaction_date: lastByContact.get(c.id) ?? null,
  }));
}

// ============================================================================
// Referrals tracker
// ============================================================================

export async function listAllReferrals() {
  const supabase = createClient();
  const { data } = await supabase
    .from('referrals')
    .select(`
      id, to_company, to_contact_name, to_contact_email, context, status, date, notes,
      from_contact:contacts (id, name, company:companies (id, name))
    `)
    .order('date', { ascending: false });
  return data ?? [];
}

// ============================================================================
// Intelligence feed
// ============================================================================

export type FeedData = {
  newCompanies: any[];
  recentlyUpdatedDeals: any[];
  overdueActions: any[];
  staleActiveDeals: any[];
  staleReferrals: any[];
  newInteractions: any[];
};

export async function getIntelligenceFeed(): Promise<FeedData> {
  const supabase = createClient();
  const today = todayISO();
  const sevenDaysAgo = addDaysISO(-7);
  const fourteenDaysAgo = addDaysISO(-14);

  // We fetch the building blocks here, then a follow-up query computes
  // "stale deals" (active deals where the latest interaction is > 7 days old).
  const [
    newCompanies,
    recentlyUpdatedDeals,
    overdueActions,
    staleReferrals,
    newInteractions,
    activeDeals,
    interactionsByDeal,
  ] = await Promise.all([
    supabase
      .from('companies')
      .select('id, name, industry, sub_type, tags, engine_pipe, icp_score, created_at')
      .gte('created_at', sevenDaysAgo)
      .order('created_at', { ascending: false }),
    supabase
      .from('deals')
      .select('id, deal_name, stage, status, track, updated_at, created_at, company:companies (id, name)')
      .gte('updated_at', sevenDaysAgo)
      .order('updated_at', { ascending: false })
      .limit(20),
    supabase
      .from('deals')
      .select(DEAL_WITH_COMPANY)
      .eq('status', 'active')
      .lt('next_action_due', today)
      .order('next_action_due', { ascending: true }),
    supabase
      .from('referrals')
      .select(`
        id, to_company, to_contact_name, context, status, date,
        from_contact:contacts (id, name, company:companies (id, name))
      `)
      .eq('status', 'offered')
      .lte('date', fourteenDaysAgo)
      .order('date', { ascending: true }),
    supabase
      .from('interactions')
      .select('id, type, summary, date, follow_up_needed, follow_up_date, company:companies (id, name), contact:contacts (id, name)')
      .gte('date', sevenDaysAgo)
      .order('date', { ascending: false })
      .limit(15),
    supabase
      .from('deals')
      .select('id, deal_name, stage, status, company:companies (id, name)')
      .eq('status', 'active'),
    supabase
      .from('interactions')
      .select('deal_id, date')
      .not('deal_id', 'is', null)
      .order('date', { ascending: false }),
  ]);

  // Compute stale active deals: active deals where most recent interaction
  // (if any) is older than 7 days, or no interaction at all.
  const latestByDeal = new Map<string, string>();
  for (const row of interactionsByDeal.data ?? []) {
    if (row.deal_id && !latestByDeal.has(row.deal_id)) {
      latestByDeal.set(row.deal_id, row.date);
    }
  }
  const staleActiveDeals = (activeDeals.data ?? [])
    .map((d: any) => ({
      ...d,
      last_interaction: latestByDeal.get(d.id) ?? null,
    }))
    .filter((d: any) => !d.last_interaction || d.last_interaction < sevenDaysAgo)
    .sort((a: any, b: any) => {
      // Nulls (never interacted) first, then oldest first
      if (!a.last_interaction && b.last_interaction) return -1;
      if (a.last_interaction && !b.last_interaction) return 1;
      return (a.last_interaction ?? '').localeCompare(b.last_interaction ?? '');
    })
    .slice(0, 15);

  return {
    newCompanies: newCompanies.data ?? [],
    recentlyUpdatedDeals: recentlyUpdatedDeals.data ?? [],
    overdueActions: (overdueActions.data ?? []) as any[],
    staleActiveDeals,
    staleReferrals: staleReferrals.data ?? [],
    newInteractions: newInteractions.data ?? [],
  };
}
