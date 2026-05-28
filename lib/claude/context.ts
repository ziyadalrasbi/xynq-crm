import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/format';

/**
 * Build a markdown-formatted context block for a company.
 *
 * Used as the cacheable suffix to SYSTEM_PROMPT_BASE so multiple AI features
 * (draft email, suggest action, etc.) called on the same company within 5
 * minutes hit the cache.
 *
 * Returns null if the company doesn't exist.
 */
export async function buildCompanyContext(companyId: string): Promise<string | null> {
  const supabase = createClient();

  const [{ data: company }, { data: contacts }, { data: deals }, { data: interactions }, { data: outboundReferrals }] =
    await Promise.all([
      supabase.from('companies').select('*').eq('id', companyId).single(),
      supabase.from('contacts').select('*').eq('company_id', companyId).order('is_primary', { ascending: false }),
      supabase.from('deals').select('*').eq('company_id', companyId).order('created_at', { ascending: false }),
      supabase
        .from('interactions')
        .select('*, contact:contacts (name)')
        .eq('company_id', companyId)
        .order('date', { ascending: false })
        .limit(10),
      supabase
        .from('referrals')
        .select('*, from_contact:contacts!inner (name, company_id)')
        .eq('from_contact.company_id', companyId)
        .order('date', { ascending: false }),
    ]);

  if (!company) return null;

  const lines: string[] = [];
  lines.push(`# Company context: ${company.name}`);
  lines.push('');
  lines.push(`- Industry: ${company.industry}${company.sub_type ? ` (${company.sub_type})` : ''}`);
  if (company.engine_pipe) lines.push(`- Engine/Pipe: ${company.engine_pipe}`);
  if (company.mmf_member) lines.push(`- MMF member (25% discount eligible)`);
  if (company.tags?.length) lines.push(`- Tags: ${company.tags.join(', ')}`);
  if (company.icp_score != null) lines.push(`- ICP score: ${company.icp_score}/10`);
  if (company.website) lines.push(`- Website: ${company.website}`);
  if (company.notes) {
    lines.push('');
    lines.push(`Notes: ${company.notes}`);
  }

  if (contacts && contacts.length > 0) {
    lines.push('');
    lines.push('## Contacts');
    for (const c of contacts) {
      const parts = [c.name];
      if (c.role) parts.push(c.role);
      if (c.email) parts.push(c.email);
      if (c.is_primary) parts.push('PRIMARY');
      lines.push(`- ${parts.join(' · ')}`);
      if (c.referred_by) lines.push(`  (via ${c.referred_by})`);
    }
  }

  if (deals && deals.length > 0) {
    lines.push('');
    lines.push('## Deals');
    for (const d of deals) {
      const parts = [d.deal_name, `stage: ${d.stage}`, `status: ${d.status}`];
      if (d.track) parts.push(`track: ${d.track}`);
      if (d.pricing_tier) parts.push(`tier: ${d.pricing_tier}`);
      if (d.deal_value != null) parts.push(`£${d.deal_value.toLocaleString()}`);
      lines.push(`- ${parts.join(' · ')}`);
      if (d.next_action) {
        const due = d.next_action_due ? ` (due ${formatDate(d.next_action_due)})` : '';
        lines.push(`  Next: ${d.next_action}${due}`);
      }
      if (d.notes) lines.push(`  Notes: ${d.notes.replace(/\n/g, ' ')}`);
    }
  }

  if (interactions && interactions.length > 0) {
    lines.push('');
    lines.push('## Recent interactions (newest first)');
    for (const i of interactions) {
      const contact = (i as any).contact?.name ? ` with ${(i as any).contact.name}` : '';
      lines.push(`- ${formatDate(i.date)} — ${i.type}${contact}: ${i.summary}`);
    }
  }

  if (outboundReferrals && outboundReferrals.length > 0) {
    lines.push('');
    lines.push('## Referrals offered by contacts here');
    for (const r of outboundReferrals) {
      const from = (r as any).from_contact?.name ?? 'unknown';
      const to = r.to_contact_name ? `${r.to_company} (${r.to_contact_name})` : r.to_company;
      lines.push(`- ${from} → ${to} [${r.status}]: ${r.context ?? ''}`);
    }
  }

  return lines.join('\n');
}

export async function buildCompetitorList(): Promise<string> {
  const supabase = createClient();
  const { data } = await supabase.from('competitors').select('name, description, overlap, weakness');
  if (!data || data.length === 0) return '';

  const lines = ['## Known competitors / vendors'];
  for (const c of data) {
    lines.push(`- **${c.name}**: ${c.description ?? ''}`);
    if (c.overlap) lines.push(`  Overlap: ${c.overlap}`);
    if (c.weakness) lines.push(`  Our angle: ${c.weakness}`);
  }
  return lines.join('\n');
}
