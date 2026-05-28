'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { ENGINE_PIPES, INDUSTRIES, type EnginePipe, type Industry } from '@/lib/design';

function parseTags(raw: string): string[] {
  return raw
    .split(',')
    .map((t) => t.trim().toLowerCase().replace(/\s+/g, '_'))
    .filter(Boolean);
}

export async function createCompany(formData: FormData) {
  const supabase = createClient();

  const name = String(formData.get('name') ?? '').trim();
  const industry = String(formData.get('industry') ?? '') as Industry;
  const sub_type = String(formData.get('sub_type') ?? '').trim() || null;
  const website = String(formData.get('website') ?? '').trim() || null;
  const tags = parseTags(String(formData.get('tags') ?? ''));
  const notes = String(formData.get('notes') ?? '').trim() || null;
  const engineRaw = String(formData.get('engine_pipe') ?? '').trim();
  const engine_pipe = engineRaw && ENGINE_PIPES.includes(engineRaw as EnginePipe)
    ? (engineRaw as EnginePipe)
    : null;
  const mmf_member = formData.get('mmf_member') === 'on';

  const contact_name = String(formData.get('contact_name') ?? '').trim();
  const contact_email = String(formData.get('contact_email') ?? '').trim() || null;
  const contact_role = String(formData.get('contact_role') ?? '').trim() || null;
  const source = String(formData.get('source') ?? 'direct').trim();
  const referred_by = String(formData.get('referred_by') ?? '').trim() || null;

  const next_action = String(formData.get('next_action') ?? '').trim() || null;
  const next_action_due = String(formData.get('next_action_due') ?? '').trim() || null;

  if (!name) throw new Error('Company name is required');
  if (!INDUSTRIES.includes(industry)) throw new Error('Invalid industry');

  const { data: company, error: companyErr } = await supabase
    .from('companies')
    .insert({ name, industry, sub_type, website, tags, notes, engine_pipe, mmf_member })
    .select('id')
    .single();
  if (companyErr || !company) throw companyErr ?? new Error('Failed to create company');

  if (contact_name) {
    await supabase.from('contacts').insert({
      company_id: company.id,
      name: contact_name,
      email: contact_email,
      role: contact_role,
      source,
      referred_by,
      is_primary: true,
    });
  }

  await supabase.from('deals').insert({
    company_id: company.id,
    deal_name: `${name} — Pipeline`,
    stage: 'exposure_scan',
    status: 'active',
    next_action,
    next_action_due,
  });

  revalidatePath('/');
  revalidatePath('/pipeline');
  redirect(`/companies/${company.id}`);
}
