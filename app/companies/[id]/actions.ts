'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  ENGINE_PIPES,
  PRICING_TIERS,
  STAGES,
  STATUSES,
  TRACKS,
  type EnginePipe,
  type PricingTier,
  type Stage,
  type Status,
  type Track,
} from '@/lib/design';
import { generateMeetingPrep } from '@/lib/claude/features/meeting-prep';

function parseTags(raw: string): string[] {
  return raw
    .split(',')
    .map((t) => t.trim().toLowerCase().replace(/\s+/g, '_'))
    .filter(Boolean);
}

export async function updateCompany(companyId: string, formData: FormData) {
  const supabase = createClient();
  const tags = parseTags(String(formData.get('tags') ?? ''));
  const sub_type = String(formData.get('sub_type') ?? '').trim() || null;
  const website = String(formData.get('website') ?? '').trim() || null;
  const notes = String(formData.get('notes') ?? '').trim() || null;

  const engineRaw = String(formData.get('engine_pipe') ?? '').trim();
  const engine_pipe = engineRaw && ENGINE_PIPES.includes(engineRaw as EnginePipe)
    ? (engineRaw as EnginePipe)
    : null;
  const mmf_member = formData.get('mmf_member') === 'on';

  const { error } = await supabase
    .from('companies')
    .update({ tags, sub_type, website, notes, engine_pipe, mmf_member })
    .eq('id', companyId);
  if (error) throw error;
  revalidatePath(`/companies/${companyId}`);
}

export async function addContact(companyId: string, formData: FormData) {
  const supabase = createClient();
  const name = String(formData.get('name') ?? '').trim();
  if (!name) throw new Error('Name required');

  const { error } = await supabase.from('contacts').insert({
    company_id: companyId,
    name,
    email: String(formData.get('email') ?? '').trim() || null,
    role: String(formData.get('role') ?? '').trim() || null,
    linkedin: String(formData.get('linkedin') ?? '').trim() || null,
    source: String(formData.get('source') ?? 'direct'),
    referred_by: String(formData.get('referred_by') ?? '').trim() || null,
    is_primary: formData.get('is_primary') === 'on',
  });
  if (error) throw error;
  revalidatePath(`/companies/${companyId}`);
}

function parseEnum<T extends string>(raw: string, allowed: readonly T[]): T | null {
  const v = raw.trim();
  return v && (allowed as readonly string[]).includes(v) ? (v as T) : null;
}

export async function addDeal(companyId: string, formData: FormData) {
  const supabase = createClient();
  const stage = String(formData.get('stage') ?? 'exposure_scan') as Stage;
  const status = String(formData.get('status') ?? 'active') as Status;
  if (!STAGES.includes(stage)) throw new Error('Invalid stage');
  if (!STATUSES.includes(status)) throw new Error('Invalid status');

  const deal_value_raw = String(formData.get('deal_value') ?? '').trim();
  const probability_raw = String(formData.get('probability') ?? '').trim();

  const { error } = await supabase.from('deals').insert({
    company_id: companyId,
    deal_name: String(formData.get('deal_name') ?? '').trim() || 'New deal',
    stage,
    status,
    track: parseEnum<Track>(String(formData.get('track') ?? ''), TRACKS),
    pricing_tier: parseEnum<PricingTier>(String(formData.get('pricing_tier') ?? ''), PRICING_TIERS),
    deal_value: deal_value_raw ? Number(deal_value_raw) : null,
    probability: probability_raw ? Number(probability_raw) : null,
    next_action: String(formData.get('next_action') ?? '').trim() || null,
    next_action_due: String(formData.get('next_action_due') ?? '').trim() || null,
  });
  if (error) throw error;
  revalidatePath(`/companies/${companyId}`);
  revalidatePath('/');
  revalidatePath('/pipeline');
}

export async function updateDeal(dealId: string, companyId: string, formData: FormData) {
  const supabase = createClient();
  const stage = String(formData.get('stage') ?? '') as Stage;
  const status = String(formData.get('status') ?? '') as Status;
  if (stage && !STAGES.includes(stage)) throw new Error('Invalid stage');
  if (status && !STATUSES.includes(status)) throw new Error('Invalid status');

  const next_action = String(formData.get('next_action') ?? '').trim() || null;
  const next_action_due = String(formData.get('next_action_due') ?? '').trim() || null;
  const track = parseEnum<Track>(String(formData.get('track') ?? ''), TRACKS);
  const pricing_tier = parseEnum<PricingTier>(String(formData.get('pricing_tier') ?? ''), PRICING_TIERS);

  const { error } = await supabase
    .from('deals')
    .update({ stage, status, track, pricing_tier, next_action, next_action_due })
    .eq('id', dealId);
  if (error) throw error;
  revalidatePath(`/companies/${companyId}`);
  revalidatePath('/');
  revalidatePath('/pipeline');
}

export async function generateMeetingPrepForDeal(dealId: string, companyId: string) {
  const supabase = createClient();
  const { data: deal, error } = await supabase
    .from('deals')
    .select('id, deal_name, next_action, next_action_due, company_id')
    .eq('id', dealId)
    .single();
  if (error || !deal) throw error ?? new Error('Deal not found');
  if (!deal.next_action || !deal.next_action_due) {
    throw new Error('Deal needs next_action and next_action_due');
  }

  const brief = await generateMeetingPrep({
    companyId: deal.company_id,
    dealName: deal.deal_name,
    nextAction: deal.next_action,
    nextActionDue: deal.next_action_due,
  });

  await supabase
    .from('deals')
    .update({ meeting_prep: { generated_at: new Date().toISOString(), brief } })
    .eq('id', dealId);

  revalidatePath(`/companies/${companyId}`);
}

export async function addInteraction(companyId: string, formData: FormData) {
  const supabase = createClient();
  const type = String(formData.get('type') ?? 'note');
  const summary = String(formData.get('summary') ?? '').trim();
  if (!summary) throw new Error('Summary required');

  const dateRaw = String(formData.get('date') ?? '').trim();
  const date = dateRaw ? new Date(dateRaw).toISOString() : new Date().toISOString();

  const contact_id = String(formData.get('contact_id') ?? '').trim() || null;
  const deal_id = String(formData.get('deal_id') ?? '').trim() || null;
  const follow_up_date = String(formData.get('follow_up_date') ?? '').trim() || null;

  const { error } = await supabase.from('interactions').insert({
    company_id: companyId,
    contact_id,
    deal_id,
    type,
    summary,
    date,
    follow_up_needed: !!follow_up_date,
    follow_up_date,
  });
  if (error) throw error;
  revalidatePath(`/companies/${companyId}`);
  revalidatePath('/');
}
